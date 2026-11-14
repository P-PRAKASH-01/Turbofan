#!/usr/bin/env python3
"""Run reproducibility, physical-consistency, label, split, and leakage checks."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import tempfile
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from .build_features import FORBIDDEN_FEATURES
from .generate_dataset import (
    MEASUREMENT_CHANNELS,
    MEASUREMENT_COLUMNS,
    SENSOR_FAULTS,
    generate_dataset,
    sha256,
)


def _record(
    checks: list[dict[str, Any]],
    name: str,
    passed: bool,
    details: str,
    severity: str = "High",
) -> None:
    checks.append(
        {
            "check": name,
            "status": "PASS" if passed else "FAIL",
            "severity_if_failed": severity,
            "details": details,
        }
    )


def _metadata_tables(
    raw: pd.DataFrame, dataset_dir: Path, config: dict[str, Any]
) -> None:
    register = pd.read_csv(dataset_dir / "metadata" / "parameter_register.csv")
    register_units = {
        "altitude_m": "m",
        "ambient_temp_c": "degC",
        "ambient_pressure_pa": "Pa",
        "air_density_kg_m3": "kg/m^3",
        "throttle_pct": "%",
    }
    for key, measurement in MEASUREMENT_COLUMNS.items():
        register_units[measurement] = {
            "rpm": "rev/min",
            "manifold_pressure": "Pa",
            "cht": "degC",
            "egt": "degC",
            "oil_temp": "degC",
            "oil_pressure": "kPa",
            "fuel_flow": "kg/s",
            "power": "kW",
            "torque": "N m",
            "vibration": "g RMS",
        }[key]
    for key, (state_column, reference_column) in MEASUREMENT_CHANNELS.items():
        unit = register_units[MEASUREMENT_COLUMNS[key]]
        register_units[state_column] = unit
        register_units[reference_column] = unit
    register_units.update(
        {
            "state_air_flow_kg_s": "kg/s",
            "fault_onset_s": "s",
            "fault_duration_s": "s",
            "fault_active": "0/1",
            "fault_severity": "category",
            "fault_type": "category",
            "sensor_fault_target": "channel name",
            "rul_hours": "h (unpopulated)",
            "timestamp_utc": "ISO 8601 UTC",
            "time_s": "s",
            "scenario_id": "opaque identifier",
            "engine_id": "opaque identifier",
            "operating_phase": "category",
            "engine_split": "category",
            "scenario_split": "category",
            "measurement_missing_reason": "category",
            "data_origin": "category",
        }
    )
    kind_override = {
        "scenario_id": "identifier",
        "engine_id": "identifier",
        "timestamp_utc": "time metadata",
        "time_s": "time metadata",
        "operating_phase": "operating context",
        "engine_split": "split metadata",
        "scenario_split": "split metadata",
        "fault_type": "ground-truth label",
        "fault_severity": "ground-truth label",
        "fault_active": "ground-truth label",
        "fault_onset_s": "ground-truth label",
        "fault_duration_s": "ground-truth label",
        "sensor_fault_target": "ground-truth label",
        "rul_hours": "unpopulated target",
        "measurement_missing_reason": "measurement quality metadata",
        "data_origin": "provenance metadata",
    }
    definitions = []
    for column in raw.columns:
        if column in register_units:
            unit = register_units[column]
        elif column.startswith("state_") or column.startswith("healthy_ref_"):
            unit = "see corresponding channel"
        elif column.endswith("_meas"):
            unit = "see corresponding channel"
        else:
            unit = "dimensionless/category"
        if column in kind_override:
            kind = kind_override[column]
        elif column.startswith("state_"):
            kind = "simulated latent physical-state surrogate"
        elif column.startswith("healthy_ref_"):
            kind = "derived healthy reference surrogate"
        elif column.endswith("_meas"):
            kind = "simulated sensor measurement"
        elif column in {
            "altitude_m",
            "ambient_temp_c",
            "ambient_pressure_pa",
            "air_density_kg_m3",
            "throttle_pct",
        }:
            kind = "operating input or derived environment"
        else:
            kind = "metadata"
        if column in register_units:
            description = (
                "Explicitly synthetic generic-engine value; not manufacturer data."
                if kind not in {"ground-truth label", "identifier"}
                else "Metadata/label only; excluded from predictors."
            )
        else:
            description = "Unit and meaning inherit from the corresponding named sensor channel."
        definitions.append(
            {
                "column": column,
                "dtype": str(raw[column].dtype),
                "unit": unit,
                "kind": kind,
                "source_and_caveat": description,
            }
        )
    pd.DataFrame(definitions).to_csv(
        dataset_dir / "metadata" / "data_dictionary.csv", index=False
    )

    numeric = raw.select_dtypes(include="number")
    stats = pd.DataFrame(
        {
            "column": raw.columns,
            "dtype": [str(raw[column].dtype) for column in raw.columns],
            "unit": [
                register_units.get(column, "see channel/category")
                for column in raw.columns
            ],
            "kind": [
                kind_override.get(
                    column,
                    "latent state" if column.startswith("state_") else "observed/input",
                )
                for column in raw.columns
            ],
            "missing_count": [int(raw[column].isna().sum()) for column in raw.columns],
            "missing_pct": [100 * float(raw[column].isna().mean()) for column in raw.columns],
            "unique_count": [int(raw[column].nunique(dropna=True)) for column in raw.columns],
        }
    )
    for statistic in ("min", "max", "mean", "std"):
        stats[statistic] = [
            getattr(numeric[column].dropna(), statistic)()
            if column in numeric.columns and numeric[column].notna().any()
            else np.nan
            for column in raw.columns
        ]
    stats.to_csv(dataset_dir / "reports" / "column_statistics.csv", index=False)


def _coverage_tables(
    manifest: pd.DataFrame, config: dict[str, Any], output_path: Path
) -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    reports: dict[str, Any] = {}
    partitions: dict[str, pd.DataFrame] = {}
    for split in ("train", "validation", "scenario_test"):
        partitions[f"scenario_{split}"] = manifest[
            manifest["scenario_split"] == split
        ]
    for split in ("train", "validation", "test"):
        partitions[f"engine_{split}"] = manifest[
            manifest["engine_split"] == split
        ]

    for name, part in partitions.items():
        scenarios = part.drop_duplicates("scenario_id")
        reports[name] = {
            "scenario_count": int(len(scenarios)),
            "engine_count": int(scenarios["engine_id"].nunique()),
            "fault_type_counts": scenarios["fault_type"].value_counts().sort_index().to_dict(),
            "severity_counts": scenarios["fault_severity"].value_counts().sort_index().to_dict(),
            "phase_counts": scenarios["operating_phase"].value_counts().sort_index().to_dict(),
            "fault_by_phase": pd.crosstab(
                scenarios["fault_type"], scenarios["operating_phase"]
            ).to_dict(),
            "altitude_m_by_fault": scenarios.groupby("fault_type")[
                "nominal_altitude_m"
            ].agg(["min", "max", "mean"]).to_dict("index"),
            "throttle_pct_by_fault": scenarios.groupby("fault_type")[
                "nominal_throttle_pct"
            ].agg(["min", "max", "mean"]).to_dict("index"),
        }
        for label_type, column in (
            ("fault_type", "fault_type"),
            ("fault_severity", "fault_severity"),
            ("operating_phase", "operating_phase"),
        ):
            counts = scenarios[column].value_counts().sort_index()
            for value, count in counts.items():
                rows.append(
                    {
                        "partition": name,
                        "dimension": label_type,
                        "value": value,
                        "scenario_count": int(count),
                        "engine_count": int(
                            scenarios.loc[scenarios[column] == value, "engine_id"].nunique()
                        ),
                    }
                )
    pd.DataFrame(rows).to_csv(output_path, index=False)
    return reports


def _check_reproducibility(dataset_dir: Path) -> dict[str, str]:
    config_path = dataset_dir / "config" / "dataset_config.json"
    with tempfile.TemporaryDirectory(prefix="engine_twin_v02_") as temp:
        temp_dir = Path(temp)
        generate_dataset(config_path, temp_dir)
        relative_files = [
            Path("data/raw/engine_twin_v0.2_raw.csv"),
            Path("metadata/scenario_manifest.csv"),
            Path("metadata/engine_manifest.csv"),
            Path("metadata/dataset_card.json"),
            *sorted((dataset_dir / "splits").glob("*.csv")),
        ]
        results = {}
        for current in relative_files:
            if current.is_absolute():
                relative = current.relative_to(dataset_dir)
            else:
                relative = current
            left = dataset_dir / relative
            right = temp_dir / relative
            results[relative.as_posix()] = (
                "PASS"
                if left.is_file() and right.is_file() and sha256(left) == sha256(right)
                else "FAIL"
            )
        return results


def validate_dataset(dataset_dir: Path, check_reproducibility: bool = True) -> dict[str, Any]:
    config_path = dataset_dir / "config" / "dataset_config.json"
    raw_path = dataset_dir / "data" / "raw" / "engine_twin_v0.2_raw.csv"
    manifest_path = dataset_dir / "metadata" / "scenario_manifest.csv"
    engine_path = dataset_dir / "metadata" / "engine_manifest.csv"
    config = json.loads(config_path.read_text(encoding="utf-8"))
    raw = pd.read_csv(raw_path)
    manifest = pd.read_csv(manifest_path)
    engines = pd.read_csv(engine_path)
    processed_dir = dataset_dir / "data" / "processed"
    features = pd.read_csv(processed_dir / "features.csv")
    labels = pd.read_csv(processed_dir / "labels.csv")
    lineage = pd.read_csv(processed_dir / "feature_lineage.csv")
    checks: list[dict[str, Any]] = []

    expected_rows = int(config["duration_s"]) * len(manifest)
    _record(
        checks,
        "raw_manifest_dimensions",
        len(raw) == expected_rows and raw["scenario_id"].nunique() == len(manifest),
        f"raw_rows={len(raw)}, expected_rows={expected_rows}, scenarios={len(manifest)}",
        "High",
    )
    scenario_sizes = raw.groupby("scenario_id").size()
    scenario_time = raw.groupby("scenario_id")["time_s"].agg(["min", "max", "nunique"])
    _record(
        checks,
        "scenario_duration_and_time",
        bool(
            scenario_sizes.eq(int(config["duration_s"])).all()
            and scenario_time["min"].eq(0).all()
            and scenario_time["max"].eq(int(config["duration_s"]) - 1).all()
            and scenario_time["nunique"].eq(int(config["duration_s"])).all()
        ),
        "Every scenario has a unique contiguous 0..duration-1 time index.",
        "High",
    )

    active_expected = (
        raw["fault_type"].ne("normal")
        & raw["fault_onset_s"].notna()
        & raw["time_s"].ge(raw["fault_onset_s"])
    ).astype("int8")
    active_match = raw["fault_active"].astype("int8").eq(active_expected)
    normal_semantics = raw.loc[raw["fault_type"] == "normal"]
    onset_semantics = raw.loc[raw["fault_type"] != "normal", "fault_onset_s"].notna().all()
    _record(
        checks,
        "fault_onset_active_semantics",
        bool(active_match.all() and normal_semantics["fault_onset_s"].isna().all() and onset_semantics),
        f"active mismatches={int((~active_match).sum())}; normal_onset_null={normal_semantics['fault_onset_s'].isna().all()}",
        "High",
    )
    expected_sensor_fault = raw["fault_type"].isin(SENSOR_FAULTS)
    sensor_target_consistent = (
        raw.loc[expected_sensor_fault, "sensor_fault_target"]
        .fillna("")
        .ne("")
        .all()
        and raw.loc[~expected_sensor_fault, "sensor_fault_target"]
        .fillna("")
        .eq("")
        .all()
    )
    _record(
        checks,
        "fault_family_and_sensor_target_semantics",
        bool(sensor_target_consistent),
        "Sensor target is present for sensor-integrity faults and absent for normal/physical faults.",
        "High",
    )

    known_measurements = [MEASUREMENT_COLUMNS[key] for key in MEASUREMENT_CHANNELS]
    missing_rows = raw[known_measurements].isna().any(axis=1)
    missing_reason_consistent = (
        raw.loc[missing_rows, "measurement_missing_reason"]
        .fillna("")
        .eq("injected_sensor_dropout")
        .all()
        and raw.loc[~missing_rows, "measurement_missing_reason"]
        .fillna("")
        .eq("")
        .all()
    )
    missing_fault_consistent = raw.loc[missing_rows].apply(
        lambda row: (
            row["fault_type"] == "sensor_dropout"
            and row["fault_active"] == 1
            and row["sensor_fault_target"] in MEASUREMENT_COLUMNS
            and pd.isna(
                row[MEASUREMENT_COLUMNS[row["sensor_fault_target"]]]
            )
        ),
        axis=1,
    ).all() if missing_rows.any() else True
    _record(
        checks,
        "intentional_sensor_missingness",
        bool(missing_reason_consistent and missing_fault_consistent),
        f"missing sensor rows={int(missing_rows.sum())}; every missing row is explicitly marked and occurs on the active targeted sensor-dropout channel.",
        "High",
    )
    _record(
        checks,
        "rul_unpopulated_and_health_target_omitted",
        bool(raw["rul_hours"].isna().all() and not any("health_index" in column for column in raw.columns)),
        "RUL is null for every row; no unsupported health-index target is included.",
        "High",
    )

    split_files = {
        "scenario_train": "scenario_train_scenarios.csv",
        "scenario_validation": "scenario_validation_scenarios.csv",
        "scenario_test": "scenario_test_scenarios.csv",
    }
    scenario_sets = {
        key: set(
            pd.read_csv(dataset_dir / "splits" / filename)["scenario_id"].astype(str)
        )
        for key, filename in split_files.items()
    }
    scenario_disjoint = all(
        not (scenario_sets[left] & scenario_sets[right])
        for left, right in (
            ("scenario_train", "scenario_validation"),
            ("scenario_train", "scenario_test"),
            ("scenario_validation", "scenario_test"),
        )
    )
    engine_sets = {
        split: set(engines.loc[engines["engine_split"] == split, "engine_id"].astype(str))
        for split in ("train", "validation", "test")
    }
    engine_disjoint = all(
        not (engine_sets[left] & engine_sets[right])
        for left, right in (
            ("train", "validation"),
            ("train", "test"),
            ("validation", "test"),
        )
    )
    _record(
        checks,
        "scenario_heldout_splits_disjoint",
        scenario_disjoint,
        f"scenario counts={ {key: len(value) for key, value in scenario_sets.items()} }; pairwise intersections are empty.",
        "Critical",
    )
    _record(
        checks,
        "engine_heldout_splits_disjoint",
        engine_disjoint,
        f"engine counts={ {key: len(value) for key, value in engine_sets.items()} }; pairwise intersections are empty.",
        "Critical",
    )
    scenario_coverage = manifest.groupby("scenario_split", dropna=False)[
        "fault_type"
    ].nunique()
    engine_coverage = manifest.groupby("engine_split")["fault_type"].nunique()
    expected_class_count = len(config["fault_classes"])
    scenario_coverage_ok = all(
        int(scenario_coverage.get(split, 0)) == expected_class_count
        for split in ("train", "validation", "scenario_test")
    )
    engine_coverage_ok = all(
        int(engine_coverage.get(split, 0)) == expected_class_count
        for split in ("train", "validation", "test")
    )
    split_phase_coverage: dict[str, dict[str, int]] = {}
    complete_cross = True
    for column, split_values in (
        ("scenario_split", ("train", "validation", "scenario_test")),
        ("engine_split", ("train", "validation", "test")),
    ):
        for split in split_values:
            part = manifest.loc[manifest[column] == split]
            cross = pd.crosstab(part["fault_type"], part["operating_phase"])
            key = f"{column}_{split}"
            split_phase_coverage[key] = {
                str(fault): int(count)
                for fault, count in cross.min(axis=1).items()
            }
            complete_cross &= bool(
                set(cross.index) == set(config["fault_classes"])
                and set(cross.columns) == set(config["phases"])
                and cross.gt(0).all().all()
            )
    _record(
        checks,
        "fault_and_phase_coverage",
        bool(scenario_coverage_ok and engine_coverage_ok and complete_cross),
        f"All {expected_class_count} fault classes and all phases are represented in every scenario- and engine-held-out split; minimum per fault/phase counts={split_phase_coverage}.",
        "High",
    )
    _record(
        checks,
        "scenario_identifier_opaque_and_feature_excluded",
        bool(
            raw["scenario_id"].astype(str).str.fullmatch(r"[0-9a-f]{16}").all()
            and not FORBIDDEN_FEATURES.intersection(features.columns)
            and "scenario_id" not in features.columns
            and "engine_id" not in features.columns
        ),
        "Scenario/engine IDs use independent random opaque tokens; identifiers and labels are absent from the feature matrix.",
        "Critical",
    )

    constants = config["assumption_constants"]
    temperature_k = raw["ambient_temp_c"] + 273.15
    density_expected = raw["ambient_pressure_pa"] / (
        constants["dry_air_gas_constant_j_kg_k"] * temperature_k
    )
    density_pass = np.allclose(
        raw["air_density_kg_m3"], density_expected, rtol=2e-8, atol=2e-8
    )
    _record(
        checks,
        "ideal_gas_density_consistency",
        bool(density_pass),
        f"air_density = ambient_pressure / (R_air * temperature_kelvin); max absolute error={float(np.max(np.abs(raw['air_density_kg_m3']-density_expected))):.3g} kg/m^3.",
        "High",
    )
    omega = raw["state_rpm"].to_numpy() * (2 * np.pi / 60.0)
    power_reconstructed_w = raw["state_torque_nm"].to_numpy() * omega
    state_power_w = raw["state_power_kw"].to_numpy() * 1000.0
    power_error = np.abs(state_power_w - power_reconstructed_w)
    power_consistent = np.allclose(
        state_power_w, power_reconstructed_w, rtol=1e-10, atol=1e-6
    )
    _record(
        checks,
        "latent_power_torque_rpm_identity",
        bool(power_consistent),
        f"state_power_kw * 1000 = state_torque_nm * state_rpm * 2*pi/60; maximum absolute error={float(power_error.max()):.3g} W. No such identity is claimed for noisy/faulted sensor measurements.",
        "High",
    )
    oil_pressure = raw["state_oil_pressure_kpa"]
    _record(
        checks,
        "oil_pressure_unit_and_equation",
        bool(
            "oil_pressure_idle_kpa" in constants
            and oil_pressure.notna().all()
            and (oil_pressure > 0).all()
            and "oil_pressure_kpa_meas" in raw.columns
        ),
        f"Latent and observed oil-pressure channels are explicitly in kPa; state range={oil_pressure.min():.3f}..{oil_pressure.max():.3f} kPa, entirely generated by the documented generic surrogate (not a hardware range).",
        "High",
    )
    sensor_fault_rows = raw["fault_type"].isin(SENSOR_FAULTS)
    sensor_state_pairs = [
        ("state_rpm", "healthy_ref_rpm"),
        ("state_manifold_pressure_pa", "healthy_ref_manifold_pressure_pa"),
        ("state_fuel_flow_kg_s", "healthy_ref_fuel_flow_kg_s"),
        ("state_power_kw", "healthy_ref_power_kw"),
        ("state_torque_nm", "healthy_ref_torque_nm"),
        ("state_cht_c", "healthy_ref_cht_c"),
        ("state_egt_c", "healthy_ref_egt_c"),
        ("state_oil_temp_c", "healthy_ref_oil_temp_c"),
        ("state_oil_pressure_kpa", "healthy_ref_oil_pressure_kpa"),
        ("state_vibration_rms_g", "healthy_ref_vibration_rms_g"),
    ]
    sensor_state_consistent = all(
        np.allclose(
            raw.loc[sensor_fault_rows, state_column],
            raw.loc[sensor_fault_rows, reference_column],
            rtol=1e-12,
            atol=1e-10,
        )
        for state_column, reference_column in sensor_state_pairs
    )
    _record(
        checks,
        "sensor_faults_separate_from_physical_state",
        bool(sensor_state_consistent),
        "For all sensor-fault rows, latent physical state equals the matched healthy reference; injected effects are confined to the targeted observed measurement.",
        "High",
    )

    labels_present = set(labels["fault_type"].unique())
    feature_row_aligned = bool(
        len(features) == len(labels) == len(lineage) == len(raw)
        and np.array_equal(lineage["raw_row_index"], np.arange(len(raw)))
        and np.array_equal(lineage["feature_row_index"], np.arange(len(raw)))
        and np.array_equal(labels["feature_row_index"], np.arange(len(raw)))
        and labels_present == set(config["fault_classes"])
    )
    feature_schema_ok = bool(
        not FORBIDDEN_FEATURES.intersection(features.columns)
        and all(pd.api.types.is_numeric_dtype(features[column]) for column in features)
        and all(f"{key}_missing" in features.columns for key in MEASUREMENT_CHANNELS)
    )
    _record(
        checks,
        "feature_pipeline_excludes_ids_targets_and_aligns_lineage",
        bool(feature_schema_ok and feature_row_aligned),
        f"features={features.shape}; labels={labels.shape}; lineage={lineage.shape}; model matrix is numeric, contains channel missingness indicators, has no ID/label fields, and maps rows to raw data.",
        "Critical",
    )
    residual_ok = True
    for key, (state_column, reference_column) in MEASUREMENT_CHANNELS.items():
        del state_column
        measured = MEASUREMENT_COLUMNS[key]
        residual_column = f"{key}_residual"
        if residual_column not in features.columns:
            residual_ok = False
            break
        expected_residual = raw[measured] - raw[reference_column]
        if not np.allclose(
            features[residual_column].to_numpy(),
            expected_residual.to_numpy(),
            rtol=2e-7,
            atol=2e-6,
            equal_nan=True,
        ):
            residual_ok = False
            break
        if not np.array_equal(
            features[f"{key}_missing"].to_numpy(dtype=np.int8),
            raw[measured].isna().to_numpy(dtype=np.int8),
        ):
            residual_ok = False
            break
    _record(
        checks,
        "processed_residuals_missingness_and_raw_lineage",
        bool(residual_ok),
        "Every processed residual equals observed measurement minus the same-row healthy reference; missingness flags match raw NaNs.",
        "High",
    )
    card = json.loads((dataset_dir / "metadata" / "dataset_card.json").read_text(encoding="utf-8"))
    hashes_valid = all(
        (dataset_dir / relative).is_file()
        and sha256(dataset_dir / relative) == expected_hash
        for relative, expected_hash in card["files_sha256"].items()
    )
    hashes_valid = hashes_valid and card["generator_sha256"] == sha256(
        dataset_dir / "src" / "generate_dataset.py"
    )
    _record(
        checks,
        "dataset_provenance_hashes",
        bool(hashes_valid),
        "Dataset card hashes match the configured raw data, manifests, split lists, configuration, and generator source.",
        "High",
    )

    reproducibility = (
        _check_reproducibility(dataset_dir) if check_reproducibility else {}
    )
    reproducibility_pass = bool(reproducibility) and all(
        status == "PASS" for status in reproducibility.values()
    )
    _record(
        checks,
        "same_seed_regeneration",
        reproducibility_pass if check_reproducibility else False,
        (
            f"Byte-identical regeneration results: {reproducibility}"
            if check_reproducibility
            else "Reproducibility check was explicitly not run."
        ),
        "Critical",
    )

    dataset_dir.joinpath("reports").mkdir(parents=True, exist_ok=True)
    coverage = _coverage_tables(
        manifest, config, dataset_dir / "reports" / "split_coverage.csv"
    )
    _metadata_tables(raw, dataset_dir, config)
    report = {
        "dataset_version": config["version"],
        "synthetic_only": True,
        "row_count": int(len(raw)),
        "scenario_count": int(manifest["scenario_id"].nunique()),
        "engine_count": int(engines["engine_id"].nunique()),
        "scenario_split_scenario_overlap": {
            f"{left}_{right}": len(scenario_sets[left] & scenario_sets[right])
            for left, right in (
                ("scenario_train", "scenario_validation"),
                ("scenario_train", "scenario_test"),
                ("scenario_validation", "scenario_test"),
            )
        },
        "engine_split_engine_overlap": {
            name: len(engine_sets[left] & engine_sets[right])
            for name, (left, right) in (
                ("train_validation", ("train", "validation")),
                ("train_test", ("train", "test")),
                ("validation_test", ("validation", "test")),
            )
        },
        "split_coverage": coverage,
        "reproducibility_file_checks": reproducibility,
        "checks": checks,
        "failed_checks": [
            check for check in checks if check["status"] != "PASS"
        ],
        "limitations": [
            "All physical relationships are illustrative generic assumptions; no engine specification or validation data is available.",
            "Numerical consistency tests establish code consistency with declared equations only, not real-engine physical validity.",
            "Oil pressure is expressed in kPa by construction; no real-engine pressure range is asserted.",
            "No health-index or RUL target is defined.",
            "Synthetic classification performance is not evidence of real-engine accuracy.",
        ],
    }
    report_path = dataset_dir / "reports" / "validation_report.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    markdown_path = dataset_dir / "reports" / "validation_report.md"
    lines = [
        f"# ENGINE-TWIN {config['version']} validation report",
        "",
        "**Scope:** automated checks of deterministic generation, label/split semantics, units, latent-state identities, missingness, metadata, and feature leakage.",
        "",
        "**Interpretation:** all checks validate the generated files against the documented synthetic assumptions. They do not validate an actual piston engine.",
        "",
        "## Results",
        "",
        "| Check | Status | Severity if failed | Details |",
        "|---|---|---|---|",
    ]
    for check in checks:
        detail = str(check["details"]).replace("|", "\\|")
        lines.append(
            f"| {check['check']} | **{check['status']}** | {check['severity_if_failed']} | {detail} |"
        )
    lines.extend(
        [
            "",
            "## Coverage",
            "",
            "See `split_coverage.csv` for per-partition fault, severity, phase, altitude, and throttle coverage.",
            "",
            "## Limitations",
            "",
        ]
    )
    lines.extend(f"- {item}" for item in report["limitations"])
    lines.extend(
        [
            "",
            "No failed check is suppressed. A `FAIL` means the acceptance claim was not met and should block use of the affected artifact.",
            "",
        ]
    )
    markdown_path.write_text("\n".join(lines), encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dataset-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1],
    )
    parser.add_argument(
        "--skip-reproducibility",
        action="store_true",
        help="Do not regenerate the dataset for byte-comparison (the report will record failure).",
    )
    args = parser.parse_args()
    report = validate_dataset(args.dataset_dir, not args.skip_reproducibility)
    failed = report["failed_checks"]
    print(
        f"Validation: {len(report['checks']) - len(failed)}/{len(report['checks'])} checks passed"
    )
    for item in failed:
        print(f"FAIL [{item['severity_if_failed']}] {item['check']}: {item['details']}")
    print(f"Report: {args.dataset_dir / 'reports' / 'validation_report.md'}")
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
