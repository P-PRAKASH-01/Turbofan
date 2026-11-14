# ENGINE-TWIN v0.2 — Phase 4C Audit Report: Independent Results Verification and Residual-Failure Analysis

**Document ID:** `ET-P4C-AUD-001`  
**Phase:** 4C Independent ML Validation Audit  
**Date:** 2026-10-14  
**Author:** Antigravity Independent ML Validation Engineer & Experimental Auditor  
**Audit Target:** Phase 4C Implementation, Frozen Configuration, Evaluation Pipeline, and Deliverables  
**Project Root:** `Engine/v0.2/`  
**Audit Destination Directory:** `Engine/v0.2/reports/diagnostics_v0.2/phase_4c/`  
**Dataset Version:** 0.2.0 (Generic Synthetic Aero-Piston Simulator, Synthetic Data Only)  

---

> [!IMPORTANT]
> **SIMULATION-FIRST INDEPENDENT AUDIT BOUNDARY DISCLAIMER**  
> All data, models, metrics, and evaluations analyzed herein originate exclusively from a generic synthetic aero-piston digital twin simulation model. The findings of this independent audit do not represent certified airworthiness data, FAA/EASA-compliant engine condition monitoring, or validated physical hardware performance on operational MALE UAVs. All conclusions evaluate digital twin methodology against synthetic ground truth.

---

## 1. Executive Audit Summary

As an independent ML validation engineer and experimental auditor, I conducted a forensic audit of the completed Phase 4C deliverables in `Engine/v0.2/reports/diagnostics_v0.2/phase_4c/`. This audit inspected the raw telemetry data, split manifests, generator source code, frozen configuration, evaluation script, and empirical CSV outputs without modifying historical reports or retuning against test data.

### Summary of Audit Findings
1. **Reconciliation & Transcription Typos:**
   - The evaluation script correctly processed exactly **10,440 rows** across 87 scenarios in `scenario_heldout` ($87 \times 120$) and **23,040 rows** across 192 scenarios in `engine_heldout` ($192 \times 120$).
   - The Phase 4C report narrative contained an isolated typographical transcription error stating "11,440 time samples" instead of 10,440, and "8 unseen engines" instead of 6.
2. **Mathematical Reproducibility of H1–H7:**
   - All hypothesis values, aggregation methods, rounding, and PASS/FAIL labels were independently recomputed from raw scenario predictions and matched `phase4c_hypothesis_comparison.csv` with 100% exactitude.
3. **Strict Anti-Leakage Compliance:**
   - Configuration parameters ($\mathbf{\delta}_{\max}$, $\mathbf{\beta}_{\text{thermal}}$, $\gamma$) were calibrated exclusively on the validation normal partition and frozen before test evaluation was initiated. Zero test data leakage occurred.
4. **Simulator Fidelity:**
   - The causal thermal filter recurrence ($\alpha = \frac{\Delta t}{\tau + \Delta t}$) and time constants ($\tau_{\text{cht, egt}} = 25\text{ s}, \tau_{\text{oil}} = 60\text{ s}$) are an exact mathematical reproduction of the simulator generator's internal Euler step (`_thermal_trace` in `generate_dataset.py`).
5. **Major Forensic Discovery on Sensor False Alarms (Check 9):**
   - The Phase 4C report claimed "Operators monitoring $\text{SDQI}_{\min}$ are immediately alerted to single-sensor loss with near-zero false alarms."
   - **This claim is UNVERIFIED / FALSE.** Healthy test samples exhibit a **33.02% to 38.66% false alarm rate** where $\text{SDQI}_{\min} \le 50.0$.
   - **Root Cause Identified:** Inherited static plausible range limits from Phase 4A (`torque < 20 Nm`, `oil_temp < 20°C`, `egt < 100°C`) prematurely truncate normal cold-ambient starts ($T_{\text{amb}} < 20^\circ\text{C}$) and low-power descent flights, forcing $q_i = 0$.

---

## 2. Check 1: Data Reconciliation & Split Manifest Audit

The repository contains 960 scenarios across 30 engines, each running for 120 seconds at 1.0 Hz (115,200 total samples).

### Split Manifest Reconciliation Table

