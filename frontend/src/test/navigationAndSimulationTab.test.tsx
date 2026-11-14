import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

describe('ENGINE-TWIN UI/UX Design & Home Screen Layout', () => {
  it('renders the Home Screen matching the design with real model values', () => {
    render(<App />);

    // Brand and platform identifier in TopNavBar
    expect(screen.getByText('ENGINE-TWIN')).toBeInTheDocument();
    expect(screen.getByText('UAV Engine Digital Twin')).toBeInTheDocument();

    // Top Tag / Pill
    expect(screen.getByText('SIH26054')).toBeInTheDocument();
    expect(screen.getByText('MALE UAV Engine')).toBeInTheDocument();

    // Main Heading & Subtitle
    expect(screen.getByText('Digital Twin for')).toBeInTheDocument();
    expect(screen.getByText('Engine')).toBeInTheDocument();
    expect(screen.getByText(/AI-Enabled Real-Time Health Monitoring/i)).toBeInTheDocument();

    // 4 Feature Cards
    expect(screen.getAllByText(/Real-Time/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Fault/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/RUL/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Interactive/i).length).toBeGreaterThan(0);

    // 2 CTA buttons
    expect(screen.getByRole('button', { name: /Launch Simulation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Watch Demo/i })).toBeInTheDocument();

    // Live HUD Model Badges on Engine Visual
    expect(screen.getByText(/Temperature/i)).toBeInTheDocument();
    expect(screen.getByText(/Vibration/i)).toBeInTheDocument();
    expect(screen.getByText(/Pressure/i)).toBeInTheDocument();
    expect(screen.getByText(/Health Index/i)).toBeInTheDocument();

    // Bottom 4-Column Specifications Bar
    expect(screen.getByText('Aero Piston Engine')).toBeInTheDocument();
    expect(screen.getByText('Physics + Data Driven')).toBeInTheDocument();
    expect(screen.getByText('Health • Fault • RUL')).toBeInTheDocument();
    expect(screen.getByText('MALE UAV (Long Endurance)')).toBeInTheDocument();
  });

  it('navigates from Home Screen to Simulation suite via Launch Simulation button and renders actual mechanical schematic', () => {
    render(<App />);

    const launchBtn = screen.getByRole('button', { name: /Launch Simulation/i });
    fireEvent.click(launchBtn);

    // Verify Simulation page elements matching user specifications
    expect(screen.getByText(/Aero-Piston Mechanical Schematic/i)).toBeInTheDocument();
    expect(screen.getByText(/Simulation Control/i)).toBeInTheDocument();
    expect(screen.getByText(/Fault Injection \(Test\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Real-Time Sensor Data/i)).toBeInTheDocument();
    expect(screen.getByText(/Engine Health/i)).toBeInTheDocument();
    expect(screen.getByText(/RUL Prediction/i)).toBeInTheDocument();
    expect(screen.getByText(/Fault Diagnosis \(AI\)/i)).toBeInTheDocument();
  });

  it('renders the live Aero-Piston Mechanical Schematic with audio controls and telemetry strip', () => {
    render(<App initialTab="simulation" />);

    // Mechanical schematic header and audio mute
    expect(screen.getByText(/Aero-Piston Mechanical Schematic/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mute/i })).toBeInTheDocument();

    // Telemetry strip inside schematic
    expect(screen.getAllByText(/SCENARIO:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ENGINE:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/PHASE:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/TIME:/i).length).toBeGreaterThan(0);
  });

  it('renders the 4-Stroke Cycle sequence and playback controls on simulation tab', () => {
    render(<App initialTab="simulation" />);

    // 4-Stroke cycle steps
    expect(screen.getByText(/Engine Operation/i)).toBeInTheDocument();
    expect(screen.getByText(/Intake/i)).toBeInTheDocument();
    expect(screen.getByText(/Compression/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Combustion/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Release Gases/i)).toBeInTheDocument();

    // Simulation speed buttons
    expect(screen.getByRole('button', { name: '0.5x' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1x' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2x' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4x' })).toBeInTheDocument();
  });
});
