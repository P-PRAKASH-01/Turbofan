# ENGINE-TWIN v0.1.0 dataset audit report

**Audit date:** 2026-10-11  
**Scope:** Read-only inspection of the existing `Engine/` artifacts. Only this report and the companion audit outputs are new; the source dataset, metadata, and generator were not changed.  
**Decision:** **Not suitable yet as a reproducible synthetic fault-classification benchmark.** It is usable as a clearly labeled, frozen-data schema/dashboard demonstration, provided identifiers and label-derived fields are not used as model inputs. It is not a validated piston-engine physics model.

## 1. Executive findings

| ID | Severity | Finding |
|---|---|---|
| A1 | **Critical** | `scenario_id` determines `fault_type` exactly: the scenario number modulo 8 maps one-to-one to the eight fault labels. This makes a classification result invalid if the ID, or a feature derived from it, is used. |
| A2 | **High** | `generate_engine_twin_dataset.py` is a 688-byte stub; it contains no generator, equations, or scenario-generation code. The CSV cannot be reproduced or its recorded seeds verified from the supplied source. |
| A3 | **High** | The scenario split files form a correct disjoint 70/15/15 partition, but all 12 `engine_id`s occur in both train and validation, and 11 occur in test. Each engine ID is tied to one operating phase. This is not an unseen-engine evaluation. |
| A4 | **High** | `oil_pressure_kpa` is declared in kPa but spans only 0.108–1.095 kPa. That scale is suspicious for an oil-pressure channel and may indicate a unit-label mismatch; no reference engine is available to resolve it. |
| A5 | **High** | The dataset and parameter register explicitly describe generic assumption-driven surrogates, not a documented or calibrated physics model. It cannot substantiate physical validity for an aero piston engine. |
| A6 | **Medium** | The power–torque–RPM identity is not consistently satisfied, including in normal scenarios: 22.9% of rows with RPM present differ by more than 5% from `P = τω`, and 0.86% differ by more than 20%. Some large residuals may be intentional fault effects, but the missing generator prevents checking that. |
| A7 | **Medium** | The synthetic health index is 100 for every sample in all four sensor-fault classes. It therefore does not indicate those faults, although the health state and fault label can still say otherwise. Treat it as a limited synthetic engine-degradation target, not a general health or fault target. |
| A8 | **Low** | Raw and processed CSVs contain exactly the same rows and values when columns are aligned; the processed file only changes column order. It is not a distinct feature-engineering output. |

## 2. Files inspected

- `raw/engine_twin_synthetic_timeseries.csv`
- `processed/engine_twin_features_and_labels.csv`
- `metadata/dataset_card.json`
- `configs/parameter_register.csv`
- `metadata/scenario_manifest.csv`
- `splits/train_scenarios.csv`, `splits/validation_scenarios.csv`, `splits/test_scenarios.csv`
- `generate_engine_twin_dataset.py`
- `Readme.md`

The Notion workflow calls for a physics-based expected-healthy model, observed-minus-expected residuals, ML predictions, and a dashboard. The current dataset has residual columns and labels, but its card and parameter register say the references and channels are illustrative surrogates. The supplied source does not expose the equations needed to establish that they implement the documented physics workflow.

## 3. Dataset shape, schema, and missing values

The raw and processed files each have **28,800 rows and 34 columns**. There are **240 scenarios**, each with **120 samples at 1-second intervals**, with times 0–119 and no duplicate `(scenario_id, time_s)` rows. Scenario-level engine, phase, fault, severity, and split values are constant within each scenario. `column_statistics.csv` records every raw column's parsed dtype, declared or inferred unit, missing count/percentage, unique count, and numerical min/max/mean/sample standard deviation.

| Column(s) | Observed missingness | Assessment |
|---|---:|---|
| `rpm` and `rpm_residual` | 118 (0.410%) each | Only in scenarios labeled `sensor_dropout`. |
| `cht_c` and `cht_residual_c` | 41 (0.142%) each | Only in `sensor_dropout` scenarios. |
| `egt_c` and `egt_residual_c` | 186 (0.646%) each | Only in `sensor_dropout` scenarios. |
| `oil_temp_c` | 103 (0.358%) | Only in `sensor_dropout` scenarios. |
| `oil_pressure_kpa` and `oil_pressure_residual_kpa` | 166 (0.576%) each | Only in `sensor_dropout` scenarios. |
| `fault_onset_s` | 3,600 (12.5%) | Missing for the 30 normal scenarios; present for all non-normal scenarios. This is consistent with the manifest. |
| `sensor_fault_target` | 14,400 (50%) | Present in the four sensor-fault classes and absent in normal/physical-fault classes. |
| `rul_hours` | 28,800 (100%) | Intentionally unpopulated and appropriately disclaimed; no RUL target is available. |
| All other columns | 0 | No other missing values were found. |

