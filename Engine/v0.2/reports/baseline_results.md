# ENGINE-TWIN v0.2 baseline results

Synthetic-data classification results only; these do not estimate real-engine accuracy.

| Protocol | Selected model | Sample macro-F1 | Fault-detection F1 | Scenario-majority macro-F1 |
|---|---|---:|---:|---:|
| scenario_heldout | random_forest | 0.4665 | 0.8416 | 0.5423 |
| engine_heldout | random_forest | 0.4740 | 0.8136 | 0.5911 |

## scenario_heldout: per-class recall

| Fault class | Recall | Support |
|---|---:|---:|
| combustion_irregularity | 0.6689 | 1320 |
| efficiency_degradation | 0.5861 | 1440 |
| normal | 0.4848 | 1320 |
| sensor_bias | 0.3308 | 1200 |
| sensor_drift | 0.2568 | 1320 |
| sensor_dropout | 0.3542 | 1200 |
| sensor_stuck | 0.3108 | 1200 |
| thermal_abnormality | 0.6306 | 1440 |

## scenario_heldout: sample-level confusion matrix

| True \\ Predicted | combustion_irregularity | efficiency_degradation | normal | sensor_bias | sensor_drift | sensor_dropout | sensor_stuck | thermal_abnormality |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| combustion_irregularity | 883 | 6 | 112 | 35 | 33 | 115 | 59 | 77 |
| efficiency_degradation | 154 | 844 | 277 | 32 | 2 | 62 | 63 | 6 |
| normal | 72 | 3 | 640 | 127 | 125 | 157 | 103 | 93 |
| sensor_bias | 26 | 0 | 151 | 397 | 380 | 246 | 0 | 0 |
| sensor_drift | 90 | 2 | 354 | 308 | 339 | 89 | 128 | 10 |
| sensor_dropout | 23 | 42 | 521 | 20 | 12 | 425 | 127 | 30 |
| sensor_stuck | 3 | 1 | 379 | 5 | 247 | 191 | 373 | 1 |
| thermal_abnormality | 83 | 45 | 206 | 43 | 35 | 99 | 21 | 908 |


## engine_heldout: per-class recall

| Fault class | Recall | Support |
|---|---:|---:|
| combustion_irregularity | 0.5809 | 2880 |
| efficiency_degradation | 0.5941 | 2880 |
| normal | 0.5875 | 2880 |
| sensor_bias | 0.2226 | 2880 |
| sensor_drift | 0.3222 | 2880 |
| sensor_dropout | 0.2830 | 2880 |
| sensor_stuck | 0.4198 | 2880 |
| thermal_abnormality | 0.6285 | 2880 |

## engine_heldout: sample-level confusion matrix

| True \\ Predicted | combustion_irregularity | efficiency_degradation | normal | sensor_bias | sensor_drift | sensor_dropout | sensor_stuck | thermal_abnormality |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| combustion_irregularity | 1673 | 49 | 676 | 101 | 26 | 107 | 145 | 103 |
| efficiency_degradation | 90 | 1711 | 642 | 47 | 35 | 173 | 164 | 18 |
| normal | 132 | 57 | 1692 | 126 | 44 | 640 | 165 | 24 |
| sensor_bias | 133 | 16 | 518 | 641 | 1095 | 223 | 146 | 108 |
| sensor_drift | 49 | 1 | 711 | 579 | 928 | 419 | 50 | 143 |
| sensor_dropout | 12 | 31 | 1539 | 40 | 178 | 815 | 249 | 16 |
| sensor_stuck | 38 | 9 | 1018 | 160 | 67 | 339 | 1209 | 40 |
| thermal_abnormality | 30 | 12 | 416 | 109 | 83 | 319 | 101 | 1810 |
