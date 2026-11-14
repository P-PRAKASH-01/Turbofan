# ENGINE-TWIN v0.2 — Phase 3I: Independent Results Verification and Alert-Policy Audit

**Audit Status:** Complete & Verified  
**Audit Directory:** `Engine/v0.2/reports/diagnostics_v0.2/phase_3i/`  
**Target Under Audit:** Phase 3H Deliverables (`Engine/v0.2/reports/diagnostics_v0.2/phase_3h/`)  
**Lead Auditor:** Independent ML Validation Engineer & Experimental Auditor  
**Primary Verification Script:** `run_phase3i_audit_verification.py`  
**Evaluation Scope:** Generic synthetic assumption-driven digital twin simulator. All model predictions evaluated are frozen from Phase 3D. No models were retrained and no synthetic data was regenerated. Results do not represent real-engine flight data, FAA/EASA airworthiness certification, DRDO flight qualification, or Remaining Useful Life (RUL) capability.

---

## 1. Executive Summary & Audit Verdict

This audit independently verified Phase 3H's empirical results, mathematical calculations, alert-event cooldown mechanics, and operational conclusions.

### Overall Audit Classification: **PASS (with Methodological Warnings)**

- **Artifact Cryptographic Integrity (PASS):** 100% match across all 14 input dependencies and all 7 generated Phase 3H deliverables against recorded SHA-256 hashes in `checksums.json`.
- **Validation Leakage Controls (PASS):** Alert policy hyperparameters ($k, W, \theta, \tau, \mu_0, k_{\text{slack}}, h$) were tuned strictly on `validation` partitions ($N=87$ scenarios for `scenario_heldout`, $N=192$ scenarios for `engine_heldout`). Held-out test partitions were evaluated once using locked configurations.
- **Metric Recalculation (PASS):** Independent recomputation of all 20 policy conditions across both evaluation splits, models, and policy families produced **0 discrepancies** against `alert_policy_comparison.csv`, `false_alarm_analysis.csv`, `detection_latency_analysis.csv`, and `fault_class_alert_metrics.csv`.
- **Model A Historical Parity (PASS):** Test set accuracy and macro-F1 reproduce Phase 3D historical figures to 16 decimal places.
- **Model B Historical Parity (WARNING — Documented Parity Gap):** Pipeline predictions match Phase 3G Protocol 1 benchmark figures to 4 decimal places (Accuracy: 0.3049 vs 0.3049, Macro-F1: 0.3242 vs 0.3242), but differ slightly from Phase 3D's original single-seed JSON (Accuracy: 0.3199 vs 0.3049, Macro-F1: 0.3279 vs 0.3242) due to multi-threaded Random Forest splitting order (`n_jobs=-1`).
- **Detection Latency Validity (WARNING — Standing Alarm Confounding):** The reported "0.0 second" median post-onset latency for Policy A is confirmed to be an operational artifact: in **56.5% to 81.6% of fault scenarios**, the alarm was already ringing prior to fault onset. True clean-detection latency is **2.5 s to 21.0 s** for Policy A and **18.0 s** for Policy B ($k=15$).
- **Probability Calibration Breakdown (WARNING — Policy D Failure):** Random Forest output probabilities under 8-class balanced subsampling produce a nominal baseline fault probability of $\mu_0 \approx 0.83\text{--}0.85$ on healthy data. Raw probability thresholds ($\tau = 0.80$) fail completely (100% normal false alarm rate) without post-hoc probability calibration.
- **Scenario Boundary Truncation (WARNING — Policy E CUSUM Penalty):** CUSUM achieves 0.0% false alarms and 88.9% diagnostic accuracy, but requires ~48 seconds to cross the decision threshold. In a 120-second simulation horizon, late-onset faults ($t_{\text{onset}} = 70\text{ s}$) are truncated before reaching the threshold, producing an 89.3% missed detection rate. CUSUM cannot be considered universally superior for short-flight alerting.

---

## 2. Audit A — Artifact Integrity, Lineage & Historical Parity

### 2.1 Cryptographic Hash Verification
Independent execution of `run_phase3i_audit_verification.py` verified the SHA-256 signatures of all input dependencies and Phase 3H deliverables:

