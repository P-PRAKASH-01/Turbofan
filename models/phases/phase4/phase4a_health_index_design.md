# ENGINE-TWIN v0.2 — Phase 4A: Health Index Design and Methodology Specification

**Document Type:** Engineering Design & Methodology Specification  
**Project Root:** `Engine/v0.2/`  
**Report Directory:** `Engine/v0.2/reports/diagnostics_v0.2/phase_4a/`  
**Primary Configuration:** `health_index_formulation.json`  
**Methodology Comparison:** `candidate_methodology_comparison.csv`  
**Scope & Disclaimer:** Generic synthetic aero-piston-engine digital twin simulator. All formulations, parameters, and thresholds are provisional research constructs developed for algorithm development on synthetic data. They do not represent real-engine flight data, FAA/EASA airworthiness certification, Rotax/Lycoming flight manuals, DRDO flight qualification, or Remaining Useful Life (RUL) capability.

---

## 1. Executive Summary & Design Overview

Phase 4A establishes the mathematical, architectural, and evaluation methodology for an **Engine Health Index (EHI)** and complementary **Sensor Data Quality Index (SDQI)** for the ENGINE-TWIN digital twin system.

Historically, in Phases 3A–3I, machine learning models were trained to perform 8-class sample-level fault classification. While Model B achieved macro-F1 of 0.3242 historically (and 0.4167 on active-fault windows), discrete multiclass classification conflates instrumentation failure with structural engine degradation and fails to provide a smooth, continuous indicator of physical engine state. Furthermore, raw sample-level predictions generate high false alarm rates without sequential temporal filtering.

Phase 4A introduces a **Dual-Index Digital Twin Architecture**:
1. **Engine Health Index ($EHI \in [0, 100]$):** Continuously quantifies the physical thermodynamic, mechanical, and combustion integrity of the aero piston engine by evaluating normalized residuals against an operating-condition-conditioned Digital Twin surrogate baseline.
2. **Sensor Data Quality Index ($SDQI \in [0, 100]$):** Continuously quantifies telemetry availability, range plausibility, dynamic signal variance, and cross-channel analytical redundancy to detect instrumentation faults (dropouts, stuck signals, in-range bias, and drift).

```
                              STREAMING TELEMETRY (1.0 Hz)
                     [Throttle, Altitude, Ambient Temp & Pressure]
                                          |
                                          v
                         +---------------------------------+
                         |  Healthy Reference Digital Twin |
                         |    Surrogate Estimator (y_hat)  |
                         +---------------------------------+
                                          |
                                          v
+-------------------------------+         |         +-------------------------------+
|     Raw Sensor Measurements   | --------+-------> |       Sensor Data Quality     |
|   (RPM, CHT, EGT, Power, ...) |                   |     Integrity Check (SDQI)    |
+-------------------------------+                   +-------------------------------+
                |                                                   |
                v                                                   v
+-------------------------------+                   +-------------------------------+
|   Condition-Compensated       |                   |  - Availability (Missingness) |
|   Residuals: r = y - y_hat    |                   |  - Physical Range Checks      |
+-------------------------------+                   |  - Channel-Specific Variance  |
                |                                   |  - Analytical Redundancy      |
                v                                   +-------------------------------+
+-------------------------------+                                   |
|   Standardized Deadband       |                                   |
|   Channel Health h_i(t)       |                                   |
+-------------------------------+                                   |
                |                                                   |
                v                                                   v
+-------------------------------+                   +-------------------------------+
|   Coverage & Confidence Check | <-----------------+ Quality Weighting: w_p * q_i  |
|   W_valid >= 0.60 & RPM valid?|                   | (Isolates faulty sensors from |
+-------------------------------+                   |  physical engine evaluation)  |
     |                     |                        +-------------------------------+
[Sufficient]          [Insufficient]
     |                     |
     v                     v
+--------------------+ +------------------------------------------------------------+
| EHI Exponential    | | LOW CONFIDENCE STATE:                                      |
| Composite Score    | | EHI = NaN / STATUS = INSUFFICIENT_TELEMETRY_COVERAGE       |
+--------------------+ +------------------------------------------------------------+
```

---

## 2. Channel Inventory and Subsystem Coupling

