/**
 * ENGINE-TWIN v0.2 — In-Browser Digital Twin Simulation & Physics Engine
 * 
 * Implements the exact mean-value aero-piston engine equations from dataset_config.json
 * and the Phase 4C Health Index (EHI + Dual SDQI) formulation from health_index_refined.py.
 * 
 * DISCLAIMER:
 * Generates synthetic telemetry for development and simulation playback.
 * Does not represent physical FAA/EASA certified airworthiness telemetry.
 */

import {
  OperatingInputs,
  PhysicalSensorChannels,
  SensorDataQuality,
  EngineHealth,
  DiagnosticPrediction,
  TelemetryFrame,
  ActiveAlert,
  FaultClassName,
  FaultInjectionConfig,
  OperatingPhase,
  EngineProfile,
} from '../types/telemetry';

// Channel limits from phase4c_refined_config.json
export const CHANNEL_CONFIGS: Record<
  keyof PhysicalSensorChannels,
  {
    name: string;
    unit: string;
    plausibleRange: [number, number];
    nominalToleranceSigma: number;
    beta: number;
    ehiWeight: number;
    sdqiWeight: number;
    noiseStd: number;
  }
> = {
  rpm: {
    name: 'Engine Speed',
    unit: 'RPM',
    plausibleRange: [600, 5500],
    nominalToleranceSigma: 2.0,
    beta: 1.5,
    ehiWeight: 0.12,
    sdqiWeight: 0.10,
    noiseStd: 6.0,
  },
  manifold_pressure: {
    name: 'Manifold Pressure',
    unit: 'kPa',
    plausibleRange: [20000, 110000],
    nominalToleranceSigma: 2.0,
    beta: 1.5,
    ehiWeight: 0.10,
    sdqiWeight: 0.10,
    noiseStd: 80.0,
  },
  cht: {
    name: 'Cylinder Head Temp',
    unit: '°C',
    plausibleRange: [20, 260],
    nominalToleranceSigma: 2.0,
    beta: 1.5,
    ehiWeight: 0.15,
    sdqiWeight: 0.12,
    noiseStd: 0.5,
  },
  egt: {
    name: 'Exhaust Gas Temp',
    unit: '°C',
    plausibleRange: [100, 950],
    nominalToleranceSigma: 2.0,
    beta: 1.5,
    ehiWeight: 0.15,
    sdqiWeight: 0.12,
    noiseStd: 1.0,
  },
  oil_temp: {
    name: 'Oil Temperature',
    unit: '°C',
    plausibleRange: [20, 150],
    nominalToleranceSigma: 2.0,
    beta: 1.5,
    ehiWeight: 0.10,
    sdqiWeight: 0.10,
    noiseStd: 0.4,
  },
  oil_pressure: {
    name: 'Oil Pressure',
    unit: 'kPa',
    plausibleRange: [100, 700],
    nominalToleranceSigma: 2.0,
    beta: 1.5,
    ehiWeight: 0.10,
    sdqiWeight: 0.10,
    noiseStd: 0.8,
  },
  fuel_flow: {
    name: 'Fuel Flow Rate',
    unit: 'kg/s',
    plausibleRange: [0.0005, 0.025],
    nominalToleranceSigma: 2.0,
    beta: 1.5,
    ehiWeight: 0.10,
    sdqiWeight: 0.10,
    noiseStd: 0.00002,
  },
  power: {
    name: 'Engine Power',
    unit: 'kW',
    plausibleRange: [5.0, 150.0],
    nominalToleranceSigma: 2.0,
    beta: 1.5,
    ehiWeight: 0.06,
    sdqiWeight: 0.08,
    noiseStd: 0.08,
  },
  torque: {
    name: 'Engine Torque',
    unit: 'Nm',
    plausibleRange: [20.0, 350.0],
    nominalToleranceSigma: 2.0,
    beta: 1.5,
    ehiWeight: 0.06,
    sdqiWeight: 0.08,
    noiseStd: 0.15,
  },
  vibration: {
    name: 'Vibration RMS',
    unit: 'g RMS',
    plausibleRange: [0.05, 3.5],
    nominalToleranceSigma: 2.0,
    beta: 1.5,
    ehiWeight: 0.06,
    sdqiWeight: 0.10,
    noiseStd: 0.02,
  },
};

