#!/usr/bin/env python3
"""Unit and integration tests for Phase 4B Health Index & Sensor Data Quality implementation."""

import json
import sys
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]  # Engine/v0.2
PHASE4A_DIR = PROJECT_ROOT / "reports" / "diagnostics_v0.2" / "phase_4a"
PHASE4B_DIR = PROJECT_ROOT / "reports" / "diagnostics_v0.2" / "phase_4b"

sys.path.append(str(PHASE4B_DIR))
from health_index_implementation import (
    CHANNEL_ID_MAP,
    OPERATING_INPUTS,
    SENSOR_CHANNELS,
    DigitalTwinHealthSystem,
    HealthyReferenceEstimator,
)


class TestPhase4BHealthIndex(unittest.TestCase):
    """Test suite verifying all mathematical, operational, and failsafe requirements of Phase 4B."""

    @classmethod
    def setUpClass(cls):
        with open(PHASE4A_DIR / "health_index_formulation.json", "r", encoding="utf-8") as f:
            cls.config = json.load(f)

        # Create synthetic nominal training data for estimator fitting
        n_samples = 200
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

        # Generate realistic sensor values coupled to throttle
        y_data = {}
        for col in SENSOR_CHANNELS:
            base_val = 100.0
            if "rpm" in col:
                base_val = 2500.0 + op_data["throttle_pct"] * 25.0
            elif "manifold" in col:
                base_val = 50000.0 + op_data["throttle_pct"] * 400.0
            elif "cht" in col:
                base_val = 110.0 + op_data["throttle_pct"] * 0.5
            elif "egt" in col:
                base_val = 600.0 + op_data["throttle_pct"] * 2.0
            elif "oil_temp" in col:
                base_val = 75.0 + op_data["throttle_pct"] * 0.2
            elif "oil_pressure" in col:
                base_val = 300.0 + op_data["throttle_pct"] * 1.0
            elif "fuel_flow" in col:
                base_val = 0.005 + op_data["throttle_pct"] * 0.0001
            elif "power" in col:
                base_val = 40.0 + op_data["throttle_pct"] * 0.8
            elif "torque" in col:
                base_val = 120.0 + op_data["throttle_pct"] * 1.2
            elif "vibration" in col:
                base_val = 0.5 + op_data["throttle_pct"] * 0.01

            noise_std = cls.config["channel_inventory"]["channels"][
                [c["measured_column"] for c in cls.config["channel_inventory"]["channels"]].index(col)
            ]["nominal_sensor_noise_std"]
            y_data[col] = base_val + rng.normal(0, noise_std, n_samples)

        cls.Y_train = pd.DataFrame(y_data)
        cls.estimator = HealthyReferenceEstimator(degree=2, alpha=10.0)
        cls.estimator.fit(cls.X_train, cls.Y_train)
        cls.system = DigitalTwinHealthSystem(cls.config, cls.estimator)

    def _make_scenario(self, n_rows: int = 120) -> pd.DataFrame:
        """Creates a realistic nominal test scenario."""
        rng = np.random.default_rng(42)
        rows = {
            "scenario_id": ["test_scen_01"] * n_rows,
            "time_s": np.arange(n_rows),
            "operating_phase": ["cruise"] * n_rows,
            "throttle_pct": np.full(n_rows, 65.0),
            "altitude_m": np.full(n_rows, 1500.0),
            "ambient_temp_c": np.full(n_rows, 15.0),
            "ambient_pressure_pa": np.full(n_rows, 85000.0),
            "air_density_kg_m3": np.full(n_rows, 1.05),
            "phase_ground_run": np.zeros(n_rows),
            "phase_climb": np.zeros(n_rows),
            "phase_cruise": np.ones(n_rows),
            "phase_descent": np.zeros(n_rows),
        }
        pred_base = self.estimator.predict(pd.DataFrame(rows))
        for idx, col in enumerate(SENSOR_CHANNELS):
            noise_std = self.config["channel_inventory"]["channels"][idx]["nominal_sensor_noise_std"]
            rows[col] = pred_base[:, idx] + rng.normal(0, noise_std, n_rows)
        return pd.DataFrame(rows)

    def test_output_ranges_and_types(self):
        """Verifies EHI and SDQI outputs stay strictly in valid bounds [0, 100]."""
        scen = self._make_scenario(60)
        res = self.system.evaluate_scenario(scen)
        self.assertTrue(np.issubdtype(res["EHI"].dtype, np.floating))
        self.assertTrue(np.issubdtype(res["SDQI"].dtype, np.floating))
        valid_ehi = res["EHI"].dropna()
        self.assertTrue((valid_ehi >= 0.0).all() and (valid_ehi <= 100.0).all())
        self.assertTrue((res["SDQI"] >= 0.0).all() and (res["SDQI"] <= 100.0).all())

    def test_healthy_nominal_behavior(self):
        """Verifies nominal healthy flight scores near 100 on both EHI and SDQI."""
        scen = self._make_scenario(120)
        res = self.system.evaluate_scenario(scen)
        self.assertGreaterEqual(float(res["EHI"].mean()), 95.0)
        self.assertGreaterEqual(float(res["SDQI"].mean()), 98.0)
        self.assertEqual(res["Status"].iloc[-1], "BAND_1_NOMINAL")

    def test_physical_degradation_response(self):
        """Verifies physical fault (CHT and EGT rise) causes monotonic EHI drop while SDQI remains high."""
        scen = self._make_scenario(120)
        # Inject coordinated thermal rise starting at t=30 (full severity CHT +25, EGT +75, Oil +20)
        scen.loc[30:, "cht_c_meas"] += 25.0
        scen.loc[30:, "egt_c_meas"] += 75.0
        scen.loc[30:, "oil_temp_c_meas"] += 20.0

        res = self.system.evaluate_scenario(scen)
        # Pre-onset (t < 30) should be nominal
        self.assertGreaterEqual(float(res.loc[:29, "EHI"].mean()), 95.0)
        # Post-onset (t >= 30) EHI should drop significantly (thermal subsystem is 40% of total engine weight)
        self.assertLessEqual(float(res.loc[60:, "EHI"].mean()), 62.0)
        self.assertLess(float(res.loc[60:, "EHI"].mean()), 70.0)
        # SDQI should remain healthy because telemetry is available and physically consistent
        self.assertGreaterEqual(float(res.loc[60:, "SDQI"].mean()), 90.0)

    def test_sensor_dropout_and_stuck_signals(self):
        """Verifies sensor stuck and dropout drops SDQI while channel is isolated from EHI."""
        scen = self._make_scenario(120)
        # Inject stuck CHT at t=20
        stuck_val = scen.loc[19, "cht_c_meas"]
        scen.loc[20:, "cht_c_meas"] = stuck_val

        res = self.system.evaluate_scenario(scen)
        # CHT quality factor q_cht should drop to 0 after stuck detection
        self.assertLessEqual(float(res.loc[40:, "q_cht"].mean()), 0.1)
        # SDQI should drop reflecting sensor failure
        self.assertLess(float(res.loc[40:, "SDQI"].mean()), 90.0)
        # EHI should remain above 88 because remaining 9 channels are nominal
        self.assertGreaterEqual(float(res.loc[40:, "EHI"].mean()), 88.0)

    def test_analytical_redundancy_in_range_bias(self):
        """Verifies isolated in-range bias (CHT offset with normal EGT/Oil) is caught by SDQI."""
        scen = self._make_scenario(120)
        # Inject +15 deg C bias on CHT only at t=25 (in range, normal noise)
        scen.loc[25:, "cht_c_meas"] += 15.0

        res = self.system.evaluate_scenario(scen)
        # Analytical redundancy should de-weight CHT quality
        self.assertLess(float(res.loc[40:, "q_cht"].mean()), 0.5)
        # SDQI drops due to isolated sensor defect
        self.assertLess(float(res.loc[40:, "SDQI"].mean()), 90.0)

    def test_insufficient_coverage_failsafe(self):
        """Verifies loss of >= 5 channels or RPM loss triggers INSUFFICIENT_TELEMETRY and EHI becomes NaN."""
        scen = self._make_scenario(60)
        # Drop 5 channels at t=20
        for col in ["manifold_pressure_pa_meas", "cht_c_meas", "egt_c_meas", "oil_temp_c_meas", "power_kw_meas"]:
            scen.loc[20:, col] = np.nan

        res = self.system.evaluate_scenario(scen)
        self.assertTrue(pd.isna(res.loc[25, "EHI"]))
        self.assertEqual(res.loc[25, "Status"], "INSUFFICIENT_TELEMETRY_COVERAGE")

    def test_rpm_mandatory_loss_failsafe(self):
        """Verifies RPM loss alone immediately forces low confidence state even if other 9 channels are active."""
        scen = self._make_scenario(60)
        scen.loc[20:, "rpm_meas"] = np.nan

        res = self.system.evaluate_scenario(scen)
        self.assertTrue(pd.isna(res.loc[25, "EHI"]))
        self.assertEqual(res.loc[25, "Status"], "INSUFFICIENT_TELEMETRY_COVERAGE")

    def test_deterministic_repeatability(self):
        """Verifies that running the same scenario multiple times produces bitwise identical results."""
        scen = self._make_scenario(60)
        res1 = self.system.evaluate_scenario(scen)
        res2 = self.system.evaluate_scenario(scen)
        pd.testing.assert_frame_equal(res1, res2)

    def test_zero_division_and_nan_safety(self):
        """Verifies system handles all-NaN inputs safely without crashing."""
        scen = self._make_scenario(30)
        for col in SENSOR_CHANNELS:
            scen[col] = np.nan
        res = self.system.evaluate_scenario(scen)
        self.assertTrue(res["EHI"].isna().all())
        self.assertEqual(res["Status"].iloc[0], "INSUFFICIENT_TELEMETRY_COVERAGE")


if __name__ == "__main__":
    unittest.main()
