# ENGINE-TWIN — Aero Piston Engine Digital Twin Project Root

**Workspace Path:** `Engine/`  
**Active Production Twin Version:** `Engine/v0.2/`  
**Legacy Prototype Version:** `Engine/` (Dataset v0.1.0 Archive)

---

## 1. Directory Overview & Version Routing

> [!IMPORTANT]
> **ACTIVE DIGITAL TWIN ENGINE: `Engine/v0.2/`**  
> All active digital twin modeling, diagnostic training, Health Index formulation (EHI + SDQI), automated unit tests, and production pipelines reside in [`Engine/v0.2/`](./v0.2/).  
> The files directly under `Engine/` represent the legacy **Dataset v0.1.0** research prototype and historical audit reports.

```text
Engine/
├── Readme.md                          # (This file) Version routing & project index
├── v0.2/                              # ACTIVE PRODUCTION DIGITAL TWIN ROOT
│   ├── configs/                       # Active engine parameters & diagnostic configs
│   ├── data/                          # 960 scenarios (raw, processed, features)
│   ├── metadata/                      # Manifests & dataset card (SHA-256 provenance)
│   ├── models/                        # Baseline RF classifiers & healthy reference models
│   ├── reports/                       # Phase 3 & Phase 4 diagnostic & health-index audits
│   ├── splits/                        # Engine-wise & scenario-wise train/val/test splits
│   ├── src/                           # Digital twin runtime, feature pipelines, generators
│   └── tests/                         # Automated test suite (32 tests passing)
│
└── [Legacy Dataset v0.1.0 Archive]    # Historical prototype (preserved for provenance)
    ├── configs/                       # v0.1 parameter register
    ├── metadata/                      # v0.1 scenario manifest
    ├── processed/                     # v0.1 feature tables (28,800 rows)
    ├── raw/                           # v0.1 synthetic raw telemetry
    ├── reports/                       # v0.1 data audit reports
    ├── splits/                        # v0.1 scenario splits (240 scenarios)
    ├── column_statistics.csv          # v0.1 exploratory data analysis
    ├── dataset_audit_report.md        # v0.1 data consistency audit
    ├── generate_engine_twin_dataset.py# v0.1 generator script
    ├── label_consistency_report.md    # v0.1 label audit
    └── recommended_v0_2_changes.md    # Architecture specification that led to v0.2
```

---

## 2. Active Version: ENGINE-TWIN v0.2 Key Metrics

| Dimension | Legacy Dataset v0.1.0 | Active Dataset v0.2.0 |
|---|---|---|
| **Scenarios** | 240 | **960** (4× expansion) |
| **Telemetry Rows** | 28,800 | **115,200** (120 s/scenario @ 1.0 Hz) |
| **Engine Pool** | Single generic profile | **30 unique engine variations** |
| **Splits Strategy** | Scenario random split | **Engine-stratified & held-out test splits** |
| **Health Indices** | Static illustrative formula | **Dual-scale EHI + SDQI with causal thermal dynamics** |
| **Diagnostic Classes** | 8 fault classes | **8 fault classes with alert policies & compound checks** |
| **Unit Test Coverage**| 0 tests | **32 automated tests passing** |

---

## 3. Quickstart & Verification

To run tests and verify the digital twin from the workspace root:

```bash
# Run all 32 unit tests across v0.2
python -m unittest discover -s Engine/v0.2/tests

# Run workspace architecture and path validation
python scripts/validate_workspace.py
```

For full system architecture, see [`docs/architecture/overview.md`](../docs/architecture/overview.md) and [`Engine/v0.2/PROJECT_STRUCTURE.md`](./v0.2/PROJECT_STRUCTURE.md).
