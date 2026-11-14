# ENGINE-TWIN v0.1.0 label consistency report

This report audits the labels and scenario/split metadata in `raw/engine_twin_synthetic_timeseries.csv`, `processed/engine_twin_features_and_labels.csv`, `metadata/scenario_manifest.csv`, and the three scenario split files. The missing generator implementation limits verification of how labels and signals were produced.

## Summary

| Check | Result | Severity |
|---|---|---|
| One fault and severity per scenario | Pass; each scenario has constant metadata | Low |
| Normal/non-normal onset convention | Pass; normal onset missing, fault onset present | Low |
| `fault_active` versus onset | Pass; 0 mismatches across 28,800 rows | Low |
| Fault-type/severity coverage | Pass for stated design; 30 scenarios per type, 10 per non-normal severity per type | Low |
| Scenario ID versus fault target | **Exact 240/240 class mapping from scenario number modulo 8** | **Critical** |
| Phase versus fault target | Only two fault classes occur in each phase; 50% phase-only majority accuracy | High |
| Engine split independence | Fails; all 12 IDs in train and validation, 11 IDs overlap test | High |
| Synthetic health labels | Deterministically derived; all sensor-fault classes have health index 100 | Medium |
| RUL target | Empty for all rows; consistent with documented omission | Low |
| Reproducible labels/signals from source | Not verifiable; generator is a stub | High |

## Label counts

Each class has 30 scenarios:

| Fault type | Scenarios | Mild | Moderate | Severe | None |
|---|---:|---:|---:|---:|---:|
| normal | 30 | 0 | 0 | 0 | 30 |
| combustion_irregularity | 30 | 10 | 10 | 10 | 0 |
| thermal_abnormality | 30 | 10 | 10 | 10 | 0 |
| efficiency_degradation | 30 | 10 | 10 | 10 | 0 |
| sensor_bias | 30 | 10 | 10 | 10 | 0 |
| sensor_drift | 30 | 10 | 10 | 10 | 0 |
| sensor_stuck | 30 | 10 | 10 | 10 | 0 |
| sensor_dropout | 30 | 10 | 10 | 10 | 0 |

The manifest onset, fault, severity, engine, phase, and split values are constant within each scenario and agree with the corresponding time-series metadata. For normal scenarios, `fault_onset_s` is null in both manifest and data.

## Critical finding: scenario identifier is the target

For `SCNnnnn`, the scenario number modulo 8 gives exactly one class for every scenario:

| `scenario number mod 8` | Fault type |
|---:|---|
| 0 | sensor_dropout |
| 1 | normal |
| 2 | combustion_irregularity |
| 3 | thermal_abnormality |
| 4 | efficiency_degradation |
| 5 | sensor_bias |
| 6 | sensor_drift |
| 7 | sensor_stuck |

This rule reproduces all **240/240 scenario labels**. Randomly assigning scenarios to train/validation/test does not remove this key: the same rule applies in every partition. `scenario_id` must be treated as an opaque identifier and excluded from model features; do not parse its numeric suffix or derive a feature from it. More importantly, v0.2 should randomize scenario creation/order independently from fault assignment so IDs do not encode the class in the dataset itself.

## High finding: phase confounds fault class

`operating_phase` is constant per `engine_id` and restricts fault types as follows:

| Operating phase | Fault types present | Scenarios per type | Phase-only majority accuracy |
|---|---|---:|---:|
| ground_run | normal, sensor_bias | 30 each | 50% |
| climb | combustion_irregularity, sensor_drift | 30 each | 50% |
| cruise | thermal_abnormality, sensor_stuck | 30 each | 50% |
| descent | efficiency_degradation, sensor_dropout | 30 each | 50% |

Operating phase is valid context, but this perfect pairing removes many realistic fault/condition combinations. A model can exploit phase to narrow the answer to two classes. v0.2 should sample fault types across phases where physically meaningful, with supported/unsupported combinations declared explicitly.

## Split and engine identity

The split files are internally sound at the scenario level:

- 168 train, 36 validation, and 36 test scenarios.
- No duplicate scenario IDs within a split or overlap between splits.
- Their union matches all 240 manifest scenarios.
- Each data scenario's split matches the manifest and its split file.
- No scenario/time sample is duplicated across partitions.

They do not isolate engine identity. The same 12 engine IDs recur across scenarios; all 12 occur in train and validation, and 11 occur in test. Each engine ID is fixed to one phase (three IDs per phase). Hence this is a scenario-held-out split, not an unseen-engine split. Do not claim generalization to unseen engines. For that claim, create sufficient independent engine instances and split by engine before generating scenarios.

## Fault flags, sensor targets, and health labels

- `fault_active` agrees exactly with the rule `fault_type != normal AND time_s >= fault_onset_s`; there are no onset mismatches. Normal samples have no active fault.
- Every non-normal scenario has a manifest onset in the range 25–64 seconds and the data has 120 seconds of duration. The active flag therefore covers the remainder of the scenario.
- `sensor_fault_target` is populated only in the four sensor-fault classes, using `rpm`, `cht`, `egt`, `oil_temp`, or `oil_pressure`. There are no target values in the physical-fault or normal classes. Target choice is scenario-constant. With no generator, its sampling and whether all intended changes follow the named sensor cannot be reproduced.
- The 614 missing numeric sensor values occur only in `sensor_dropout`. They are consistent with that class, but the exact stochastic dropout pattern is not documented.
- `health_index_synthetic` is one of four values (100.0, 75.1, 68.8, 62.5); `health_state_synthetic` is an exact deterministic mapping of those values: 100.0 → Healthy, 75.1 → Degraded, 68.8/62.5 → Fault Detected. These are not independent labels.
- All 120 samples in every `sensor_bias`, `sensor_drift`, `sensor_stuck`, and `sensor_dropout` scenario have `health_index_synthetic = 100.0`, including after fault onset. Thus, the index is blind to all simulated sensor-fault classes. This can be acceptable only if explicitly defined as a physical degradation-only index; do not use it as a complete engine/fault health target.
- `rul_hours` is null in all 28,800 rows. This is correct for the stated limitations; no RUL training or evaluation should be claimed.

## Use safeguards for any v0.1 demonstration

1. Exclude `scenario_id`, `engine_id`, `timestamp_utc`, `split`, and target/target-derived columns from predictors unless the experiment explicitly studies them.
2. Keep `fault_type`, `fault_severity`, `fault_active`, `fault_onset_s`, `sensor_fault_target`, and synthetic health labels out of the feature matrix for tasks that predict those labels.
3. Report the phase-only 50% baseline, per-class metrics, and the limitations caused by engine overlap and phase/class pairing.
4. Describe all scores as performance on assumption-driven synthetic data, not real engine accuracy.
5. Do not infer RUL or maintenance timing from this dataset.
