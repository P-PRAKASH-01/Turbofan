# Digital Twin System Architecture Overview

**Document ID:** `ET-DOC-ARCH-001`  
**Version:** 1.0.0  
**Date:** 2026-10-14  

---

## 1. High-Level Architecture

The Digital Twin workspace integrates two complementary research baselines:
1. **Legacy Turbofan Baseline (NASA C-MAPSS):**
   - Historical exploratory work on remaining useful life (RUL) regression using NASA C-MAPSS turbofan run-to-failure data (`data/raw/`, `artifacts/phase1/`, `artifacts/phase2/`).
2. **ENGINE-TWIN Production Digital Twin (MALE UAV Aero Piston Engine):**
   - Self-contained in `Engine/v0.2/`.
   - Comprehensive synthetic engine telemetry generator (`src/generate_dataset.py`).
   - Diagnostic classifiers (Model A & Model B in `models/`).
   - Digital Twin condition monitoring: Engine Health Index (EHI) and Sensor Data Quality Index (SDQI) (`reports/diagnostics_v0.2/phase_4c/health_index_refined.py`).
3. **Operational Services (Future):**
   - **Backend API (`backend/`):** FastAPI asynchronous service streaming telemetry and evaluating health models.
   - **Frontend UI/UX (`frontend/`):** Modern React + Vite web dashboard displaying real-time digital twin twin-state tracking.
