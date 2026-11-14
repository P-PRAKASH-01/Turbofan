# ENGINE-TWIN v0.2 baseline model diagnostics

**Scope:** test-set diagnostics for the existing scenario-held-out and engine-held-out partitions, using diagnostic-only refits that exclude simulator healthy-reference residuals. Results describe the synthetic simulator, not real-engine accuracy.

## Method and leakage controls

The saved baseline models were inspected but not used for these restricted diagnostic metrics: each saved model schema contains 39 features, including 10 `*_residual` predictors calculated using simulator-provided healthy references. Diagnostics use the same Dummy-vs-Random-Forest validation selection and Random Forest settings as the baseline trainer, restricted to observed simulated sensor measurements, environmental/operating inputs, phase indicators and missingness flags. No IDs, latent states, healthy-reference residuals, target-derived fields, or time/future samples are predictors. The median imputer is fit on training rows only, then refit on train+validation before test.

Allowed diagnostic predictors (29): `altitude_m`, `ambient_temp_c`, `ambient_pressure_pa`, `air_density_kg_m3`, `throttle_pct`, `phase_ground_run`, `phase_climb`, `phase_cruise`, `phase_descent`, `rpm_meas`, `rpm_missing`, `manifold_pressure_pa_meas`, `manifold_pressure_missing`, `cht_c_meas`, `cht_missing`, `egt_c_meas`, `egt_missing`, `oil_temp_c_meas`, `oil_temp_missing`, `oil_pressure_kpa_meas`, `oil_pressure_missing`, `fuel_flow_kg_s_meas`, `fuel_flow_missing`, `power_kw_meas`, `power_missing`, `torque_nm_meas`, `torque_missing`, `vibration_rms_g_meas`, `vibration_missing`.

## Protocol summary

| Protocol | Selected model | Test rows | Test scenarios | Test engines | Accuracy | Macro F1 | Sensor-group precision | Recall | F1 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| scenario_heldout | random_forest | 10440 | 87 | 18 | 0.1847 | 0.1761 | 0.5662 | 0.5378 | 0.5517 |
| engine_heldout | random_forest | 23040 | 192 | 6 | 0.2388 | 0.2390 | 0.5997 | 0.5760 | 0.5876 |

## Per-class results

### scenario_heldout

| Fault class | Precision | Recall | F1 | Support | False negatives | Most common confusion (count) |
|---|---:|---:|---:|---:|---:|---|
| combustion_irregularity | 0.3889 | 0.4773 | 0.4286 | 1320 | 690 | sensor_dropout (194) |
| efficiency_degradation | 0.0932 | 0.0646 | 0.0763 | 1440 | 1347 | normal (285) |
| normal | 0.1265 | 0.1735 | 0.1463 | 1320 | 1091 | sensor_bias (286) |
| sensor_bias | 0.1729 | 0.1658 | 0.1693 | 1200 | 1001 | sensor_dropout (254) |
| sensor_drift | 0.0788 | 0.0644 | 0.0709 | 1320 | 1235 | sensor_stuck (361) |
| sensor_dropout | 0.1596 | 0.2117 | 0.1820 | 1200 | 946 | normal (226) |
| sensor_stuck | 0.0939 | 0.0667 | 0.0780 | 1200 | 1120 | sensor_drift (288) |
| thermal_abnormality | 0.2674 | 0.2486 | 0.2576 | 1440 | 1082 | normal (347) |

### engine_heldout

| Fault class | Precision | Recall | F1 | Support | False negatives | Most common confusion (count) |
|---|---:|---:|---:|---:|---:|---|
| combustion_irregularity | 0.4756 | 0.4090 | 0.4398 | 2880 | 1702 | normal (580) |
| efficiency_degradation | 0.2179 | 0.2587 | 0.2365 | 2880 | 2135 | sensor_stuck (654) |
| normal | 0.2045 | 0.2844 | 0.2379 | 2880 | 2061 | sensor_stuck (504) |
| sensor_bias | 0.1466 | 0.1271 | 0.1362 | 2880 | 2514 | sensor_dropout (580) |
| sensor_drift | 0.1862 | 0.1288 | 0.1523 | 2880 | 2509 | sensor_bias (600) |
| sensor_dropout | 0.1667 | 0.1892 | 0.1772 | 2880 | 2335 | efficiency_degradation (741) |
| sensor_stuck | 0.2420 | 0.2778 | 0.2586 | 2880 | 2080 | normal (514) |
| thermal_abnormality | 0.3266 | 0.2354 | 0.2736 | 2880 | 2202 | sensor_bias (419) |

