import React, { useState, useEffect, useRef } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { engineAudio } from '../../services/engineAudio';
import { Cpu, Volume2, VolumeX } from 'lucide-react';

interface EngineSchematic2DProps {
  onCrankAngleChange?: (deg: number) => void;
}

export const EngineSchematic2D: React.FC<EngineSchematic2DProps> = () => {
  const { currentFrame, controls, isPlaying } = useSimulation();
  const { raw_measurements } = currentFrame;

  const rpm = raw_measurements.rpm || 0;
  const cht = raw_measurements.cht || 120;
  const throttle = controls.throttle_pct || 65;

  // Audio state
  const [isAudioEnabled, setIsAudioEnabled] = useState(engineAudio.getIsEnabled());
  const [audioVolume, setAudioVolume] = useState(engineAudio.getVolume());

  // Real-time smooth kinematic crank angle (0 to 720 degrees for 4-stroke cycle)
  const [crankAngleDeg, setCrankAngleDeg] = useState(0);
  const lastTimeRef = useRef<number>(performance.now());
  const animFrameRef = useRef<number | null>(null);

  // 60 FPS Smooth Kinematics Loop - Isolated to component only (does not trigger parent re-renders)
  useEffect(() => {
    const animate = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000.0;
      lastTimeRef.current = now;

      if (isPlaying && rpm > 50) {
        // Scaled visual rotation speed (clamped between 300 and 1800 visual RPM for clarity)
        const visualRpm = Math.min(1800, Math.max(300, rpm * 0.4));
        const deltaAngle = (visualRpm / 60.0) * 360.0 * dt;

        setCrankAngleDeg((prev) => (prev + deltaAngle) % 720);
      }

      // Update procedural audio engine
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

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setAudioVolume(v);
    engineAudio.setVolume(v);
  };

  // 4-Stroke Cycle State calculations
  const crankAngleRad = (crankAngleDeg * Math.PI) / 180;
  let strokeName = '1. Intake';
  let strokeColor = 'text-sky-400';
  let isIntakeOpen = false;
  let isExhaustOpen = false;
  let isSparkActive = false;
  let gasFillColor = 'rgba(56, 189, 248, 0.15)'; // Clean subtle charge

  if (crankAngleDeg >= 0 && crankAngleDeg < 180) {
    strokeName = '1. Intake';
    strokeColor = 'text-sky-400';
    isIntakeOpen = true;
    gasFillColor = 'rgba(56, 189, 248, 0.2)';
  } else if (crankAngleDeg >= 180 && crankAngleDeg < 360) {
    strokeName = '2. Compression';
    strokeColor = 'text-amber-400';
    const compRatio = (crankAngleDeg - 180) / 180;
    gasFillColor = `rgba(245, 158, 11, ${0.15 + compRatio * 0.25})`;
  } else if (crankAngleDeg >= 360 && crankAngleDeg < 540) {
    strokeName = '3. Power';
    strokeColor = 'text-rose-400';
    isSparkActive = crankAngleDeg >= 360 && crankAngleDeg < 390;
    gasFillColor = 'rgba(244, 63, 94, 0.35)';
  } else {
    strokeName = '4. Exhaust';
    strokeColor = 'text-orange-400';
    isExhaustOpen = true;
    gasFillColor = 'rgba(249, 115, 22, 0.2)';
  }

  // Slider-crank exact kinematics
  // Crank radius r = 36px, connecting rod length l = 90px
  const r = 36;
  const l = 90;
  const crankCenterX = 150;
  const crankCenterY = 225;

  // Crankpin position (pinX, pinY)
  const pinX = crankCenterX + r * Math.sin(crankAngleRad);
  const pinY = crankCenterY + r * Math.cos(crankAngleRad);

  // Wrist pin position (constrained vertically to X = 150)
  const deltaX = pinX - crankCenterX;
  const wristPinY = pinY - Math.sqrt(Math.max(0, l * l - deltaX * deltaX));

  // Piston crown position
  const pistonHeight = 44;
  const pistonWidth = 74;
  const pistonTopY = wristPinY - 28;

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 shadow-sm flex flex-col justify-between text-xs space-y-3">
      {/* Header with Subtle Sound Controls */}
      <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-slate-200">
            Aero-Piston Mechanical Schematic
          </span>
        </div>

        {/* Audio Synthesizer Controls */}
        <div className="flex items-center space-x-2 bg-slate-950/60 px-2 py-1 rounded-md border border-slate-800 text-[11px]">
          <button
            onClick={toggleAudio}
            className={`flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors ${
              isAudioEnabled
                ? 'bg-sky-950/80 border border-sky-800/80 text-sky-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle procedural engine sound (Web Audio API)"
          >
            {isAudioEnabled ? <Volume2 className="w-3.5 h-3.5 text-sky-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="font-medium">{isAudioEnabled ? 'Sound On' : 'Mute'}</span>
          </button>
          {isAudioEnabled && (
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={audioVolume}
              onChange={handleVolumeChange}
              className="w-14 cursor-pointer h-1 bg-slate-800 rounded"
              title={`Engine Volume: ${(audioVolume * 100).toFixed(0)}%`}
            />
          )}
        </div>
      </div>

      {/* 2D Schematic Canvas - Fixed container without jitter */}
      <div className="relative w-full flex flex-col items-center justify-center my-0.5 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60 overflow-hidden">
        <svg
          viewBox="0 0 300 320"
          className="w-full max-w-sm h-72 select-none"
        >
          <defs>
            <radialGradient id="combustionFlash" cx="50%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="30%" stopColor="#fed7aa" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#f43f5e" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="pistonMetal" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="35%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="65%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <linearGradient id="cylinderSleeve" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="12%" stopColor="#1e293b" />
              <stop offset="88%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="conRodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>

          {/* Engine Cylinder Cooling Fins */}
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

          {/* Dynamic Gas Chamber Volume */}
          <rect
            x="108"
            y="48"
            width="84"
            height={Math.max(4, pistonTopY - 48)}
            fill={gasFillColor}
            style={{ transition: 'fill 0.1s ease' }}
          />

          {/* Spark Ignition Flash during Power Stroke */}
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
            fill="#334155"
            stroke="#64748b"
            strokeWidth="2.5"
          />

          {/* Spark Plug */}
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

          {/* Crankcase Outline */}
          <circle
            cx={crankCenterX}
            cy={crankCenterY}
            r="54"
            fill="#090f19"
            stroke="#334155"
            strokeWidth="2.5"
          />

          {/* Counterweighted Crankshaft Web */}
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

          {/* Piston Assembly */}
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

          {/* Wrist Pin */}
          <circle cx={crankCenterX} cy={wristPinY} r="7" fill="#f8fafc" stroke="#334155" strokeWidth="2" />
          <circle cx={crankCenterX} cy={wristPinY} r="3" fill="#64748b" />
        </svg>

        {/* Stable Stroke Phase Bar */}
        <div className="w-full flex justify-between items-center bg-slate-900/90 px-3 py-1.5 rounded border border-slate-800 text-[11px] mt-1">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 font-medium">Cycle Stroke:</span>
            <span className={`font-semibold ${strokeColor}`}>{strokeName}</span>
          </div>
          <span className="text-slate-400">
            {isPlaying ? '4-Stroke Engine In Motion' : 'Paused'}
          </span>
        </div>
      </div>

      {/* Simplified, Clean Engine Status Readouts (Essential info only) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Engine Speed</span>
          <span className="font-semibold text-slate-100 text-sm tabular-nums">
            {Math.round(rpm).toLocaleString()} RPM
          </span>
        </div>
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Shaft Power</span>
          <span className="font-semibold text-sky-400 text-sm tabular-nums">
            {Math.round(raw_measurements.power || 0)} kW
          </span>
        </div>
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Cylinder Head</span>
          <span className="font-semibold text-amber-400 text-sm tabular-nums">
            {Math.round(cht)} °C
          </span>
        </div>
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Cycle Type</span>
          <span className="font-semibold text-emerald-400 text-sm">
            4-Stroke Otto
          </span>
        </div>
      </div>
    </div>
  );
};