The ENGINE-TWIN v0.2 dataset provides exactly **10 measurement channels** (`MEASUREMENT_COLUMNS` in `src/generate_dataset.py`). Both $EHI$ and $SDQI$ monitor all 10 channels.

### 2.1 Complete Channel Register (`health_index_formulation.json`)

| Channel ID | Measured Column Name | Physical Subsystem | Units | Injected Noise $\sigma_{\text{noise}}$ | Plausible Range | EHI Weight $w_{p, i}$ | SDQI Weight $w_{s, i}$ | Stuck Variance Threshold $\epsilon_{\text{stuck}}$ |
|---|---|---|:---:|---:|:---:|:---:|:---:|---:|
| **RPM** | `rpm_meas` | Mechanical Kinematics | RPM | $6.0$ | $[600, 5500]$ | 0.12 | 0.10 | $1.8\text{ RPM}^2$ |
| **MAP** | `manifold_pressure_pa_meas` | Intake Airflow / Induction | Pa | $80.0$ | $[20000, 110000]$ | 0.10 | 0.10 | $320.0\text{ Pa}^2$ |
| **CHT** | `cht_c_meas` | Cylinder Head Thermal | $^\circ\text{C}$ | $0.5$ | $[20, 260]$ | 0.15 | 0.12 | $0.0125^\circ\text{C}^2$ |
| **EGT** | `egt_c_meas` | Combustion Thermal | $^\circ\text{C}$ | $1.0$ | $[100, 950]$ | 0.15 | 0.12 | $0.05^\circ\text{C}^2$ |
| **Oil Temp** | `oil_temp_c_meas` | Lubrication Thermal | $^\circ\text{C}$ | $0.4$ | $[20, 150]$ | 0.10 | 0.10 | $0.008^\circ\text{C}^2$ |
| **Oil Press**| `oil_pressure_kpa_meas` | Lubrication Hydraulic | kPa | $0.8$ | $[100, 700]$ | 0.10 | 0.10 | $0.032\text{ kPa}^2$ |
| **Fuel Flow**| `fuel_flow_kg_s_meas` | Fuel Metering | kg/s | $0.00002$ | $[0.0005, 0.025]$ | 0.10 | 0.10 | $2.0 \times 10^{-11}$ |
| **Power** | `power_kw_meas` | Mechanical Output Work | kW | $0.08$ | $[5.0, 150.0]$ | 0.06 | 0.08 | $0.00032\text{ kW}^2$ |
| **Torque** | `torque_nm_meas` | Mechanical Shaft Torque | Nm | $0.15$ | $[20.0, 350.0]$ | 0.06 | 0.08 | $0.001125\text{ Nm}^2$ |
| **Vibration**| `vibration_rms_g_meas` | Structural Dynamics | $g_{\text{RMS}}$ | $0.02$ | $[0.05, 3.5]$ | 0.06 | 0.10 | $0.00002\text{ g}^2$ |

### 2.2 Analytical Redundancy and Thermodynamic Coupling Groups
In an internal combustion aero engine, physical phenomena manifest across coupled sensor channels simultaneously:
1. **Thermal Dissipation Group:** $\{ \text{CHT}, \text{EGT}, \text{Oil Temp} \}$ — Governed by combustion heat release and cylinder-to-coolant/oil thermal conduction.
2. **Mechanical & Power Group:** $\{ \text{RPM}, \text{Torque}, \text{Power} \}$ — Governed by the mechanical identity $\text{Power} = \text{Torque} \cdot \frac{2\pi \cdot \text{RPM}}{60}$.
3. **Airflow & Induction Group:** $\{ \text{Manifold Pressure}, \text{Fuel Flow} \}$ — Governed by throttle angle, air density, and stoichiometric volumetric filling.
4. **Hydraulic Lubrication Group:** $\{ \text{Oil Pressure} \}$ — Coupled with RPM and oil temperature (viscosity loss).
5. **Structural Dynamics Group:** $\{ \text{Vibration RMS} \}$ — Coupled with engine speed and cyclic torque ripple.

---

## 3. Sensor Data Quality Index (SDQI) Formulation

The Sensor Data Quality Index ($SDQI \in [0, 100]$) assesses whether telemetry channels are valid, operational, and trustworthy.

### 3.1 Four-Factor Channel Quality Model
For each channel $i \in \{1, \dots, 10\}$, a continuous channel quality score $q_i(t) \in [0, 1]$ is computed from past-only telemetry:
$$q_i(t) = a_i(t) \cdot p_i(t) \cdot v_i(t) \cdot c_i(t)$$