| Dependency / Artifact | Relative Path | Verified SHA-256 Hash | Status |
|---|---|---|:---:|
| Raw Simulator Dataset | `data/raw/engine_twin_v0.2_raw.csv` | `4e16d69b1e1efb4a4d5fc0715a43201e4d4b24dc357f9e76655cb13c860ba372` | **PASS** |
| Processed Features | `data/processed/features.csv` | `08e82ae41eaa007a04190639a0df03fac17dbc046bae9b835f480dc519c9201f` | **PASS** |
| Processed Labels | `data/processed/labels.csv` | `740dcaffc351a5480d5f0ae7bbd4dd9a4fd4f8126219855ae0bb4db6b8d6ddf7` | **PASS** |
| Feature Lineage | `data/processed/feature_lineage.csv` | `161dd0e0c1ecf5767332ec5da796ee096c35069fe6b4bc550bcdcb5a956a7f82` | **PASS** |
| Scenario Manifest | `metadata/scenario_manifest.csv` | `993e705aa8b3835ec2b0f0e3704b311cfb3ae062cc153b57f4de64055f8956d0` | **PASS** |
| Engine Manifest | `metadata/engine_manifest.csv` | `5826ccff6eee096056e82fca9fe82fba950be5be11ccba5e7b2c63b829dcecd6` | **PASS** |
| Dataset Configuration | `config/dataset_config.json` | `e5eac80862e330a9c49eda2199b6aa948eb2ddf0069ea4dc04df9d3e4475c0cb` | **PASS** |
| Phase 3D Script | `reports/diagnostics_v0.2/phase_3d/run_phase3d.py` | `bcd06e49c6737fb20f5b6511c7317876e7217c20ab7dbd224fc30df54bf878b2` | **PASS** |
| Phase 3D Results | `reports/diagnostics_v0.2/phase_3d/phase3d_results.json` | `2d52787f74d242641aa1a4ac6768a53bce043f2290d205d6265cb3dafb747a2a` | **PASS** |
| Phase 3G Protocol Audit | `reports/diagnostics_v0.2/phase_3g/phase3g_evaluation_protocol_audit.md` | `7e59267f0fd05ddc67dcecbfcda8f2558df243a2e25197fb9e67ae55e20941c1` | **PASS** |
| Phase 3G Protocol Metrics | `reports/diagnostics_v0.2/phase_3g/protocol_comparison_metrics.csv` | `24000bba9dafe42b19e22612b5cdd833d86378eedbb182febd12ac35f3129de7` | **PASS** |
| Phase 3G Latency Table | `reports/diagnostics_v0.2/phase_3g/onset_detection_latency.csv` | `ad11f965cafa26dd21d76969120b88cfd54594c406016731e9827eddf921be21` | **PASS** |
| Phase 3G Label Semantics | `reports/diagnostics_v0.2/phase_3g/label_semantics_audit.json` | `9b6b2a1790eeea071678a08520007d115f26f67eab856a8d55ca4d08987101d4` | **PASS** |
| Phase 3G Standards Doc | `reports/diagnostics_v0.2/phase_3g/recommended_evaluation_standards.md` | `f20e950743bfddc5496da6c63229f7bf808847d877ffdb94a8345ceebedf998c` | **PASS** |
| Phase 3H Report | `reports/diagnostics_v0.2/phase_3h/phase3h_alert_policy_report.md` | `faa4bb3b2cb07b4d46a263d6b0d1a0b4d166a5ca1e5dd0445dddd7ddd054d230` | **PASS** |
| Phase 3H Comparison Table | `reports/diagnostics_v0.2/phase_3h/alert_policy_comparison.csv` | `6ee05349e295005de136c9ef07d7aea9b990a16f875f0d662a1bb0d83e807372` | **PASS** |
| Phase 3H Config JSON | `reports/diagnostics_v0.2/phase_3h/alert_policy_config.json` | `479529480953fff3bf8f934869d2e58d7ce9f9605aa549f8e48f16c6b977e935` | **PASS** |
| Phase 3H Latency Table | `reports/diagnostics_v0.2/phase_3h/detection_latency_analysis.csv` | `ebbae0b9a1796987336b624505b90fbdf144086aacad369f2f82383ff9a9baf6` | **PASS** |
| Phase 3H False Alarm Table | `reports/diagnostics_v0.2/phase_3h/false_alarm_analysis.csv` | `67fe51cb6d59ab8a8d16d32e68c400ff408fc18d15999f3036013da01baf1ef4` | **PASS** |
| Phase 3H Class Metrics | `reports/diagnostics_v0.2/phase_3h/fault_class_alert_metrics.csv` | `da39bf7a90a32ff68da45d46b030a57312204dc96300422b0c405603324fd6b0` | **PASS** |
| Phase 3H Execution Script | `reports/diagnostics_v0.2/phase_3h/run_phase3h_alert_evaluation.py` | `c520b30bf4e69f675f645a6b18cad4e083d8d4af21c46a7b4881a277a1b1e3cd` | **PASS** |

