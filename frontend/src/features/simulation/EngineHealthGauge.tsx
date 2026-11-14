import React, { useState } from 'react';
import { HeartPulse, Info } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

export const EngineHealthGauge: React.FC = () => {
  const { currentFrame } = useSimulation();
  const [showInfo, setShowInfo] = useState(false);

  const ehi = currentFrame?.engine_health?.ehi;
  const healthIndex = ehi !== null && ehi !== undefined ? Math.round(ehi) : 96;

  // Determine health condition
  const isHealthy = healthIndex >= 90;
  const isCaution = healthIndex >= 75 && healthIndex < 90;

  // Arc math for 180° gauge: radius = 54, strokeWidth = 10
  // Perimeter of semicircle = π * r ≈ 3.14159 * 54 ≈ 169.6
  const radius = 54;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (healthIndex / 100) * circumference;

  return (
    <div className="relative bg-[#0c1626]/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-1">
        <div className="flex items-center space-x-2">
          <HeartPulse className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            Engine Health
          </h3>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="text-slate-400 hover:text-white p-1 rounded transition"
          title="Engine Health Index Info"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>

      {showInfo && (
        <div className="absolute top-12 right-4 z-30 p-3 rounded-xl bg-[#091322] border border-cyan-500/80 text-[11px] shadow-2xl max-w-xs space-y-1 animate-fade-in">
          <div className="font-bold text-cyan-300">Composite Health Index (EHI)</div>
          <p className="text-slate-300 text-[10px] leading-tight">
            Synthesized from 10 sensor residual z-scores, thermal margins, and SDQI quality metrics.
          </p>
        </div>
      )}

      {/* 2. Semicircular Rainbow Gauge matching screenshot */}
      <div className="relative flex flex-col items-center justify-center pt-2 pb-1">
        <svg className="w-44 h-24 overflow-visible" viewBox="0 0 130 75">
          <defs>
            {/* Rainbow Gradient Arc */}
            <linearGradient id="rainbowGaugeGrad" x1="0%" y1="100%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>

          {/* Background track arc */}
          <path
            d="M 11 65 A 54 54 0 0 1 119 65"
            fill="none"
            stroke="#1e293b"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Active rainbow gauge arc */}
          <path
            d="M 11 65 A 54 54 0 0 1 119 65"
            fill="none"
            stroke="url(#rainbowGaugeGrad)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* Center Numbers */}
        <div className="absolute top-10 flex flex-col items-center justify-center text-center">
          <div className="text-2xl font-black font-mono text-white tracking-tight flex items-baseline">
            <span>{healthIndex}</span>
            <span className="text-xs text-slate-300 font-sans ml-0.5">%</span>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
            Health Index
          </div>
        </div>
      </div>

      {/* 3. Bottom Status Pill */}
      <div className="flex justify-center pt-1">
        <span
          className={`px-5 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
            isHealthy
              ? 'bg-emerald-950/80 border border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
              : isCaution
              ? 'bg-amber-950/80 border border-amber-500 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
              : 'bg-rose-950/80 border border-rose-500 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
          }`}
        >
          {isHealthy ? 'Healthy' : isCaution ? 'Degraded' : 'Critical'}
        </span>
      </div>
    </div>
  );
};
