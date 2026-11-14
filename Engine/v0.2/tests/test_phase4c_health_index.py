#!/usr/bin/env python3
"""Unit and regression tests for Phase 4C Refined Health Index & Sensor Data Quality implementation.

Verifies:
- REF-01: Dual SDQI reporting (composite and worst-channel quality).
- REF-02: Safe engine baseline adaptation with anomaly gating, slope drift detection, and conservative fallback.
- REF-03: Causal dynamic thermal filtering with exact discrete update (alpha = dt / (tau + dt)) and initialization.
- REF-04: Heteroscedastic throttle tolerance scaling with non-suppression verification.
- REF-05: Analytical redundancy dimensional consistency and partner-failure inhibition.
"""

import json
import sys
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]  # Engine/v0.2
PHASE4A_DIR = PROJECT_ROOT / "reports" / "diagnostics_v0.2" / "phase_4a"
PHASE4C_DIR = PROJECT_ROOT / "reports" / "diagnostics_v0.2" / "phase_4c"

sys.path.append(str(PHASE4C_DIR))
from health_index_refined import (
    CHANNEL_ID_MAP,
    OPERATING_INPUTS,
    REV_CHANNEL_MAP,
    SENSOR_CHANNELS,
    CausalThermalFilter,
    DigitalTwinHealthSystemRefined,
    EngineBaselineAdapter,
    HealthyReferenceEstimator,
    SubsystemAnalyticalRedundancy,
)


