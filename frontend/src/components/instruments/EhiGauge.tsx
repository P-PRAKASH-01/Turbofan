import React from 'react';
import { EHIStatusBand, BaselineStatus } from '../../types/telemetry';
import { ShieldCheck, AlertTriangle, AlertOctagon, Info } from 'lucide-react';

interface EhiGaugeProps {
  ehi: number | null;
  status: EHIStatusBand;
  baselineStatus: BaselineStatus;
  coverageFraction: number;
}

export const EhiGauge: React.FC<EhiGaugeProps> = ({
  ehi,
  status,
  baselineStatus,
  coverageFraction,
}) => {
  const isSufficient = status !== 'INSUFFICIENT_TELEMETRY_COVERAGE' && ehi !== null;

  // Band configs
  const bandInfo = {
    BAND_1_NOMINAL: {
      label: 'NOMINAL',
      sublabel: 'Band 1: Expected Healthy Operation (≥90)',
      color: 'text-emerald-400',
      stroke: 'stroke-emerald-500',
      bgBadge: 'bg-emerald-950/80 border-emerald-700 text-emerald-300',
      icon: ShieldCheck,
    },
    BAND_2_ACCEPTABLE: {
      label: 'ACCEPTABLE',
      sublabel: 'Band 2: Minor Residual Deviation (75–89)',
      color: 'text-sky-400',
      stroke: 'stroke-sky-500',
      bgBadge: 'bg-sky-950/80 border-sky-700 text-sky-300',
      icon: Info,
    },
    BAND_3_DEGRADED: {
      label: 'DEGRADED',
      sublabel: 'Band 3: Advisory Maintenance Check (50–74)',
      color: 'text-amber-400',
      stroke: 'stroke-amber-500',
      bgBadge: 'bg-amber-950/80 border-amber-700 text-amber-300',
      icon: AlertTriangle,
    },
    BAND_4_CRITICAL: {
      label: 'CRITICAL',
      sublabel: 'Band 4: Severe Engine Impairment (<50)',
      color: 'text-red-400',
      stroke: 'stroke-red-500',
      bgBadge: 'bg-red-950/80 border-red-700 text-red-300',
      icon: AlertOctagon,
    },
    INSUFFICIENT_TELEMETRY_COVERAGE: {
      label: 'UNAVAILABLE',
      sublabel: 'Insufficient Valid Sensor Telemetry (<80% Coverage)',
      color: 'text-slate-400',
      stroke: 'stroke-slate-600',
      bgBadge: 'bg-slate-900 border-slate-700 text-slate-300',
      icon: AlertTriangle,
    },
  }[status] || {
    label: 'UNKNOWN',
    sublabel: 'Health assessment unverified',
    color: 'text-slate-400',
    stroke: 'stroke-slate-600',
    bgBadge: 'bg-slate-900 border-slate-700 text-slate-300',
    icon: Info,
  };

  const IconComponent = bandInfo.icon;

  // Arc math: 220 degree sweep
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * (220 / 360);
  const ratio = isSufficient ? Math.max(0, Math.min(100, ehi as number)) / 100 : 0;
  const strokeDashoffset = arcLength - arcLength * ratio;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 flex flex-col items-center justify-between shadow-xl relative hover:border-slate-700 transition-colors">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-1">
        <div className="flex items-center space-x-1.5">
          <IconComponent className={`w-4 h-4 ${bandInfo.color}`} />
          <span className="font-bold text-xs tracking-wider text-slate-200">ENGINE HEALTH INDEX (EHI)</span>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${bandInfo.bgBadge}`}>
          {bandInfo.label}
        </span>
      </div>

      {/* Circular Radial Gauge */}
      <div className="relative w-36 h-36 flex items-center justify-center my-1">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 130 130">
          {/* Background track */}
          <circle
            cx="65"
            cy="65"
            r={radius}
            fill="transparent"
            stroke="#1e293b"
            strokeWidth="9"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            className="transform rotate-160 origin-center"
          />

          {/* Color band zone indicator: Critical zone (<50) */}
          <circle
            cx="65"
            cy="65"
            r={radius}
            fill="transparent"
            stroke="#ef4444"
            strokeWidth="3"
            strokeDasharray={`${arcLength * 0.50} ${circumference}`}
            className="transform rotate-160 origin-center opacity-40"
          />

          {/* Color band zone indicator: Acceptable zone (75-90) */}
          <circle
            cx="65"
            cy="65"
            r={radius}
            fill="transparent"
            stroke="#f59e0b"
            strokeWidth="3"
            strokeDasharray={`${arcLength * 0.25} ${circumference}`}
            strokeDashoffset={-arcLength * 0.50}
            className="transform rotate-160 origin-center opacity-40"
          />

          {/* Color band zone indicator: Nominal zone (90-100) */}
          <circle
            cx="65"
            cy="65"
            r={radius}
            fill="transparent"
            stroke="#10b981"
            strokeWidth="3"
            strokeDasharray={`${arcLength * 0.10} ${circumference}`}
            strokeDashoffset={-arcLength * 0.90}
            className="transform rotate-160 origin-center opacity-60"
          />

          {/* Active Health Arc */}
          {isSufficient && (
            <circle
              cx="65"
              cy="65"
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth="9"
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`${bandInfo.stroke} transform rotate-160 origin-center transition-all duration-300`}
            />
          )}
        </svg>

        {/* Central Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isSufficient ? (
            <>
              <span className={`text-3xl font-black font-mono tracking-tight tabular-nums ${bandInfo.color}`}>
                {(ehi as number).toFixed(1)}
              </span>
              <span className="text-[10px] font-mono text-slate-400">/ 100</span>
            </>
          ) : (
            <>
              <span className="text-xl font-bold font-mono text-slate-500">NULL</span>
              <span className="text-[9px] font-mono text-amber-400 text-center px-2">FAILSAFE GATE</span>
            </>
          )}
        </div>
      </div>

      {/* Description & Baseline Status */}
      <div className="w-full text-center mt-1">
        <p className="text-[11px] text-slate-400 font-medium">{bandInfo.sublabel}</p>
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-2 pt-2 border-t border-slate-800">
          <span>BASELINE: <span className="text-slate-300 font-semibold">{baselineStatus}</span></span>
          <span>COVERAGE: <span className="text-slate-300 font-semibold">{(coverageFraction * 100).toFixed(0)}%</span></span>
        </div>
      </div>
    </div>
  );
};