#### Factor 1: Availability Check ($a_i(t)$)
Direct binary missingness indicator derived from telemetry validity:
$$a_i(t) = 1.0 - \text{missing\_flag}_i(t)$$

#### Factor 2: Plausibility Range Check ($p_i(t)$)
Detects catastrophic out-of-range signal loss:
$$p_i(t) = \begin{cases} 1.0 & \text{if } y_i^{\min} \le y_i(t) \le y_i^{\max} \\ 0.0 & \text{otherwise} \end{cases}$$

#### Factor 3: Channel-Specific Stuck-Signal Detection ($v_i(t)$)
A sensor that is legitimately stable during cruise still fluctuates continuously with injected Gaussian noise ($\sigma_{\text{noise}, i}$). In contrast, `sensor_stuck` freezes the channel to bitwise identical readings.
To avoid false stuck alarms on steady-state physical signals, a two-stage channel-specific test is performed over a trailing window $W_{\text{stuck}} = 10\text{ s}$:
1. **Consecutive Identical Reading Count:** Count identical floating-point values:
   $$N_{\text{identical}, i}(t) = \sum_{k=0}^{W_{\text{stuck}}-1} \mathbb{I}(y_i(t-k) == y_i(t))$$
2. **Trailing Sample Variance:**
   $$\text{Var}_{10\text{s}}(y_i) = \frac{1}{W_{\text{stuck}}-1}\sum_{k=0}^{W_{\text{stuck}}-1} (y_i(t-k) - \bar{y}_{i, 10\text{s}})^2$$
3. **Stuck Evaluation:**
   $$v_i(t) = \begin{cases} 0.0 & \text{if } N_{\text{identical}, i}(t) \ge 5 \text{ or } \text{Var}_{10\text{s}}(y_i) < \epsilon_{\text{stuck}, i} \\ 1.0 & \text{otherwise} \end{cases}$$
   where $\epsilon_{\text{stuck}, i} = 0.05 \cdot \sigma_{\text{noise}, i}^2$ is scaled to the physical noise level of each channel (Table 2.1).

#### Factor 4: Analytical Redundancy Check for In-Range Bias and Drift ($c_i(t)$)
In-range sensor bias and drift remain inside plausibility bounds and have normal noise variance. However, they violate thermodynamic consistency relative to coupled partner channels.
Let $z_i(t) = \frac{y_i(t) - \hat{y}_i(t)}{\sigma_{0, i}}$ be the standardized residual from the Digital Twin reference model.
For channel $i$ belonging to coupled group $G_i$:
- Let $z_{\text{coupled}, i}(t) = \text{median}_{j \in G_i, j \ne i} |z_j(t)|$ be the median standardized residual of coupled partner channels.
- If channel $i$ exhibits a large residual ($|z_i(t)| > \tau_{\text{iso}} = 4.0\sigma$) while its coupled partners show normal behavior ($z_{\text{coupled}, i}(t) < \tau_{\text{quiet}} = 2.0\sigma$), the anomaly is isolated to the sensing channel:
  $$c_i(t) = \max\left(0.0, 1.0 - \frac{|z_i(t)| - \tau_{\text{quiet}}}{\tau_{\text{iso}} - \tau_{\text{quiet}}}\right)$$
- If coupled partner channels also exhibit elevated residuals ($z_{\text{coupled}, i}(t) \ge 2.0\sigma$), $c_i(t) = 1.0$ (the deviation is recognized as a genuine physical multi-channel event, not a sensor bias).

### 3.2 Composite SDQI Score
The overall Sensor Data Quality Index is the weighted sum:
$$SDQI(t) = 100 \cdot \sum_{i=1}^{10} w_{s, i} \, q_i(t), \quad \sum_{i=1}^{10} w_{s, i} = 1.0$$

---

## 4. Engine Health Index (EHI) Formulation

The Engine Health Index ($EHI \in [0, 100]$) evaluates physical engine condition.

