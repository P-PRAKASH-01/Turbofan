import React from 'react';
import { Plane, Cpu, ShieldCheck, Activity, Award, BookOpen, Layers } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Hero Strip */}
      <div className="bg-[#0c1626]/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
            <Plane className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-wide">
                ENGINE-TWIN Digital Twin Platform
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-[10px] font-mono text-cyan-300">
                SIH26054
              </span>
            </div>
            <p className="text-xs text-slate-400">
              MALE UAV Aero-Piston Engine Real-Time Health Monitoring, Fault Prediction, and RUL Estimation
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed pt-2">
          ENGINE-TWIN is a full-stack cyber-physical digital twin platform engineered for Medium-Altitude Long-Endurance (MALE) Unmanned Aerial Vehicle (UAV) aero piston engines. It pairs a rigorous continuous Otto-cycle thermodynamic and kinematic simulator with an 80-tree trained Random Forest multi-class diagnostic classifier to detect and isolate combustion, thermal, and sensor faults before catastrophic inflight failure occurs.
        </p>
      </div>

      {/* 3 Pillars Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#0d1626]/90 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            1. Physics-Based Twin
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Models crank slider kinematics, combustion pressure rise, manifold air dynamics, heat transfer, and dyno absorption load in real-time at 10 Hz with continuous slider stroke animations.
          </p>
        </div>

        <div className="bg-[#0d1626]/90 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-sky-950/80 border border-sky-500/50 flex items-center justify-center text-sky-400">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            2. ML Diagnostic Classifier
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Trained on 1,200 synthetic flight scenarios with held-out validation. Evaluates 39 features (10 physical channels, 10 residuals, missingness masks, and flight phase indicators) to identify 8 fault classes.
          </p>
        </div>

        <div className="bg-[#0d1626]/90 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            3. EHI & SDQI Health Index
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Synthesizes Sensor Data Quality Index (SDQI) with multi-channel z-score thresholds to compute composite Engine Health Index (EHI) and Remaining Useful Life (RUL) projections.
          </p>
        </div>
      </div>

      {/* Technical Specifications Matrix */}
      <div className="bg-[#0d1626]/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          Reference Engine Target Specifications (Rotax 914 Turbocharged Baseline)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-[#080e1c] border border-slate-800">
            <div className="text-slate-400 text-[10px] font-sans">Displacement</div>
            <div className="text-white font-bold text-sm mt-0.5">1.211 Liters</div>
          </div>
          <div className="p-3 rounded-xl bg-[#080e1c] border border-slate-800">
            <div className="text-slate-400 text-[10px] font-sans">Rated Power</div>
            <div className="text-white font-bold text-sm mt-0.5">84.5 kW (115 HP)</div>
          </div>
          <div className="p-3 rounded-xl bg-[#080e1c] border border-slate-800">
            <div className="text-slate-400 text-[10px] font-sans">Max Continuous RPM</div>
            <div className="text-white font-bold text-sm mt-0.5">5,500 RPM</div>
          </div>
          <div className="p-3 rounded-xl bg-[#080e1c] border border-slate-800">
            <div className="text-slate-400 text-[10px] font-sans">Compression Ratio</div>
            <div className="text-white font-bold text-sm mt-0.5">9.0 : 1</div>
          </div>
        </div>
      </div>
    </div>
  );
};
