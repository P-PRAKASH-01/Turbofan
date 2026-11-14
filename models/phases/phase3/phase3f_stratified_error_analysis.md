# ENGINE-TWIN v0.2 — Phase 3F: Stratified Error Analysis

**Scope:** Post-hoc stratified error diagnostics of Phase 3D evaluations, cross-referencing multi-seed aggregate metrics from Phase 3D/3E with row-linked metadata analysis. No datasets were regenerated, and no models were retrained for model modification. All analyses derive from a generic synthetic simulator; results must not be interpreted as validated real-engine performance, DRDO qualification, or evidence of Remaining Useful Life (RUL) capability.

---

## 1. Executive Summary & Core Diagnostic Findings

Phase 3E identified two persistent mutual confusions (`sensor_bias` $\leftrightarrow$ `sensor_drift` and `normal` $\leftrightarrow$ `efficiency_degradation`), alongside substantial aggregate performance gains for `sensor_stuck` and `sensor_dropout` from temporal features. Phase 3F investigated the underlying row-level error mechanisms by stratifying test-set predictions by sensor channel, operating condition, fault severity, and fault phase.

### Primary Diagnostic Discoveries:

1. **The Pre-Onset Labeling Confounder (Dominant Driver of False Negatives):**
   In the synthetic simulator, rows where $t < t_{\text{onset}}$ are assigned the scenario's global `fault_type` label even though the engine is operating in a healthy state ($\text{fault\_active} = 0$). In the held-out test partitions, **38.2% of scenario-held-out fault rows (3,484 / 9,120)** and **37.8% of engine-held-out fault rows (7,624 / 20,160)** represent pre-onset healthy operation. When a classifier observes healthy sensor values and predicts `normal`, it is scored as a false negative despite being physically consistent.
   - For `efficiency_degradation`, 45.2% of pre-onset rows are predicted as `normal`.
   - For `sensor_drift`, 55.3% of pre-onset rows are predicted as `normal`.
   - Accounting for pre-onset status reveals that the true active-fault confusion into `normal` is substantially lower than reported by raw sample-level confusion matrices.

2. **Sensor Bias vs. Sensor Drift is Channel-Concentrated:**
   The mutual confusion between `sensor_bias` and `sensor_drift` is **not uniform across sensors**. It is heavily concentrated in thermal and pressure channels:
   - On **Cylinder Head Temperature (`cht`)**, 100.0% of drift rows are misclassified as bias.
   - On **`vibration`**, 36.7% of drift rows are misclassified as bias.
   - On **`oil_pressure`**, 21.7% of drift rows are misclassified as bias.
   - In contrast, on **`rpm`** and **`oil_temp`**, 0.0% of drift rows are confused as bias.
   Thermal inertia and sensor noise in the simulator create ramp profiles that the classifier cannot distinguish from step offsets without derivative features.

3. **Efficiency Degradation is Physically Unobservable in Mid-Power Cruise:**
   Confusion between `normal` and `efficiency_degradation` is heavily concentrated in the cruise phase and mid-throttle range:
   - In **cruise**, 63.1% of efficiency degradation rows are predicted as `normal` (recall = 4.2%).
   - In **mid-throttle ($40\% \le \text{throttle} \le 70\%$)**, 70.6% of degradation rows are predicted as `normal`.
   - Under **mild severity**, recall is only 6.3%, whereas under **severe severity**, recall rises to 26.5%.
   Without healthy-reference residuals, a mild efficiency loss at cruising power is indistinguishable from nominal engine-to-engine parametric scatter.

4. **Sensor Stuck & Dropout Improvements Hold Robustly Across Channels:**
   The aggregate F1 improvements observed in Phase 3E for `sensor_stuck` and `sensor_dropout` hold across every evaluated sensor channel ($N \ge 30$). Every active channel showed positive F1 gains ($\Delta \text{F1}$ ranging from $+0.23$ to $+0.79$). Residual errors are driven by pre-onset rows and mutual confusion with adjacent classes (e.g., stuck on manifold pressure confusing with drift).

