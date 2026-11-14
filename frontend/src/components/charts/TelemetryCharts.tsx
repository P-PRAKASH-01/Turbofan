import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { useSimulation } from '../../context/SimulationContext';
import { TimeWindowOption } from '../../types/telemetry';
import { LineChart as LineChartIcon, Eye, Trash2, Pause, Play } from 'lucide-react';

export const TelemetryCharts: React.FC = () => {
  const {
    telemetryHistory,
    timeWindow,
    setTimeWindow,
    clearHistory,
    currentFrame,
  } = useSimulation();

  const [isChartPaused, setIsChartPaused] = useState(false);
  const [frozenHistory, setFrozenHistory] = useState(telemetryHistory);

  // Series visibility toggles
  const [visibleSeries, setVisibleSeries] = useState({
    rpm: true,
    throttle: true,
    cht: true,
    egt: true,
    oil_temp: true,
    oil_pressure: true,
    manifold_pressure: true,
    fuel_flow: true,
    vibration: true,
    ehi: true,
    sdqi_comp: true,
    sdqi_worst: true,
  });

  const toggleSeries = (key: keyof typeof visibleSeries) => {
    setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePauseResume = () => {
    if (!isChartPaused) {
      setFrozenHistory(telemetryHistory);
    }
    setIsChartPaused(!isChartPaused);
  };

  const activeHistory = isChartPaused ? frozenHistory : telemetryHistory;

  // Filter history based on timeWindow
  const latestTime = activeHistory.length > 0 ? activeHistory[activeHistory.length - 1].time_s : 0;
  const filteredHistory = activeHistory.filter((frame) => {
    if (timeWindow === 'ALL') return true;
    return frame.time_s >= latestTime - Number(timeWindow);
  });

  // Prepare data points for charts
  const chartData = filteredHistory.map((frame) => ({
    time: frame.time_s,
    rpm: frame.raw_measurements.rpm,
    rpm_ref: frame.dynamic_reference.rpm,
    throttle: frame.operating_inputs.throttle_pct,
    cht: frame.raw_measurements.cht,
    egt: frame.raw_measurements.egt,
    oil_temp: frame.raw_measurements.oil_temp,
    oil_pressure: frame.raw_measurements.oil_pressure,
    manifold_pressure_kpa: frame.raw_measurements.manifold_pressure / 1000.0,
    fuel_flow_gps: frame.raw_measurements.fuel_flow * 1000.0, // convert kg/s to g/s
    vibration: frame.raw_measurements.vibration,
    ehi: frame.engine_health.ehi,
    sdqi_comp: frame.sensor_data_quality.composite_sdqi,
    sdqi_worst: frame.sensor_data_quality.worst_channel_sdqi,
    prediction: frame.diagnostics.active_prediction,
    confidence: frame.diagnostics.predicted_probability * 100,
  }));

  // Diagnostic probabilities for current frame
  const probData = Object.entries(currentFrame.diagnostics.class_probabilities).map(([cls, prob]) => ({
    name: cls.replace('_', ' ').slice(0, 14),
    prob: Math.round(prob * 100),
    isTop: cls === currentFrame.diagnostics.active_prediction,
  }));

  if (activeHistory.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-500 font-mono">
        NO TELEMETRY DATA RECORDED. START SIMULATION TO POPULATE CHARTS.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chart Control Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center space-x-2">
          <LineChartIcon className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-xs tracking-wider text-slate-200 uppercase">
            TELEMETRY TIME-SERIES ANALYTICS ({chartData.length} SAMPLES)
          </span>
          {isChartPaused && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
              CHARTS PAUSED
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Window Selector */}
          <div className="flex items-center space-x-1 bg-slate-950 px-2 py-1 rounded border border-slate-800 text-xs font-mono">
            <span className="text-slate-400 text-[11px]">WINDOW:</span>
            {(['30', '60', '120', 'ALL'] as const).map((w) => (
              <button
                key={w}
                onClick={() => setTimeWindow((w === 'ALL' ? 'ALL' : Number(w)) as TimeWindowOption)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  String(timeWindow) === w
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {w === 'ALL' ? 'ALL' : `${w}s`}
              </button>
            ))}
          </div>

          {/* Pause / Resume Button */}
          <button
            onClick={handlePauseResume}
            className={`px-2 py-1 rounded text-xs font-mono flex items-center space-x-1 border ${
              isChartPaused
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {isChartPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span>{isChartPaused ? 'Resume Charts' : 'Freeze Charts'}</span>
          </button>

          {/* Clear History */}
          <button
            onClick={clearHistory}
            className="px-2 py-1 bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-400 border border-slate-700 rounded text-xs font-mono flex items-center space-x-1 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* 6 Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CHART 1: RPM & Throttle */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-300 uppercase font-mono">
              1. RPM & Throttle Dynamics
            </span>
            <div className="flex space-x-2 text-[10px] font-mono">
              <button
                onClick={() => toggleSeries('rpm')}
                className={`flex items-center space-x-1 ${visibleSeries.rpm ? 'text-cyan-400' : 'text-slate-600'}`}
              >
                <Eye className="w-3 h-3" />
                <span>RPM</span>
              </button>
              <button
                onClick={() => toggleSeries('throttle')}
                className={`flex items-center space-x-1 ${visibleSeries.throttle ? 'text-amber-400' : 'text-slate-600'}`}
              >
                <Eye className="w-3 h-3" />
                <span>Throttle %</span>
              </button>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} unit="s" />
                <YAxis yAxisId="left" stroke="#06b6d4" domain={[600, 5500]} tick={{ fontSize: 10 }} unit="rpm" />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px', fontFamily: 'monospace' }} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                {visibleSeries.rpm && (
                  <Line yAxisId="left" type="monotone" dataKey="rpm" stroke="#06b6d4" strokeWidth={2} dot={false} name="Actual RPM" isAnimationActive={false} />
                )}
                {visibleSeries.throttle && (
                  <Line yAxisId="right" type="monotone" dataKey="throttle" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Throttle (%)" isAnimationActive={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Thermal Profile (CHT, EGT, Oil Temp) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-300 uppercase font-mono">
              2. Thermal Profile (°C) — CHT / EGT / Oil Temp
            </span>
            <div className="flex space-x-2 text-[10px] font-mono">
              <button onClick={() => toggleSeries('cht')} className={visibleSeries.cht ? 'text-red-400' : 'text-slate-600'}>CHT</button>
              <button onClick={() => toggleSeries('egt')} className={visibleSeries.egt ? 'text-orange-400' : 'text-slate-600'}>EGT</button>
              <button onClick={() => toggleSeries('oil_temp')} className={visibleSeries.oil_temp ? 'text-amber-400' : 'text-slate-600'}>Oil</button>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} unit="s" />
                <YAxis stroke="#f97316" domain={[0, 950]} tick={{ fontSize: 10 }} unit="°C" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px', fontFamily: 'monospace' }} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                {visibleSeries.cht && (
                  <Line type="monotone" dataKey="cht" stroke="#ef4444" strokeWidth={1.8} dot={false} name="CHT (°C)" isAnimationActive={false} />
                )}
                {visibleSeries.egt && (
                  <Line type="monotone" dataKey="egt" stroke="#f97316" strokeWidth={1.8} dot={false} name="EGT (°C)" isAnimationActive={false} />
                )}
                {visibleSeries.oil_temp && (
                  <Line type="monotone" dataKey="oil_temp" stroke="#eab308" strokeWidth={1.5} dot={false} name="Oil Temp (°C)" isAnimationActive={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 3: Pressures (Oil Pressure & Manifold Pressure) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-300 uppercase font-mono">
              3. Pressures (kPa) — Oil vs. Manifold Pressure
            </span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} unit="s" />
                <YAxis stroke="#64748b" domain={[0, 600]} tick={{ fontSize: 10 }} unit="kPa" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px', fontFamily: 'monospace' }} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Line type="monotone" dataKey="oil_pressure" stroke="#3b82f6" strokeWidth={2} dot={false} name="Oil Press (kPa)" isAnimationActive={false} />
                <Line type="monotone" dataKey="manifold_pressure_kpa" stroke="#a855f7" strokeWidth={2} dot={false} name="MAP (kPa)" isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 4: Fuel Flow & Vibration */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-300 uppercase font-mono">
              4. Fuel Metering (g/s) & Structural Vibration (g RMS)
            </span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} unit="s" />
                <YAxis yAxisId="left" stroke="#10b981" domain={[0, 20]} tick={{ fontSize: 10 }} unit="g/s" />
                <YAxis yAxisId="right" orientation="right" stroke="#ec4899" domain={[0, 3.5]} tick={{ fontSize: 10 }} unit="g" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px', fontFamily: 'monospace' }} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Line yAxisId="left" type="monotone" dataKey="fuel_flow_gps" stroke="#10b981" strokeWidth={2} dot={false} name="Fuel Flow (g/s)" isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="vibration" stroke="#ec4899" strokeWidth={1.8} dot={false} name="Vibration (g RMS)" isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 5: EHI & SDQI Trends */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-300 uppercase font-mono">
              5. Digital Twin Health Indices (0–100 Scale)
            </span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} unit="s" />
                <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px', fontFamily: 'monospace' }} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Line type="monotone" dataKey="ehi" stroke="#10b981" strokeWidth={2.5} dot={false} name="Engine Health Index (EHI)" connectNulls={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="sdqi_comp" stroke="#06b6d4" strokeWidth={1.8} dot={false} name="SDQI Composite" isAnimationActive={false} />
                <Line type="monotone" dataKey="sdqi_worst" stroke="#f59e0b" strokeWidth={1.8} strokeDasharray="4 4" dot={false} name="SDQI Worst Channel" isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 6: Diagnostic Probabilities Distribution */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-300 uppercase font-mono">
              6. Fault Diagnostic Probability Spectrum
            </span>
            <span className="text-[10px] font-mono text-cyan-400">
              Active: {currentFrame.diagnostics.active_prediction.toUpperCase()} ({(currentFrame.diagnostics.predicted_probability * 100).toFixed(0)}%)
            </span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={probData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} unit="%" />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fontSize: 10 }} width={110} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px', fontFamily: 'monospace' }} />
                <Bar dataKey="prob" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  {probData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.name.includes('normal')
                          ? '#10b981'
                          : entry.isTop
                          ? '#ef4444'
                          : '#334155'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
