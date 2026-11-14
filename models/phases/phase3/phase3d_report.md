# ENGINE-TWIN Phase 3D: multi-seed temporal robustness

**Synthetic-simulator results only.** These results do not establish real-engine diagnostic accuracy, statistical significance, or RUL capability. The independent dataset seed is the replication unit; rows/time samples are not independent replicates.

## Design and integrity

- Compared A (exact 29 Phase 3A predictors) and B (same 29 plus 40 past-only temporal predictors) for seeds 314159, 8675309, 20261011, 1357911, 42424243.
- Seeds 314159 and 8675309 reuse the saved Phase 3B/3C results. Three new seeds were generated and evaluated in isolated temporary projects.
- Each new seed passed 18/18 validation checks and 10/10 automated tests before classifier evaluation.
- For every new seed, only the master `seed` setting differed from the v0.2 configuration. Raw dataset and all nine split-file SHA-256 hashes differ across the five seeds.
- A/B share the same seed-specific split masks. Predictors exclude identifiers, labels, latent states, healthy-reference residuals and future readings. Median imputation is fitted on training data, then refitted on train+validation.
- Model selection uses validation macro-F1, comparing the prior DummyClassifier and fixed Random Forest; test is evaluated once after refit. The Random Forest was selected for all four A/B-protocol comparisons in each of the five seeds. Exact hyperparameters are in each seed results JSON.
- The clean Python 3.11.0 environment installed the pinned direct requirements successfully. Resolved transitive versions are recorded in `pip_freeze.txt`.

## Aggregate metrics across five seeds

Mean, sample SD (`ddof=1`), minimum and maximum are descriptive.

| Protocol | Model | Metric | Mean | SD | Min | Max |
|---|---|---|---:|---:|---:|---:|
| scenario_heldout | A | accuracy | 0.2108 | 0.0486 | 0.1556 | 0.2852 |
| scenario_heldout | A | macro_f1 | 0.2086 | 0.0476 | 0.1563 | 0.2785 |
| scenario_heldout | A | sensor_group_precision | 0.5706 | 0.0679 | 0.5161 | 0.6864 |
| scenario_heldout | A | sensor_group_recall | 0.5427 | 0.0724 | 0.4370 | 0.6374 |
| scenario_heldout | A | sensor_group_f1 | 0.5555 | 0.0674 | 0.4779 | 0.6610 |
| scenario_heldout | B | accuracy | 0.3239 | 0.0276 | 0.2949 | 0.3671 |
| scenario_heldout | B | macro_f1 | 0.3394 | 0.0280 | 0.3078 | 0.3693 |
| scenario_heldout | B | sensor_group_precision | 0.6376 | 0.0452 | 0.5791 | 0.6973 |
| scenario_heldout | B | sensor_group_recall | 0.5629 | 0.1073 | 0.4541 | 0.7258 |
| scenario_heldout | B | sensor_group_f1 | 0.5961 | 0.0787 | 0.5203 | 0.7112 |
| engine_heldout | A | accuracy | 0.2203 | 0.0256 | 0.1947 | 0.2524 |
| engine_heldout | A | macro_f1 | 0.2206 | 0.0237 | 0.1945 | 0.2488 |
| engine_heldout | A | sensor_group_precision | 0.5688 | 0.0222 | 0.5455 | 0.5997 |
| engine_heldout | A | sensor_group_recall | 0.5352 | 0.0420 | 0.4878 | 0.5760 |
| engine_heldout | A | sensor_group_f1 | 0.5513 | 0.0324 | 0.5151 | 0.5876 |
| engine_heldout | B | accuracy | 0.3300 | 0.0393 | 0.3021 | 0.3951 |
| engine_heldout | B | macro_f1 | 0.3509 | 0.0427 | 0.3205 | 0.4205 |
| engine_heldout | B | sensor_group_precision | 0.6634 | 0.0637 | 0.6077 | 0.7728 |
| engine_heldout | B | sensor_group_recall | 0.5479 | 0.0841 | 0.4466 | 0.6745 |
| engine_heldout | B | sensor_group_f1 | 0.5945 | 0.0416 | 0.5640 | 0.6659 |

## Per-seed A-to-B changes

| Seed | Protocol | Macro-F1 A | Macro-F1 B | Delta | Sensor-group F1 A | Sensor-group F1 B | Delta |
|---:|---|---:|---:|---:|---:|---:|---:|
| 314159 | scenario_heldout | 0.1761 | 0.3279 | +0.1518 | 0.5517 | 0.5203 | -0.0314 |
| 314159 | engine_heldout | 0.2390 | 0.3254 | +0.0863 | 0.5876 | 0.5661 | -0.0215 |
| 8675309 | scenario_heldout | 0.2279 | 0.3686 | +0.1406 | 0.5242 | 0.5238 | -0.0004 |
| 8675309 | engine_heldout | 0.1945 | 0.3205 | +0.1260 | 0.5576 | 0.5857 | +0.0281 |
| 20261011 | scenario_heldout | 0.2041 | 0.3232 | +0.1191 | 0.5628 | 0.6137 | +0.0509 |
| 20261011 | engine_heldout | 0.2488 | 0.4205 | +0.1717 | 0.5756 | 0.6659 | +0.0903 |
| 1357911 | scenario_heldout | 0.2785 | 0.3693 | +0.0908 | 0.6610 | 0.7112 | +0.0503 |
| 1357911 | engine_heldout | 0.2210 | 0.3637 | +0.1427 | 0.5151 | 0.5908 | +0.0757 |
| 42424243 | scenario_heldout | 0.1563 | 0.3078 | +0.1515 | 0.4779 | 0.6115 | +0.1336 |
| 42424243 | engine_heldout | 0.1998 | 0.3245 | +0.1247 | 0.5206 | 0.5640 | +0.0435 |