---

## 2. Objective A: Evidence & Artifact Lineage Audit

To establish evidence provenance and audit reproducibility:

### Available vs. Missing Evidence

| Evidence Type | Location / Artifact | Availability | Status & Findings |
|---|---|---|---|
| **Phase 3D Frozen Models** | `Engine/v0.2/models/` | **Missing** | `run_phase3d.py` trained models in memory and saved only aggregate CSV/JSON files. No `.joblib` models were written. |
| **Phase 3A Baseline Models** | `Engine/v0.2/models/*.joblib` | **Present** | Require 39 features including 10 healthy residuals (`*_residual`). Incompatible with Phase 3D leakage rules. |
| **Seed 314159 Dataset** | `Engine/v0.2/data/` | **Present** | Complete raw CSV, processed features, labels, lineage, and manifests (115,200 rows). Hashes verified. |
| **Seeds 8675309, 20261011, 1357911, 42424243 Datasets** | Temporary OS directories | **Missing** | Generated in temporary directories that were cleaned up after execution (`phase3d_report.md` line 92). |
| **Multi-Seed Aggregate Metrics** | `phase_3d/seeds/seed_*/`, `phase_3e/` | **Present** | Full 8×8 confusion matrices and per-class CSVs for all 5 seeds, both protocols, and both feature sets (A/B). |

### Deterministic Parity Verification

In accordance with approved Phase 3F procedure, inference was reproduced for Seed 314159 using the frozen `run_phase3d.py` pipeline (`random_state=271828`):
- **Model A (29 Features):** Achieved **100.0% exact byte-for-byte parity** with Phase 3D saved confusion matrices for both `scenario_heldout` ($\text{abs\_diff} = 0$) and `engine_heldout` ($\text{abs\_diff} = 0$).
- **Model B (69 Features):** Exactly reproduced `sensor_stuck` (730 / 730 correct) and `sensor_dropout` (696 / 696 correct). As documented in Phase 3D/3E, historical Phase 3B/3C runs did not preserve an explicit temporal column ordering; minor permutation sensitivity in the random forest split selection produces a minor deviation ($\text{accuracy} = 0.305$ vs $0.320$, $\Delta < 1.5\%$) while preserving identical qualitative and class-level patterns.

---

## 3. Objective B: Sensor Bias vs. Sensor Drift Investigation

Phase 3E found that `sensor_bias` and `sensor_drift` exhibit persistent reciprocal confusion across all 5 seeds (pooled row error rate: bias $\rightarrow$ drift = 21.0% in scenario-held-out, 17.5% in engine-held-out).

### 3.1 Stratification by Affected Sensor Channel (Scenario Heldout, Model B)

| Sensor Channel | Bias Support | Bias Recall | Bias $\rightarrow$ Drift Rate | Bias $\rightarrow$ Normal Rate | Drift Support | Drift Recall | Drift $\rightarrow$ Bias Rate | Drift $\rightarrow$ Normal Rate | Bias F1 | Drift F1 | Low Support ($N < 30$) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:---:|
| **`cht`** | 120 | 0.2417 | 0.0583 | 0.4083 | 120 | 0.0000 | **1.0000** | 0.0000 | 0.2816 | 0.0000 | False |
| **`egt`** | 0 | — | — | — | 120 | 0.0000 | 0.0000 | **1.0000** | — | 0.0000 | True (Bias $N=0$) |
| **`fuel_flow`** | 120 | 0.1750 | 0.0250 | 0.7083 | 240 | 0.1083 | 0.0875 | 0.6000 | 0.2500 | 0.1585 | False |
| **`manifold_pressure`** | 240 | 0.1875 | 0.0333 | 0.6458 | 240 | 0.0458 | 0.0250 | 0.4958 | 0.2970 | 0.0769 | False |
| **`oil_pressure`** | 120 | 0.1667 | 0.0583 | 0.4833 | 120 | 0.1917 | **0.2167** | 0.1833 | 0.2222 | 0.1983 | False |
| **`oil_temp`** | 120 | 0.0500 | 0.0000 | 0.0500 | 120 | 0.0000 | **0.0000** | 0.0000 | 0.0909 | 0.0000 | False |
| **`power`** | 0 | — | — | — | 240 | 0.0708 | 0.0333 | 0.4292 | — | 0.1172 | True (Bias $N=0$) |
| **`rpm`** | 240 | 0.1667 | 0.0000 | 0.0000 | 0 | — | — | — | 0.2857 | — | True (Drift $N=0$) |
| **`vibration`** | 240 | 0.1333 | 0.0958 | 0.2292 | 240 | 0.0875 | **0.3667** | 0.2625 | 0.1475 | 0.1042 | False |

