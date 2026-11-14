import React, { useMemo } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { Gauge } from 'lucide-react';

interface DynoCurveProps {
  dynoBrakeLoad?: number;
  onBrakeLoadChange?: (val: number) => void;
}

export const DynoCurve: React.FC<DynoCurveProps> = ({
  dynoBrakeLoad = 50,
  onBrakeLoadChange,
}) => {
  const { currentFrame, selectedEngine } = useSimulation();
  const { raw_measurements } = currentFrame;

  const currentRpm = raw_measurements.rpm || 0;
  const currentPower = raw_measurements.power || 0;
  const currentTorque = raw_measurements.torque || 0;

  const ratedRpm = selectedEngine.rated_rpm || 5000;
  const idleRpm = selectedEngine.idle_rpm || 800;
  const displacement_l = selectedEngine.displacement_l || 1.0;
  const ratedPowerKw = selectedEngine.rated_power_kw || 45.0;

  // Maximum scales for Dyno plotting
  const rpmMin = Math.max(500, Math.round(idleRpm * 0.7));
  const rpmMax = Math.round(ratedRpm * 1.15);
  const maxPowerKw = Math.ceil((ratedPowerKw * 1.25) / 10) * 10;
  const estMaxTorque = Math.ceil(((ratedPowerKw * 9548.8 / (ratedRpm * 0.72)) * 1.25) / 20) * 20;
  const maxTorqueNm = Math.max(100, estMaxTorque);

  // SVG Canvas: 420 x 220
  const svgW = 420;
  const svgH = 220;
  const padL = 40;
  const padR = 40;
  const padT = 20;
  const padB = 35;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const rpmToX = (rpm: number) => padL + ((Math.max(rpmMin, Math.min(rpmMax, rpm)) - rpmMin) / (rpmMax - rpmMin)) * plotW;
  const torqueToY = (t: number) => padT + plotH - (Math.max(0, t) / maxTorqueNm) * plotH;
  const powerToY = (p: number) => padT + plotH - (Math.max(0, p) / maxPowerKw) * plotH;

  // Generate torque and power curves calibrated so dyno peak power strictly matches rated power
  const { torquePath, powerPath, peakTorquePoint, peakPowerPoint } = useMemo(() => {
    const steps = 50;
    const rpmPeakTorque = Math.round(ratedRpm * 0.72);

    // 1. First pass: compute unscaled characteristic torque curve shape peaking at rpmPeakTorque
    const rawData: Array<{ rpm: number; torqueShape: number; powerShape: number }> = [];
    let maxRawPower = 0;

    for (let i = 0; i <= steps; i++) {
      const rpmVal = rpmMin + (i / steps) * (rpmMax - rpmMin);
      const rpmSpread = (rpmMax - rpmMin) * 0.55;
      const torqueRatio = Math.max(0.18, 1.0 - Math.pow((rpmVal - rpmPeakTorque) / rpmSpread, 2) * 0.65);
      const rawPower = (torqueRatio * rpmVal) / 9548.8;

      if (rawPower > maxRawPower) {
        maxRawPower = rawPower;
      }
      rawData.push({ rpm: rpmVal, torqueShape: torqueRatio, powerShape: rawPower });
    }

    // 2. Exact scale factor: calibrate dyno curve so peak power strictly matches rated engine power
    const scaleFactor = ratedPowerKw / (maxRawPower > 0 ? maxRawPower : 1.0);

    const tPoints: string[] = [];
    const pPoints: string[] = [];
    let maxT = 0;
    let maxTRpm = rpmPeakTorque;
    let maxP = 0;
    let maxPRpm = ratedRpm;

    rawData.forEach((pt, i) => {
      const torqueVal = pt.torqueShape * scaleFactor;
      const powerVal = pt.powerShape * scaleFactor;

      if (torqueVal > maxT) {
        maxT = torqueVal;
        maxTRpm = pt.rpm;
      }
      if (powerVal > maxP) {
        maxP = powerVal;
        maxPRpm = pt.rpm;
      }

      const x = rpmToX(pt.rpm).toFixed(1);
      const yT = torqueToY(torqueVal).toFixed(1);
      const yP = powerToY(powerVal).toFixed(1);

      tPoints.push(`${i === 0 ? 'M' : 'L'} ${x} ${yT}`);
      pPoints.push(`${i === 0 ? 'M' : 'L'} ${x} ${yP}`);
    });

    return {
      torquePath: tPoints.join(' '),
      powerPath: pPoints.join(' '),
      peakTorquePoint: { rpm: Math.round(maxTRpm), torque: maxT },
      peakPowerPoint: { rpm: Math.round(maxPRpm), power: maxP },
    };
  }, [ratedRpm, ratedPowerKw, rpmMin, rpmMax, maxPowerKw, maxTorqueNm]);

  const currentCursorX = rpmToX(currentRpm);
  const currentTorqueY = torqueToY(currentTorque);
  const currentPowerY = powerToY(currentPower);

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 shadow-sm text-xs space-y-3">
      {/* Header with Clean Legend */}
      <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <Gauge className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-slate-200">
            Dynamometer Performance Curve
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[11px] text-slate-400">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-amber-400 inline-block rounded" />
            <span>Torque (Nm)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-sky-400 inline-block rounded" />
            <span>Power (kW)</span>
          </span>
        </div>
      </div>

      {/* SVG Dyno Chart */}
      <div className="relative w-full flex items-center justify-center bg-slate-950/40 p-2 rounded-lg border border-slate-800/60 overflow-hidden">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md h-56 select-none">
          {/* Subtle Grid Lines */}
          {[0.25, 0.5, 0.75].map((frac) => {
            const y = padT + plotH * frac;
            return (
              <line
                key={`grid-y-${frac}`}
                x1={padL}
                y1={y}
                x2={padL + plotW}
                y2={y}
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            );
          })}
          {[1000, 2000, 3000, 4000, 5000].map((rVal) => {
            const x = rpmToX(rVal);
            return (
              <g key={`grid-x-${rVal}`}>
                <line
                  x1={x}
                  y1={padT}
                  x2={x}
                  y2={padT + plotH}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text x={x} y={padT + plotH + 14} fill="#64748b" fontSize="7" textAnchor="middle">
                  {rVal}
                </text>
              </g>
            );
          })}

          {/* Left Y-Axis (Torque, Amber) */}
          <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#475569" strokeWidth="1" />
          <text x={padL - 4} y={padT + 4} fill="#f59e0b" fontSize="7" textAnchor="end">
            {maxTorqueNm}
          </text>
          <text x={padL - 4} y={padT + plotH / 2 + 2} fill="#64748b" fontSize="7" textAnchor="end">
            {Math.round(maxTorqueNm / 2)}
          </text>
          <text x={padL - 4} y={padT + plotH} fill="#64748b" fontSize="7" textAnchor="end">
            0
          </text>

          {/* Right Y-Axis (Power, Sky Blue) */}
          <line x1={padL + plotW} y1={padT} x2={padL + plotW} y2={padT + plotH} stroke="#475569" strokeWidth="1" />
          <text x={padL + plotW + 4} y={padT + 4} fill="#38bdf8" fontSize="7" textAnchor="start">
            {maxPowerKw}
          </text>
          <text x={padL + plotW + 4} y={padT + plotH / 2 + 2} fill="#64748b" fontSize="7" textAnchor="start">
            {Math.round(maxPowerKw / 2)}
          </text>
          <text x={padL + plotW + 4} y={padT + plotH} fill="#64748b" fontSize="7" textAnchor="start">
            0
          </text>

          {/* Bottom X-Axis (RPM) */}
          <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="#475569" strokeWidth="1" />
          <text x={padL + plotW / 2} y={padT + plotH + 24} fill="#94a3b8" fontSize="8" textAnchor="middle">
            Engine Speed (RPM)
          </text>

          {/* Redline Region Shading (> Rated RPM) */}
          <rect
            x={rpmToX(ratedRpm)}
            y={padT}
            width={Math.max(0, padL + plotW - rpmToX(ratedRpm))}
            height={plotH}
            fill="#f43f5e"
            fillOpacity="0.06"
          />

          {/* Curves */}
          <path d={torquePath} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
          <path d={powerPath} fill="none" stroke="#38bdf8" strokeWidth="2.5" />

          {/* Peak Torque Marker */}
          <circle cx={rpmToX(peakTorquePoint.rpm)} cy={torqueToY(peakTorquePoint.torque)} r="3" fill="#f59e0b" />
          <text x={rpmToX(peakTorquePoint.rpm)} y={torqueToY(peakTorquePoint.torque) - 5} fill="#fde68a" fontSize="7" textAnchor="middle">
            {Math.round(peakTorquePoint.torque)} Nm
          </text>

          {/* Peak Power Marker */}
          <circle cx={rpmToX(peakPowerPoint.rpm)} cy={powerToY(peakPowerPoint.power)} r="3" fill="#38bdf8" />
          <text x={rpmToX(peakPowerPoint.rpm)} y={powerToY(peakPowerPoint.power) - 5} fill="#bae6fd" fontSize="7" textAnchor="middle">
            {Math.round(peakPowerPoint.power)} kW
          </text>

          {/* Operating Point Cursor */}
          {currentRpm > 200 && (
            <g>
              <line
                x1={currentCursorX}
                y1={padT}
                x2={currentCursorX}
                y2={padT + plotH}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle cx={currentCursorX} cy={currentTorqueY} r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx={currentCursorX} cy={currentPowerY} r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
            </g>
          )}
        </svg>
      </div>

      {/* Simplified, Clean Dyno Readouts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Shaft Power</span>
          <span className="font-semibold text-sky-400 text-sm tabular-nums">
            {Math.round(currentPower)} kW
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Active Output</span>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Brake Torque</span>
          <span className="font-semibold text-amber-400 text-sm tabular-nums">
            {Math.round(currentTorque)} Nm
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Shaft Turning Force</span>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 flex flex-col justify-between">
          <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-wider">
            <span>Dyno Brake Load</span>
            <span className="text-slate-200 font-semibold tabular-nums">{dynoBrakeLoad}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            value={dynoBrakeLoad}
            onChange={(e) => onBrakeLoadChange && onBrakeLoadChange(Number(e.target.value))}
            className="w-full cursor-pointer h-1 bg-slate-800 rounded mt-1.5"
          />
          <div className="flex justify-between text-[9px] text-slate-500 mt-1">
            <span>Free Run</span>
            <span>Full Absorption</span>
          </div>
        </div>
      </div>
    </div>
  );
};