| Protocol | Split Partition | Scenarios | Engines | Samples / Scenario | Total Processed Rows | Reconciled Sum of Subcategories | Status |
|---|---|---|---|---|---|---|---|
| `scenario_heldout` | Train | 696 | 30 | 120 | 83,520 | 6,120 normal + 77,400 fault | VERIFIED |
| `scenario_heldout` | Validation | 177 | 30 | 120 | 21,240 | 1,560 normal + 19,680 fault | VERIFIED |
| `scenario_heldout` | **Test (`scenario_test`)** | **87** | **30** | **120** | **10,440** | **1,320 normal + 3,484 pre-onset + 2,602 physical + 3,034 sensor** | **DISCREPANCY (Report Typo)** |
| `engine_heldout` | Train | 576 | 18 | 120 | 69,120 | 8,640 normal + 60,480 fault | VERIFIED |
| `engine_heldout` | Validation | 192 | 6 | 120 | 23,040 | 2,880 normal + 20,160 fault | VERIFIED |
| `engine_heldout` | **Test (`test`)** | **192** | **6** | **120** | **23,040** | **2,880 normal + 7,624 pre-onset + 5,217 physical + 7,319 sensor** | **DISCREPANCY (Report Typo)** |

#### Forensic Investigation of the "11,440" Figure
In `phase4c_refinement_report.md` Section 2, the report stated:
> `scenario_heldout`: 87 test scenarios (11,440 time samples).  
> `engine_heldout`: 192 test scenarios across 8 unseen engines (23,040 time samples).

- Audit inspection of `evaluate_test_protocols` in `run_phase4c_evaluation.py` proves that the pipeline processed exactly $87 \times 120 = \mathbf{10,440}$ samples.
- The subcategory sample counts in `phase4c_ehi_sdqi_evaluation.csv` sum exactly:
  $$1,320 \text{ (Normal)} + 3,484 \text{ (Pre-onset)} + 2,602 \text{ (Active Physical)} + 3,034 \text{ (Active Sensor)} = \mathbf{10,440}$$
- **Finding:** The "11,440" figure was an isolated manual typographical transcription error in the report text (+1,000 samples). The code and data are mathematically correct.
- Similarly, the test split contains **6 unseen engines** (`0b650165a452bd7e`, `1153e1f3895ff56e`, `ae2a40d5c7f6be34`, `bcdee114e06501f6`, `dd261a43bfc51a07`, `f169ef1f18516af7`), representing exactly 20% of the 30 total engines (18 train, 6 validation, 6 test). The reference to "8 engines" was a text error.

---

## 3. Check 2: Independent Recomputation of Hypotheses H1–H7

Hypotheses H1–H7 were re-evaluated directly from the saved sample-level predictions. Every metric, percentile, aggregation window, and threshold was audited.

### Independent Hypothesis Verification Table

