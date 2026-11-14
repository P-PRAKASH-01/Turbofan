"""Listing 2: backend/app/main.py (Excerpts)
FastAPI service exposing live inference with trained 39-feature Random Forest Pipeline.
"""

from fastapi import FastAPI, HTTPException
import joblib
import numpy as np
import pandas as pd
from pydantic import BaseModel

app = FastAPI(title="ENGINE-TWIN Diagnostic Model Service", version="0.2.0")

MODEL_DATA = joblib.load("Engine/v0.2/models/scenario_heldout_classifier.joblib")
ESTIMATOR = MODEL_DATA["estimator"]
FEATURE_COLUMNS = MODEL_DATA["feature_columns"]
FAULT_CLASSES = list(ESTIMATOR.classes_)

@app.post("/api/predict")
def predict(req: PredictRequest):
    # Construct exact 39-feature dictionary matching training pipeline
    feat = {
        "altitude_m": float(req.operating_inputs.altitude_m),
        "ambient_temp_c": float(req.operating_inputs.ambient_temp_c),
        "ambient_pressure_pa": float(req.operating_inputs.ambient_pressure_pa),
        "air_density_kg_m3": float(req.operating_inputs.air_density_kg_m3),
        "throttle_pct": float(req.operating_inputs.throttle_pct),
        "phase_ground_run": 1.0 if req.operating_phase == "ground_run" else 0.0,
        "phase_climb": 1.0 if req.operating_phase == "climb" else 0.0,
        "phase_cruise": 1.0 if req.operating_phase == "cruise" else 0.0,
        "phase_descent": 1.0 if req.operating_phase == "descent" else 0.0,
    }

    # 10 channels x 3 features (meas, residual, missing indicator)
    for ch, (meas_col, res_col, miss_col) in CHANNEL_MAPPING.items():
        val = req.raw_measurements.get(ch)
        ref_val = req.dynamic_reference.get(ch)
        is_missing = val is None or np.isnan(val)
        feat[miss_col] = 1.0 if is_missing else 0.0
        feat[meas_col] = np.nan if is_missing else float(val)
        feat[res_col] = np.nan if is_missing else (float(val) - float(ref_val))

    # Form aligned DataFrame and run inference pipeline
    df = pd.DataFrame([feat])[FEATURE_COLUMNS]
    pred_class = str(ESTIMATOR.predict(df)[0])
    raw_probs = ESTIMATOR.predict_proba(df)[0]
    class_probs = {cls: round(float(p), 4) for cls, p in zip(FAULT_CLASSES, raw_probs)}

    # Compute standardized residual attributions: |z_i| * RF_importance
    anomaly_score = round(float((1.0 - class_probs.get("normal", 0.0)) * 100), 1)
    return {
        "predicted_fault": pred_class,
        "class_probabilities": class_probs,
        "anomaly_score": anomaly_score,
        "alert_level": "WARNING" if anomaly_score >= 80.0 else "CAUTION" if anomaly_score >= 50.0 else "NOMINAL"
    }
