import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  TelemetryFrame,
  EngineProfile,
  ScenarioSummary,
  FaultInjectionConfig,
  EventLogEntry,
  ConnectionMode,
  TimeWindowOption,
} from '../types/telemetry';
import { telemetryService } from '../services/telemetryService';

interface SimulationContextType {
  // Fleet and scenario metadata
  engines: EngineProfile[];
  scenarios: ScenarioSummary[];
  selectedEngine: EngineProfile;
  selectedScenario: ScenarioSummary | null;

  // Active state
  currentFrame: TelemetryFrame;
  telemetryHistory: TelemetryFrame[];
  timeWindow: TimeWindowOption;
  setTimeWindow: (w: TimeWindowOption) => void;

  // Playback controls
  isPlaying: boolean;
  playbackRate: number;
  currentTime: number;
  duration: number;
  connectionMode: ConnectionMode;
  isModelConnected: boolean;

  // Operating inputs
  controls: {
    throttle_pct: number;
    altitude_m: number;
    ambient_temp_c: number;
    target_rpm: number;
  };

  // Fault injection (ground truth)
  faultInjection: FaultInjectionConfig;

  // Event log
  events: EventLogEntry[];

  // Actions
  start: () => void;
  pause: () => void;
  togglePlay: () => void;
  reset: () => void;
  seek: (time_s: number) => void;
  setPlaybackRate: (rate: number) => void;
  setThrottle: (val: number) => void;
  setRpmTarget: (val: number) => void;
  setAltitude: (val: number) => void;
  setAmbientTemp: (val: number) => void;
  injectFault: (config: Partial<FaultInjectionConfig>) => void;
  clearFault: () => void;
  selectEngine: (engineId: string) => void;
  selectScenario: (scenarioId: string) => void;
  clearHistory: () => void;
  acknowledgeAlert: (alertId: string) => void;
  setConnectionMode: (mode: ConnectionMode) => void;
}

