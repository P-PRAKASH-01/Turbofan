import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import { FileText, Download, CheckCircle, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { currentFrame, selectedEngine, selectedScenario, events } = useSimulation();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-[#0c1626]/90 border border-slate-800 rounded-2xl p-5 flex flex-wrap justify-between items-center gap-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              UAV Flight Diagnostics & Mission Telemetry Report
            </h2>
            <p className="text-xs text-slate-400">
              Automated airworthiness summary, sensor health verification, and fault log export.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentFrame, null, 2));
            const dlAnchor = document.createElement('a');
            dlAnchor.setAttribute('href', dataStr);
            dlAnchor.setAttribute('download', `engine-report-${Date.now()}.json`);
            dlAnchor.click();
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-bold rounded-xl text-xs hover:from-cyan-300 transition shadow-[0_0_15px_rgba(6,182,212,0.4)]"
        >
          <Download className="w-4 h-4" />
          <span>Export Mission Report (.JSON)</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#0d1626]/90 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Engine Serial ID</span>
          <div className="text-lg font-bold font-mono text-white">{selectedEngine.engine_id}</div>
          <p className="text-[11px] text-slate-400">Rotax 914 Aero-Piston Equivalent</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0d1626]/90 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Mission Health Status</span>
          <div className="text-lg font-bold font-mono text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="w-5 h-5" />
            {currentFrame.engine_health.ehi !== null ? `${currentFrame.engine_health.ehi.toFixed(1)}%` : 'CALIBRATING'}
          </div>
          <p className="text-[11px] text-slate-400">Band 1 Nominal Airworthiness</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0d1626]/90 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Diagnostic Decision</span>
          <div className="text-lg font-bold font-mono text-white uppercase">
            {currentFrame.diagnostics.active_prediction}
          </div>
          <p className="text-[11px] text-slate-400">
            Probability: {(currentFrame.diagnostics.predicted_probability * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Sequential Event Logs Table */}
      <div className="bg-[#0d1626]/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          Flight Mission Event Chronology
        </h3>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {events.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
              No anomaly events recorded during current mission duration.
            </div>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                className="p-3 rounded-xl bg-[#080e1c] border border-slate-800/80 flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-cyan-400">{ev.timestamp_s.toFixed(1)}s</span>
                  <span className="text-slate-200">{ev.message}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    ev.level === 'CRITICAL'
                      ? 'bg-rose-950/80 text-rose-400 border border-rose-700'
                      : ev.level === 'WARNING'
                      ? 'bg-amber-950/80 text-amber-400 border border-amber-700'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {ev.level}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
