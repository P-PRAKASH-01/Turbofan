# ENGINE-TWIN Phase 3E: fault-class error analysis

**Scope:** analysis of saved Phase 3D artifacts, with earlier diagnostics for historical context. No dataset was regenerated and no model was retrained. All results are from a generic synthetic simulator; they are not real-engine diagnostic accuracy, manufacturer/DRDO calibration, or evidence of RUL capability.

## How to read the results

Each class's precision, recall, F1, and support are summarized across five independently generated dataset seeds. The reported standard deviation is the sample SD across those five seeds; rows/time samples are not treated as independent seeds. In confusion matrices, each row is the true class and columns are predicted classes. Full aggregates are in `classwise_aggregate_metrics.csv`.

## Class ranking - scenario heldout

Higher mean F1 indicates better balance of precision and recall in these saved evaluations. `SD` describes seed-to-seed spread.

### A - 29 predictors

| Rank | Class | Mean F1 | SD | Min | Max |
|---:|---|---:|---:|---:|---:|
| 1 | combustion_irregularity | 0.462 | 0.112 | 0.303 | 0.605 |
| 2 | thermal_abnormality | 0.267 | 0.049 | 0.187 | 0.315 |
| 3 | sensor_dropout | 0.217 | 0.123 | 0.094 | 0.422 |
| 4 | sensor_bias | 0.181 | 0.086 | 0.085 | 0.287 |
| 5 | sensor_drift | 0.163 | 0.075 | 0.071 | 0.277 |
| 6 | efficiency_degradation | 0.151 | 0.108 | 0.076 | 0.341 |
| 7 | normal | 0.121 | 0.065 | 0.035 | 0.207 |
| 8 | sensor_stuck | 0.108 | 0.032 | 0.068 | 0.139 |

### B - 29 + 40 temporal predictors

| Rank | Class | Mean F1 | SD | Min | Max |
|---:|---|---:|---:|---:|---:|
| 1 | sensor_stuck | 0.697 | 0.053 | 0.604 | 0.733 |
| 2 | combustion_irregularity | 0.494 | 0.115 | 0.338 | 0.654 |
| 3 | sensor_dropout | 0.447 | 0.086 | 0.342 | 0.548 |
| 4 | thermal_abnormality | 0.338 | 0.085 | 0.224 | 0.433 |
| 5 | sensor_bias | 0.217 | 0.095 | 0.126 | 0.369 |
| 6 | efficiency_degradation | 0.193 | 0.117 | 0.076 | 0.371 |
| 7 | sensor_drift | 0.186 | 0.090 | 0.087 | 0.312 |
| 8 | normal | 0.144 | 0.026 | 0.107 | 0.175 |

The three lowest mean-F1 classes for B are normal (0.144), sensor drift (0.186), and efficiency degradation (0.193).

### B: most common incorrect prediction by true class

| True class | Top predicted partner | Pooled wrong rows | Top partner in seeds | Mean row error rate |
|---|---|---:|---:|---:|
| combustion_irregularity | normal | 857 | 2/5 | 0.133 |
| efficiency_degradation | normal | 1379 | 3/5 | 0.203 |
| normal | efficiency_degradation | 1430 | 2/5 | 0.224 |
| sensor_bias | sensor_drift | 1374 | 3/5 | 0.210 |
| sensor_drift | normal | 1688 | 2/5 | 0.251 |
| sensor_dropout | efficiency_degradation | 884 | 2/5 | 0.140 |
| sensor_stuck | normal | 589 | 2/5 | 0.100 |
| thermal_abnormality | efficiency_degradation | 1195 | 1/5 | 0.177 |
## Class ranking - engine heldout

Higher mean F1 indicates better balance of precision and recall in these saved evaluations. `SD` describes seed-to-seed spread.

### A - 29 predictors

| Rank | Class | Mean F1 | SD | Min | Max |
|---:|---|---:|---:|---:|---:|
| 1 | combustion_irregularity | 0.449 | 0.089 | 0.388 | 0.604 |
| 2 | thermal_abnormality | 0.308 | 0.046 | 0.268 | 0.373 |
| 3 | sensor_dropout | 0.203 | 0.038 | 0.162 | 0.251 |
| 4 | sensor_bias | 0.181 | 0.040 | 0.136 | 0.225 |
| 5 | sensor_stuck | 0.161 | 0.100 | 0.008 | 0.259 |
| 6 | efficiency_degradation | 0.159 | 0.073 | 0.054 | 0.237 |
| 7 | normal | 0.153 | 0.056 | 0.093 | 0.238 |
| 8 | sensor_drift | 0.152 | 0.067 | 0.061 | 0.239 |

### B - 29 + 40 temporal predictors

| Rank | Class | Mean F1 | SD | Min | Max |
|---:|---|---:|---:|---:|---:|
| 1 | sensor_stuck | 0.705 | 0.027 | 0.676 | 0.738 |
| 2 | sensor_dropout | 0.521 | 0.113 | 0.381 | 0.630 |
| 3 | combustion_irregularity | 0.514 | 0.089 | 0.448 | 0.668 |
| 4 | thermal_abnormality | 0.338 | 0.072 | 0.232 | 0.422 |
| 5 | normal | 0.194 | 0.042 | 0.137 | 0.236 |
| 6 | sensor_drift | 0.189 | 0.087 | 0.053 | 0.266 |
| 7 | sensor_bias | 0.175 | 0.075 | 0.072 | 0.269 |
| 8 | efficiency_degradation | 0.171 | 0.074 | 0.069 | 0.245 |

The three lowest mean-F1 classes for B are efficiency degradation (0.171), sensor bias (0.175), and sensor drift (0.189).

### B: most common incorrect prediction by true class

