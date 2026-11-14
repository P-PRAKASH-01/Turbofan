#!/usr/bin/env python3
"""Train and evaluate Phase 2 remaining-useful-life models for C-MAPSS data."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import ExtraTreesRegressor, HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.dummy import DummyRegressor

from phase1_pipeline import load_engine_file, load_rul_file

SENSOR_COLUMNS = [f"sensor_{index}" for index in range(1, 22)]
SETTING_COLUMNS = [f"setting_{index}" for index in range(1, 4)]
DATASET_NAMES = [f"FD00{index}" for index in range(1, 5)]
RANDOM_STATE = 42


def load_phase2_data(data_dir: Path) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Load all four subsets and keep engine identities unique across subsets."""
    train_frames = []
    test_frames = []

    for dataset in DATASET_NAMES:
        train_path = data_dir / f"train_{dataset}.txt"
        test_path = data_dir / f"test_{dataset}.txt"
        rul_path = data_dir / f"RUL_{dataset}.txt"
        missing = [path.name for path in (train_path, test_path, rul_path) if not path.is_file()]
        if missing:
            raise FileNotFoundError(f"Missing required dataset files: {', '.join(missing)}")

        train = load_engine_file(train_path)
        train["dataset"] = dataset
        train["unit_key"] = dataset + "_" + train["engine_id"].astype(str)
        train["rul"] = train.groupby("unit_key")["cycle"].transform("max") - train["cycle"]
        train_frames.append(train)

        test = load_engine_file(test_path)
        test["dataset"] = dataset
        test["unit_key"] = dataset + "_" + test["engine_id"].astype(str)
        final_rul = load_rul_file(rul_path)
        engine_ids = sorted(test["engine_id"].unique())
        if len(engine_ids) != len(final_rul):
            raise ValueError(
                f"{dataset}: found {len(engine_ids)} test engines but {len(final_rul)} RUL labels"
            )
        rul_by_engine = pd.Series(final_rul.to_numpy(), index=engine_ids)
        final_cycle = test.groupby("unit_key")["cycle"].transform("max")
        test["rul"] = (
            test["engine_id"].map(rul_by_engine) + final_cycle - test["cycle"]
        )
        test_frames.append(test)

    train = pd.concat(train_frames, ignore_index=True)
    test = pd.concat(test_frames, ignore_index=True)
    train = train.sort_values(["dataset", "engine_id", "cycle"]).reset_index(drop=True)
    test = test.sort_values(["dataset", "engine_id", "cycle"]).reset_index(drop=True)
    return train, test


def build_features(frame: pd.DataFrame, baseline_cycles: int = 10) -> pd.DataFrame:
    """Build causal telemetry, baseline residual, and short-window features."""
    if baseline_cycles < 1:
        raise ValueError("baseline_cycles must be at least 1")

    ordered = frame.sort_values(["dataset", "engine_id", "cycle"]).reset_index(drop=True).copy()
    features = ordered[["cycle"] + SETTING_COLUMNS + SENSOR_COLUMNS].copy()

    for dataset in DATASET_NAMES:
        features[f"dataset_{dataset}"] = ordered["dataset"].eq(dataset).astype("int8")

    baseline_rows = ordered.groupby("unit_key", sort=False).head(baseline_cycles)
    baseline_mean = baseline_rows.groupby("unit_key")[SENSOR_COLUMNS].mean()
    baseline_std = baseline_rows.groupby("unit_key")[SENSOR_COLUMNS].std(ddof=0)
    baseline_std = baseline_std.replace(0, np.nan)

    for sensor in SENSOR_COLUMNS:
        mean_by_unit = ordered["unit_key"].map(baseline_mean[sensor])
        std_by_unit = ordered["unit_key"].map(baseline_std[sensor])
        delta = ordered[sensor] - mean_by_unit
        features[f"{sensor}_baseline_delta"] = delta
        features[f"{sensor}_baseline_z"] = (delta / std_by_unit).replace(
            [np.inf, -np.inf], np.nan
        ).fillna(0.0)
        features[f"{sensor}_change_1"] = (
            ordered.groupby("unit_key", sort=False)[sensor].diff().fillna(0.0)
        )
        features[f"{sensor}_rolling_mean_5"] = ordered.groupby(
            "unit_key", sort=False
        )[sensor].transform(lambda values: values.rolling(5, min_periods=1).mean())

    return features.replace([np.inf, -np.inf], np.nan).fillna(0.0).astype("float32")


