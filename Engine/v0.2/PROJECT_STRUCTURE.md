# ENGINE-TWIN v0.2 — Project Architecture & Directory Structure Guide

**Document ID:** `ET-P4-STRUC-001`  
**Version:** 0.2.0  
**Date:** 2026-10-14  
**Author:** Antigravity Senior Python/ML Engineer & Project Architect  
**Project Root:** `Engine/v0.2/`  
**System Status:** Pre-Frontend Architectural Baseline — Phase 4C Audited  

---

> [!IMPORTANT]
> **SIMULATION-FIRST EXPERIMENTAL BOUNDARY DISCLAIMER**  
> All data, models, metrics, and telemetry in ENGINE-TWIN v0.2 originate exclusively from a generic synthetic aero-piston digital twin simulation model. The digital twin architecture and health monitoring models evaluate synthetic ground truth and do not represent certified airworthiness data or real physical engine flight performance.

---

## 1. Executive Architectural Overview

ENGINE-TWIN v0.2 is an AI-enabled digital twin system for condition monitoring, anomaly detection, fault classification, and health index assessment of aero piston engines in MALE UAVs.

This document defines the authoritative project directory architecture, file locations, module responsibilities, and artifact dependencies established prior to frontend UI/UX development.

### Key Architectural Tenets
1. **Strict Immutability of Verified Artifacts:** Historical diagnostic phases (Phase 3A–3I) and health index evaluations (Phase 4A–4C) are preserved as permanent benchmark evidence with cryptographic SHA-256 manifests.
2. **Deterministic Data Provenance:** Dataset v0.2 generation, feature engineering, and split allocations are strictly reproducible from random seeds and configuration specifications.
3. **Clean Separation of Concerns:** Core pipelines (`src/`), operational tests (`tests/`), models (`models/`), dataset files (`data/`), and metadata/splits (`metadata/`, `splits/`) have clear, disjoint boundaries.
4. **Readiness for UI/UX Integration:** Future frontend client code (`frontend/`) and operational backend service APIs (`backend/`) have reserved top-level locations that interface cleanly with existing models and health indices.

---

## 2. Definitive Project Directory Tree

