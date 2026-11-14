#!/usr/bin/env python3
"""Fast Phase 1 pipeline for the engine digital twin prototype."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

COLUMN_NAMES = ["engine_id", "cycle"]
COLUMN_NAMES += [f"setting_{index}" for index in range(1, 4)]
COLUMN_NAMES += [f"sensor_{index}" for index in range(1, 22)]


def load_engine_file(file_path: Path) -> pd.DataFrame:
    """Load a NASA C-MAPSS turbofan data file into a dataframe."""
    return pd.read_csv(file_path, sep=r"\s+", header=None, names=COLUMN_NAMES)


def load_rul_file(file_path: Path) -> pd.Series:
    """Load the RUL values for a test FD file."""
    values = pd.read_csv(file_path, sep=r"\s+", header=None).iloc[:, 0]
    return values.rename("rul").astype(float)


def add_rul_target(frame: pd.DataFrame) -> pd.DataFrame:
    """Compute the remaining useful life target for each engine cycle."""
    max_cycle = frame.groupby("engine_id")["cycle"].transform("max")
    result = frame.copy()
    result["rul"] = max_cycle - result["cycle"]
    return result


def compute_residual_features(frame: pd.DataFrame, baseline_cycles: int = 10) -> pd.DataFrame:
    """Create a healthy baseline and residual-based health metrics per engine."""
    sensors = [f"sensor_{index}" for index in range(1, 22)]
    result = frame.copy()
    engine_key = "unit_key" if "unit_key" in result.columns else "engine_id"

    baseline = (
        result.groupby(engine_key)
        .apply(lambda group: group.head(min(baseline_cycles, len(group)))[sensors].mean())
        .rename_axis(engine_key)
    )
    baseline.columns = [f"baseline_{sensor}" for sensor in sensors]

    result = result.merge(baseline, left_on=engine_key, right_index=True)

    for sensor in sensors:
        result[f"{sensor}_residual"] = result[sensor] - result[f"baseline_{sensor}"]
        result[f"{sensor}_abs_residual"] = result[f"{sensor}_residual"].abs()

    residual_columns = [f"{sensor}_abs_residual" for sensor in sensors]
    result["residual_abs_mean"] = result[residual_columns].mean(axis=1)
    result["health_index"] = 1.0 / (1.0 + result["residual_abs_mean"])

    first_health = result.groupby(engine_key)["health_index"].transform("first")
    last_health = result.groupby(engine_key)["health_index"].transform("last")
    result["health_drop"] = first_health - last_health

    return result


def summarize_fleet(feature_frame: pd.DataFrame) -> pd.DataFrame:
    """Produce an engine-level summary for Phase 1 analysis."""
    engine_key = "unit_key" if "unit_key" in feature_frame.columns else "engine_id"
    summary = feature_frame.groupby(engine_key).agg(
        max_cycle=("cycle", "max"),
        average_rul=("rul", "mean"),
        mean_health_index=("health_index", "mean"),
        final_health_index=("health_index", "last"),
        health_drop=("health_drop", "first"),
        mean_abs_residual=("residual_abs_mean", "mean"),
    )
    summary = summary.reset_index()
    if engine_key == "unit_key":
        identity = feature_frame[["unit_key", "dataset", "engine_id"]].drop_duplicates()
        summary = summary.merge(identity, on="unit_key", validate="one_to_one")
    summary["health_drop_pct"] = summary["health_drop"] / summary["mean_health_index"]
    return summary


def load_all_train_data(data_dir: Path) -> pd.DataFrame:
    frames = []
    for file_path in sorted(data_dir.glob("train_FD*.txt")):
        frame = load_engine_file(file_path)
        frame["dataset"] = file_path.stem.replace("train_", "", 1)
        frame["unit_key"] = frame["dataset"] + "_" + frame["engine_id"].astype(str)
        frame = add_rul_target(frame)
        frames.append(frame)

    return pd.concat(frames, ignore_index=True)


def export_phase1_outputs(feature_frame: pd.DataFrame, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    summary = summarize_fleet(feature_frame)
    summary.to_csv(output_dir / "engine_health_summary.csv", index=False)
    feature_frame.to_csv(output_dir / "phase1_feature_matrix.csv", index=False)

    report = {
        "dataset": "NASA C-MAPSS turbofan engine data",
        "hardware_context": "MALE UAV piston engine digital twin prototype",
        "engine_count": int(feature_frame["unit_key"].nunique()),
        "mean_max_cycle": float(summary["max_cycle"].mean()),
        "mean_health_drop": float(summary["health_drop"].mean()),
        "mean_final_health_index": float(summary["final_health_index"].mean()),
        "baseline_cycles": 10,
        "residual_features": [f"sensor_{index}_abs_residual" for index in range(1, 22)],
    }

    with (output_dir / "phase1_summary.json").open("w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Phase 1 digital-twin baseline outputs.")
    parser.add_argument("--data-dir", type=Path, required=True, help="Directory containing the raw turbofan datasets.")
    parser.add_argument("--output-dir", type=Path, default=Path("artifacts/phase1"), help="Output folder for Phase 1 artifacts.")
    args = parser.parse_args()

    train_frame = load_all_train_data(args.data_dir)
    phase1_frame = compute_residual_features(train_frame)
    export_phase1_outputs(phase1_frame, args.output_dir)

    summary = summarize_fleet(phase1_frame)
    print(f"Loaded training engines: {train_frame['unit_key'].nunique()}")
    print(f"Saved Phase 1 artifacts to: {args.output_dir}")
    print(f"Average engine health drop: {summary['health_drop'].mean():.4f}")
    print(f"Average engine life (cycles): {summary['max_cycle'].mean():.1f}")


if __name__ == "__main__":
    main()