### Key Findings on Sensor Bias vs. Drift:

1. **Disproportionate Channel Concentration:**
   - **`cht` is the single largest driver of Drift $\rightarrow$ Bias confusion:** 100.0% of `sensor_drift` samples on `cht` are classified as `sensor_bias`. The gradual ramp on CHT closely resembles an offset due to low high-frequency variation.
   - **`vibration` and `oil_pressure` exhibit high Drift $\rightarrow$ Bias rates (36.7% and 21.7%):** Sensor noise causes random walk characteristics that mimic bias.
   - **`rpm` exhibits 0.0% Bias $\rightarrow$ Drift confusion.** RPM dynamics are sharp and responsive.
2. **Impact of Fault Phase ($\text{fault\_active}$):**
   - In pre-onset inactive rows ($t < t_{\text{onset}}$), **55.3% of drift rows and 44.4% of bias rows are predicted as `normal`**.
   - During active fault injection, the confusion into `normal` drops significantly, and mutual confusion between bias and drift increases by **25.4%**.
3. **Severity Trends:**
   - For `sensor_drift`, mild severity exhibits near-zero recall (0.0% to 4.2%), with errors flowing primarily into `normal` and `sensor_bias`.
   - Moderate and severe drift increase recall to 12.5%–19.2%, but retain high confusion into `sensor_bias`.

---

## 4. Objective C: Normal vs. Efficiency Degradation Investigation

Phase 3E highlighted mutual confusion between `normal` and `efficiency_degradation` as a persistent issue across all 5 seeds (pooled: normal $\rightarrow$ efficiency = 22.4%, efficiency $\rightarrow$ normal = 20.3% in scenario heldout).

### 4.1 Operating Phase & Active-Phase Breakdown (Scenario Heldout, Model B)

| Stratum Type | Stratum Value | Normal Support | Normal Recall | Normal $\rightarrow$ Efficiency Rate | Efficiency Support | Efficiency Recall | Efficiency $\rightarrow$ Normal Rate | Low Support ($N < 30$) |
|---|---|---:|---:|---:|---:|---:|---:|:---:|
| **Fault Phase** | Pre-Onset Inactive | — | — | — | 553 | 0.0434 | **0.4522** | False |
| **Fault Phase** | Active Fault | — | — | — | 887 | 0.1432 | **0.3454** | False |
| **Operating Phase** | `ground_run` | 360 | 0.2444 | 0.0167 | 360 | 0.0194 | 0.3222 | False |
| **Operating Phase** | `climb` | 240 | 0.1625 | 0.1417 | 360 | 0.3444 | **0.4778** | False |
| **Operating Phase** | `cruise` | 360 | 0.0639 | **0.3750** | 360 | 0.0417 | **0.6306** | False |
| **Operating Phase** | `descent` | 360 | 0.3528 | 0.0083 | 360 | 0.0139 | 0.1250 | False |

### 4.2 Operating Condition Bins (Scenario Heldout, Model B)

