# ENGINE-TWIN Project Fact Sheet & Verification Register

**Document ID:** ET-FACT-2026-01  
**Project:** ENGINE-TWIN (Digital Twin Health Monitoring & Fault Diagnostics for a MALE UAV Aero Piston Engine)  
**Verification Date:** October 27, 2026  
**Auditor / Engineer:** Antigravity Engineering System  

---

## 1. System Environment & Software Stack

### 1.1 Operating Environment & Hardware Host
- **Host OS:** Windows 10/11 x86_64
- **Execution Shell:** PowerShell 5.1 / 7.x
- **Python Runtime:** Python 3.11.0 (MSC v.1933 64-bit AMD64)
- **Node.js / NPM:** Node v20+ / npm v10+

### 1.2 Core Python Libraries & Versions
- `scikit-learn`: Random Forest Pipeline with `SimpleImputer`
- `pandas`: 2.0+ (Data manipulation & manifest parsing)
- `numpy`: 1.24+ (PCG64 random state generator, vector operations)
- `scipy`: 1.10+ (Statistical computations & continuous Gaussian decays)
- `joblib`: 1.3+ (Model serialization & deserialization)
- `fastapi`: 0.100+ (High-performance asynchronous REST backend)
- `uvicorn`: 0.22+ (ASGI web server)
- `pydantic`: 1.10 / 2.x (Data validation and type enforcement)
- `matplotlib`: 3.7+ (Academic figures & visualization rendering)
- `python-docx`: 1.1+ (Academic document generation)
- `win32com.client`: PyWin32 (Microsoft Word COM bridge for PDF export)

### 1.3 Frontend Framework & Libraries
- **Build Tool:** Vite v5.1.4 (Fast HMR and Rollup production bundler)
- **Language:** TypeScript v5.2.2 (Strict type safety)
- **UI Library:** React v18.2.0 & React DOM v18.2.0
- **Styling:** Tailwind CSS v3.4.1 & PostCSS v8.4.35 & Autoprefixer v10.4.17
- **Iconography:** Lucide React v0.344.0
- **Visualization:** Recharts v2.12.0 (Time-series telemetry charts) & Custom HTML5 Canvas / SVG (2D Mechanical Piston Kinematics, P-V Indicator Loop, Dyno Performance Curves)
- **Testing:** Vitest v1.6.1 with JSDOM v29.1.1 and React Testing Library v16.3.3

---

## 2. Machine Learning Model Inventory

| Model Component | Artifact Path | Architecture | Status | Feature Count | Target Classes |
|---|---|---|---|---|---|
| **Scenario-Heldout Fault Classifier** | `Engine/v0.2/models/scenario_heldout_classifier.joblib` (4.2 MB) | `Pipeline(SimpleImputer(median, indicator=True) -> RandomForest(n_est=80, max_d=18, min_samples_leaf=4, class_weight='balanced_subsample'))` | **Trained & Deployed** | 39 features | 8 fault classes |
| **Engine-Heldout Fault Classifier** | `Engine/v0.2/models/engine_heldout_classifier.joblib` (5.6 MB) | `Pipeline(SimpleImputer(median, indicator=True) -> RandomForest(n_est=80, max_d=18, min_samples_leaf=4, class_weight='balanced_subsample'))` | **Trained & Evaluated** (Zero-Shot Cross-Engine Transfer) | 39 features | 8 fault classes |
| **Engine Health Index (EHI)** | `simulationPhysics.ts` & `Engine/v0.2/reports/diagnostics_v0.2/phase_4c/` | Physics-residual Gaussian degradation with causal thermal lag & telemetry coverage gate | **Implemented & Validated (Phase 4C Refined)** | 10 residuals | Continuous health index [0–100], 4 discrete operational bands |
| **Sensor Data Quality Index (SDQI)** | `simulationPhysics.ts` & `health_index_refined.py` | Dual metric: Composite SDQI $\text{SDQI}_{\text{comp}}$ and Worst-Channel SDQI $\text{SDQI}_{\text{worst}}$ | **Implemented & Validated** | 10 channel qualities | Continuous quality [0–100], stuck/dropout/drift penalties |
| **Feature Attribution Engine** | `backend/app/main.py` & `simulationPhysics.ts` | Standardized residual weighting: $w_i \cdot (|z_i| + 0.1) \cdot I_i$ normalized to 100% | **Implemented** | 10 channels | Relative percentage attribution ranking |
| **Remaining Useful Life (RUL)** | N/A | Degradation prognostics | **Not Implemented / Explicitly Out of Scope** (No run-to-failure degradation targets in v0.2) | N/A | N/A |

