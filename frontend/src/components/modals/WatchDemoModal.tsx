import React from 'react';
import { Play, X, Activity, ShieldAlert, Cpu, CheckCircle2, ArrowRight } from 'lucide-react';

interface WatchDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchSimulation: () => void;
}

export const WatchDemoModal: React.FC<WatchDemoModalProps> = ({
  isOpen,
  onClose,
  onLaunchSimulation,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-[#0b1322] border border-slate-700 rounded-2xl shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0e172a]/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500/60 flex items-center justify-center text-cyan-400">
              <Play className="w-4 h-4 fill-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                ENGINE-TWIN Digital Twin Overview
              </h3>
              <p className="text-xs text-slate-400">
                Physics-Informed Real-Time Simulation & AI Fault Diagnostics Walkthrough
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Interactive Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#080e1c] border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-600 flex items-center justify-center text-sky-400">
                <Activity className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">1. Physical Kinematics</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                4-stroke Otto cycle dynamics, P-V thermodynamics, dyno brake torque absorption, and sensor noise simulation.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#080e1c] border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-rose-950 border border-rose-600 flex items-center justify-center text-rose-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">2. Synthetic Fault Injection</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Test combustion irregularity, thermal runaway, sensor bias, drift, stuck, and dropout at varying severity levels.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#080e1c] border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-600 flex items-center justify-center text-emerald-400">
                <Cpu className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">3. Live AI Classifier</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Trained 80-tree Random Forest delivers real-time fault classification, anomaly confidence, and residual feature attribution.
              </p>
            </div>
          </div>

          {/* Quick Scenario Preview List */}
          <div className="p-4 rounded-xl bg-[#070c18] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="uppercase tracking-wider">Benchmark Evaluation Profiles (SIH26054)</span>
              <span className="text-cyan-400 font-mono">1,200 Precomputed Test Flights</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/80">
                <span className="flex items-center gap-2 text-slate-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Cruise Flight · Nominal Otto Cycle Calibration
                </span>
                <span className="text-emerald-400 font-mono font-semibold">EHI: 96% Nominal</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/80">
                <span className="flex items-center gap-2 text-slate-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                  Climb Phase · Cylinder Head Thermal Abnormality
                </span>
                <span className="text-rose-400 font-mono font-semibold">CHT Exceedance (184°C)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/80">
                <span className="flex items-center gap-2 text-slate-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  High Altitude Patrol · Sensor Drift in Manifold Pressure
                </span>
                <span className="text-amber-400 font-mono font-semibold">MAP Residual &gt; 3.2σ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#0e172a]/70 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Click launch to interact with the live mechanical engine model.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onLaunchSimulation();
              }}
              className="bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition shadow-[0_0_15px_rgba(6,182,212,0.4)]"
            >
              Launch Live Simulation
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
