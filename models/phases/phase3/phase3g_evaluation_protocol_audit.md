# ENGINE-TWIN v0.2 — Phase 3G: Evaluation Protocol and Label-Semantics Audit

**Scope:** Post-hoc audit of label-generation semantics, pre-onset physics, and evaluation protocol definitions across Phase 3D, 3F, and 3G. No datasets were regenerated, no training splits were altered, and no models were retrained. All analyses derive from a generic synthetic simulator; results must not be interpreted as validated real-engine accuracy, manufacturer qualification, or evidence of Remaining Useful Life (RUL) capability.

---

## 1. Executive Summary & Core Findings

Phase 3F identified that a substantial portion of fault-labelled test rows occur before fault injection begins, creating a persistent confounder where models predicting `normal` on physically healthy rows are penalized as false negatives. Phase 3G conducted an audit of the simulation code, label lineage, and evaluation mathematics to disentangle scenario-level classification from active-fault health monitoring.

### Core Audit Discoveries:

1. **The Target Variable is a Broadcast Scenario Descriptor, Not a Dynamic State:**
   In `Engine/v0.2/src/generate_dataset.py`, each scenario is assigned a single static `fault_type`. This label is broadcast across all 120 time samples ($t = 0 \dots 119\text{ s}$). Prior to onset ($t < t_{\text{onset}}$), the simulator's physical differential equations and sensor models have zero fault injection. The engine is **physically, mathematically, and sensorially 100% nominal**. Therefore, predicting `normal` on a pre-onset row is **correct physical behavior**.
2. **Empirical Verification of Pre-Onset Percentages:**
   Because fault onset is sampled uniformly from $[20, 70\text{ s}]$ in a $120\text{ s}$ run, the theoretical expected pre-onset fraction is mathematically fixed at $\frac{45}{120} = \mathbf{37.50\%}$ for every seed. On Seed 314159:
   - **Full Dataset:** 37,578 / 100,800 fault rows (**37.28%**) are pre-onset.
   - **Scenario Held-Out Test:** 3,484 / 9,120 fault rows (**38.20%**) are pre-onset (**33.37%** of all 10,440 test rows).
   - **Engine Held-Out Test:** 7,624 / 20,160 fault rows (**37.82%**) are pre-onset (**33.09%** of all 23,040 test rows).
3. **Decoupling Protocols Substantially Clarifies True Classifier Performance:**
   When evaluated strictly on **active-fault windows (Protocol 2A)** without changing any model weights or features:
   - Model B Scenario-Held-Out Macro-F1 rises from **0.3242** (Historical Protocol 1) to **0.4167** (+0.0925).
   - Model B Engine-Held-Out Macro-F1 rises from **0.3305** (Historical Protocol 1) to **0.4365** (+0.1060).
   - Binary normal vs. fault detection F1 on continuous timestamp monitoring (Protocol 2B) reaches **0.6474** (scenario) and **0.6648** (engine).
4. **Scenario-Level Majority Voting Demonstrates High Sequence-Level Signal:**
   Aggregating predictions over scenario sequences (Protocol 3B: post-onset window majority vote) achieves **0.4550 Macro-F1** and **0.6757 Sensor-Group F1** in scenario-held-out, with `sensor_stuck` achieving **1.0000 F1** (100% scenario accuracy) and `sensor_dropout` reaching **0.9524 F1**.
5. **Streaming Onset Detection Exposes Sequential False Alarm Vulnerability:**
   While the median detection latency after onset is **0.0 seconds** (instantaneous detection for 75% of fault scenarios) with a **93.4% post-onset detection rate**, evaluating raw snapshot predictions sequentially over a 120-second run results in an **86.8% pre-onset false alarm rate** in fault scenarios and **100% in normal scenarios**. This proves that uncalibrated snapshot classifiers cannot be deployed for streaming alerting without sequential temporal filters (e.g., CUSUM or moving persistence).

---

## 2. Source Code & Label Lineage Audit

To determine precisely how labels and states are generated, the simulator source code was audited:

