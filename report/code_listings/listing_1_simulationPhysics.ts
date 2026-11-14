/**
 * Listing 1: simulationPhysics.ts (Excerpts)
 * Quasi-steady aero-piston physics, ICAO atmosphere, continuous sensor quality q_i,
 * composite SDQI, and coverage-gated Engine Health Index (EHI).
 */

export class SimulationPhysicsEngine {
  private chtThermalState: number = 40.0;
  private egtThermalState: number = 180.0;
  private oilTempThermalState: number = 35.0;
  private prevCompositeSdqi: number = 100.0;
  private prevEhi: number = 100.0;

  public step(
    time_s: number,
    inputs: { throttle_pct: number; altitude_m: number; ambient_temp_c: number },
    engine: EngineProfile,
    fault: FaultInjectionConfig
  ): TelemetryFrame {
    const dt = 1.0;
    const atmos = calculateAtmosphere(inputs.altitude_m, inputs.ambient_temp_c - 15.0);
    const throttle = Math.max(20.0, Math.min(98.0, inputs.throttle_pct));

    // 1. Manifold Absolute Pressure (MAP) — Calibrated to 70-90 kPa at 65% throttle, 1500 m
    const altComp = 1.0 + 0.20 * Math.min(2.0, Math.max(0, inputs.altitude_m / 1500.0));
    const throttleMapFactor = 0.40 + 0.55 * (throttle / 100.0);
    const manifoldHealthy = Math.max(25000.0, Math.min(110000.0, atmos.ambient_pressure_pa * throttleMapFactor * altComp));

    // 2. Brake Power — Calibrated to 60-70% rated power at 65% throttle, 1500 m
    const densityRatioAir = Math.max(0.70, Math.min(1.05, atmos.air_density_kg_m3 / 1.225));
    const altPowerFactor = Math.pow(densityRatioAir, 0.35);
    const throttlePowerFactor = 0.12 + 0.88 * Math.pow(throttle / 100.0, 1.12);
    const ratedPower = engine.rated_power_kw || 45.0;
    const powerHealthy = ratedPower * throttlePowerFactor * altPowerFactor;

    // 3. Thermal Dynamics with Causal First-Order Lag Filter (alpha = dt / (tau + dt))
    const tauThermal = 25.0;
    const alphaThermal = dt / (tauThermal + dt);
    const chtTarget = atmos.ambient_temp_c + 75.0 + 0.72 * throttle;
    this.chtThermalState += alphaThermal * (chtTarget - this.chtThermalState);

    // 4. Continuous Sensor Quality q_i = q_dropout * q_residual * q_stuck
    const channelQualities: Record<string, number> = {};
    ORDERED_CHANNELS.forEach((ch) => {
      const z = Math.abs(raw_measurements[ch] - dynamic_reference[ch]) / CHANNEL_CONFIGS[ch].noiseStd;
      const tau = CHANNEL_CONFIGS[ch].nominalToleranceSigma * (1.0 + 0.15 * (throttle / 100.0));
      const excess = Math.max(0.0, z - tau);
      const qResidual = Math.exp(-0.5 * Math.pow(excess / CHANNEL_CONFIGS[ch].beta, 2));
      channelQualities[ch] = Math.max(0.0, Math.min(1.0, qResidual));
    });

    // 5. Dual SDQI & Telemetry Coverage Gate for EHI
    let weightedEhiSum = 0.0;
    let validWeightSum = 0.0;
    ORDERED_CHANNELS.forEach((ch) => {
      const q = channelQualities[ch];
      const h = Math.exp(-0.5 * Math.pow(Math.max(0, Math.abs(z) - tau) / beta, 2));
      weightedEhiSum += CHANNEL_CONFIGS[ch].ehiWeight * q * h;
      validWeightSum += CHANNEL_CONFIGS[ch].ehiWeight * q;
    });

    let ehi: number | null = null;
    if (validWeightSum / 1.0 < 0.80 || channelQualities.rpm < 0.50) {
      ehi = null; // Failsafe coverage gate tripped
    } else {
      ehi = (weightedEhiSum / validWeightSum) * 100.0;
    }

    return { ehi, sensor_data_quality: { composite_sdqi, channelQualities }, ... };
  }
}
