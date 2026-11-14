# ENGINE-TWIN — Workspace Architecture & Project Structure

**Document ID:** `ET-ARCH-STR-001`  
**Version:** 3.0.0  
**Date:** 2026-11-14  
**Workspace Root:** `c:\Users\Admin\OneDrive\Documents\Digital Twin`  

---

## 1. High-Level Workspace Architecture

The workspace is organized into a modular full-stack digital twin architecture separating the active ML digital twin core, trained production models and research phases, FastAPI backend service, React frontend dashboard, documentation, and reporting.

```text
Digital Twin/                                  # Workspace & Git Root
├── .gitignore                                 # Unified root ignore policy (bytecode, logs, build artifacts)
├── README.md                                  # Primary workspace entry point & quickstart guide
├── PROJECT_STRUCTURE.md                       # (This file) Complete workspace directory blueprint
├── requirements.txt                           # Unified Python dependencies (FastAPI, scikit-learn, etc.)
├── run_backend.bat                            # Windows batch launch script for FastAPI backend
├── run_backend.ps1                            # PowerShell launch script for FastAPI backend
│
├── models/                                    # CONSOLIDATED PRODUCTION MODELS & PHASES
│   ├── README.md                              # Model inventory and phase documentation index
│   ├── scenario_heldout_classifier.joblib     # Production 80-tree Random Forest Multi-Class Classifier
│   ├── engine_heldout_classifier.joblib       # Production Engine-Held-Out Classifier Pipeline
│   ├── *_confusion_matrix.csv                 # Performance confusion matrices across all 8 classes
│   ├── *_per_class_metrics.csv                # Precision, recall, and F1 metrics
│   ├── *_test_predictions.csv                 # Evaluated test split predictions
│   └── phases/                                # Phase-by-phase research, training pipelines & reports
│       ├── phase1/                            # Phase 1: Feature Matrix, Baseline EDA & Pipeline
│       ├── phase2/                            # Phase 2: RUL Estimation Model & Metrics
│       ├── phase3/                            # Phase 3: Multi-Class Diagnostics, Seed Ablations & Audits
│       └── phase4/                            # Phase 4: EHI Health Index & SDQI Formulations
│
├── backend/                                   # FastAPI Digital Twin Model Service
│   ├── README.md                              # Backend service guide & setup instructions
│   ├── app/
│   │   ├── main.py                            # FastAPI application entry point (/api/health, /api/predict)
│   │   ├── api/                               # REST & WebSocket route endpoints
│   │   ├── core/                              # App configuration, security, and logging
│   │   ├── schemas/                           # Pydantic v2 telemetry & request models
│   │   └── services/                          # Twin runner, stream coordinator, model loader
│   └── tests/                                 # API and streaming unit tests
│
├── frontend/                                  # React + Vite + TypeScript Cockpit & Web UI
│   ├── package.json                           # Dependencies (React 18, Vite, Tailwind, Recharts, Lucide)
│   ├── public/                                # High-res 3D Engine graphics & static assets
│   └── src/
│       ├── components/                        # Instruments, gauges, charts, navigation, modals
│       ├── context/                           # SimulationContext (physics clock, state, fleet selection)
│       ├── features/                          # Simulation 2D kinematics, 3D cutaway view, diagnostics
│       ├── layouts/                           # DashboardLayout & master header shells
│       ├── pages/                             # HomePage, SimulationPage, Monitoring, Analytics, Reports, About
│       ├── services/                          # Telemetry service, physics simulation, Web Audio engine
│       └── types/                             # TypeScript interface definitions matching backend contract
│
├── config/                                    # Workspace-Level Configuration
│   └── workspace_config.json                  # Active project paths, default seeds, and service ports
│
├── data/                                      # Reference Turbofan & Provenance Datasets
│   ├── raw/                                   # C-MAPSS degradation benchmark text files
│   └── validated/                             # Validated baseline sets
│
├── docs/                                      # Cross-Cutting System Documentation & Contracts
│   ├── architecture/                          # High-level digital twin system architecture
│   ├── dataset/                               # 960-scenario synthetic dataset specification
│   ├── experiments/                           # Chronological summary of research phases
│   └── frontend-backend-contract.md           # REST & WebSocket streaming protocol specification
│
├── Engine/                                    # Aero-Piston Dataset v0.2 Generation & Metadata
│   ├── configs/                               # Parameter registers & engine bounds
│   ├── metadata/                              # Dataset cards & scenario manifests
│   ├── raw/                                   # Synthetic telemetry raw sets
│   ├── processed/                             # Preprocessed baseline features
│   ├── splits/                                # Scenario-held-out and engine-held-out train/test splits
│   └── v0.2/                                  # Complete v0.2 baseline data, scripts, and tests
│
├── report/                                    # Academic & Research Deliverables
│   ├── figures/                               # Architecture diagrams, plots, and figures
│   ├── code_listings/                         # Source code listings for reports
│   └── ENGINE_TWIN_Project_Report.pdf         # Comprehensive project technical report
│
└── scripts/                                   # Workspace Automation & Verification
    └── validate_workspace.py                  # Automated path, schema, and test discovery runner
```

---

## 2. Structure Highlights & Clean Design

1. **Clean Root Level**: Removed obsolete standalone prototypes (`cockpit_desktop.html`, `cockpit_mobile.html`) and redundant scratch folders (`artifacts/`, `src/`).
2. **Unified `models/phases/` Hierarchy**: All research phases (`phase1` through `phase4`) are cleanly consolidated under `models/phases/` without excessive nesting, debug attempt logs, or duplicate directory structures.
3. **Dedicated Frontend & Backend**: Strict separation between the FastAPI inference server (`backend/`) and modern React cockpit application (`frontend/`).
