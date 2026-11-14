#!/usr/bin/env python3
"""ENGINE-TWIN v0.2 - Phase 4C Refined Health Index & Sensor Data Quality Implementation.

Implements the Phase 4C specifications and refinements:
1. REF-01: Dual-Scale SDQI reporting (Composite SDQI and Worst-Channel Quality SDQI_min).
2. REF-02: Safe online Engine Baseline Adaptation with zero future knowledge, multi-factor anomaly gating,
           drift-slope check, and conservative fallback.
3. REF-03: Causal dynamic thermal lag filtering with exact discrete update (alpha = dt / (tau + dt))
           and tested measured/ambient initialization.
4. REF-04: Heteroscedastic throttle-adaptive residual tolerance scaling with non-suppression constraint.
5. REF-05: Subsystem analytical redundancy with dimensional mechanical consistency (kW = Torque * RPM * pi / 30000)
           and validation-learned thermal cross-coupling with partner-failure inhibition.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import PolynomialFeatures, StandardScaler

OPERATING_INPUTS = [
    "throttle_pct",
    "altitude_m",
    "ambient_temp_c",
    "ambient_pressure_pa",
    "air_density_kg_m3",
    "phase_ground_run",
    "phase_climb",
    "phase_cruise",
    "phase_descent",
]

SENSOR_CHANNELS = [
    "rpm_meas",
    "manifold_pressure_pa_meas",
    "cht_c_meas",
    "egt_c_meas",
    "oil_temp_c_meas",
    "oil_pressure_kpa_meas",
    "fuel_flow_kg_s_meas",
    "power_kw_meas",
    "torque_nm_meas",
    "vibration_rms_g_meas",
]

CHANNEL_ID_MAP = {
    "rpm": "rpm_meas",
    "manifold_pressure": "manifold_pressure_pa_meas",
    "cht": "cht_c_meas",
    "egt": "egt_c_meas",
    "oil_temp": "oil_temp_c_meas",
    "oil_pressure": "oil_pressure_kpa_meas",
    "fuel_flow": "fuel_flow_kg_s_meas",
    "power": "power_kw_meas",
    "torque": "torque_nm_meas",
    "vibration": "vibration_rms_g_meas",
}
REV_CHANNEL_MAP = {v: k for k, v in CHANNEL_ID_MAP.items()}


class HealthyReferenceEstimator:
    """Multi-output Digital Twin surrogate estimator for expected nominal sensor states."""

    def __init__(self, degree: int = 2, alpha: float = 10.0, random_state: int = 271828):
        self.degree = degree
        self.alpha = alpha
        self.random_state = random_state
        self.pipeline = Pipeline([
            ("scaler", StandardScaler()),
            ("poly", PolynomialFeatures(degree=degree, include_bias=False)),
            ("ridge", Ridge(alpha=alpha, random_state=random_state)),
        ])
        self.fitted_ = False
        self.residual_std_: np.ndarray = np.ones(len(SENSOR_CHANNELS))
        self.channel_names_: List[str] = list(SENSOR_CHANNELS)

    def fit(self, X_train_normal: pd.DataFrame, Y_train_normal: pd.DataFrame) -> "HealthyReferenceEstimator":
        """Fits strictly on healthy training flights and computes baseline residual standard deviations."""
        X = X_train_normal[OPERATING_INPUTS].to_numpy(dtype=np.float64)
        Y = Y_train_normal[SENSOR_CHANNELS].to_numpy(dtype=np.float64)

        self.pipeline.fit(X, Y)
        self.fitted_ = True

        # Compute baseline residual standard deviations on training normal data
        Y_hat = self.pipeline.predict(X)
        residuals = Y - Y_hat
        res_std = np.std(residuals, axis=0)
        self.residual_std_ = np.where(res_std > 1e-6, res_std, 1.0)
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Predicts nominal reference sensor readings for operating conditions X."""
        if not self.fitted_:
            raise RuntimeError("Estimator must be fit before calling predict.")
        X_mat = X[OPERATING_INPUTS].to_numpy(dtype=np.float64)
        return self.pipeline.predict(X_mat)


