import React from 'react';
import { ArrowRight, Flame } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

export const FourStrokeCycleBar: React.FC = () => {
  const { currentFrame, currentTime, isPlaying } = useSimulation();
  const rpm = currentFrame?.raw_measurements?.rpm || 2400;

  // 4 strokes per 720° crank rotation (2 engine revolutions)
  // Compute active stroke: 0: Intake, 1: Compression, 2: Combustion, 3: Exhaust
  const cycleFrequency = (rpm / 60) * 0.5; // full 4-stroke cycles per second
  const strokeIndex = isPlaying
    ? Math.floor((currentTime * cycleFrequency * 4) % 4)
    : 2; // default to Combustion (step 3) matching screenshot when paused

  const steps = [
    {
      step: 1,
      title: 'Intake',
      desc: 'Air-Fuel In',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12h16M12 4v16M8 8l4-4 4 4" />
        </svg>
      ),
    },
    {
      step: 2,
      title: 'Compression',
      desc: 'Compress Mixture',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="6" y="8" width="12" height="12" rx="2" />
          <path d="M12 2v6M9 5l3-3 3 3" />
        </svg>
      ),
    },
    {
      step: 3,
      title: 'Combustion',
      desc: 'Power Generation',
      icon: <Flame className="w-4 h-4 fill-amber-400 stroke-amber-400" />,
    },
    {
      step: 4,
      title: 'Exhaust',
      desc: 'Release Gases',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 15s3-6 8-6 8 6 8 6M12 3v6M9 6l3 3 3-3" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-[#0c1626]/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Left Title Label */}
      <div className="flex-shrink-0 text-left">
        <div className="text-sm font-bold text-white tracking-wide">
          Engine Operation
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          (4-Stroke Cycle)
        </div>
      </div>

      {/* 4 Steps in Sequence with Connecting Arrows */}
      <div className="flex-1 flex flex-wrap items-center justify-center sm:justify-around gap-2 sm:gap-4 w-full">
        {steps.map((st, idx) => {
          const isActive = strokeIndex === idx;
          const isCombustion = idx === 2;
          return (
            <React.Fragment key={st.step}>
              {/* Step Card */}
              <div
                className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl transition-all duration-200 ${
                  isActive
                    ? isCombustion
                      ? 'bg-amber-950/70 border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)] text-amber-300'
                      : 'bg-cyan-950/70 border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)] text-cyan-200'
                    : 'bg-[#080e1c] border border-slate-800 text-slate-400'
                }`}
              >
                {/* Step Circle Icon */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isActive
                      ? isCombustion
                        ? 'bg-amber-900/80 text-amber-400'
                        : 'bg-cyan-900/80 text-cyan-300'
                      : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {st.icon}
                </div>

                {/* Text Content */}
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono text-[11px] font-bold">
                      {st.step === 1 ? '①' : st.step === 2 ? '②' : st.step === 3 ? '③' : '④'}
                    </span>
                    <span className="text-xs font-bold text-white">{st.title}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">{st.desc}</div>
                </div>
              </div>

              {/* Connecting Arrow (between steps) */}
              {idx < steps.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 hidden sm:block flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
