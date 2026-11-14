# ENGINE-TWIN v0.2 Phase 3B: temporal feature ablation

**Synthetic-simulator result only.** This experiment does not estimate or establish real-engine diagnostic accuracy.

## Controlled comparison

A uses the exact 29 permitted Phase 3A predictors. B adds past-only temporal features for all 10 measured sensor channels: current-minus-previous difference, population standard deviation over the preceding five samples (excluding the current reading), and explicit validity flags for both derived values. Both protocols compare the same majority dummy and Random Forest on validation macro-F1, refit the selected model on train+validation, then score the existing test split. The Random Forest settings and imputation policy are held fixed.

| Protocol | Experiment | Selected model | Accuracy | Macro F1 | Change in macro F1 vs A | Sensor-fault group F1 |
|---|---|---|---:|---:|---:|---:|
| scenario_heldout | A: 29 Phase 3A features | random_forest | 0.1847 | 0.1761 | - | 0.5517 |
| scenario_heldout | B: 29 + temporal features | random_forest | 0.3199 | 0.3279 | +0.1518 | 0.5203 |
| engine_heldout | A: 29 Phase 3A features | random_forest | 0.2388 | 0.2390 | - | 0.5876 |
| engine_heldout | B: 29 + temporal features | random_forest | 0.3120 | 0.3254 | +0.0863 | 0.5661 |

### Per-class test metrics

#### scenario_heldout - A phase3a 29 features

| Fault class | Precision | Recall | F1 | Support |
|---|---:|---:|---:|---:|
| combustion_irregularity | 0.3889 | 0.4773 | 0.4286 | 1320 |
| efficiency_degradation | 0.0932 | 0.0646 | 0.0763 | 1440 |
| normal | 0.1265 | 0.1735 | 0.1463 | 1320 |
| sensor_bias | 0.1729 | 0.1658 | 0.1693 | 1200 |
| sensor_drift | 0.0788 | 0.0644 | 0.0709 | 1320 |
| sensor_dropout | 0.1596 | 0.2117 | 0.1820 | 1200 |
| sensor_stuck | 0.0939 | 0.0667 | 0.0780 | 1200 |
| thermal_abnormality | 0.2674 | 0.2486 | 0.2576 | 1440 |

#### scenario_heldout - B plus temporal 69 features

| Fault class | Precision | Recall | F1 | Support |
|---|---:|---:|---:|---:|
| combustion_irregularity | 0.3954 | 0.5212 | 0.4497 | 1320 |
| efficiency_degradation | 0.1476 | 0.1229 | 0.1341 | 1440 |
| normal | 0.1164 | 0.2417 | 0.1571 | 1320 |
| sensor_bias | 0.1673 | 0.1392 | 0.1520 | 1200 |
| sensor_drift | 0.1615 | 0.0591 | 0.0865 | 1320 |
| sensor_dropout | 0.5198 | 0.5800 | 0.5482 | 1200 |
| sensor_stuck | 0.8608 | 0.6083 | 0.7129 | 1200 |
| thermal_abnormality | 0.4437 | 0.3368 | 0.3829 | 1440 |

#### engine_heldout - A phase3a 29 features

| Fault class | Precision | Recall | F1 | Support |
|---|---:|---:|---:|---:|
| combustion_irregularity | 0.4756 | 0.4090 | 0.4398 | 2880 |
| efficiency_degradation | 0.2179 | 0.2587 | 0.2365 | 2880 |
| normal | 0.2045 | 0.2844 | 0.2379 | 2880 |
| sensor_bias | 0.1466 | 0.1271 | 0.1362 | 2880 |
| sensor_drift | 0.1862 | 0.1288 | 0.1523 | 2880 |
| sensor_dropout | 0.1667 | 0.1892 | 0.1772 | 2880 |
| sensor_stuck | 0.2420 | 0.2778 | 0.2586 | 2880 |
| thermal_abnormality | 0.3266 | 0.2354 | 0.2736 | 2880 |

#### engine_heldout - B plus temporal 69 features

| Fault class | Precision | Recall | F1 | Support |
|---|---:|---:|---:|---:|
| combustion_irregularity | 0.6134 | 0.3774 | 0.4673 | 2880 |
| efficiency_degradation | 0.1416 | 0.1351 | 0.1382 | 2880 |
| normal | 0.1511 | 0.5372 | 0.2359 | 2880 |
| sensor_bias | 0.1161 | 0.0521 | 0.0719 | 2880 |
| sensor_drift | 0.2419 | 0.1146 | 0.1555 | 2880 |
| sensor_dropout | 0.6551 | 0.4965 | 0.5649 | 2880 |
| sensor_stuck | 0.9527 | 0.6017 | 0.7376 | 2880 |
| thermal_abnormality | 0.3208 | 0.1812 | 0.2316 | 2880 |

### Sensor-fault class metrics