### 4.1 Digital Twin Healthy Reference Model (Operating-Point Decoupling)
To decouple flight operating conditions from engine degradation, a surrogate reference estimator is trained strictly on nominal training flights:
$$\hat{\mathbf{y}}_{\text{healthy}}(t) = f_{\text{ref}}(\mathbf{u}_t)$$
where $\mathbf{u}_t = [\text{throttle\_pct}_t, \text{altitude\_m}_t, \text{ambient\_temp\_c}_t, \text{ambient\_pressure\_pa}_t, \text{air\_density\_kg\_m3}_t, \text{phase}_t]$.
Raw residual for channel $i$: $r_i(t) = y_i(t) - \hat{y}_{\text{healthy}, i}(t)$.
Standardized residual: $z_i(t) = \frac{r_i(t)}{\sigma_{0, i}}$, where $\sigma_{0, i}$ is the standard deviation of residuals fit strictly on healthy training flights.

### 4.2 Deadband Channel Health Function ($h_i(t)$)
Under nominal operation, $z_i(t) \sim \mathcal{N}(0, 1)$. To prevent baseline nominal noise from causing false degradation, a **nominal deadband tolerance** $\tau_{\text{tol}, i} = 2.0\sigma$ is applied:
$$d_i(t) = \max(0.0, |z_i(t)| - \tau_{\text{tol}, i})$$

When the residual is within the $2\sigma$ nominal envelope ($|z_i| \le 2.0$), $d_i(t) \equiv 0.0$.
Channel health is mapped exponentially:
$$h_i(t) = \exp\left(-\frac{1}{2}\left(\frac{d_i(t)}{\beta_i}\right)^2\right)$$
where $\beta_i = 1.5$.
- For nominal noise ($|z_i| \le 2.0$): $d_i = 0 \implies h_i(t) = \exp(0) = \mathbf{1.0}$.
- For mild deviation ($|z_i| = 3.5\sigma$): $d_i = 1.5 \implies h_i(t) = \exp(-0.5 \cdot 1.0^2) = \mathbf{0.606}$.
- For severe fault ($|z_i| = 6.0\sigma$): $d_i = 4.0 \implies h_i(t) = \exp(-0.5 \cdot (4/1.5)^2) \approx \mathbf{0.028}$.

### 4.3 Telemetry Coverage & Low-Confidence State
Before computing $EHI$, the system evaluates sensory coverage:
$$\text{Coverage}(t) = \frac{\sum_{i=1}^{10} w_{p, i} \cdot q_i(t)}{\sum_{i=1}^{10} w_{p, i}}$$

**Coverage Safeguard Rules:**
1. **Minimum Valid Weight:** $\text{Coverage}(t) \ge 0.60$.
2. **Minimum Valid Channels:** At least 6 of the 10 channels must have $q_i(t) \ge 0.5$.
3. **Mandatory Kinematic Channel:** The primary engine speed channel (`rpm`) must have $q_{\text{rpm}}(t) \ge 0.5$.

If any coverage rule is violated:
- The system enters an **Insufficient Telemetry State**:
  $$EHI(t) = \text{NaN}, \quad \text{STATUS} = \text{"INSUFFICIENT\_TELEMETRY\_COVERAGE"}$$
- **A lack of sensory evidence is strictly barred from reporting a healthy score.**

### 4.4 Composite Quality-Weighted EHI
If coverage requirements are satisfied, the raw physical health score is the quality-weighted combination:
$$EHI_{\text{raw}}(t) = 100 \cdot \frac{\sum_{i=1}^{10} w_{p, i} \cdot q_i(t) \cdot h_i(t)}{\sum_{i=1}^{10} w_{p, i} \cdot q_i(t)}$$

Under nominal healthy operation ($h_i(t) = 1.0$ for all valid channels):
$$EHI_{\text{raw}}(t) = 100 \cdot \frac{\sum w_{p, i} q_i (1.0)}{\sum w_{p, i} q_i} \equiv \mathbf{100.0}$$
This resolves the mathematical inconsistency of the preliminary draft and guarantees that nominal healthy flights remain anchored at 100.0.

### 4.5 Temporal Filtering (Noise Smoothing)
To prevent transient high-frequency noise spikes from causing erratic score jumps, an exponential smoothing filter is applied:
$$EHI(t) = \alpha \cdot EHI(t-1) + (1 - \alpha) \cdot EHI_{\text{raw}}(t), \quad EHI(0) = 100.0$$
where $\alpha = 0.85$ (equivalent to an effective averaging window of $\sim 6\text{--}7\text{ s}$).

