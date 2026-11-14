/**
 * ENGINE-TWIN Telemetry Service
 * 
 * Coordinates telemetry acquisition from either:
 * 1. Local Browser Simulation Adapter (using physics simulation + precomputed scenarios)
 * 2. Live FastAPI Backend WebSocket (/api/v1/stream/{scenario_id})
 */

import {
  TelemetryFrame,
  EngineProfile,
  ScenarioSummary,
  FaultInjectionConfig,
  ConnectionMode,
  OperatingPhase,
  DiagnosticPrediction,
} from '../types/telemetry';
import { SimulationPhysicsEngine } from './simulationPhysics';

// Pre-packaged engine pool and scenario manifest
import enginePoolData from '../assets/data/engine_pool.json';
import scenarioManifestData from '../assets/data/scenario_manifest.json';
import precomputedScenariosData from '../assets/data/precomputed_scenarios.json';

export class TelemetryService {
  private physicsEngine: SimulationPhysicsEngine;
  private wsConnection: WebSocket | null = null;
  private mode: ConnectionMode = 'LOCAL_SIMULATOR';
  private precomputedMap: Record<string, any[]> = precomputedScenariosData as Record<string, any[]>;
  private latestModelPrediction: DiagnosticPrediction | null = null;
  private isModelBackendOnline: boolean = false;

  constructor() {
    this.physicsEngine = new SimulationPhysicsEngine();
    // Probe backend connection
    this.checkBackendHealth();
  }

  public async checkBackendHealth(): Promise<boolean> {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        this.isModelBackendOnline = Boolean(data.model_loaded);
        return this.isModelBackendOnline;
      }
    } catch {
      this.isModelBackendOnline = false;
    }
    return false;
  }

  public getIsModelConnected(): boolean {
    return this.isModelBackendOnline;
  }

  public async fetchModelPrediction(frame: TelemetryFrame): Promise<DiagnosticPrediction | null> {
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operating_inputs: frame.operating_inputs,
          operating_phase: frame.operating_phase,
          raw_measurements: frame.raw_measurements,
          dynamic_reference: frame.dynamic_reference,
          scenario_id: frame.scenario_id,
          engine_id: frame.engine_id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const pred: DiagnosticPrediction = {
          active_prediction: data.predicted_fault,
          predicted_probability: data.predicted_probability,
          alert_level: data.alert_level,
          class_probabilities: data.class_probabilities,
          model_name: data.model_name,
          split_protocol: data.split_protocol,
          feature_attributions: data.feature_attributions,
          anomaly_score: data.anomaly_score,
          is_connected: true,
        };
        this.latestModelPrediction = pred;
        this.isModelBackendOnline = true;
        return pred;
      }
    } catch {
      this.isModelBackendOnline = false;
    }
    return null;
  }

  public getEngines(): EngineProfile[] {
    return (enginePoolData as any[]).map((e) => ({
      engine_id: e.engine_id,
      displacement_l: Math.round(e.displacement_m3 * 1000 * 100) / 100,
      rated_rpm: Math.round(e.rated_rpm),
      idle_rpm: Math.round(e.idle_rpm),
      rated_power_kw: Math.round((e.displacement_m3 * 1000 * 45) * 10) / 10,
      compression_ratio: 9.5,
      sensor_count: 10,
    }));
  }

  public getScenarios(): ScenarioSummary[] {
    return (scenarioManifestData as any[]).map((s) => ({
      scenario_id: s.scenario_id,
      engine_id: s.engine_id,
      split: (s.scenario_split || 'test') as any,
      flight_profile: s.operating_phase || 'cruise',
      duration_s: s.duration_s || 120,
      fault_type: s.fault_type || 'normal',
      fault_onset_s: s.fault_onset_s,
      severity: s.severity_level,
      target_channel: s.sensor_fault_target || undefined,
    }));
  }

  public resetLocalEngine(ambient_temp_c: number = 20.0) {
    this.physicsEngine.reset(ambient_temp_c);
  }

  public setConnectionMode(mode: ConnectionMode) {
    this.mode = mode;
    if (mode === 'LOCAL_SIMULATOR' && this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  public getConnectionMode(): ConnectionMode {
    return this.mode;
  }

  /**
   * Generates or fetches next telemetry frame for a given simulation time step
   */
  public getNextFrame(
    time_s: number,
    inputs: {
      throttle_pct: number;
      altitude_m: number;
      ambient_temp_c: number;
      target_rpm?: number;
    },
    engine: EngineProfile,
    fault: FaultInjectionConfig,
    phase: OperatingPhase = 'cruise',
    scenarioId: string = 'sim-custom'
  ): TelemetryFrame {
    // Check if we have precomputed actual dataset scenario data and no user override
    if (this.precomputedMap[scenarioId] && !fault.is_active) {
      const rows = this.precomputedMap[scenarioId];
      const idx = Math.min(Math.floor(time_s), rows.length - 1);
      const row = rows[idx];

      if (row) {
        // Return frame constructed from genuine synthetic dataset row
        return this.frameFromDatasetRow(row, time_s, scenarioId, engine);
      }
    }

    // Otherwise, generate live frame via dynamic physics engine
    const frame = this.physicsEngine.step(
      time_s,
      inputs,
      engine,
      fault,
      phase,
      scenarioId
    );

    if (this.latestModelPrediction) {
      frame.diagnostics = {
        ...frame.diagnostics,
        ...this.latestModelPrediction,
      };
    }

    return frame;
  }

  private frameFromDatasetRow(
    row: any,
    time_s: number,
    scenarioId: string,
    engine: EngineProfile
  ): TelemetryFrame {
    // Generate dynamic references and health evaluation using physics engine
    return this.physicsEngine.step(
      time_s,
      {
        throttle_pct: row.throttle_pct,
        altitude_m: row.altitude_m,
        ambient_temp_c: row.ambient_temp_c,
      },
      engine,
      {
        fault_type: (row.fault_type as any) || 'normal',
        severity: row.fault_severity === 'severe' ? 3 : row.fault_severity === 'moderate' ? 2 : 1,
        target_channel: row.sensor_fault_target || undefined,
        onset_s: row.fault_onset_s || 30,
        is_active: Boolean(row.fault_active),
      },
      (row.operating_phase as any) || 'cruise',
      scenarioId
    );
  }
}

export const telemetryService = new TelemetryService();