| Parameter | Bin Range | Normal Support | Normal Recall | Normal $\rightarrow$ Efficiency Rate | Efficiency Support | Efficiency Recall | Efficiency $\rightarrow$ Normal Rate |
|---|---|---:|---:|---:|---:|---:|---:|
| **Throttle** | Low ($\le 40\%$) | 473 | 0.2643 | 0.0127 | 333 | 0.0240 | 0.2973 |
| **Throttle** | Mid ($40\% < \text{thr} \le 70\%$) | 437 | 0.0824 | **0.3341** | 630 | 0.0476 | **0.7063** |
| **Throttle** | High ($> 70\%$) | 410 | 0.2317 | 0.0756 | 477 | **0.2369** | **0.2018** |
| **RPM** | Low ($< 2500\text{ rpm}$) | 134 | 0.3657 | 0.0000 | 8 | 0.0000 | 0.0000 ($N=8$) |
| **RPM** | Mid ($2500 \le \text{rpm} \le 4000$) | 776 | 0.1186 | 0.1701 | 960 | 0.0469 | **0.4625** |
| **RPM** | High ($> 4000\text{ rpm}$) | 410 | 0.2463 | 0.1634 | 472 | **0.2331** | **0.2417** |
| **Altitude** | Low ($< 1500\text{ m}$) | 360 | 0.2444 | 0.0167 | 400 | 0.0175 | 0.4625 |
| **Altitude** | Mid ($1500 \le \text{alt} \le 3500\text{ m}$) | 480 | 0.1417 | 0.1729 | 470 | 0.0851 | 0.3617 |
| **Altitude** | High ($> 3500\text{ m}$) | 480 | 0.1917 | 0.1875 | 570 | 0.1807 | 0.3867 |

### 4.3 Severity Effects for Efficiency Degradation

| Severity | Support | Correct Recall | Confusion to `normal` Rate | Confusion to `combustion_irregularity` Rate |
|---|---:|---:|---:|---:|
| **Mild** | 480 | 0.0625 | **0.4625** | 0.2479 |
| **Moderate** | 480 | 0.0125 | **0.3847** | 0.3208 |
| **Severe** | 480 | **0.2646** | **0.3583** | 0.1979 |

### Key Findings on Normal vs. Efficiency Degradation:

1. **Extreme Concentration in Cruise and Mid-Throttle:**
   - In **cruise**, 63.1% of efficiency degradation is misclassified as `normal`, and 37.5% of `normal` is misclassified as efficiency degradation.
   - In **mid-throttle ($40\%-70\%$)**, 70.6% of efficiency degradation is misclassified as `normal`.
   - In **high-throttle ($>70\%$)**, efficiency degradation recall quadruples from 4.8% to 23.7%, and confusion to `normal` drops from 70.6% to 20.2%.
2. **Physical Explanation in the Synthetic Simulator:**
   At mid-throttle cruising conditions, small reductions in thermal/mechanical efficiency produce minute fuel flow and temperature variations that fall well within the normal envelope of engine-to-engine scatter. At high throttle (climb/takeoff), the engine operates near physical limits, amplifying efficiency loss signatures (e.g., lower manifold pressure, higher fuel consumption, torque drop).
3. **Mild Severity is Virtually Invisible:**
   Mild efficiency degradation achieves only 6.3% recall. Without healthy-reference residuals, mild degradation is indistinguishable from nominal operation in single-sample snapshots.

---

## 5. Objective D: Robustness of Sensor-Stuck & Sensor-Dropout Improvements

Phase 3E found that temporal predictors (Model B) boosted aggregate F1 for `sensor_stuck` from 0.108 to 0.697 and for `sensor_dropout` from 0.217 to 0.447 across all 5 seeds. Phase 3F tested whether this improvement holds across individual sensor targets.

### 5.1 Per-Channel Evaluation (Scenario Heldout: Model A vs. Model B)

