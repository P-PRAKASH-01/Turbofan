#!/usr/bin/env python3
"""Deterministic generic aero-piston surrogate and synthetic scenario generator.

This is an explicitly assumption-driven mean-value prototype, not an engine
manufacturer model, validated thermodynamic model, or flight-use artifact.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split


PHYSICAL_FAULTS = {
    "combustion_irregularity",
    "thermal_abnormality",
    "efficiency_degradation",
}
SENSOR_FAULTS = {"sensor_bias", "sensor_drift", "sensor_stuck", "sensor_dropout"}
MEASUREMENT_CHANNELS = {
    "rpm": ("state_rpm", "healthy_ref_rpm"),
    "manifold_pressure": (
        "state_manifold_pressure_pa",
        "healthy_ref_manifold_pressure_pa",
    ),
    "cht": ("state_cht_c", "healthy_ref_cht_c"),
    "egt": ("state_egt_c", "healthy_ref_egt_c"),
    "oil_temp": ("state_oil_temp_c", "healthy_ref_oil_temp_c"),
    "oil_pressure": (
        "state_oil_pressure_kpa",
        "healthy_ref_oil_pressure_kpa",
    ),
    "fuel_flow": ("state_fuel_flow_kg_s", "healthy_ref_fuel_flow_kg_s"),
    "power": ("state_power_kw", "healthy_ref_power_kw"),
    "torque": ("state_torque_nm", "healthy_ref_torque_nm"),
    "vibration": ("state_vibration_rms_g", "healthy_ref_vibration_rms_g"),
}
MEASUREMENT_COLUMNS = {
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
RAW_COLUMNS = [
    "scenario_id",
    "engine_id",
    "timestamp_utc",
    "time_s",
    "operating_phase",
    "engine_split",
    "scenario_split",
    "altitude_m",
    "ambient_temp_c",
    "ambient_pressure_pa",
    "air_density_kg_m3",
    "throttle_pct",
    "state_rpm",
    "state_manifold_pressure_pa",
    "state_air_flow_kg_s",
    "state_fuel_flow_kg_s",
    "state_power_kw",
    "state_torque_nm",
    "state_cht_c",
    "state_egt_c",
    "state_oil_temp_c",
    "state_oil_pressure_kpa",
    "state_vibration_rms_g",
    "healthy_ref_rpm",
    "healthy_ref_manifold_pressure_pa",
    "healthy_ref_fuel_flow_kg_s",
    "healthy_ref_power_kw",
    "healthy_ref_torque_nm",
    "healthy_ref_cht_c",
    "healthy_ref_egt_c",
    "healthy_ref_oil_temp_c",
    "healthy_ref_oil_pressure_kpa",
    "healthy_ref_vibration_rms_g",
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
    "measurement_missing_reason",
    "fault_type",
    "fault_severity",
    "fault_active",
    "fault_onset_s",
    "fault_duration_s",
    "sensor_fault_target",
    "rul_hours",
    "data_origin",
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _make_token(rng: np.random.Generator) -> str:
    return rng.bytes(8).hex()


def _stratified_scenario_split(
    scenarios: pd.DataFrame, seed: int, fractions: dict[str, float]
) -> dict[str, set[str]]:
    """Create scenario splits while stratifying by class and severity."""
    strata = scenarios["fault_type"] + "|" + scenarios["operating_phase"]
    test_fraction = fractions["scenario_test"]
    validation_fraction = fractions["validation"]
    scenario_ids = scenarios["scenario_id"].to_numpy(dtype=object)
    train_val, test = train_test_split(
        scenario_ids,
        test_size=test_fraction,
        random_state=seed,
        stratify=strata.to_numpy(dtype=object),
    )
    train_val_rows = scenarios.set_index("scenario_id").loc[list(train_val)]
    train, validation = train_test_split(
        train_val_rows.index.to_numpy(dtype=object),
        test_size=(validation_fraction / (1.0 - test_fraction)),
        random_state=seed + 1,
        stratify=(
            train_val_rows["fault_type"] + "|" + train_val_rows["operating_phase"]
        ).to_numpy(dtype=object),
    )
    return {
        "train": set(train),
        "validation": set(validation),
        "scenario_test": set(test),
    }


def _atmosphere(
    altitude_m: np.ndarray, ambient_temp_c: np.ndarray, config: dict[str, Any]
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    constants = config["assumption_constants"]
    temperature_k = ambient_temp_c + 273.15
    pressure_pa = (
        constants["sea_level_pressure_pa"]
        * (
            1
            - constants["tropospheric_lapse_rate_k_m"]
            * altitude_m
            / constants["sea_level_temperature_k"]
        )
        ** (
            constants["standard_gravity_m_s2"]
            / (
                constants["dry_air_gas_constant_j_kg_k"]
                * constants["tropospheric_lapse_rate_k_m"]
            )
        )
    )
    density = pressure_pa / (
        constants["dry_air_gas_constant_j_kg_k"] * temperature_k
    )
    return temperature_k, pressure_pa, density


def _thermal_trace(
    ambient_temp_c: np.ndarray,
    dt_s: float,
    tau_s: float,
    target_offset_c: np.ndarray,
    initial_rise_c: float,
) -> np.ndarray:
    alpha = dt_s / (tau_s + dt_s)
    trace = np.empty_like(ambient_temp_c)
    trace[0] = ambient_temp_c[0] + initial_rise_c
    for index in range(1, len(trace)):
        target = ambient_temp_c[index] + target_offset_c[index]
        trace[index] = trace[index - 1] + alpha * (
            target - trace[index - 1]
        )
    return trace


def _simulate_state(
    altitude_m: np.ndarray,
    ambient_temp_c: np.ndarray,
    throttle_pct: np.ndarray,
    phase: str,
    engine: dict[str, float],
    fault_type: str,
    severity_level: int,
    fault_onset_s: int | None,
    config: dict[str, Any],
) -> dict[str, np.ndarray]:
    """Compute latent state and matched healthy reference for one scenario."""
    del phase  # Phase is contextual metadata; no unvalidated phase-specific map is assumed.
    constants = config["assumption_constants"]
    equations = config["surrogate_equation_parameters"]
    dt = float(config["sample_interval_s"])
    count = len(throttle_pct)
    temperature_k, pressure_pa, density = _atmosphere(
        altitude_m, ambient_temp_c, config
    )
    throttle_fraction = throttle_pct / 100.0
    pressure_ratio = (
        constants["manifold_pressure_closed_throttle_fraction"]
        + constants["manifold_pressure_throttle_gain"] * throttle_fraction
    )
    manifold_healthy = pressure_pa * pressure_ratio
    rated_rpm = engine["rated_rpm"]
    rpm_healthy = engine["idle_rpm"] + (
        rated_rpm - engine["idle_rpm"]
    ) * np.power(throttle_fraction, equations["rpm_throttle_exponent"])
    sea_level_density = constants["sea_level_pressure_pa"] / (
        constants["dry_air_gas_constant_j_kg_k"]
        * constants["sea_level_temperature_k"]
    )
    rpm_healthy *= np.clip(
        (density / sea_level_density) ** equations["rpm_density_exponent"],
        equations["rpm_density_factor_minimum"],
        equations["rpm_density_factor_maximum"],
    )

    active = np.zeros(count, dtype=bool)
    if fault_onset_s is not None:
        active[fault_onset_s:] = True
    severity_fraction = severity_level / 3.0
    rpm_factor = np.ones(count)
    efficiency_factor = np.ones(count)
    fuel_compensation = np.ones(count)
    thermal_severity = np.zeros(count)

    if fault_type == "combustion_irregularity":
        phase_angle = np.arange(count) * (
            2
            * math.pi
            / equations["combustion_ripple_period_samples"]
        )
        irregularity = equations["combustion_ripple_base_fraction"] + (
            equations["combustion_ripple_amplitude_fraction"]
            * np.sin(phase_angle)
        )
        efficiency_factor[active] -= (
            equations["combustion_efficiency_loss_at_full_severity_fraction"]
            * severity_fraction
            * irregularity[active]
        )
        rpm_factor[active] -= (
            equations["combustion_rpm_loss_at_full_severity_fraction"]
            * severity_fraction
            * irregularity[active]
        )
    elif fault_type == "thermal_abnormality":
        thermal_severity[active] = severity_fraction
    elif fault_type == "efficiency_degradation":
        efficiency_factor[active] -= (
            equations["efficiency_loss_at_full_severity_fraction"]
            * severity_fraction
        )
        rpm_factor[active] -= (
            equations["efficiency_rpm_loss_at_full_severity_fraction"]
            * severity_fraction
        )
        fuel_compensation[active] += (
            equations["efficiency_fuel_compensation_at_full_severity_fraction"]
            * severity_fraction
        )

    rpm_state = rpm_healthy * rpm_factor
    manifold_state = manifold_healthy
    air_flow = (
        manifold_state
        / (constants["dry_air_gas_constant_j_kg_k"] * temperature_k)
        * engine["displacement_m3"]
        * (rpm_state / 120.0)
        * engine["volumetric_efficiency"]
    )
    fuel_flow_healthy = air_flow / constants["air_fuel_mass_ratio"]
    fuel_flow_state = fuel_flow_healthy * fuel_compensation
    efficiency = engine["healthy_thermal_efficiency"] * efficiency_factor
    power_w = (
        fuel_flow_state
        * constants["gasoline_lower_heating_value_j_kg"]
        * efficiency
    )
    power_kw = power_w / 1000.0
    angular_speed = rpm_state * (2 * math.pi / 60.0)
    torque_nm = power_w / angular_speed
    torque_healthy_nm = (
        fuel_flow_healthy
        * constants["gasoline_lower_heating_value_j_kg"]
        * engine["healthy_thermal_efficiency"]
        / (rpm_healthy * (2 * math.pi / 60.0))
    )
    healthy_power_kw = (
        fuel_flow_healthy
        * constants["gasoline_lower_heating_value_j_kg"]
        * engine["healthy_thermal_efficiency"]
        / 1000.0
    )

    thermal_cht_offset = (
        constants["healthy_cht_offset_c"]
        + constants["healthy_cht_throttle_gain_c"] * throttle_pct
    )
    thermal_egt_offset = (
        constants["healthy_egt_offset_c"]
        + constants["healthy_egt_throttle_gain_c"] * throttle_pct
    )
    cht_extra = equations["thermal_cht_rise_at_full_severity_c"] * thermal_severity
    egt_extra = equations["thermal_egt_rise_at_full_severity_c"] * thermal_severity
    cht = _thermal_trace(
        ambient_temp_c,
        dt,
        constants["thermal_time_constant_s"],
        thermal_cht_offset + cht_extra,
        equations["thermal_initial_rise_above_ambient_c"],
    )
    egt = _thermal_trace(
        ambient_temp_c,
        dt,
        constants["thermal_time_constant_s"],
        thermal_egt_offset + egt_extra,
        equations["thermal_initial_rise_above_ambient_c"],
    )
    cht_healthy = _thermal_trace(
        ambient_temp_c,
        dt,
        constants["thermal_time_constant_s"],
        thermal_cht_offset,
        equations["thermal_initial_rise_above_ambient_c"],
    )
    egt_healthy = _thermal_trace(
        ambient_temp_c,
        dt,
        constants["thermal_time_constant_s"],
        thermal_egt_offset,
        equations["thermal_initial_rise_above_ambient_c"],
    )
    oil_temp = _thermal_trace(
        ambient_temp_c,
        dt,
        equations["oil_temperature_time_constant_s"],
        equations["oil_temperature_offset_c"]
        + equations["oil_temperature_throttle_gain_c_per_pct"] * throttle_pct
        + equations["oil_temperature_cht_coupling"] * cht_extra,
        equations["thermal_initial_rise_above_ambient_c"],
    )
    oil_temp_healthy = _thermal_trace(
        ambient_temp_c,
        dt,
        equations["oil_temperature_time_constant_s"],
        equations["oil_temperature_offset_c"]
        + equations["oil_temperature_throttle_gain_c_per_pct"] * throttle_pct,
        equations["thermal_initial_rise_above_ambient_c"],
    )
    oil_pressure = (
        constants["oil_pressure_idle_kpa"]
        + constants["oil_pressure_rpm_gain_kpa"] * rpm_state / rated_rpm
        - constants["oil_pressure_hot_oil_loss_kpa_per_c"]
        * np.maximum(
            oil_temp - constants["oil_pressure_hot_reference_temp_c"], 0.0
        )
    )
    healthy_oil_pressure = (
        constants["oil_pressure_idle_kpa"]
        + constants["oil_pressure_rpm_gain_kpa"] * rpm_healthy / rated_rpm
        - constants["oil_pressure_hot_oil_loss_kpa_per_c"]
        * np.maximum(
            oil_temp_healthy - constants["oil_pressure_hot_reference_temp_c"],
            0.0,
        )
    )
    vibration = (
        equations["healthy_vibration_offset_g"]
        + equations["healthy_vibration_throttle_gain_g_per_pct"] * throttle_pct
        + (
            equations["combustion_vibration_rise_at_full_severity_g"]
            * severity_fraction
            * active.astype(float)
            * (fault_type == "combustion_irregularity")
        )
    )
    healthy_vibration = (
        equations["healthy_vibration_offset_g"]
        + equations["healthy_vibration_throttle_gain_g_per_pct"] * throttle_pct
    )

    return {
        "state_rpm": rpm_state,
        "state_manifold_pressure_pa": manifold_state,
        "state_air_flow_kg_s": air_flow,
        "state_fuel_flow_kg_s": fuel_flow_state,
        "state_power_kw": power_kw,
        "state_torque_nm": torque_nm,
        "state_cht_c": cht,
        "state_egt_c": egt,
        "state_oil_temp_c": oil_temp,
        "state_oil_pressure_kpa": oil_pressure,
        "state_vibration_rms_g": vibration,
        "healthy_ref_rpm": rpm_healthy,
        "healthy_ref_manifold_pressure_pa": manifold_healthy,
        "healthy_ref_fuel_flow_kg_s": fuel_flow_healthy,
        "healthy_ref_power_kw": healthy_power_kw,
        "healthy_ref_torque_nm": torque_healthy_nm,
        "healthy_ref_cht_c": cht_healthy,
        "healthy_ref_egt_c": egt_healthy,
        "healthy_ref_oil_temp_c": oil_temp_healthy,
        "healthy_ref_oil_pressure_kpa": healthy_oil_pressure,
        "healthy_ref_vibration_rms_g": healthy_vibration,
        "ambient_pressure_pa": pressure_pa,
        "air_density_kg_m3": density,
    }


def _make_scenario_rows(
    descriptor: dict[str, Any],
    engine: dict[str, float],
    config: dict[str, Any],
) -> pd.DataFrame:
    rng = np.random.default_rng(descriptor["scenario_seed"])
    duration = int(config["duration_s"])
    time_s = np.arange(duration, dtype=np.int32)
    temporal = config["temporal_profile_assumptions"]
    ambient_altitude = descriptor["nominal_altitude_m"]
    altitude = np.clip(
        ambient_altitude
        + temporal["altitude_sinusoid_amplitude_m"]
        * np.sin(
            2
            * math.pi
            * time_s
            / temporal["altitude_sinusoid_period_s"]
        )
        + rng.normal(
            0.0, temporal["altitude_noise_standard_deviation_m"], duration
        ),
        *config["altitude_range_m"],
    )
    temperature_offset = descriptor["ambient_temperature_offset_c"]
    standard_temp = (
        config["assumption_constants"]["sea_level_temperature_k"]
        - config["assumption_constants"]["tropospheric_lapse_rate_k_m"] * altitude
        - 273.15
    )
    ambient_temp = (
        standard_temp
        + temperature_offset
        + temporal["ambient_temperature_sinusoid_amplitude_c"]
        * np.sin(
            2
            * math.pi
            * time_s
            / temporal["ambient_temperature_sinusoid_period_s"]
        )
        + rng.normal(
            0.0,
            temporal["ambient_temperature_noise_standard_deviation_c"],
            duration,
        )
    )
    throttle = np.clip(
        descriptor["nominal_throttle_pct"]
        + temporal["throttle_sinusoid_amplitude_pct"]
        * np.sin(
            2
            * math.pi
            * time_s
            / temporal["throttle_sinusoid_period_s"]
        )
        + rng.normal(
            0.0, temporal["throttle_noise_standard_deviation_pct"], duration
        ),
        temporal["throttle_minimum_pct"],
        temporal["throttle_maximum_pct"],
    )
    onset = descriptor["fault_onset_s"]
    state = _simulate_state(
        altitude,
        ambient_temp,
        throttle,
        descriptor["operating_phase"],
        engine,
        descriptor["fault_type"],
        descriptor["severity_level"],
        onset,
        config,
    )

    measurements: dict[str, np.ndarray] = {}
    noise = config["sensor_noise_standard_deviation"]
    for key, (state_column, _) in MEASUREMENT_CHANNELS.items():
        measurements[key] = state[state_column] + rng.normal(
            0.0, noise[key], duration
        )

    target = descriptor["sensor_fault_target"]
    severity = descriptor["severity_level"]
    affected_key = target if target in MEASUREMENT_COLUMNS else None
    missing_reason = np.full(duration, "", dtype=object)
    if descriptor["fault_type"] in SENSOR_FAULTS and affected_key is not None:
        active = time_s >= onset
        base_offset = (
            config["sensor_fault_bias_magnitudes_by_severity_level"][affected_key]
            * severity
        )
        if descriptor["fault_type"] == "sensor_bias":
            measurements[affected_key][active] += base_offset
        elif descriptor["fault_type"] == "sensor_drift":
            ramp = np.zeros(duration)
            if active.any():
                ramp[active] = np.linspace(
                    0.0, base_offset, int(active.sum()), dtype=np.float64
                )
            measurements[affected_key] += ramp
        elif descriptor["fault_type"] == "sensor_stuck":
            first_active = int(onset)
            measurements[affected_key][first_active:] = measurements[affected_key][
                first_active - 1
            ]
        elif descriptor["fault_type"] == "sensor_dropout":
            dropped = active & (
                rng.random(duration)
                < float(config["sensor_dropout_probability_per_sample"])
            )
            measurements[affected_key][dropped] = np.nan
            missing_reason[dropped] = "injected_sensor_dropout"

    rows: dict[str, Any] = {
        "scenario_id": descriptor["scenario_id"],
        "engine_id": descriptor["engine_id"],
        "timestamp_utc": (
            pd.Timestamp("2026-01-01T00:00:00Z")
            + pd.to_timedelta(time_s, unit="s")
        ).astype(str),
        "time_s": time_s,
        "operating_phase": descriptor["operating_phase"],
        "engine_split": descriptor["engine_split"],
        "scenario_split": descriptor["scenario_split"],
        "altitude_m": altitude,
        "ambient_temp_c": ambient_temp,
        "ambient_pressure_pa": state["ambient_pressure_pa"],
        "air_density_kg_m3": state["air_density_kg_m3"],
        "throttle_pct": throttle,
        **state,
        "measurement_missing_reason": missing_reason,
        "fault_type": descriptor["fault_type"],
        "fault_severity": descriptor["fault_severity"],
        "fault_active": (
            (time_s >= onset).astype(np.int8)
            if onset is not None
            else np.zeros(duration, dtype=np.int8)
        ),
        "fault_onset_s": onset,
        "fault_duration_s": duration - onset if onset is not None else np.nan,
        "sensor_fault_target": target if target else "",
        "rul_hours": np.nan,
        "data_origin": "synthetic_assumption_driven_v0.2",
    }
    for key, column in MEASUREMENT_COLUMNS.items():
        rows[column] = measurements[key]
    frame = pd.DataFrame(rows)
    return frame[RAW_COLUMNS]


def _make_descriptors(
    config: dict[str, Any], rng: np.random.Generator, id_rng: np.random.Generator
) -> tuple[list[dict[str, Any]], pd.DataFrame, pd.DataFrame]:
    counts = config["engine_counts_by_split"]
    engine_records: list[dict[str, Any]] = []
    split_names = [
        split
        for split, count in counts.items()
        for _ in range(int(count))
    ]
    rng.shuffle(split_names)
    engine_ids = [_make_token(id_rng) for _ in split_names]
    if len(set(engine_ids)) != len(engine_ids):
        raise RuntimeError("Engine ID collision")

    param_ranges = config["generic_engine_parameter_ranges"]
    engines: dict[str, dict[str, Any]] = {}
    for engine_id, engine_split in zip(engine_ids, split_names):
        engine = {
            "engine_id": engine_id,
            "engine_split": engine_split,
            "displacement_m3": float(rng.uniform(*param_ranges["displacement_m3"])),
            "idle_rpm": float(rng.uniform(*param_ranges["idle_rpm"])),
            "rated_rpm": float(rng.uniform(*param_ranges["rated_rpm"])),
            "volumetric_efficiency": float(
                rng.uniform(*param_ranges["volumetric_efficiency"])
            ),
            "healthy_thermal_efficiency": float(
                rng.uniform(*param_ranges["healthy_thermal_efficiency"])
            ),
        }
        engines[engine_id] = engine
        engine_records.append(engine.copy())

    descriptors: list[dict[str, Any]] = []
    severity_levels = config["severity_levels"]
    for engine_id, engine_split in zip(engine_ids, split_names):
        for fault_type in config["fault_classes"]:
            for phase in config["phases"]:
                if fault_type == "normal":
                    severity = "none"
                    severity_level = 0
                    onset = None
                    sensor_target = ""
                else:
                    severity = str(rng.choice(list(severity_levels.keys())))
                    severity_level = int(severity_levels[severity])
                    onset = int(
                        rng.integers(
                            int(config["fault_onset_min_s"]),
                            int(config["fault_onset_max_s"]) + 1,
                        )
                    )
                    sensor_target = (
                        str(rng.choice(config["sensor_targets"]))
                        if fault_type in SENSOR_FAULTS
                        else ""
                    )
                descriptors.append(
                    {
                        "engine_id": engine_id,
                        "engine_split": engine_split,
                        "operating_phase": phase,
                        "fault_type": fault_type,
                        "fault_severity": severity,
                        "severity_level": severity_level,
                        "fault_onset_s": onset,
                        "sensor_fault_target": sensor_target,
                        "nominal_altitude_m": float(rng.uniform(*config["altitude_range_m"])),
                        "ambient_temperature_offset_c": float(
                            rng.uniform(*config["ambient_temperature_offset_range_c"])
                        ),
                        "nominal_throttle_pct": float(
                            rng.uniform(*config["throttle_range_pct"])
                        ),
                        "scenario_seed": int(rng.integers(0, 2**32, dtype=np.uint64)),
                    }
                )
    rng.shuffle(descriptors)
    scenario_ids = [_make_token(id_rng) for _ in descriptors]
    if len(set(scenario_ids)) != len(scenario_ids):
        raise RuntimeError("Scenario ID collision")
    for descriptor, scenario_id in zip(descriptors, scenario_ids):
        descriptor["scenario_id"] = scenario_id

    train_engine_ids = {
        engine["engine_id"]
        for engine in engine_records
        if engine["engine_split"] == "train"
    }
    scenario_table = pd.DataFrame(
        [
            descriptor
            for descriptor in descriptors
            if descriptor["engine_id"] in train_engine_ids
        ]
    )
    splits = _stratified_scenario_split(
        scenario_table,
        int(config["seed"]),
        config["scenario_split_fractions"],
    )
    for descriptor in descriptors:
        if descriptor["engine_split"] == "train":
            descriptor["scenario_split"] = next(
                split
                for split, scenario_ids_for_split in splits.items()
                if descriptor["scenario_id"] in scenario_ids_for_split
            )
        else:
            descriptor["scenario_split"] = ""

    engine_frame = pd.DataFrame(engine_records)
    return descriptors, engine_frame, scenario_table


def generate_dataset(config_path: Path, output_dir: Path) -> dict[str, Any]:
    config_bytes = config_path.read_bytes()
    config = json.loads(config_bytes)
    seed = int(config["seed"])
    rng = np.random.default_rng(seed)
    id_rng = np.random.default_rng(np.random.SeedSequence([seed, 0xA51D]))
    descriptors, engines, _ = _make_descriptors(config, rng, id_rng)
    engine_parameters = engines.set_index("engine_id").to_dict("index")

    frames = [
        _make_scenario_rows(
            descriptor, engine_parameters[descriptor["engine_id"]], config
        )
        for descriptor in descriptors
    ]
    raw = pd.concat(frames, ignore_index=True)
    manifest = pd.DataFrame(descriptors).merge(
        engines,
        on=["engine_id", "engine_split"],
        how="left",
        validate="many_to_one",
        suffixes=("", "_engine"),
    )
    manifest["duration_s"] = int(config["duration_s"])
    manifest["sample_interval_s"] = float(config["sample_interval_s"])
    manifest["parameter_source_status"] = "generic_documented_assumption_not_engine_spec"
    manifest = manifest.sort_values("scenario_id").reset_index(drop=True)
    engine_manifest = engines.sort_values("engine_id").reset_index(drop=True)

    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "data" / "raw").mkdir(parents=True, exist_ok=True)
    (output_dir / "metadata").mkdir(parents=True, exist_ok=True)
    (output_dir / "splits").mkdir(parents=True, exist_ok=True)
    raw_path = output_dir / "data" / "raw" / "engine_twin_v0.2_raw.csv"
    manifest_path = output_dir / "metadata" / "scenario_manifest.csv"
    engine_path = output_dir / "metadata" / "engine_manifest.csv"
    raw.to_csv(raw_path, index=False, float_format="%.15g")
    manifest.to_csv(manifest_path, index=False, float_format="%.15g")
    engine_manifest.to_csv(engine_path, index=False, float_format="%.15g")

    scenario_split_map = {
        "train": "scenario_train",
        "validation": "scenario_validation",
        "scenario_test": "scenario_test",
    }
    split_paths: list[Path] = []
    for split, stem in scenario_split_map.items():
        selected = manifest[manifest["scenario_split"] == split]
        split_path = output_dir / "splits" / f"{stem}_scenarios.csv"
        selected[["scenario_id", "engine_id", "fault_type", "fault_severity"]].to_csv(
            split_path, index=False
        )
        split_paths.append(split_path)
    engine_split_map = {
        "train": "engine_train",
        "validation": "engine_validation",
        "test": "engine_test",
    }
    for split, stem in engine_split_map.items():
        selected = engine_manifest[engine_manifest["engine_split"] == split]
        engine_split_path = output_dir / "splits" / f"{stem}_engines.csv"
        selected[["engine_id", "engine_split"]].to_csv(engine_split_path, index=False)
        scenario_split_path = output_dir / "splits" / f"{stem}_scenarios.csv"
        manifest[manifest["engine_split"] == split][
            ["scenario_id", "engine_id", "fault_type", "fault_severity"]
        ].to_csv(scenario_split_path, index=False)
        split_paths.extend([engine_split_path, scenario_split_path])

    source_path = Path(__file__).resolve()
    card = {
        "dataset_name": config["dataset_name"],
        "version": config["version"],
        "synthetic_only": True,
        "reference_engine": None,
        "manufacturer_or_drdo_data": False,
        "generator_seed": seed,
        "rng": "numpy PCG64 via numpy.default_rng; per-scenario RNG seeded in scenario manifest",
        "configuration_sha256": hashlib.sha256(config_bytes).hexdigest(),
        "generator_sha256": sha256(source_path),
        "row_count": int(len(raw)),
        "scenario_count": int(len(manifest)),
        "engine_count": int(len(engine_manifest)),
        "engine_parameters_are_synthetic_ranges": config[
            "generic_engine_parameter_ranges"
        ],
        "samples_per_scenario": int(config["duration_s"]),
        "sample_interval_s": float(config["sample_interval_s"]),
        "fault_classes": config["fault_classes"],
        "fault_semantics": {
            "physical_degradation_classes": sorted(PHYSICAL_FAULTS),
            "sensor_integrity_classes": sorted(SENSOR_FAULTS),
            "sensor_faults_do_not_modify_latent_engine_state": True,
            "fault_active": "1 from onset sample inclusive through scenario end; 0 for normal",
        },
        "health_index_target": None,
        "rul_hours": None,
        "intended_use": [
            "synthetic pipeline prototyping",
            "fault detection and classification workflow demonstrations",
        ],
        "not_for": [
            "flight use",
            "maintenance decisions",
            "safety-critical decisions",
            "real-engine accuracy claims",
            "manufacturer operating limits",
        ],
        "known_limitations": [
            "No specific engine is identified; all numerical engine parameters are generic assumptions.",
            "The model is a simplified quasi-steady surrogate, not a validated MVEM or thermodynamic engine model.",
            "Synthetic classifier results only measure performance on this simulator.",
            "No health-index or RUL target is claimed.",
            "Oil pressure is explicitly represented in kPa as a generic proxy; no target-engine value is asserted.",
        ],
        "files_sha256": {
            "config/dataset_config.json": sha256(config_path),
            "data/raw/engine_twin_v0.2_raw.csv": sha256(raw_path),
            "metadata/scenario_manifest.csv": sha256(manifest_path),
            "metadata/engine_manifest.csv": sha256(engine_path),
            **{
                str(path.relative_to(output_dir)).replace("\\", "/"): sha256(path)
                for path in sorted(split_paths)
            },
        },
    }
    card_path = output_dir / "metadata" / "dataset_card.json"
    card_path.write_text(json.dumps(card, indent=2) + "\n", encoding="utf-8")
    return card


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--config",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "config" / "dataset_config.json",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1],
    )
    args = parser.parse_args()
    card = generate_dataset(args.config, args.output_dir)
    print(
        f"Generated {card['row_count']} rows, {card['scenario_count']} scenarios, "
        f"{card['engine_count']} engines into {args.output_dir}"
    )


if __name__ == "__main__":
    main()
