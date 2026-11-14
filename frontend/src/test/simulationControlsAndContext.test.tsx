import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SimulationProvider, useSimulation } from '../context/SimulationContext';

const TestConsumer: React.FC = () => {
  const {
    currentFrame,
    isPlaying,
    currentTime,
    togglePlay,
    reset,
    seek,
    setThrottle,
    controls,
    faultInjection,
    injectFault,
    clearFault,
    telemetryHistory,
  } = useSimulation();

  return (
    <div>
      <div data-testid="is-playing">{isPlaying ? 'PLAYING' : 'PAUSED'}</div>
      <div data-testid="current-time">{currentTime.toFixed(1)}</div>
      <div data-testid="throttle">{controls.throttle_pct.toFixed(1)}</div>
      <div data-testid="history-len">{telemetryHistory.length}</div>
      <div data-testid="fault-type">{faultInjection.fault_type}</div>
      <div data-testid="fault-active">{faultInjection.is_active ? 'ACTIVE' : 'INACTIVE'}</div>
      <div data-testid="active-prediction">{currentFrame.diagnostics.active_prediction}</div>

      <button onClick={togglePlay}>TogglePlay</button>
      <button onClick={reset}>Reset</button>
      <button onClick={() => seek(45)}>Seek45</button>
      <button onClick={() => setThrottle(85)}>SetThrottle85</button>
      <button onClick={() => setThrottle(120)}>SetThrottleOverMax</button>
      <button onClick={() => injectFault({ fault_type: 'combustion_irregularity', severity: 3 })}>
        InjectCombustion
      </button>
      <button onClick={clearFault}>ClearFault</button>
    </div>
  );
};

describe('SimulationContext and Controls State Management', () => {
  it('initializes with default controls, state, and initial frame', () => {
    render(
      <SimulationProvider>
        <TestConsumer />
      </SimulationProvider>
    );

    expect(screen.getByTestId('is-playing')).toHaveTextContent('PLAYING');
    expect(screen.getByTestId('throttle')).toHaveTextContent('65.0');
    expect(screen.getByTestId('fault-type')).toHaveTextContent('normal');
    expect(screen.getByTestId('fault-active')).toHaveTextContent('INACTIVE');
  });

  it('toggles playback between playing and paused', () => {
    render(
      <SimulationProvider>
        <TestConsumer />
      </SimulationProvider>
    );

    const toggleBtn = screen.getByText('TogglePlay');
    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(screen.getByTestId('is-playing')).toHaveTextContent('PAUSED');

    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(screen.getByTestId('is-playing')).toHaveTextContent('PLAYING');
  });

  it('clamps throttle command to simulator-defined maximum (98%)', () => {
    render(
      <SimulationProvider>
        <TestConsumer />
      </SimulationProvider>
    );

    const overMaxBtn = screen.getByText('SetThrottleOverMax');
    act(() => {
      fireEvent.click(overMaxBtn);
    });
    // Commanded 120%, must be clamped to 98.0% per dataset_config.json
    expect(screen.getByTestId('throttle')).toHaveTextContent('98.0');
  });

  it('injects fault, updates ground truth separately, and allows clearing fault', () => {
    render(
      <SimulationProvider>
        <TestConsumer />
      </SimulationProvider>
    );

    const injectBtn = screen.getByText('InjectCombustion');
    act(() => {
      fireEvent.click(injectBtn);
    });

    expect(screen.getByTestId('fault-type')).toHaveTextContent('combustion_irregularity');
    expect(screen.getByTestId('fault-active')).toHaveTextContent('ACTIVE');

    const clearBtn = screen.getByText('ClearFault');
    act(() => {
      fireEvent.click(clearBtn);
    });

    expect(screen.getByTestId('fault-type')).toHaveTextContent('normal');
    expect(screen.getByTestId('fault-active')).toHaveTextContent('INACTIVE');
  });

  it('seeks to target timestamp and resets to t = 0.0s', () => {
    render(
      <SimulationProvider>
        <TestConsumer />
      </SimulationProvider>
    );

    const seekBtn = screen.getByText('Seek45');
    act(() => {
      fireEvent.click(seekBtn);
    });
    expect(screen.getByTestId('current-time')).toHaveTextContent('45.0');

    const resetBtn = screen.getByText('Reset');
    act(() => {
      fireEvent.click(resetBtn);
    });
    expect(screen.getByTestId('current-time')).toHaveTextContent('0.0');
    expect(screen.getByTestId('is-playing')).toHaveTextContent('PAUSED');
  });
});