| Protocol | Hyp ID | Statement / Metric Threshold | Reported Refined Value | Independently Recomputed Value | Numerical Parity | Audit Verdict |
|---|---|---|---|---|---|---|
| `scenario_heldout` | **H1** | Healthy Mean $\text{EHI} \ge 95.0$ | 92.81 | **92.8124** | Exact | FAIL (Confirmed) |
| `scenario_heldout` | **H2** | Healthy 5th Percentile $\text{EHI} \ge 90.0$ | 63.29 | **63.2871** | Exact | FAIL (Confirmed, +2.61 vs 4B) |
| `scenario_heldout` | **H3** | Pre-Onset Mean $\text{EHI} \ge 95.0$ | 97.03 | **97.0268** | Exact | PASS (Confirmed) |
| `scenario_heldout` | **H4** | Severity Monotonicity: Severe $<$ Mod $<$ Mild | Mild: 97.3, Mod: 94.5, Sev: 94.6 | **Mild: 97.31, Mod: 94.50, Sev: 94.58** | Exact | FAIL (Confirmed, Inversion of 0.08 pts) |
| `scenario_heldout` | **H5** | Sensor-Fault Mean $\text{EHI} \ge 88.0$ | 94.32 | **94.3182** | Exact | PASS (Confirmed) |
| `scenario_heldout` | **H6A** | Worst-Channel $\text{SDQI}_{\min} \le 20.0$ (Stuck/Bias) | 37.74 | **37.7410** | Exact | FAIL (Stuck=5.54, Bias=72.28) |
| `scenario_heldout` | **H6B** | Composite $\text{SDQI}_{\text{comp}} \le 92.0$ (Single Sensor) | 95.13 | **95.1293** | Exact | FAIL (Confirmed, Dilution Effect) |
| `scenario_heldout` | **H7** | Healthy Pearson $\|r(\text{EHI}, \text{throttle})\| < 0.15$ | 0.6570 | **0.6570** ($r = -0.6570$) | Exact | FAIL (Confirmed) |
| `engine_heldout` | **H1** | Healthy Mean $\text{EHI} \ge 95.0$ | 98.59 | **98.5881** | Exact | PASS (Confirmed) |
| `engine_heldout` | **H2** | Healthy 5th Percentile $\text{EHI} \ge 90.0$ | 93.59 | **93.5857** | Exact | PASS (Confirmed, +2.44 vs 4B) |
| `engine_heldout` | **H3** | Pre-Onset Mean $\text{EHI} \ge 95.0$ | 98.89 | **98.8876** | Exact | PASS (Confirmed) |
| `engine_heldout` | **H4** | Severity Monotonicity: Severe $<$ Mod $<$ Mild | Mild: 98.8, Mod: 95.3, Sev: 97.4 | **Mild: 98.77, Mod: 95.32, Sev: 97.45** | Exact | FAIL (Confirmed, Inverted) |
| `engine_heldout` | **H5** | Sensor-Fault Mean $\text{EHI} \ge 88.0$ | 97.83 | **97.8315** | Exact | PASS (Confirmed) |
| `engine_heldout` | **H6A** | Worst-Channel $\text{SDQI}_{\min} \le 20.0$ (Stuck/Bias) | 46.32 | **46.3241** | Exact | FAIL (Stuck=5.55, Bias=87.01) |
| `engine_heldout` | **H6B** | Composite $\text{SDQI}_{\text{comp}} \le 92.0$ (Single Sensor) | 95.40 | **95.4012** | Exact | FAIL (Confirmed, Dilution Effect) |
| `engine_heldout` | **H7** | Healthy Pearson $\|r(\text{EHI}, \text{throttle})\| < 0.15$ | 0.3800 | **0.3800** ($r = -0.3800$) | Exact | FAIL (Confirmed, -22.3% vs 4B) |

---

## 4. Check 3 & Check 4: Anti-Leakage Sequence & Simulator Fidelity

### Anti-Leakage Protocol Audit
- In `run_phase4c_evaluation.py`:
  - `calibrate_and_freeze_config()` executes at line 407.
  - The static healthy reference estimator was fit strictly on `lineage_df["scenario_split"] == "train"` & `labels_df["fault_type"] == "normal"` (6,120 rows).
  - Parameter calibration for $\mathbf{\delta}_{\max}$, $\mathbf{\beta}_{\text{thermal}}$, and $\gamma$ was performed strictly on `lineage_df["scenario_split"] == "validation"` & `labels_df["fault_type"] == "normal"` (1,560 rows).
  - The refined configuration was serialized to `phase4c_refined_config.json` at line 174.
  - `evaluate_test_protocols()` was invoked at line 410 only **after** the configuration file was frozen.
  - Test protocol estimators were fit strictly on their protocol's training partition (`lineage_df[split_col] == "train"`).
- **Audit Verdict:** Full anti-leakage compliance verified. Zero test data influenced parameter selection.

### Simulator Generator Fidelity Audit
Audit inspected lines 179–194 of `Engine/v0.2/src/generate_dataset.py`:
```python
def _thermal_trace(ambient_temp_c, dt_s, tau_s, target_offset_c, initial_rise_c):
    alpha = dt_s / (tau_s + dt_s)
    trace = np.empty_like(ambient_temp_c)
    trace[0] = ambient_temp_c[0] + initial_rise_c
    for index in range(1, len(trace)):
        target = ambient_temp_c[index] + target_offset_c[index]
        trace[index] = trace[index - 1] + alpha * (target - trace[index - 1])
    return trace
```
- In `health_index_refined.py`, `CausalThermalFilter.step()` implements:
  $$y_{\text{dynamic}}(t) = y_{\text{dynamic}}(t-1) + \alpha \cdot \left( \hat{y}_{\text{static}}(t) - y_{\text{dynamic}}(t-1) \right), \quad \alpha = \frac{\Delta t}{\tau + \Delta t}$$