export const ORDERED_CHANNELS: Array<keyof PhysicalSensorChannels> = [
  'rpm',
  'manifold_pressure',
  'cht',
  'egt',
  'oil_temp',
  'oil_pressure',
  'fuel_flow',
  'power',
  'torque',
  'vibration',
];

/**
 * Standard Troposphere Atmosphere Model (ICAO standard)
 */
export function calculateAtmosphere(altitude_m: number, temp_offset_c: number = 0) {
  const h = Math.max(0, Math.min(11000, altitude_m));
  const T0 = 288.15; // Sea level standard temp in K
  const P0 = 101325.0; // Sea level standard pressure in Pa
  const L = 0.0065; // Temperature lapse rate K/m
  const g = 9.80665;
  const R = 287.05;

  const temp_k = T0 - L * h + temp_offset_c;
  const temp_c = temp_k - 273.15;
  const pressure_pa = P0 * Math.pow(temp_k / T0, g / (R * L));
  const air_density = pressure_pa / (R * temp_k);

  return {
    ambient_temp_c: temp_c,
    ambient_pressure_pa: pressure_pa,
    air_density_kg_m3: air_density,
  };
}

export class SimulationPhysicsEngine {
  private chtThermalState: number = 40.0;
  private egtThermalState: number = 180.0;
  private oilTempThermalState: number = 35.0;
  private chtHealthyState: number = 40.0;
  private egtHealthyState: number = 180.0;
  private oilTempHealthyState: number = 35.0;
  private prevCompositeSdqi: number = 100.0;
  private prevWorstSdqi: number = 100.0;
  private prevEhi: number = 100.0;
  private baselineOffset: Record<keyof PhysicalSensorChannels, number>;
  private baselineStatus: 'CALIBRATED_NOMINAL' | 'CALIBRATING' | 'ADAPTATION_ABORTED_FALLBACK' = 'CALIBRATING';
  private channelHistory: Record<keyof PhysicalSensorChannels, number[]> = {
    rpm: [],
    manifold_pressure: [],
    cht: [],
    egt: [],
    oil_temp: [],
    oil_pressure: [],
    fuel_flow: [],
    power: [],
    torque: [],
    vibration: [],
  };

  constructor() {
    this.baselineOffset = this.zeroOffsets();
  }

  private zeroOffsets(): Record<keyof PhysicalSensorChannels, number> {
    return {
      rpm: 0,
      manifold_pressure: 0,
      cht: 0,
      egt: 0,
      oil_temp: 0,
      oil_pressure: 0,
      fuel_flow: 0,
      power: 0,
      torque: 0,
      vibration: 0,
    };
  }

  public reset(ambient_temp_c: number = 20.0) {
    this.chtThermalState = ambient_temp_c + 20.0;
    this.egtThermalState = ambient_temp_c + 150.0;
    this.oilTempThermalState = ambient_temp_c + 15.0;
    this.chtHealthyState = ambient_temp_c + 20.0;
    this.egtHealthyState = ambient_temp_c + 150.0;
    this.oilTempHealthyState = ambient_temp_c + 15.0;
    this.prevCompositeSdqi = 100.0;
    this.prevWorstSdqi = 100.0;
    this.prevEhi = 100.0;
    this.baselineOffset = this.zeroOffsets();
    this.baselineStatus = 'CALIBRATING';
    this.channelHistory = {
      rpm: [],
      manifold_pressure: [],
      cht: [],
      egt: [],
      oil_temp: [],
      oil_pressure: [],
      fuel_flow: [],
      power: [],
      torque: [],
      vibration: [],
    };
  }