---

## 3. Dataset Specifications (ENGINE-TWIN v0.2)

### 3.1 Dimensions & Cardinality
- **Total Rows:** 115,200 samples
- **Total Scenarios:** 960 scenarios
- **Duration per Scenario:** 120 seconds (120 samples @ 1.0 Hz sample rate)
- **Total Engines:** 30 generic aero-piston engines (train: 18, validation: 6, test: 6)
- **Displacement Range:** 0.60 L to 1.20 L (600 cc to 1200 cc)
- **Rated RPM Range:** 4,200 to 5,200 RPM (Idle: 750 to 1,000 RPM)
- **Rated Power Range:** 35 kW to 85 kW (~47 HP to 115 HP)

### 3.2 Operating Flight Phases
1. `ground_run`: Taxi and pre-flight engine warmup (low speed, rich mixture, high heat accumulation)
2. `climb`: Full-throttle high-power climb to cruise altitude (90–95% throttle, maximum thermal gradient)
3. `cruise`: Long-endurance level flight at altitude (55–75% throttle, steady cooling airflow)
4. `descent`: Low-power descent toward landing pattern (25–40% throttle, engine overcooling risk)

### 3.3 Fault Taxonomy (8 Classes)
- **Nominal Class (1):**
  - `normal`: Pristine engine operation across varied atmospheric and throttle conditions.
- **Physical Engine Degradation Classes (3):**
  - `combustion_irregularity`: Cylinder misfire, ignition timing jitter, unburnt fuel, power drop (-10% to -15%), severe vibration rise (+0.20 g RMS).
  - `thermal_abnormality`: Cooling baffle blockage, radiator fouling, lean detonation; sharp CHT rise (+25°C), EGT surge (+75°C).
  - `efficiency_degradation`: Ring wear, blow-by, intake valve leakage; volumetric efficiency loss (-15%), fuel compensation rise (+4%).
- **Sensor Integrity & Telemetry Failure Classes (4):**
  - `sensor_bias`: Constant additive systematic offset beyond nominal sigma tolerance ($> 3\sigma$).
  - `sensor_drift`: Linear incipient drift over time ($\Delta y = (M/30.0) \cdot (t - t_{\text{onset}})$).
  - `sensor_stuck`: Constant frozen reading refusing to track dynamic operating changes.
  - `sensor_dropout`: Complete signal loss or zero reading ($y_i = 0.0$ or NaN) with dropout probability 0.25.

### 3.4 Telemetry Channels (10 Channels)
1. `rpm`: Engine Crankshaft Speed [RPM] (Range: 600–5,500 RPM, Noise $\sigma = 6.0$ RPM)
2. `manifold_pressure`: Manifold Absolute Pressure (MAP) [kPa / Pa] (Range: 20–110 kPa, Noise $\sigma = 80$ Pa)
3. `cht`: Cylinder Head Temperature [°C] (Range: 20–260 °C, Noise $\sigma = 0.5$ °C)
4. `egt`: Exhaust Gas Temperature [°C] (Range: 100–950 °C, Noise $\sigma = 1.0$ °C)
5. `oil_temp`: Engine Oil Temperature [°C] (Range: 20–150 °C, Noise $\sigma = 0.4$ °C)
6. `oil_pressure`: Lubrication Oil Pressure [kPa] (Range: 100–700 kPa, Noise $\sigma = 0.8$ kPa)
7. `fuel_flow`: Fuel Consumption Mass Flow [kg/s] (Range: 0.0005–0.025 kg/s, Noise $\sigma = 0.00002$ kg/s)
8. `power`: Brake Power Output [kW] (Range: 5.0–150.0 kW, Noise $\sigma = 0.08$ kW)
9. `torque`: Engine Brake Torque [Nm] (Range: 20.0–350.0 Nm, Noise $\sigma = 0.15$ Nm)
10. `vibration`: Vibration Severity RMS [g RMS] (Range: 0.05–3.50 g, Noise $\sigma = 0.02$ g)

