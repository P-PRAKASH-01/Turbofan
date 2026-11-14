import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import { ChannelGrid } from '../components/instruments/ChannelGrid';
import { TelemetryCharts } from '../components/charts/TelemetryCharts';
import { EhiGauge } from '../components/instruments/EhiGauge';
import { Activity, ShieldCheck, AlertTriangle, Radio } from 'lucide-react';

export const MonitoringPage: React.FC = () => {
  const { currentFrame } = useSimulation();
  const { raw_measurements, dynamic_reference, sensor_data_quality, engine_health, alerts } = currentFrame;

  return (
    <div className="space-y-6">
      {/* Top Status Header */}
      <div className="bg-[#0c1626]/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-4 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              UAV In-Flight Telemetry & Sensor Monitoring
            </h2>
            <p className="text-xs text-slate-400">
              Live calibrated sensor channels, real-time SDQI quality verification, and dynamic reference bounds.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-[#080e1c] border border-slate-700 font-mono text-slate-300">
            COMPOSITE SDQI:{' '}
            <span className="text-cyan-400 font-bold">
              {sensor_data_quality.composite_sdqi.toFixed(1)} / 100
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#080e1c] border border-slate-700 font-mono text-slate-300">
            HEALTH STATUS:{' '}
            <span className="text-emerald-400 font-bold">
              {engine_health.ehi !== null ? `${engine_health.ehi.toFixed(1)}%` : 'CALIBRATING'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Channels + EHI Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Channel Matrix */}
        <div className="lg:col-span-8 space-y-4">
          <ChannelGrid
            measurements={raw_measurements}
            reference={dynamic_reference}
            qualities={sensor_data_quality.channel_qualities}
          />
        </div>

        {/* Right 4 Cols: Health Gauge & Alert Queue */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#0d1626]/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Engine Health Index (EHI)
            </h3>
            <div className="flex justify-center py-2">
              <EhiGauge
                ehi={engine_health.ehi}
                status={engine_health.status}
                baselineStatus={engine_health.baseline_status}
                coverageFraction={sensor_data_quality.coverage_fraction}
              />
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex justify-between">
              <span>Baseline State:</span>
              <span className="font-mono text-slate-200 uppercase">{engine_health.baseline_status}</span>
            </div>
          </div>

          {/* Active Alerts */}
          <div className="bg-[#0d1626]/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Active Alerts
              </span>
              <span className="text-xs font-mono text-slate-400">({alerts.length})</span>
            </h3>

            {alerts.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center text-xs text-slate-400">
                All sensor channels within nominal bounds.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/60 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-rose-300 font-semibold">
                      <span>{alert.title}</span>
                      <span className="text-[10px] font-mono">{alert.severity}</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">{alert.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Telemetry Charts Section */}
      <div className="bg-[#0d1626]/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <TelemetryCharts />
      </div>
    </div>
  );
};