---

## 5. Candidate Methodology Comparison (Task C)

A systematic comparative evaluation was conducted and saved to `candidate_methodology_comparison.csv`:

```
+---------------------------------------------------------------------------------------------------+
| METHODOLOGY                     | LEAKAGE RISK | COND. INVARIANCE | INTERPRETABILITY | VERDICT    |
+---------------------------------------------------------------------------------------------------+
| 1. Rule-Based Redlines          | Low          | Poor             | High             | REJECTED   |
| 2. Residual Digital Twin (Ours) | Zero         | Excellent        | High             | RECOMMENDED|
| 3. Multivariate Anomaly (Mahal) | Zero         | Moderate         | Moderate         | SECONDARY  |
| 4. Supervised Health Regressor  | FATAL LEAKAGE| Model-dependent  | Low              | REJECTED   |
+---------------------------------------------------------------------------------------------------+
```

### Key Methodological Decisions:
- **Rejection of Supervised Health Regression:** In the ENGINE-TWIN v0.2 dataset, `rul_hours` is initialized to `np.nan` and `health_index_synthetic` is an unobservable simulator-internal variable. Training a supervised regressor on synthetic internal states would create fatal target leakage and produce an algorithm unviable for deployment.
- **Selection of Residual Digital Twin:** Maps directly to physical telemetry, provides 0–100 interpretability, inherently decouples flight operating conditions, and supports analytical redundancy for sensor fault isolation.

---

## 6. Leakage-Safe Partitioning and Parameter Estimation (Task D)

To eliminate data leakage, the parameter estimation protocol enforces strict partition separation:

```
DATASET PARTITIONING & PARAMETER ESTIMATION LIFECYCLE:

[TRAINING SPLIT: scenario_split == 'train' & fault_type == 'normal']
├── Fit Reference Surrogate Model: y_hat = f_ref(throttle, altitude, temp, pressure, phase)
├── Compute Training Residuals: r_i(t) = y_i(t) - y_hat_i(t)
└── Estimate Baseline Noise & Tolerances:
    ├── sigma_0,i = StdDev(r_i)
    └── tau_tol,i = 2.0 * sigma_0,i
           |
           v (Parameters Locked)
[VALIDATION SPLIT: scenario_split == 'validation']
├── Evaluate Channel Weight Schemes (w_p, w_s)
├── Tune Degradation Scale Beta (beta = 1.5)
├── Verify Analytical Redundancy Thresholds (tau_iso, tau_quiet)
└── Verify Stuck Variance Thresholds (epsilon_stuck,i)
           |
           v (All Configurations Frozen in health_index_formulation.json)
[HELD-OUT TEST SPLIT: scenario_split == 'scenario_test' & engine_split == 'test']
└── Single-Pass Evaluation: Run frozen EHI and SDQI pipelines ONCE. Zero parameter adjustment.
```

---

## 7. Provisional Condition Bands and Operational Meaning (Task E)

All condition score bands are **provisional research constructs** for synthetic simulator evaluation. They do not represent approved flight manual procedures or pilot operational advisories.

### Provisional Score Bands:

| Score Band | Range | Simulator State Representation | Data Quality State ($SDQI$) | Simulation Action / Research Meaning |
|:---:|:---:|---|---|---|
| **Band 1** | **$90.0\text{--}100.0$** | **Nominal Simulator State** | Complete Telemetry | Engine operating within calibrated healthy envelope. |
| **Band 2** | **$75.0\text{--}89.9$** | **Mild Simulator Deviation Advisory** | Minor Telemetry Noise | Mild thermodynamic deviation ($1\sigma\text{--}2\sigma$) or isolated minor sensor flutter. |
| **Band 3** | **$50.0\text{--}74.9$** | **Moderate Simulator Degradation Caution** | Single Sensor Failure | Measurable combustion irregularity, rising thermal trace, or stuck/biased sensor. |
| **Band 4** | **$0.0\text{--}49.9$** | **Severe Simulator Anomaly Warning** | Multi-Sensor Breakdown | Severe physical fault (rapid power loss, thermal runaway) or critical telemetry loss. |
| **Status Alert**| **NaN** | **Indeterminate / Low Confidence** | Insufficient Coverage ($< 60\%$) | Sensory evidence insufficient to establish health; health score withheld. |

---

