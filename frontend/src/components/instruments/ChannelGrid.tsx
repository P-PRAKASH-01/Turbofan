import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { PhysicalSensorChannels } from '../../types/telemetry';
import { CHANNEL_CONFIGS, ORDERED_CHANNELS } from '../../services/simulationPhysics';

interface ChannelGridProps {
  measurements: PhysicalSensorChannels;
  reference: PhysicalSensorChannels;
  qualities: Record<keyof PhysicalSensorChannels, number>;
}

export const ChannelGrid: React.FC<ChannelGridProps> = ({
  measurements,
  reference,
  qualities,
}) => {
  const { telemetryHistory } = useSimulation();

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 shadow-sm">
      <div className="text-xs font-bold text-slate-300 tracking-wider mb-2 uppercase flex justify-between items-center">
        <span>Physical Telemetry Matrix (Live vs Digital Twin Baseline)</span>
        <span className="text-[10px] text-slate-400 font-mono">10 Monitored Telemetry Channels</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] text-slate-400">
              <th className="py-1 px-2">CHANNEL</th>
              <th className="py-1 px-2">MEASURED (Y_meas)</th>
              <th className="py-1 px-2">REFERENCE (Y_ref)</th>
              <th className="py-1 px-2">RESIDUAL (Δ)</th>
              <th className="py-1 px-2 text-center">TREND (15s)</th>
              <th className="py-1 px-2 text-center">QUALITY (q_i)</th>
              <th className="py-1 px-2">PLAUSIBLE LIMITS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {ORDERED_CHANNELS.map((ch) => {
              const cfg = CHANNEL_CONFIGS[ch];
              const isMap = ch === 'manifold_pressure';

              // Convert manifold pressure from Pa to kPa for display
              const rawMeas = measurements[ch];
              const rawRef = reference[ch];
              const meas = isMap && rawMeas !== undefined ? rawMeas / 1000.0 : rawMeas;
              const ref = isMap && rawRef !== undefined ? rawRef / 1000.0 : rawRef;
              const diff = meas !== undefined && ref !== undefined ? meas - ref : 0;

              const q = qualities[ch] ?? 1.0;
              const isCompromised = q < 0.8;

              // Compute mini SVG sparkline from telemetry history (last 16 frames)
              const histWindow = telemetryHistory.slice(-16);
              let sparklinePath = '';
              if (histWindow.length > 2) {
                const vals = histWindow.map((f) => {
                  const val = f.raw_measurements[ch];
                  return isMap ? val / 1000.0 : val;
                });
                const minV = Math.min(...vals);
                const maxV = Math.max(...vals);
                const span = maxV - minV || 1.0;
                const w = 56;
                const h = 16;

                const pts = vals.map((v, i) => {
                  const x = (i / (vals.length - 1)) * w;
                  const y = h - ((v - minV) / span) * (h - 4) - 2;
                  return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                });
                sparklinePath = pts.join(' ');
              }

              const sparkColor = q >= 0.85 ? '#10b981' : q >= 0.5 ? '#f59e0b' : '#f43f5e';

              // Plausible range limits string in standardized units
              const rangeStr = isMap
                ? `${(cfg.plausibleRange[0] / 1000).toFixed(0)} - ${(cfg.plausibleRange[1] / 1000).toFixed(0)} kPa`
                : `${cfg.plausibleRange[0]} - ${cfg.plausibleRange[1]} ${cfg.unit}`;

              return (
                <tr key={ch} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-1.5 px-2 font-medium text-slate-300">
                    <span className="text-sky-400 font-semibold">{cfg.name}</span>{' '}
                    <span className="text-[10px] text-slate-500">[{cfg.unit}]</span>
                  </td>
                  <td className={`py-1.5 px-2 font-bold tabular-nums ${isCompromised ? 'text-rose-400' : 'text-slate-100'}`}>
                    {meas !== undefined ? (typeof meas === 'number' ? (ch === 'fuel_flow' ? meas.toFixed(5) : meas.toFixed(1)) : meas) : '---'}
                  </td>
                  <td className="py-1.5 px-2 text-slate-400 tabular-nums">
                    {ref !== undefined ? (ch === 'fuel_flow' ? ref.toFixed(5) : ref.toFixed(1)) : '---'}
                  </td>
                  <td className={`py-1.5 px-2 tabular-nums ${Math.abs(diff) > (isMap ? (cfg.nominalToleranceSigma * cfg.noiseStd) / 1000 : cfg.nominalToleranceSigma * cfg.noiseStd) ? 'text-amber-400 font-semibold' : 'text-slate-400'}`}>
                    {diff > 0 ? `+${ch === 'fuel_flow' ? diff.toFixed(5) : diff.toFixed(1)}` : ch === 'fuel_flow' ? diff.toFixed(5) : diff.toFixed(1)}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    {sparklinePath ? (
                      <svg viewBox="0 0 56 16" className="w-14 h-4 mx-auto overflow-visible">
                        <path d={sparklinePath} fill="none" stroke={sparkColor} strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <span className="text-[9px] text-slate-600">---</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border ${
                          q >= 0.8
                            ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                            : q >= 0.4
                            ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                            : 'bg-red-950/80 border-red-800 text-red-300'
                        }`}
                      >
                        {q.toFixed(3)}
                      </span>
                      <div className="w-10 h-1 bg-slate-800 rounded mt-0.5 overflow-hidden">
                        <div
                          className="h-full rounded"
                          style={{
                            width: `${Math.round(q * 100)}%`,
                            backgroundColor: q >= 0.8 ? '#10b981' : q >= 0.5 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-1.5 px-2 text-[10px] text-slate-500 tabular-nums">
                    {rangeStr}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
