import { describe, it, expect } from 'vitest';
import { SimulationPhysicsEngine, calculateAtmosphere, CHANNEL_CONFIGS } from '../services/simulationPhysics';
import { EngineProfile, FaultInjectionConfig } from '../types/telemetry';

describe('Tab 2 UI & Physics Refinements (9 Fix Verification)', () => {
  const engine = new SimulationPhysicsEngine();
  const mockEngine: EngineProfile = {
    engine_id: 'test-twin-engine',
    displacement_l: 1.2,
    rated_rpm: 5200,
    idle_rpm: 850,
    rated_power_kw: 60,
    compression_ratio: 10.0,
    sensor_count: 10,
  };

  const normalConfig: FaultInjectionConfig = {
    fault_type: 'normal',
    severity: 1,
    onset_s: 0,
    is_active: false,
  };

  it('verifies MAP is between 70 and 90 kPa at 65% throttle and 1500m altitude', () => {
    engine.reset(15.0);
    const frame = engine.step(
      10,
      { throttle_pct: 65.0, altitude_m: 1500.0, ambient_temp_c: 15.0 },
      mockEngine,
      normalConfig
    );

    const mapKpa = frame.raw_measurements.manifold_pressure / 1000.0;
    expect(mapKpa).toBeGreaterThanOrEqual(70.0);
    expect(mapKpa).toBeLessThanOrEqual(90.0);
  });

  it('verifies power is between 60% and 70% of rated power at 65% throttle and 1500m altitude', () => {
    engine.reset(15.0);
    const frame = engine.step(
      10,
      { throttle_pct: 65.0, altitude_m: 1500.0, ambient_temp_c: 15.0 },
      mockEngine,
      normalConfig
    );

    const powerFraction = frame.raw_measurements.power / mockEngine.rated_power_kw;
    expect(powerFraction).toBeGreaterThanOrEqual(0.60);
    expect(powerFraction).toBeLessThanOrEqual(0.70);
  });

  it('verifies standardized pressure units are in kPa for manifold_pressure and oil_pressure', () => {
    expect(CHANNEL_CONFIGS.manifold_pressure.unit).toBe('kPa');
    expect(CHANNEL_CONFIGS.oil_pressure.unit).toBe('kPa');
  });

  it('verifies continuous channel quality degradation with continuous bounds in [0.0, 1.0]', () => {
    engine.reset(15.0);

    // Run steps with mild sensor bias
    const biasFault: FaultInjectionConfig = {
      fault_type: 'sensor_bias',
      severity: 2,
      target_channel: 'cht',
      onset_s: 5,
      is_active: true,
    };

    let frame = engine.step(0, { throttle_pct: 65, altitude_m: 1500, ambient_temp_c: 15 }, mockEngine, biasFault);
    for (let t = 1; t <= 10; t++) {
      frame = engine.step(t, { throttle_pct: 65, altitude_m: 1500, ambient_temp_c: 15 }, mockEngine, biasFault);
    }

    const qCht = frame.sensor_data_quality.channel_qualities.cht;
    expect(qCht).toBeGreaterThanOrEqual(0.0);
    expect(qCht).toBeLessThanOrEqual(1.0);
    // Bias should reduce quality below 1.0 continuously
    expect(qCht).toBeLessThan(0.95);
  });
});