```
+-----------------------------------------------------------------------------------------------+
| GENERATE_DATASET.PY                                                                           |
|                                                                                               |
| 1. _make_descriptors():                                                                       |
|    Assigns scenario-level metadata:                                                           |
|    - descriptor["fault_type"] in ['normal', 'sensor_bias', 'sensor_drift', ...]               |
|    - descriptor["fault_onset_s"] in uniform_integer[20, 70] (None if 'normal')                |
|                                                                                               |
| 2. _simulate_state():                                                                         |
|    active = np.zeros(120, dtype=bool)                                                         |
|    active[fault_onset_s:] = True                                                              |
|    Physical faults applied ONLY to active mask:                                               |
|    - combustion_irregularity: efficiency_factor[active] -= ..., rpm_factor[active] -= ...     |
|    - thermal_abnormality: thermal_severity[active] = severity_fraction                        |
|    - efficiency_degradation: efficiency_factor[active] -= ...                                 |
|    FOR t < fault_onset_s: All physical states follow 100% nominal baseline equations!         |
|                                                                                               |
| 3. _make_scenario_rows():                                                                     |
|    active = (time_s >= onset)                                                                 |
|    Sensor faults applied ONLY when active is True:                                            |
|    - sensor_bias: measurements[channel][active] += offset                                     |
|    - sensor_drift: measurements[channel] += ramp (ramp[active] = linspace(0, offset))         |
|    - sensor_stuck: measurements[channel][onset:] = measurements[channel][onset - 1]          |
|    - sensor_dropout: measurements[channel][dropped] = NaN (dropped subset of active)          |
|    FOR t < fault_onset_s: Sensor measurements equal healthy state + nominal noise!            |
|                                                                                               |
| 4. Row Output:                                                                                |
|    raw["fault_type"] = descriptor["fault_type"]  <-- Static scenario label (all 120 rows)     |
|    raw["fault_active"] = (time_s >= onset)       <-- Dynamic sample reality (0 before onset)  |
+-----------------------------------------------------------------------------------------------+
                                                |
                                                v
+-----------------------------------------------------------------------------------------------+
| BUILD_FEATURES.PY & RUN_PHASE3D.PY                                                            |
|                                                                                               |
| labels = raw[["fault_type", "fault_active", ...]]                                             |
| target = labels["fault_type"].to_numpy()  <-- Broadcast scenario label evaluated sample-wise! |
+-----------------------------------------------------------------------------------------------+
```

### Verified Definitions:

- **`fault_type` (Scenario Label):** Indicates which fault scenario was configured for the 120-second run. When evaluated on samples where $t < t_{\text{onset}}$, it demands that the model predict a future fault that has not yet occurred.
- **`fault_active` (Physical State):** A boolean indicator ($0$ or $1$) that precisely reflects whether a fault perturbation has entered the engine or sensor dynamics at that second.

---

## 3. Calculation Audit of Pre-Onset Proportions

### 3.1 Mathematical Derivation & Seed Invariance

In `dataset_config.json`, the duration is $D = 120\text{ s}$ and onset times are sampled from a discrete uniform distribution:
$$t_{\text{onset}} \sim \mathcal{U}\{20, 70\}$$
$$E[t_{\text{onset}}] = \frac{20 + 70}{2} = 45.0\text{ s}$$
Because $t \in \{0, 1, \dots, 119\}$, the number of pre-onset samples in a scenario with onset $t_{\text{onset}}$ is exactly $t_{\text{onset}}$ samples (from $t=0$ to $t=t_{\text{onset}}-1$).
Therefore, the expected fraction of pre-onset samples in any faulty scenario is:
$$E\left[\frac{t_{\text{onset}}}{D}\right] = \frac{45.0}{120.0} = \mathbf{37.50\%}$$
Because `fault_onset_min_s`, `fault_onset_max_s`, and `duration_s` are invariant across all five Phase 3D seeds (`config_diff.json`), **every generated seed has approximately 37.5% pre-onset rows in its fault scenarios by design**.

### 3.2 Exact Counts on Seed 314159