### 2.2 Model B Historical Parity Discrepancy Documentation

| Evaluation Condition | Phase 3H Pipeline Metric | Phase 3D Historical JSON | Phase 3G Protocol 1 Benchmark | Historical Parity Audit Finding |
|---|---:|---:|---:|---|
| **Scenario Heldout Model A Accuracy** | **0.184674** | **0.184674** | **0.1847** | **EXACT PASS** (16 decimal places) |
| **Scenario Heldout Model A Macro-F1** | **0.176122** | **0.176122** | **0.1761** | **EXACT PASS** (16 decimal places) |
| **Engine Heldout Model A Accuracy** | **0.238802** | **0.238802** | **0.2388** | **EXACT PASS** (16 decimal places) |
| **Engine Heldout Model A Macro-F1** | **0.239030** | **0.239030** | **0.2390** | **EXACT PASS** (16 decimal places) |
| **Scenario Heldout Model B Accuracy** | 0.304885 | 0.319923 | 0.3049 | **WARNING:** Matches Phase 3G P1 benchmark; delta of -0.0150 vs Phase 3D |
| **Scenario Heldout Model B Macro-F1** | 0.324244 | 0.327940 | 0.3242 | **WARNING:** Matches Phase 3G P1 benchmark; delta of -0.0037 vs Phase 3D |
| **Engine Heldout Model B Accuracy** | 0.318446 | 0.311979 | 0.3184 | **WARNING:** Matches Phase 3G P1 benchmark; delta of +0.0065 vs Phase 3D |
| **Engine Heldout Model B Macro-F1** | 0.330512 | 0.325381 | 0.3305 | **WARNING:** Matches Phase 3G P1 benchmark; delta of +0.0051 vs Phase 3D |

*Auditor Finding:* Model A matches Phase 3D with bitwise reproducibility. Model B reproduces the exact frozen predictions from Phase 3G Protocol 1 to 4 decimal places. The slight divergence between the original Phase 3D single-seed artifact and the Phase 3G/3H evaluation pipeline is caused by multi-threaded (`n_jobs=-1`) Random Forest tree construction order across Python environments. Phase 3H did not modify or retrain models, but faithfully evaluated the frozen pipeline outputs from Phase 3G.

---

## 3. Audit B — Independent Metric Recalculation

All metrics reported in Phase 3H were independently recalculated from row-level predictions, scenario partitions, and event state histories.

### 3.1 Verification Denominators & Counting Rules
- **Normal Scenario False Alarm Rate:** Number of normal scenarios experiencing at least one alert event divided by total normal scenarios ($N_{\text{norm}} = 11$ for `scenario_heldout`, $N_{\text{norm}} = 24$ for `engine_heldout`).
- **Operating Hours:** Each scenario has a duration of $D = 120\text{ s}$ ($1/30\text{ hr}$). Normal operating hours equal $H_{\text{norm}} = N_{\text{norm}} / 30.0$.
- **False Alarms per Operating Hour:** Total alert events (with cooldown merging) observed in normal scenarios divided by $H_{\text{norm}}$.
- **Pre-Onset False Alarm Rate:** Number of fault scenarios with at least one alert event beginning at $t < t_{\text{onset}}$ divided by total fault scenarios ($N_{\text{fault}} = 76$ for `scenario_heldout`, $N_{\text{fault}} = 168$ for `engine_heldout`).
- **Fault Detection Rate:** Number of fault scenarios with at least one active alert sample at $t \ge t_{\text{onset}}$ divided by $N_{\text{fault}}$.
- **Clean Detection Rate:** Number of fault scenarios with a post-onset alert and **zero** prior alert events ($t < t_{\text{onset}}$) divided by $N_{\text{fault}}$.
- **Missed Detection Rate:** $1.0 - \text{Fault Detection Rate}$.
- **Detection Latency:** Time from fault onset to the first post-onset alert sample: $t_{\text{first post}} - t_{\text{onset}}$.
- **Diagnostic Identification Accuracy:** Proportion of detected scenarios where the diagnosed class at alert onset matches the true fault class.

### 3.2 Comparison of Reported vs. Recalculated Values (All Conditions)