## Per-class F1-change consistency

Exact per-seed precision/recall/F1/support for all eight classes are in `per_class_seed_comparison.csv` and per-seed CSVs.

| Protocol | Class | Mean F1 delta | SD | Min | Max | Positive / negative seeds |
|---|---|---:|---:|---:|---:|---:|
| scenario_heldout | combustion_irregularity | +0.0321 | 0.0186 | +0.0062 | +0.0496 | 5 / 0 |
| scenario_heldout | efficiency_degradation | +0.0415 | 0.0712 | -0.0414 | +0.1509 | 4 / 1 |
| scenario_heldout | normal | +0.0227 | 0.0772 | -0.0765 | +0.1403 | 4 / 1 |
| scenario_heldout | sensor_bias | +0.0358 | 0.0598 | -0.0173 | +0.1157 | 3 / 2 |
| scenario_heldout | sensor_drift | +0.0236 | 0.0249 | -0.0037 | +0.0606 | 4 / 1 |
| scenario_heldout | sensor_dropout | +0.2302 | 0.1230 | +0.0468 | +0.3662 | 5 / 0 |
| scenario_heldout | sensor_stuck | +0.5892 | 0.0767 | +0.4648 | +0.6651 | 5 / 0 |
| scenario_heldout | thermal_abnormality | +0.0709 | 0.0540 | -0.0018 | +0.1253 | 4 / 1 |
| engine_heldout | combustion_irregularity | +0.0648 | 0.0258 | +0.0275 | +0.0940 | 5 / 0 |
| engine_heldout | efficiency_degradation | +0.0125 | 0.0648 | -0.0983 | +0.0676 | 4 / 1 |
| engine_heldout | normal | +0.0414 | 0.0358 | -0.0020 | +0.0810 | 4 / 1 |
| engine_heldout | sensor_bias | -0.0052 | 0.0509 | -0.0643 | +0.0523 | 2 / 3 |
| engine_heldout | sensor_drift | +0.0368 | 0.0471 | -0.0080 | +0.0952 | 4 / 1 |
| engine_heldout | sensor_dropout | +0.3181 | 0.1246 | +0.1302 | +0.4405 | 5 / 0 |
| engine_heldout | sensor_stuck | +0.5436 | 0.0883 | +0.4547 | +0.6676 | 5 / 0 |
| engine_heldout | thermal_abnormality | +0.0301 | 0.0428 | -0.0420 | +0.0695 | 4 / 1 |

## Interpretation

- Macro-F1 and accuracy increased from A to B in both protocols for all five seeds; all selected models were Random Forests. This is consistent directional evidence within this simulator, not evidence of statistical significance.
- Sensor-fault-group F1 increased in 3/5 scenario-held-out seeds and 4/5 engine-held-out seeds. The two decreases under scenario-held-out include the larger decrease at seed 314159; the seed-8675309 change was nearly zero. Thus the group-level gain is not fully consistent across seeds and protocols.
- Sensor-stuck and sensor-dropout per-class F1 increased in all five seeds under both protocols. Sensor-bias F1 was mixed (3/5 positive for scenario-held-out, 2/5 for engine-held-out); sensor-drift F1 increased in 4/5 seeds for each protocol, but had a negative case in each. Other classes also have occasional negative F1 changes; see the per-class table.
- The Phase 3B/3C result artifacts document the temporal formulas and validity flags but do not preserve an executable evaluator or a complete ordered temporal-column schema. This Phase 3D evaluator makes the channel and column order explicit while applying those documented formulas. The unavailable historical feature ordering is a reproducibility limitation when comparing these new runs to the two earlier runs; the Phase 3D A/B comparisons themselves use one identical, fixed order for every seed.
- Descriptive averages and SDs do not establish statistical significance. All datasets use the same synthetic equations and assumptions; different seeds do not quantify simulator-model uncertainty or establish real-engine accuracy.

## Evidence and files

- Each `seeds/seed_<seed>/` directory contains normalized metrics, four labelled per-class/confusion CSVs, source/input hashes, and execution evidence. New seeds also contain exact command outputs, config diffs, software versions, and validation/test counts.
- The two failed evaluator attempts for seed 20261011 are retained under `failed_runs/`; the corrected evaluator completed successfully.
- Raw datasets and trained model artifacts are not published; all generated project data remained in temporary folders. The copied parameter register was kept unchanged as static metadata (its seed row remains the base seed); actual run seeds are recorded in each config diff, generated dataset card hash, and result manifest.
- `phase3d_results.json` provides machine-readable metrics, split/raw hashes and source references. `checksums.json` hashes published files except itself.

## Limitations

This is a generic, assumption-driven synthetic simulator. It is not calibrated to a manufacturer or DRDO engine, does not validate real-engine accuracy, and does not support RUL claims.