- Simulator configuration parameters from `dataset_config.json`:
  - `constants["thermal_time_constant_s"] = 25.0` (applied to CHT and EGT).
  - `equations["oil_temperature_time_constant_s"] = 60.0` (applied to Oil Temperature).
  - `equations["thermal_initial_rise_above_ambient_c"] = 25.0`.
- In `phase4c_refined_config.json`, the frozen constants are:
  - `time_constants_s`: `{"cht": 25.0, "egt": 25.0, "oil_temp": 60.0}`.
- **Audit Verdict:** The causal thermal lag filter is an **exact mathematical reproduction** of the simulator generator's internal Euler discrete update.

---

## 5. Check 5: Engine Baseline Adaptation Audit

### Adaptation Outcomes by Operating Phase

| Protocol | Flight Inception Phase | Total Scenarios | Calibrated Nominal | Fallback: Operating Unstable | Fallback: Anomaly Gate | Calibration Success Rate |
|---|---|---|---|---|---|---|
| `scenario_heldout` | Climb | 20 | 0 | 20 | 0 | 0.0% |
| `scenario_heldout` | Cruise | 23 | 0 | 23 | 0 | 0.0% |
| `scenario_heldout` | Descent | 22 | 0 | 22 | 0 | 0.0% |
| `scenario_heldout` | Ground Run | 22 | 0 | 22 | 0 | 0.0% |
| **`scenario_heldout` Total** | **All Phases** | **87** | **0** | **87** | **0** | **0.0%** |
| `engine_heldout` | Climb | 48 | 2 | 46 | 0 | 4.2% |
| `engine_heldout` | Cruise | 48 | 0 | 48 | 0 | 0.0% |
| `engine_heldout` | Descent | 48 | 0 | 48 | 0 | 0.0% |
| `engine_heldout` | Ground Run | 48 | 0 | 48 | 0 | 0.0% |
| **`engine_heldout` Total** | **All Phases** | **192** | **2** | **190** | **0** | **1.0%** |

### Why Stable Windows Were Rejected
Analysis of sample-to-sample dynamics during the initial 25 seconds of flight across all 279 test scenarios reveals:
- Mean sample-to-sample throttle delta: $|\Delta \theta| = 0.696\% \pm 0.531\%$.
- 75th percentile of throttle delta: $1.000\%$.
- Maximum throttle delta: $3.432\%$.
- Only **41.3%** of consecutive sample pairs satisfy the quasi-steady condition $|\Delta \theta| \le 0.5\%$.
- The probability of observing 8 consecutive sample pairs each satisfying $|\Delta \theta| \le 0.5\%$ under independent turbulence is $0.413^8 \approx 0.00083$ (0.08%).
- **Audit Verdict:** The adapter executed exactly as designed under the frozen configuration. Because the quasi-steady criterion was too stringent for simulator pilot/turbulence noise, the system safely defaulted to $\mathbf{\delta} = \mathbf{0}$.
- **Contamination Check:** In zero instances did the baseline adapter calibrate onto an active fault or transient state. Safeguards were 100% effective.

### Unit Test Suite Audit
Inspection of `Engine/v0.2/tests/test_phase4c_health_index.py` confirms that 5 distinct tests verify the adapter:
1. `test_baseline_adaptation_nominal_centering`: Verifies successful calibration (`CALIBRATED_NOMINAL`) and residual zeroing ($|z| < 0.5$).
2. `test_baseline_adaptation_abort_active_fault_t0`: Verifies anomaly gate abort (`ABORTED_ANOMALY_DETECTED`) on startup fault.
3. `test_baseline_adaptation_abort_fault_during_window`: Verifies abort when a fault steps up at $t=4\text{ s}$.
4. `test_baseline_adaptation_abort_gradual_drift_at_startup`: Verifies trend slope gate abort ($>0.30\sigma/\text{s}$).
5. `test_baseline_adaptation_unstable_dynamics_fallback`: Verifies fallback (`FALLBACK_OPERATING_UNSTABLE`) on throttle jumps.
- **Audit Verdict:** The test suite thoroughly exercises both successful calibration and failsafe aborts.