### 3.5 Validation Splits & Leakage Prevention
- **Scenario-Heldout Split:** 70% train (672 scenarios), 15% validation (144 scenarios), 15% test (144 scenarios, 10,440 test samples). Evaluates trajectory generalization within the same engine fleet.
- **Engine-Heldout Split:** 18 train engines (576 scenarios), 6 validation engines (192 scenarios), 6 test engines (192 scenarios, 23,040 test samples). Evaluates zero-shot transfer across completely unseen engine geometry parameters.
- **Leakage Controls:** `scenario_id`, `engine_id`, `fault_type`, `severity`, and raw synthetic ground-truth states are strictly isolated from the predictor matrix.

---

## 4. Physics Simulator Formulation & Calibrations

### 4.1 Atmospheric Model (ICAO Standard Troposphere)
$$T(h) = T_0 - L \cdot h + \Delta T_{\text{offset}}$$
$$P(h) = P_0 \cdot \left(\frac{T(h)}{T_0}\right)^{\frac{g}{R \cdot L}}$$
$$\rho(h) = \frac{P(h)}{R \cdot T(h)}$$
- Sea-level pressure $P_0 = 101,325\text{ Pa}$, temperature $T_0 = 288.15\text{ K}$, lapse rate $L = 0.0065\text{ K/m}$, gas constant $R = 287.05\text{ J/(kg}\cdot\text{K)}$.

### 4.2 Manifold Absolute Pressure (MAP)
$$\text{MAP}(h, \delta_{\text{th}}) = P_{\text{ambient}}(h) \cdot \left(0.40 + 0.55 \cdot \frac{\delta_{\text{th}}}{100}\right) \cdot \left(1.0 + 0.20 \cdot \min\left(2.0, \frac{h}{1500}\right)\right)$$
- **Calibrated Verification:** At $\delta_{\text{th}} = 65\%$ and $h = 1,500\text{ m}$, $\text{MAP} \approx 76.8\text{ kPa}$ (strictly within the 70–90 kPa flight envelope).

### 4.3 Brake Power & Engine Torque
$$P_{\text{brake}} = P_{\text{rated}} \cdot \left(0.12 + 0.88 \cdot \left(\frac{\delta_{\text{th}}}{100}\right)^{1.12}\right) \cdot \left(\frac{\rho(h)}{\rho_0}\right)^{0.35}$$
$$\tau = \frac{P_{\text{brake}} \cdot 1000}{\omega} = \frac{P_{\text{brake}} \cdot 9548.8}{\text{RPM}}$$
- **Calibrated Verification:** At 65% throttle and 1,500 m, $P_{\text{brake}} \approx 64.2\%$ of rated power ($28.9\text{ kW}$ for a $45\text{ kW}$ engine), matching the 60–70% rated power requirement. Peak dyno power exactly matches rated engine power.

### 4.4 Thermal Dynamics (Causal Discrete Filter)
$$T_{k} = T_{k-1} + \frac{\Delta t}{\tau_{\text{thermal}} + \Delta t} \cdot (T_{\text{target}, k} - T_{k-1})$$
- CHT and EGT dynamic time constant $\tau = 25.0\text{ s}$; Oil temperature time constant $\tau = 60.0\text{ s}$.

### 4.5 P-V Indicator Otto Cycle
- Realized with 4 thermodynamic strokes:
  1. Intake ($1 \to 2$): Constant MAP pressure from $V_c$ to $V_1$.
  2. Isentropic Compression ($2 \to 3$): $P \cdot V^\gamma = \text{const}$, $P_3 = P_2 \cdot r_c^\gamma$ ($\gamma = 1.35$).
  3. Isochoric Heat Addition & Expansion ($3 \to 4 \to 5$): Peak combustion pressure $P_4 = 4.2 \cdot P_3 \cdot \eta_{\text{combustion}}$, then isentropic power stroke $P_5 = P_4 \cdot (1 / r_c)^\gamma$.
  4. Exhaust Blowdown & Expulsion ($5 \to 6 \to 1$): Blowdown to ambient exhaust pressure.

### 4.6 Continuous Sensor Quality ($q_i$) & Dual SDQI
$$z_i = \frac{y_i - \hat{y}_i}{\sigma_{\text{noise}, i}}, \quad \tau_i = \tau_{\text{nominal}, i} \cdot \left(1.0 + 0.15 \cdot \frac{\delta_{\text{th}}}{100}\right)$$
$$q_{\text{residual}, i} = \exp\left(-0.5 \cdot \left(\frac{\max(0, |z_i| - \tau_i)}{\beta_i}\right)^2\right)$$
$$q_i = \max(0.0, \min(1.0, q_{\text{dropout}, i} \cdot q_{\text{residual}, i} \cdot q_{\text{stuck}, i}))$$
$$\text{SDQI}_{\text{comp}} = \sum_{i=1}^{10} w_{\text{sdqi}, i} \cdot q_i \cdot 100$$
$$\text{SDQI}_{\text{worst}} = \min_{i} (q_i \cdot 100)$$