The 614 missing sensor values occur only in the `sensor_dropout` class. This is consistent with the broad scenario label, but the exact dropout process and its relationship to onset are not reproducible from the supplied generator source.

## 4. Physical and mathematical checks

These are internal consistency checks, not validation against a real engine. No manufacturer, DRDO, or target-aircraft limits were inferred.

### Checks that pass or are broadly plausible

- **Air density:** `air_density_kg_m3` agrees with the ideal-gas calculation `ρ = p / (287.05 × T_kelvin)` to a maximum relative difference of about **0.001%**. This supports internal consistency of those two derived channels.
- **Ambient pressure versus altitude:** pressure decreases strongly with altitude (correlation about **−0.978**). Relative to an ISA troposphere reference, median absolute difference is about **5.8%**, 95th percentile **12.0%**, and maximum **15.4%**. This is only a rough environmental check; the dataset card itself calls the pressure estimate approximate.
- **Timestamp/sample spacing:** every scenario has an increasing UTC timestamp and 1-second sample spacing. Every scenario has exactly 120 samples.
- **RPM and power magnitudes:** observed ranges are 1,440.6–4,780.2 rev/min and 1.827–43.396 kW. These are internally positive, but cannot be compared with a target engine's limits because none is specified.

### Inconsistencies or unresolved units

- **Oil pressure:** the parameter register declares kPa; the observed range is **0.10768–1.09508 kPa** (mean 0.568 kPa). This is a unit/scale warning, not grounds to silently relabel values. Confirm the intended unit and conversion from the actual generator or an authoritative source before using this channel.
- **Power, torque, and RPM:** compared with `torque_nm × 2π × rpm / 60`, the absolute relative discrepancy has median **2.52%**, 95th percentile **10.9%**, and maximum **79.8%** over rows with RPM available. **22.94%** exceed 5%, **6.10%** exceed 10%, and **0.86%** exceed 20%. For normal scenarios alone, the 95th percentile is **9.08%** and maximum **29.5%**. The sizeable normal-scenario discrepancy merits correction or explicit model documentation. Fault scenarios, especially efficiency degradation and sensor dropout, may intentionally break the relation, but cannot be distinguished from accidental inconsistency without the generator equations.
- **Fuel flow and thermal channels:** observed fuel flow spans 0.000731–0.024750 kg/s; CHT 101.7–213.7 °C; EGT 371.4–650.0 °C; and oil temperature 66.3–134.6 °C. These are reported as generated, not endorsed limits or target-engine behavior. No reference specification or combustion/heat-balance equations are provided to validate them.
- **Other units:** altitude, temperature, ambient/manifold pressure, density, RPM, fuel flow, power, torque, and vibration units are stated in the parameter register and column statistics. Residuals inherit the corresponding channel unit. No conversion error is apparent for density; pressure scale remains unresolved for oil pressure.

## 5. Raw/processed equality and duplicate checks

- The files have the same 34 column names but in a different order (`split` moves from last in raw to sixth in processed).
- After selecting processed columns from raw and aligning the rows, the two dataframes compare exactly equal: **all 28,800 rows and all values are identical**.
- No exact duplicate full rows, duplicate scenario/time keys, or duplicate sensor tuples across different scenarios were found.
- The processed CSV currently adds no transformation, derived feature, imputation, or changed label relative to raw.

## 6. Labels, operating-phase shortcuts, and splits

There are 30 scenarios per `fault_type`: 30 normal and 30 in each of seven fault classes. For each non-normal class, there are 10 mild, 10 moderate, and 10 severe scenarios. Each fault has 120 samples per scenario.

### Shortcut evidence

1. **Scenario number is a perfect class key.** For scenario ID `SCNnnnn`, `nnnn mod 8` maps one-to-one to `sensor_dropout`, `normal`, `combustion_irregularity`, `thermal_abnormality`, `efficiency_degradation`, `sensor_bias`, `sensor_drift`, and `sensor_stuck`, respectively. The observed mapping classifies all **240/240 scenarios correctly** without sensor data. Do not train on `scenario_id` or numeric derivatives of it.
2. **Operating phase restricts class to exactly two choices.** `ground_run` contains only normal/sensor_bias; `climb` only combustion_irregularity/sensor_drift; `cruise` only thermal_abnormality/sensor_stuck; `descent` only efficiency_degradation/sensor_dropout. A phase-only majority baseline reaches **50%** (versus 12.5% uniform class chance). Phase is legitimate context, but this designed coupling makes test results less representative of varied operating/fault combinations.
3. **Engine identity is tied to phase.** Each of 12 engine IDs appears in exactly one operating phase and in 20 scenarios. Engine ID can thus reveal phase and recur across splits.
4. **Target-derived fields must not be predictors.** `fault_type`, `fault_severity`, `fault_active`, `fault_onset_s`, `sensor_fault_target`, `health_index_synthetic`, and `health_state_synthetic` are labels or label-derived metadata. The health state is exactly bucketed by the four health-index levels in this file (100 → Healthy; 75.1 → Degraded; 62.5/68.8 → Fault Detected). Exclude them from inputs for tasks where they are targets.

