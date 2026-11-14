import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InstrumentDial } from '../components/instruments/InstrumentDial';
import { EhiGauge } from '../components/instruments/EhiGauge';
import { SdqiCard } from '../components/instruments/SdqiCard';

describe('Instrument UI Components', () => {
  it('renders InstrumentDial with value, unit, and label', () => {
    render(
      <InstrumentDial
        label="Engine Speed"
        unit="RPM"
        value={4420}
        min={600}
        max={5500}
      />
    );
    expect(screen.getByText('Engine Speed')).toBeInTheDocument();
    expect(screen.getByText('4420.0')).toBeInTheDocument();
    expect(screen.getByText('RPM')).toBeInTheDocument();
  });

  it('renders warning badge when value breaches high threshold', () => {
    render(
      <InstrumentDial
        label="Cylinder Head"
        unit="°C"
        value={255}
        min={20}
        max={260}
        warningHigh={245}
      />
    );
    expect(screen.getByText('WARNING')).toBeInTheDocument();
  });

  it('renders MISSING state when value is null or undefined', () => {
    render(
      <InstrumentDial
        label="Oil Pressure"
        unit="kPa"
        value={null}
        min={100}
        max={700}
        isMissing={true}
      />
    );
    expect(screen.getByText('MISSING')).toBeInTheDocument();
    expect(screen.getByText('---')).toBeInTheDocument();
  });

  it('renders EhiGauge with nominal status band and score', () => {
    render(
      <EhiGauge
        ehi={94.5}
        status="BAND_1_NOMINAL"
        baselineStatus="CALIBRATED_NOMINAL"
        coverageFraction={1.0}
      />
    );
    expect(screen.getByText('ENGINE HEALTH INDEX (EHI)')).toBeInTheDocument();
    expect(screen.getByText('94.5')).toBeInTheDocument();
    expect(screen.getByText('NOMINAL')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders EhiGauge in failsafe gate state when telemetry coverage is insufficient', () => {
    render(
      <EhiGauge
        ehi={null}
        status="INSUFFICIENT_TELEMETRY_COVERAGE"
        baselineStatus="CALIBRATED_NOMINAL"
        coverageFraction={0.65}
      />
    );
    expect(screen.getByText('NULL')).toBeInTheDocument();
    expect(screen.getByText('FAILSAFE GATE')).toBeInTheDocument();
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
  });

  it('renders SdqiCard with composite and worst-channel scores', () => {
    render(
      <SdqiCard
        sdqi={{
          composite_sdqi: 96.2,
          worst_channel_sdqi: 88.0,
          coverage_fraction: 1.0,
          status: 'NOMINAL',
          channel_qualities: {
            rpm: 1.0,
            manifold_pressure: 1.0,
            cht: 0.95,
            egt: 0.98,
            oil_temp: 1.0,
            oil_pressure: 1.0,
            fuel_flow: 0.88,
            power: 1.0,
            torque: 1.0,
            vibration: 1.0,
          },
        }}
      />
    );
    expect(screen.getByText('SENSOR DATA QUALITY (SDQI)')).toBeInTheDocument();
    expect(screen.getByText('96.2')).toBeInTheDocument();
    expect(screen.getByText('88.0')).toBeInTheDocument();
    expect(screen.getByText('NOMINAL')).toBeInTheDocument();
  });
});
