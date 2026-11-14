import React, { useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import {
  FaultClassName,
  PhysicalSensorChannels,
} from '../../types/telemetry';
import { ORDERED_CHANNELS, CHANNEL_CONFIGS } from '../../services/simulationPhysics';
import { AlertOctagon, CheckCircle2, ShieldAlert, Zap, Radio } from 'lucide-react';

export const FaultInjectionPanel: React.FC = () => {
  const {
    faultInjection,
    injectFault,
    clearFault,
    currentTime,
    currentFrame,
    selectedScenario,
  } = useSimulation();

  const [selectedType, setSelectedType] = useState<FaultClassName>('combustion_irregularity');
  const [selectedSeverity, setSelectedSeverity] = useState<1 | 2 | 3>(2);
  const [selectedChannel, setSelectedChannel] = useState<keyof PhysicalSensorChannels>('cht');
  const [onsetTiming, setOnsetTiming] = useState<'immediate' | 'timed'>('immediate');
  const [customOnset, setCustomOnset] = useState<number>(30);

  const isSensorFault = ['sensor_bias', 'sensor_drift', 'sensor_stuck', 'sensor_dropout'].includes(selectedType);

  const handleApplyFault = () => {
    const onset_s = onsetTiming === 'immediate' ? currentTime : customOnset;
    injectFault({
      fault_type: selectedType,
      severity: selectedSeverity,
      target_channel: isSensorFault ? selectedChannel : undefined,
      onset_s,
    });
  };

  // Ground truth source: checks manual user injection first, then active dataset scenario
  const scenarioHasFault = selectedScenario && selectedScenario.fault_type !== 'normal';
  const groundTruthFault = faultInjection.is_active
    ? {
        type: faultInjection.fault_type,
        severity: faultInjection.severity,
        target_channel: faultInjection.target_channel,
        onset_s: faultInjection.onset_s,
        isActive: currentTime >= faultInjection.onset_s,
        source: 'MANUAL INJECTION',
      }
    : scenarioHasFault
    ? {
        type: selectedScenario.fault_type,
        severity: (selectedScenario.severity || 1) as 1 | 2 | 3,
        target_channel: selectedScenario.target_channel,
        onset_s: selectedScenario.fault_onset_s ?? 30,
        isActive: currentTime >= (selectedScenario.fault_onset_s ?? 30),
        source: `DATASET (${selectedScenario.scenario_id.slice(0, 8)})`,
      }
    : {
        type: 'normal' as FaultClassName,
        severity: 1 as 1 | 2 | 3,
        target_channel: undefined,
        onset_s: 0,
        isActive: false,
        source: 'NOMINAL',
      };

  const groundTruthActive = groundTruthFault.isActive && groundTruthFault.type !== 'normal';
  const aiPrediction = currentFrame.diagnostics.active_prediction;
  const isMatch = groundTruthActive && groundTruthFault.type === aiPrediction;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 shadow-xl space-y-4">
      {/* Title */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <AlertOctagon className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-xs tracking-wider text-slate-200 uppercase">
            FAULT INJECTION & BENCHMARK VALIDATION
          </span>
        </div>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
            groundTruthActive
              ? 'bg-amber-950 text-amber-300 border-amber-800'
              : groundTruthFault.type !== 'normal'
              ? 'bg-slate-800 text-slate-300 border-slate-700'
              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
          }`}
        >
          GROUND TRUTH: {groundTruthFault.type.toUpperCase().replace('_', ' ')}
          {groundTruthFault.target_channel ? ` [${groundTruthFault.target_channel.toUpperCase()}]` : ''}
          {groundTruthFault.type !== 'normal' && !groundTruthActive ? ` (ONSET t=${groundTruthFault.onset_s}s)` : ''}
        </span>
      </div>

      {/* Side-by-Side: Ground Truth vs AI Diagnostic Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-950 p-3 rounded border border-slate-800 font-mono">
        {/* Ground Truth State */}
        <div className="border-r border-slate-800/80 pr-2">
          <div className="text-[10px] text-slate-500 uppercase flex items-center space-x-1">
            <Radio className="w-3 h-3 text-amber-400" />
            <span>Simulated Ground Truth ({groundTruthFault.source})</span>
          </div>
          <div className="text-sm font-bold text-slate-200 mt-1">
            {groundTruthFault.type !== 'normal' ? (
              <span className="text-amber-400 uppercase">
                {groundTruthFault.type.replace('_', ' ')} (Sev {groundTruthFault.severity})
              </span>
            ) : (
              <span className="text-emerald-400">NORMAL OPERATION</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Onset: {groundTruthFault.type !== 'normal' ? `t = ${groundTruthFault.onset_s.toFixed(1)}s` : 'N/A'}{' '}
            {groundTruthFault.target_channel && `| Target: ${groundTruthFault.target_channel}`}
          </div>
        </div>

        {/* AI Classifier Output */}
        <div className="pl-2">
          <div className="text-[10px] text-slate-500 uppercase flex items-center space-x-1">
            <ShieldAlert className="w-3 h-3 text-sky-400" />
            <span>AI Diagnostic Prediction</span>
          </div>
          <div className="text-sm font-bold mt-1 flex items-center space-x-2">
            <span className={aiPrediction === 'normal' ? 'text-emerald-400' : 'text-amber-400'}>
              {aiPrediction.toUpperCase().replace('_', ' ')}
            </span>
            {groundTruthActive && (
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                  isMatch
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-red-950 text-red-300 border border-red-800'
                }`}
              >
                {isMatch ? 'MATCH' : 'MISMATCH'}
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Confidence: {(currentFrame.diagnostics.predicted_probability * 100).toFixed(1)}% | Policy: {currentFrame.diagnostics.alert_level}
          </div>
        </div>
      </div>

      {/* Fault Configuration Form */}
      <div className="space-y-3 pt-1">
        {/* 1. Fault Type Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            1. Select Supported Fault Signature:
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 text-xs font-mono">
            {[
              { id: 'normal', name: 'Normal', group: 'healthy' },
              { id: 'combustion_irregularity', name: 'Combustion Fault', group: 'physical' },
              { id: 'thermal_abnormality', name: 'Thermal Rise', group: 'physical' },
              { id: 'efficiency_degradation', name: 'Efficiency Loss', group: 'physical' },
              { id: 'sensor_bias', name: 'Sensor Bias', group: 'sensor' },
              { id: 'sensor_drift', name: 'Sensor Drift', group: 'sensor' },
              { id: 'sensor_stuck', name: 'Sensor Stuck', group: 'sensor' },
              { id: 'sensor_dropout', name: 'Sensor Dropout', group: 'sensor' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedType(f.id as FaultClassName)}
                className={`p-2 rounded text-left border transition-colors ${
                  selectedType === f.id
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-[10px] text-slate-500 uppercase">{f.group}</div>
                <div className="truncate">{f.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Severity & Channel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Severity */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              2. Fault Severity Level:
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              {[
                { lvl: 1, label: 'Level 1: Mild' },
                { lvl: 2, label: 'Level 2: Moderate' },
                { lvl: 3, label: 'Level 3: Severe' },
              ].map((s) => (
                <button
                  key={s.lvl}
                  type="button"
                  onClick={() => setSelectedSeverity(s.lvl as 1 | 2 | 3)}
                  className={`p-2 rounded border text-center font-bold ${
                    selectedSeverity === s.lvl
                      ? 'bg-amber-950 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sensor Target Channel (Only active if sensor fault is selected) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              3. Target Channel {isSensorFault ? '(Active)' : '(Physical state affects all)'}:
            </label>
            <select
              disabled={!isSensorFault}
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value as keyof PhysicalSensorChannels)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-2 rounded text-xs font-mono disabled:opacity-40 disabled:cursor-not-allowed focus:border-cyan-500 focus:outline-none"
            >
              {ORDERED_CHANNELS.map((ch) => (
                <option key={ch} value={ch}>
                  {CHANNEL_CONFIGS[ch].name} ({CHANNEL_CONFIGS[ch].unit})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Onset Timing */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center space-x-3 text-xs font-mono">
            <span className="text-slate-400">Onset Timing:</span>
            <label className="flex items-center space-x-1 cursor-pointer">
              <input
                type="radio"
                name="timing"
                checked={onsetTiming === 'immediate'}
                onChange={() => setOnsetTiming('immediate')}
                className="accent-cyan-500"
              />
              <span className="text-slate-300">Immediate (t = {currentTime.toFixed(0)}s)</span>
            </label>
            <label className="flex items-center space-x-1 cursor-pointer">
              <input
                type="radio"
                name="timing"
                checked={onsetTiming === 'timed'}
                onChange={() => setOnsetTiming('timed')}
                className="accent-cyan-500"
              />
              <span className="text-slate-300">Timed onset:</span>
              <input
                type="number"
                min={0}
                max={120}
                value={customOnset}
                onChange={(e) => setCustomOnset(Number(e.target.value))}
                className="w-14 bg-slate-950 border border-slate-700 px-1 py-0.5 rounded text-center text-xs text-cyan-400"
              />
              <span className="text-slate-400">s</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleApplyFault}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-mono font-bold text-xs flex items-center space-x-1.5 shadow transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>INJECT FAULT</span>
            </button>
            {faultInjection.is_active && (
              <button
                onClick={clearFault}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-xs border border-slate-700 transition-colors"
              >
                CLEAR FAULT
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