## 8. Proposed Evaluation Metrics & Engineering Target Hypotheses (Task E)

The following metrics are defined as **provisional engineering target hypotheses** to be tested during experimental execution in Phase 4B. They are not established results.

| Evaluation Metric | Target Formulation | Proposed Target Hypothesis | Target Rationale |
|---|---|:---:|---|
| **Nominal Health Baseline** | $\overline{EHI}$ on healthy test flights | **$\ge 95.0$** | Confirms healthy engine remains near 100 under deadband formulation. |
| **Nominal Score Stability** | 5th percentile $EHI$ on healthy test flights | **$\ge 90.0$** | Verifies nominal Gaussian noise does not trigger false degradation bands. |
| **Pre-Onset Quiescence** | $\overline{EHI}$ on fault flights during $t < t_{\text{onset}}$ | **$\ge 95.0$** | Confirms pre-onset inactive rows are recognized as physically healthy. |
| **Severity Monotonicity** | Mean post-onset $EHI$ ordering | **$\overline{EHI}_{\text{severe}} < \overline{EHI}_{\text{mod}} < \overline{EHI}_{\text{mild}}$** | Verifies continuous scaling with physical fault severity. |
| **Sensor Fault Isolation** | Mean post-onset $EHI$ under sensor faults | **$\ge 88.0$** | Confirms analytical redundancy successfully isolates sensor bias/drift from physical EHI. |
| **Sensor Quality Sensitivity** | Mean post-onset $SDQI$ under sensor faults | **$\le 75.0$** | Confirms SDQI reliably flags dropouts, stuck sensors, and in-range drift. |
| **Coverage Failsafe** | $EHI$ output when $\ge 5$ sensors drop out | **$\text{Coverage Alert / NaN}$** | Verifies insufficient sensory data never produces a falsely healthy score. |
| **Operating Invariance** | Pearson $|r(EHI, \text{throttle})|$ on healthy flights | **$< 0.15$** | Confirms flight phase and throttle changes are successfully decoupled. |

---

## 9. Design Decisions Summary & Open Questions

### Confirmed Design Corrections:
1. **Calibrated Deadband Formulation:** Replaced uncalibrated quadratic distance with a deadband channel health formulation ($d_i = \max(0, |z_i| - 2.0)$), ensuring nominal healthy flights score exactly 100.0.
2. **Analytical Redundancy for In-Range Sensor Faults:** Coupled channels into 5 physical groups; isolated large residuals ($|z_i| > 4\sigma$) accompanied by quiet partners ($|z_{\text{coupled}}| < 2\sigma$) are flagged as sensor bias/drift.
3. **Telemetry Coverage & Low-Confidence Safeguard:** Established a $60\%$ minimum weight rule and mandatory RPM check. When coverage fails, $EHI$ outputs NaN with an `INSUFFICIENT_TELEMETRY` flag.
4. **Reconciled 10-Channel Register:** Documented all 10 measured channels in Table 2.1 with individual noise variances, physical subsystems, and weights.
5. **Provisional Simulator-Specific Bands:** Removed operational pilot/flight commands; established Bands 1–4 strictly as simulation research constructs.
6. **Leakage-Safe Partitioning:** Baseline surrogate and noise variances fit strictly on `train` normal flights; validation split used for tuning; test evaluated once.
7. **Channel-Specific Stuck Signal Tests:** Window expanded to $W=10\text{ s}$, combining exact consecutive float matches ($N \ge 5$) with channel-specific variance thresholds ($\epsilon_{\text{stuck}, i} = 0.05 \cdot \sigma_{\text{noise}, i}^2$).
8. **Engineering Targets as Hypotheses:** Framed all quantitative criteria as targets to be evaluated in Phase 4B.

### Open Questions for Phase 4B Implementation Approval:
1. **Surrogate Reference Model Family:** Should the healthy reference surrogate $\hat{\mathbf{y}}_{\text{healthy}} = f_{\text{ref}}(\mathbf{u})$ be implemented as a multi-output ridge polynomial regressor (faster, highly interpretable) or a multi-output Gradient Boosted Regressor (captures non-linear throttle-density interactions)?
2. **Phase-Specific vs. Global Surrogate:** Should a single continuous surrogate model be trained across all flight phases with phase one-hot features, or should separate sub-models be fitted for ground-run, climb, cruise, and descent?