## Three weakest classes

### scenario_heldout

1. `sensor_drift` - F1 0.0709, recall 0.0644, support 1320. Most common error: predicted as `sensor_stuck` (361 of 1235 false negatives).
2. `efficiency_degradation` - F1 0.0763, recall 0.0646, support 1440. Most common error: predicted as `normal` (285 of 1347 false negatives).
3. `sensor_stuck` - F1 0.0780, recall 0.0667, support 1200. Most common error: predicted as `sensor_drift` (288 of 1120 false negatives).

### engine_heldout

1. `sensor_bias` - F1 0.1362, recall 0.1271, support 2880. Most common error: predicted as `sensor_dropout` (580 of 2514 false negatives).
2. `sensor_drift` - F1 0.1523, recall 0.1288, support 2880. Most common error: predicted as `sensor_bias` (600 of 2509 false negatives).
3. `sensor_dropout` - F1 0.1772, recall 0.1892, support 2880. Most common error: predicted as `efficiency_degradation` (741 of 2335 false negatives).

## Sensor-integrity fault diagnostics

| Protocol | Fault class | Precision | Recall | F1 | Support | False negatives | Most common confusion |
|---|---|---:|---:|---:|---:|---:|---|
| scenario_heldout | sensor_bias | 0.1729 | 0.1658 | 0.1693 | 1200 | 1001 | sensor_dropout (254) |
| scenario_heldout | sensor_drift | 0.0788 | 0.0644 | 0.0709 | 1320 | 1235 | sensor_stuck (361) |
| scenario_heldout | sensor_stuck | 0.0939 | 0.0667 | 0.0780 | 1200 | 1120 | sensor_drift (288) |
| scenario_heldout | sensor_dropout | 0.1596 | 0.2117 | 0.1820 | 1200 | 946 | normal (226) |
| engine_heldout | sensor_bias | 0.1466 | 0.1271 | 0.1362 | 2880 | 2514 | sensor_dropout (580) |
| engine_heldout | sensor_drift | 0.1862 | 0.1288 | 0.1523 | 2880 | 2509 | sensor_bias (600) |
| engine_heldout | sensor_stuck | 0.2420 | 0.2778 | 0.2586 | 2880 | 2080 | normal (514) |
| engine_heldout | sensor_dropout | 0.1667 | 0.1892 | 0.1772 | 2880 | 2335 | efficiency_degradation (741) |

Sensor-group detection treats these four classes collectively as positive and all other fault classes (including physical faults) as negative. Per-class scores are multiclass metrics.

## Split integrity and preprocessing

Scenario-held-out scenario counts: `{"test": 87, "train": 402, "validation": 87}`; pairwise intersections are zero. Engine-held-out engine counts: `{"test": 6, "train": 18, "validation": 6}`; pairwise intersections are zero.
The persisted split manifests matched row-level lineage. The two protocols remain distinct: scenario-held-out partitions reuse training-engine identities by design, while engine-held-out uses disjoint engines. Existing split hashes were checked before and after evaluation.

The missing-value policy matches the existing trainer: training-fold median imputation with missingness indicators retained. For this run the fitted imputer is confined to train, then refit on train+validation before test. The diagnostic-only refits exclude all healthy-reference residuals used by the saved baseline models.

## Smallest useful next experiment

Run one targeted temporal-feature experiment on these same fixed splits: add only past-derived per-sensor first differences and trailing variability, calculated within each scenario and never using later samples. Keep the imputer, classifier settings, validation selection, and split assignments fixed. This directly tests whether causal temporal evidence helps separate drift from stuck/bias faults without a broad model or hyperparameter search.

## Output files

- `diagnostic_results.json` - metrics, feature policy, input/split hashes, and split audit.
- `scenario_heldout_per_class_metrics.csv` and `engine_heldout_per_class_metrics.csv` - class metrics and dominant confusions.
- `scenario_heldout_confusion_matrix.csv` and `engine_heldout_confusion_matrix.csv` - labelled class-by-class counts.
- `baseline_diagnostics.md` - summary and evidence-based interpretation.

No existing dataset, split, report, baseline result, or model file was modified.
