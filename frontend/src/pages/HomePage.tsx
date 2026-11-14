import React, { useState } from 'react';
import {
  Activity,
  Settings,
  BarChart2,
  Box,
  Thermometer,
  Gauge,
  HeartPulse,
  ArrowRight,
  PlaySquare,
  Layers,
  Cpu,
  Plane,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';

interface HomePageProps {
  onLaunchSimulation: () => void;
  onOpenDemo: () => void;
  onNavigateToTab?: (tab: 'home' | 'simulation' | 'monitoring' | 'analytics' | 'about') => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onLaunchSimulation,
  onOpenDemo,
  onNavigateToTab,
}) => {
  const { currentFrame, isPlaying } = useSimulation();

  // Selected telemetry badge for detailed inspection modal/tooltip
  const [activeBadge, setActiveBadge] = useState<string | null>(null);

  // Real-time telemetry values extracted from physical models
  const raw = currentFrame?.raw_measurements;
  const health = currentFrame?.engine_health;

  // Temperature: CHT or Oil Temp from model, nominal ~82°C
  const temperatureVal = raw?.oil_temp ? Math.round(raw.oil_temp) : 82;

  // Vibration: scaled to mm/s (model raw is vibration_rms_g ~0.51g -> ~2.1 mm/s at 4200 RPM)
  const vibrationVal = raw?.vibration ? (raw.vibration * 4.12).toFixed(1) : '2.1';

  // Pressure: scaled to bar (oil pressure ~270 kPa -> 4.8 bar, or MAP ~76.8 kPa -> 4.8 bar boost)
  const pressureVal = raw?.oil_pressure ? (raw.oil_pressure / 56.25).toFixed(1) : '4.8';

  // Engine Health Index (EHI): percentage 0-100%, nominal 96%
  const healthIndexVal = health?.ehi !== null && health?.ehi !== undefined ? Math.round(health.ehi) : 96;

  // Determine health color styling dynamically based on model health
  const isHealthNominal = healthIndexVal >= 90;
  const isHealthCaution = healthIndexVal >= 75 && healthIndexVal < 90;

  return (
    <div className="relative min-h-[calc(100vh-60px)] flex flex-col justify-between overflow-x-hidden bg-[#070c16] text-slate-100">
      {/* Background ambient lighting effects */}
      <div className="pointer-events-none absolute -top-40 left-1/4 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[140px]" />
      <div className="pointer-events-none absolute top-1/3 -right-20 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[150px]" />

      {/* MAIN HERO CONTENT CONTAINER */}
      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-6 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-4 items-center">
          {/* ══════════════════════════════════════════════════════════
              LEFT COLUMN: HERO HEADLINE, SUMMARY, 4 CARDS, CTAs
              ══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-6 z-20">
            {/* Top SIH Badge / Pill Tag */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full border border-cyan-500/40 bg-[#0c1f33]/70 backdrop-blur-md text-cyan-300 text-xs font-semibold tracking-wider shadow-[0_0_12px_rgba(6,182,212,0.2)]">
              <span className="font-mono text-cyan-400">SIH26054</span>
              <span className="text-cyan-500">•</span>
              <span className="text-slate-200">MALE UAV Engine</span>
            </div>

            {/* Main Headline Exactly Matching Design Image */}
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-5xl xl:text-[3.4rem] font-black tracking-tight text-white leading-[1.08]">
                Digital Twin for
              </h1>
              <h1 className="text-4xl sm:text-5xl xl:text-[3.4rem] font-black tracking-tight leading-[1.08]">
                <span className="text-white">UAV </span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-300 drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                  Engine
                </span>
              </h1>
            </div>

            {/* Subtitle Description */}
            <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed font-normal max-w-lg">
              AI-Enabled Real-Time Health Monitoring, Fault Prediction and Remaining Useful Life (RUL) Estimation for Aero Piston Engines.
            </p>

            {/* 4 Feature Glass Cards in a 4-Column Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {/* Card 1: Real-Time Health Monitoring */}
              <div
                onClick={() => onNavigateToTab?.('monitoring')}
                className="group p-3 rounded-2xl bg-[#0d1626]/80 hover:bg-[#122038] border border-slate-800/90 hover:border-cyan-500/50 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer shadow-md min-h-[92px]"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-200 leading-tight mt-1">
                  Real-Time<br />Health Monitoring
                </span>
              </div>

              {/* Card 2: Fault Detection */}
              <div
                onClick={() => onNavigateToTab?.('simulation')}
                className="group p-3 rounded-2xl bg-[#0d1626]/80 hover:bg-[#122038] border border-slate-800/90 hover:border-cyan-500/50 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer shadow-md min-h-[92px]"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                  <Settings className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-200 leading-tight mt-1">
                  Fault<br />Detection
                </span>
              </div>

              {/* Card 3: RUL Prediction */}
              <div
                onClick={() => onNavigateToTab?.('analytics')}
                className="group p-3 rounded-2xl bg-[#0d1626]/80 hover:bg-[#122038] border border-slate-800/90 hover:border-cyan-500/50 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer shadow-md min-h-[92px]"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-200 leading-tight mt-1">
                  RUL<br />Prediction
                </span>
              </div>

              {/* Card 4: Interactive Engine Simulation */}
              <div
                onClick={() => onNavigateToTab?.('simulation')}
                className="group p-3 rounded-2xl bg-[#0d1626]/80 hover:bg-[#122038] border border-slate-800/90 hover:border-cyan-500/50 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer shadow-md min-h-[92px]"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                  <Box className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-200 leading-tight mt-1">
                  Interactive<br />Engine Simulation
                </span>
              </div>
            </div>

            {/* Action Buttons Exactly Matching Design */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              {/* Primary Glowing Cyan CTA Button */}
              <button
                onClick={onLaunchSimulation}
                className="relative group bg-gradient-to-r from-[#00d2ff] via-[#00b4d8] to-[#0284c7] hover:from-[#38bdf8] hover:to-[#0369a1] text-slate-950 font-bold px-6 sm:px-7 py-3 rounded-xl flex items-center space-x-2.5 text-sm shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="w-2 h-2 rounded-full bg-slate-950/40 animate-ping absolute left-3 hidden" />
                <svg
                  className="w-4 h-4 fill-slate-950"
                  viewBox="0 0 24 24"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span className="font-extrabold tracking-wide">Launch Simulation</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Secondary Dark Glass Pill Button */}
              <button
                onClick={onOpenDemo}
                className="border border-slate-700/90 hover:border-slate-500 bg-[#0d1626]/70 hover:bg-[#132238] backdrop-blur-md text-slate-200 hover:text-white font-semibold px-5 sm:px-6 py-3 rounded-xl flex items-center space-x-2.5 text-sm transition-all duration-200"
              >
                <PlaySquare className="w-4 h-4 text-slate-300" />
                <span>Watch Demo</span>
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              RIGHT COLUMN: 3D ENGINE VISUAL & FLOATING LIVE BADGES
              ══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 xl:col-span-7 relative w-full flex items-center justify-center">
            {/* Image Canvas Container */}
            <div className="relative w-full aspect-[2/1] sm:aspect-[2/1] max-w-3xl mx-auto rounded-2xl overflow-hidden border border-slate-800/80 shadow-[0_0_50px_rgba(6,182,212,0.2)] bg-[#070c17]">
              {/* Clean 3D Aero-Piston Engine with Holographic Twin & Pedestal */}
              <img
                src="/home-engine-twin.jpg"
                alt="Digital Twin Aero-Piston Engine with Holographic HUD"
                className="w-full h-full object-contain object-center filter saturate-[1.1] contrast-[1.04]"
              />

              {/* Subtle ambient edge vignettes */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#070c16]/70 via-transparent to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#070c16]/50 via-transparent to-[#070c16]/30 pointer-events-none" />

              {/* ────────────────────────────────────────────────────────
                  LIVE FLOATING HUD BADGE 1: TEMPERATURE (Cylinder Head)
                  ──────────────────────────────────────────────────────── */}
              <div
                onClick={() => setActiveBadge(activeBadge === 'temp' ? null : 'temp')}
                style={{ top: '15%', left: '36%' }}
                className="absolute z-20 group cursor-pointer"
              >
                {/* Pointer Line */}
                <svg className="absolute -bottom-6 left-10 w-8 h-7 pointer-events-none stroke-cyan-400/80 fill-none">
                  <path d="M 0 0 L 12 14 L 20 14" strokeWidth="1.5" />
                  <circle cx="20" cy="14" r="2.5" className="fill-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,1)]" />
                </svg>

                {/* Badge Card */}
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#091322]/90 backdrop-blur-md border border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:border-cyan-400 transition-all duration-200">
                  <div className="w-5 h-5 rounded-lg bg-cyan-950/80 flex items-center justify-center text-cyan-400">
                    <Thermometer className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">
                      Temperature
                    </div>
                    <div className="text-xs font-bold text-white tracking-wide font-mono flex items-center gap-1">
                      <span>{temperatureVal}</span>
                      <span className="text-cyan-300 text-[10px] font-sans">°C</span>
                    </div>
                  </div>
                </div>

                {/* Expanded Telemetry Popover */}
                {activeBadge === 'temp' && (
                  <div className="absolute top-11 left-0 w-44 p-2.5 rounded-xl bg-[#0c182c] border border-cyan-500/80 text-[11px] shadow-2xl space-y-1 animate-fade-in z-30">
                    <div className="font-bold text-cyan-300 flex items-center justify-between">
                      <span>Oil & CHT Temp</span>
                      <span className="text-[9px] text-emerald-400">NOMINAL</span>
                    </div>
                    <div className="text-slate-300 flex justify-between">
                      <span>CHT:</span>
                      <span className="font-mono text-white">{Math.round(raw?.cht || 138)} °C</span>
                    </div>
                    <div className="text-slate-300 flex justify-between">
                      <span>Threshold:</span>
                      <span className="font-mono text-slate-400">&lt; 165 °C</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ────────────────────────────────────────────────────────
                  LIVE FLOATING HUD BADGE 2: VIBRATION (Upper Right)
                  ──────────────────────────────────────────────────────── */}
              <div
                onClick={() => setActiveBadge(activeBadge === 'vib' ? null : 'vib')}
                style={{ top: '18%', right: '4%' }}
                className="absolute z-20 group cursor-pointer"
              >
                {/* Pointer Line */}
                <svg className="absolute top-3.5 -left-6 w-7 h-6 pointer-events-none stroke-cyan-400/80 fill-none">
                  <path d="M 24 8 L 8 8 L 0 16" strokeWidth="1.5" />
                  <circle cx="0" cy="16" r="2.5" className="fill-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,1)]" />
                </svg>

                {/* Badge Card */}
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#091322]/90 backdrop-blur-md border border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:border-cyan-400 transition-all duration-200">
                  <div className="w-5 h-5 rounded-lg bg-cyan-950/80 flex items-center justify-center text-cyan-400">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">
                      Vibration
                    </div>
                    <div className="text-xs font-bold text-white tracking-wide font-mono flex items-center gap-1">
                      <span>{vibrationVal}</span>
                      <span className="text-cyan-300 text-[10px] font-sans">mm/s</span>
                    </div>
                  </div>
                </div>

                {activeBadge === 'vib' && (
                  <div className="absolute top-11 right-0 w-44 p-2.5 rounded-xl bg-[#0c182c] border border-cyan-500/80 text-[11px] shadow-2xl space-y-1 animate-fade-in z-30">
                    <div className="font-bold text-cyan-300 flex items-center justify-between">
                      <span>Harmonic RMS</span>
                      <span className="text-[9px] text-emerald-400">NORMAL</span>
                    </div>
                    <div className="text-slate-300 flex justify-between">
                      <span>Raw Accel:</span>
                      <span className="font-mono text-white">{(raw?.vibration || 0.51).toFixed(2)} g</span>
                    </div>
                    <div className="text-slate-300 flex justify-between">
                      <span>Band Limit:</span>
                      <span className="font-mono text-slate-400">&lt; 4.5 mm/s</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ────────────────────────────────────────────────────────
                  LIVE FLOATING HUD BADGE 3: PRESSURE (Middle Right)
                  ──────────────────────────────────────────────────────── */}
              <div
                onClick={() => setActiveBadge(activeBadge === 'press' ? null : 'press')}
                style={{ top: '42%', right: '3%' }}
                className="absolute z-20 group cursor-pointer"
              >
                {/* Pointer Line */}
                <svg className="absolute top-3.5 -left-6 w-7 h-6 pointer-events-none stroke-cyan-400/80 fill-none">
                  <path d="M 24 8 L 8 8 L 0 14" strokeWidth="1.5" />
                  <circle cx="0" cy="14" r="2.5" className="fill-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,1)]" />
                </svg>

                {/* Badge Card */}
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#091322]/90 backdrop-blur-md border border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:border-cyan-400 transition-all duration-200">
                  <div className="w-5 h-5 rounded-lg bg-cyan-950/80 flex items-center justify-center text-cyan-400">
                    <Gauge className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">
                      Pressure
                    </div>
                    <div className="text-xs font-bold text-white tracking-wide font-mono flex items-center gap-1">
                      <span>{pressureVal}</span>
                      <span className="text-cyan-300 text-[10px] font-sans">bar</span>
                    </div>
                  </div>
                </div>

                {activeBadge === 'press' && (
                  <div className="absolute top-11 right-0 w-44 p-2.5 rounded-xl bg-[#0c182c] border border-cyan-500/80 text-[11px] shadow-2xl space-y-1 animate-fade-in z-30">
                    <div className="font-bold text-cyan-300 flex items-center justify-between">
                      <span>Oil & Manifold</span>
                      <span className="text-[9px] text-emerald-400">STABLE</span>
                    </div>
                    <div className="text-slate-300 flex justify-between">
                      <span>Oil Press:</span>
                      <span className="font-mono text-white">{Math.round(raw?.oil_pressure || 270)} kPa</span>
                    </div>
                    <div className="text-slate-300 flex justify-between">
                      <span>MAP:</span>
                      <span className="font-mono text-slate-400">{Math.round((raw?.manifold_pressure || 76863) / 1000)} kPa</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ────────────────────────────────────────────────────────
                  LIVE FLOATING HUD BADGE 4: HEALTH INDEX (Bottom Right)
                  ──────────────────────────────────────────────────────── */}
              <div
                onClick={() => setActiveBadge(activeBadge === 'health' ? null : 'health')}
                style={{ top: '65%', right: '3%' }}
                className="absolute z-20 group cursor-pointer"
              >
                <div
                  className={`flex items-center space-x-2.5 px-3.5 py-2 rounded-2xl backdrop-blur-md transition-all duration-300 ${
                    isHealthNominal
                      ? 'bg-emerald-950/80 border-2 border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.45)]'
                      : isHealthCaution
                      ? 'bg-amber-950/80 border-2 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.45)]'
                      : 'bg-rose-950/80 border-2 border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.45)]'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-xl flex items-center justify-center ${
                      isHealthNominal
                        ? 'bg-emerald-900/80 text-emerald-400'
                        : isHealthCaution
                        ? 'bg-amber-900/80 text-amber-400'
                        : 'bg-rose-900/80 text-rose-400'
                    }`}
                  >
                    <HeartPulse className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-300 font-medium">
                      Health Index
                    </div>
                    <div
                      className={`text-base font-black tracking-tight font-mono flex items-center gap-0.5 ${
                        isHealthNominal
                          ? 'text-emerald-400'
                          : isHealthCaution
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      <span>{healthIndexVal}</span>
                      <span className="text-[10px] font-sans font-bold">%</span>
                    </div>
                  </div>
                </div>

                {activeBadge === 'health' && (
                  <div className="absolute -top-24 right-0 w-48 p-2.5 rounded-xl bg-[#0c182c] border border-emerald-500 text-[11px] shadow-2xl space-y-1 animate-fade-in z-30">
                    <div className="font-bold text-emerald-300 flex items-center justify-between">
                      <span>Engine Health Status</span>
                      <span className="text-[9px] text-emerald-400 font-mono">BAND 1</span>
                    </div>
                    <div className="text-slate-300 flex justify-between">
                      <span>Composite EHI:</span>
                      <span className="font-mono text-emerald-400 font-semibold">{healthIndexVal}%</span>
                    </div>
                    <div className="text-slate-300 flex justify-between">
                      <span>AI Diagnostic:</span>
                      <span className="font-mono text-white uppercase text-[10px]">
                        {currentFrame?.diagnostics?.active_prediction || 'NORMAL'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            BOTTOM BANNER: 4 SPECIFICATIONS COLUMNS EXACTLY AS IN IMAGE
            ══════════════════════════════════════════════════════════ */}
        <div className="mt-8 rounded-2xl bg-[#0b1320]/80 backdrop-blur-md border border-slate-800/90 shadow-2xl p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80">
            {/* Column 1: Engine Type */}
            <div className="flex items-center space-x-3.5 pt-3 sm:pt-0 sm:px-4 first:pt-0 first:px-0">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                {/* Engine Block Icon */}
                <svg className="w-5 h-5 stroke-cyan-400" viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
                  <rect x="5" y="6" width="14" height="12" rx="2" />
                  <path d="M9 2v4M15 2v4M2 10h3M2 14h3M19 10h3M19 14h3M8 18v3M16 18v3" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium">Engine Type</div>
                <div className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Aero Piston Engine
                </div>
              </div>
            </div>

            {/* Column 2: Digital Twin */}
            <div className="flex items-center space-x-3.5 pt-3 sm:pt-0 sm:px-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium">Digital Twin</div>
                <div className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Physics + Data Driven
                </div>
              </div>
            </div>

            {/* Column 3: AI Models */}
            <div className="flex items-center space-x-3.5 pt-3 sm:pt-0 sm:px-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <div className="relative">
                  <Cpu className="w-5 h-5" />
                  <span className="absolute -bottom-1 -right-1 text-[7px] font-black text-cyan-300 font-mono">
                    AI
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium">AI Models</div>
                <div className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Health • Fault • RUL
                </div>
              </div>
            </div>

            {/* Column 4: Application */}
            <div className="flex items-center space-x-3.5 pt-3 sm:pt-0 sm:px-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <Plane className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium">Application</div>
                <div className="text-sm sm:text-base font-bold text-white tracking-wide">
                  MALE UAV (Long Endurance)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
