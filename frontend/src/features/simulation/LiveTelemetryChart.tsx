import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Activity, TrendingUp, Thermometer, Gauge, Fuel } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

export const LiveTelemetryChart: React.FC = () => {
  const { currentFrame, telemetryHistory } = useSimulation();
  const [chartMode, setChartMode] = useState<'live' | 'predicted'>('live');

  const raw = currentFrame?.raw_measurements;

  // Real-time formatted values for the right mini-legend
  const tempVal = raw?.oil_temp ? Math.round(raw.oil_temp) : 82;
  const pressVal = raw?.oil_pressure ? (raw.oil_pressure / 56.25).toFixed(1) : '4.8';
  const vibVal = raw?.vibration ? (raw.vibration * 4.12).toFixed(1) : '2.1';
  const rpmVal = raw?.rpm ? Math.round(raw.rpm) : 2400;
  const fuelVal = raw?.fuel_flow ? (raw.fuel_flow * 180).toFixed(2) : '0.62';

  // Prepare normalized telemetry history for smooth multi-line rendering (values 0-120)
  const historySlice = telemetryHistory.slice(-25);
  const chartData = (historySlice.length > 0 ? historySlice : [currentFrame]).map((f, idx) => {
    const r = f.raw_measurements;
    const timeSec = Math.round(f.time_s);
    return {
      time: timeSec,
      // Normalize values to 0-120 range as depicted in the design
      temperature: Math.min(120, Math.max(0, (r?.oil_temp || 82) * 1.05)),
      pressure: Math.min(120, Math.max(0, ((r?.oil_pressure || 270) / 56.25) * 8.5)),
      vibration: Math.min(120, Math.max(0, (r?.vibration || 0.51) * 38)),
      rpm: Math.min(120, Math.max(0, ((r?.rpm || 2400) / 4500) * 80)),
    };
  });

  return (
    <div className="bg-[#0c1626]/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-2">
        <div className="flex items-center space-x-2.5">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            Real-Time Sensor Data
          </h3>
        </div>

        {/* View toggles matching screenshot */}
        <div className="flex items-center space-x-1.5 bg-[#080e1c] p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setChartMode('live')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
              chartMode === 'live'
                ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.5)] font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Live Data</span>
          </button>

          <button
            onClick={() => setChartMode('predicted')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium transition ${
              chartMode === 'predicted'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Predicted Trend</span>
          </button>
        </div>
      </div>

      {/* 2. Chart Grid: Left Recharts Multi-line + Right Mini Legend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
        {/* Left (8 Cols): Line Chart */}
        <div className="lg:col-span-8 h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                unit="s"
              />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                domain={[0, 120]}
                ticks={[0, 20, 40, 60, 80, 100, 120]}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#091322',
                  borderColor: '#0284c7',
                  borderRadius: '0.75rem',
                  fontSize: '11px',
                }}
              />
              {/* Multi-traces matching design screenshot colors */}
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name="Temperature"
              />
              <Line
                type="monotone"
                dataKey="pressure"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name="Pressure"
              />
              <Line
                type="monotone"
                dataKey="vibration"
                stroke="#c084fc"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name="Vibration"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Right (4 Cols): Mini Telemetry Channel Legend Cards */}
        <div className="lg:col-span-4 space-y-2 text-xs font-mono">
          {/* Temperature */}
          <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#080e1c] border border-slate-800/80">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-5 rounded-full bg-orange-500" />
              <Thermometer className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-slate-300 font-sans text-[11px]">Temperature</span>
            </div>
            <span className="text-white font-bold">{tempVal} °C</span>
          </div>

          {/* Pressure */}
          <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#080e1c] border border-slate-800/80">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-5 rounded-full bg-cyan-400" />
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-300 font-sans text-[11px]">Pressure</span>
            </div>
            <span className="text-white font-bold">{pressVal} bar</span>
          </div>

          {/* Vibration */}
          <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#080e1c] border border-slate-800/80">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-5 rounded-full bg-purple-400" />
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-300 font-sans text-[11px]">Vibration</span>
            </div>
            <span className="text-white font-bold">{vibVal} mm/s</span>
          </div>

          {/* RPM */}
          <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#080e1c] border border-slate-800/80">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-5 rounded-full bg-emerald-400" />
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300 font-sans text-[11px]">RPM</span>
            </div>
            <span className="text-white font-bold">{rpmVal.toLocaleString()}</span>
          </div>

          {/* Fuel Flow */}
          <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#080e1c] border border-slate-800/80">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-5 rounded-full bg-blue-400" />
              <Fuel className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-300 font-sans text-[11px]">Fuel Flow</span>
            </div>
            <span className="text-white font-bold">{fuelVal} kg/h</span>
          </div>
        </div>
      </div>
    </div>
  );
};