---

## 6. Check 6: Granular Sensor Fault Audit (Stuck, Dropout, Bias, Drift)

### Granular Sensor Fault Performance Table

| Protocol | Fault Family | Active Samples | Mean $\text{SDQI}_{\min}$ | 5th Pct $\text{SDQI}_{\min}$ | Mean $\text{SDQI}_{\text{comp}}$ | Sample Detection Rate ($\le 50$) | Scenario Detection Rate | Median Detection Latency | Pre-Onset False Alarm Rate ($\le 50$) |
|---|---|---|---|---|---|---|---|---|---|
| `scenario_heldout` | **Sensor Stuck** | 770 | **5.54** | 0.00 | 88.24 | **95.8%** | **100.0%** (10/10) | **4.0 s** | 46.28% |
| `scenario_heldout` | **Sensor Dropout** | 747 | **71.67** | 0.00 | 96.65 | 14.7% | **100.0%** (10/10) | 10.5 s | 34.66% |
| `scenario_heldout` | **Sensor Bias** | 718 | **72.28** | 0.00 | 96.33 | 27.7% | 30.0% (3/10) | 0.0 s | 49.38% |
| `scenario_heldout` | **Sensor Drift** | 799 | **90.83** | 0.00 | 99.27 | 7.6% | 18.2% (2/11) | 39.0 s | 28.79% |
| `engine_heldout` | **Sensor Stuck** | 1,863 | **5.55** | 0.00 | 89.88 | **96.0%** | **100.0%** (24/24) | **4.0 s** | 30.97% |
| `engine_heldout` | **Sensor Dropout** | 1,735 | **70.81** | 0.00 | 97.08 | 16.9% | **95.8%** (23/24) | 9.0 s | 31.35% |
| `engine_heldout` | **Sensor Bias** | 1,867 | **87.01** | 0.00 | 97.97 | 13.9% | 16.7% (4/24) | 0.0 s | 38.10% |
| `engine_heldout` | **Sensor Drift** | 1,854 | **75.84** | 0.00 | 96.78 | 24.3% | 25.0% (6/24) | 0.0 s | 29.73% |

#### Forensic Analysis of Detection Capabilities
1. **Sensor Stuck:** Outstanding performance. 100% of scenarios detected within exactly 4.0 seconds (matching the 5-sample consecutive identical sample threshold).
2. **Sensor Dropout:** Intermittent 1-sample dropouts ($p = 0.05$) are smoothed by exponential moving averages, keeping mean composite SDQI high (97.08) while isolating dropouts at the scenario level (95.8%–100%).
3. **Sensor Bias:** Only large biases exceeding analytical redundancy thresholds (1.2 kW mechanical or 75°C thermal) trigger detection (16.7%–30.0% scenario detection). Subtle in-range biases remain within physical sensor scatter.
4. **Sensor Drift:** Drift faults ramp gradually from 0.0. In `scenario_heldout`, median latency is 39.0 seconds, reflecting the time required for drift accumulation to breach discrepancy thresholds.

---

## 7. Check 7: Operating Point & Throttle Dependence Deep Dive

### Throttle Decile Stratification on Healthy Windows

| Protocol | Throttle Range | Sample Count | Mean Throttle % | Mean EHI | Pearson $r(\text{EHI}, \text{throttle})$ | Key Behavioral Finding |
|---|---|---|---|---|---|---|
| `scenario_heldout` | $0\% \le \theta \le 40\%$ | 315 | 32.1% | 97.67 | Undefined / Near-zero | Pristine nominal health |
| `scenario_heldout` | $40\% < \theta \le 60\%$ | 405 | 50.8% | 98.55 | $+0.3046$ | Nominal health; mild positive correlation |
| `scenario_heldout` | $60\% < \theta \le 80\%$ | 470 | 73.4% | 92.05 | $-0.7254$ | Residual expansion begins; advisory dips |
| `scenario_heldout` | $80\% < \theta \le 100\%$ | 130 | 88.6% | **66.25** | $-0.6728$ | **Severe degradation**; surrogate error expands |
| `engine_heldout` | $0\% \le \theta \le 40\%$ | 636 | 31.4% | 99.78 | Undefined / Near-zero | Pristine nominal health |
| `engine_heldout` | $40\% < \theta \le 60\%$ | 941 | 51.2% | 99.51 | Undefined / Near-zero | Pristine nominal health |
| `engine_heldout` | $60\% < \theta \le 80\%$ | 546 | 71.9% | 99.95 | $-0.5731$ | Nominal health maintained |
| `engine_heldout` | $80\% < \theta \le 100\%$ | 757 | 87.9% | **95.48** | $-0.4227$ | **Remains Nominal** ($>95.0$); heteroscedastic scaling succeeds |