| True class | Top predicted partner | Pooled wrong rows | Top partner in seeds | Mean row error rate |
|---|---|---:|---:|---:|
| combustion_irregularity | normal | 2960 | 2/5 | 0.206 |
| efficiency_degradation | normal | 5367 | 4/5 | 0.373 |
| normal | efficiency_degradation | 2994 | 3/5 | 0.208 |
| sensor_bias | normal | 4132 | 2/5 | 0.287 |
| sensor_drift | normal | 3752 | 2/5 | 0.261 |
| sensor_dropout | normal | 2148 | 2/5 | 0.149 |
| sensor_stuck | normal | 2072 | 3/5 | 0.144 |
| thermal_abnormality | normal | 3237 | 3/5 | 0.225 |

## Do the named confusion patterns repeat?

For temporal model B, these are the mean row-normalized confusion rates and count of seeds where the paired class was the single top confusion. These are measured associations, not explanations of cause.

### scenario heldout

| Pair | Direction | Mean row error rate | Top confusion in seeds |
|---|---|---:|---:|
| sensor_bias / sensor_drift | sensor_bias -> sensor_drift | 0.210 | 3/5 |
| sensor_bias / sensor_drift | sensor_drift -> sensor_bias | 0.113 | 0/5 |
| sensor_stuck / sensor_dropout | sensor_stuck -> sensor_dropout | 0.030 | 0/5 |
| sensor_stuck / sensor_dropout | sensor_dropout -> sensor_stuck | 0.008 | 0/5 |
| normal / efficiency_degradation | normal -> efficiency_degradation | 0.224 | 2/5 |
| normal / efficiency_degradation | efficiency_degradation -> normal | 0.203 | 3/5 |
| combustion_irregularity / thermal_abnormality | combustion_irregularity -> thermal_abnormality | 0.114 | 2/5 |
| combustion_irregularity / thermal_abnormality | thermal_abnormality -> combustion_irregularity | 0.040 | 0/5 |
### engine heldout

| Pair | Direction | Mean row error rate | Top confusion in seeds |
|---|---|---:|---:|
| sensor_bias / sensor_drift | sensor_bias -> sensor_drift | 0.175 | 2/5 |
| sensor_bias / sensor_drift | sensor_drift -> sensor_bias | 0.148 | 1/5 |
| sensor_stuck / sensor_dropout | sensor_stuck -> sensor_dropout | 0.022 | 0/5 |
| sensor_stuck / sensor_dropout | sensor_dropout -> sensor_stuck | 0.009 | 0/5 |
| normal / efficiency_degradation | normal -> efficiency_degradation | 0.208 | 3/5 |
| normal / efficiency_degradation | efficiency_degradation -> normal | 0.373 | 4/5 |
| combustion_irregularity / thermal_abnormality | combustion_irregularity -> thermal_abnormality | 0.047 | 0/5 |
| combustion_irregularity / thermal_abnormality | thermal_abnormality -> combustion_irregularity | 0.027 | 0/5 |

## A versus B: temporal features

Across all five seeds and both protocols, overall macro-F1 increased in the Phase 3D summary. For classwise F1, combustion irregularity, sensor dropout, and sensor stuck improved in every seed under both protocols. Bias was mixed; normal, efficiency degradation, drift, and thermal abnormality each include at least one seed with a decrease. For exact precision/recall/F1 changes by seed, see `temporal_feature_effects_by_class.csv`; this distinguishes precision gains from recall losses rather than hiding them in a single F1 number.

## Why group F1 differs from eight-class macro-F1

Eight-class macro-F1 computes an F1 for each of the eight classes and averages them equally. Binary sensor-group scoring combines bias, drift, stuck, and dropout into one positive label, with the other four labels as negative. Thus predicting bias as drift is an eight-class error but a correct sensor-group positive. A sensor fault predicted as normal/physical fault is a group false negative; a non-sensor class predicted as a sensor class is a group false positive. The metrics answer different questions and can move differently.

## Evidence and limitations

**Observed:** recurring bias/drift confusion, and normal/efficiency degradation confusion. Temporal B substantially reduces stuck/dropout confusion in the saved matrices, particularly compared with A. The CSV contains every directed confusion partner and per-seed counts/rates.

**Not established:** why these mistakes occur. The matrices do not stratify mistakes by sensor target, severity, operating condition, or onset, and do not contain row-linked predictions. Similarity in simulated signatures is a possible hypothesis, not a demonstrated cause.

The saved per-class supports agree with the row totals in the corresponding confusion matrices. Per-seed metric files include all eight classes for both protocols and A/B, so the requested class-level comparisons can be made. The saved per-seed results identify random forest as the validation-selected model for all 20 seed/protocol/experiment evaluations. Missing from the deliverables are row-level predictions and joined per-row condition metadata; error mechanisms cannot be isolated from aggregate evidence.

### Historical evaluator caveat

Phase 3B/3C record temporal formulas but do not preserve a complete executable evaluator and fully ordered 40-column temporal schema. Accordingly, this analysis reports saved historical metrics as stored and does not claim exact reproduction of their feature ordering. Phase 3D makes the ordered schema explicit.

The Phase 3C checksum manifest has 17 input hashes that differ from the current v0.2 tree; they cover the seed-8675309 dataset/configuration and split snapshot rather than the current base-seed snapshot. These are recorded as historical input-hash mismatches in `checksums.json`, not treated as Phase 3D output corruption. All Phase 3D manifest-listed output hashes were verified during this analysis.

### Technical interpretation

For this synthetic simulator and fixed classifier-selection procedure, adding the temporal features is associated with better overall macro-F1 across the tested seeds, with consistent class gains for stuck/dropout and persistent difficulty for bias/drift and normal/efficiency separation. This is preliminary robustness evidence only; it does not establish physical observability or performance on real engines.