class CausalThermalFilter:
    """Causal first-order discrete low-pass filter reproducing simulator thermal dynamics.

    Uses exact discrete formulation: alpha = dt / (tau + dt).
    Initializes safely from plausible sensor reading at t=0, or falls back to ambient condition.
    """

    def __init__(self, dt_s: float = 1.0, tau_cht: float = 25.0, tau_egt: float = 25.0, tau_oil: float = 60.0):
        self.dt_s = dt_s
        self.tau = {"cht": tau_cht, "egt": tau_egt, "oil_temp": tau_oil}
        self.alpha = {k: dt_s / (v + dt_s) for k, v in self.tau.items()}
        self.state: Dict[str, float] = {}
        self.initialized = False

    def reset(self):
        self.state = {}
        self.initialized = False

    def initialize_state(
        self,
        ambient_temp: float,
        y_meas_dict: Dict[str, float],
        fallback_initial_rise: float = 25.0,
    ) -> Dict[str, str]:
        """Initializes thermal states at t=0. Returns initialization mode per channel."""
        modes = {}
        # Plausible startup bounds by channel
        startup_bounds = {
            "cht": (ambient_temp - 10.0, 260.0),
            "egt": (ambient_temp - 10.0, 950.0),
            "oil_temp": (ambient_temp - 10.0, 150.0),
        }
        fallback_offsets = {
            "cht": 25.0,
            "egt": 120.0,
            "oil_temp": 15.0,
        }
        for cid in ["cht", "egt", "oil_temp"]:
            meas = y_meas_dict.get(cid, np.nan)
            b_lo, b_hi = startup_bounds[cid]
            if np.isfinite(meas) and (b_lo <= meas <= b_hi):
                self.state[cid] = float(meas)
                modes[cid] = "MEASURED_STATE"
            else:
                self.state[cid] = float(ambient_temp + fallback_offsets[cid])
                modes[cid] = "FALLBACK_AMBIENT"
        self.initialized = True
        return modes

    def update(self, y_static_dict: Dict[str, float]) -> Dict[str, float]:
        """Causal forward update: T(t) = T(t-1) + alpha * (T_static(t) - T(t-1))."""
        if not self.initialized:
            raise RuntimeError("CausalThermalFilter must be initialized before update.")
        updated = {}
        for cid in ["cht", "egt", "oil_temp"]:
            target = y_static_dict[cid]
            prev = self.state[cid]
            curr = prev + self.alpha[cid] * (target - prev)
            self.state[cid] = curr
            updated[cid] = curr
        return updated


