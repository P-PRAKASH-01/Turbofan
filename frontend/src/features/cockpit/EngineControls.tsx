import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { Play, Pause, RotateCcw, FastForward, Sliders, Zap } from 'lucide-react';

export const EngineControls: React.FC = () => {
  const {
    controls,
    setThrottle,
    setRpmTarget,
    setAltitude,
    setAmbientTemp,
    isPlaying,
    togglePlay,
    reset,
    playbackRate,
    setPlaybackRate,
    currentTime,
    duration,
    seek,
    faultInjection,
    injectFault,
    clearFault,
    scenarios,
    selectedScenario,
    selectScenario,
  } = useSimulation();

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 shadow-xl">
      {/* Title & Playback Bar */}
      <div className="flex flex-wrap justify-between items-center pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          <span className="font-bold text-xs tracking-wider text-slate-200 uppercase">
            FLIGHT SIMULATOR CONTROLS
          </span>
        </div>

        {/* Master Playback Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={togglePlay}
            className={`px-3 py-1.5 rounded flex items-center space-x-1.5 text-xs font-bold transition-all shadow ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'PAUSE' : 'START / RESUME'}</span>
          </button>

          <button
            onClick={reset}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center space-x-1 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>

          {/* Speed Multiplier */}
          <div className="flex items-center space-x-1 bg-slate-950 px-2 py-1 rounded border border-slate-800 text-xs font-mono">
            <FastForward className="w-3 h-3 text-sky-400" />
            <select
              value={playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value={0.5} className="bg-slate-900">0.5×</option>
              <option value={1.0} className="bg-slate-900">1.0× (Real-time)</option>
              <option value={2.0} className="bg-slate-900">2.0×</option>
              <option value={5.0} className="bg-slate-900">5.0×</option>
            </select>
          </div>
        </div>
      </div>

      {/* Flight Timeline Scrubber */}
      <div className="my-3 bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
        <div className="flex justify-between items-center text-xs font-mono mb-1">
          <span className="text-slate-400">FLIGHT TIMELINE:</span>
          <span className="text-sky-400 font-bold tabular-nums">
            t = {currentTime.toFixed(1)}s <span className="text-slate-500 font-normal">/ {duration}s</span>
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.5}
          value={currentTime}
          onChange={(e) => seek(Number(e.target.value))}
          className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />
      </div>

      {/* Primary Simulator Command Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
        {/* 1. Throttle Command */}
        <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300 font-semibold">Throttle Command</span>
            <span className="font-mono font-bold text-amber-400">{controls.throttle_pct.toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min={20}
            max={98}
            step={0.5}
            value={controls.throttle_pct}
            onChange={(e) => setThrottle(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
            <span>20% (Idle gate)</span>
            <span>98% (Max power)</span>
          </div>
        </div>

        {/* 2. Target RPM */}
        <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300 font-semibold">Governor Target RPM</span>
            <span className="font-mono font-bold text-cyan-400">{controls.target_rpm.toFixed(0)} RPM</span>
          </div>
          <input
            type="range"
            min={750}
            max={5200}
            step={50}
            value={controls.target_rpm}
            onChange={(e) => setRpmTarget(Number(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
            <span>750 RPM</span>
            <span>5200 RPM (Redline)</span>
          </div>
        </div>

        {/* 3. Altitude */}
        <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300 font-semibold">Flight Altitude</span>
            <span className="font-mono font-bold text-blue-400">{controls.altitude_m.toFixed(0)} m</span>
          </div>
          <input
            type="range"
            min={0}
            max={5000}
            step={50}
            value={controls.altitude_m}
            onChange={(e) => setAltitude(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
            <span>0 m (Sea level)</span>
            <span>5000 m (Ceiling)</span>
          </div>
        </div>

        {/* 4. Ambient Temperature */}
        <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300 font-semibold">Ambient Temperature</span>
            <span className="font-mono font-bold text-emerald-400">{controls.ambient_temp_c.toFixed(1)} °C</span>
          </div>
          <input
            type="range"
            min={-10}
            max={45}
            step={1}
            value={controls.ambient_temp_c}
            onChange={(e) => setAmbientTemp(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
            <span>-10 °C (Cold OAT)</span>
            <span>+45 °C (ISA+30)</span>
          </div>
        </div>
      </div>

      {/* Scenario Selection & Quick Fault Injection Strip */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap justify-between items-center gap-3">
        {/* Scenario dropdown */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 font-medium">Flight Scenario:</span>
          <select
            value={selectedScenario?.scenario_id || ''}
            onChange={(e) => selectScenario(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs focus:border-cyan-500 focus:outline-none max-w-xs font-mono"
          >
            {scenarios.slice(0, 25).map((s) => (
              <option key={s.scenario_id} value={s.scenario_id}>
                {s.scenario_id.slice(0, 8)}... | {s.flight_profile.toUpperCase()} | {s.fault_type} ({s.split})
              </option>
            ))}
          </select>
        </div>

        {/* Quick Fault Trigger Buttons */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] text-slate-400 flex items-center mr-1">
            <Zap className="w-3 h-3 text-amber-400 mr-1" /> Quick Inject:
          </span>
          <button
            onClick={() => injectFault({ fault_type: 'combustion_irregularity', severity: 2 })}
            className={`text-[10px] px-2 py-1 rounded font-mono font-semibold transition-colors border ${
              faultInjection.is_active && faultInjection.fault_type === 'combustion_irregularity'
                ? 'bg-amber-600 text-white border-amber-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            Combustion
          </button>
          <button
            onClick={() => injectFault({ fault_type: 'thermal_abnormality', severity: 2 })}
            className={`text-[10px] px-2 py-1 rounded font-mono font-semibold transition-colors border ${
              faultInjection.is_active && faultInjection.fault_type === 'thermal_abnormality'
                ? 'bg-amber-600 text-white border-amber-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            Thermal
          </button>
          <button
            onClick={() => injectFault({ fault_type: 'sensor_bias', target_channel: 'cht', severity: 2 })}
            className={`text-[10px] px-2 py-1 rounded font-mono font-semibold transition-colors border ${
              faultInjection.is_active && faultInjection.fault_type === 'sensor_bias'
                ? 'bg-amber-600 text-white border-amber-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            Sensor Bias (CHT)
          </button>
          {faultInjection.is_active && (
            <button
              onClick={clearFault}
              className="text-[10px] px-2 py-1 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 rounded font-mono font-bold"
            >
              CLEAR FAULT
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
