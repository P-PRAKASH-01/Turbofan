import React, { useState } from 'react';
import { User, Lock, ShieldCheck, X, CheckCircle, AlertCircle } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [operatorId, setOperatorId] = useState('UAV-FLIGHT-OP-01');
  const [accessCode, setAccessCode] = useState('••••••••');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggedIn(true);
    setTimeout(() => {
      onClose();
      setIsLoggedIn(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0d1626] border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide">Operator Authentication</h3>
            <p className="text-xs text-slate-400">ENGINE-TWIN Mission Control Access</p>
          </div>
        </div>

        {isLoggedIn ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-500 flex items-center justify-center mx-auto text-emerald-400 animate-pulse">
              <CheckCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-emerald-300">Authentication Verified</p>
            <p className="text-xs text-slate-400">Connecting to telemetry stream...</p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Operator Call-Sign / ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                  className="w-full bg-[#080d17] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
                  placeholder="e.g. UAV-FLIGHT-OP-01"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Security Token / Key
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="w-full bg-[#080d17] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
                  placeholder="Enter security token"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 py-1">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Airborne Twin Link Active
              </span>
              <span>Level 3 Clearance</span>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 font-bold py-2.5 rounded-xl text-sm transition shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                Sign In to Console
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
