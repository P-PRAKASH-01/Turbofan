# ENGINE-TWIN — AI-Enabled Digital Twin for Aero Piston Engines (MALE UAV)

**Project:** ENGINE-TWIN  
**Domain:** AI-Enabled Digital Twin for Health Monitoring, Fault Prediction, and Mission Reliability Enhancement of Aero Piston Engines used in Medium-Altitude Long-Endurance (MALE) Unmanned Aerial Vehicles (UAVs).  
**Active Production Digital Twin Root:** [`Engine/v0.2/`](./Engine/v0.2/)  
**Workspace Architecture Status:** Phase 4C Complete & Audited; Scaffolding Ready for UI/UX Frontend & Backend APIs.  

---

> [!IMPORTANT]
> **SIMULATION-FIRST RESEARCH & DEVELOPMENT DISCLAIMER**  
> All engine models, telemetry data, thermal responses, sensor readings, and fault signatures in this project are generated using a physics-informed synthetic aero piston engine simulator (Dataset v0.2.0, 960 flight scenarios across 30 engines).  
> These models and indices **do not** claim validation on physical aircraft engines, FAA/EASA airworthiness certification, or production Remaining Useful Life (RUL) prognostic clearance.

---

## 1. System Architecture Overview

The workspace is organized into a modular full-stack digital twin architecture:

```text
Digital Twin/                                  # Workspace Root
├── README.md                                  # (This file) Project entry point
├── PROJECT_STRUCTURE.md                       # Comprehensive directory blueprint
├── requirements.txt                           # Shared ML & backend dependencies
├── run_backend.bat                            # Windows batch launch script for FastAPI backend
├── run_backend.ps1                            # PowerShell launch script for FastAPI backend
│
├── models/                                    # CONSOLIDATED MODELS & RESEARCH PHASES
│   ├── README.md                              # Model guide & phase summary
│   ├── scenario_heldout_classifier.joblib     # Production 80-tree Random Forest Multi-Class Classifier
│   ├── engine_heldout_classifier.joblib       # Production Engine-Held-Out Classifier Pipeline
│   └── phases/                                # Phase-by-phase directories
│       ├── phase1/                            # Feature matrix, baseline pipeline & summary
│       ├── phase2/                            # RUL estimation model & performance metrics
│       ├── phase3/                            # Diagnostic benchmarks, seed ablations & audits
│       └── phase4/                            # Continuous EHI & SDQI health formulation
│
├── config/                                    # Workspace configuration
│   └── workspace_config.json
│
├── docs/                                      # System Architecture & Technical Specifications
│   ├── architecture/overview.md               # Digital twin mathematical formulation
│   ├── dataset/dataset_spec.md                # 960-scenario synthetic dataset specification
│   ├── experiments/phase_summary.md           # Progression from Phase 1 through Phase 4C
│   └── frontend-backend-contract.md           # REST & WebSocket streaming protocol
│
├── backend/                                   # FastAPI Digital Twin Backend
│   ├── README.md                              # Backend developer guide
│   └── app/                                   # REST endpoints (/api/health, /api/predict), schemas
│
├── frontend/                                  # React + Vite + TypeScript Cockpit Application
│   ├── package.json                           # React 18, Vite, Tailwind, Recharts, Lucide
│   └── src/                                   # Real-time cockpit, kinematics, 3D twin, charts
│
├── scripts/                                   # Workspace Automation
│   └── validate_workspace.py                  # Automated architecture & test verification
│
├── Engine/                                    # Synthetic Aero-Piston Dataset v0.2 Generation
│   ├── configs/                               # Parameter limits & diagnostic thresholds
│   ├── metadata/                              # Scenario manifests, engine pool, dataset card
│   └── v0.2/                                  # v0.2 baseline telemetry data, scripts, and tests
│
└── report/                                    # Academic & Research Deliverables
    └── ENGINE_TWIN_Project_Report.pdf         # Comprehensive project technical report
```
│   │
│   └── [Legacy Dataset v0.1.0 Archive]        # Historical 240-scenario prototype
│
└── [Legacy NASA C-MAPSS Phase 1/2 Archive]    # Turbofan benchmark degradation research
    ├── data/raw/                              # Raw C-MAPSS text files
    ├── artifacts/                             # Phase 1/2 RUL models and feature matrices
    └── src/                                   # Phase 1/2 pipeline scripts
```

---

## 2. Core Capabilities & Health Indices

The active digital twin core in `Engine/v0.2/` provides a dual-index health monitoring architecture:

1. **Engine Health Index (EHI, 0–100):**  
   Measures deviation of 10 physical engine channels ($\text{RPM}, \text{MAP}, \text{CHT}, \text{EGT}, \text{Oil Temp}, \text{Oil Pressure}, \text{Fuel Flow}, \text{Power}, \text{Torque}, \text{Vibration}$) against a dynamic healthy surrogate conditioned on operating conditions (Throttle, Altitude, Ambient Temp, Ambient Pressure, Air Density). Includes causal first-order thermal lag filtering and online baseline adaptation with rollback safeguards.
2. **Sensor Data Quality Index (SDQI, 0–100):**  
   Evaluates sensor plausibility, rate-of-change, stuck signals, and dropout across composite and worst-channel dimensions, gating the EHI to prevent false alarms or masking under degraded sensor telemetry.
3. **8-Class Fault Diagnosis Classifier:**  
   Balanced Random Forest classifier detecting:
   - `normal`
   - `combustion_irregularity`
   - `thermal_abnormality`
   - `efficiency_degradation`
   - `sensor_bias`
   - `sensor_drift`
   - `sensor_stuck`
   - `sensor_dropout`

---

## 3. Quickstart & Verification

### 3.1. Environment Setup
```bash
# Install core Python dependencies
pip install -r requirements.txt
```

### 3.2. Run Automated Verification & Tests
```bash
# Run workspace architecture & test verification script
python scripts/validate_workspace.py

# Or run unit tests directly via unittest discovery
python -m unittest discover -s Engine/v0.2/tests
```
All **32 unit tests** pass cleanly in ~23 seconds.

### 3.3. Start Backend & Frontend (Roadmap)
See [`backend/README.md`](./backend/README.md) and [`frontend/README.md`](./frontend/README.md) for upcoming service startup commands.

---

## 4. Key Documentation Links
- **System Architecture:** [`docs/architecture/overview.md`](./docs/architecture/overview.md)
- **API & Streaming Contract:** [`docs/frontend-backend-contract.md`](./docs/frontend-backend-contract.md)
- **Dataset Specification:** [`docs/dataset/dataset_spec.md`](./docs/dataset/dataset_spec.md)
- **Phase 1–4C Experimental Summary:** [`docs/experiments/phase_summary.md`](./docs/experiments/phase_summary.md)
- **Phase 4C Audit Report:** [`Engine/v0.2/reports/diagnostics_v0.2/phase_4c/phase4c_audit_report.md`](./Engine/v0.2/reports/diagnostics_v0.2/phase_4c/phase4c_audit_report.md)
- **File Inventory:** [`Engine/v0.2/FILE_INVENTORY.csv`](./Engine/v0.2/FILE_INVENTORY.csv)