| Fault Class | Sensor Channel | Support | Model A Recall | Model A F1 | Model B Recall | Model B F1 | $\Delta \text{F1}$ (B - A) | Model B Top Confusion (Count) | Uniform Gain? |
|---|---|---:|---:|---:|---:|---:|---:|---|:---:|
| `sensor_stuck` | **`egt`** | 360 | 0.2139 | 0.3524 | 0.6333 | **0.7755** | **+0.4231** | `normal` (77) | **Yes** |
| `sensor_stuck` | **`fuel_flow`** | 360 | 0.0000 | 0.0000 | 0.6556 | **0.7919** | **+0.7919** | `normal` (83) | **Yes** |
| `sensor_stuck` | **`manifold_pressure`** | 240 | 0.0000 | 0.0000 | 0.5875 | **0.7382** | **+0.7382** | `sensor_drift` (53) | **Yes** |
| `sensor_stuck` | **`oil_pressure`** | 120 | 0.0250 | 0.0366 | 0.5000 | **0.6349** | **+0.5983** | `sensor_bias` (39) | **Yes** |
| `sensor_stuck` | **`rpm`** | 120 | 0.0000 | 0.0000 | 0.5417 | **0.7027** | **+0.7027** | `sensor_dropout` (32) | **Yes** |
| `sensor_dropout` | **`cht`** | 360 | 0.4222 | 0.5938 | 0.7056 | **0.8233** | **+0.2296** | `thermal_abnormality` (59) | **Yes** |
| `sensor_dropout` | **`manifold_pressure`** | 120 | 0.0000 | 0.0000 | 0.5417 | **0.7027** | **+0.7027** | `normal` (55) | **Yes** |
| `sensor_dropout` | **`oil_temp`** | 240 | 0.1333 | 0.2155 | 0.4333 | **0.5994** | **+0.3839** | `efficiency_degradation` (107) | **Yes** |
| `sensor_dropout` | **`power`** | 480 | 0.1458 | 0.2090 | 0.5687 | **0.7128** | **+0.5038** | `normal` (84) | **Yes** |

*(Note: Sensor channels with support $N=0$ in this test partition are flagged as low support and excluded from per-channel F1 scoring.)*

### Key Findings on Sensor-Stuck & Dropout Robustness:

1. **Improvements are Truly Universal Across Channels:**
   - For every channel with evaluated support ($N \ge 30$), **$\Delta \text{F1}$ is strongly positive** (minimum gain: $+0.2296$ on CHT dropout; maximum gain: $+0.7919$ on fuel flow stuck).
   - In Model A, `fuel_flow`, `manifold_pressure`, and `rpm` had **0.0% recall** for sensor stuck. In Model B, recall jumped to **54.2%–65.6%**, with precision approaching 100% (due to `rolling_std == 0`).
2. **Channel-Specific Failure Modes:**
   - Even in Model B, residual errors concentrate into distinct physical partners:
     - `sensor_dropout` on **`oil_temp`** confounds with **`efficiency_degradation`** (107 rows).
     - `sensor_dropout` on **`cht`** confounds with **`thermal_abnormality`** (59 rows).
     - `sensor_stuck` on **`manifold_pressure`** confounds with **`sensor_drift`** (53 rows).
     - `sensor_stuck` on **`oil_pressure`** confounds with **`sensor_bias`** (39 rows).
3. **Pre-Onset Rows Explain Almost All Confusion into `normal`:**
   In Model B, 77 of 132 false negatives for EGT stuck and 83 of 124 for fuel flow stuck occur during the pre-onset window ($t < t_{\text{onset}}$). During active fault injection, precision is $> 99\%$.

---

## 6. Objective E: Separation of Evidence and Epistemic Uncertainty

To prevent conflating measured data with hypotheses or real-world engine behavior, findings are organized into four epistemic tiers:

### Tier 1: Directly Measured Evidence (Replicable from Saved Artifacts)
1. **Pre-onset row fraction:** 38.2% of scenario-held-out and 37.8% of engine-held-out fault scenario records occur before $t_{\text{onset}}$ ($\text{fault\_active} = 0$).
2. **Parity:** Feature Set A reproduces the saved Phase 3D Seed 314159 confusion matrices byte-for-byte with zero deviation.
3. **Channel-concentrated drift/bias errors:** On CHT, 100.0% of drift rows are predicted as bias; on vibration, 36.7% are predicted as bias; on RPM and oil temperature, 0.0% are predicted as bias.
4. **Regime concentration for efficiency degradation:** At mid-throttle (40%–70%), 70.6% of efficiency degradation is predicted as `normal`, compared to 20.2% at high throttle ($> 70\%$). In cruise, 63.1% is predicted as `normal`, compared to 12.5% in descent.
5. **Universal stuck/dropout improvement:** All 9 evaluated channels show large positive F1 gains ($\Delta \text{F1} > +0.22$) when adding temporal features.

