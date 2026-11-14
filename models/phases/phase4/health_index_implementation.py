#!/usr/bin/env python3
"""ENGINE-TWIN v0.2 - Phase 4B Health Index & Sensor Data Quality Implementation.

Implements the Phase 4A specification:
- Healthy Reference Digital Twin surrogate model (Polynomial Ridge Regressor).
- Standardized condition-compensated sensor residuals.
- Sensor Data Quality Index (SDQI) with:
  * Availability (missingness)
  * In-range plausibility
  * Channel-specific stuck-sensor detection over past-only windows
  * Analytical redundancy checks for in-range bias and drift
- Engine Health Index (EHI) with:
  * Standardized deadband channel health mapping h_i(t)
  * Minimum telemetry coverage check (Coverage >= 0.60, >= 6 valid channels, mandatory RPM)
  * Explicit insufficient-telemetry / low-confidence state (EHI = NaN)
  * Quality-weighted aggregation and exponential temporal smoothing (alpha = 0.85)
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
        # Avoid division by zero
        self.residual_std_ = np.where(res_std > 1e-6, res_std, 1.0)
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Predicts nominal reference sensor readings for operating conditions X."""
        if not self.fitted_:
            raise RuntimeError("Estimator must be fit before calling predict.")
        X_mat = X[OPERATING_INPUTS].to_numpy(dtype=np.float64)
        return self.pipeline.predict(X_mat)