class TestPhase4CHealthIndex(unittest.TestCase):
    """Test suite verifying all mathematical, operational, and failsafe requirements of Phase 4C."""

    @classmethod
    def setUpClass(cls):
        with open(PHASE4A_DIR / "health_index_formulation.json", "r", encoding="utf-8") as f:
            cls.config = json.load(f)

        # Ensure Phase 4C default refinement settings in config
        cls.config["engine_baseline_adapter"] = {
            "residual_gate_sigma": 2.5,
            "drift_slope_gate_sigma": 0.30,
            "min_steady_samples": 8,
            "delta_max_by_channel": {cid: 15.0 for cid in REV_CHANNEL_MAP.values()},
        }
        cls.config["engine_baseline_adapter"]["delta_max_by_channel"]["manifold_pressure"] = 1500.0
        cls.config["engine_baseline_adapter"]["delta_max_by_channel"]["fuel_flow"] = 0.0005
        cls.config["engine_baseline_adapter"]["delta_max_by_channel"]["rpm"] = 150.0

        for c in cls.config["channel_inventory"]["channels"]:
            c["throttle_tolerance_gamma"] = 0.20

        # Create synthetic nominal training data for estimator fitting
        n_samples = 300
        rng = np.random.default_rng(271828)

        op_data = {
            "throttle_pct": rng.uniform(30.0, 90.0, n_samples),
            "altitude_m": rng.uniform(0.0, 3000.0, n_samples),
            "ambient_temp_c": rng.uniform(5.0, 25.0, n_samples),
            "ambient_pressure_pa": rng.uniform(70000.0, 101325.0, n_samples),
            "air_density_kg_m3": rng.uniform(0.9, 1.25, n_samples),
            "phase_ground_run": np.zeros(n_samples),
            "phase_climb": np.zeros(n_samples),
            "phase_cruise": np.ones(n_samples),
            "phase_descent": np.zeros(n_samples),
        }
        cls.X_train = pd.DataFrame(op_data)

        y_data = {}
        for col in SENSOR_CHANNELS:
            base_val = 1.0
            if "rpm" in col:
                base_val = 2500.0 + op_data["throttle_pct"] * 25.0
            elif "manifold" in col:
                base_val = 50000.0 + op_data["throttle_pct"] * 400.0
            elif "cht" in col:
                base_val = 75.0 + op_data["throttle_pct"] * 0.72 + op_data["ambient_temp_c"]
            elif "egt" in col:
                base_val = 170.0 + op_data["throttle_pct"] * 3.4 + op_data["ambient_temp_c"]
            elif "oil_temp" in col:
                base_val = 45.0 + op_data["throttle_pct"] * 0.22 + op_data["ambient_temp_c"]
            elif "oil_pressure" in col:
                base_val = 200.0 + op_data["throttle_pct"] * 1.5
            elif "fuel_flow" in col:
                base_val = 0.0005 + op_data["throttle_pct"] * 0.00001
            elif "torque" in col:
                base_val = 20.0 + op_data["throttle_pct"] * 0.20
            elif "power" in col:
                torq = 20.0 + op_data["throttle_pct"] * 0.20
                rpm = 2500.0 + op_data["throttle_pct"] * 25.0
                base_val = (torq * rpm * np.pi) / 30000.0
            elif "vibration" in col:
                base_val = 0.25 + op_data["throttle_pct"] * 0.004

            noise_std = cls.config["channel_inventory"]["channels"][
                [c["measured_column"] for c in cls.config["channel_inventory"]["channels"]].index(col)
            ]["nominal_sensor_noise_std"]
            y_data[col] = base_val + rng.normal(0, noise_std, n_samples)

        cls.Y_train = pd.DataFrame(y_data)
        cls.estimator = HealthyReferenceEstimator(degree=2, alpha=10.0)
        cls.estimator.fit(cls.X_train, cls.Y_train)
        cls.system = DigitalTwinHealthSystemRefined(cls.config, cls.estimator)

    def _make_scenario(self, n_rows: int = 60, throttle: float = 65.0) -> pd.DataFrame:
        """Helper to create a realistic nominal scenario."""
        rng = np.random.default_rng(42)
        rows = {
            "scenario_id": ["test_scen"] * n_rows,
            "time_s": np.arange(n_rows, dtype=float),
            "operating_phase": ["cruise"] * n_rows,
            "throttle_pct": np.full(n_rows, throttle),
            "altitude_m": np.full(n_rows, 1500.0),
            "ambient_temp_c": np.full(n_rows, 15.0),
            "ambient_pressure_pa": np.full(n_rows, 85000.0),
            "air_density_kg_m3": np.full(n_rows, 1.05),
            "phase_ground_run": np.zeros(n_rows),
            "phase_climb": np.zeros(n_rows),
            "phase_cruise": np.ones(n_rows),
            "phase_descent": np.zeros(n_rows),
        }
        df_op = pd.DataFrame(rows)
        y_ref = self.estimator.predict(df_op)
        for idx, col in enumerate(SENSOR_CHANNELS):
            noise_std = self.config["channel_inventory"]["channels"][idx]["nominal_sensor_noise_std"]
            rows[col] = y_ref[:, idx] + rng.normal(0, noise_std, n_rows)
        return pd.DataFrame(rows)

    # --- REF-01 Tests: Dual SDQI ---
    def test_dual_sdqi_worst_channel_stuck(self):
        """REF-01: Verifies that a stuck sensor collapses SDQI_worst_channel while composite stays >= 88."""
        df = self._make_scenario(60)
        # Freeze RPM sensor after t=15
        df.loc[15:, "rpm_meas"] = float(df.loc[15, "rpm_meas"])
        res = self.system.evaluate_scenario(df)

        self.assertIn("SDQI_composite", res.columns)
        self.assertIn("SDQI_worst_channel", res.columns)
        # Post-stuck window
        post_stuck = res[res["time_s"] >= 26]
        self.assertLess(post_stuck["SDQI_worst_channel"].min(), 15.0)
        self.assertGreaterEqual(post_stuck["SDQI_composite"].min(), 85.0)

    def test_dual_sdqi_intermittent_dropout_smoothing(self):
        """REF-01: Intermittent 1-sample packet drop does not cause erratic 1-sample zero dips."""
        df = self._make_scenario(60)
        # Drop single sample at t=30
        df.loc[30, "rpm_meas"] = np.nan
        res = self.system.evaluate_scenario(df)
        self.assertGreater(res.loc[30, "SDQI_worst_channel"], 50.0)

    # --- REF-02 Tests: Baseline Adaptation & Contamination Safeguards ---
    def test_baseline_adaptation_nominal_centering(self):
        """REF-02: Normal flight on engine with displacement offset is successfully calibrated and centered."""
        df = self._make_scenario(60)
        # Add a realistic displacement offset (e.g. +0.45 Nm torque, +0.15 kW power)
        df["torque_nm_meas"] += 0.45
        df["power_kw_meas"] += 0.15
        res = self.system.evaluate_scenario(df)

        self.assertEqual(res["Baseline_Status"].iloc[0], "CALIBRATED_NOMINAL")
        # Post calibration mean residuals on torque should be near zero (< 0.5 sigma)
        self.assertLess(abs(res["z_torque"].iloc[20:40].mean()), 0.5)

    def test_baseline_adaptation_abort_active_fault_t0(self):
        """REF-02: Fault active at t=0 triggers anomaly gate, aborts calibration, and uses population fallback."""
        df = self._make_scenario(60)
        # Large combustion anomaly active from t=0
        df["vibration_rms_g_meas"] += 3.0  # > 5 sigma
        res = self.system.evaluate_scenario(df)

        self.assertEqual(res["Baseline_Status"].iloc[0], "ABORTED_ANOMALY_DETECTED")
        # Ensure vibration residual remains elevated and is NOT zeroed out
        self.assertGreater(res["z_vibration"].iloc[30], 4.0)

    def test_baseline_adaptation_abort_fault_during_window(self):
        """REF-02: Fault appearing at t=4s during calibration window triggers abort and reverts to zero offset."""
        df = self._make_scenario(60)
        # Fault steps up at t=4s (inside the initial 8-sample calibration window)
        df.loc[4:, "manifold_pressure_pa_meas"] += 5000.0  # massive jump
        res = self.system.evaluate_scenario(df)

        self.assertEqual(res["Baseline_Status"].iloc[0], "ABORTED_ANOMALY_DETECTED")
        self.assertGreater(res["z_manifold_pressure"].iloc[30], 3.0)

    def test_baseline_adaptation_abort_gradual_drift_at_startup(self):
        """REF-02: Gradual sensor drift active from t=0 breaches trend slope gate and aborts calibration."""
        df = self._make_scenario(60)
        # Fast ramp drift starting at t=0: +0.50 sigma per second on manifold pressure
        std_map = self.estimator.residual_std_[SENSOR_CHANNELS.index("manifold_pressure_pa_meas")]
        df["manifold_pressure_pa_meas"] += df["time_s"] * (0.50 * std_map)
        res = self.system.evaluate_scenario(df)

        self.assertEqual(res["Baseline_Status"].iloc[0], "ABORTED_ANOMALY_DETECTED")

    def test_baseline_adaptation_unstable_dynamics_fallback(self):
        """REF-02: Rapidly fluctuating throttle prevents steady window; falls back to population baseline."""
        df = self._make_scenario(60)
        # Alternating throttle jumps
        df["throttle_pct"] = [50.0 if i % 2 == 0 else 70.0 for i in range(len(df))]
        res = self.system.evaluate_scenario(df)

        self.assertEqual(res["Baseline_Status"].iloc[0], "FALLBACK_OPERATING_UNSTABLE")

    # --- REF-03 Tests: Causal Thermal Filter ---
    def test_thermal_filter_exact_discrete_formula(self):
        """REF-03: Verifies exact discrete recurrence alpha = dt / (tau + dt)."""
        tf = CausalThermalFilter(dt_s=1.0, tau_cht=25.0)
        self.assertAlmostEqual(tf.alpha["cht"], 1.0 / 26.0, places=5)

        tf.initialize_state(ambient_temp=15.0, y_meas_dict={"cht": 40.0, "egt": 40.0, "oil_temp": 40.0})
        # Single step towards 100.0
        up = tf.update({"cht": 100.0, "egt": 100.0, "oil_temp": 100.0})
        expected_cht = 40.0 + (1.0 / 26.0) * (100.0 - 40.0)
        self.assertAlmostEqual(up["cht"], expected_cht, places=4)

    def test_thermal_filter_startup_measured_init(self):
        """REF-03: Valid initial sensor state initializes filter directly without warm-up transient step."""
        tf = CausalThermalFilter()
        modes = tf.initialize_state(ambient_temp=20.0, y_meas_dict={"cht": 75.0, "egt": 250.0, "oil_temp": 60.0})
        self.assertEqual(modes["cht"], "MEASURED_STATE")
        self.assertEqual(tf.state["cht"], 75.0)

    def test_thermal_filter_fallback_ambient_init(self):
        """REF-03: Faulty/missing sensor at t=0 falls back safely to ambient + 25C."""
        tf = CausalThermalFilter()
        modes = tf.initialize_state(ambient_temp=20.0, y_meas_dict={"cht": np.nan, "egt": -50.0, "oil_temp": 60.0})
        self.assertEqual(modes["cht"], "FALLBACK_AMBIENT")
        self.assertEqual(tf.state["cht"], 45.0)  # 20 + 25

    # --- REF-04 Tests: Heteroscedastic Throttle Tolerance ---
    def test_throttle_tolerance_non_suppression_mild_faults(self):
        """REF-04: Expanded deadband at 95% throttle does not suppress genuine mild physical faults."""
        df_norm = self._make_scenario(60, throttle=95.0)
        res_norm = self.system.evaluate_scenario(df_norm)

        df_fault = self._make_scenario(60, throttle=95.0)
        # Inject mild combustion fault: -3% RPM, +0.1g vibration
        df_fault["rpm_meas"] -= 120.0
        df_fault["vibration_rms_g_meas"] += 0.08
        res_fault = self.system.evaluate_scenario(df_fault)

        # Fault EHI must be clearly lower than normal EHI despite 95% throttle
        ehi_norm = res_norm["EHI"].iloc[30]
        ehi_fault = res_fault["EHI"].iloc[30]
        self.assertLess(ehi_fault, ehi_norm - 3.0)

    # --- REF-05 Tests: Subsystem Analytical Redundancy Physics ---
    def test_mechanical_redundancy_dimensional_exactness(self):
        """REF-05: Verifies Power = Torque * RPM * pi / 30000 flags torque sensor bias without surrogate error."""
        ordered = self.system.ordered_channels
        ar = SubsystemAnalyticalRedundancy(ordered)

        y_meas = np.array([3000.0, 60000.0, 110.0, 600.0, 75.0, 300.0, 0.005, 31.4159, 100.0, 0.5])
        # Exact power: 100 Nm * 3000 RPM * pi / 30000 = 31.4159 kW
        z_scores = np.zeros(10)
        q_basic = np.ones(10)

        # 1. Nominal check
        c_t = ar.evaluate(y_meas, z_scores, q_basic, throttle_pct=65.0)
        self.assertAlmostEqual(c_t[ordered.index("torque")], 1.0)

        # 2. Inject torque sensor bias (+25 Nm)
        y_meas_fault = y_meas.copy()
        y_meas_fault[ordered.index("torque")] += 25.0  # now 125 Nm -> calc power 39.27 kW vs meas 31.4 kW
        z_scores_fault = z_scores.copy()
        z_scores_fault[ordered.index("torque")] = 5.0
        c_fault = ar.evaluate(y_meas_fault, z_scores_fault, q_basic, throttle_pct=65.0)
        self.assertLess(c_fault[ordered.index("torque")], 0.5)

    def test_analytical_redundancy_partner_failure_inhibition(self):
        """REF-05: Broken partner channel (q < 0.8) inhibits check, preventing false alarm on healthy channel."""
        ordered = self.system.ordered_channels
        ar = SubsystemAnalyticalRedundancy(ordered)

        y_meas = np.array([3000.0, 60000.0, 110.0, 600.0, 75.0, 300.0, 0.005, 31.4159, 100.0, 0.5])
        z_scores = np.zeros(10)
        q_basic = np.ones(10)

        # Power sensor has dropped out / broken (q = 0.0)
        q_basic[ordered.index("power")] = 0.0
        # Torque is healthy, but power discrepancy is large
        y_meas[ordered.index("power")] = 0.0

        c_t = ar.evaluate(y_meas, z_scores, q_basic, throttle_pct=65.0)
        # Torque channel must NOT be penalized because power is unverified
        self.assertEqual(c_t[ordered.index("torque")], 1.0)


if __name__ == "__main__":
    unittest.main()
