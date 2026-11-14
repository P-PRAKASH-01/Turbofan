# Dataset Specification & Sensor Inventory

**Document ID:** `ET-DOC-DATA-001`  
**Version:** 0.2.0  
**Date:** 2026-10-14  

---

## 1. Dataset v0.2 Overview

ENGINE-TWIN Dataset v0.2 consists of 960 deterministic 120-second flight scenarios sampled at 1.0 Hz (115,200 rows) across an engine pool of 30 distinct engine parameter configurations.

### Sensor Channel Allocation (10 Physical Diagnostic Channels)
1. `rpm` (`rpm_meas`): Engine rotational speed [RPM]
2. `manifold_pressure` (`manifold_pressure_pa_meas`): Intake manifold absolute pressure [Pa]
3. `cht` (`cht_c_meas`): Cylinder head temperature [°C]
4. `egt` (`egt_c_meas`): Exhaust gas temperature [°C]
5. `oil_temp` (`oil_temp_c_meas`): Engine oil temperature [°C]
6. `oil_pressure` (`oil_pressure_kpa_meas`): Lubrication oil pressure [kPa]
7. `fuel_flow` (`fuel_flow_kg_s_meas`): Fuel mass consumption rate [kg/s]
8. `power` (`power_kw_meas`): Shaft mechanical power [kW]
9. `torque` (`torque_nm_meas`): Shaft mechanical torque [N·m]
10. `vibration` (`vibration_rms_g_meas`): Engine block RMS vibration [g]

### Operating Inputs (Environmental & Flight Envelope)
- `throttle_pct`: Commanded throttle percentage [0–100%]
- `altitude_m`: Flight altitude [m]
- `ambient_temp_c`: Static outside air temperature [°C]
- `ambient_pressure_pa`: Static outside atmospheric pressure [Pa]
- `air_density_kg_m3`: Calculated local atmospheric air density [kg/m³]
- `operating_phase`: Flight phase (`ground_run`, `climb`, `cruise`, `descent`)