class DigitalTwinHealthSystem:
    """Evaluates sample-by-sample EHI and SDQI over a scenario using Phase 4A formulation."""

    def __init__(self, config_dict: Dict[str, Any], reference_estimator: HealthyReferenceEstimator):
        self.config = config_dict
        self.ref_estimator = reference_estimator

        # Unpack channel configurations
        self.channels_cfg = {c["channel_id"]: c for c in config_dict["channel_inventory"]["channels"]}
        self.redundancy_groups = config_dict["analytical_redundancy_groups"]
        self.coverage_rules = config_dict["telemetry_coverage_rules"]
        self.smoothing_alpha = float(config_dict["score_mapping_and_smoothing"]["temporal_smoothing_alpha"])
        self.iso_threshold = float(config_dict["score_mapping_and_smoothing"]["isolated_anomaly_threshold_sigma"])
        self.quiet_threshold = float(config_dict["score_mapping_and_smoothing"]["coupled_quiet_threshold_sigma"])

        # Ordered weights and tolerances aligned to SENSOR_CHANNELS
        self.ordered_channels = [REV_CHANNEL_MAP[col] for col in SENSOR_CHANNELS]
        self.ehi_weights = np.array([self.channels_cfg[cid]["ehi_weight"] for cid in self.ordered_channels], dtype=np.float64)
        self.sdqi_weights = np.array([self.channels_cfg[cid]["sdqi_weight"] for cid in self.ordered_channels], dtype=np.float64)
        self.beta = np.array([self.channels_cfg[cid]["degradation_scale_beta"] for cid in self.ordered_channels], dtype=np.float64)
        self.tol_sigma = np.array([self.channels_cfg[cid]["nominal_tolerance_sigma"] for cid in self.ordered_channels], dtype=np.float64)

        # Range bounds
        self.min_range = np.array([self.channels_cfg[cid]["plausible_range"][0] for cid in self.ordered_channels], dtype=np.float64)
        self.max_range = np.array([self.channels_cfg[cid]["plausible_range"][1] for cid in self.ordered_channels], dtype=np.float64)

        # Stuck thresholds
        self.stuck_var_thresh = np.array([self.channels_cfg[cid]["stuck_variance_threshold"] for cid in self.ordered_channels], dtype=np.float64)
        self.stuck_consec_samples = {cid: int(self.channels_cfg[cid]["stuck_consecutive_identical_samples"]) for cid in self.ordered_channels}

        # Subsystem mapping for analytical redundancy
        self.channel_to_group = {}
        for grp_name, ch_list in self.redundancy_groups.items():
            for ch in ch_list:
                self.channel_to_group[ch] = grp_name

    def evaluate_scenario(self, scenario_df: pd.DataFrame) -> pd.DataFrame:
        """Evaluates chronologically ordered scenario rows (0..119s). Never peeks into future."""
        scenario_df = scenario_df.sort_values("time_s").reset_index(drop=True)
        n_samples = len(scenario_df)

        # 1. Condition-compensated reference predictions
        Y_hat = self.ref_estimator.predict(scenario_df)
        Y_meas = scenario_df[SENSOR_CHANNELS].to_numpy(dtype=np.float64)

        # Raw residuals
        residuals = Y_meas - Y_hat
        z_scores = residuals / self.ref_estimator.residual_std_

        # Prepare outputs
        ehi_series = np.full(n_samples, np.nan, dtype=np.float64)
        ehi_raw_series = np.full(n_samples, np.nan, dtype=np.float64)
        sdqi_series = np.full(n_samples, 100.0, dtype=np.float64)
        sdqi_raw_series = np.full(n_samples, 100.0, dtype=np.float64)
        coverage_series = np.zeros(n_samples, dtype=np.float64)
        status_series = np.full(n_samples, "NOMINAL", dtype=object)

        # Quality factors array (N, 10)
        q_matrix = np.ones((n_samples, 10), dtype=np.float64)
        h_matrix = np.ones((n_samples, 10), dtype=np.float64)

        prev_ehi = 100.0
        prev_sdqi = 100.0

        for t in range(n_samples):
            y_t = Y_meas[t]
            z_t = z_scores[t]

            # --- Factor 1: Availability a_i(t) ---
            missing_t = np.isnan(y_t)
            # Check explicit missing columns if present in scenario_df
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
            # Evaluated over past window up to 10 seconds: max(0, t-9) .. t
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
                    # 1. Consecutive identical floating-point values
                    # Check how many recent samples match the latest sample
                    latest_val = valid_slice[-1]
                    identical_count = np.sum(valid_slice == latest_val)
                    if identical_count >= self.stuck_consec_samples[cid]:
                        v_t[idx] = 0.0
                        continue

                    # 2. Sample variance check if full window is available
                    if w_len >= 8:
                        var_val = np.var(valid_slice, ddof=1)
                        if var_val < self.stuck_var_thresh[idx]:
                            v_t[idx] = 0.0

            # --- Factor 4: Analytical Redundancy c_i(t) for In-Range Bias/Drift ---
            c_t = np.ones(10, dtype=np.float64)
            for idx, cid in enumerate(self.ordered_channels):
                if a_t[idx] == 0.0 or p_t[idx] == 0.0 or v_t[idx] == 0.0:
                    c_t[idx] = 0.0
                    continue

                grp_name = self.channel_to_group.get(cid)
                grp_channels = self.redundancy_groups.get(grp_name, [])

                # Isolated groups (single channel) cannot be verified via analytical redundancy
                if len(grp_channels) <= 1:
                    c_t[idx] = 1.0
                    continue

                # Partner channels in group
                partner_indices = [
                    self.ordered_channels.index(p_ch)
                    for p_ch in grp_channels
                    if p_ch != cid and not np.isnan(z_t[self.ordered_channels.index(p_ch)])
                ]

                if partner_indices:
                    z_self = np.abs(z_t[idx])
                    z_partners = np.abs(z_t[partner_indices])
                    z_coupled = float(np.median(z_partners))

                    # If channel is elevated (>4 sigma) while partners are quiet (<2 sigma):
                    if z_self > self.iso_threshold and z_coupled < self.quiet_threshold:
                        # Gradual ramp-down of confidence
                        c_t[idx] = max(0.0, 1.0 - (z_self - self.quiet_threshold) / (self.iso_threshold - self.quiet_threshold))
                    else:
                        c_t[idx] = 1.0

            # Composite channel quality
            q_t = a_t * p_t * v_t * c_t
            q_matrix[t] = q_t

            # Composite SDQI
            sdqi_raw_t = 100.0 * float(np.sum(self.sdqi_weights * q_t))
            sdqi_t = self.smoothing_alpha * prev_sdqi + (1.0 - self.smoothing_alpha) * sdqi_raw_t
            prev_sdqi = sdqi_t

            sdqi_raw_series[t] = sdqi_raw_t
            sdqi_series[t] = sdqi_t

            # --- Engine Health Index (EHI) Evaluation ---
            # 1. Excess-deviation channel health h_i(t)
            h_t = np.ones(10, dtype=np.float64)
            for idx in range(10):
                if np.isnan(z_t[idx]):
                    h_t[idx] = 0.0
                else:
                    d_i = max(0.0, np.abs(z_t[idx]) - self.tol_sigma[idx])
                    h_t[idx] = np.exp(-0.5 * ((d_i / self.beta[idx]) ** 2))
            h_matrix[t] = h_t

            # 2. Coverage & Failsafe Rule
            # Valid physical weight
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
                # Do not advance prev_ehi on NaN
            else:
                ehi_raw_t = 100.0 * float(np.sum(self.ehi_weights * q_t * h_t) / valid_weight)
                ehi_raw_series[t] = ehi_raw_t

                if np.isnan(prev_ehi):
                    ehi_t = ehi_raw_t  # Reset smoothing if recovered from NaN
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

        # Assemble output DataFrame
        res_df = pd.DataFrame({
            "scenario_id": scenario_df["scenario_id"].values,
            "time_s": scenario_df["time_s"].values,
            "operating_phase": scenario_df["operating_phase"].values if "operating_phase" in scenario_df.columns else "unknown",
            "SDQI_raw": np.round(sdqi_raw_series, 2),
            "SDQI": np.round(sdqi_series, 2),
            "EHI_raw": np.round(ehi_raw_series, 2),
            "EHI": np.round(ehi_series, 2),
            "Coverage": np.round(coverage_series, 3),
            "Status": status_series,
        })

        # Add channel qualities and standardized residuals for inspection
        for idx, cid in enumerate(self.ordered_channels):
            res_df[f"q_{cid}"] = np.round(q_matrix[:, idx], 3)
            res_df[f"z_{cid}"] = np.round(z_scores[:, idx], 3)
            res_df[f"h_{cid}"] = np.round(h_matrix[:, idx], 3)

        return res_df
