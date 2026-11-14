import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import { TopNavBar, NavigationTab } from '../components/navigation/TopNavBar';
import { ShieldCheck } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenLogin: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  onOpenLogin,
}) => {
  const {
    currentFrame,
    currentTime,
    selectedEngine,
    selectedScenario,
  } = useSimulation();

  return (
    <div className="min-h-screen bg-[#070c16] text-slate-100 flex flex-col justify-between selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* 1. MASTER HEADER MATCHING DESIGN */}
      <TopNavBar
        activeTab={activeTab}
        onTabChange={onTabChange}
        onOpenLogin={onOpenLogin}
      />

      {/* 2. MAIN CONTENT AREA */}
      <main className={`flex-1 w-full ${activeTab === 'home' ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'}`}>
        {children}
      </main>

      {/* 3. PERSISTENT TELEMETRY FOOTER BAR (Visible on Technical Tabs) */}
      {activeTab !== 'home' && (
        <footer className="border-t border-slate-800/80 bg-[#080d1a]/95 backdrop-blur px-4 py-2 text-xs font-mono text-slate-400 sticky bottom-0 z-40">
          <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
            {/* Active Flight Info */}
            <div className="flex items-center space-x-4">
              <span>
                SCENARIO:{' '}
                <span className="text-slate-200 font-semibold">
                  {selectedScenario?.scenario_id.slice(0, 8) || 'CUSTOM'}
                </span>
              </span>
              <span>
                ENGINE:{' '}
                <span className="text-slate-200 font-semibold">
                  {selectedEngine.engine_id.slice(0, 8)}
                </span>
              </span>
              <span>
                PHASE:{' '}
                <span className="text-cyan-400 font-semibold uppercase">
                  {currentFrame.operating_phase}
                </span>
              </span>
              <span>
                CLOCK:{' '}
                <span className="text-slate-200 font-semibold tabular-nums">
                  {currentTime.toFixed(1)}s
                </span>
              </span>
            </div>

            {/* Quick Health Summary */}
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
                <span>
                  EHI:{' '}
                  <span className="text-emerald-400 font-bold tabular-nums">
                    {currentFrame.engine_health.ehi !== null
                      ? `${currentFrame.engine_health.ehi.toFixed(1)}%`
                      : 'CALIBRATING'}
                  </span>
                </span>
              </span>
              <span>
                SDQI:{' '}
                <span className="text-cyan-400 font-bold tabular-nums">
                  {currentFrame.sensor_data_quality.composite_sdqi.toFixed(1)}
                </span>
              </span>
              <span>
                PREDICTION:{' '}
                <span className="text-slate-200 font-bold uppercase">
                  {currentFrame.diagnostics.active_prediction.replace('_', ' ')}
                </span>
              </span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};
