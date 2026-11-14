# ENGINE-TWIN v0.2 Phase 3C: second-seed temporal robustness

**Synthetic-simulator results only.** They do not estimate or establish real-engine diagnostic accuracy.

## Experiment

The only config change from v0.2 was the master seed (8675309). The generator produced a separate dataset and new deterministic split assignments in an isolated temporary project. A and B share the same new-seed train/validation/test masks. Feature definitions, classifier hyperparameters, validation selection, and imputation policy are unchanged from Phase 3B.

| Protocol | Experiment | Selected model | Test accuracy | Test macro-F1 | Sensor-group F1 |
|---|---|---|---:|---:|---:|
| scenario_heldout | A (29 predictors) | random_forest | 0.2232 | 0.2279 | 0.5242 |
| scenario_heldout | B (+ temporal) | random_forest | 0.3307 | 0.3686 | 0.5238 |
| engine_heldout | A (29 predictors) | random_forest | 0.1947 | 0.1945 | 0.5576 |
| engine_heldout | B (+ temporal) | random_forest | 0.3022 | 0.3205 | 0.5857 |

## A-to-B class changes

### scenario_heldout

| Class | Precision A->B | Recall A->B | F1 A->B (delta) | Largest confusion A->B |
|---|---:|---:|---:|---|
| combustion_irregularity | 0.6913->0.8213 | 0.5379->0.5432 | 0.6050->0.6539 (+0.0489) | efficiency_degradation (223) -> efficiency_degradation (141) |
| efficiency_degradation | 0.0931->0.2029 | 0.0932->0.3061 | 0.0931->0.2440 (+0.1509) | thermal_abnormality (253) -> normal (327) |
| normal | 0.2287->0.1106 | 0.1894->0.1598 | 0.2072->0.1307 (-0.0765) | sensor_drift (342) -> sensor_drift (675) |
| sensor_bias | 0.1257->0.1940 | 0.1042->0.0938 | 0.1139->0.1264 (+0.0125) | thermal_abnormality (348) -> sensor_drift (426) |
| sensor_drift | 0.1562->0.1354 | 0.1396->0.1889 | 0.1474->0.1577 (+0.0103) | sensor_stuck (448) -> normal (544) |
| sensor_dropout | 0.2591->0.6177 | 0.1879->0.4174 | 0.2178->0.4982 (+0.2804) | sensor_bias (358) -> normal (229) |
| sensor_stuck | 0.0938->0.8627 | 0.1844->0.5958 | 0.1243->0.7049 (+0.5806) | efficiency_degradation (241) -> normal (134) |
| thermal_abnormality | 0.2814->0.4190 | 0.3568->0.4470 | 0.3146->0.4326 (+0.1179) | sensor_stuck (265) -> sensor_drift (239) |

### engine_heldout

| Class | Precision A->B | Recall A->B | F1 A->B (delta) | Largest confusion A->B |
|---|---:|---:|---:|---|
| combustion_irregularity | 0.3589->0.5022 | 0.4215->0.4434 | 0.3877->0.4710 (+0.0833) | normal (626) -> efficiency_degradation (518) |
| efficiency_degradation | 0.1052->0.1342 | 0.1368->0.2052 | 0.1189->0.1623 (+0.0434) | combustion_irregularity (688) -> sensor_drift (706) |
| normal | 0.0999->0.1772 | 0.0878->0.1719 | 0.0935->0.1745 (+0.0810) | sensor_stuck (509) -> efficiency_degradation (769) |
| sensor_bias | 0.1750->0.2296 | 0.1354->0.1851 | 0.1527->0.2050 (+0.0523) | efficiency_degradation (747) -> sensor_drift (775) |
| sensor_drift | 0.0628->0.0457 | 0.0590->0.0628 | 0.0609->0.0529 (-0.0080) | sensor_dropout (594) -> efficiency_degradation (748) |
| sensor_dropout | 0.1509->0.4794 | 0.1753->0.3726 | 0.1622->0.4193 (+0.2571) | sensor_drift (586) -> sensor_drift (613) |
| sensor_stuck | 0.2411->0.8036 | 0.2399->0.6125 | 0.2405->0.6952 (+0.4547) | sensor_dropout (681) -> sensor_drift (309) |
| thermal_abnormality | 0.3889->0.4054 | 0.3014->0.3639 | 0.3396->0.3835 (+0.0439) | efficiency_degradation (480) -> sensor_drift (550) |

