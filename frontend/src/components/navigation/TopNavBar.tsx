import React, { useState } from 'react';
import {
  Home,
  Play,
  Activity,
  BarChart2,
  FileText,
  Info,
  User,
  Menu,
  X,
  Plane,
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

export type NavigationTab = 'home' | 'simulation' | 'monitoring' | 'analytics' | 'reports' | 'about';

interface TopNavBarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenLogin: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeTab,
  onTabChange,
  onOpenLogin,
}) => {
  const { isModelConnected, isPlaying } = useSimulation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home' as NavigationTab, label: 'Home', icon: Home },
    { id: 'simulation' as NavigationTab, label: 'Simulation', icon: Play },
    { id: 'monitoring' as NavigationTab, label: 'Monitoring', icon: Activity },
    { id: 'analytics' as NavigationTab, label: 'Analytics', icon: BarChart2 },
    { id: 'reports' as NavigationTab, label: 'Reports', icon: FileText },
    { id: 'about' as NavigationTab, label: 'About', icon: Info },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#080d1a]/85 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Brand Identity Matching User Design */}
        <div
          onClick={() => onTabChange('home')}
          className="flex items-center space-x-3 cursor-pointer group select-none"
        >
          {/* Cyan Aircraft Logo Outline */}
          <div className="relative flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform duration-200">
            <svg
              className="w-7 h-7 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Sleek Aerospace UAV Jet Silhouette */}
              <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.8-.2-1.6.1-2.1.7l-.7.7 5.7 3.6-3 3-2.1-.5c-.5-.1-1 .1-1.3.4l-.4.4 2.8 1.8 1.8 2.8.4-.4c.3-.3.5-.8.4-1.3l-.5-2.1 3-3 3.6 5.7.7-.7c.6-.5.9-1.3.7-2.1z" />
            </svg>
          </div>

          <div className="flex items-center space-x-2.5">
            <span className="text-base sm:text-lg font-black tracking-tight text-white font-sans">
              ENGINE-TWIN
            </span>
            <span className="text-slate-600 font-light text-sm sm:text-base hidden sm:inline">|</span>
            <span className="text-xs sm:text-sm text-slate-300 font-medium tracking-wide hidden sm:inline">
              UAV Engine Digital Twin
            </span>
            <span className="sr-only">MALE UAV AERO PISTON</span>
          </div>
        </div>

        {/* Center: Exact Navigation Pill Tabs from Design */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs lg:text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#0d2238] border border-cyan-500/60 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)] font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isActive ? 'text-cyan-400 scale-105' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Login Button Matching Image */}
        <div className="flex items-center space-x-3">
          {/* Real-time backend live badge (subtle) */}
          <div
            title={isModelConnected ? 'AI Diagnostic Model Connected' : 'Standalone Physics Simulation'}
            className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900/60 border border-slate-800 text-[10px] font-mono text-slate-400"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isModelConnected ? 'bg-emerald-400 animate-pulse' : isPlaying ? 'bg-cyan-400' : 'bg-slate-500'
              }`}
            />
            <span>{isModelConnected ? 'AI MODEL: LIVE' : 'AI MODEL: STANDALONE'}</span>
          </div>

          <button
            onClick={onOpenLogin}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium border border-slate-700/80 hover:border-cyan-500/60 text-slate-200 hover:text-white bg-slate-900/40 hover:bg-slate-800/60 transition shadow-sm"
          >
            <User className="w-4 h-4 text-slate-300" />
            <span>Login</span>
          </button>

          {/* Mobile menu hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden pt-3 pb-2 px-2 border-t border-slate-800/80 mt-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium ${
                  isActive
                    ? 'bg-[#0d2238] border border-cyan-500/50 text-cyan-300'
                    : 'text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4 text-cyan-400" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
