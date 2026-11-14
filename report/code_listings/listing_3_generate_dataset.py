"""Listing 3: generate_dataset.py (Excerpts)
Synthetic trajectory synthesis across 30 engines, 4 flight phases, and 8 fault classes.
"""

import numpy as np
import pandas as pd

def generate_scenario(scenario_meta, engine_params, cfg):
    rng = np.random.default_rng(scenario_meta["seed"])
    duration = cfg["duration_s"]
    t = np.arange(0, duration, cfg["sample_interval_s"])
    
    # Atmospheric profile
    alt = scenario_meta["base_altitude_m"] + cfg["alt_sinusoid_m"] * np.sin(2 * np.pi * t / 90.0)
    temp_k = 288.15 - 0.0065 * alt + scenario_meta["temp_offset_c"]
    pressure_pa = 101325.0 * (temp_k / 288.15) ** (9.80665 / (287.05 * 0.0065))
    density = pressure_pa / (287.05 * temp_k)
    
    # Throttle trajectory
    throttle = scenario_meta["base_throttle_pct"] + rng.normal(0, 0.6, len(t))
    throttle = np.clip(throttle, 20.0, 98.0)
    
    # Baseline healthy engine states
    rpm = engine_params["idle_rpm"] + (engine_params["rated_rpm"] - engine_params["idle_rpm"]) * (throttle / 100.0) ** 0.5
    power = engine_params["rated_power_kw"] * (0.12 + 0.88 * (throttle / 100.0) ** 1.12) * (density / 1.225) ** 0.35
    
    # Fault injection logic
    onset_idx = scenario_meta["fault_onset_sample"]
    if scenario_meta["fault_type"] == "combustion_irregularity":
        rpm[onset_idx:] *= (1.0 - 0.015 * scenario_meta["severity_fraction"])
        power[onset_idx:] *= (1.0 - 0.12 * scenario_meta["severity_fraction"])
    elif scenario_meta["fault_type"] == "thermal_abnormality":
        cht_offset = 25.0 * scenario_meta["severity_fraction"]
        # Injected into CHT thermal filter
        
    return pd.DataFrame({"time_s": t, "throttle_pct": throttle, "rpm": rpm, "power": power, ...})