```text
Engine/v0.2/
├── .gitignore                          # Standard Python bytecode, cache, and OS ignore rules
├── README.md                           # Primary project overview, environment setup, and pipeline guide
├── requirements.txt                    # Python runtime and ML dependencies manifest
├── FILE_INVENTORY.csv                  # Itemized inventory of all 284+ project files with SHA-256 hashes
├── PROJECT_STRUCTURE.md                # This authoritative directory architecture reference
├── REORGANIZATION_CHANGELOG.md         # Comprehensive audit changelog and restructuring log
├── CLEANUP_VERIFICATION.md             # Verification test logs, path resolution checks, and integrity audits
│
├── config/                             # Authoritative simulation and physical equation configuration
│   └── dataset_config.json             # Core parameter register, engine pool, sensor noise, and fault definitions
│
├── data/                               # Authoritative Dataset v0.2 telemetry data files
│   ├── raw/
│   │   └── engine_twin_v0.2_raw.csv    # 120-second synthetic telemetry timeseries (115,200 rows, 89.8 MB)
│   └── processed/
│       ├── features.csv                # 29 baseline diagnostic + 40 temporal features (37.4 MB)
│       ├── feature_lineage.csv         # Row-level scenario ID, engine ID, phase, and time alignment (8.1 MB)
│       └── labels.csv                  # Ground-truth fault class, severity, and onset annotations (5.2 MB)
│
├── metadata/                           # Dataset provenance manifests and data dictionary
│   ├── dataset_card.json               # Dataset metadata, provenance hashes, and simulator parameters
│   ├── data_dictionary.csv             # Formal specification of all 29 physical sensor channels and units
│   ├── engine_manifest.csv             # Physical parameters (displacement, idle/rated RPM) for all 30 engines
│   ├── scenario_manifest.csv           # Flight profile, phase, fault type, and onset for all 960 scenarios
│   ├── parameter_register.csv          # Simulator physical constants, atmospheric models, and exponents
│   ├── feature_pipeline.json           # Feature engineering pipeline metadata and rolling window definitions
│   └── schema_and_artifact_inventory.md# Technical inventory of Dataset v0.2 schema and artifacts
│
├── splits/                             # Authoritative cross-validation split allocations
│   ├── scenario_train_scenarios.csv    # 696 training scenarios (80% scenario-stratified partition)
│   ├── scenario_validation_scenarios.csv # 177 validation scenarios (20% scenario-stratified partition)
│   ├── scenario_test_scenarios.csv     # 87 held-out test scenarios (stratified evaluation split)
│   ├── engine_train_engines.csv        # 18 training engines (60% engine-held-out partition)
│   ├── engine_train_scenarios.csv      # 576 training scenarios on train engines
│   ├── engine_validation_engines.csv   # 6 validation engines (20% engine-held-out partition)
│   ├── engine_validation_scenarios.csv # 192 validation scenarios on validation engines
│   ├── engine_test_engines.csv         # 6 unseen test engines (20% engine-held-out partition)
│   └── engine_test_scenarios.csv       # 192 test scenarios on unseen engines
│
├── models/                             # Trained frozen diagnostic classifier models and baseline outputs
│   ├── scenario_heldout_classifier.joblib # Model A Random Forest classifier for scenario-held-out protocol (4.2 MB)
│   ├── scenario_heldout_confusion_matrix.csv # Confusion matrix on scenario-held-out test set
│   ├── scenario_heldout_per_class_metrics.csv # Precision, recall, and F1 per fault class
│   ├── scenario_heldout_test_predictions.csv  # Probabilities and class predictions per sample
│   ├── engine_heldout_classifier.joblib   # Model B Random Forest classifier for engine-held-out protocol (5.6 MB)
│   ├── engine_heldout_confusion_matrix.csv # Confusion matrix on engine-held-out test set
│   ├── engine_heldout_per_class_metrics.csv # Precision, recall, and F1 per fault class
│   └── engine_heldout_test_predictions.csv  # Probabilities and class predictions per sample
│
├── src/                                # Core data generation, feature engineering, and training pipelines
│   ├── __init__.py                     # Package initialization marker
│   ├── generate_dataset.py             # Deterministic synthetic simulation engine (physics, faults, atmosphere)
│   ├── build_features.py               # Feature extraction pipeline (diagnostic + rolling temporal features)
│   ├── validate_dataset.py             # Multi-layer dataset integrity, leakage, and provenance validator
│   └── train_baselines.py              # Diagnostic classifier baseline training (Model A and Model B)
│
├── tests/                              # Automated test suites (unit, regression, and validation tests)
│   ├── test_dataset_validation.py      # Automated tests verifying dataset schema, splits, and provenance
│   ├── test_phase4b_health_index.py    # Unit tests verifying Phase 4B baseline EHI and SDQI logic
│   └── test_phase4c_health_index.py    # Comprehensive tests verifying Phase 4C refinements (32 tests total)
│
├── reports/                            # Historical validation reports and experimental phase evaluations
│   ├── baseline_results.json           # Baseline diagnostic training evaluation metrics
│   ├── baseline_results.md             # Baseline diagnostic summary documentation
│   ├── column_statistics.csv           # Parametric distributions of all raw telemetry columns
│   ├── split_coverage.csv              # Class-balance coverage across scenario and engine splits
│   ├── validation_report.json          # Machine-readable output of dataset validation suite
│   ├── validation_report.md            # Comprehensive Dataset v0.2 validation audit report
│   │
│   └── diagnostics_v0.2/               # Systematic experimental progression (Phases 3A through 4C)
│       ├── baseline_diagnostics.md     # Diagnostic baseline summary
│       ├── diagnostic_results.json     # Baseline classification metrics
│       ├── engine_heldout_confusion_matrix.csv
│       ├── engine_heldout_per_class_metrics.csv
│       ├── scenario_heldout_confusion_matrix.csv
│       ├── scenario_heldout_per_class_metrics.csv
│       │
│       ├── phase_3b/                   # Temporal feature ablation evaluation (29 vs 69 features)
│       ├── phase_3c_seed_8675309/      # Evaluation under fixed diagnostic seed 8675309
│       ├── phase_3d/                   # Five-seed robustness evaluation (seeds, failed runs, aggregate F1)
│       ├── phase_3e/                   # Classwise error analysis and confusion breakdown
│       ├── phase_3f/                   # Stratified error analysis across flight phases and operational regimes
│       ├── phase_3g/                   # Evaluation protocol audit (clean vs overall detection latency)
│       ├── phase_3h/                   # Alert policy comparison (Policies A through E, false alarm trade-offs)
│       ├── phase_3i/                   # Independent audit of diagnostic metrics, latency, and code parity
│       ├── phase_4a/                   # Health Index Design (EHI & SDQI formulation, math, and architecture)
│       ├── phase_4b/                   # Health Index Implementation & Baseline Experimental Validation
│       ├── phase_4b1/                  # Failed-Hypothesis Root-Cause Investigation (H1, H2, H4, H6, H7)
│       └── phase_4c/                   # Refined Health Index Implementation, Validation, & Independent Audit
│           ├── health_index_refined.py # Authoritative refined EHI + SDQI system implementation
│           ├── phase4c_refined_config.json # Frozen validation-calibrated parameters
│           ├── phase4c_ehi_sdqi_evaluation.csv # Full evaluation metrics across 36 categories
│           ├── phase4c_hypothesis_comparison.csv # Head-to-head comparison against Phase 4B baseline
│           ├── phase4c_integrity_checks.csv # Forensic audit checks across 17 validation criteria
│           ├── phase4c_refinement_report.md # Comprehensive engineering report for Phase 4C
│           ├── phase4c_audit_report.md # Independent auditor verification report
│           ├── phase4c_residual_failure_analysis.md # Detailed root-cause analysis of residual failure modes
│           ├── run_phase4c_evaluation.py # Reproducible evaluation pipeline script
│           └── checksums.json          # SHA-256 cryptographic manifest tracking all Phase 4C deliverables
│
├── backend/                            # [RESERVED] Future REST/WebSocket API service (FastAPI)
└── frontend/                           # [RESERVED] Future UI/UX application (React / Vite / Tailwind)
```

