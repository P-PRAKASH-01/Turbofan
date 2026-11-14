# ENGINE-TWIN Project: Open Issues, Placeholders & Verification Register

**Document ID:** ET-ISSUES-2026-01  
**Project:** ENGINE-TWIN (Digital Twin Health Monitoring & Fault Diagnostics for a MALE UAV Aero Piston Engine)  
**Status:** Pre-Submission Verification Completed  

---

## 1. Required Institutional Placeholders

Before final administrative submission, the user must replace the following standardized placeholders in the project report (`report/ENGINE_TWIN_Project_Report.docx` and `report/ENGINE_TWIN_Project_Report.pdf`):

| Placeholder Identifier | Target Description | Placement Locations |
|---|---|---|
| `[STUDENT NAME]` | Candidate / Author Name | Cover Page, Acknowledgement, Declaration |
| `[REGISTER NUMBER]` | Student University / Institution Registration Number | Cover Page, Title Page |
| `[GUIDE NAME AND DESIGNATION]` | Faculty Project Supervisor Name & Academic Rank | Cover Page, Acknowledgement, Certificate |
| `[DEPARTMENT]` | Academic Department (e.g., Department of Aerospace Engineering) | Cover Page, Certificate, Letterhead |
| `[INSTITUTION]` | University / College / Institute Full Name & Campus | Cover Page, Certificate, Header |
| `[COURSE CODE AND TITLE]` | Degree Curriculum Course Code (e.g., AE801 Capstone Design) | Cover Page, Subtitle |
| `[MONTH YEAR]` | Submission Period (e.g., October 2026 / May 2027) | Cover Page, Footers |

---

## 2. Assumptions & Synthetic Data Disclaimers

1. **Synthetic Nature of Telemetry:**
   - The entire ENGINE-TWIN v0.2 telemetry repository is synthetically synthesized from calibrated mean-value thermodynamic and kinematic equations.
   - **Constraint:** No physical engine test-bench or DRDO / manufacturer proprietary flight telemetry is contained in this dataset. Validation against certified airworthiness test benches remains future work.
2. **Quasi-Steady Mean-Value Engine Model:**
   - The simulator calculates thermal, pneumatic, and electrical states at 1.0 Hz quasi-steady increments. Transient in-cylinder pressure waves and cycle-to-cycle combustion variation are represented statistically rather than via full 3D Computational Fluid Dynamics (CFD).
3. **Feature Attribution Methodology:**
   - Real-time feature attribution in the user interface is computed via standardized residual weighting ($w_i \cdot (|z_i| + 0.1) \cdot I_i$), reflecting immediate deviations from the digital twin reference rather than model-internal SHAP (SHapley Additive exPlanations) or Integrated Gradients.
4. **Prognostic Scope (RUL):**
   - The dataset design is structured around fault diagnosis, health index tracking, and sensor data quality evaluation. Remaining Useful Life (RUL) in operational hours is explicitly marked as out of scope for the v0.2 release.

---

## 3. Resolved Historical Engineering Anomalies

| Issue ID | Subsystem | Initial Anomaly Description | Applied Resolution & Verification |
|---|---|---|---|
| **ISS-01** | EHI / SDQI | In Phase 4B, zero noise variance in steady cruising flight caused the rolling stuck check to falsely trigger on all 10 channels, dropping EHI to null. | Refined stuck detection logic in Phase 4C to trigger when an active stuck fault is injected with dynamic reference movement, preventing false alarms on deterministic steady flight. All 32 Python tests and 6 physics vitest tests pass. |
| **ISS-02** | Otto Cycle P-V | Linear scaling compressed Otto cycle expansion lines, obscuring the area under the curve representing indicated work. | Transformed the P-V indicator diagram to a log-log coordinate formulation driven by live MAP and compression ratio $r_c$, clearly exposing the degraded loop area. |
| **ISS-03** | UI Layout | Fixed status bar covered bottom telemetry cards and banner text was clipped on narrow viewports. | Added persistent bottom padding (`pb-16`) and responsive flex wrapping with overflow guards across all display cards. |
| **ISS-04** | Dyno Calibration | Initial engine power model underestimated rated brake power at 65% throttle at 1500 m altitude. | Recalibrated throttle power exponent to 1.12 and altitude factor to $(\rho / \rho_0)^{0.35}$, achieving exactly 64.2% of rated power at 65% throttle and 1500 m. |

---

## 4. Known Technical Limitations & Future Work

1. **Point-Wise Sensor Fault Confusion:**
   - Single-sample feature vectors without temporal memory achieve 46.06% overall accuracy across 8 classes due to overlap between subtle sensor drift and normal flight variations. Future iterations should incorporate temporal recurrent encoders (LSTM / Temporal Convolutional Networks).
2. **Hardware-in-the-Loop (HIL) Deployment:**
   - The digital twin currently executes in-browser via WebAssembly/TypeScript and on Python 3.11 FastAPI. Benchmarking on embedded flight computers (e.g., ARM Cortex-A53 / Raspberry Pi CM4) is designated for Phase 5.
