import React from 'react';
import { SensorDataQuality } from '../../types/telemetry';
import { Activity, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface SdqiCardProps {
  sdqi: SensorDataQuality;
}

export const SdqiCard: React.FC<SdqiCardProps> = ({ sdqi }) => {
  const isNominal = sdqi.composite_sdqi >= 90.0 && sdqi.worst_channel_sdqi >= 80.0;
  const isDegraded = !isNominal && (sdqi.composite_sdqi >= 70.0 || sdqi.worst_channel_sdqi >= 50.0);

  const statusColor = isNominal
    ? 'text-emerald-400'
    : isDegraded
    ? 'text-amber-400'
    : 'text-red-400';

  const badgeBg = isNominal
    ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
    : isDegraded
    ? 'bg-amber-950/80 border-amber-700 text-amber-300'
    : 'bg-red-950/80 border-red-700 text-red-300';

  const StatusIcon = isNominal ? CheckCircle2 : isDegraded ? AlertTriangle : AlertCircle;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 flex flex-col justify-between shadow-xl hover:border-slate-700 transition-colors">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-1.5">
          <Activity className="w-4 h-4 text-sky-400" />
          <span className="font-bold text-xs tracking-wider text-slate-200">SENSOR DATA QUALITY (SDQI)</span>
        </div>
        <div className="flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${badgeBg}">
          <StatusIcon className="w-3 h-3 mr-0.5 inline" />
          <span>{sdqi.status}</span>
        </div>
      </div>

      {/* Dual Metrics */}
      <div className="grid grid-cols-2 gap-3 my-2">
        {/* Composite SDQI */}
        <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded flex flex-col items-center">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Composite SDQI</span>
          <span className={`text-2xl font-black font-mono my-0.5 tabular-nums ${statusColor}`}>
            {sdqi.composite_sdqi.toFixed(1)}
          </span>
          <span className="text-[9px] text-slate-500 font-mono">Telemetry Array Mean</span>
        </div>

        {/* Worst-Channel SDQI */}
        <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded flex flex-col items-center">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Worst Channel (min)</span>
          <span
            className={`text-2xl font-black font-mono my-0.5 tabular-nums ${
              sdqi.worst_channel_sdqi >= 80 ? 'text-emerald-400' : sdqi.worst_channel_sdqi >= 50 ? 'text-amber-400' : 'text-red-400'
            }`}
          >
            {sdqi.worst_channel_sdqi.toFixed(1)}
          </span>
          <span className="text-[9px] text-slate-500 font-mono">Single-Sensor Isolation</span>
        </div>
      </div>

      {/* Channel Integrity Pills */}
      <div className="mt-2 pt-2 border-t border-slate-800">
        <div className="text-[10px] font-mono text-slate-400 mb-1 flex justify-between">
          <span>Channel Qualities (q_i):</span>
          <span>Coverage: {(sdqi.coverage_fraction * 100).toFixed(0)}%</span>
        </div>
        <div className="grid grid-cols-5 gap-1 text-[9px] font-mono text-center">
          {Object.entries(sdqi.channel_qualities).map(([ch, q]) => {
            const isGood = q >= 0.8;
            const isMid = q >= 0.4 && q < 0.8;
            return (
              <div
                key={ch}
                className={`py-1 px-0.5 rounded border truncate ${
                  isGood
                    ? 'bg-emerald-950/40 border-emerald-900 text-emerald-300'
                    : isMid
                    ? 'bg-amber-950/40 border-amber-900 text-amber-300'
                    : 'bg-red-950/50 border-red-900 text-red-300 font-bold'
                }`}
                title={`${ch}: q = ${q.toFixed(2)}`}
              >
                {ch.slice(0, 4)}: {q.toFixed(1)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