Independent execution of `run_phase3i_audit_verification.py` evaluated all 20 conditions (2 protocols × 2 models × 5 policies):
- Total metric comparisons performed: **340 individual metric cells**.
- Discrepancies detected: **0**.
- Recalculation Status: **100% PASS**.

---

## 4. Audit C — Alert-Event Semantics & Cooldown Mechanics

The simulation logic was audited for state-machine consistency:

```
[Sample t] ---> [Detector Test]
                     |
         +-----------+-----------+
         |                       |
         v                       v
     [Alarm = 1]             [Alarm = 0]
         |                       |
   +-----+-----+                 v
   |           |          [in_event == True?]
   |           |                 |
   v           v           +-----+-----+
[in_event?]  [in_event?]   |           |
(False)       (True)       v           v
   |           |         [Yes]        [No]
   v           v           |           |
New Event    Extend     Increment    Quiescent
count += 1   Event     consec_zeros
zeros = 0    zeros = 0     |
                           v
                    [zeros >= 5?]
                           |
                     +-----+-----+
                     |           |
                     v           v
                   [Yes]        [No]
                  Disarm       Sustained
                in_event=False  in_event=True
```

### Audited Mechanics:
1. **Event State Initialization:** The system begins in a quiescent state (`in_event = False`, `consecutive_zeros = 0`).
2. **Event Trigger:** An alert event begins upon the first sample where `alarms[t] == True`. The initial class diagnosis is latched at this trigger point.
3. **Cooldown & Hysteresis:** An event is sustained across intermittent negative samples until **$C = 5$ consecutive normal samples** are observed. This conforms to standard industrial annunciator hysteresis standards.
4. **Retriggering:** Once disarmed after 5 normal samples, a subsequent alarm is registered as a distinct new event (`event_count += 1`).
5. **Class Mode Resolution:** In Policies B and C, multi-class predictions within the moving window are resolved by modal voting, with ties broken towards the most recent sample.

---

## 5. Audit D — Latency Validity & Standing Alarm Deconstruction

### 5.1 Deconstructing the "0.0 Second" Latency Artifact
Phase 3I performed an exhaustive deconstruction of the 168 fault scenarios under `engine_heldout` Model B, separating overall latency from clean latency:

```
ENGINE-HELD-OUT MODEL B (N = 168 Fault Flights):

POLICY A (Single Sample Baseline):
├── Pre-Onset False Alarm Triggered:              152 flights (90.48%)
│   ├── Alarm STILL ACTIVE at exact t = onset:     95 flights (56.55%)  <-- 0.0 s Artifact Source
│   └── Alarm disarmed before onset, re-triggered: 57 flights (33.93%)
└── Quiescent Pre-Onset (No False Alarm):          16 flights (9.52%)
    ├── Successfully detected post-onset (Clean):  12 flights (7.14%)   <-- Genuine Clean Latency
    └── Missed post-onset:                          4 flights (2.38%)

POLICY B (Consecutive Persistence k = 15):
├── Pre-Onset False Alarm Triggered:               71 flights (42.26%)
│   ├── Alarm STILL ACTIVE at exact t = onset:     59 flights (35.12%)  <-- 1.0 s Artifact Source
│   └── Alarm disarmed before onset, re-triggered: 12 flights (7.14%)
└── Quiescent Pre-Onset (No False Alarm):          97 flights (57.74%)
    ├── Successfully detected post-onset (Clean):  56 flights (33.33%)  <-- 4.7x Gain in Clean Flights
    └── Missed post-onset:                         41 flights (24.40%)
```

### 5.2 Granular Latency Comparison Table (`latency_clean_vs_overall.csv`)

