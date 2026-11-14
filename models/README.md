# ENGINE-TWIN Models & Research Phases Directory

This directory contains the trained machine learning estimators, diagnostic pipelines, and phase-by-phase development artifacts for the **ENGINE-TWIN** UAV Aero-Piston Digital Twin.

---

## 1. Production Model Checkpoints

The top-level `models/` folder contains the active, production-ready inference models utilized by the FastAPI backend service:

| File | Type | Description |
| :--- | :--- | :--- |
| `scenario_heldout_classifier.joblib` | Scikit-Learn Pipeline | 80-tree Random Forest Multi-Class Diagnostic Classifier (Scenario-held-out protocol) |
| `engine_heldout_classifier.joblib` | Scikit-Learn Pipeline | Random Forest Classifier trained and validated on unseen engine identities |
| `*_confusion_matrix.csv` | CSV | Multi-class confusion matrices across all 8 diagnostic classes |
| `*_per_class_metrics.csv` | CSV | Precision, Recall, and F1-Scores across all operating fault classes |
| `*_test_predictions.csv` | CSV | Test split inference predictions & ground truth labels |

---

## 2. Research & Development Phases (`models/phases/`)

Development and experimental validation is organized into dedicated, phase-by-phase directories:

### [`phase1/`](./phases/phase1/) — Feature Matrix & Health Baseline
- Initial feature extraction pipelines (`phase1_pipeline.py`)
- Extracted statistical feature matrix (`phase1_feature_matrix.csv.gz` - compressed for repository hosting)
- Engine health baseline summaries (`engine_health_summary.csv`, `phase1_summary.json`)
- Exploratory data analysis notebook (`Phase1.ipynb`)

### [`phase2/`](./phases/phase2/) — Remaining Useful Life (RUL) Estimation
- Trained RUL prediction model (`rul_model.joblib`)
- RUL training pipeline (`phase2_model.py`)
- Test RUL predictions & performance metrics (`phase2_metrics.json`, `test_rul_predictions.csv`, `validation_metrics.csv`)

### [`phase3/`](./phases/phase3/) — Multi-Class Fault Diagnostics & Seed Ablations
- Benchmark evaluations across multi-class failure modes (`diagnostic_results.json`, `baseline_diagnostics.md`)
- Temporal feature ablation analysis (`phase3b_report.md`, `temporal_ablation_results.json`)
- Seed robustness comparisons across random initializations (`phase3c_seed_report.md`, `phase3d_report.md`, `aggregate_metrics.csv`)
- Stratified error and persistent confusion analysis (`phase3e_error_analysis.md`, `phase3f_stratified_error_analysis.md`)
- Detection latency and alert suppression policies (`phase3g_evaluation_protocol_audit.md`, `phase3h_alert_policy_report.md`, `phase3i_audit_report.md`)

### [`phase4/`](./phases/phase4/) — Health Index (EHI) & Sensor Data Quality Index (SDQI)
- Continuous Health Index mathematical formulation (`health_index_formulation.json`, `phase4a_health_index_design.md`)
- Multi-channel surrogate modeling and residual evaluation (`phase4b_implementation_report.md`, `health_index_implementation.py`)
- SDQI confidence weighting and failure analysis (`phase4b1_failure_analysis.md`)
- Refined production EHI implementation & audit report (`phase4c_refinement_report.md`, `health_index_refined.py`, `phase4c_audit_report.md`)