### Label consistency results

- `fault_active` is 0 for normal scenarios and exactly follows `time_s >= fault_onset_s` for all non-normal samples: **0 onset/active mismatches**.
- `fault_severity` is `none` for normal scenarios and evenly distributed across mild/moderate/severe within every fault class.
- `sensor_fault_target` is populated only for sensor faults; it names one of `rpm`, `cht`, `egt`, `oil_temp`, or `oil_pressure`. Its precise assignment process cannot be checked without the generator.
- `health_index_synthetic` has only four levels: 100.0, 75.1, 68.8, and 62.5. It is always 100 for normal and all four sensor-fault classes; it changes only for combustion irregularity, efficiency degradation, and thermal abnormality. This is a defined limitation if the index is intended to reflect physical-engine degradation only; it is misleading if presented as a complete fault/health measure.
- 4,468 rows are labeled `Fault Detected`, 2,227 `Degraded`, and 22,105 `Healthy`. The state is a deterministic discretization of the synthetic index, not an independently measured annotation.
- `rul_hours` is empty throughout, consistent with the dataset card and with the absence of an end-of-life definition. Do not populate it by inference from these short scenarios.

### Split integrity

The three scenario lists contain **168 train / 36 validation / 36 test** scenarios, have no duplicates or intersections, cover all 240 manifest scenarios, and agree with the split column in the data. No scenario or time sample is shared between partitions.

However, scenario separation is not engine separation:

- Train includes all 12 engine IDs.
- Validation includes the same 12 engine IDs.
- Test includes 11 of those 12 engine IDs.
- Since each engine ID is phase-fixed, splitting by scenario does not test generalization to new engines and permits identity/phase leakage.

The per-split class counts are imbalanced, especially validation/test: the smallest test classes have 2–3 scenarios. Report class-wise metrics and uncertainty; do not rely on a single aggregate accuracy.

## 7. Reproducibility and provenance

- Dataset card records version 0.1.0, base seed **26054**, and 2026-10-10 creation time.
- Manifest seeds are sequential **26054–26293**, one per scenario. The time-series CSV has no seed column, and the `seed` assignment cannot be verified against its generated sensor values.
- `generate_engine_twin_dataset.py` imports NumPy/Pandas, sets `SEED = 26054`, and prints notices only. It defines no function that reads configuration, sets RNG state, samples scenarios, computes channels, injects faults, writes CSVs, or recreates splits.
- Thus, the manifest's per-scenario seed values are metadata only from the evidence available; they do not prove deterministic generation. Exact regeneration, generator version, RNG algorithm, scenario input parameters, and output hash verification are unavailable.

SHA-256 hashes for the audited source artifacts:

| File | SHA-256 |
|---|---|
| `raw/engine_twin_synthetic_timeseries.csv` | `ea907b813d607b89f181c965445a653e2afedbef93c122f553a93327e8e9a4c5` |
| `processed/engine_twin_features_and_labels.csv` | `15b1ea871f66d10a90079e998894cd410f44b136118a70d0ed48257808e969e3` |
| `metadata/dataset_card.json` | `a7b3258100734ef84a5b3f5e8dae880bd73f927e394c7b5eca832c5e2c8649ed` |
| `metadata/scenario_manifest.csv` | `c2910a8d754a88594b6b6e62f642e3a2c996bdc342c9bdcff3e4292562b3fb25` |
| `configs/parameter_register.csv` | `e063232e5f2d009a95ccadf8c3cd58cd490303dbd1bb1b3cebfcbe001241890a` |
| `generate_engine_twin_dataset.py` | `5aa5656d4d9d6a4acd1c8f70bbf88209811347d19bcdd32c9c16a29dc3500d30` |

## 8. Overall suitability

The artifacts are **suitable only as a frozen, synthetic pipeline/schema/dashboard demonstration**, with identifier and target leakage explicitly prevented and limitations prominently shown. They are **not suitable as a reproducible benchmark in v0.1.0**, because the generator is absent and scenario IDs encode the target perfectly. They are not suitable for claims of real-engine fault accuracy, calibration, maintenance prediction, or flight use. C-MAPSS turbofan data also remains a separate benchmark and must not be presented as the source or validation for this piston-engine dataset.

See `label_consistency_report.md` for the label-specific audit and `recommended_v0_2_changes.md` for corrections to consider before any implementation.
