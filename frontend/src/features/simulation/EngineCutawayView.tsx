import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Volume2,
  VolumeX,
  Box,
  Layers,
  Network,
  GitFork,
  Scan,
  RefreshCw,
  RotateCw,
  ZoomIn,
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { engineAudio } from '../../services/engineAudio';

interface EngineCutawayViewProps {
  viewMode: '3d' | 'workflow' | 'system' | 'schematic';
  onViewModeChange: (mode: '3d' | 'workflow' | 'system' | 'schematic') => void;
}

export const EngineCutawayView: React.FC<EngineCutawayViewProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  const {
    currentFrame,
    currentTime,
    selectedEngine,
    selectedScenario,
    controls,
    isPlaying,
  } = useSimulation();

  const raw = currentFrame?.raw_measurements;
  const rpm = raw?.rpm || 2400;
  const cht = raw?.cht || 120;
  const throttle = controls?.throttle_pct || 65;

  // Audio synthesizer state
  const [isAudioEnabled, setIsAudioEnabled] = useState(engineAudio.getIsEnabled());
  const [audioVolume, setAudioVolume] = useState(engineAudio.getVolume());

  // 60 FPS smooth kinematic crank angle (0° to 720° for 4-stroke Otto cycle)
  const [crankAngleDeg, setCrankAngleDeg] = useState(0);
  const lastTimeRef = useRef<number>(performance.now());
  const animFrameRef = useRef<number | null>(null);

  // 3D View transforms & state (for 3D cutaway tab)
  const [isRotating, setIsRotating] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isExploded, setIsExploded] = useState(false);
  const [isXRay, setIsXRay] = useState(false);
  const [activeCallout, setActiveCallout] = useState<string | null>(null);

  useEffect(() => {
    const animate = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000.0;
      lastTimeRef.current = now;

      if (isPlaying && rpm > 50) {
        // Visual RPM scaling: smooth and clear animation
        const visualRpm = Math.min(1800, Math.max(300, rpm * 0.4));
        const deltaAngle = (visualRpm / 60.0) * 360.0 * dt;
        setCrankAngleDeg((prev) => (prev + deltaAngle) % 720);
      }

      // Update audio synthesizer
      engineAudio.update(rpm, throttle, isPlaying);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, rpm, throttle]);

  const toggleAudio = () => {
    const newState = engineAudio.toggle();
    setIsAudioEnabled(newState);
  };

  // 4-Stroke cycle kinematics calculations
  const crankAngleRad = (crankAngleDeg * Math.PI) / 180;
  let strokeName = '1. Intake';
  let strokeColor = 'text-sky-400';
  let isIntakeOpen = false;
  let isExhaustOpen = false;
  let isSparkActive = false;
  // Deep burgundy / crimson combustion chamber fill matching user image
  let gasFillColor = 'rgba(127, 29, 29, 0.75)';

  if (crankAngleDeg >= 0 && crankAngleDeg < 180) {
    strokeName = '1. Intake';
    strokeColor = 'text-sky-400';
    isIntakeOpen = true;
    gasFillColor = 'rgba(56, 189, 248, 0.35)'; // Fuel-air charge
  } else if (crankAngleDeg >= 180 && crankAngleDeg < 360) {
    strokeName = '2. Compression';
    strokeColor = 'text-amber-400';
    const compRatio = (crankAngleDeg - 180) / 180;
    gasFillColor = `rgba(153, 27, 27, ${0.5 + compRatio * 0.35})`; // Deepening compression burgundy
  } else if (crankAngleDeg >= 360 && crankAngleDeg < 540) {
    strokeName = '3. Power';
    strokeColor = 'text-rose-400';
    isSparkActive = crankAngleDeg >= 360 && crankAngleDeg < 390;
    gasFillColor = 'rgba(239, 68, 68, 0.85)'; // Fiery power stroke
  } else {
    strokeName = '4. Exhaust';
    strokeColor = 'text-orange-400';
    isExhaustOpen = true;
    gasFillColor = 'rgba(180, 83, 9, 0.45)'; // Exhaust gas
  }

  // Slider-crank exact geometry: r = 36px, l = 90px
  const r = 36;
  const l = 90;
  const crankCenterX = 150;
  const crankCenterY = 225;

  const pinX = crankCenterX + r * Math.sin(crankAngleRad);
  const pinY = crankCenterY + r * Math.cos(crankAngleRad);
  const deltaX = pinX - crankCenterX;
  const wristPinY = pinY - Math.sqrt(Math.max(0, l * l - deltaX * deltaX));

  const pistonHeight = 44;
  const pistonWidth = 74;
  const pistonTopY = wristPinY - 28;

  // Active view defaults to 'schematic' matching user request
  const activeView = viewMode === '3d' ? 'schematic' : viewMode;

  return (
    <div className="relative bg-[#0c1626]/95 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between overflow-hidden">
      {/* 1. Header with Title & View Mode Pills & Audio Mute */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-2">
        <div className="flex items-center space-x-2.5">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
            Aero-Piston Mechanical Schematic
          </h2>
        </div>

        {/* View Mode Pills + Audio Mute Button */}
        <div className="flex items-center space-x-2">
          {/* Audio Synthesizer Toggle matching Image 1 */}
          <button
            onClick={toggleAudio}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
              isAudioEnabled
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Procedural Aero Engine Sound (Web Audio API)"
          >
            {isAudioEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{isAudioEnabled ? 'Sound On' : 'Mute'}</span>
          </button>

          {/* View Toggles */}
          <div className="hidden sm:flex items-center space-x-1 bg-[#080e1c] p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onViewModeChange('schematic')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                activeView === 'schematic'
                  ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Schematic
            </button>

            <button
              onClick={() => onViewModeChange('workflow')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                activeView === 'workflow'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Workflow
            </button>

            <button
              onClick={() => onViewModeChange('system')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                activeView === 'system'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              System Diagram
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Simulation Canvas (Image 1: Aero-Piston Mechanical Schematic) */}
      <div className="relative w-full flex flex-col items-center justify-center my-1 bg-[#070d18] p-2 rounded-xl border border-slate-800/80 overflow-hidden shadow-inner">
        <svg
          viewBox="0 0 300 320"
          className="w-full max-w-sm h-72 select-none"
        >
          <defs>
            {/* Combustion Flash Spark */}
            <radialGradient id="combustionFlash" cx="50%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="30%" stopColor="#fed7aa" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#f43f5e" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>

            {/* Piston Head Metallic Gradient */}
            <linearGradient id="pistonMetal" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="35%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="65%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Cylinder Sleeve Dark Liner */}
            <linearGradient id="cylinderSleeve" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0a1220" />
              <stop offset="12%" stopColor="#1e293b" />
              <stop offset="88%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0a1220" />
            </linearGradient>

            {/* Connecting Rod Gradient */}
            <linearGradient id="conRodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>

          {/* Air-Cooled Cylinder External Fins (7 on left, 7 on right) */}
          {[55, 70, 85, 100, 115, 130, 145].map((y) => (
            <g key={y} stroke="#334155" strokeWidth="3" strokeLinecap="round">
              <line x1="84" y1={y} x2="105" y2={y} />
              <line x1="195" y1={y} x2="216" y2={y} />
            </g>
          ))}

          {/* Cylinder Bore Wall */}
          <rect
            x="106"
            y="45"
            width="88"
            height="145"
            fill="url(#cylinderSleeve)"
            stroke="#475569"
            strokeWidth="3"
            rx="2"
          />

          {/* Dynamic Gas Chamber Volume (Burgundy / Crimson Fill matching user image) */}
          <rect
            x="108"
            y="48"
            width="84"
            height={Math.max(4, pistonTopY - 48)}
            fill={gasFillColor}
            style={{ transition: 'fill 0.1s ease' }}
          />

          {/* Spark Ignition Explosion Flash during Power Stroke */}
          {isSparkActive && (
            <ellipse
              cx="150"
              cy="58"
              rx="38"
              ry="20"
              fill="url(#combustionFlash)"
            />
          )}

          {/* Cylinder Head Cover */}
          <path
            d="M 98 45 L 98 32 Q 150 18 202 32 L 202 45 Z"
            fill="#1e293b"
            stroke="#64748b"
            strokeWidth="2.5"
          />

          {/* Spark Plug Assembly */}
          <rect x="146" y="16" width="8" height="20" fill="#94a3b8" stroke="#475569" strokeWidth="1" />
          <line x1="150" y1="36" x2="150" y2="44" stroke="#e2e8f0" strokeWidth="2" />
          {isSparkActive && (
            <circle cx="150" cy="45" r="4" fill="#38bdf8" />
          )}

          {/* Intake Valve & Port (Left) */}
          <path d="M 80 40 Q 115 40 120 48" fill="none" stroke="#475569" strokeWidth="3" />
          <g transform={`translate(0, ${isIntakeOpen ? 6 : 0})`}>
            <line x1="124" y1="28" x2="124" y2="48" stroke="#cbd5e1" strokeWidth="2.5" />
            <polygon points="117,48 131,48 127,45 121,45" fill="#f8fafc" />
          </g>

          {/* Exhaust Valve & Port (Right) */}
          <path d="M 220 40 Q 185 40 180 48" fill="none" stroke="#475569" strokeWidth="3" />
          <g transform={`translate(0, ${isExhaustOpen ? 6 : 0})`}>
            <line x1="176" y1="28" x2="176" y2="48" stroke="#cbd5e1" strokeWidth="2.5" />
            <polygon points="169,48 183,48 179,45 173,45" fill="#f8fafc" />
          </g>

          {/* Crankcase Circular Housing Outline */}
          <circle
            cx={crankCenterX}
            cy={crankCenterY}
            r="54"
            fill="#090f19"
            stroke="#334155"
            strokeWidth="2.5"
          />

          {/* Counterweighted Crankshaft Web (Rotating smoothly at real RPM) */}
          <g transform={`rotate(${(crankAngleDeg % 360)}, ${crankCenterX}, ${crankCenterY})`}>
            <path
              d="M 134 225 A 36 36 0 0 0 166 225 L 170 252 A 28 28 0 0 1 130 252 Z"
              fill="#475569"
              stroke="#64748b"
              strokeWidth="2"
            />
            <circle cx={crankCenterX} cy={crankCenterY} r="14" fill="#64748b" stroke="#94a3b8" strokeWidth="1.5" />
            <circle cx={crankCenterX} cy={crankCenterY} r="5" fill="#1e293b" />
          </g>

          {/* Connecting Rod */}
          <line
            x1={crankCenterX}
            y1={wristPinY}
            x2={pinX}
            y2={pinY}
            stroke="url(#conRodGrad)"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <line
            x1={crankCenterX}
            y1={wristPinY}
            x2={pinX}
            y2={pinY}
            stroke="#1e293b"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Crankpin Bearing */}
          <circle cx={pinX} cy={pinY} r="8.5" fill="#94a3b8" stroke="#334155" strokeWidth="2" />
          <circle cx={pinX} cy={pinY} r="4" fill="#1e293b" />

          {/* Reciprocating Piston Assembly */}
          <rect
            x={crankCenterX - pistonWidth / 2}
            y={pistonTopY}
            width={pistonWidth}
            height={pistonHeight}
            rx="3"
            fill="url(#pistonMetal)"
            stroke="#64748b"
            strokeWidth="2"
          />

          {/* Piston Compression Rings */}
          <line
            x1={crankCenterX - pistonWidth / 2}
            y1={pistonTopY + 7}
            x2={crankCenterX + pistonWidth / 2}
            y2={pistonTopY + 7}
            stroke="#1e293b"
            strokeWidth="1.5"
          />
          <line
            x1={crankCenterX - pistonWidth / 2}
            y1={pistonTopY + 13}
            x2={crankCenterX + pistonWidth / 2}
            y2={pistonTopY + 13}
            stroke="#1e293b"
            strokeWidth="1.5"
          />

          {/* Wrist Pin Boss & Pivot */}
          <circle cx={crankCenterX} cy={wristPinY} r="7" fill="#f8fafc" stroke="#334155" strokeWidth="2" />
          <circle cx={crankCenterX} cy={wristPinY} r="3" fill="#64748b" />
        </svg>

        {/* 3. Bottom Flight Telemetry Footer Strip Exactly Matching Image 1 */}
        <div className="w-full flex flex-wrap justify-between items-center bg-[#091122]/90 border border-slate-800/80 px-4 py-2 rounded-lg text-xs font-mono mt-1">
          <div className="flex items-center space-x-4">
            <span>
              SCENARIO:{' '}
              <span className="text-white font-bold">
                {selectedScenario?.scenario_id.slice(0, 8) || '007f78f9'}
              </span>
            </span>
            <span>
              ENGINE:{' '}
              <span className="text-white font-bold">
                {selectedEngine.engine_id.slice(0, 8) || '0b650165'}
              </span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <span>
              PHASE:{' '}
              <span className="text-cyan-400 font-bold uppercase">
                {currentFrame.operating_phase || 'CRUISE'}
              </span>
            </span>
            <span>
              TIME:{' '}
              <span className="text-white font-bold tabular-nums">
                {currentTime.toFixed(1)}s
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
