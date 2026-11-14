import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationPhysicsEngine, calculateAtmosphere, CHANNEL_CONFIGS } from '../services/simulationPhysics';
import { EngineProfile, FaultInjectionConfig } from '../types/telemetry';

describe('SimulationPhysicsEngine', () => {
  let engine: SimulationPhysicsEngine;
  const mockEngineProfile: EngineProfile = {
    engine_id: 'test-engine-01',
    displacement_l: 1.0,
    rated_rpm: 5000,
    idle_rpm: 800,
    rated_power_kw: 45,
    compression_ratio: 9.5,
    sensor_count: 10,
  };

  const normalFault: FaultInjectionConfig = {
    fault_type: 'normal',
    severity: 1,
    target_channel: undefined,
    onset_s: 0,
    is_active: false,
  };

  beforeEach(() => {
    engine = new SimulationPhysicsEngine();
    engine.reset(20.0);
  });

  it('calculates standard atmosphere accurately at sea level and altitude', () => {
    const seaLevel = calculateAtmosphere(0, 0);
    expect(seaLevel.ambient_pressure_pa).toBeCloseTo(101325, -2);
    expect(seaLevel.ambient_temp_c).toBeCloseTo(15.0, 1);
    expect(seaLevel.air_density_kg_m3).toBeGreaterThan(1.2);

    const highAlt = calculateAtmosphere(3000, 0);
    expect(highAlt.ambient_pressure_pa).toBeLessThan(seaLevel.ambient_pressure_pa);
    expect(highAlt.ambient_temp_c).toBeLessThan(seaLevel.ambient_temp_c);
  });

  it('produces nominal healthy EHI (Band 1, >= 90) under nominal cruising conditions', () => {
    // Run 25 seconds to warm up and calibrate baseline
    let frame = engine.step(0, { throttle_pct: 65, altitude_m: 1500, ambient_temp_c: 15 }, mockEngineProfile, normalFault);
    for (let t = 1; t <= 25; t++) {
      frame = engine.step(t, { throttle_pct: 65, altitude_m: 1500, ambient_temp_c: 15 }, mockEngineProfile, normalFault);
    }

    expect(frame.engine_health.ehi).not.toBeNull();
    expect(frame.engine_health.ehi!).toBeGreaterThanOrEqual(90.0);
    expect(frame.engine_health.status).toBe('BAND_1_NOMINAL');
    expect(frame.sensor_data_quality.composite_sdqi).toBeGreaterThanOrEqual(90.0);
    expect(frame.diagnostics.active_prediction).toBe('normal');
  });

  it('drops SDQI and triggers single-sensor isolation upon sensor dropout injection', () => {
    const dropoutFault: FaultInjectionConfig = {
      fault_type: 'sensor_dropout',
      severity: 3,
      target_channel: 'cht',
      onset_s: 10,
      is_active: true,
    };

    // Step to t = 15s (fault active)
    let frame = engine.step(0, { throttle_pct: 65, altitude_m: 1500, ambient_temp_c: 15 }, mockEngineProfile, dropoutFault);
    for (let t = 1; t <= 15; t++) {
      frame = engine.step(t, { throttle_pct: 65, altitude_m: 1500, ambient_temp_c: 15 }, mockEngineProfile, dropoutFault);
    }

    expect(frame.raw_measurements.cht).toBe(0.0);
    expect(frame.sensor_data_quality.channel_qualities.cht).toBe(0.0);
    expect(frame.sensor_data_quality.worst_channel_sdqi).toBeLessThan(50.0);
  });

  it('enforces failsafe coverage gate when RPM sensor drops out (RPM is mandatory)', () => {
    const rpmDropoutFault: FaultInjectionConfig = {
      fault_type: 'sensor_dropout',
      severity: 3,
      target_channel: 'rpm',
      onset_s: 5,
      is_active: true,
    };

    let frame = engine.step(0, { throttle_pct: 65, altitude_m: 1500, ambient_temp_c: 15 }, mockEngineProfile, rpmDropoutFault);
    for (let t = 1; t <= 10; t++) {
      frame = engine.step(t, { throttle_pct: 65, altitude_m: 1500, ambient_temp_c: 15 }, mockEngineProfile, rpmDropoutFault);
    }

    // RPM invalid (< 0.5) must trigger INSUFFICIENT_TELEMETRY_COVERAGE and ehi = null
    expect(frame.sensor_data_quality.channel_qualities.rpm).toBe(0.0);
    expect(frame.engine_health.ehi).toBeNull();
    expect(frame.engine_health.status).toBe('INSUFFICIENT_TELEMETRY_COVERAGE');
  });

  it('detects thermal abnormality fault and elevates CHT/EGT temperatures', () => {
    const thermalFault: FaultInjectionConfig = {
      fault_type: 'thermal_abnormality',
      severity: 3,
      onset_s: 10,
      is_active: true,
    };

    let frame = engine.step(0, { throttle_pct: 65, altitude_m: 1500, ambient_temp_c: 15 }, mockEngineProfile, thermalFault);
    for (let t = 1; t <= 25; t++) {
      frame = engine.step(t, { throttle_pct: 65, altitude_m: 1500, ambient_temp_c: 15 }, mockEngineProfile, thermalFault);
    }

    // Raw CHT should exceed dynamic reference CHT
    expect(frame.raw_measurements.cht).toBeGreaterThan(frame.dynamic_reference.cht);
    expect(frame.raw_measurements.egt).toBeGreaterThan(frame.dynamic_reference.egt);
    expect(frame.diagnostics.active_prediction).toBe('thermal_abnormality');
  });

  it('ensures all 10 physical channels have defined configurations and valid bounds', () => {
    const channels = Object.keys(CHANNEL_CONFIGS);
    expect(channels.length).toBe(10);
    channels.forEach((ch) => {
      const cfg = CHANNEL_CONFIGS[ch as keyof typeof CHANNEL_CONFIGS];
      expect(cfg.plausibleRange[0]).toBeLessThan(cfg.plausibleRange[1]);
      expect(cfg.ehiWeight).toBeGreaterThan(0);
      expect(cfg.sdqiWeight).toBeGreaterThan(0);
    });
  });
});
