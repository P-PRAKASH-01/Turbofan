#!/usr/bin/env python3
"""Create ID-free features, separate labels, and auditable raw-row lineage."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd

from .generate_dataset import MEASUREMENT_CHANNELS, MEASUREMENT_COLUMNS


BASE_FEATURES = [
    "altitude_m",
    "ambient_temp_c",
    "ambient_pressure_pa",
    "air_density_kg_m3",
    "throttle_pct",
]
PHASES = ["ground_run", "climb", "cruise", "descent"]
LABEL_COLUMNS = [
    "fault_type",
    "fault_severity",
    "fault_active",
    "fault_onset_s",
    "fault_duration_s",
    "sensor_fault_target",
    "rul_hours",
]
LINEAGE_COLUMNS = [
    "scenario_id",
    "engine_id",
    "operating_phase",
    "engine_split",
    "scenario_split",
    "time_s",
]
FORBIDDEN_FEATURES = {
    "scenario_id",
    "engine_id",
    "timestamp_utc",
    "engine_split",
    "scenario_split",
    "fault_type",
    "fault_severity",
    "fault_active",
    "fault_onset_s",
    "fault_duration_s",
    "sensor_fault_target",
    "rul_hours",
    "health_index_synthetic",
    "health_state_synthetic",
}


def build_feature_frames(raw: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Return predictor matrix, targets, and row-to-source lineage."""
    required = set(BASE_FEATURES + LINEAGE_COLUMNS + LABEL_COLUMNS + ["operating_phase"])
    required.update(
        column
        for key, (state_column, reference_column) in MEASUREMENT_CHANNELS.items()
        for column in (MEASUREMENT_COLUMNS[key], state_column, reference_column)
    )
    missing = sorted(required - set(raw.columns))
    if missing:
        raise ValueError(f"Raw data is missing required columns: {missing}")

    features = raw[BASE_FEATURES].copy()
    for phase in PHASES:
        features[f"phase_{phase}"] = raw["operating_phase"].eq(phase).astype("int8")

    for key, (_, reference_column) in MEASUREMENT_CHANNELS.items():
        measured_column = MEASUREMENT_COLUMNS[key]
        features[measured_column] = raw[measured_column].astype("float64")
        residual_name = f"{key}_residual"
        features[residual_name] = raw[measured_column] - raw[reference_column]
        features[f"{key}_missing"] = raw[measured_column].isna().astype("int8")

    features = features.replace([np.inf, -np.inf], np.nan)
    if FORBIDDEN_FEATURES.intersection(features.columns):
        raise AssertionError("Feature matrix contains an ID or target-derived column")
    if not all(pd.api.types.is_numeric_dtype(features[column]) for column in features):
        raise AssertionError("Every model feature must be numeric")

    labels = raw[LABEL_COLUMNS].copy()
    labels.insert(0, "is_fault", raw["fault_type"].ne("normal").astype("int8"))
    lineage = raw[LINEAGE_COLUMNS].copy()
    lineage.insert(0, "raw_row_index", np.arange(len(raw), dtype=np.int64))
    lineage.insert(0, "feature_row_index", np.arange(len(raw), dtype=np.int64))
    labels.insert(0, "feature_row_index", np.arange(len(raw), dtype=np.int64))
    return features, labels, lineage


def build_features_from_files(dataset_dir: Path) -> dict[str, object]:
    raw_path = dataset_dir / "data" / "raw" / "engine_twin_v0.2_raw.csv"
    raw = pd.read_csv(raw_path)
    features, labels, lineage = build_feature_frames(raw)
    processed_dir = dataset_dir / "data" / "processed"
    processed_dir.mkdir(parents=True, exist_ok=True)
    feature_path = processed_dir / "features.csv"
    label_path = processed_dir / "labels.csv"
    lineage_path = processed_dir / "feature_lineage.csv"
    features.to_csv(feature_path, index=False, float_format="%.9g")
    labels.to_csv(label_path, index=False, float_format="%.9g")
    lineage.to_csv(lineage_path, index=False)

    metadata = {
        "version": "0.2.0",
        "raw_file": "data/raw/engine_twin_v0.2_raw.csv",
        "feature_file": "data/processed/features.csv",
        "label_file": "data/processed/labels.csv",
        "lineage_file": "data/processed/feature_lineage.csv",
        "row_count": len(features),
        "feature_count": len(features.columns),
        "features": features.columns.tolist(),
        "transformations": [
            "Copy environment and control inputs: altitude_m, ambient_temp_c, ambient_pressure_pa, air_density_kg_m3, throttle_pct.",
            "One-hot encode operating_phase into four binary columns.",
            "Copy observed synthetic sensor measurements only; latent state variables are excluded.",
            "For every sensor channel, calculate residual = measured channel - matched healthy_ref channel from the same operating point and generic engine parameter set.",
            "Create one binary missingness indicator per sensor measurement; leave missing measurement/residual values as NaN for explicit downstream imputation.",
            "Do not normalize or fit any transform using held-out data.",
            "Keep labels in a separate table; keep identifiers and split membership in feature_lineage.csv, never in the model feature matrix.",
        ],
        "missing_value_policy": "Sensor dropout NaNs remain NaN with an explicit channel-specific missingness feature. Model pipelines must impute using training-fold statistics.",
        "target_leakage_excluded": True,
        "feature_lineage": "feature_row_index aligns features.csv and labels.csv; feature_lineage.csv maps it to raw_row_index, scenario_id, engine_id, split membership, and time_s.",
        "source_sha256": hashlib.sha256(raw_path.read_bytes()).hexdigest(),
        "output_sha256": {
            "features.csv": hashlib.sha256(feature_path.read_bytes()).hexdigest(),
            "labels.csv": hashlib.sha256(label_path.read_bytes()).hexdigest(),
            "feature_lineage.csv": hashlib.sha256(lineage_path.read_bytes()).hexdigest(),
        },
    }
    metadata_path = dataset_dir / "metadata" / "feature_pipeline.json"
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    return metadata


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dataset-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1],
    )
    args = parser.parse_args()
    metadata = build_features_from_files(args.dataset_dir)
    print(f"Built {metadata['feature_count']} features for {metadata['row_count']} rows")
    print(f"Feature lineage: {metadata['lineage_file']}")


if __name__ == "__main__":
    main()