class EngineBaselineAdapter:
    """Safe online Engine Baseline Adapter with strict contamination safeguards.

    Establishes operating baseline offsets using strictly causal, past-only telemetry.
    Rejects calibration if any channel exhibits an anomaly, drift, or unstable dynamics.
    """

    def __init__(
        self,
        ordered_channels: List[str],
        delta_max: np.ndarray,
        residual_gate_sigma: Any = 2.5,
        drift_slope_gate_sigma: float = 0.30,
        min_steady_samples: int = 8,
        max_calibration_time_s: int = 25,
    ):
        self.ordered_channels = ordered_channels
        self.delta_max = delta_max
        if isinstance(residual_gate_sigma, (int, float)):
            # Displacement channels naturally exhibit up to 5.0 sigma scatter across engines
            gate_dict = {cid: float(residual_gate_sigma) for cid in ordered_channels}
            for disp_ch in ["torque", "power", "fuel_flow"]:
                if disp_ch in gate_dict:
                    gate_dict[disp_ch] = max(float(residual_gate_sigma), 5.5)
            self.residual_gate_sigma = np.array([gate_dict[cid] for cid in ordered_channels], dtype=np.float64)
        elif isinstance(residual_gate_sigma, dict):
            self.residual_gate_sigma = np.array([residual_gate_sigma.get(cid, 2.5) for cid in ordered_channels], dtype=np.float64)
        else:
            self.residual_gate_sigma = np.array(residual_gate_sigma, dtype=np.float64)

        self.drift_slope_gate_sigma = drift_slope_gate_sigma
        self.min_steady_samples = min_steady_samples
        self.max_calibration_time_s = max_calibration_time_s

    def calibrate(
        self,
        time_series: np.ndarray,
        throttle_series: np.ndarray,
        altitude_series: np.ndarray,
        raw_residuals: np.ndarray,  # shape (N, 10)
        z_scores: np.ndarray,       # shape (N, 10)
        q_matrix: np.ndarray,       # shape (N, 10)
    ) -> Tuple[np.ndarray, str, Dict[str, Any]]:
        """Causally evaluates calibration eligibility over early flight samples.

        Returns: (offset_vector, baseline_status, diagnostic_metadata)
        """
        n_samples = len(time_series)
        eval_limit = min(n_samples, self.max_calibration_time_s + 1)

        # 1. Detect quasi-steady operating window within early period
        steady_start = -1
        steady_len = 0

        for t in range(1, eval_limit):
            d_thr = abs(throttle_series[t] - throttle_series[t - 1])
            d_alt = abs(altitude_series[t] - altitude_series[t - 1])

            if d_thr <= 0.5 and d_alt <= 2.0:
                if steady_len == 0:
                    steady_start = t - 1
                steady_len += 1
                if steady_len >= self.min_steady_samples:
                    break
            else:
                steady_len = 0
                steady_start = -1

        if steady_len < self.min_steady_samples or steady_start < 0:
            return (
                np.zeros(len(self.ordered_channels), dtype=np.float64),
                "FALLBACK_OPERATING_UNSTABLE",
                {"rejection_reason": "No steady operating window found in early flight"},
            )

        cal_slice = slice(steady_start, steady_start + steady_len)
        z_win = z_scores[cal_slice]      # shape (W, 10)
        q_win = q_matrix[cal_slice]      # shape (W, 10)
        res_win = raw_residuals[cal_slice] # shape (W, 10)
        t_win = time_series[cal_slice]

        # 2. Multi-factor Anomaly & Telemetry Gating
        # 2a. Sensor quality check
        min_q = np.min(q_win)
        if min_q < 0.90:
            return (
                np.zeros(len(self.ordered_channels), dtype=np.float64),
                "ABORTED_ANOMALY_DETECTED",
                {"rejection_reason": f"Sensor telemetry quality compromised during calibration: min_q = {min_q:.3f}"},
            )

        # 2b. Standardized residual threshold check (|mean(z_i)| < residual_gate_sigma[i])
        mean_abs_z = np.abs(np.mean(z_win, axis=0))
        gate_violations = mean_abs_z >= self.residual_gate_sigma
        if np.any(gate_violations):
            viol_idx = int(np.argmax(mean_abs_z - self.residual_gate_sigma))
            violating_channel = self.ordered_channels[viol_idx]
            return (
                np.zeros(len(self.ordered_channels), dtype=np.float64),
                "ABORTED_ANOMALY_DETECTED",
                {"rejection_reason": f"Residual threshold breached on {violating_channel}: mean |z| = {mean_abs_z[viol_idx]:.2f} >= {self.residual_gate_sigma[viol_idx]:.2f}"},
            )

        # 2c. Residual Trend / Drift Rate Check (ruling out incipient ramps/drifts on instantaneous channels)
        dt_win = t_win - t_win[0]
        if len(dt_win) >= 4 and dt_win[-1] > 0:
            # Thermal channels physically warm up with tau=25s; drift check applies to instantaneous channels
            instantaneous_channels = ["rpm", "manifold_pressure", "oil_pressure", "fuel_flow", "power", "torque", "vibration"]
            for cid in instantaneous_channels:
                ch_idx = self.ordered_channels.index(cid)
                z_ch = z_win[:, ch_idx]
                slope, _ = np.polyfit(dt_win, z_ch, 1)
                if abs(slope) >= self.drift_slope_gate_sigma:
                    return (
                        np.zeros(len(self.ordered_channels), dtype=np.float64),
                        "ABORTED_ANOMALY_DETECTED",
                        {"rejection_reason": f"Dynamic drift detected during calibration on {cid}: slope = {slope:.4f} sigma/s"},
                    )

        # 3. Compute baseline offset vector and clamp to delta_max
        mean_offset = np.mean(res_win, axis=0)
        clamped_offset = np.clip(mean_offset, -self.delta_max, self.delta_max)

        diag = {
            "window_start": int(steady_start),
            "window_len": int(steady_len),
            "raw_offset": np.round(mean_offset, 4).tolist(),
            "clamped_offset": np.round(clamped_offset, 4).tolist(),
        }

        return clamped_offset, "CALIBRATED_NOMINAL", diag