def split_by_engine(train_frame: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    """Split validation engines within each subset to preserve scenario coverage."""
    train_keys: list[str] = []
    validation_keys: list[str] = []
    for _, subset in train_frame[["dataset", "unit_key"]].drop_duplicates().groupby("dataset"):
        keys = subset["unit_key"].to_numpy()
        if len(keys) < 2:
            raise ValueError(f"Need at least two engines in each subset for validation: {keys}")
        subset_train, subset_validation = train_test_split(
            keys, test_size=0.2, random_state=RANDOM_STATE
        )
        train_keys.extend(subset_train.tolist())
        validation_keys.extend(subset_validation.tolist())

    train_mask = train_frame["unit_key"].isin(train_keys).to_numpy()
    validation_mask = train_frame["unit_key"].isin(validation_keys).to_numpy()
    return train_mask, validation_mask


def nasa_score(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Compute the asymmetric C-MAPSS score (lower is better)."""
    error = np.asarray(y_pred) - np.asarray(y_true)
    exponent = np.where(error < 0, -error / 13.0, error / 10.0)
    return float(np.expm1(np.clip(exponent, 0, 50)).sum())


def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    return {
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "r2": float(r2_score(y_true, y_pred)),
        "nasa_score": nasa_score(y_true, y_pred),
    }


def train_and_evaluate(
    data_dir: Path, output_dir: Path, baseline_cycles: int = 10
) -> dict[str, object]:
    train_frame, test_frame = load_phase2_data(data_dir)
    train_features = build_features(train_frame, baseline_cycles)
    test_features = build_features(test_frame, baseline_cycles)
    target = train_frame["rul"].to_numpy(dtype="float32")
    train_mask, validation_mask = split_by_engine(train_frame)
    validation_target = target[validation_mask]

    candidates = {
        "dummy_mean": DummyRegressor(strategy="mean"),
        "extra_trees": ExtraTreesRegressor(
            n_estimators=180,
            min_samples_leaf=2,
            max_features=0.9,
            n_jobs=-1,
            random_state=RANDOM_STATE,
        ),
        "hist_gradient_boosting": HistGradientBoostingRegressor(
            max_iter=160,
            learning_rate=0.08,
            max_leaf_nodes=20,
            l2_regularization=1.0,
            random_state=RANDOM_STATE,
        ),
    }

    validation_metrics: dict[str, dict[str, float]] = {}
    for name, estimator in candidates.items():
        estimator.fit(train_features.loc[train_mask], target[train_mask])
        prediction = estimator.predict(train_features.loc[validation_mask])
        validation_metrics[name] = calculate_metrics(validation_target, prediction)

    best_model_name = min(validation_metrics, key=lambda name: validation_metrics[name]["rmse"])
    best_model = candidates[best_model_name]
    best_model.fit(train_features, target)

    test_last = (
        test_frame.assign(_row=np.arange(len(test_frame)))
        .sort_values(["unit_key", "cycle"])
        .groupby("unit_key", sort=False)
        .tail(1)
        .sort_values("_row")
    )
    final_rows = test_last["_row"].to_numpy()
    final_true = test_last["rul"].to_numpy(dtype="float32")
    final_predictions = best_model.predict(test_features.iloc[final_rows])
    test_metrics = calculate_metrics(final_true, final_predictions)

    output_dir.mkdir(parents=True, exist_ok=True)
    validation_rows = [
        {"model": name, **metrics} for name, metrics in validation_metrics.items()
    ]
    pd.DataFrame(validation_rows).to_csv(output_dir / "validation_metrics.csv", index=False)

    prediction_frame = test_last[
        ["dataset", "engine_id", "unit_key", "cycle", "rul"]
    ].copy()
    prediction_frame["predicted_rul"] = final_predictions
    prediction_frame["absolute_error"] = np.abs(final_true - final_predictions)
    prediction_frame.to_csv(output_dir / "test_rul_predictions.csv", index=False)
    test_metrics_by_dataset = {
        dataset: calculate_metrics(
            group["rul"].to_numpy(dtype="float32"),
            group["predicted_rul"].to_numpy(dtype="float32"),
        )
        for dataset, group in prediction_frame.groupby("dataset", sort=True)
    }

    model_path = output_dir / "rul_model.joblib"
    joblib.dump(
        {
            "model": best_model,
            "feature_columns": train_features.columns.tolist(),
            "baseline_cycles": baseline_cycles,
            "model_name": best_model_name,
            "dataset": "NASA C-MAPSS FD001-FD004",
        },
        model_path,
    )

    report = {
        "dataset": "NASA C-MAPSS FD001-FD004",
        "task": "Remaining useful life regression",
        "engine_count_train": int(train_frame["unit_key"].nunique()),
        "engine_count_test": int(test_frame["unit_key"].nunique()),
        "train_cycle_count": int(len(train_frame)),
        "validation_engine_fraction_per_subset": 0.2,
        "baseline_cycles": baseline_cycles,
        "feature_count": int(train_features.shape[1]),
        "validation_metrics": validation_metrics,
        "selected_model": best_model_name,
        "official_test_metrics": test_metrics,
        "official_test_metrics_by_dataset": test_metrics_by_dataset,
        "limitations": [
            "C-MAPSS is turbofan benchmark data, not aero piston-engine telemetry.",
            "The provided labels support RUL regression, not fault classification.",
            "The health index remains an unsupervised Phase 1 indicator, not a labeled health target.",
        ],
    }
    with (output_dir / "phase2_metrics.json").open("w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)

    return report


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train and evaluate Phase 2 RUL models on NASA C-MAPSS."
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path("data/raw"),
        help="Directory containing the C-MAPSS raw files.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("artifacts/phase2"),
        help="Directory for metrics, predictions, and the trained model.",
    )
    parser.add_argument(
        "--baseline-cycles",
        type=int,
        default=10,
        help="Number of initial cycles used to define engine-specific baselines.",
    )
    args = parser.parse_args()

    report = train_and_evaluate(args.data_dir, args.output_dir, args.baseline_cycles)
    print(f"Selected model: {report['selected_model']}")
    print(f"Official test metrics: {json.dumps(report['official_test_metrics'])}")
    print(f"Saved Phase 2 artifacts to: {args.output_dir}")


if __name__ == "__main__":
    main()
