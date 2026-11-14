/**
 * Listing 4: DiagnosticPanel.tsx (Excerpts)
 * Live diagnostic telemetry visualization: 8-class probabilities, anomaly timeline,
 * standardized residual feature attributions, and active alert banners.
 */

import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export const DiagnosticPanel: React.FC = () => {
  const { currentFrame, history, isModelConnected } = useSimulation();
  const { diagnostics, alerts } = currentFrame;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
      {/* Alert Status Banner */}
      <div className={`p-3 rounded-lg border flex items-center justify-between ${
        diagnostics.alert_level === 'WARNING'
          ? 'bg-rose-950/60 border-rose-700 text-rose-200'
          : diagnostics.alert_level === 'CAUTION'
          ? 'bg-amber-950/60 border-amber-700 text-amber-200'
          : 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
      }`}>
        <div className="flex items-center space-x-2">
          {diagnostics.alert_level === 'WARNING' ? <ShieldAlert className="w-5 h-5 text-rose-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider">Diagnostic State: {diagnostics.active_prediction.replace('_', ' ')}</span>
            <span className="text-xs ml-3 font-mono opacity-80">P = {(diagnostics.predicted_probability * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* 8-Class Probability Breakdown */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-bold text-slate-300 uppercase">Class Probabilities</h4>
        {Object.entries(diagnostics.class_probabilities).map(([cls, prob]) => (
          <div key={cls} className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 w-44 truncate">{cls.replace('_', ' ')}</span>
            <div className="flex-1 mx-3 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${cls === diagnostics.active_prediction ? 'bg-cyan-500' : 'bg-slate-600'}`}
                style={{ width: `${(prob * 100).toFixed(1)}%` }}
              />
            </div>
            <span className="text-slate-300 w-12 text-right">{(prob * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