### Multivariate Confounding OLS Regression
To test whether throttle correlation is driven by altitude or flight phase:
- On `scenario_heldout`:
  $$\text{EHI} = 110.31 - 0.3799 \cdot \text{throttle} + 0.0018 \cdot \text{altitude} \quad (R^2 = 0.4868)$$
  Altitude has negligible effect ($+0.0018\text{ pts/m}$), while throttle accounts for nearly half of total EHI variance.
- On `engine_heldout`:
  $$\text{EHI} = 102.25 - 0.0759 \cdot \text{throttle} + 0.0003 \cdot \text{altitude} \quad (R^2 = 0.1507)$$
  Throttle sensitivity on held-out engines is reduced by **$5.0\times$** ($-0.0759$ vs $-0.3799$).

---

## 8. Check 8: Severity Ordering Within Fault Classes and Engines

### Intra-Class Monotonicity Audit

```
Efficiency Degradation (Monotonic):
  Mild:     99.40 ± 0.98  (N=539)  ───────────────────────────────┐
  Moderate: 97.47 ± 3.93  (N=600)  ───────────────────────┐       │ Decreasing EHI
  Severe:   97.47 ± 5.21  (N=554)  ───────────────────────┴───────┘ (Severe = Mod < Mild)

Thermal Abnormality (Inverted on engine_heldout):
  Mild:     98.91 ± 2.23  (N=1031) ───────────────────────────────┐
  Moderate: 93.98 ± 9.63  (N=283)  ──────────────┐                │ Inverted:
  Severe:   99.92 ± 0.10  (N=523)  ──────────────┴────────────────┘ Severe (99.92) > Mod (93.98)
```

#### Root Causes of the Thermal Inversion:
1. **Fault-to-Noise Ratio:**
   In `dataset_config.json`, full severity thermal abnormality induces a rise of $+25.0^\circ\text{C}$ on CHT and $+75.0^\circ\text{C}$ on EGT. On held-out engines, static surrogate residual standard deviations are $\sigma_{\text{cht}} = 23.41^\circ\text{C}$ and $\sigma_{\text{egt}} = 87.69^\circ\text{C}$. Thus, full severity thermal rise represents only $1.07\sigma$ on CHT and $0.86\sigma$ on EGT.
2. **Deadband Swallowing:**
   Because the heteroscedastic deadband requires $|z_i| > \tau_{\text{scaled}} \approx 2.20\sigma$, both CHT and EGT standardized deviations fall entirely inside the deadband. Consequently, $d_i = 0$ and $h_i = 1.000$, producing an EHI of **99.92**.
3. **Phase-Engine Confounding in Moderate Severity:**
   Moderate thermal abnormality on `engine_heldout` included engine `0b650165a452bd7e` during `climb`. Because baseline adaptation defaulted to $\mathbf{\delta} = \mathbf{0}$, this engine's individual displacement offset pulled down EHI to $77.98$, distorting the moderate class mean.

### Intra-Engine Severity Ordering on `engine_heldout`

