#!/usr/bin/env python3
"""Safe workspace validation script for Digital Twin repository.

Verifies:
1. Engine v0.2 automated test suites (32 tests).
2. Data file presence and integrity (NASA C-MAPSS and Engine v0.2).
3. Trained model artifact presence.
4. Core configuration files.
"""

import sys
sys.dont_write_bytecode = True
import unittest
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parents[1]
ENGINE_ROOT = WORKSPACE_ROOT / "Engine" / "v0.2"

def main():
    print("=" * 70)
    print("DIGITAL TWIN WORKSPACE INTEGRITY VALIDATION")
    print(f"Workspace Root: {WORKSPACE_ROOT}")
    print(f"Engine v0.2 Root: {ENGINE_ROOT}")
    print("=" * 70)

    # 1. Path existence checks
    required_paths = [
        ("Engine v0.2 Config", ENGINE_ROOT / "config" / "dataset_config.json"),
        ("Engine v0.2 Raw Telemetry", ENGINE_ROOT / "data" / "raw" / "engine_twin_v0.2_raw.csv"),
        ("Engine v0.2 Features", ENGINE_ROOT / "data" / "processed" / "features.csv"),
        ("Engine v0.2 Labels", ENGINE_ROOT / "data" / "processed" / "labels.csv"),
        ("Engine v0.2 Lineage", ENGINE_ROOT / "data" / "processed" / "feature_lineage.csv"),
        ("Engine v0.2 Model A", ENGINE_ROOT / "models" / "scenario_heldout_classifier.joblib"),
        ("Engine v0.2 Model B", ENGINE_ROOT / "models" / "engine_heldout_classifier.joblib"),
        ("Engine v0.2 Refined Health System", ENGINE_ROOT / "reports" / "diagnostics_v0.2" / "phase_4c" / "health_index_refined.py"),
        ("Legacy C-MAPSS Raw Data", WORKSPACE_ROOT / "data" / "raw" / "train_FD001.txt"),
    ]

    all_paths_ok = True
    print("\n--- 1. File Path Resolution Checks ---")
    for name, p in required_paths:
        exists = p.exists()
        status = "FOUND" if exists else "MISSING"
        size_str = f"({p.stat().st_size:,} bytes)" if exists else ""
        print(f"  [{status:7s}] {name}: {p.relative_to(WORKSPACE_ROOT)} {size_str}")
        if not exists:
            all_paths_ok = False

    if not all_paths_ok:
        print("\nERROR: Required files are missing!")
        sys.exit(1)

    # 2. Run automated test suite
    print("\n--- 2. Executing Automated Test Suite ---")
    loader = unittest.TestLoader()
    suite = loader.discover(str(ENGINE_ROOT / "tests"))
    runner = unittest.TextTestRunner(verbosity=1)
    result = runner.run(suite)

    print("\n" + "=" * 70)
    if result.wasSuccessful():
        print(f"VALIDATION SUCCESS: All {result.testsRun} tests passed cleanly!")
        print("=" * 70)
        sys.exit(0)
    else:
        print(f"VALIDATION FAILED: {len(result.failures)} failures, {len(result.errors)} errors.")
        print("=" * 70)
        sys.exit(1)

if __name__ == "__main__":
    main()