---

## 3. Authoritative Locations of Core Artifacts

### 3.1. Datasets & Features
- **Raw Telemetry:** `Engine/v0.2/data/raw/engine_twin_v0.2_raw.csv`
- **Engineered Features:** `Engine/v0.2/data/processed/features.csv`
- **Lineage Metadata:** `Engine/v0.2/data/processed/feature_lineage.csv`
- **Ground-Truth Labels:** `Engine/v0.2/data/processed/labels.csv`

### 3.2. Configuration & Parameter Registers
- **Master Simulation Config:** `Engine/v0.2/config/dataset_config.json`
- **Data Dictionary:** `Engine/v0.2/metadata/data_dictionary.csv`
- **Physical Engine Specifications:** `Engine/v0.2/metadata/engine_manifest.csv`
- **Flight Scenarios Manifest:** `Engine/v0.2/metadata/scenario_manifest.csv`
- **Frozen Health Index Config (Phase 4C):** `Engine/v0.2/reports/diagnostics_v0.2/phase_4c/phase4c_refined_config.json`

### 3.3. Machine Learning Models
- **Diagnostic Classifier (Scenario-Heldout):** `Engine/v0.2/models/scenario_heldout_classifier.joblib`
- **Diagnostic Classifier (Engine-Heldout):** `Engine/v0.2/models/engine_heldout_classifier.joblib`
- **Authoritative Health Index System (EHI + SDQI):** `Engine/v0.2/reports/diagnostics_v0.2/phase_4c/health_index_refined.py`

### 3.4. Test Suites
- **Dataset & Provenance Tests:** `Engine/v0.2/tests/test_dataset_validation.py` (10 tests)
- **Phase 4B Baseline Unit Tests:** `Engine/v0.2/tests/test_phase4b_health_index.py` (9 tests)
- **Phase 4C Refinement Unit Tests:** `Engine/v0.2/tests/test_phase4c_health_index.py` (13 tests)
- **Execution Command:** `python -m unittest discover -s Engine/v0.2/tests` (**32 of 32 tests passing**)

---

## 4. Separation from Legacy Workspace Artifacts

The repository workspace (`c:\Users\Admin\OneDrive\Documents\Digital Twin`) contains historical files from earlier research efforts that predate ENGINE-TWIN v0.2. These artifacts are strictly separated:

1. **Legacy Turbofan RUL Baseline (NASA C-MAPSS FD001–FD004):**
   - Located at workspace root: `data/raw/train_FD*.txt`, `artifacts/phase1/`, `artifacts/phase2/`, `src/phase1_pipeline.py`, `src/phase2_model.py`.
   - Represents early benchmark exploratory work on turbofan remaining useful life. It is not part of the aero piston digital twin codebase.
2. **ENGINE-TWIN Dataset v0.1 (Legacy Precursor):**
   - Located at workspace root: `Engine/configs/`, `Engine/processed/`, `Engine/raw/`, `Engine/splits/`, `Engine/generate_engine_twin_dataset.py`.
   - Represents the preliminary single-scenario dataset v0.1 that was superseded by Dataset v0.2.
3. **ENGINE-TWIN v0.2 (Active Production Root):**
   - Self-contained inside `Engine/v0.2/`. Contains all production pipelines, configs, tests, diagnostic classifiers, and digital twin health monitoring indices.