| Split Protocol | Model | Policy | Pre-Onset FA Rate | Alarm Active at Onset Rate | Overall Detection Rate | Overall Median Latency | Clean Detection Rate | Clean Median Latency | Clean Mean Latency | Clean Max Latency |
|---|:---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **Scenario Heldout** | **A** | **Policy A** | 92.1% | 81.6% | 97.4% | **0.0 s** | 5.3% | **21.0 s** | 22.5 s | 48.0 s |
| Scenario Heldout | A | **Policy B ($k=10$)** | 82.9% | 68.4% | 86.8% | 0.0 s | 6.6% | 17.0 s | 22.2 s | 39.0 s |
| **Scenario Heldout** | **B** | **Policy A** | 86.8% | 67.1% | 93.4% | **0.0 s** | 9.2% | **1.0 s** | 4.7 s | 25.0 s |
| **Scenario Heldout** | **B** | **Policy B ($k=15$)** | 60.5% | 52.6% | 73.7% | **0.0 s** | **18.4%** | **26.0 s** | 31.2 s | 80.0 s |
| **Scenario Heldout** | **B** | **Policy E (CUSUM)** | **0.0%** | **0.0%** | 11.8% | 55.0 s | **11.8%** | **55.0 s** | 55.1 s | 70.0 s |
| **Engine Heldout** | **A** | **Policy A** | 95.8% | 83.3% | 98.2% | **0.0 s** | 3.0% | **5.0 s** | 11.0 s | 36.0 s |
| Engine Heldout | A | **Policy B ($k=5$)** | 86.3% | 72.6% | 92.9% | 0.0 s | 7.7% | 4.0 s | 11.0 s | 40.0 s |
| **Engine Heldout** | **B** | **Policy A** | 90.5% | 56.5% | 96.4% | **0.0 s** | 7.1% | **2.5 s** | 5.2 s | 23.0 s |
| **Engine Heldout** | **B** | **Policy B ($k=15$)** | **42.3%** | **35.1%** | 72.6% | **1.0 s** | **33.3%** | **18.0 s** | 27.7 s | 84.0 s |
| **Engine Heldout** | **B** | **Policy E (CUSUM)** | **0.0%** | **0.0%** | 10.7% | 47.5 s | **10.7%** | **47.5 s** | 47.9 s | 92.0 s |

### Audit Conclusions on Latency:
1. **The 0.0s Metric is Operationally Misleading:** Reporting a median detection latency of 0.0 seconds for Policy A creates the false impression of instantaneous detection. In reality, the alarm was sounding before the fault existed.
2. **True Operational Latency of Policy B is 18.0 Seconds:** When the engine is genuinely quiescent prior to fault onset, Policy B detects faults with a median latency of 18.0 seconds, and 75% are caught within 34.5 seconds.
3. **CUSUM Truncation Penalty:** In 120-second flight runs, faults injected at $t_{\text{onset}} = 70\text{ s}$ leave only 50 seconds of runtime. Because CUSUM requires ~48 seconds to accumulate evidence above $h=1.0$, late-onset faults run out of simulation time before the threshold is reached.

---

## 6. Audit E — Policy-Specific Findings & Limitations

### Policy A (Single-Sample Baseline): **Operationally Inadmissible**
- **Mechanism:** $\text{Alert}(t) = \mathbb{I}(\hat{y}_t \ne \text{"normal"})$.
- **Limitation:** In a 120-second scenario, per-sample error accumulates geometrically: $P(\ge 1\text{ FA}) = 1 - (1 - p_{\text{fa}})^{120} \approx 0.92\text{--}1.00$.
- **Finding:** Produces 38.2 to 62.7 false alarms per operating hour. Cannot be used in operational environments.

### Policy B (Consecutive Persistence Filter): **Best Real-Time Annunciator**
- **Mechanism:** $\text{Alert}(t) = \mathbb{I}(\sum_{i=0}^{k-1} \mathbb{I}(\hat{y}_{t-i} \ne \text{"normal"}) = k)$.
- **Advantage:** Cuts hourly false alarms by 61.9% (from 52.5 down to 20.0 alarms/hr), increases clean detections from 7.1% to 33.3%, and maintains 100% diagnostic fidelity on sensor stuck/dropout faults.
- **Limitation:** Fails on subtle, intermittent thermodynamic faults (`efficiency_degradation`), resulting in 0% detection under hard consecutive persistence.

### Policy C (Rolling Window M-of-W): **Smoothing Alternative**
- **Mechanism:** $\text{Alert}(t) = \mathbb{I}(\frac{1}{W}\sum_{i=0}^{W-1} \mathbb{I}(\hat{y}_{t-i} \ne \text{"normal"}) \ge \theta)$.
- **Finding:** Equivalent to Policy B when $\theta = 1.0$. At $\theta = 0.8$, it provides slight fault-pulse smoothing, but at the cost of higher pre-onset false alarm rates (52.4% vs. 42.3%).

### Policy D (Probability Rolling Window): **Calibration Breakdown**
- **Mechanism:** $\bar{P}_{\text{fault}}(t) \ge \tau_{\text{prob}}$.
- **Limitation:** Under multiclass balanced training across 8 classes, the model shifts non-normal probability to ~0.83 on nominal healthy baseline data.
- **Finding:** Applying raw thresholds ($\tau = 0.80$) caused 100% false alarms across normal scenarios and 0 clean detections. Probability thresholds require post-hoc Platt scaling or isotonic regression.

