import React from 'react';

interface InstrumentDialProps {
  label: string;
  unit: string;
  value: number | null | undefined;
  target?: number;
  min: number;
  max: number;
  cautionLow?: number;
  cautionHigh?: number;
  warningLow?: number;
  warningHigh?: number;
  isStale?: boolean;
  isMissing?: boolean;
  isInvalid?: boolean;
  subsystem?: string;
  precision?: number;
}

export const InstrumentDial: React.FC<InstrumentDialProps> = ({
  label,
  unit,
  value,
  target,
  min,
  max,
  cautionLow,
  cautionHigh,
  warningLow,
  warningHigh,
  isStale = false,
  isMissing = false,
  isInvalid = false,
  subsystem,
  precision = 1,
}) => {
  const isAvailable = value !== null && value !== undefined && !isMissing && !isNaN(value);
  const displayVal = isAvailable ? (value as number).toFixed(precision) : '---';

  // Normalize needle rotation angle (-135deg to +135deg -> total 270deg sweep)
  const clampedVal = isAvailable ? Math.max(min, Math.min(max, value as number)) : min;
  const ratio = (clampedVal - min) / (max - min);
  const angle = -135 + ratio * 270;

  // Target needle angle if command is provided
  let targetAngle: number | null = null;
  if (target !== undefined && target !== null) {
    const clampedTarget = Math.max(min, Math.min(max, target));
    const targetRatio = (clampedTarget - min) / (max - min);
    targetAngle = -135 + targetRatio * 270;
  }

  // Determine alert status color
  let statusColor = 'text-sky-400';
  let arcColor = 'stroke-sky-500';
  let badgeText: string | null = null;

  if (!isAvailable) {
    statusColor = 'text-red-400';
    badgeText = isMissing ? 'MISSING' : 'INVALID';
  } else {
    const num = value as number;
    if ((warningHigh !== undefined && num >= warningHigh) || (warningLow !== undefined && num <= warningLow)) {
      statusColor = 'text-red-400';
      arcColor = 'stroke-red-500';
      badgeText = 'WARNING';
    } else if ((cautionHigh !== undefined && num >= cautionHigh) || (cautionLow !== undefined && num <= cautionLow)) {
      statusColor = 'text-amber-400';
      arcColor = 'stroke-amber-500';
      badgeText = 'CAUTION';
    }
  }

  if (isStale) {
    badgeText = 'STALE';
  }

  // SVG parameters for 270 deg circular gauge arc
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * (270 / 360);
  const strokeDashoffset = arcLength - arcLength * ratio;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-col items-center justify-between shadow-lg relative select-none hover:border-slate-700 transition-colors">
      {/* Top Label & Badge */}
      <div className="w-full flex justify-between items-center text-xs mb-1">
        <span className="font-semibold tracking-wider text-slate-300 uppercase truncate" title={label}>
          {label}
        </span>
        {badgeText && (
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
              badgeText === 'WARNING' || badgeText === 'INVALID' || badgeText === 'MISSING'
                ? 'bg-red-950 text-red-300 border border-red-800'
                : 'bg-amber-950 text-amber-300 border border-amber-800'
            }`}
          >
            {badgeText}
          </span>
        )}
      </div>

      {/* Radial Gauge Dial */}
      <div className="relative w-28 h-28 flex items-center justify-center my-1">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background Track (270 degrees) */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#1e293b"
            strokeWidth="7"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            className="transform rotate-135 origin-center"
          />

          {/* Active Colored Arc */}
          {isAvailable && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth="7"
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`${arcColor} transform rotate-135 origin-center transition-all duration-300`}
            />
          )}

          {/* Warning high tick if defined */}
          {warningHigh !== undefined && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#ef4444"
              strokeWidth="7"
              strokeDasharray={`4 ${circumference}`}
              strokeDashoffset={arcLength - arcLength * ((warningHigh - min) / (max - min))}
              className="transform rotate-135 origin-center opacity-80"
            />
          )}
        </svg>

        {/* Central Dial Needle */}
        {isAvailable && (
          <div
            className="absolute w-full h-full flex items-center justify-center pointer-events-none transition-transform duration-300"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <div className="w-1 h-12 bg-gradient-to-t from-slate-400 to-cyan-300 rounded-full shadow-md transform -translate-y-5" />
            <div className="absolute w-3 h-3 bg-slate-300 rounded-full border border-slate-900 shadow" />
          </div>
        )}

        {/* Target Command Needle (Orange Bug) */}
        {targetAngle !== null && (
          <div
            className="absolute w-full h-full flex items-center justify-center pointer-events-none"
            style={{ transform: `rotate(${targetAngle}deg)` }}
            title={`Command Target: ${target}`}
          >
            <div className="w-1.5 h-3 bg-amber-400 rounded-sm transform -translate-y-11 shadow-sm" />
          </div>
        )}

        {/* Min / Max Tick Labels */}
        <span className="absolute bottom-1 left-2 text-[9px] font-mono text-slate-500">
          {min}
        </span>
        <span className="absolute bottom-1 right-2 text-[9px] font-mono text-slate-500">
          {max}
        </span>
      </div>

      {/* High-Contrast Digital Value Readout */}
      <div className="w-full flex flex-col items-center mt-1 bg-slate-950/80 py-1 px-2 rounded border border-slate-800/80">
        <div className="flex items-baseline space-x-1">
          <span className={`text-base font-bold font-mono tracking-tight tabular-nums ${statusColor}`}>
            {displayVal}
          </span>
          <span className="text-[10px] font-mono text-slate-400">{unit}</span>
        </div>

        {target !== undefined && (
          <div className="text-[10px] font-mono text-slate-500 flex items-center space-x-1">
            <span>CMD:</span>
            <span className="text-amber-400 font-semibold tabular-nums">{target.toFixed(precision)}</span>
          </div>
        )}
      </div>

      {subsystem && (
        <span className="text-[9px] text-slate-600 font-mono mt-1 tracking-wider uppercase">
          {subsystem}
        </span>
      )}
    </div>
  );
};
