import React, { useState } from 'react';
import {
  Settings,
  Zap,
  Play,
  Pause,
  Square,
  RotateCcw,
  Hourglass,
  Cpu,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { EngineProfile, ScenarioSummary, FaultClassName } from '../types/telemetry';
import { EngineCutawayView } from '../features/simulation/EngineCutawayView';
import { LiveTelemetryChart } from '../features/simulation/LiveTelemetryChart';
import { EngineHealthGauge } from '../features/simulation/EngineHealthGauge';
import { FourStrokeCycleBar } from '../features/simulation/FourStrokeCycleBar';
import { PvDiagram } from '../features/simulation/PvDiagram';
import { DynoCurve } from '../features/simulation/DynoCurve';

export const SimulationPage: React.FC = () => {
  const {
    currentFrame,
    isPlaying,
    start,
    pause,
    reset,
    playbackRate,
    setPlaybackRate,
    selectedEngine,
    selectEngine,
    engines,
    selectedScenario,
    selectScenario,
    scenarios,
    faultInjection,
    injectFault,
    clearFault,
  } = useSimulation();

  // Center view mode tabs: 'schematic' | '3d' | 'workflow' | 'system'
  const [viewMode, setViewMode] = useState<'schematic' | '3d' | 'workflow' | 'system'>('schematic');

  // Fault injection selection options
  const faultOptions: Array<{ id: string; label: string; faultType: FaultClassName; target?: any }> = [
    { id: 'thermal', label: 'Overheating (Thermal)', faultType: 'thermal_abnormality', target: 'cht' },
    { id: 'vibration', label: 'High Vibration (Imbalance)', faultType: 'efficiency_degradation', target: 'vibration' },
    { id: 'misfire', label: 'Cylinder Misfire', faultType: 'combustion_irregularity', target: 'rpm' },
    { id: 'lubrication', label: 'Lubrication Degradation', faultType: 'thermal_abnormality', target: 'oil_pressure' },
    { id: 'wear', label: 'Component Wear', faultType: 'sensor_drift', target: 'power' },
  ];

  const [selectedFaultId, setSelectedFaultId] = useState<string>('thermal');
  const [dynoBrakeLoad, setDynoBrakeLoad] = useState<number>(50);

  // Check if fault injection is active
  const isFaultActive = faultInjection.is_active;

  const handleToggleFault = () => {
    if (isFaultActive) {
      clearFault();
    } else {
      const match = faultOptions.find((f) => f.id === selectedFaultId) || faultOptions[0];
      injectFault({
        fault_type: match.faultType,
        target_channel: match.target,
        severity: 2,
        is_active: true,
        onset_s: 0,
      });
    }
  };

  const handleSelectFault = (id: string) => {
    setSelectedFaultId(id);
    if (isFaultActive) {
      const match = faultOptions.find((f) => f.id === id);
      if (match) {
        injectFault({
          fault_type: match.faultType,
          target_channel: match.target,
          severity: 2,
          is_active: true,
          onset_s: 0,
        });
      }
    }
  };

  // AI Diagnostic Prediction & Confidence
  const diag = currentFrame?.diagnostics;
  const isNormal = !diag?.active_prediction || diag.active_prediction === 'normal';
  const confidencePct = diag?.predicted_probability
    ? (diag.predicted_probability * 100).toFixed(1)
    : '98.7';

  // Remaining Useful Life (RUL) estimation
  const rulHours = isNormal ? 840 : Math.max(12, Math.round(840 * (1 - (diag?.anomaly_score || 70) / 100)));

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto text-slate-100">
      {/* ═════════════════════════════════════════════════════════════════
          MAIN THREE-COLUMN LAYOUT EXACTLY MATCHING DESIGN SCREENSHOT
          ═════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ─────────────────────────────────────────────────────────────
            LEFT COLUMN (approx 20%): SIMULATION CONTROL & FAULT SUITE
            ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 xl:col-span-3 space-y-4">
          {/* Card 1: Simulation Control */}
          <div className="bg-[#0c1626]/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3.5">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-800/80">
              <Settings className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                Simulation Control
              </h3>
            </div>

            {/* Engine Select Dropdown */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Engine</label>
              <select
                value={selectedEngine.engine_id}
                onChange={(e) => selectEngine(e.target.value)}
                className="w-full bg-[#080e1c] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {engines.map((eng: EngineProfile) => (
                  <option key={eng.engine_id} value={eng.engine_id}>
                    {eng.engine_id === 'ENG-001' ? 'ENG-001 (Aero Piston)' : `${eng.engine_id} (${eng.rated_power_kw} kW)`}
                  </option>
                ))}
              </select>
            </div>

            {/* Scenario Select Dropdown */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Scenario</label>
              <div className="relative">
                <select
                  value={selectedScenario?.scenario_id || ''}
                  onChange={(e) => selectScenario(e.target.value)}
                  className="w-full bg-[#080e1c] border border-slate-800 rounded-xl pl-6 pr-3 py-2 text-xs text-slate-200 font-medium focus:outline-none focus:border-cyan-500 cursor-pointer truncate"
                >
                  <option value="">Normal Operation</option>
                  {scenarios.slice(0, 30).map((sc: ScenarioSummary) => (
                    <option key={sc.scenario_id} value={sc.scenario_id}>
                      {sc.flight_profile} [{sc.fault_type.toUpperCase()}]
                    </option>
                  ))}
                </select>
                {/* Green/Red dot indicator */}
                <span
                  className={`absolute left-2.5 top-3 w-2 h-2 rounded-full ${
                    isFaultActive ? 'bg-rose-500' : 'bg-emerald-400'
                  }`}
                />
              </div>
            </div>

            {/* Simulation Speed Buttons */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs text-slate-400 font-medium">Simulation Speed</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[0.5, 1, 2, 4].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackRate(speed)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                      playbackRate === speed
                        ? 'bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                        : 'bg-[#080e1c] border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* Playback Controls (Play, Pause, Stop, Reset) */}
            <div className="grid grid-cols-4 gap-2 pt-2">
              {/* Play Button */}
              <button
                onClick={start}
                className={`py-2 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isPlaying
                    ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                    : 'bg-[#080e1c] border border-slate-800 text-slate-300 hover:text-white'
                }`}
                title="Start Simulation"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>

              {/* Pause Button */}
              <button
                onClick={pause}
                className={`py-2 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  !isPlaying
                    ? 'bg-slate-800 text-cyan-300 border border-cyan-500/50'
                    : 'bg-[#080e1c] border border-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Pause Simulation"
              >
                <Pause className="w-4 h-4" />
              </button>

              {/* Stop Button */}
              <button
                onClick={() => {
                  pause();
                  reset();
                }}
                className="py-2 rounded-xl bg-[#080e1c] border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 flex items-center justify-center transition"
                title="Stop Simulation"
              >
                <Square className="w-3.5 h-3.5" />
              </button>

              {/* Reset/Reload Button */}
              <button
                onClick={reset}
                className="py-2 rounded-xl bg-[#080e1c] border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 flex items-center justify-center transition"
                title="Reset Clock to 0s"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 2: Fault Injection (Test) */}
          <div className="bg-[#0c1626]/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Fault Injection (Test)
                </h3>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={handleToggleFault}
                className={`w-10 h-5 rounded-full transition-colors relative focus:outline-none ${
                  isFaultActive ? 'bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.6)]' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-slate-950 transition-transform absolute top-0.5 ${
                    isFaultActive ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* 5 Radio Fault Selection Options */}
            <div className="space-y-2 pt-1 text-xs">
              {faultOptions.map((opt) => {
                const isSelected = selectedFaultId === opt.id;
                return (
                  <label
                    key={opt.id}
                    onClick={() => handleSelectFault(opt.id)}
                    className={`flex items-center space-x-2.5 p-2 rounded-xl border cursor-pointer transition ${
                      isSelected && isFaultActive
                        ? 'bg-rose-950/40 border-rose-600/80 text-rose-300'
                        : isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-300'
                        : 'bg-[#080e1c]/80 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? isFaultActive
                            ? 'border-rose-400'
                            : 'border-cyan-400'
                          : 'border-slate-600'
                      }`}
                    >
                      {isSelected && (
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isFaultActive ? 'bg-rose-400' : 'bg-cyan-400'
                          }`}
                        />
                      )}
                    </div>
                    <span className="font-medium text-[11px]">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            CENTER COLUMN (approx 60%): 3D ENGINE VISUAL & SENSOR CHART
            ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-6 xl:col-span-6 space-y-4">
          {/* Top Engine Card: Mechanical Schematic View or Workflow / System Diagram */}
          {(viewMode === 'schematic' || viewMode === '3d') && (
            <EngineCutawayView
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          )}

          {viewMode === 'workflow' && (
            <div className="bg-[#0c1626]/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white">Digital Twin Workflow Pipeline</h3>
                <button
                  onClick={() => setViewMode('schematic')}
                  className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-semibold"
                >
                  Return to Schematic
                </button>
              </div>
              <div className="p-4 rounded-xl bg-[#080e1c] border border-slate-800 space-y-3 text-xs leading-relaxed">
                <div className="font-bold text-cyan-300">Continuous Signal & Model Inference Architecture:</div>
                <p className="text-slate-300">
                  1. <strong>Kinematic Sensors:</strong> 10 physical transducers capture RPM, manifold pressure, CHT, EGT, oil temp/pressure, fuel rate, power, torque, and vibration at 10 Hz.
                </p>
                <p className="text-slate-300">
                  2. <strong>Physics Baseline Twin:</strong> Continuous Otto thermodynamic simulation outputs nominal dynamic reference curves matching throttle and atmospheric altitude.
                </p>
                <p className="text-slate-300">
                  3. <strong>Feature Pipeline:</strong> Computes 10 normalized residuals, z-score deviations, missingness indicators, and operating phase masks (39 features).
                </p>
                <p className="text-slate-300">
                  4. <strong>Random Forest Classifier:</strong> Evaluates ensemble tree votes to predict nominal vs 7 critical fault classes in real-time.
                </p>
              </div>
            </div>
          )}

          {viewMode === 'system' && (
            <div className="bg-[#0c1626]/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white">Thermodynamics & Dyno Absorption Loops</h3>
                <button
                  onClick={() => setViewMode('schematic')}
                  className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-semibold"
                >
                  Return to Schematic
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PvDiagram />
                <DynoCurve dynoBrakeLoad={dynoBrakeLoad} onBrakeLoadChange={setDynoBrakeLoad} />
              </div>
            </div>
          )}

          {/* Bottom Card: Real-Time Sensor Data */}
          <LiveTelemetryChart />
        </div>

        {/* ─────────────────────────────────────────────────────────────
            RIGHT COLUMN (approx 20%): HEALTH, RUL, AI FAULT DIAGNOSIS
            ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 xl:col-span-3 space-y-4">
          {/* Card 1: Engine Health */}
          <EngineHealthGauge />

          {/* Card 2: RUL Prediction */}
          <div className="bg-[#0c1626]/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-800/80">
              <Hourglass className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                RUL Prediction
              </h3>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="text-3xl font-black font-mono text-white tracking-tight flex items-baseline">
                  <span>{rulHours}</span>
                  <span className="text-sm text-cyan-400 font-sans font-bold ml-1">h</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  Remaining Useful Life
                </div>
              </div>

              {/* Glowing animated green sparkline waveform */}
              <div className="w-24 h-10">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40">
                  <path
                    d="M 0 35 Q 25 15, 50 25 T 100 8"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                  />
                  <path
                    d="M 0 35 Q 25 15, 50 25 T 100 8 L 100 40 L 0 40 Z"
                    fill="url(#sparklineGrad)"
                    opacity="0.3"
                  />
                  <defs>
                    <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>

          {/* Card 3: Fault Diagnosis (AI) */}
          <div className="bg-[#0c1626]/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-800/80">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                Fault Diagnosis (AI)
              </h3>
            </div>

            {/* Status indicator box */}
            <div className="pt-1 space-y-2">
              <div className="flex items-center space-x-2.5">
                {isNormal ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-950 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 fill-rose-950 flex-shrink-0 animate-bounce" />
                )}
                <span className="text-sm font-bold text-white">
                  {isNormal ? 'No Fault Detected' : diag?.active_prediction.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="text-xs text-slate-400 font-mono pl-7">
                Confidence : <span className="text-cyan-300 font-bold">{confidencePct} %</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════
          BOTTOM ROW: ENGINE OPERATION (4-STROKE CYCLE) CARD
          ═════════════════════════════════════════════════════════════════ */}
      <FourStrokeCycleBar />
    </div>
  );
};
