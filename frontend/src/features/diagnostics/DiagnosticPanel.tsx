import React, { useMemo } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { CHANNEL_CONFIGS, ORDERED_CHANNELS } from '../../services/simulationPhysics';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Bell,
  Clock,
  Layers,
  TrendingUp,
  BarChart2,
} from 'lucide-react';

export const DiagnosticPanel: React.FC = () => {
  const { currentFrame, telemetryHistory, acknowledgeAlert } = useSimulation();
  const { diagnostics, engine_health, sensor_data_quality, alerts, raw_measurements, dynamic_reference } = currentFrame;

  const isNormal = diagnostics.active_prediction === 'normal';
  const alertColor = {
    NOMINAL: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/80',
    ADVISORY: 'text-sky-400 bg-sky-950/40 border-sky-800/80',
    CAUTION: 'text-amber-400 bg-amber-950/40 border-amber-800/80',
    WARNING: 'text-rose-400 bg-rose-950/40 border-rose-800/80',
  }[diagnostics.alert_level];

  // Anomaly Score from live model or derived from P(normal)
  const currentAnomalyScore = diagnostics.anomaly_score !== undefined
    ? Math.round(diagnostics.anomaly_score)
    : Math.round((1.0 - (diagnostics.class_probabilities.normal ?? 0.95)) * 100);
  const anomalyThreshold = 50.0; // 50% detection threshold

  // Feature Attribution: from live model inference or standardized residuals
  const featureAttributions = useMemo(() => {
    if (diagnostics.feature_attributions && diagnostics.feature_attributions.length > 0) {
      return diagnostics.feature_attributions.map((fa) => ({
        channel: fa.channel,
        name: fa.name,
        attributionPct: fa.attribution_pct,
      }));
    }
    const rawScores = ORDERED_CHANNELS.map((ch) => {
      const cfg = CHANNEL_CONFIGS[ch];
      const meas = raw_measurements[ch];
      const ref = dynamic_reference[ch];
      const z = Math.abs(meas - ref) / cfg.noiseStd;
      return { channel: ch, name: cfg.name, zScore: z };
    });

    const totalZ = rawScores.reduce((sum, item) => sum + item.zScore, 0) || 1.0;
    return rawScores
      .map((item) => ({
        channel: item.channel,
        name: item.name,
        attributionPct: Math.round((item.zScore / totalZ) * 100),
      }))
      .sort((a, b) => b.attributionPct - a.attributionPct);
  }, [diagnostics.feature_attributions, raw_measurements, dynamic_reference]);

  // Compute Anomaly Score Timeline Path from Telemetry History (up to last 30 frames)
  const anomalyTimeline = useMemo(() => {
    const svgW = 320;
    const svgH = 80;
    const padL = 28;
    const padR = 12;
    const padT = 10;
    const padB = 20;
    const plotW = svgW - padL - padR;
    const plotH = svgH - padT - padB;
    const thresholdY = padT + plotH - (anomalyThreshold / 100.0) * plotH;

    const hist = telemetryHistory.slice(-30);
    if (hist.length < 2) {
      return { path: '', points: [], currentPoint: null, thresholdY, svgW, svgH, padL, padR, padT, padB, plotW, plotH };
    }

    const dataPoints = hist.map((frame, i) => {
      const pNorm = frame.diagnostics?.class_probabilities?.normal ?? 0.95;
      const score = Math.max(0, Math.min(100, (1.0 - pNorm) * 100));
      const x = padL + (i / (hist.length - 1)) * plotW;
      const y = padT + plotH - (score / 100.0) * plotH;
      return { x, y, score, time: frame.time_s };
    });

    const pathD = dataPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');
    const currentPoint = dataPoints[dataPoints.length - 1];

    return {
      path: pathD,
      points: dataPoints,
      currentPoint,
      thresholdY,
      svgW,
      svgH,
      padL,
      padR,
      padT,
      padB,
      plotW,
      plotH,
    };
  }, [telemetryHistory, anomalyThreshold]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 shadow-xl space-y-4">
      {/* Title */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2 flex-wrap gap-1">
          <ShieldAlert className="w-4 h-4 text-sky-400" />
          <span className="font-bold text-xs tracking-wider text-slate-200 uppercase">
            AI FAULT DIAGNOSTICS & ATTRIBUTION MATRIX
          </span>
          <span className="flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700 text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>MODEL PREDICTION ACTIVE</span>
          </span>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${alertColor}`}>
          SYSTEM STATE: {diagnostics.alert_level}
        </span>
      </div>

      {/* Main Diagnostic Prediction Banner */}
      <div className="bg-slate-950 p-3.5 rounded border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="space-y-1">
          <div className="text-[10px] font-mono text-slate-400 flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>MODEL: {diagnostics.model_name}</span>
            <span className="text-slate-600">|</span>
            <span>PROTOCOL: {diagnostics.split_protocol.toUpperCase()}</span>
          </div>
          <div className="flex items-center space-x-2">
            {isNormal ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            )}
            <span className="text-lg font-black font-mono text-slate-100 tracking-wide uppercase">
              {diagnostics.active_prediction.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400 block">CONFIDENCE</span>
            <span className="text-xl font-mono font-bold text-cyan-400">
              {(diagnostics.predicted_probability * 100).toFixed(1)}%
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400 block">SEVERITY POLICY</span>
            <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded border ${alertColor}`}>
              {diagnostics.alert_level}
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Section: 8-Class Probability Spectrum & Anomaly Score Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. 8-Class Probability Spectrum Bars */}
        <div className="bg-slate-950/70 p-3 rounded border border-slate-800 space-y-2">
          <div className="flex justify-between text-[11px] font-mono text-slate-400 pb-1 border-b border-slate-800/80">
            <span className="font-semibold text-slate-200">8-Class Probability Spectrum</span>
            <span className="text-sky-400">Argmax: {diagnostics.active_prediction.replace('_', ' ')}</span>
          </div>
          <div className="space-y-1.5 font-mono text-[10px]">
            {Object.entries(diagnostics.class_probabilities).map(([cls, prob]) => {
              const pct = Math.round(prob * 100);
              const isTop = cls === diagnostics.active_prediction;
              const isSensor = cls.startsWith('sensor_');
              const barColor = cls === 'normal'
                ? '#10b981'
                : isSensor
                ? '#38bdf8'
                : '#f59e0b';

              return (
                <div key={cls} className="flex items-center space-x-2">
                  <span className={`w-36 truncate ${isTop ? 'text-slate-100 font-bold' : 'text-slate-400'}`}>
                    {cls.replace('_', ' ')}
                  </span>
                  <div className="flex-1 h-2 bg-slate-900 rounded overflow-hidden border border-slate-800">
                    <div
                      className="h-full rounded transition-all duration-300"
                      style={{
                        width: `${Math.max(2, pct)}%`,
                        backgroundColor: isTop ? barColor : '#334155',
                      }}
                    />
                  </div>
                  <span className={`w-10 text-right ${isTop ? 'text-cyan-300 font-bold' : 'text-slate-500'}`}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Anomaly Score Timeline with Fixed Threshold */}
        <div className="bg-slate-950/70 p-3 rounded border border-slate-800 space-y-2 flex flex-col justify-between">
          <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 pb-1 border-b border-slate-800/80">
            <div className="flex items-center space-x-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-semibold text-slate-200">Anomaly Score Timeline</span>
            </div>
            <div className="flex items-center space-x-2 text-[10px]">
              <span className="text-slate-400">Score:</span>
              <span className={`font-bold tabular-nums ${currentAnomalyScore >= anomalyThreshold ? 'text-rose-400' : 'text-emerald-400'}`}>
                {currentAnomalyScore}%
              </span>
              <span className="text-rose-400 border border-rose-800/60 bg-rose-950/40 px-1 rounded text-[9px]">
                Threshold: 50%
              </span>
            </div>
          </div>

          {/* SVG Timeline Chart */}
          <div className="w-full flex items-center justify-center bg-slate-900/60 rounded p-1 border border-slate-800/60">
            <svg viewBox={`0 0 ${anomalyTimeline.svgW || 320} ${anomalyTimeline.svgH || 80}`} className="w-full h-20 select-none">
              {/* Threshold zone background (> 50%) */}
              {anomalyTimeline.thresholdY !== undefined && (
                <rect
                  x={anomalyTimeline.padL}
                  y={anomalyTimeline.padT}
                  width={anomalyTimeline.plotW}
                  height={anomalyTimeline.thresholdY - anomalyTimeline.padT}
                  fill="#f43f5e"
                  fillOpacity="0.08"
                />
              )}

              {/* Threshold horizontal line at 50% */}
              {anomalyTimeline.thresholdY !== undefined && (
                <line
                  x1={anomalyTimeline.padL}
                  y1={anomalyTimeline.thresholdY}
                  x2={anomalyTimeline.padL + anomalyTimeline.plotW}
                  y2={anomalyTimeline.thresholdY}
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
              )}

              {/* Y Axis Labels */}
              <text x={anomalyTimeline.padL - 4} y={anomalyTimeline.padT + 8} fill="#f43f5e" fontSize="7" textAnchor="end">
                100%
              </text>
              <text x={anomalyTimeline.padL - 4} y={(anomalyTimeline.thresholdY || 40) + 3} fill="#f87171" fontSize="6.5" textAnchor="end">
                50%
              </text>
              <text x={anomalyTimeline.padL - 4} y={(anomalyTimeline.padT || 10) + (anomalyTimeline.plotH || 50)} fill="#64748b" fontSize="7" textAnchor="end">
                0%
              </text>

              {/* Anomaly Line */}
              {anomalyTimeline.path && (
                <path
                  d={anomalyTimeline.path}
                  fill="none"
                  stroke={currentAnomalyScore >= anomalyThreshold ? '#f43f5e' : '#38bdf8'}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}

              {/* Current Point Dot */}
              {anomalyTimeline.currentPoint && (
                <circle
                  cx={anomalyTimeline.currentPoint.x}
                  cy={anomalyTimeline.currentPoint.y}
                  r="3.5"
                  fill={currentAnomalyScore >= anomalyThreshold ? '#f43f5e' : '#38bdf8'}
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              )}
            </svg>
          </div>

          <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
            <span>Window: Rolling 30s</span>
            <span className={currentAnomalyScore >= anomalyThreshold ? 'text-rose-400 font-semibold' : 'text-emerald-400'}>
              {currentAnomalyScore >= anomalyThreshold ? 'ALERT: Anomalous Deviation Detected' : 'NORMAL: Below Action Threshold'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Feature-Attribution Chart (Top Channel Residual Contributions) */}
      <div className="bg-slate-950/70 p-3 rounded border border-slate-800 space-y-2">
        <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 pb-1 border-b border-slate-800/80">
          <div className="flex items-center space-x-1.5">
            <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-slate-200">Diagnostic Feature Attribution (% Contribution to Deviation)</span>
          </div>
          <span className="text-[10px] text-slate-400">Standardized Residual Weights</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 font-mono text-[10px]">
          {featureAttributions.map((fa) => {
            const isHigh = fa.attributionPct >= 20;
            return (
              <div key={fa.channel} className="flex items-center space-x-2">
                <span className={`w-32 truncate ${isHigh ? 'text-amber-300 font-bold' : 'text-slate-400'}`}>
                  {fa.name}
                </span>
                <div className="flex-1 h-2 bg-slate-900 rounded overflow-hidden border border-slate-800">
                  <div
                    className="h-full rounded transition-all duration-300"
                    style={{
                      width: `${Math.max(2, fa.attributionPct)}%`,
                      backgroundColor: isHigh ? '#f59e0b' : '#3b82f6',
                    }}
                  />
                </div>
                <span className={`w-9 text-right ${isHigh ? 'text-amber-300 font-bold' : 'text-slate-500'}`}>
                  {fa.attributionPct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Digital Twin Dual-Scale Indices Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Engine Health Index (EHI)</span>
          <div className="flex items-baseline space-x-1 my-1">
            <span className="text-xl font-bold font-mono text-emerald-400">
              {engine_health.ehi !== null ? engine_health.ehi.toFixed(1) : 'NULL'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">/ 100</span>
          </div>
          <span className="text-[9px] font-mono text-slate-500">Status: {engine_health.status}</span>
        </div>

        <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Sensor Data Quality (SDQI)</span>
          <div className="flex items-baseline space-x-1 my-1">
            <span className="text-xl font-bold font-mono text-cyan-400">
              {sensor_data_quality.composite_sdqi.toFixed(1)}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">/ 100</span>
          </div>
          <span className="text-[9px] font-mono text-slate-500">Min Channel: {sensor_data_quality.worst_channel_sdqi.toFixed(1)}</span>
        </div>

        <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Baseline Adaptation</span>
          <div className="my-1">
            <span className="text-sm font-bold font-mono text-amber-300">
              {engine_health.baseline_status}
            </span>
          </div>
          <span className="text-[9px] font-mono text-slate-500">Mode: {engine_health.operating_mode}</span>
        </div>
      </div>

      {/* Active Alerts Banner */}
      {alerts && alerts.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-800/80 rounded p-3 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 font-mono">
            <Bell className="w-4 h-4" />
            <span>ACTIVE OPERATIONAL ALERTS ({alerts.length})</span>
          </div>
          <div className="space-y-1.5">
            {alerts.map((alt) => (
              <div
                key={alt.id}
                className="flex justify-between items-center bg-slate-950/80 p-2 rounded border border-slate-800 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] text-cyan-400 flex items-center">
                      <Clock className="w-3 h-3 mr-1 inline" /> {alt.timestamp_s.toFixed(1)}s
                    </span>
                    <span className="font-bold text-amber-300">{alt.title}</span>
                    <span className="text-[9px] font-mono px-1 bg-amber-900/60 text-amber-200 rounded">
                      {alt.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{alt.description}</p>
                </div>
                {!alt.acknowledged && (
                  <button
                    onClick={() => acknowledgeAlert(alt.id)}
                    className="text-[10px] font-mono px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-600 transition-colors"
                  >
                    ACKNOWLEDGE
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prognostics Roadmap Notice */}
      <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 flex items-center space-x-2.5 text-xs text-slate-500">
        <HelpCircle className="w-4 h-4 text-slate-600 flex-shrink-0" />
        <div className="leading-snug">
          <span className="text-slate-400 font-semibold font-mono">Prognostic Trend Line: </span>
          <span>Online residuals evaluated against dynamic physical baseline. Statistical degradation trajectory tracking active.</span>
        </div>
      </div>
    </div>
  );
};