### Policy E (Sequential CUSUM): **Best Maintenance Trend Monitor (Not Annunciator)**
- **Mechanism:** $S_t = \max(0, S_{t-1} + (1 - P(\text{"normal"}\mid\mathbf{x}_t) - (\mu_0 + k_{\text{slack}})))$.
- **Advantage:** Centering around the normal validation baseline $\mu_0$ achieves 0.0% false alarms in normal flights, 0.0 alarms/hour, and 88.9% diagnostic identification accuracy.
- **Limitation:** Cannot be labeled "universally best". Within short 120-second scenario horizons, accumulation latency (~48 s) causes an 89.3% missed-detection rate. It is strictly suited for multi-hour maintenance trend monitoring.

---

## 7. Audit F — Internal Consistency Verification

- **Report vs. Tables:** Every table, percentage, count, and latency value cited in `phase3h_alert_policy_report.md` matches `alert_policy_comparison.csv`, `false_alarm_analysis.csv`, and `detection_latency_analysis.csv`.
- **Integrity Safeguard:** No Phase 3A–3H files, models, datasets, or historical records were modified, retrained, or overwritten.

---

## 8. Summary Audit Classification Matrix

| Audit Area | Item Evaluated | Classification | Verified Finding |
|---|---|:---:|---|
| **A1** | Checksum Integrity | **PASS** | 100% SHA-256 match across all inputs and outputs. |
| **A2** | Model A Parity | **PASS** | Bitwise match to Phase 3D historical accuracy & macro-F1. |
| **A3** | Model B Parity | **WARNING** | Matches Phase 3G P1 benchmark (0.3242); delta vs Phase 3D JSON (0.3279) from threading order. |
| **B1** | Metric Recalculation | **PASS** | 0 discrepancies across 340 audited metric cells. |
| **B2** | Validation Leakage | **PASS** | Hyperparameters locked on validation split prior to single test run. |
| **C1** | Event Cooldown Logic | **PASS** | 5 consecutive normal samples correctly disarms detector. |
| **D1** | 0.0s Latency Claim | **WARNING** | Deconstructed as standing alarm artifact (56.5% active at onset). |
| **D2** | Clean Detection Latency | **PASS** | Clean median latency established as 18.0s for Policy B ($k=15$). |
| **E1** | Policy D Reliability | **FAIL** | Raw probability thresholding fails due to uncalibrated multiclass shift. |
| **E2** | Policy E Universality | **WARNING** | 0% false alarms confirmed, but 89.3% missed detections in 120s flights. |
| **F1** | Text/CSV Consistency | **PASS** | Complete concordance across all report narratives and data tables. |

---

## 9. Final Phase 3I Deliverables Inventory

The approved deliverables reside in `Engine/v0.2/reports/diagnostics_v0.2/phase_3i/`:

1. `phase3i_audit_report.md` — Formal independent validation and audit report.
2. `latency_clean_vs_overall.csv` — Full deconstruction of overall vs. clean detection latencies across all 20 conditions.
3. `run_phase3i_audit_verification.py` — Reproducible verification script for checksums, parity, recalculations, and latency breakdowns.
4. `checksums.json` — Cryptographic SHA-256 manifest verifying Phase 3I inputs and generated outputs.

---

## 10. Auditor Recommendations for Phase 4

1. **Deploy a Two-Tier Operational Architecture:**
   - **Tier 1 (Real-Time Annunciator):** Consecutive persistence filter (Policy B, $k=15\text{ s}$), providing fast response ($\tau_{\text{clean}} = 18\text{ s}$), cutting nuisance alarms by >60%, and securing 100% diagnostic accuracy on sensor faults.
   - **Tier 2 (Maintenance Confirmation):** Sequential CUSUM (Policy E) or flight-level sequence voting (Protocol 3B), providing 0.0% false alarms and high diagnostic fidelity for persistent degradation across multi-hour flight recordings.
2. **Implement Post-Hoc Probability Calibration:** Prior to using probability thresholds in Tier 1 or Tier 2, apply Platt scaling or isotonic regression to align predicted probabilities with empirical class frequencies.
3. **Extend Simulation Duration for Degradation Monitoring:** Evaluate CUSUM and trend filters on multi-hour synthetic flight cycles to eliminate scenario-boundary truncation artifacts.