| Engine ID | Mild Severity EHI | Moderate Severity EHI | Severe Severity EHI | Monotonic Ordering? | Root Cause of Non-Monotonicity |
|---|---|---|---|---|---|
| `0b650165a452bd7e` | $99.44 \pm 0.59$ | $88.59 \pm 9.20$ | $97.76 \pm 2.81$ | **Inverted** | Climb phase allocated to moderate scenario |
| `1153e1f3895ff56e` | $98.08 \pm 2.46$ | $98.82 \pm 1.13$ | $96.86 \pm 3.29$ | **Near-monotonic** | Moderate slightly above mild (+0.74 pts) |
| `ae2a40d5c7f6be34` | $98.71 \pm 0.89$ | $96.28 \pm 2.40$ | $98.57 \pm 1.47$ | **Inverted** | Severe thermal rise swallowed by deadband |
| `bcdee114e06501f6` | **$99.32 \pm 1.23$** | **$98.69 \pm 2.34$** | **$96.50 \pm 3.00$** | **STRICTLY MONOTONIC** | Balanced flight phase allocation |
| `dd261a43bfc51a07` | $98.33 \pm 2.02$ | $92.59 \pm 2.70$ | $99.90 \pm 0.10$ | **Inverted** | Severe thermal rise swallowed by deadband |
| `f169ef1f18516af7` | **$99.17 \pm 1.05$** | **$97.12 \pm 2.97$** | **$95.33 \pm 7.40$** | **STRICTLY MONOTONIC** | Balanced flight phase allocation |

---

## 9. Check 9: Verification of False-Alarm Claims

### Audit of "Near-Zero False Alarms" Claim in SDQI

In `phase4c_refinement_report.md` Section 3.1, the report claimed:
> "Operators monitoring $\text{SDQI}_{\min}$ are immediately alerted to single-sensor loss with near-zero false alarms."

### Empirical False-Alarm Rate on Healthy Data

| Protocol | Healthy Window Sample Count | $\text{SDQI}_{\min} \le 50.0$ False Alarm Rate | $\text{SDQI}_{\min} \le 20.0$ False Alarm Rate | $\text{SDQI}_{\text{comp}} < 80.0$ False Alarm Rate | Audit Verdict on Claim |
|---|---|---|---|---|---|
| `scenario_heldout` | 4,804 | **38.66%** (1,857 samples) | **31.16%** (1,497 samples) | 8.49% (408 samples) | **CLAIM UNVERIFIED / FALSE** |
| `engine_heldout` | 10,504 | **33.02%** (3,468 samples) | **25.04%** (2,630 samples) | 6.66% (700 samples) | **CLAIM UNVERIFIED / FALSE** |

#### Root Cause of the 33%–38% False Alarm Rate
Audit traced the exact channel failures on healthy samples. False alarms are caused by rigid static plausible range lower bounds configured in Phase 4A (`health_index_formulation.json`):
1. **Torque (`torque`):** Lower bound set to `20.0 Nm`. On normal flights during descent and low throttle, normal torque reaches `12.04 Nm`. **13.94%** of normal samples fall below 20.0 Nm, forcing $p_t = 0 \implies q_{\text{torque}} = 0$.
2. **Oil Temperature (`oil_temp`):** Lower bound set to `20.0°C`. During cold ambient starts, oil temp starts at ambient ($0.62^\circ\text{C}$). **7.17%** of normal samples fall below 20.0°C, forcing $q_{\text{oil}} = 0$.
3. **Exhaust Gas Temperature (`egt`):** Lower bound set to `100.0°C`. At engine startup, EGT starts near ambient ($-0.48^\circ\text{C}$ to $25^\circ\text{C}$). **6.04%** of normal samples fall below 100.0°C, forcing $q_{\text{egt}} = 0$.
4. **Fuel Flow (`fuel_flow`):** Lower bound set to `0.0003 kg/s`. Low idle fuel flow reaches `0.00018 kg/s`. **5.34%** of normal samples fall below, forcing $q_{\text{fuel}} = 0$.
5. **Power (`power`):** Lower bound set to `5.0 kW`. Low idle power reaches `3.64 kW`. **3.46%** of normal samples fall below, forcing $q_{\text{power}} = 0$.

Whenever any single channel has $q_i = 0$, the worst-channel quality metric $\text{SDQI}_{\min} = 100 \times \min_i q_i$ immediately collapses to $0.0$, generating an unmitigated false alarm!