  /**
   * Generates a step frame given inputs, engine profile, and fault configuration
   */
  public step(
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
    scenarioId: string = 'sim-custom',
    modelProtocol: 'scenario_heldout' | 'engine_heldout' = 'scenario_heldout'
  ): TelemetryFrame {
    const dt = 1.0;
    const atmos = calculateAtmosphere(inputs.altitude_m, inputs.ambient_temp_c - 15.0);
    const throttle = Math.max(20.0, Math.min(98.0, inputs.throttle_pct));

    // Base engine speed calculation
    const rpmIdle = engine.idle_rpm;
    const rpmRated = engine.rated_rpm;
    const baseRpm = rpmIdle + (rpmRated - rpmIdle) * Math.pow(throttle / 100.0, 0.5);
    const densityRatio = Math.max(0.95, Math.min(1.02, atmos.air_density_kg_m3 / 1.225));
    const healthyRpm = baseRpm * Math.pow(densityRatio, 0.05);

    // Apply active fault flag
    const isFaultActive = fault.is_active && time_s >= fault.onset_s;
    const severityFactor = fault.severity; // 1, 2, or 3
    const severityFraction = severityFactor / 3.0;

    let rpmState = healthyRpm;
    if (isFaultActive) {
      if (fault.fault_type === 'combustion_irregularity') {
        rpmState *= 1.0 - 0.015 * severityFraction;
      } else if (fault.fault_type === 'efficiency_degradation') {
        rpmState *= 1.0 - 0.012 * severityFraction;
      }
    }

    // Manifold pressure (MAP) - Calibrated: at 65% throttle, 1500 m gives MAP ≈ 70-90 kPa
    const altComp = 1.0 + 0.20 * Math.min(2.0, Math.max(0, inputs.altitude_m / 1500.0));
    const throttleMapFactor = 0.40 + 0.55 * (throttle / 100.0);
    const manifoldHealthy = Math.max(25000.0, Math.min(110000.0, atmos.ambient_pressure_pa * throttleMapFactor * altComp));
    const manifoldState = manifoldHealthy;

    // Power - Calibrated: at 65% throttle, 1500 m gives power ≈ 60-70% of rated power
    const densityRatioAir = Math.max(0.70, Math.min(1.05, atmos.air_density_kg_m3 / 1.225));
    const altPowerFactor = Math.pow(densityRatioAir, 0.35);
    const throttlePowerFactor = 0.12 + 0.88 * Math.pow(throttle / 100.0, 1.12);
    const ratedPower = engine.rated_power_kw || 45.0;
    const powerHealthy = ratedPower * throttlePowerFactor * altPowerFactor;

    let powerState = powerHealthy;
    if (isFaultActive) {
      if (fault.fault_type === 'combustion_irregularity') {
        powerState *= 1.0 - 0.12 * severityFraction;
      } else if (fault.fault_type === 'efficiency_degradation') {
        powerState *= 1.0 - 0.18 * severityFraction;
      }
    }

    // Fuel Flow (derived from power and thermal efficiency)
    const LHV = 43000000.0; // J/kg
    const healthyEff = 0.26;
    let actualEff = healthyEff;
    if (isFaultActive) {
      if (fault.fault_type === 'combustion_irregularity') actualEff *= 1.0 - 0.10 * severityFraction;
      else if (fault.fault_type === 'efficiency_degradation') actualEff *= 1.0 - 0.15 * severityFraction;
    }
    const fuelFlowHealthy = (powerHealthy * 1000.0) / (LHV * healthyEff);
    const fuelFlowState = (powerState * 1000.0) / (LHV * actualEff);

    // Torque = (Power_W) / (RPM * 2 * pi / 60)
    const angularSpeed = Math.max(1.0, rpmState * (2 * Math.PI / 60.0));
    const torqueHealthy = (powerHealthy * 1000.0) / Math.max(1.0, healthyRpm * (2 * Math.PI / 60.0));
    const torqueState = (powerState * 1000.0) / angularSpeed;

    // Thermal Channels with causal discrete lag (alpha = dt / (tau + dt))
    const tauThermal = 25.0;
    const alphaThermal = dt / (tauThermal + dt);
    const tauOil = 60.0;
    const alphaOil = dt / (tauOil + dt);

    const chtTargetHealthy = atmos.ambient_temp_c + 75.0 + 0.72 * throttle;
    const egtTargetHealthy = atmos.ambient_temp_c + 170.0 + 3.40 * throttle;
    const oilTargetHealthy = atmos.ambient_temp_c + 45.0 + 0.22 * throttle;

    let chtExtra = 0.0;
    let egtExtra = 0.0;
    if (isFaultActive && fault.fault_type === 'thermal_abnormality') {
      chtExtra = 25.0 * severityFraction;
      egtExtra = 75.0 * severityFraction;
    }

    // Update dynamic thermal states
    this.chtThermalState = this.chtThermalState + alphaThermal * (chtTargetHealthy + chtExtra - this.chtThermalState);
    this.egtThermalState = this.egtThermalState + alphaThermal * (egtTargetHealthy + egtExtra - this.egtThermalState);
    this.oilTempThermalState = this.oilTempThermalState + alphaOil * (oilTargetHealthy + 0.10 * chtExtra - this.oilTempThermalState);

    // Update dynamic healthy reference states (CausalThermalFilter Phase 4C)
    this.chtHealthyState = this.chtHealthyState + alphaThermal * (chtTargetHealthy - this.chtHealthyState);
    this.egtHealthyState = this.egtHealthyState + alphaThermal * (egtTargetHealthy - this.egtHealthyState);
    this.oilTempHealthyState = this.oilTempHealthyState + alphaOil * (oilTargetHealthy - this.oilTempHealthyState);

    const chtState = this.chtThermalState;
    const egtState = this.egtThermalState;
    const oilTempState = this.oilTempThermalState;

    // Oil Pressure
    const hotLoss = Math.max(0, oilTempState - 90.0) * 0.25;
    const oilPressureState = 180.0 + 90.0 * (rpmState / rpmRated) - hotLoss;
    const healthyOilPressure = 180.0 + 90.0 * (healthyRpm / rpmRated) - Math.max(0, this.oilTempHealthyState - 90.0) * 0.25;

    // Vibration
    let vibrationState = 0.25 + 0.004 * throttle;
    if (isFaultActive && fault.fault_type === 'combustion_irregularity') {
      vibrationState += 0.20 * severityFraction;
    }
    const healthyVibration = 0.25 + 0.004 * throttle;

    // Assemble dynamic healthy reference
    const dynamic_reference: PhysicalSensorChannels = {
      rpm: Math.round(healthyRpm * 10) / 10,
      manifold_pressure: Math.round(manifoldHealthy),
      cht: Math.round(this.chtHealthyState * 10) / 10,
      egt: Math.round(this.egtHealthyState * 10) / 10,
      oil_temp: Math.round(this.oilTempHealthyState * 10) / 10,
      oil_pressure: Math.round(healthyOilPressure * 10) / 10,
      fuel_flow: Math.round(fuelFlowHealthy * 100000) / 100000,
      power: Math.round(powerHealthy * 100) / 100,
      torque: Math.round(torqueHealthy * 10) / 10,
      vibration: Math.round(healthyVibration * 100) / 100,
    };

    // Raw measurements (with sensor faults if active)
    const raw_measurements: PhysicalSensorChannels = {
      rpm: rpmState,
      manifold_pressure: manifoldState,
      cht: chtState,
      egt: egtState,
      oil_temp: oilTempState,
      oil_pressure: oilPressureState,
      fuel_flow: fuelFlowState,
      power: powerState,
      torque: torqueState,
      vibration: vibrationState,
    };

    // Sensor fault injection
    if (isFaultActive && fault.target_channel) {
      const ch = fault.target_channel;
      const noise = CHANNEL_CONFIGS[ch].noiseStd;
      const mag = (CHANNEL_CONFIGS[ch].nominalToleranceSigma * 2.5 + 4.0 * severityFraction) * noise;

      if (fault.fault_type === 'sensor_bias') {
        raw_measurements[ch] += mag;
      } else if (fault.fault_type === 'sensor_drift') {
        const driftT = time_s - fault.onset_s;
        raw_measurements[ch] += (mag / 30.0) * driftT;
      } else if (fault.fault_type === 'sensor_stuck') {
        // Freeze at fixed constant value
        raw_measurements[ch] = dynamic_reference[ch];
      } else if (fault.fault_type === 'sensor_dropout') {
        // Drop to 0.0
        raw_measurements[ch] = 0.0;
      }
    }

    // Maintain rolling buffer for continuous stuck/dropout tracking
    ORDERED_CHANNELS.forEach((ch) => {
      if (!this.channelHistory[ch]) this.channelHistory[ch] = [];
      this.channelHistory[ch].push(raw_measurements[ch]);
      if (this.channelHistory[ch].length > 12) {
        this.channelHistory[ch].shift();
      }
    });

    // --- Continuous Dual SDQI Evaluation ---
    const channelQualities: Record<keyof PhysicalSensorChannels, number> = {
      rpm: 1.0,
      manifold_pressure: 1.0,
      cht: 1.0,
      egt: 1.0,
      oil_temp: 1.0,
      oil_pressure: 1.0,
      fuel_flow: 1.0,
      power: 1.0,
      torque: 1.0,
      vibration: 1.0,
    };

    ORDERED_CHANNELS.forEach((ch) => {
      const val = raw_measurements[ch];
      const ref = dynamic_reference[ch];
      const cfg = CHANNEL_CONFIGS[ch];

      // 1. Plausibility & Dropout detection
      let qDropout = 1.0;
      if (val < cfg.plausibleRange[0] || val > cfg.plausibleRange[1]) {
        qDropout = 0.0;
      } else if (val <= 0.05 * ref && ref > 1.0) {
        qDropout = 0.0;
      }

      // 2. Continuous Residual-based penalty
      const z = Math.abs(val - ref) / cfg.noiseStd;
      const tau = cfg.nominalToleranceSigma * (1.0 + 0.15 * (throttle / 100.0));
      const excess = Math.max(0.0, z - tau);
      const qResidual = Math.exp(-0.5 * Math.pow(excess / cfg.beta, 2));

      // 3. Continuous Stuck sensor detection
      let qStuck = 1.0;
      if (isFaultActive && fault.target_channel === ch && fault.fault_type === 'sensor_stuck') {
        const excessDev = Math.abs(val - ref) / cfg.noiseStd;
        qStuck = Math.max(0.05, Math.exp(-0.5 * Math.pow(excessDev / cfg.beta, 2)));
      }

      // Combine into continuous channel quality q_i in [0.0, 1.0]
      const q = Math.max(0.0, Math.min(1.0, qDropout * qResidual * qStuck));
      channelQualities[ch] = Math.round(q * 1000) / 1000;
    });

    let rawCompSdqi = 0.0;
    let worstSdqi = 1.0;
    ORDERED_CHANNELS.forEach((ch) => {
      rawCompSdqi += CHANNEL_CONFIGS[ch].sdqiWeight * channelQualities[ch] * 100.0;
      if (channelQualities[ch] < worstSdqi) {
        worstSdqi = channelQualities[ch];
      }
    });

    const smoothedCompSdqi = 0.85 * this.prevCompositeSdqi + 0.15 * rawCompSdqi;
    const smoothedWorstSdqi = 0.70 * this.prevWorstSdqi + 0.30 * (worstSdqi * 100.0);
    this.prevCompositeSdqi = smoothedCompSdqi;
    this.prevWorstSdqi = smoothedWorstSdqi;

    // --- EHI Evaluation (Phase 4C Refined) ---
    const channelHealth: Record<keyof PhysicalSensorChannels, number> = {
      rpm: 1.0,
      manifold_pressure: 1.0,
      cht: 1.0,
      egt: 1.0,
      oil_temp: 1.0,
      oil_pressure: 1.0,
      fuel_flow: 1.0,
      power: 1.0,
      torque: 1.0,
      vibration: 1.0,
    };

    let weightedEhiSum = 0.0;
    let validWeightSum = 0.0;
    let validChannelCount = 0;

    ORDERED_CHANNELS.forEach((ch) => {
      const q = channelQualities[ch];
      const cfg = CHANNEL_CONFIGS[ch];
      const meas = raw_measurements[ch];
      const ref = dynamic_reference[ch];
      const z = (meas - ref) / cfg.noiseStd;

      // Throttle adaptive tolerance
      const tau = cfg.nominalToleranceSigma * (1.0 + 0.2 * (throttle / 100.0));
      const dist = Math.max(0.0, Math.abs(z) - tau);
      const h = Math.exp(-0.5 * Math.pow(dist / cfg.beta, 2));

      channelHealth[ch] = Math.round(h * 1000) / 1000;

      if (q >= 0.5) {
        validChannelCount++;
      }
      weightedEhiSum += cfg.ehiWeight * q * h;
      validWeightSum += cfg.ehiWeight * q;
    });

    const coverageFraction = validWeightSum / 1.0;
    const rpmValid = channelQualities.rpm >= 0.5;

    let ehi: number | null = null;
    let ehiStatus: EngineHealth['status'] = 'BAND_1_NOMINAL';

    // Failsafe telemetry coverage rule
    if (coverageFraction < 0.80 || validChannelCount < 7 || !rpmValid) {
      ehi = null;
      ehiStatus = 'INSUFFICIENT_TELEMETRY_COVERAGE';
    } else {
      const ehiRaw = (weightedEhiSum / validWeightSum) * 100.0;
      ehi = Math.round((0.85 * this.prevEhi + 0.15 * ehiRaw) * 10) / 10;
      this.prevEhi = ehi;

      if (ehi >= 90.0) {
        ehiStatus = 'BAND_1_NOMINAL';
      } else if (ehi >= 75.0) {
        ehiStatus = 'BAND_2_ACCEPTABLE';
      } else if (ehi >= 50.0) {
        ehiStatus = 'BAND_3_DEGRADED';
      } else {
        ehiStatus = 'BAND_4_CRITICAL';
      }
    }

    // Baseline adaptation status
    if (time_s < 15) {
      this.baselineStatus = 'CALIBRATING';
    } else if (isFaultActive && fault.onset_s <= 15) {
      this.baselineStatus = 'ADAPTATION_ABORTED_FALLBACK';
    } else {
      this.baselineStatus = 'CALIBRATED_NOMINAL';
    }

    // --- Diagnostic Inference Simulation ---
    const classProbabilities: Record<FaultClassName, number> = {
      normal: 0.96,
      combustion_irregularity: 0.005,
      thermal_abnormality: 0.005,
      efficiency_degradation: 0.005,
      sensor_bias: 0.005,
      sensor_drift: 0.005,
      sensor_stuck: 0.005,
      sensor_dropout: 0.01,
    };

    let predictedFault: FaultClassName = 'normal';
    let predictedProb = 0.95;

    if (isFaultActive) {
      const detectedFault = fault.fault_type;
      predictedFault = detectedFault;
      predictedProb = 0.70 + 0.09 * severityFactor;

      // Distribute probabilities
      Object.keys(classProbabilities).forEach((k) => {
        const cls = k as FaultClassName;
        if (cls === detectedFault) {
          classProbabilities[cls] = Math.round(predictedProb * 1000) / 1000;
        } else {
          classProbabilities[cls] = Math.round(((1.0 - predictedProb) / 7.0) * 1000) / 1000;
        }
      });
    }

    let alertLevel: DiagnosticPrediction['alert_level'] = 'NOMINAL';
    if (predictedFault !== 'normal') {
      alertLevel = severityFactor === 3 ? 'WARNING' : severityFactor === 2 ? 'CAUTION' : 'ADVISORY';
    } else if (ehi !== null && ehi < 75.0) {
      alertLevel = 'CAUTION';
    } else if (smoothedWorstSdqi < 50.0) {
      alertLevel = 'CAUTION';
    }

    const alerts: ActiveAlert[] = [];
    if (alertLevel !== 'NOMINAL') {
      alerts.push({
        id: `alt-${Math.floor(time_s)}`,
        timestamp_s: time_s,
        severity: alertLevel,
        source: isFaultActive && fault.target_channel ? 'SDQI' : 'DIAGNOSTIC',
        title: isFaultActive
          ? `${fault.fault_type.toUpperCase().replace('_', ' ')} (Sev ${severityFactor})`
          : 'HEALTH THRESHOLD BREACH',
        description: isFaultActive
          ? `Active signature detected on ${fault.target_channel || 'engine state'}.`
          : 'Elevated standardized residuals against dynamic reference.',
        acknowledged: false,
      });
    }

    const frame: TelemetryFrame = {
      scenario_id: scenarioId,
      engine_id: engine.engine_id,
      time_s: Math.round(time_s * 10) / 10,
      operating_phase: phase,
      operating_inputs: {
        throttle_pct: Math.round(throttle * 10) / 10,
        altitude_m: Math.round(inputs.altitude_m),
        ambient_temp_c: Math.round(atmos.ambient_temp_c * 10) / 10,
        ambient_pressure_pa: Math.round(atmos.ambient_pressure_pa),
        air_density_kg_m3: Math.round(atmos.air_density_kg_m3 * 1000) / 1000,
      },
      raw_measurements: {
        rpm: Math.round(raw_measurements.rpm * 10) / 10,
        manifold_pressure: Math.round(raw_measurements.manifold_pressure),
        cht: Math.round(raw_measurements.cht * 10) / 10,
        egt: Math.round(raw_measurements.egt * 10) / 10,
        oil_temp: Math.round(raw_measurements.oil_temp * 10) / 10,
        oil_pressure: Math.round(raw_measurements.oil_pressure * 10) / 10,
        fuel_flow: Math.round(raw_measurements.fuel_flow * 100000) / 100000,
        power: Math.round(raw_measurements.power * 100) / 100,
        torque: Math.round(raw_measurements.torque * 10) / 10,
        vibration: Math.round(raw_measurements.vibration * 100) / 100,
      },
      dynamic_reference,
      sensor_data_quality: {
        composite_sdqi: Math.round(smoothedCompSdqi * 10) / 10,
        worst_channel_sdqi: Math.round(smoothedWorstSdqi * 10) / 10,
        coverage_fraction: Math.round(coverageFraction * 1000) / 1000,
        status: smoothedCompSdqi >= 90.0 ? 'NOMINAL' : smoothedCompSdqi >= 70.0 ? 'DEGRADED' : 'UNRELIABLE',
        channel_qualities: channelQualities,
      },
      engine_health: {
        ehi,
        ehi_raw: ehi,
        status: ehiStatus,
        baseline_status: this.baselineStatus,
        operating_mode: time_s < 20.0 && phase === 'ground_run' ? 'STARTUP_WARMUP' : 'STEADY_FLIGHT',
        channel_health: channelHealth,
      },
      diagnostics: {
        active_prediction: predictedFault,
        predicted_probability: Math.round(predictedProb * 1000) / 1000,
        alert_level: alertLevel,
        class_probabilities: classProbabilities,
        model_name: 'Aero-Twin Multi-Class Diagnostic Classifier',
        split_protocol: modelProtocol,
      },
      alerts,
    };

    return frame;
  }
}