| Protocol | Experiment | Fault class | Precision | Recall | F1 | Support |
|---|---|---|---:|---:|---:|---:|
| scenario_heldout | A | sensor_bias | 0.1729 | 0.1658 | 0.1693 | 1200 |
| scenario_heldout | A | sensor_drift | 0.0788 | 0.0644 | 0.0709 | 1320 |
| scenario_heldout | A | sensor_stuck | 0.0939 | 0.0667 | 0.0780 | 1200 |
| scenario_heldout | A | sensor_dropout | 0.1596 | 0.2117 | 0.1820 | 1200 |
| scenario_heldout | B | sensor_bias | 0.1673 | 0.1392 | 0.1520 | 1200 |
| scenario_heldout | B | sensor_drift | 0.1615 | 0.0591 | 0.0865 | 1320 |
| scenario_heldout | B | sensor_stuck | 0.8608 | 0.6083 | 0.7129 | 1200 |
| scenario_heldout | B | sensor_dropout | 0.5198 | 0.5800 | 0.5482 | 1200 |
| engine_heldout | A | sensor_bias | 0.1466 | 0.1271 | 0.1362 | 2880 |
| engine_heldout | A | sensor_drift | 0.1862 | 0.1288 | 0.1523 | 2880 |
| engine_heldout | A | sensor_stuck | 0.2420 | 0.2778 | 0.2586 | 2880 |
| engine_heldout | A | sensor_dropout | 0.1667 | 0.1892 | 0.1772 | 2880 |
| engine_heldout | B | sensor_bias | 0.1161 | 0.0521 | 0.0719 | 2880 |
| engine_heldout | B | sensor_drift | 0.2419 | 0.1146 | 0.1555 | 2880 |
| engine_heldout | B | sensor_stuck | 0.9527 | 0.6017 | 0.7376 | 2880 |
| engine_heldout | B | sensor_dropout | 0.6551 | 0.4965 | 0.5649 | 2880 |

## Confusion matrices

The labelled matrices are saved as CSV files; rows are true classes and columns are predicted classes.

## Chronology, warm-up, and missing values

Raw data contains 115,200 rows in 960 scenarios, with 120 samples each. Every scenario was checked for unique, increasing `time_s` values 0..119 and unique, increasing UTC timestamps at 1-second intervals. Processed sensor values were checked against raw values within CSV serialization precision. Temporal features are grouped by scenario, sorted by `time_s`, and restored to existing feature-row order using raw-row lineage.

At t=0 the first difference is invalid; at t=0..4 the five-sample rolling statistic is invalid. Missing inputs invalidate the affected derived feature. No values are interpolated. Invalid temporal values remain NaN and explicit validity flags are zero; training-fold median imputation handles NaNs. Rolling standard deviation at t uses only t-5..t-1, never t or later.

## Split and leakage audit

Scenario-held-out counts: `{"scenario_test": 87, "train": 402, "validation": 87}` scenarios. Engine-held-out counts: `{"test": 6, "train": 18, "validation": 6}` engines. Split CSV memberships matched row lineage; pairwise overlaps were zero within each protocol. All nine split files were SHA-256 hashed before analysis; they were unchanged after analysis.

Experiment A and B use identical row masks. IDs are used only to group temporal sequences and verify split membership/alignment; IDs are not features. No target, latent state, residual, healthy reference, or future sample was used as a predictor. All learned imputation was fit on training rows, then refit on train+validation before test.

## Interpretation and next step

- `scenario_heldout` macro-F1 change: +0.1518 (A 0.1761; B 0.3279).
- `engine_heldout` macro-F1 change: +0.0863 (A 0.2390; B 0.3254).

Do not claim improvement unless the reported test metrics support it; validation macro-F1 chooses the model, test metrics are reported once. The next useful step, if temporal metrics improve consistently, is to verify the same causal feature recipe on a separately generated sensor-noise/fault-parameter seed before expanding model search.

## Phase 3A reproduction check

- `scenario_heldout`: A rerun matches Phase 3A accuracy and macro-F1 within 1e-12: True; per-class matches: True.
- `engine_heldout`: A rerun matches Phase 3A accuracy and macro-F1 within 1e-12: True; per-class matches: True.

## Files

- `feature_definitions.json` - temporal definitions, valid flags, and warm-up/missing policy.
- `temporal_ablation_results.json` - metrics, split audit, source hashes, and model selection results.
- `scenario_heldout__A_phase3a_29_features__per_class.csv` / `__confusion_matrix.csv`.
- `scenario_heldout__B_plus_temporal_69_features__per_class.csv` / `__confusion_matrix.csv`.
- Equivalent A/B per-class and confusion CSVs for `engine_heldout`.
- `phase3b_report.md` - concise analysis.
- `checksums.json` - SHA-256 for inputs and all other output files (self-excluded).
