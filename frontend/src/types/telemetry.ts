/**
 * ENGINE-TWIN Digital Twin — Telemetry & Interface Type Definitions
 * 
 * Corresponds to contract specification in docs/frontend-backend-contract.md.
 * Represents synthetic digital twin simulation outputs for MALE UAV aero piston engines.
 */

export type OperatingPhase =
  | 'ground_run'
  | 'ground_idle'
  | 'takeoff_climb'
  | 'climb'
  | 'cruise'
  | 'descent'
  | 'approach_landing';

export type AlertLevel =
  | 'NOMINAL'
  | 'ADVISORY'
  | 'CAUTION'
  | 'WARNING';

export type EHIStatusBand =
  | 'BAND_1_NOMINAL'
  | 'BAND_2_ACCEPTABLE'
  | 'BAND_3_DEGRADED'
  | 'BAND_4_CRITICAL'
  | 'INSUFFICIENT_TELEMETRY_COVERAGE';

export type BaselineStatus =
  | 'CALIBRATED_NOMINAL'
  | 'CALIBRATING'
  | 'ADAPTATION_ABORTED_FALLBACK'
  | 'FALLBACK_OPERATING_UNSTABLE'
  | 'UNVERIFIED';

export type SDQIStatus =
  | 'NOMINAL'
  | 'DEGRADED'
  | 'UNRELIABLE';

export type FaultClassName =
  | 'normal'
  | 'combustion_irregularity'
  | 'thermal_abnormality'
  | 'efficiency_degradation'
  | 'sensor_bias'
  | 'sensor_drift'
  | 'sensor_stuck'
  | 'sensor_dropout';

export interface OperatingInputs {
  throttle_pct: number;
  altitude_m: number;
  ambient_temp_c: number;
  ambient_pressure_pa: number;
  air_density_kg_m3: number;
}

export interface PhysicalSensorChannels {
  rpm: number;
  manifold_pressure: number;
  cht: number;
  egt: number;
  oil_temp: number;
  oil_pressure: number;
  fuel_flow: number;
  power: number;
  torque: number;
  vibration: number;
}

export interface SensorDataQuality {
  composite_sdqi: number;
  worst_channel_sdqi: number;
  coverage_fraction: number;
  status: SDQIStatus;
  channel_qualities: Record<keyof PhysicalSensorChannels, number>;
}

export interface EngineHealth {
  ehi: number | null;
  ehi_raw: number | null;
  status: EHIStatusBand;
  baseline_status: BaselineStatus;
  operating_mode: string;
  channel_health: Record<keyof PhysicalSensorChannels, number>;
}

export interface DiagnosticPrediction {
  active_prediction: FaultClassName;
  predicted_probability: number;
  alert_level: AlertLevel;
  class_probabilities: Record<FaultClassName, number>;
  model_name: string;
  split_protocol: 'scenario_heldout' | 'engine_heldout';
  feature_attributions?: Array<{
    channel: string;
    name: string;
    attribution_pct: number;
    z_score?: number;
    residual?: number;
  }>;
  anomaly_score?: number;
  is_connected?: boolean;
}

export interface ActiveAlert {
  id: string;
  timestamp_s: number;
  severity: AlertLevel;
  source: 'EHI' | 'SDQI' | 'DIAGNOSTIC' | 'COMPOUND';
  title: string;
  description: string;
  acknowledged: boolean;
}

export interface TelemetryFrame {
  scenario_id: string;
  engine_id: string;
  time_s: number;
  operating_phase: OperatingPhase;
  operating_inputs: OperatingInputs;
  raw_measurements: PhysicalSensorChannels;
  dynamic_reference: PhysicalSensorChannels;
  sensor_data_quality: SensorDataQuality;
  engine_health: EngineHealth;
  diagnostics: DiagnosticPrediction;
  alerts: ActiveAlert[];
}

export interface ScenarioSummary {
  scenario_id: string;
  engine_id: string;
  split: 'train' | 'val' | 'test';
  flight_profile: string;
  duration_s: number;
  fault_type: FaultClassName;
  fault_onset_s?: number;
  severity?: number;
  target_channel?: keyof PhysicalSensorChannels;
}

export interface EngineProfile {
  engine_id: string;
  displacement_l: number;
  rated_rpm: number;
  idle_rpm: number;
  rated_power_kw: number;
  compression_ratio: number;
  sensor_count: number;
}

export interface FaultInjectionConfig {
  fault_type: FaultClassName;
  severity: 1 | 2 | 3; // 1: Mild, 2: Moderate, 3: Severe
  target_channel?: keyof PhysicalSensorChannels;
  onset_s: number;
  is_active: boolean;
}

export interface EventLogEntry {
  id: string;
  timestamp_s: number;
  level: 'INFO' | 'WARNING' | 'CRITICAL' | 'ALERT';
  category: 'SIMULATION' | 'CONTROL' | 'FAULT' | 'DIAGNOSTIC' | 'ALERT';
  message: string;
  details?: string;
}

export type ConnectionMode = 'LOCAL_SIMULATOR' | 'BACKEND_API';

export type TimeWindowOption = 30 | 60 | 120 | 'ALL';
