#!/usr/bin/env python3
"""Evaluate leakage-safe fault-classification baselines on two split protocols."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
)
from sklearn.pipeline import Pipeline
from sklearn.dummy import DummyClassifier


FORBIDDEN = {
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
    "is_fault",
}


def _classification_metrics(
    truth: np.ndarray, prediction: np.ndarray, labels: list[str]
) -> dict[str, Any]:
    precision, recall, f1, support = precision_recall_fscore_support(
        truth, prediction, labels=labels, zero_division=0
    )
    detection_truth = truth != "normal"
    detection_prediction = prediction != "normal"
    detection_f1 = f1_score(
        detection_truth, detection_prediction, average="binary", zero_division=0
    )
    return {
        "macro_f1": float(f1_score(truth, prediction, labels=labels, average="macro")),
        "accuracy": float(accuracy_score(truth, prediction)),
        "fault_detection_f1": float(detection_f1),
        "per_class": {
            label: {
                "precision": float(precision[index]),
                "recall": float(recall[index]),
                "f1": float(f1[index]),
                "support": int(support[index]),
            }
            for index, label in enumerate(labels)
        },
        "confusion_matrix": confusion_matrix(
            truth, prediction, labels=labels
        ).tolist(),
        "confusion_matrix_labels": labels,
    }


def _scenario_aggregate(
    truth_frame: pd.DataFrame,
    prediction: np.ndarray,
    labels: list[str],
) -> dict[str, Any]:
    rows = pd.DataFrame(
        {
            "scenario_id": truth_frame["scenario_id"].to_numpy(),
            "truth": truth_frame["fault_type"].to_numpy(),
            "prediction": prediction,
        }
    )
    scenarios = rows.groupby("scenario_id", sort=False).agg(
        truth=("truth", "first"),
        prediction=("prediction", lambda values: values.value_counts().index[0]),
    )
    result = _classification_metrics(
        scenarios["truth"].to_numpy(), scenarios["prediction"].to_numpy(), labels
    )
    result["scenario_count"] = int(len(scenarios))
    return result


def _coverage(lineage: pd.DataFrame, labels: pd.DataFrame, mask: np.ndarray) -> dict[str, Any]:
    selected = lineage.loc[mask].copy()
    selected["fault_type"] = labels.loc[mask, "fault_type"].to_numpy()
    selected["fault_severity"] = labels.loc[mask, "fault_severity"].to_numpy()
    scenarios = selected.drop_duplicates("scenario_id")
    return {
        "sample_count": int(len(selected)),
        "scenario_count": int(scenarios["scenario_id"].nunique()),
        "engine_count": int(scenarios["engine_id"].nunique()),
        "fault_scenarios": scenarios["fault_type"].value_counts().sort_index().to_dict(),
        "severity_scenarios": scenarios["fault_severity"].value_counts().sort_index().to_dict(),
        "phase_scenarios": (
            scenarios["operating_phase"].value_counts().sort_index().to_dict()
            if "operating_phase" in scenarios
            else {}
        ),
    }


def _fit_evaluate_protocol(
    name: str,
    train_mask: np.ndarray,
    validation_mask: np.ndarray,
    test_mask: np.ndarray,
    features: pd.DataFrame,
    labels: pd.DataFrame,
    lineage: pd.DataFrame,
    fault_classes: list[str],
    model_dir: Path,
) -> dict[str, Any]:
    estimators = {
        "majority_dummy": DummyClassifier(strategy="prior"),
        "random_forest": Pipeline(
            [
                ("imputer", SimpleImputer(strategy="median", add_indicator=True)),
                (
                    "classifier",
                    RandomForestClassifier(
                        n_estimators=80,
                        max_depth=18,
                        max_features="sqrt",
                        min_samples_leaf=4,
                        class_weight="balanced_subsample",
                        random_state=271828,
                        n_jobs=-1,
                    ),
                ),
            ]
        ),
    }
    target = labels["fault_type"].to_numpy()
    validation_metrics: dict[str, dict[str, Any]] = {}
    for estimator_name, estimator in estimators.items():
        estimator.fit(features.loc[train_mask], target[train_mask])
        validation_prediction = estimator.predict(features.loc[validation_mask])
        validation_metrics[estimator_name] = _classification_metrics(
            target[validation_mask], validation_prediction, fault_classes
        )

    selected_name = max(
        validation_metrics,
        key=lambda candidate: validation_metrics[candidate]["macro_f1"],
    )
    fit_mask = train_mask | validation_mask
    selected = estimators[selected_name]
    selected.fit(features.loc[fit_mask], target[fit_mask])
    prediction = selected.predict(features.loc[test_mask])
    test_metrics = _classification_metrics(
        target[test_mask], prediction, fault_classes
    )

    model_dir.mkdir(parents=True, exist_ok=True)
    model_path = model_dir / f"{name}_classifier.joblib"
    joblib.dump(
        {
            "estimator": selected,
            "feature_columns": features.columns.tolist(),
            "target": "fault_type",
            "selected_model": selected_name,
            "split_protocol": name,
        },
        model_path,
        compress=3,
    )

    test_lineage = lineage.loc[test_mask].reset_index(drop=True)
    test_labels = labels.loc[test_mask].reset_index(drop=True)
    test_output = test_lineage[["scenario_id", "engine_id", "time_s"]].copy()
    test_output["fault_type_true"] = test_labels["fault_type"].to_numpy()
    test_output["fault_type_predicted"] = prediction
    test_output.to_csv(model_dir / f"{name}_test_predictions.csv", index=False)

    matrix = pd.DataFrame(
        test_metrics["confusion_matrix"],
        index=[f"true_{label}" for label in fault_classes],
        columns=[f"pred_{label}" for label in fault_classes],
    )
    matrix.to_csv(model_dir / f"{name}_confusion_matrix.csv")
    per_class = pd.DataFrame.from_dict(test_metrics["per_class"], orient="index")
    per_class.index.name = "fault_type"
    per_class.to_csv(model_dir / f"{name}_per_class_metrics.csv")

    scenario_metrics = _scenario_aggregate(
        test_lineage.assign(fault_type=test_labels["fault_type"]),
        prediction,
        fault_classes,
    )
    return {
        "selected_model": selected_name,
        "validation_metrics": {
            key: {
                "macro_f1": value["macro_f1"],
                "accuracy": value["accuracy"],
                "fault_detection_f1": value["fault_detection_f1"],
                "per_class": value["per_class"],
            }
            for key, value in validation_metrics.items()
        },
        "test_metrics_sample_level": test_metrics,
        "test_metrics_scenario_majority_aggregate": scenario_metrics,
        "test_class_coverage": _coverage(lineage, labels, test_mask),
        "model_file": str(model_path.name),
        "predictions_file": f"{name}_test_predictions.csv",
        "confusion_matrix_file": f"{name}_confusion_matrix.csv",
        "per_class_metrics_file": f"{name}_per_class_metrics.csv",
    }


def evaluate_baselines(dataset_dir: Path) -> dict[str, Any]:
    processed = dataset_dir / "data" / "processed"
    features = pd.read_csv(processed / "features.csv")
    labels = pd.read_csv(processed / "labels.csv")
    lineage = pd.read_csv(processed / "feature_lineage.csv")
    manifest = pd.read_csv(dataset_dir / "metadata" / "scenario_manifest.csv")

    if "feature_row_index" in features.columns:
        raise ValueError("feature_row_index is lineage metadata, not a predictor")
    leaked = FORBIDDEN.intersection(features.columns)
    if leaked:
        raise ValueError(f"Feature matrix contains forbidden columns: {sorted(leaked)}")
    if len(features) != len(labels) or len(features) != len(lineage):
        raise ValueError("Feature, label, and lineage row counts do not match")

    scenario_split = lineage["scenario_split"].fillna("").to_numpy()
    engine_split = lineage["engine_split"].to_numpy()
    scenario_masks = (
        scenario_split == "train",
        scenario_split == "validation",
        scenario_split == "scenario_test",
    )
    engine_masks = (
        engine_split == "train",
        engine_split == "validation",
        engine_split == "test",
    )
    fault_classes = sorted(labels["fault_type"].unique().tolist())
    models_dir = dataset_dir / "models"

    scenario_result = _fit_evaluate_protocol(
        "scenario_heldout",
        *scenario_masks,
        features,
        labels,
        lineage,
        fault_classes,
        models_dir,
    )
    engine_result = _fit_evaluate_protocol(
        "engine_heldout",
        *engine_masks,
        features,
        labels,
        lineage,
        fault_classes,
        models_dir,
    )
    split_coverage = {
        "scenario_heldout": {
            key: _coverage(lineage, labels, mask)
            for key, mask in zip(("train", "validation", "test"), scenario_masks)
        },
        "engine_heldout": {
            key: _coverage(lineage, labels, mask)
            for key, mask in zip(("train", "validation", "test"), engine_masks)
        },
    }
    scenario_ids_by_partition = {
        key: set(lineage.loc[mask, "scenario_id"])
        for key, mask in zip(("scenario_train", "scenario_validation", "scenario_test"), scenario_masks)
    }
    engine_ids_by_partition = {
        key: set(lineage.loc[mask, "engine_id"])
        for key, mask in zip(("engine_train", "engine_validation", "engine_test"), engine_masks)
    }
    overlap_report = {
        "scenario_intersections": {
            f"{left}_{right}": sorted(scenario_ids_by_partition[left] & scenario_ids_by_partition[right])
            for left, right in (
                ("scenario_train", "scenario_validation"),
                ("scenario_train", "scenario_test"),
                ("scenario_validation", "scenario_test"),
            )
        },
        "engine_intersections": {
            f"{left}_{right}": sorted(engine_ids_by_partition[left] & engine_ids_by_partition[right])
            for left, right in (
                ("engine_train", "engine_validation"),
                ("engine_train", "engine_test"),
                ("engine_validation", "engine_test"),
            )
        },
    }
    report = {
        "dataset_version": "0.2.0",
        "task": "eight-class fault classification; fault detection scored by collapsing non-normal predictions to fault",
        "feature_count": int(features.shape[1]),
        "feature_columns": features.columns.tolist(),
        "excluded_identifier_and_target_columns": sorted(FORBIDDEN),
        "evaluation_protocols": {
            "scenario_heldout": scenario_result,
            "engine_heldout": engine_result,
        },
        "split_coverage": split_coverage,
        "split_overlap_audit": overlap_report,
        "unseen_engine_claim": "Only engine_heldout uses disjoint engine IDs across train, validation, and test.",
        "limitations": [
            "All measurements and labels are generated by the same generic assumption-driven surrogate.",
            "Metrics demonstrate synthetic test performance only and do not estimate real-engine diagnostic accuracy.",
            "Scenario-held-out evaluation permits the same simulated engine identities across partitions by design.",
            "Operating phases are crossed with fault classes, but the 30-engine population is too small to establish broad generalization.",
        ],
    }
    report_path = dataset_dir / "reports" / "baseline_results.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    lines = [
        "# ENGINE-TWIN v0.2 baseline results",
        "",
        "Synthetic-data classification results only; these do not estimate real-engine accuracy.",
        "",
        "| Protocol | Selected model | Sample macro-F1 | Fault-detection F1 | Scenario-majority macro-F1 |",
        "|---|---|---:|---:|---:|",
    ]
    for protocol, result in report["evaluation_protocols"].items():
        sample = result["test_metrics_sample_level"]
        scenario = result["test_metrics_scenario_majority_aggregate"]
        lines.append(
            f"| {protocol} | {result['selected_model']} | {sample['macro_f1']:.4f} | "
            f"{sample['fault_detection_f1']:.4f} | {scenario['macro_f1']:.4f} |"
        )
    for protocol, result in report["evaluation_protocols"].items():
        sample = result["test_metrics_sample_level"]
        lines.extend(
            [
                "",
                f"## {protocol}: per-class recall",
                "",
                "| Fault class | Recall | Support |",
                "|---|---:|---:|",
            ]
        )
        for fault_class, metrics in sample["per_class"].items():
            lines.append(
                f"| {fault_class} | {metrics['recall']:.4f} | {metrics['support']} |"
            )
        labels = sample["confusion_matrix_labels"]
        lines.extend(
            [
                "",
                f"## {protocol}: sample-level confusion matrix",
                "",
                "| True \\\\ Predicted | " + " | ".join(labels) + " |",
                "|---|" + "---:|" * len(labels),
            ]
        )
        for label, row in zip(labels, sample["confusion_matrix"]):
            lines.append(f"| {label} | " + " | ".join(map(str, row)) + " |")
        lines.append("")
    (report_path.parent / "baseline_results.md").write_text(
        "\n".join(lines), encoding="utf-8"
    )
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dataset-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1],
    )
    args = parser.parse_args()
    result = evaluate_baselines(args.dataset_dir)
    for protocol, metrics in result["evaluation_protocols"].items():
        test = metrics["test_metrics_sample_level"]
        print(
            f"{protocol}: model={metrics['selected_model']}, "
            f"macro_f1={test['macro_f1']:.4f}, "
            f"fault_detection_f1={test['fault_detection_f1']:.4f}"
        )


if __name__ == "__main__":
    main()