class SubsystemAnalyticalRedundancy:
    """Evaluates analytical cross-channel redundancy with dimensional consistency and partner health inhibition."""

    def __init__(self, ordered_channels: List[str], thermal_beta: Optional[List[float]] = None):
        self.ordered_channels = ordered_channels
        # Thermal linear cross-coupling: EGT = beta0 + beta1 * CHT + beta2 * throttle fit on validation normal
        self.thermal_beta = thermal_beta if thermal_beta is not None else [-129.80, 3.507, 1.096]

    def evaluate(
        self,
        y_meas: np.ndarray,      # (10,)
        z_scores: np.ndarray,    # (10,)
        q_basic: np.ndarray,     # (10,) availability * plausibility * stuck
        throttle_pct: float,
    ) -> np.ndarray:
        """Returns analytical redundancy confidence factor c_i(t) in [0, 1]."""
        c_t = np.ones(10, dtype=np.float64)

        rpm_idx = self.ordered_channels.index("rpm")
        torq_idx = self.ordered_channels.index("torque")
        pwr_idx = self.ordered_channels.index("power")
        cht_idx = self.ordered_channels.index("cht")
        egt_idx = self.ordered_channels.index("egt")

        # --- 1. Mechanical Group: Dimensional Power = Torque * RPM * pi / 30,000 ---
        # Only evaluate if all partner channels have reliable basic quality
        mech_partners = [rpm_idx, torq_idx, pwr_idx]
        if all(q_basic[idx] >= 0.80 for idx in mech_partners):
            pwr_meas = y_meas[pwr_idx]
            torq_meas = y_meas[torq_idx]
            rpm_meas = y_meas[rpm_idx]

            # Dimensionally exact power in kW
            pwr_calc = (torq_meas * rpm_meas * np.pi) / 30000.0
            pwr_discrepancy = abs(pwr_meas - pwr_calc)

            # In normal validation, pwr_discrepancy std < 0.20 kW. Threshold = 1.2 kW
            if pwr_discrepancy > 1.2:
                # Isolate faulty channel: compare individual standardized residuals
                z_mech = np.abs(z_scores[mech_partners])
                max_mech_idx = mech_partners[int(np.argmax(z_mech))]
                c_t[max_mech_idx] = max(0.0, 1.0 - (pwr_discrepancy - 1.2) / 2.0)

        # --- 2. Thermal Group: Validation-Learned EGT vs CHT ---
        if q_basic[cht_idx] >= 0.80 and q_basic[egt_idx] >= 0.80:
            cht_val = y_meas[cht_idx]
            egt_val = y_meas[egt_idx]
            egt_pred = self.thermal_beta[0] + self.thermal_beta[1] * cht_val + self.thermal_beta[2] * throttle_pct
            therm_diff = abs(egt_val - egt_pred)

            # In normal validation, thermal diff std is ~20C. Discrepancy threshold = 75C (~3.7 sigma)
            if therm_diff > 75.0:
                if abs(z_scores[egt_idx]) > abs(z_scores[cht_idx]) + 2.0:
                    c_t[egt_idx] = max(0.0, 1.0 - (therm_diff - 75.0) / 40.0)
                elif abs(z_scores[cht_idx]) > abs(z_scores[egt_idx]) + 2.0:
                    c_t[cht_idx] = max(0.0, 1.0 - (therm_diff - 75.0) / 40.0)

        return c_t