### Audit of EHI False-Alarm Claims
- **EHI Caution Band ($\text{EHI} < 80.0$):** False alarm rate is **7.41%** on `scenario_heldout` (early ground runup warmup) and **1.35%** on `engine_heldout`.
- **EHI Warning Band ($\text{EHI} < 60.0$):** False alarm rate is **0.00%** across both protocols (0 of 4,804 scenario samples; 0 of 10,504 engine samples).
- **Audit Verdict:** The claim that EHI generates zero false warnings on healthy flights is **VERIFIED**.

---

## 10. Master Audit Findings & Discrepancies Table

| Item ID | Category | Description | Status | Severity | Recommended Corrective Action |
|---|---|---|---|---|---|
| **AUD-01** | Report Documentation | Typo: "11,440" rows reported instead of 10,440 ($87 \times 120$). | DISCREPANCY | Low (Documentation) | Note discrepancy in audit trail; code and CSVs are 100% correct. |
| **AUD-02** | Report Documentation | Typo: "8 unseen engines" reported instead of 6 unseen test engines. | DISCREPANCY | Low (Documentation) | Note discrepancy in audit trail; split partition ratio is 18/6/6 (20% test). |
| **AUD-03** | Telemetry Plausibility | Rigid Phase 4A static plausible lower bounds truncate normal cold-ambient starts and low-power descent samples, causing 33%–38% false alarms in $\text{SDQI}_{\min}$. | **CRITICAL FLAW** | **High (Methodological)** | Expand static plausible ranges or make bounds ambient-temperature and throttle-conditioned. |
| **AUD-04** | Baseline Adaptation | Adapter quasi-steady gate $|\Delta \theta| \le 0.5\%$ over 8s is too strict for simulator turbulence, triggering fallback on 99% of flights. | RESIDUAL FAILURE | Medium (Operational) | Replace point-to-point diff with low-pass filtered derivative $|\frac{d\bar{\theta}}{dt}| \le 1.0\%/\text{s}$. |
| **AUD-05** | Fault Detectability | Full-severity thermal abnormality ($+25^\circ\text{C}$ CHT, $+75^\circ\text{C}$ EGT) represents $<1.1\sigma$ and is swallowed by the 2.2-sigma deadband. | RESIDUAL FAILURE | Medium (Modeling) | Use dynamic thermal differential residuals rather than static surrogate errors. |
| **AUD-06** | Claim Verification | Report claimed "near-zero false alarms" for $\text{SDQI}_{\min}$. Actual rate is 33.02%–38.66%. | DISCREPANCY | High (Integrity) | Mark claim UNVERIFIED / FALSE; document exact empirical false alarm rate. |

---

## 11. Auditor Recommendation: Phase 5 vs. Validation Refinement Experiment

### Dilemma
Should the project proceed directly to **Phase 5 (Compound Diagnostic-Prognostic Alert Integration)**, or should a **controlled Phase 4D refinement experiment** be executed first?

### Auditor Assessment
Proceeding to Phase 5 with the current Phase 4C configuration would introduce severe systemic instability:
1. In Phase 5, alert policies will use $\text{SDQI}_{\min}$ to suppress or gate diagnostic alerts. With a **33%–38% false alarm rate in $\text{SDQI}_{\min}$**, healthy flights would suffer massive false alert suppression or nuisance sensor warnings during cold starts and descent!
2. The root cause of this false alarm rate is **not a complex architectural issue**, but rather an uncalibrated, hardcoded configuration artifact in `health_index_formulation.json` (Phase 4A) where plausible range minimums were set above normal operating minima.
3. Similarly, widening the quasi-steady throttle gate in the baseline adapter from $0.5\%$ to $1.2\%$ would allow genuine engine calibration, resolving Simpson's Paradox and restoring monotonic severity ordering without touching test data.

### Final Auditor Recommendation
**Execute one focused, validation-only refinement experiment (Phase 4D / Phase 4C.1) before starting Phase 5.**
- Calibrate plausible range lower bounds strictly on `scenario_split == "train"` normal data ($T_{\min} \le -15^\circ\text{C}$, $\tau_{\min} \le 5\text{ Nm}$).
- Tune the baseline adapter's quasi-steady filter on validation flights.
- Verify that $\text{SDQI}_{\min}$ false alarm rate drops to $< 1.0\%$ on the validation partition before freezing and advancing to Phase 5.
