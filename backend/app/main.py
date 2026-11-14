"""ENGINE-TWIN FastAPI Backend Service
Loads the trained Aero-Piston Diagnostic Models and provides real-time model inference.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Resolve paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
MODELS_DIR = PROJECT_ROOT / "models"
if not MODELS_DIR.exists():
    MODELS_DIR = PROJECT_ROOT / "Engine" / "v0.2" / "models"
DEFAULT_MODEL_PATH = MODELS_DIR / "scenario_heldout_classifier.joblib"

app = FastAPI(
    title="ENGINE-TWIN Diagnostic Model Service",
    description="Live inference API connecting trained Aero-Piston Random Forest classifiers to the frontend.",
    version="0.2.0",
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model state
MODEL_DATA: Optional[Dict[str, Any]] = None
ESTIMATOR = None
FEATURE_COLUMNS: List[str] = []
FAULT_CLASSES: List[str] = []
FEATURE_IMPORTANCES: Dict[str, float] = {}


def load_model(path: Path = DEFAULT_MODEL_PATH):
    global MODEL_DATA, ESTIMATOR, FEATURE_COLUMNS, FAULT_CLASSES, FEATURE_IMPORTANCES
    if not path.exists():
        raise FileNotFoundError(f"Model file not found at: {path}")

    MODEL_DATA = joblib.load(path)
    ESTIMATOR = MODEL_DATA["estimator"]
    FEATURE_COLUMNS = MODEL_DATA["feature_columns"]
    FAULT_CLASSES = list(ESTIMATOR.classes_)

    # Extract Random Forest feature importances
    try:
        classifier_step = ESTIMATOR.named_steps.get("classifier")
        if hasattr(classifier_step, "feature_importances_"):
            importances = classifier_step.feature_importances_
            FEATURE_IMPORTANCES = dict(zip(FEATURE_COLUMNS, importances))
    except Exception as e:
        FEATURE_IMPORTANCES = {col: 1.0 / len(FEATURE_COLUMNS) for col in FEATURE_COLUMNS}

    print(f"[ENGINE-TWIN] Loaded model from: {path.name}")
    print(f"[ENGINE-TWIN] Classes ({len(FAULT_CLASSES)}): {FAULT_CLASSES}")
    print(f"[ENGINE-TWIN] Feature Columns ({len(FEATURE_COLUMNS)} features)")


# Load model on startup
@app.on_event("startup")
def startup_event():
    try:
        load_model()
    except Exception as exc:
        print(f"[ENGINE-TWIN] Warning: Could not auto-load model on startup: {exc}")


class OperatingInputs(BaseModel):
    altitude_m: float = 1500.0
    ambient_temp_c: float = 15.0
    ambient_pressure_pa: float = 84558.0
    air_density_kg_m3: float = 1.058
    throttle_pct: float = 65.0


class SensorChannels(BaseModel):
    rpm: Optional[float] = 4200.0
    manifold_pressure: Optional[float] = 76863.0  # in Pa
    cht: Optional[float] = 138.0
    egt: Optional[float] = 680.0
    oil_temp: Optional[float] = 95.0
    oil_pressure: Optional[float] = 270.0  # in kPa
    fuel_flow: Optional[float] = 0.0035
    power: Optional[float] = 38.5
    torque: Optional[float] = 87.5
    vibration: Optional[float] = 0.51


class PredictRequest(BaseModel):
    operating_inputs: OperatingInputs
    operating_phase: str = "cruise"
    raw_measurements: SensorChannels
    dynamic_reference: SensorChannels
    scenario_id: Optional[str] = None
    engine_id: Optional[str] = None


CHANNEL_MAPPING = {
    "rpm": ("rpm_meas", "rpm_residual", "rpm_missing"),
    "manifold_pressure": ("manifold_pressure_pa_meas", "manifold_pressure_residual", "manifold_pressure_missing"),
    "cht": ("cht_c_meas", "cht_residual", "cht_missing"),
    "egt": ("egt_c_meas", "egt_residual", "egt_missing"),
    "oil_temp": ("oil_temp_c_meas", "oil_temp_residual", "oil_temp_missing"),
    "oil_pressure": ("oil_pressure_kpa_meas", "oil_pressure_residual", "oil_pressure_missing"),
    "fuel_flow": ("fuel_flow_kg_s_meas", "fuel_flow_residual", "fuel_flow_missing"),
    "power": ("power_kw_meas", "power_residual", "power_missing"),
    "torque": ("torque_nm_meas", "torque_residual", "torque_missing"),
    "vibration": ("vibration_rms_g_meas", "vibration_residual", "vibration_missing"),
}

CHANNEL_DISPLAY_NAMES = {
    "rpm": "Engine Speed (RPM)",
    "manifold_pressure": "Manifold Pressure (MAP)",
    "cht": "Cylinder Head Temp (CHT)",
    "egt": "Exhaust Gas Temp (EGT)",
    "oil_temp": "Oil Temperature",
    "oil_pressure": "Oil Pressure",
    "fuel_flow": "Fuel Flow Rate",
    "power": "Engine Power",
    "torque": "Engine Torque",
    "vibration": "Vibration RMS",
}

CHANNEL_NOISE_STD = {
    "rpm": 8.0,
    "manifold_pressure": 80.0,
    "cht": 0.5,
    "egt": 1.0,
    "oil_temp": 0.4,
    "oil_pressure": 0.8,
    "fuel_flow": 0.00002,
    "power": 0.08,
    "torque": 0.15,
    "vibration": 0.02,
}


@app.get("/api/health")
def health():
    if ESTIMATOR is None:
        load_model()
    return {
        "status": "online",
        "model_loaded": ESTIMATOR is not None,
        "model_name": "Aero-Twin Multi-Class Diagnostic Classifier",
        "model_file": DEFAULT_MODEL_PATH.name,
        "feature_count": len(FEATURE_COLUMNS),
        "classes": FAULT_CLASSES,
    }


@app.post("/api/predict")
def predict(req: PredictRequest):
    global ESTIMATOR, FEATURE_COLUMNS, FAULT_CLASSES, FEATURE_IMPORTANCES
    if ESTIMATOR is None:
        load_model()

    inputs = req.operating_inputs
    phase = req.operating_phase.lower()
    raw = req.raw_measurements.dict()
    ref = req.dynamic_reference.dict()

    # Construct feature row dictionary matching 39 feature columns
    feat: Dict[str, float] = {
        "altitude_m": float(inputs.altitude_m),
        "ambient_temp_c": float(inputs.ambient_temp_c),
        "ambient_pressure_pa": float(inputs.ambient_pressure_pa),
        "air_density_kg_m3": float(inputs.air_density_kg_m3),
        "throttle_pct": float(inputs.throttle_pct),
        "phase_ground_run": 1.0 if phase == "ground_run" else 0.0,
        "phase_climb": 1.0 if phase == "climb" else 0.0,
        "phase_cruise": 1.0 if phase == "cruise" else 0.0,
        "phase_descent": 1.0 if phase == "descent" else 0.0,
    }

    # Standardized residuals for attribution and stuck/dropout detection
    channel_attributions = []
    total_attribution_weight = 0.0

    for ch, (meas_col, res_col, miss_col) in CHANNEL_MAPPING.items():
        val = raw.get(ch)
        ref_val = ref.get(ch)

        is_missing = val is None or np.isnan(val) or val == 0.0 and ch in ("rpm", "cht")
        feat[miss_col] = 1.0 if is_missing else 0.0

        if is_missing or val is None:
            feat[meas_col] = np.nan
            feat[res_col] = np.nan
            z_score = 10.0  # Significant deviation for dropout
        else:
            feat[meas_col] = float(val)
            ref_num = float(ref_val) if ref_val is not None else float(val)
            res = float(val) - ref_num
            feat[res_col] = res
            noise = CHANNEL_NOISE_STD.get(ch, 1.0)
            z_score = abs(res) / noise

        # Weight attribution by RF feature importance
        res_importance = FEATURE_IMPORTANCES.get(res_col, 0.05)
        attr_weight = (z_score + 0.1) * res_importance
        total_attribution_weight += attr_weight
        channel_attributions.append({
            "channel": ch,
            "name": CHANNEL_DISPLAY_NAMES.get(ch, ch),
            "raw_weight": attr_weight,
            "residual": float(feat.get(res_col, 0.0) or 0.0),
            "z_score": round(float(z_score), 2),
        })

    # Assemble single-row DataFrame aligned to exact model feature order
    df = pd.DataFrame([feat])[FEATURE_COLUMNS]

    # Predict with trained Pipeline
    pred_class = str(ESTIMATOR.predict(df)[0])
    raw_probs = ESTIMATOR.predict_proba(df)[0]
    class_probs = {cls_name: round(float(prob), 4) for cls_name, prob in zip(FAULT_CLASSES, raw_probs)}

    confidence = class_probs.get(pred_class, float(np.max(raw_probs)))

    # Compute anomaly score: 1.0 - P(normal)
    prob_normal = class_probs.get("normal", 0.0)
    anomaly_score = round(float((1.0 - prob_normal) * 100), 1)

    # Determine Alert Level
    if pred_class != "normal":
        if anomaly_score >= 80.0:
            alert_level = "WARNING"
        elif anomaly_score >= 50.0:
            alert_level = "CAUTION"
        else:
            alert_level = "ADVISORY"
    else:
        alert_level = "NOMINAL"

    # Compute relative percentage attributions
    if total_attribution_weight > 0:
        for item in channel_attributions:
            item["attribution_pct"] = round(float((item["raw_weight"] / total_attribution_weight) * 100))
            del item["raw_weight"]
    else:
        for item in channel_attributions:
            item["attribution_pct"] = 10
            del item["raw_weight"]

    channel_attributions.sort(key=lambda x: x["attribution_pct"], reverse=True)

    return {
        "model_name": "Aero-Twin Multi-Class Diagnostic Classifier (scenario_heldout_classifier.joblib)",
        "split_protocol": "scenario_heldout",
        "predicted_fault": pred_class,
        "predicted_probability": round(confidence, 4),
        "alert_level": alert_level,
        "class_probabilities": class_probs,
        "feature_attributions": channel_attributions,
        "anomaly_score": anomaly_score,
        "is_fault_active": pred_class != "normal" and anomaly_score >= 50.0,
    }


@app.get("/api/scenarios")
def get_scenarios():
    manifest_path = PROJECT_ROOT / "frontend" / "src" / "assets" / "data" / "scenario_manifest.json"
    if manifest_path.exists():
        import json
        with open(manifest_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


@app.get("/api/engines")
def get_engines():
    pool_path = PROJECT_ROOT / "frontend" / "src" / "assets" / "data" / "engine_pool.json"
    if pool_path.exists():
        import json
        with open(pool_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