### 4.7 Engine Health Index (EHI) & Coverage Gate
$$h_i = \exp\left(-0.5 \cdot \left(\frac{\max(0, |z_i| - \tau_i)}{\beta_i}\right)^2\right)$$
$$\text{EHI}_{\text{raw}} = \frac{\sum_{i=1}^{10} w_{\text{ehi}, i} \cdot q_i \cdot h_i}{\sum_{i=1}^{10} w_{\text{ehi}, i} \cdot q_i} \cdot 100$$
- **Telemetry Coverage Failsafe:** If $\sum w_{\text{ehi}, i} q_i < 0.80$, or fewer than 7 channels have $q_i \ge 0.50$, or RPM sensor is invalid ($q_{\text{rpm}} < 0.50$), $\text{EHI}$ is set to `null` with status `INSUFFICIENT_TELEMETRY_COVERAGE`.

---

## 5. Verified Empirical Model Metrics

### 5.1 Offline Classifier Evaluation

| Metric | Scenario-Heldout Split | Engine-Heldout Split (Zero-Shot Transfer) |
|---|---|---|
| **Total Test Samples** | 10,440 | 23,040 |
| **Correct Predictions** | 4,809 | 10,479 |
| **Overall Accuracy** | **46.06%** (0.4606) | **45.48%** (0.4548) |
| **Macro F1 Score** | **46.65%** (0.4665) | **47.40%** (0.4740) |
| **Weighted F1 Score** | **47.60%** (0.4760) | **47.40%** (0.4740) |

### 5.2 Per-Class Breakdown

| Fault Class | Scenario Precision | Scenario Recall | Scenario F1 | Engine Precision | Engine Recall | Engine F1 |
|---|---|---|---|---|---|---|
| `combustion_irregularity` | 66.19% | 66.89% | **66.54%** | 77.56% | 58.09% | **66.43%** |
| `efficiency_degradation` | 89.50% | 58.61% | **70.84%** | 90.72% | 59.41% | **71.80%** |
| `thermal_abnormality` | 80.71% | 63.06% | **70.80%** | 80.02% | 62.85% | **70.40%** |
| `normal` | 24.24% | 48.48% | **32.32%** | 23.46% | 58.75% | **33.53%** |
| `sensor_bias` | 41.05% | 33.08% | **36.64%** | 35.55% | 22.26% | **27.38%** |
| `sensor_drift` | 28.90% | 25.68% | **27.20%** | 37.79% | 32.22% | **34.78%** |
| `sensor_dropout` | 30.71% | 35.42% | **32.89%** | 26.85% | 28.30% | **27.56%** |
| `sensor_stuck` | 42.68% | 31.08% | **35.97%** | 54.24% | 41.98% | **47.33%** |

---

## 6. Verification & Test Suite Results

- **Python Diagnostics Test Suite (`Engine/v0.2/tests/`):**
  - Ran `python -m unittest discover -s Engine/v0.2/tests -p "test_*.py"`
  - Total tests executed: **32 tests**
  - Result: **32 passed, 0 failed, 0 errors** (Duration: 21.94s)
- **Frontend Vitest Test Suite (`frontend/src/test/`):**
  - Ran `npx vitest run`
  - Total test files: **5 passed** (`tab2Refinements`, `simulationPhysics`, `instrumentComponents`, `simulationControlsAndContext`, `navigationAndSimulationTab`)
  - Total tests executed: **26 tests**
  - Result: **26 passed, 0 failed** (Duration: 90.37s)
- **Frontend Production Build:**
  - Ran `npm run build` (`tsc && vite build`)
  - Modules transformed: 1,487
  - Output bundle: `dist/assets/index-BFCsumKj.js` (1,613.18 kB, gzip 313.27 kB)
  - Result: **Build clean, 0 TypeScript errors**
- **FastAPI Backend Service:**
  - Endpoint `/api/health` verified returning `status: "online"`, `model_loaded: true`, `classes: 8`, `feature_count: 39`.
  - Endpoint `/api/predict` verified returning valid class probabilities, standardized anomaly scores, and feature attributions within 4.5 ms latency.