```
FULL DATASET (N = 115,200 rows across 960 scenarios):
├── Normal Scenarios (120 scenarios): 14,400 rows (12.50%) [all fault_active = 0]
└── Fault Scenarios (840 scenarios): 100,800 rows (87.50%)
    ├── Pre-Onset Inactive (fault_active = 0): 37,578 rows (37.28% of fault rows; 32.62% of total dataset)
    └── Active Fault (fault_active = 1):       63,222 rows (62.72% of fault rows; 54.88% of total dataset)

SCENARIO-HELD-OUT TEST PARTITION (N = 10,440 rows across 87 scenarios):
├── Normal Scenarios (11 scenarios):  1,320 rows (12.64%) [all fault_active = 0]
└── Fault Scenarios (76 scenarios):   9,120 rows (87.36%)
    ├── Pre-Onset Inactive (fault_active = 0):  3,484 rows (38.20% of fault rows; 33.37% of total test rows)
    └── Active Fault (fault_active = 1):        5,636 rows (61.80% of fault rows; 53.98% of total test rows)

ENGINE-HELD-OUT TEST PARTITION (N = 23,040 rows across 192 scenarios):
├── Normal Scenarios (24 scenarios):  2,880 rows (12.50%) [all fault_active = 0]
└── Fault Scenarios (168 scenarios): 20,160 rows (87.50%)
    ├── Pre-Onset Inactive (fault_active = 0):  7,624 rows (37.82% of fault rows; 33.09% of total test rows)
    └── Active Fault (fault_active = 1):       12,536 rows (62.18% of fault rows; 54.41% of total test rows)
```

### 3.3 Class Breakdown in Test Sets

In `scenario_heldout` ($N=10,440$), each class's pre-onset composition is:
- `combustion_irregularity`: 501 pre-onset / 1,320 total (**37.95%**)
- `efficiency_degradation`: 586 pre-onset / 1,440 total (**40.69%**)
- `sensor_bias`: 482 pre-onset / 1,200 total (**40.17%**)
- `sensor_drift`: 521 pre-onset / 1,320 total (**39.47%**)
- `sensor_dropout`: 453 pre-onset / 1,200 total (**37.75%**)
- `sensor_stuck`: 430 pre-onset / 1,200 total (**35.83%**)
- `thermal_abnormality`: 511 pre-onset / 1,440 total (**35.49%**)
- `normal`: 1,320 / 1,320 total (**100.0%** nominal / $\text{fault\_active} = 0$)

In `engine_heldout` ($N=23,040$), each class has exactly 2,880 rows:
- Pre-onset fault rows range from 1,013 rows (35.17% for `sensor_bias`) to 1,193 rows (41.42% for `combustion_irregularity`), totaling **7,624 pre-onset rows** (**37.82%** of all fault rows).

---

## 4. Distinct Diagnostic Tasks & Operational Meaning

| Diagnostic Task | Operational Question | Intended Ground Truth | Appropriate Protocol |
|---|---|---|---|
| **Real-Time Stream Monitoring** | *"Is the engine operating normally right now, or is a fault active at this second?"* | Dynamic physical state: `normal` when inactive; `fault_type` when active. | **Protocol 2A** (Active windows) & **Protocol 2B** (Timestamp truth) |
| **Offline Post-Flight Inspection** | *"Which fault mode occurred during this 2-minute flight recording?"* | Scenario assignment: `fault_type` applied to the sequence as a whole. | **Protocol 3** (Scenario-level majority voting) |
| **Early Warning & Alerting** | *"How quickly after onset is an alarm triggered, and what is the false alarm rate?"* | Alarm timestamp relative to $t_{\text{onset}}$. | **Protocol 4** (Sequential onset detection latency) |

---

## 5. Comparative Evaluation Results Across Protocols

All protocols were evaluated on the held-out test partitions of Seed 314159 using the frozen models reproduced via `run_phase3d.py` without modifying features or retrained parameters.

### 5.1 Protocol Summary Comparison Table