## Sensor-integrity classes

| Protocol | Class | Precision A->B | Recall A->B | F1 A->B (delta) |
|---|---|---:|---:|---:|
| scenario_heldout | sensor_bias | 0.1257->0.1940 | 0.1042->0.0938 | 0.1139->0.1264 (+0.0125) |
| scenario_heldout | sensor_drift | 0.1562->0.1354 | 0.1396->0.1889 | 0.1474->0.1577 (+0.0103) |
| scenario_heldout | sensor_stuck | 0.0938->0.8627 | 0.1844->0.5958 | 0.1243->0.7049 (+0.5806) |
| scenario_heldout | sensor_dropout | 0.2591->0.6177 | 0.1879->0.4174 | 0.2178->0.4982 (+0.2804) |
| engine_heldout | sensor_bias | 0.1750->0.2296 | 0.1354->0.1851 | 0.1527->0.2050 (+0.0523) |
| engine_heldout | sensor_drift | 0.0628->0.0457 | 0.0590->0.0628 | 0.0609->0.0529 (-0.0080) |
| engine_heldout | sensor_stuck | 0.2411->0.8036 | 0.2399->0.6125 | 0.2405->0.6952 (+0.4547) |
| engine_heldout | sensor_dropout | 0.1509->0.4794 | 0.1753->0.3726 | 0.1622->0.4193 (+0.2571) |

## Comparison with seed 314159

| Protocol | Macro-F1 delta at seed 314159 | Macro-F1 delta at seed 8675309 | Sensor-group F1 delta at seed 314159 | Sensor-group F1 delta at seed 8675309 |
|---|---:|---:|---:|---:|
| scenario_heldout | +0.1518 | +0.1406 | -0.0314 | -0.0004 |
| engine_heldout | +0.0863 | +0.1260 | -0.0215 | +0.0281 |

Per-class F1 deltas by seed (seed 314159 -> seed 8675309):

- `scenario_heldout`: combustion_irregularity +0.0211->+0.0489; efficiency_degradation +0.0578->+0.1509; normal +0.0108->-0.0765; sensor_bias -0.0173->+0.0125; sensor_drift +0.0157->+0.0103; sensor_dropout +0.3662->+0.2804; sensor_stuck +0.6349->+0.5806; thermal_abnormality +0.1253->+0.1179.
- `engine_heldout`: combustion_irregularity +0.0275->+0.0833; efficiency_degradation -0.0983->+0.0434; normal -0.0020->+0.0810; sensor_bias -0.0643->+0.0523; sensor_drift +0.0032->-0.0080; sensor_dropout +0.3876->+0.2571; sensor_stuck +0.4790->+0.4547; thermal_abnormality -0.0420->+0.0439.

## Interpretation

A result is called repeatable across these two synthetic seeds only at the direction-of-change level for the metric shown; two seeds are not a statistical uncertainty estimate. Class-wise changes may vary even if aggregate macro-F1 has the same sign. Do not infer real-engine accuracy or physical fault detectability from this simulator.

## Execution commands and environment

The isolated run used Python 3.11.0, NumPy 2.3.3, pandas 3.0.1, scikit-learn 1.7.2, and joblib 1.5.2. The exact pipeline commands and exit codes are recorded in `execution_evidence.json`; all five returned 0. Dataset validation reported 18/18 checks passed and unittest reported 10 tests passed. The A/B analysis was an inline Python driver, not a modified or persisted source file.

## Validation and files

- The alternate-seed copy passed its dataset validator and automated suite before model diagnostics; detailed 18-check and 10-test outcomes were captured in the execution logs.
- Both protocols used seed-8675309 split manifests; row memberships were checked against lineage, with no overlap within each protocol.
- Source and generated input hashes are in `phase3c_seed_results.json`; all published Phase 3C output hashes are in `checksums.json`.
- Confusion matrices and per-class CSVs are provided for A and B for both protocols.
- The temporary generated dataset, split files, reports, and models are not included in the published Phase 3C directory.