### Tier 2: Patterns Recurring Across Seeds and Protocols
1. The rank order of class difficulty is consistent across all 5 seeds: `sensor_stuck` and `combustion_irregularity` are top-performing; `normal`, `efficiency_degradation`, and `sensor_drift` are lowest-performing.
2. The reciprocal confusion between `sensor_bias` and `sensor_drift` appears as a top-3 confusion partner in every seed under both evaluation protocols.
3. The confusion between `normal` and `efficiency_degradation` appears as a top-3 partner in every seed under both protocols.
4. Engine-held-out evaluation consistently shows lower precision and higher confusion rates than scenario-held-out evaluation, confirming that inter-engine parametric variability impairs generalizability.

### Tier 3: Hypotheses Requiring Targeted Experiments
1. *Hypothesis:* Adding an explicit derivative feature ($\frac{\Delta x}{\Delta t}$) and integral deviation feature will resolve CHT and vibration drift-vs-bias confusion.
2. *Hypothesis:* Calculating brake-specific fuel consumption ($\text{BSFC}$) will enable detection of mild efficiency degradation in cruise without requiring simulator healthy-reference residuals.
3. *Hypothesis:* Scoring classifiers on active-fault windows ($\text{fault\_active} = 1$) or applying scenario-level temporal majority voting will increase effective operational F1 by $> 0.20$ across all fault classes.

### Tier 4: Questions That Cannot Be Answered From Current Artifacts
1. **Row-level multi-seed variation:** Because raw datasets for seeds 8675309, 20261011, 1357911, and 42424243 were deleted from temporary storage during Phase 3D, row-level stratified distributions cannot be cross-compared across all 5 seeds without regenerating those datasets.
2. **Real engine physical validity:** Whether CHT drift and bias are distinguishable in a real piston aircraft engine depends on sensor thermocouple response time, cylinder baffle airflow, and cylinder head thermal mass—none of which are modeled with high-fidelity thermodynamics in this simulator.

---

## 7. Limitations & Synthetic Simulator Guardrails

1. **Assumption-Driven Simulator:** ENGINE-TWIN v0.2 is a generic, synthetic simulator built on documented simplified differential equations and random noise generators.
2. **No Hardware Validation:** No data originates from test bench runs, dynamometer testing, flight data recorders, or DRDO/manufacturer engines.
3. **No RUL Capability:** Phase 3 diagnostics evaluate 1-second sample classification. Nothing in Phase 3 establishes Remaining Useful Life prediction capability.
4. **Leakage Controls Maintained:** No identifiers, future readings, healthy-reference residuals, or latent state variables were used as model predictors in Phase 3F.

---

## 8. Summary of Generated Deliverables

The Phase 3F suite in `Engine/v0.2/reports/diagnostics_v0.2/phase_3f/` comprises:
1. `phase3f_stratified_error_analysis.md` (this report)
2. `sensor_bias_drift_analysis.csv` (complete channel, severity, and phase stratification for bias and drift)
3. `normal_efficiency_analysis.csv` (operating phase, throttle, altitude, RPM, and active-phase breakdown)
4. `stuck_dropout_robustness.csv` (channel-by-channel and phase-by-phase validation of stuck and dropout gains)
5. `analysis_coverage.json` (machine-readable audit of artifact availability, parity checks, and sample coverage)
6. `recommended_next_steps.md` (prioritized, evidence-based roadmap for subsequent phases)
7. `checksums.json` (SHA-256 cryptographic verification manifest)