const SimulationContext = createContext<SimulationContextType | null>(null);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const engines = telemetryService.getEngines();
  const scenarios = telemetryService.getScenarios();

  const [selectedEngine, setSelectedEngine] = useState<EngineProfile>(engines[0]);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioSummary | null>(scenarios[0] || null);

  const [controls, setControls] = useState({
    throttle_pct: 65.0,
    altitude_m: 1500.0,
    ambient_temp_c: 15.0,
    target_rpm: 4200.0,
  });

  const [faultInjection, setFaultInjection] = useState<FaultInjectionConfig>({
    fault_type: 'normal',
    severity: 1,
    target_channel: undefined,
    onset_s: 30,
    is_active: false,
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [currentTime, setCurrentTime] = useState<number>(0.0);
  const duration = 120;
  const [connectionMode, setConnectionModeState] = useState<ConnectionMode>('LOCAL_SIMULATOR');
  const [timeWindow, setTimeWindow] = useState<TimeWindowOption>(60);
  const [isModelConnected, setIsModelConnected] = useState<boolean>(false);

  // Probe backend model connection status
  useEffect(() => {
    const probe = () => {
      telemetryService.checkBackendHealth().then((ok) => {
        setIsModelConnected(ok);
      });
    };
    probe();
    const interval = window.setInterval(probe, 4000);
    return () => clearInterval(interval);
  }, []);

  const [events, setEvents] = useState<EventLogEntry[]>([
    {
      id: 'evt-init',
      timestamp_s: 0,
      level: 'INFO',
      category: 'SIMULATION',
      message: 'ENGINE-TWIN Digital Twin Initialized',
      details: 'Dual-Scale SDQI & Heteroscedastic EHI ready (Dataset v0.2.0, 960 scenarios).',
    },
  ]);

  // Initial step frame
  const [currentFrame, setCurrentFrame] = useState<TelemetryFrame>(() => {
    return telemetryService.getNextFrame(
      0,
      controls,
      selectedEngine,
      faultInjection,
      'cruise',
      selectedScenario?.scenario_id || 'sim-init'
    );
  });

  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryFrame[]>([currentFrame]);
  const timerRef = useRef<number | null>(null);
  const lastEventRef = useRef<{ message: string; category: string; time: number } | null>(null);
  const alertedEventsRef = useRef<Set<string>>(new Set());

  const addEvent = useCallback((event: Omit<EventLogEntry, 'id'>) => {
    const now = Date.now();
    // Deduplicate identical events arriving within 2.5 seconds
    if (
      lastEventRef.current &&
      lastEventRef.current.message === event.message &&
      lastEventRef.current.category === event.category &&
      now - lastEventRef.current.time < 2500
    ) {
      return;
    }
    lastEventRef.current = { message: event.message, category: event.category, time: now };

    setEvents((prev) => [
      {
        ...event,
        id: `evt-${now}-${Math.random().toString(36).substr(2, 5)}`,
      },
      ...prev.slice(0, 99), // Keep latest 100 events
    ]);
  }, []);

  // Timer loop for simulation playback
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = 1000 / playbackRate;
    timerRef.current = window.setInterval(() => {
      setCurrentTime((prevTime) => {
        const nextTime = Math.round((prevTime + 1.0) * 10) / 10;
        if (nextTime > duration) {
          setIsPlaying(false);
          addEvent({
            timestamp_s: duration,
            level: 'INFO',
            category: 'SIMULATION',
            message: 'Flight scenario completed',
            details: `Reached duration limit of ${duration}s.`,
          });
          return duration;
        }

        const frame = telemetryService.getNextFrame(
          nextTime,
          controls,
          selectedEngine,
          faultInjection,
          selectedScenario?.flight_profile as any || 'cruise',
          selectedScenario?.scenario_id || 'sim-custom'
        );

        // Query live trained Python Scikit-Learn model
        telemetryService.fetchModelPrediction(frame).then((pred) => {
          if (pred) {
            setIsModelConnected(true);
            setCurrentFrame((curr) => ({
              ...curr,
              diagnostics: pred,
            }));
          }
        });

        setCurrentFrame(frame);
        setTelemetryHistory((history) => {
          // Keep up to 300 samples in rolling buffer
          const updated = [...history, frame];
          if (updated.length > 300) {
            return updated.slice(updated.length - 300);
          }
          return updated;
        });

        // Check if an alert was triggered - Deduplicated by alert ID
        if (frame.alerts && frame.alerts.length > 0) {
          const alert = frame.alerts[0];
          if (!alertedEventsRef.current.has(alert.id)) {
            alertedEventsRef.current.add(alert.id);
            addEvent({
              timestamp_s: frame.time_s,
              level: alert.severity === 'WARNING' ? 'CRITICAL' : 'WARNING',
              category: 'ALERT',
              message: alert.title,
              details: alert.description,
            });
          }
        }

        return nextTime;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackRate, controls, selectedEngine, faultInjection, selectedScenario, duration, addEvent]);

  // Actions
  const start = () => {
    setIsPlaying(true);
    addEvent({
      timestamp_s: currentTime,
      level: 'INFO',
      category: 'CONTROL',
      message: 'Simulation resumed / started',
    });
  };

  const pause = () => {
    setIsPlaying(false);
    addEvent({
      timestamp_s: currentTime,
      level: 'INFO',
      category: 'CONTROL',
      message: 'Simulation paused',
    });
  };

  const togglePlay = () => {
    if (isPlaying) pause();
    else start();
  };

  const reset = () => {
    setIsPlaying(false);
    setCurrentTime(0.0);
    alertedEventsRef.current.clear();
    telemetryService.resetLocalEngine(controls.ambient_temp_c);
    const initialFrame = telemetryService.getNextFrame(
      0,
      controls,
      selectedEngine,
      faultInjection,
      selectedScenario?.flight_profile as any || 'cruise',
      selectedScenario?.scenario_id || 'sim-reset'
    );
    setCurrentFrame(initialFrame);
    setTelemetryHistory([initialFrame]);
    addEvent({
      timestamp_s: 0,
      level: 'INFO',
      category: 'SIMULATION',
      message: 'Simulation reset to t = 0.0s',
      details: 'Thermal states and online baseline offsets re-initialized.',
    });
  };

  const seek = (time_s: number) => {
    const clamped = Math.max(0, Math.min(duration, time_s));
    setCurrentTime(clamped);
    const frame = telemetryService.getNextFrame(
      clamped,
      controls,
      selectedEngine,
      faultInjection,
      selectedScenario?.flight_profile as any || 'cruise',
      selectedScenario?.scenario_id || 'sim-seek'
    );
    setCurrentFrame(frame);
    addEvent({
      timestamp_s: clamped,
      level: 'INFO',
      category: 'CONTROL',
      message: `Timeline seeked to t = ${clamped.toFixed(1)}s`,
    });
  };

  const setThrottle = (val: number) => {
    const clamped = Math.max(20.0, Math.min(98.0, val));
    setControls((c) => ({ ...c, throttle_pct: clamped }));
    addEvent({
      timestamp_s: currentTime,
      level: 'INFO',
      category: 'CONTROL',
      message: `Throttle commanded to ${clamped.toFixed(1)}%`,
    });
  };

  const setRpmTarget = (val: number) => {
    const clamped = Math.max(750, Math.min(5200, val));
    setControls((c) => ({ ...c, target_rpm: clamped }));
    addEvent({
      timestamp_s: currentTime,
      level: 'INFO',
      category: 'CONTROL',
      message: `Target RPM set to ${clamped.toFixed(0)} RPM`,
    });
  };

  const setAltitude = (val: number) => {
    const clamped = Math.max(0, Math.min(5000, val));
    setControls((c) => ({ ...c, altitude_m: clamped }));
    addEvent({
      timestamp_s: currentTime,
      level: 'INFO',
      category: 'CONTROL',
      message: `Altitude set to ${clamped.toFixed(0)} m`,
    });
  };

  const setAmbientTemp = (val: number) => {
    const clamped = Math.max(-10, Math.min(45, val));
    setControls((c) => ({ ...c, ambient_temp_c: clamped }));
    addEvent({
      timestamp_s: currentTime,
      level: 'INFO',
      category: 'CONTROL',
      message: `Ambient temperature set to ${clamped.toFixed(1)} °C`,
    });
  };

  const injectFault = (config: Partial<FaultInjectionConfig>) => {
    const updated: FaultInjectionConfig = {
      ...faultInjection,
      ...config,
      is_active: true,
      onset_s: config.onset_s !== undefined ? config.onset_s : currentTime,
    };
    setFaultInjection(updated);
    addEvent({
      timestamp_s: currentTime,
      level: 'WARNING',
      category: 'FAULT',
      message: `Ground Truth Fault Activated: ${updated.fault_type.toUpperCase().replace('_', ' ')}`,
      details: `Severity: Level ${updated.severity} (${updated.severity === 3 ? 'Severe' : updated.severity === 2 ? 'Moderate' : 'Mild'}). Target: ${updated.target_channel || 'Physical engine dynamics'}.`,
    });
  };

  const clearFault = () => {
    setFaultInjection({
      fault_type: 'normal',
      severity: 1,
      target_channel: undefined,
      onset_s: 0,
      is_active: false,
    });
    addEvent({
      timestamp_s: currentTime,
      level: 'INFO',
      category: 'FAULT',
      message: 'Fault cleared. Engine returned to normal operation.',
    });
  };

  const selectEngine = (engineId: string) => {
    const found = engines.find((e) => e.engine_id === engineId);
    if (found) {
      setSelectedEngine(found);
      reset();
      addEvent({
        timestamp_s: 0,
        level: 'INFO',
        category: 'SIMULATION',
        message: `Active Engine changed to: ${found.engine_id}`,
        details: `Displacement: ${found.displacement_l}L, Rated RPM: ${found.rated_rpm}, Idle: ${found.idle_rpm}.`,
      });
    }
  };

  const selectScenario = (scenarioId: string) => {
    const found = scenarios.find((s) => s.scenario_id === scenarioId);
    if (found) {
      setSelectedScenario(found);
      // Update engine if matched
      const eng = engines.find((e) => e.engine_id === found.engine_id);
      if (eng) setSelectedEngine(eng);

      // Pre-set fault from scenario ground truth if non-normal
      if (found.fault_type !== 'normal') {
        setFaultInjection({
          fault_type: found.fault_type,
          severity: (found.severity || 1) as any,
          target_channel: found.target_channel,
          onset_s: found.fault_onset_s || 30,
          is_active: true,
        });
      } else {
        clearFault();
      }

      alertedEventsRef.current.clear();
      reset();
      addEvent({
        timestamp_s: 0,
        level: 'INFO',
        category: 'SIMULATION',
        message: `Scenario Selected: ${found.scenario_id}`,
        details: `Phase: ${found.flight_profile.toUpperCase()}, Fault: ${found.fault_type}, Split: ${found.split.toUpperCase()}.`,
      });
    }
  };

  const clearHistory = () => {
    setTelemetryHistory([currentFrame]);
    addEvent({
      timestamp_s: currentTime,
      level: 'INFO',
      category: 'CONTROL',
      message: 'Telemetry history buffer cleared',
    });
  };

  const acknowledgeAlert = (alertId: string) => {
    setCurrentFrame((prev) => ({
      ...prev,
      alerts: prev.alerts.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)),
    }));
    addEvent({
      timestamp_s: currentTime,
      level: 'INFO',
      category: 'ALERT',
      message: `Alert ${alertId} acknowledged by flight operator`,
    });
  };

  const setConnectionMode = (mode: ConnectionMode) => {
    telemetryService.setConnectionMode(mode);
    setConnectionModeState(mode);
    addEvent({
      timestamp_s: currentTime,
      level: 'INFO',
      category: 'SIMULATION',
      message: `Connection Mode switched to ${mode}`,
      details: mode === 'BACKEND_API'
        ? 'Attempting connection to FastAPI WebSocket streaming endpoint (/api/v1/stream).'
        : 'Running in-browser generic aero-piston digital twin physics adapter.',
    });
  };

  return (
    <SimulationContext.Provider
      value={{
        engines,
        scenarios,
        selectedEngine,
        selectedScenario,
        currentFrame,
        telemetryHistory,
        timeWindow,
        setTimeWindow,
        isPlaying,
        playbackRate,
        currentTime,
        duration,
        connectionMode,
        isModelConnected,
        controls,
        faultInjection,
        events,
        start,
        pause,
        togglePlay,
        reset,
        seek,
        setPlaybackRate,
        setThrottle,
        setRpmTarget,
        setAltitude,
        setAmbientTemp,
        injectFault,
        clearFault,
        selectEngine,
        selectScenario,
        clearHistory,
        acknowledgeAlert,
        setConnectionMode,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};
