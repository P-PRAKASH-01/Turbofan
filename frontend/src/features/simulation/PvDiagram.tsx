import React, { useMemo } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { Activity } from 'lucide-react';

interface PvDiagramProps {
  crankAngleDeg?: number;
}

export const PvDiagram: React.FC<PvDiagramProps> = () => {
  const { currentFrame, selectedEngine, controls } = useSimulation();
  const { raw_measurements, dynamic_reference, operating_inputs, diagnostics } = currentFrame;

  const throttle = controls.throttle_pct;
  const compressionRatio = selectedEngine.compression_ratio || 9.5;
  const displacement_l = selectedEngine.displacement_l || 1.0;
  const displacement_cm3 = displacement_l * 1000.0;
  const clearance_cm3 = displacement_cm3 / (compressionRatio - 1.0);
  const totalVolume_cm3 = displacement_cm3 + clearance_cm3;

  // Pressures standardized to kPa
  const pIntakeLiveKpa = Math.max(20.0, (raw_measurements.manifold_pressure || 75000) / 1000.0);
  const pIntakeNominalKpa = Math.max(20.0, (dynamic_reference.manifold_pressure || 75000) / 1000.0);
  const pAmbientKpa = (operating_inputs.ambient_pressure_pa || 101325) / 1000.0;
  const pExhaustKpa = pAmbientKpa * 1.04;

  const gammaComp = 1.32;
  const gammaExp = 1.28;

  // Live combustion degradation factor
  let liveCombustionFactor = 1.0;
  if (diagnostics.active_prediction === 'combustion_irregularity') {
    liveCombustionFactor = 0.70;
  } else if (diagnostics.active_prediction === 'efficiency_degradation') {
    liveCombustionFactor = 0.82;
  } else if (diagnostics.active_prediction === 'thermal_abnormality') {
    liveCombustionFactor = 0.92;
  }

  // Peak combustion pressure rise (kPa) based on throttle
  const nominalCombustionDeltaKpa = 2200.0 + 3400.0 * (throttle / 100.0);
  const liveCombustionDeltaKpa = nominalCombustionDeltaKpa * liveCombustionFactor;

  // 1. Healthy Nominal Cycle State Points (in kPa)
  const pCompTdcNominal = pIntakeNominalKpa * Math.pow(compressionRatio, gammaComp);
  const pPeakNominalKpa = pCompTdcNominal + nominalCombustionDeltaKpa;
  const pExpBdcNominal = pPeakNominalKpa * Math.pow(1.0 / compressionRatio, gammaExp);

  // 2. Live Cycle State Points (in kPa)
  const pCompTdcLive = pIntakeLiveKpa * Math.pow(compressionRatio, gammaComp);
  const pPeakLiveKpa = pCompTdcLive + liveCombustionDeltaKpa;
  const pExpBdcLive = pPeakLiveKpa * Math.pow(1.0 / compressionRatio, gammaExp);

  // SVG Canvas dimensions: 420 x 240
  const svgW = 420;
  const svgH = 240;
  const padL = 50;
  const padR = 25;
  const padT = 25;
  const padB = 38;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  // Log Axes Scaling: log10(V) and log10(P in kPa)
  // V range: [V_tdc = 1.0, V_bdc = compressionRatio]
  const logVMin = 0.0; // log10(1) = 0
  const logVMax = Math.log10(compressionRatio);

  // P range: [pMinKpa ~ 25 kPa, pMaxKpa ~ 10,000 kPa]
  const pMinKpa = 25.0;
  const pMaxKpa = Math.max(8000.0, Math.ceil((Math.max(pPeakNominalKpa, pPeakLiveKpa) * 1.25) / 1000) * 1000);
  const logPMin = Math.log10(pMinKpa);
  const logPMax = Math.log10(pMaxKpa);

  // Coordinate transforms for log axes
  const vToLogX = (vNorm: number) => {
    const logV = Math.log10(Math.max(1.0, Math.min(compressionRatio, vNorm)));
    return padL + ((logV - logVMin) / (logVMax - logVMin)) * plotW;
  };

  const pToLogY = (pKpa: number) => {
    const logP = Math.log10(Math.max(pMinKpa, Math.min(pMaxKpa, pKpa)));
    return padT + plotH - ((logP - logPMin) / (logPMax - logPMin)) * plotH;
  };

  // Build Closed Otto Loops (Healthy Nominal vs Live Faulty)
  const { nominalLoopPath, liveLoopPath } = useMemo(() => {
    const steps = 30;

    // Helper: generate closed loop path given cycle parameters
    const generateLoop = (pIntake: number, pPeak: number, pExpBdc: number, pCompTdc: number) => {
      const points: string[] = [];

      // 1. Isentropic Compression: V_bdc (r) -> V_tdc (1.0)
      for (let i = 0; i <= steps; i++) {
        const frac = i / steps;
        // Log-spaced volume from r down to 1
        const logV = logVMax - frac * (logVMax - logVMin);
        const v = Math.pow(10, logV);
        const p = pIntake * Math.pow(compressionRatio / v, gammaComp);
        const x = vToLogX(v).toFixed(1);
        const y = pToLogY(p).toFixed(1);
        points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
      }

      // 2. Isochoric Combustion at TDC (V = 1.0): P rises from pCompTdc to pPeak
      points.push(`L ${vToLogX(1.0).toFixed(1)} ${pToLogY(pPeak).toFixed(1)}`);

      // 3. Isentropic Expansion: V_tdc (1.0) -> V_bdc (r)
      for (let i = 0; i <= steps; i++) {
        const frac = i / steps;
        const logV = logVMin + frac * (logVMax - logVMin);
        const v = Math.pow(10, logV);
        const p = pPeak * Math.pow(1.0 / v, gammaExp);
        const x = vToLogX(v).toFixed(1);
        const y = pToLogY(p).toFixed(1);
        points.push(`L ${x} ${y}`);
      }

      // 4. Isochoric Blowdown at BDC (V = r): P drops from pExpBdc to pExhaust
      points.push(`L ${vToLogX(compressionRatio).toFixed(1)} ${pToLogY(pExhaustKpa).toFixed(1)}`);

      // 5. Exhaust Stroke: BDC (r) -> TDC (1.0) at constant pExhaust
      points.push(`L ${vToLogX(1.0).toFixed(1)} ${pToLogY(pExhaustKpa).toFixed(1)}`);

      // 6. Intake Valve Open: pressure drops from pExhaust to pIntake at TDC
      points.push(`L ${vToLogX(1.0).toFixed(1)} ${pToLogY(pIntake).toFixed(1)}`);

      // 7. Intake Stroke: TDC (1.0) -> BDC (r) at constant pIntake, closing the loop!
      points.push(`L ${vToLogX(compressionRatio).toFixed(1)} ${pToLogY(pIntake).toFixed(1)}`);
      points.push('Z');

      return points.join(' ');
    };

    return {
      nominalLoopPath: generateLoop(pIntakeNominalKpa, pPeakNominalKpa, pExpBdcNominal, pCompTdcNominal),
      liveLoopPath: generateLoop(pIntakeLiveKpa, pPeakLiveKpa, pExpBdcLive, pCompTdcLive),
    };
  }, [
    compressionRatio,
    gammaComp,
    gammaExp,
    pIntakeNominalKpa,
    pPeakNominalKpa,
    pExpBdcNominal,
    pCompTdcNominal,
    pIntakeLiveKpa,
    pPeakLiveKpa,
    pExpBdcLive,
    pCompTdcLive,
    pExhaustKpa,
    logVMin,
    logVMax,
    pMinKpa,
    pMaxKpa,
  ]);

  const isDegraded = liveCombustionFactor < 0.98 || Math.abs(pIntakeLiveKpa - pIntakeNominalKpa) > 5.0;
  const liveStrokeColor = isDegraded ? '#f59e0b' : '#10b981';

  // Log scale pressure ticks for Y-axis (kPa)
  const pressureTicksKpa = [50, 100, 250, 500, 1000, 2500, 5000, 7500];

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 shadow-sm text-xs space-y-3">
      {/* Header with Overlay Legend */}
      <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-slate-200">
            Thermodynamic P-V Indicator Diagram (Log-Log Otto Cycle)
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[11px] text-slate-400">
          <span className="flex items-center space-x-1">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-sky-400 inline-block" />
            <span>Healthy Baseline</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className={`w-3 h-0.5 inline-block rounded ${isDegraded ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span>Live Operating Cycle</span>
          </span>
        </div>
      </div>

      {/* SVG Log-Log Canvas */}
      <div className="relative w-full flex items-center justify-center bg-slate-950/40 p-2 rounded-lg border border-slate-800/60 overflow-hidden">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md h-56 select-none">
          {/* Pressure Grid Lines (Log Scale in kPa) */}
          {pressureTicksKpa.map((pVal) => {
            if (pVal < pMinKpa || pVal > pMaxKpa) return null;
            const y = pToLogY(pVal);
            return (
              <g key={`grid-p-${pVal}`}>
                <line
                  x1={padL}
                  y1={y}
                  x2={padL + plotW}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <text x={padL - 4} y={y + 3} fill="#64748b" fontSize="7" textAnchor="end">
                  {pVal >= 1000 ? `${(pVal / 1000).toFixed(0)}k` : pVal}
                </text>
              </g>
            );
          })}

          {/* Volume Grid Lines (TDC & BDC in Log Scale) */}
          {[1.0, 2.0, 4.0, compressionRatio].map((vVal) => {
            const x = vToLogX(vVal);
            return (
              <line
                key={`grid-v-${vVal}`}
                x1={x}
                y1={padT}
                x2={x}
                y2={padT + plotH}
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            );
          })}

          {/* Axes */}
          <line
            x1={padL}
            y1={padT + plotH}
            x2={padL + plotW}
            y2={padT + plotH}
            stroke="#475569"
            strokeWidth="1.5"
          />
          <line
            x1={padL}
            y1={padT}
            x2={padL}
            y2={padT + plotH}
            stroke="#475569"
            strokeWidth="1.5"
          />

          {/* Axis Labels */}
          <text x={padL - 6} y={padT - 8} fill="#94a3b8" fontSize="8" fontWeight="bold">
            log P (kPa)
          </text>
          <text x={padL + plotW / 2} y={padT + plotH + 26} fill="#94a3b8" fontSize="8" textAnchor="middle">
            log V (Cylinder Volume Ratio)
          </text>

          {/* TDC / BDC Markers */}
          <line
            x1={vToLogX(1.0)}
            y1={padT}
            x2={vToLogX(1.0)}
            y2={padT + plotH}
            stroke="#38bdf8"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <text x={vToLogX(1.0)} y={padT + plotH + 13} fill="#38bdf8" fontSize="7" textAnchor="middle" fontWeight="bold">
            TDC (Vc)
          </text>

          <line
            x1={vToLogX(compressionRatio)}
            y1={padT}
            x2={vToLogX(compressionRatio)}
            y2={padT + plotH}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <text x={vToLogX(compressionRatio)} y={padT + plotH + 13} fill="#94a3b8" fontSize="7" textAnchor="middle" fontWeight="bold">
            BDC ({compressionRatio}:1)
          </text>

          {/* Healthy Nominal Otto Loop (Dashed Cyan Overlay) */}
          <path
            d={nominalLoopPath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            strokeOpacity="0.75"
          />

          {/* Live Operating Otto Loop (Solid, Color-coded) */}
          <path
            d={liveLoopPath}
            fill={isDegraded ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)'}
            stroke={liveStrokeColor}
            strokeWidth="2.5"
          />

          {/* Peak Pressure Marker on Live Cycle */}
          <circle cx={vToLogX(1.0)} cy={pToLogY(pPeakLiveKpa)} r="3.5" fill={liveStrokeColor} stroke="#ffffff" strokeWidth="1" />
          <text
            x={vToLogX(1.0) + 6}
            y={pToLogY(pPeakLiveKpa) + 2}
            fill="#f1f5f9"
            fontSize="7.5"
            fontWeight="bold"
          >
            P_max: {Math.round(pPeakLiveKpa).toLocaleString()} kPa
          </text>

          {/* Live MAP Marker */}
          <circle cx={vToLogX(compressionRatio)} cy={pToLogY(pIntakeLiveKpa)} r="3" fill="#38bdf8" />
          <text
            x={vToLogX(compressionRatio) - 4}
            y={pToLogY(pIntakeLiveKpa) - 4}
            fill="#38bdf8"
            fontSize="7"
            textAnchor="end"
          >
            MAP: {pIntakeLiveKpa.toFixed(1)} kPa
          </text>
        </svg>
      </div>

      {/* Clean Summary Cards (All Pressures in kPa) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Peak In-Cylinder</span>
          <span className="font-semibold text-slate-100 text-sm tabular-nums">
            {Math.round(pPeakLiveKpa).toLocaleString()} kPa
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Max Combustion Pressure</span>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Manifold Air (MAP)</span>
          <span className="font-semibold text-sky-400 text-sm tabular-nums">
            {pIntakeLiveKpa.toFixed(1)} kPa
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Intake Plenum Pressure</span>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Compression Ratio</span>
          <span className="font-semibold text-slate-100 text-sm tabular-nums">
            {compressionRatio}:1
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Geometry (V_bdc / V_tdc)</span>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Thermodynamic State</span>
          <span className={`font-semibold text-sm ${isDegraded ? 'text-amber-400' : 'text-emerald-400'}`}>
            {isDegraded ? 'Degraded Cycle' : 'Optimal Otto Loop'}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {liveCombustionFactor < 1 ? `Efficiency: ${(liveCombustionFactor * 100).toFixed(0)}%` : 'Nominal Work Area'}
          </span>
        </div>
      </div>
    </div>
  );
};