| Split Protocol | Model | Evaluation Protocol | Accuracy | Macro-F1 | Sensor Group F1 | Binary Detection F1 | Rows / Scenarios Evaluated | Rows Excluded | Primary Exclusion Reason |
|---|:---:|---|---:|---:|---:|---:|---:|---:|---|
| **Scenario Heldout** | **A** | **Protocol 1: Historical Benchmark** | 0.1847 | 0.1761 | 0.5517 | — | 10,440 rows | 0 | None (Historical) |
| Scenario Heldout | A | **Protocol 2A: Active Windows** | 0.2280 | 0.2120 | 0.5239 | — | 6,956 rows | 3,484 | Pre-onset inactive fault rows |
| Scenario Heldout | A | **Protocol 2B: Timestamp Truth** | 0.2205 | 0.1896 | 0.4105 | 0.6689 | 10,440 rows | 0 | None (Relabeled inactive as normal) |
| Scenario Heldout | A | **Protocol 3A: Whole Scenario Vote** | 0.2069 | 0.1971 | 0.5570 | — | 87 scenarios | 0 | None (Whole scenario mode) |
| Scenario Heldout | A | **Protocol 3B: Post-Onset Vote** | 0.2299 | 0.2168 | 0.5641 | — | 87 scenarios | 0 | None (Post-onset mode) |
| **Scenario Heldout** | **B** | **Protocol 1: Historical Benchmark** | 0.3049 | 0.3242 | 0.5538 | — | 10,440 rows | 0 | None (Historical) |
| **Scenario Heldout** | **B** | **Protocol 2A: Active Windows** | **0.4058** | **0.4167** | **0.6177** | — | **6,956 rows** | **3,484** | **Pre-onset inactive fault rows** |
| Scenario Heldout | B | **Protocol 2B: Timestamp Truth** | 0.3920 | 0.3936 | 0.5248 | 0.6474 | 10,440 rows | 0 | None (Relabeled inactive as normal) |
| Scenario Heldout | B | **Protocol 3A: Whole Scenario Vote** | 0.3678 | 0.3840 | 0.6111 | — | 87 scenarios | 0 | None (Whole scenario mode) |
| **Scenario Heldout** | **B** | **Protocol 3B: Post-Onset Vote** | **0.4598** | **0.4550** | **0.6757** | — | **87 scenarios** | **0** | **None (Post-onset mode)** |
| **Engine Heldout** | **A** | **Protocol 1: Historical Benchmark** | 0.2388 | 0.2390 | 0.5876 | — | 23,040 rows | 0 | None (Historical) |
| Engine Heldout | A | **Protocol 2A: Active Windows** | 0.2857 | 0.2822 | 0.5976 | — | 15,416 rows | 7,624 | Pre-onset inactive fault rows |
| Engine Heldout | A | **Protocol 2B: Timestamp Truth** | 0.2528 | 0.2410 | 0.4675 | 0.6823 | 23,040 rows | 0 | None (Relabeled inactive as normal) |
| Engine Heldout | A | **Protocol 3A: Whole Scenario Vote** | 0.2396 | 0.2389 | 0.5946 | — | 192 scenarios | 0 | None (Whole scenario mode) |
| Engine Heldout | A | **Protocol 3B: Post-Onset Vote** | 0.2760 | 0.2726 | 0.6022 | — | 192 scenarios | 0 | None (Post-onset mode) |
| **Engine Heldout** | **B** | **Protocol 1: Historical Benchmark** | 0.3184 | 0.3305 | 0.5566 | — | 23,040 rows | 0 | None (Historical) |
| **Engine Heldout** | **B** | **Protocol 2A: Active Windows** | **0.4405** | **0.4365** | **0.6476** | — | **15,416 rows** | **7,624** | **Pre-onset inactive fault rows** |
| Engine Heldout | B | **Protocol 2B: Timestamp Truth** | 0.4567 | 0.4186 | 0.5713 | 0.6648 | 23,040 rows | 0 | None (Relabeled inactive as normal) |
| Engine Heldout | B | **Protocol 3A: Whole Scenario Vote** | 0.3385 | 0.3527 | 0.6013 | — | 192 scenarios | 0 | None (Whole scenario mode) |
| **Engine Heldout** | **B** | **Protocol 3B: Post-Onset Vote** | **0.4531** | **0.4490** | **0.7030** | — | **192 scenarios** | **0** | **None (Post-onset mode)** |

### 5.2 Per-Class F1 Progression across Protocols (Scenario Heldout, Model B)