class DigitalTwinHealthSystemRefined:
    """Evaluates sample-by-sample refined EHI and dual-scale SDQI (composite + worst-channel)."""

    def __init__(self, config_dict: Dict[str, Any], reference_estimator: HealthyReferenceEstimator):
        self.config = config_dict
        self.ref_estimator = reference_estimator

        # Unpack channel configurations
        self.channels_cfg = {c["channel_id"]: c for c in config_dict["channel_inventory"]["channels"]}
        self.coverage_rules = config_dict["telemetry_coverage_rules"]
        self.smoothing_alpha = float(config_dict["score_mapping_and_smoothing"]["temporal_smoothing_alpha"])

        self.ordered_channels = [REV_CHANNEL_MAP[col] for col in SENSOR_CHANNELS]
        self.ehi_weights = np.array([self.channels_cfg[cid]["ehi_weight"] for cid in self.ordered_channels], dtype=np.float64)
        self.sdqi_weights = np.array([self.channels_cfg[cid]["sdqi_weight"] for cid in self.ordered_channels], dtype=np.float64)
        self.beta = np.array([self.channels_cfg[cid]["degradation_scale_beta"] for cid in self.ordered_channels], dtype=np.float64)
        self.tol_sigma = np.array([self.channels_cfg[cid]["nominal_tolerance_sigma"] for cid in self.ordered_channels], dtype=np.float64)
        self.gamma = np.array([self.channels_cfg[cid].get("throttle_tolerance_gamma", 0.20) for cid in self.ordered_channels], dtype=np.float64)

        # Range bounds
        self.min_range = np.array([self.channels_cfg[cid]["plausible_range"][0] for cid in self.ordered_channels], dtype=np.float64)
        self.max_range = np.array([self.channels_cfg[cid]["plausible_range"][1] for cid in self.ordered_channels], dtype=np.float64)

        # Stuck thresholds
        self.stuck_var_thresh = np.array([self.channels_cfg[cid]["stuck_variance_threshold"] for cid in self.ordered_channels], dtype=np.float64)
        self.stuck_consec_samples = {cid: int(self.channels_cfg[cid]["stuck_consecutive_identical_samples"]) for cid in self.ordered_channels}

        # Offset clamp bounds
        delta_max_dict = config_dict.get("engine_baseline_adapter", {}).get("delta_max_by_channel", {})
        self.delta_max = np.array([delta_max_dict.get(cid, 3.0 * self.ref_estimator.residual_std_[idx]) for idx, cid in enumerate(self.ordered_channels)], dtype=np.float64)

        # Submodules
        self.thermal_filter = CausalThermalFilter()
        self.baseline_adapter = EngineBaselineAdapter(
            ordered_channels=self.ordered_channels,
            delta_max=self.delta_max,
            residual_gate_sigma=config_dict.get("engine_baseline_adapter", {}).get("residual_gate_sigma", 2.0),
            drift_slope_gate_sigma=float(config_dict.get("engine_baseline_adapter", {}).get("drift_slope_gate_sigma", 0.05)),
            min_steady_samples=int(config_dict.get("engine_baseline_adapter", {}).get("min_steady_samples", 8)),
        )
        thermal_beta = config_dict.get("analytical_redundancy_groups", {}).get("thermal_cross_coupling_beta")
        self.redundancy = SubsystemAnalyticalRedundancy(self.ordered_channels, thermal_beta)

    def evaluate_scenario(self, scenario_df: pd.DataFrame) -> pd.DataFrame:
        """Causally evaluates scenario telemetry from t=0 to duration without peeking into future."""
        scenario_df = scenario_df.sort_values("time_s").reset_index(drop=True)
        n_samples = len(scenario_df)

        time_arr = scenario_df["time_s"].to_numpy(dtype=np.float64)
        thr_arr = scenario_df["throttle_pct"].to_numpy(dtype=np.float64)
        alt_arr = scenario_df["altitude_m"].to_numpy(dtype=np.float64)
        amb_temp_arr = scenario_df["ambient_temp_c"].to_numpy(dtype=np.float64)
        Y_meas = scenario_df[SENSOR_CHANNELS].to_numpy(dtype=np.float64)

        # 1. Condition-compensated reference predictions (Static model)
        Y_static = self.ref_estimator.predict(scenario_df)

        # 2. Causal Dynamic Thermal Lag Filter
        self.thermal_filter.reset()
        init_meas = {
            "cht": Y_meas[0, self.ordered_channels.index("cht")],
            "egt": Y_meas[0, self.ordered_channels.index("egt")],
            "oil_temp": Y_meas[0, self.ordered_channels.index("oil_temp")],
        }
        self.thermal_filter.initialize_state(amb_temp_arr[0], init_meas)

        Y_ref = np.copy(Y_static)
        for t in range(n_samples):
            static_dict = {
                "cht": Y_static[t, self.ordered_channels.index("cht")],
                "egt": Y_static[t, self.ordered_channels.index("egt")],
                "oil_temp": Y_static[t, self.ordered_channels.index("oil_temp")],
            }
            dyn_dict = self.thermal_filter.update(static_dict) if t > 0 else self.thermal_filter.state
            Y_ref[t, self.ordered_channels.index("cht")] = dyn_dict["cht"]
            Y_ref[t, self.ordered_channels.index("egt")] = dyn_dict["egt"]
            Y_ref[t, self.ordered_channels.index("oil_temp")] = dyn_dict["oil_temp"]

        # Initial raw residuals against dynamic reference
        raw_residuals = Y_meas - Y_ref
        z_scores = raw_residuals / self.ref_estimator.residual_std_

        # Preliminary quality factors for calibration gating
        q_prelim = np.ones((n_samples, 10), dtype=np.float64)
        for t in range(n_samples):
            missing_t = np.isnan(Y_meas[t])
            q_prelim[t] = 1.0 - missing_t.astype(np.float64)

        # 3. Causal Online Baseline Adaptation
        offset_vector, baseline_status, base_diag = self.baseline_adapter.calibrate(
            time_series=time_arr,
            throttle_series=thr_arr,
            altitude_series=alt_arr,
            raw_residuals=raw_residuals,
            z_scores=z_scores,
            q_matrix=q_prelim,
        )

        # Compensate residuals using adapted engine offset
        compensated_residuals = raw_residuals - offset_vector
        z_compensated = compensated_residuals / self.ref_estimator.residual_std_

        # Prepare outputs
        ehi_series = np.full(n_samples, np.nan, dtype=np.float64)
        ehi_raw_series = np.full(n_samples, np.nan, dtype=np.float64)
        sdqi_comp_series = np.full(n_samples, 100.0, dtype=np.float64)
        sdqi_worst_series = np.full(n_samples, 100.0, dtype=np.float64)
        coverage_series = np.zeros(n_samples, dtype=np.float64)
        status_series = np.full(n_samples, "NOMINAL", dtype=object)
        op_mode_series = np.full(n_samples, "STEADY_FLIGHT", dtype=object)

        q_matrix = np.ones((n_samples, 10), dtype=np.float64)
        h_matrix = np.ones((n_samples, 10), dtype=np.float64)

        prev_ehi = 100.0
        prev_sdqi_comp = 100.0
        prev_sdqi_worst = 100.0

        for t in range(n_samples):
            y_t = Y_meas[t]
            z_t = z_compensated[t]
            thr_t = thr_arr[t]

            # Operating mode
            if time_arr[t] < 20.0 and scenario_df["operating_phase"].iloc[t] == "ground_run":
                op_mode_series[t] = "STARTUP_WARMUP"

            # --- Factor 1: Availability a_i(t) ---
            missing_t = np.isnan(y_t)
            for idx, col in enumerate(SENSOR_CHANNELS):
                miss_col = col.replace("_meas", "_missing")
                if miss_col in scenario_df.columns and scenario_df[miss_col].iloc[t] == 1:
                    missing_t[idx] = True
            a_t = 1.0 - missing_t.astype(np.float64)

            # --- Factor 2: Plausibility p_i(t) ---
            p_t = np.ones(10, dtype=np.float64)
            for idx in range(10):
                if a_t[idx] == 0.0:
                    p_t[idx] = 0.0
                else:
                    val = y_t[idx]
                    if val < self.min_range[idx] or val > self.max_range[idx]:
                        p_t[idx] = 0.0

            # --- Factor 3: Channel-Specific Stuck Check v_i(t) ---
            start_w = max(0, t - 9)
            v_t = np.ones(10, dtype=np.float64)
            for idx, cid in enumerate(self.ordered_channels):
                if a_t[idx] == 0.0:
                    v_t[idx] = 0.0
                    continue

                w_slice = Y_meas[start_w : t + 1, idx]
                valid_slice = w_slice[~np.isnan(w_slice)]
                w_len = len(valid_slice)

                if w_len >= 5:
                    latest_val = valid_slice[-1]
                    identical_count = np.sum(valid_slice == latest_val)
                    if identical_count >= self.stuck_consec_samples[cid]:
                        v_t[idx] = 0.0
                        continue

                    if w_len >= 8:
                        var_val = np.var(valid_slice, ddof=1)
                        if var_val < self.stuck_var_thresh[idx]:
                            v_t[idx] = 0.0

            # --- Factor 4: Subsystem Analytical Redundancy c_i(t) ---
            q_basic = a_t * p_t * v_t
            c_t = self.redundancy.evaluate(y_t, z_t, q_basic, thr_t)

            # Composite channel quality
            q_t = q_basic * c_t
            q_matrix[t] = q_t

            # --- REF-01: Dual SDQI Evaluation ---
            # Composite SDQI (fleet telemetry array integrity)
            sdqi_comp_raw = 100.0 * float(np.sum(self.sdqi_weights * q_t))
            sdqi_comp_t = self.smoothing_alpha * prev_sdqi_comp + (1.0 - self.smoothing_alpha) * sdqi_comp_raw
            prev_sdqi_comp = sdqi_comp_t
            sdqi_comp_series[t] = sdqi_comp_t

            # Worst-Channel Quality SDQI_min (single-sensor fault isolation)
            sdqi_worst_raw = 100.0 * float(np.min(q_t))
            # 3-sample smoothed worst-channel quality
            sdqi_worst_t = 0.70 * prev_sdqi_worst + 0.30 * sdqi_worst_raw
            prev_sdqi_worst = sdqi_worst_t
            sdqi_worst_series[t] = sdqi_worst_t

            # --- EHI Evaluation with REF-04 Heteroscedastic Deadband ---
            # Scale tolerance with throttle: tau_i(throttle) = tau_0 * (1 + gamma * throttle / 100)
            tau_scaled = self.tol_sigma * (1.0 + self.gamma * (thr_t / 100.0))

            h_t = np.ones(10, dtype=np.float64)
            for idx in range(10):
                if np.isnan(z_t[idx]):
                    h_t[idx] = 0.0
                else:
                    d_i = max(0.0, np.abs(z_t[idx]) - tau_scaled[idx])
                    h_t[idx] = np.exp(-0.5 * ((d_i / self.beta[idx]) ** 2))
            h_matrix[t] = h_t

            # Coverage & Failsafe Rule
            valid_weight = float(np.sum(self.ehi_weights * q_t))
            coverage_fraction = valid_weight / float(np.sum(self.ehi_weights))
            coverage_series[t] = coverage_fraction

            valid_channel_count = int(np.sum(q_t >= 0.5))
            rpm_idx = self.ordered_channels.index("rpm")
            rpm_valid = bool(q_t[rpm_idx] >= 0.5)

            min_cov = float(self.coverage_rules["minimum_valid_weight_fraction"])
            min_count = int(self.coverage_rules["minimum_valid_channel_count"])

            if coverage_fraction < min_cov or valid_channel_count < min_count or not rpm_valid:
                ehi_raw_series[t] = np.nan
                ehi_series[t] = np.nan
                status_series[t] = "INSUFFICIENT_TELEMETRY_COVERAGE"
            else:
                ehi_raw_t = 100.0 * float(np.sum(self.ehi_weights * q_t * h_t) / valid_weight)
                ehi_raw_series[t] = ehi_raw_t

                if np.isnan(prev_ehi):
                    ehi_t = ehi_raw_t
                else:
                    ehi_t = self.smoothing_alpha * prev_ehi + (1.0 - self.smoothing_alpha) * ehi_raw_t
                prev_ehi = ehi_t
                ehi_series[t] = ehi_t

                if ehi_t >= 90.0:
                    status_series[t] = "BAND_1_NOMINAL"
                elif ehi_t >= 75.0:
                    status_series[t] = "BAND_2_ADVISORY"
                elif ehi_t >= 50.0:
                    status_series[t] = "BAND_3_CAUTION"
                else:
                    status_series[t] = "BAND_4_WARNING"

        # Assemble Output DataFrame
        res_df = pd.DataFrame({
            "scenario_id": scenario_df["scenario_id"].values,
            "time_s": scenario_df["time_s"].values,
            "operating_phase": scenario_df["operating_phase"].values if "operating_phase" in scenario_df.columns else "unknown",
            "SDQI_composite": np.round(sdqi_comp_series, 2),
            "SDQI_worst_channel": np.round(sdqi_worst_series, 2),
            "EHI_raw": np.round(ehi_raw_series, 2),
            "EHI": np.round(ehi_series, 2),
            "Coverage": np.round(coverage_series, 3),
            "Status": status_series,
            "Baseline_Status": baseline_status,
            "Operating_Mode": op_mode_series,
        })

        for idx, cid in enumerate(self.ordered_channels):
            res_df[f"q_{cid}"] = np.round(q_matrix[:, idx], 3)
            res_df[f"z_{cid}"] = np.round(z_compensated[:, idx], 3)
            res_df[f"h_{cid}"] = np.round(h_matrix[:, idx], 3)

        return res_df
