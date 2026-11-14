# Experimental Phase Progression Summary

**Document ID:** `ET-DOC-EXP-001`  
**Version:** 1.0.0  
**Date:** 2026-10-14  

---

## 1. Experimental Progression Matrix

| Phase | Title / Scope | Key Deliverables & Milestones | Primary Outcome |
|---|---|---|---|
| **Phase 1** | Turbofan Baseline (NASA C-MAPSS) | `artifacts/phase1/`, `src/phase1_pipeline.py` | Initial exploratory baseline on turbofan RUL data. |
| **Phase 2** | Multi-Unit Prognostics (NASA C-MAPSS) | `artifacts/phase2/rul_model.joblib` | Gradient Boosting RUL regression benchmark. |
| **Dataset v0.2** | Aero Piston Simulator Generation | `Engine/v0.2/src/generate_dataset.py` | 960 synthetic scenarios, 30 engines, 10 sensors. |
| **Phase 3A** | Diagnostic Baseline Classification | `Engine/v0.2/models/` | Model A (29 features) & Model B (69 features). |
| **Phase 3B–3D** | Temporal Ablation & 5-Seed Robustness | `reports/diagnostics_v0.2/phase_3d/` | Confirmed 69-feature superiority across 5 seeds. |
| **Phase 3E–3F** | Error Analysis & Operational Regimes | `reports/diagnostics_v0.2/phase_3f/` | Stratified analysis across ground run, climb, cruise, descent. |
| **Phase 3G–3I** | Protocol Audit & Alert Policies | `reports/diagnostics_v0.2/phase_3i/` | Policies A–E evaluation and clean latency audit. |
| **Phase 4A** | Digital Twin Health Index Design | `reports/diagnostics_v0.2/phase_4a/` | EHI (0–100) + SDQI (0–100) dual-index architecture. |
| **Phase 4B** | Health Index Baseline Implementation | `reports/diagnostics_v0.2/phase_4b/` | Baseline evaluation; identified 5 failed hypotheses. |
| **Phase 4B.1** | Failed-Hypothesis Root-Cause Analysis| `reports/diagnostics_v0.2/phase_4b1/`| Discovered Simpson's Paradox & thermal lag factors. |
| **Phase 4C** | Refined Health Index Implementation | `reports/diagnostics_v0.2/phase_4c/` | Dual SDQI ($\text{SDQI}_{\min} = 5.54$), thermal filter, tolerance scaling. |
| **Phase 4C Audit**| Independent ML Validation Audit | `reports/diagnostics_v0.2/phase_4c/phase4c_audit_report.md` | Verified 100% code parity; identified Phase 4A static plausibility bug. |