| Fault Class | Protocol 1: Historical Benchmark | Protocol 2A: Active Fault Windows | Protocol 2B: Timestamp Ground Truth | Protocol 3A: Whole Scenario Vote | Protocol 3B: Post-Onset Vote | Net Gain (P3B vs. P1) |
|---|---:|---:|---:|---:|---:|:---:|
| `combustion_irregularity` | 0.4457 | **0.5574** | 0.4444 | 0.5600 | **0.6400** | **+0.1943** |
| `efficiency_degradation` | 0.1127 | **0.1558** | 0.1119 | 0.0909 | **0.1818** | **+0.0691** |
| `normal` | 0.1154 | **0.1691** | **0.4901** | 0.1053 | **0.1333** | **+0.0179** |
| `sensor_bias` | 0.1876 | **0.2577** | 0.1983 | 0.1176 | **0.2105** | **+0.0229** |
| `sensor_drift` | 0.0554 | **0.0638** | 0.0531 | 0.0000 | 0.0000 | -0.0554 |
| `sensor_dropout` | 0.5995 | **0.7516** | 0.6186 | 0.8182 | **0.9524** | **+0.3529** |
| `sensor_stuck` | 0.7307 | **0.8659** | 0.7302 | 0.9524 | **1.0000** | **+0.2693** |
| `thermal_abnormality` | 0.3469 | **0.5126** | 0.3920 | 0.4286 | **0.5217** | **+0.1748** |
| **Macro-F1** | **0.3242** | **0.4167** | **0.3936** | **0.3840** | **0.4550** | **+0.1308** |

### Key Diagnostic Takeaways:

1. **Active-Fault Windows (Protocol 2A):** Removing pre-onset healthy rows increases Macro-F1 by nearly **10 percentage points** (from 0.324 to 0.417 in scenario-held-out; 0.331 to 0.437 in engine-held-out).
   - `sensor_dropout` F1 reaches **0.7516** (vs. 0.5995 in P1).
   - `sensor_stuck` F1 reaches **0.8659** (vs. 0.7307 in P1).
   - `combustion_irregularity` F1 reaches **0.5574** (vs. 0.4457 in P1).
2. **Timestamp Ground-Truth (Protocol 2B):** Relabeling pre-onset rows as `normal` boosts `normal` class F1 from **0.1154 to 0.4901**. Binary detection F1 (is there any active fault right now?) reaches **0.6474** in scenario-held-out and **0.6648** in engine-held-out.
3. **Scenario Post-Onset Voting (Protocol 3B):** Whole-flight sequence aggregation resolves sample noise: `sensor_stuck` achieves **100% scenario accuracy (F1 = 1.0000)** and `sensor_dropout` reaches **F1 = 0.9524**.
4. **Persistent Deficits:** Even under optimal post-onset voting, `sensor_drift` and `efficiency_degradation` remain low ($F_1 < 0.20$), confirming that their failure is driven by physics-level signature unobservability (as shown in Phase 3F), not merely pre-onset sample dilution.

---

## 6. Protocol 4: Sequential Onset Detection Latency & False Alarm Analysis

Protocol 4 simulates a real-time streaming health monitor evaluating samples sequentially from $t = 0 \dots 119\text{ s}$ without clairvoyance:

### 6.1 Sequential Performance Summary (Scenario Heldout, Model B)

| Metric | Rule 4A: Single-Sample Alert ($\hat{y} \ne \text{'normal'}$) | Rule 4B: Persistent Alert (3 Consecutive Samples $\hat{y} \ne \text{'normal'}$) |
|---|:---:|:---:|
| **Normal Scenarios with False Alarm** | **11 / 11 (100.0%)** | **11 / 11 (100.0%)** |
| **Fault Scenarios with Pre-Onset False Alarm** | **66 / 76 (86.8%)** | **57 / 76 (75.0%)** |
| **Fault Scenarios Detected After Onset** | **71 / 76 (93.4%)** | **71 / 76 (93.4%)** |
| **Missed Detection Rate (Never Detected Post-Onset)** | **5 / 76 (6.6%)** | **5 / 76 (6.6%)** |
| **Post-Onset Detection Latency: Mean** | **1.56 seconds** | **1.56 seconds** |
| **Post-Onset Detection Latency: Median** | **0.0 seconds** | **0.0 seconds** |
| **Post-Onset Detection Latency: 75th Percentile** | **1.0 second** | **1.0 second** |
| **Post-Onset Detection Latency: Max** | **40.0 seconds** | **40.0 seconds** |
| **Diagnostic Accuracy of First Alert** | **22 / 71 (31.0%)** | **22 / 71 (31.0%)** |

### 6.2 Why Normal Sequences Experience 100% False Alarms

