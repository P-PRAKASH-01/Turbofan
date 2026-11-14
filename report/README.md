# ENGINE-TWIN Academic Report & Reproduction Suite

This directory contains the complete submission-ready academic project report, verification scripts, figures, and code listings for **ENGINE-TWIN: Digital Twin Health Monitoring & Fault Diagnostics for a MALE UAV Aero Piston Engine**.

---

## Deliverables Inventory

```
report/
├── ENGINE_TWIN_Project_Report.docx  # Primary editable submission document
├── ENGINE_TWIN_Project_Report.pdf   # Ready-to-print academic document (Word fidelity)
├── FACT_SHEET.md                   # Complete codebase & data verification register
├── OPEN_ISSUES.md                  # Institutional placeholders and assumption audit
├── README.md                       # This reproduction guide
├── generate_plots.py               # Matplotlib academic figure generator
├── capture_fault_screenshots.py    # Headless browser automated screenshot capture
├── figures/                        # High-resolution PNG figures & UI screenshots
│   ├── fig_3_1_system_architecture.png
│   ├── fig_3_2_dataflow_diagram.png
│   ├── fig_4_1_otto_cycle_pv.png
│   ├── fig_4_2_dyno_curves.png
│   ├── fig_7_1_scenario_heldout_cm.png
│   ├── fig_7_2_engine_heldout_cm.png
│   ├── fig_7_3_per_class_f1_comparison.png
│   ├── fig_8_1_sensor_quality_ehi_curve.png
│   ├── fig_9_1_severity_stratified_f1.png
│   ├── fig_10_1_nominal_dashboard.png
│   ├── fig_10_2_piston_schematic.png
│   ├── fig_10_3_diagnostic_panel.png
│   ├── fig_10_4_fault_combustion.png
│   ├── fig_10_5_fault_sensor_dropout.png
│   └── fig_10_6_telemetry_matrix.png
└── code_listings/                  # Appendix code listings
    ├── listing_1_simulationPhysics.ts
    ├── listing_2_backend_main.py
    ├── listing_3_generate_dataset.py
    └── listing_4_DiagnosticPanel.tsx
```

---

## Reproduction & Build Instructions

### 1. Execute Unit & Physics Test Suites
To verify all 58 tests across backend and frontend:
```bash
# Python diagnostics tests (32 tests)
python -m unittest discover -s Engine/v0.2/tests -p "test_*.py"

# Frontend React/Vitest tests (26 tests)
cd frontend
npx vitest run
```

### 2. Regenerate Academic Plots & Confusion Matrices
```bash
python report/generate_plots.py
```

### 3. Launch Live Full-Stack Application
```bash
# Terminal 1: FastAPI AI Inference Service
python -m uvicorn backend.app.main:app --port 8000

# Terminal 2: React + Vite Frontend Dashboard
cd frontend
npm run dev -- --port 3000
```
Open `http://localhost:3000` in any web browser.

### 4. Rebuild the Academic Report Document
```bash
python report/build_academic_report.py
```
This updates `ENGINE_TWIN_Project_Report.docx` and automatically compiles `ENGINE_TWIN_Project_Report.pdf` via Microsoft Word COM automation.
