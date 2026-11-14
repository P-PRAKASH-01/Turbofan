import React from 'react';

interface InstrumentBarProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  target?: number;
  precision?: number;
  color?: 'cyan' | 'amber' | 'green' | 'blue';
}

export const InstrumentBar: React.FC<InstrumentBarProps> = ({
  label,
  value,
  unit,
  min,
  max,
  target,
  precision = 1,
  color = 'cyan',
}) => {
  const clamped = Math.max(min, Math.min(max, value));
  const pct = ((clamped - min) / (max - min)) * 100;
  const targetPct = target !== undefined ? ((Math.max(min, Math.min(max, target)) - min) / (max - min)) * 100 : null;

  const colorClass = {
    cyan: 'bg-sky-500',
    amber: 'bg-amber-500',
    green: 'bg-emerald-500',
    blue: 'bg-blue-500',
  }[color];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded p-2.5 flex flex-col justify-between">
      <div className="flex justify-between items-center text-xs mb-1">
        <span className="font-semibold text-slate-300 uppercase tracking-wider">{label}</span>
        <div className="font-mono text-sm font-bold text-slate-100 tabular-nums">
          {value.toFixed(precision)} <span className="text-[10px] text-slate-400 font-normal">{unit}</span>
        </div>
      </div>

      <div className="relative w-full h-3 bg-slate-950 rounded border border-slate-800 overflow-hidden my-1">
        <div
          className={`h-full ${colorClass} transition-all duration-300 shadow-sm rounded-l`}
          style={{ width: `${pct}%` }}
        />
        {targetPct !== null && (
          <div
            className="absolute top-0 bottom-0 w-1 bg-amber-400 z-10"
            style={{ left: `${targetPct}%` }}
            title={`Target: ${target}`}
          />
        )}
      </div>

      <div className="flex justify-between text-[9px] font-mono text-slate-500">
        <span>{min}</span>
        {target !== undefined && <span className="text-amber-400">CMD: {target.toFixed(precision)}</span>}
        <span>{max}</span>
      </div>
    </div>
  );
};