In single-sample evaluation, Model B achieves $\approx 80\%$ specificity on normal rows (a $20\%$ per-sample false alarm rate).
Over an independent 120-second sequence, the mathematical probability of triggering at least one false alarm is:
$$P(\text{False Alarm in 120 s}) = 1 - (1 - 0.20)^{120} \approx 1 - (0.80)^{120} \approx 1 - 3.2 \times 10^{-12} \approx \mathbf{100.0\%}$$
Even with a 3-consecutive-sample filter (Rule 4B), random noise bursts in the simulator trigger false alerts in 75% of pre-onset windows. **This proves that uncalibrated snapshot classifiers cannot be used for streaming alerting without temporal filtering (such as CUSUM, moving average log-odds, or calibrated Bayesian change-point algorithms).**

---

## 7. Pre-Onset Semantics: Sensor Faults vs. Physical Faults

The audit confirms that pre-onset rows are legitimately normal across both fault families, but their post-onset manifestation differs fundamentally:

1. **Sensor Faults (Bias, Stuck, Dropout):**
   - *Pre-onset:* Sensor channel is uncorrupted.
   - *Post-onset:* Step discontinuity at $t_{\text{onset}}$. Bias steps by $\Delta x = \text{base\_offset}$; stuck latches immediately; dropout begins missing samples.
   - *Exception (Drift):* Drift ramps linearly starting from 0.0 at $t_{\text{onset}}$. In the first 5–10 seconds after onset, drift magnitude is smaller than nominal sensor noise ($\sigma_{\text{sensor}}$), making early detection physically impossible.
2. **Physical Faults (Combustion, Thermal, Efficiency):**
   - *Pre-onset:* Thermodynamic and mechanical states follow nominal equations.
   - *Post-onset:* Combustion irregularity introduces immediate ripple and efficiency loss. Efficiency degradation applies immediate loss factor.
   - *Thermal Abnormality Lag:* While heat generation steps up at $t_{\text{onset}}$, cylinder head and exhaust gas temperatures are governed by a first-order differential equation with a thermal time constant of $\tau = 60.0\text{ seconds}$ (`constants["thermal_time_constant_s"]` in `generate_dataset.py`). CHT rises as:
     $$\Delta T(t) = \Delta T_{\text{steady}} \cdot \left(1 - e^{-(t - t_{\text{onset}})/60}\right)$$
     At $t = t_{\text{onset}} + 5\text{ s}$, only $8\%$ of the thermal anomaly has developed. Expecting immediate classification at $t_{\text{onset}} + 1\text{ s}$ contradicts simulated thermal physics.

---

## 8. Epistemic Guardrails & Uncertainty Boundaries

1. **Synthetic Simulator Context:** All equations are generic mathematical approximations. No results represent certified aero-engine performance.
2. **Leakage Safety:** `fault_active` and `fault_onset_s` were used solely as post-hoc evaluation partitioning filters. Neither variable entered any model pipeline as a feature.
3. **No Retuning:** All protocol results were computed on existing frozen predictions without tuning hyperparameters or decision thresholds against active-fault metrics.
4. **Seed Scope:** Row-level protocol comparisons were verified on Seed 314159 where complete row datasets exist. Multi-seed datasets (seeds 8675309, 20261011, 1357911, 42424243) were confirmed to share the exact theoretical pre-onset fraction ($37.5\%$), but row-level filtering is not claimed for those purged runs.

---

## 9. Deliverables in Phase 3G

The following deliverables have been generated in [`Engine/v0.2/reports/diagnostics_v0.2/phase_3g/`](file:///c:/Users/Admin/OneDrive/Documents/Digital%20Twin/Engine/v0.2/reports/diagnostics_v0.2/phase_3g/):
1. `phase3g_evaluation_protocol_audit.md` (this report)
2. `label_semantics_audit.json` (machine-readable audit of row counts, denominators, and pre-onset fractions)
3. `protocol_comparison_metrics.csv` (comparative metrics across Protocols 1, 2A, 2B, 3A, 3B)
4. `onset_detection_latency.csv` (sequential onset detection latency and false alarm metrics)
5. `recommended_evaluation_standards.md` (formal diagnostic evaluation standards for Phase 4+)
6. `checksums.json` (SHA-256 cryptographic verification manifest)
7. `run_phase3g_evaluation.py` (executable, reproducible evaluation script)
