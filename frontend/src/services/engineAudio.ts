/**
 * ENGINE-TWIN Procedural Web Audio Engine Sound Synthesizer
 * 
 * Generates real-time procedural aero-piston engine audio directly in the browser
 * using the Web Audio API, inspired by Ange Yaghi's Engine Simulator (realenginesimulator.com).
 * 
 * Synthesizes:
 * - Fundamental cylinder firing pulse frequency: f_0 = (RPM / 60) / 2
 * - Rich harmonic overtones corresponding to mechanical rotation & cylinder head resonance
 * - Throttle intake roar & turbulent exhaust gas pulse noise
 * - Crankcase low-frequency rumble
 */

export class EngineAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = false;
  private volume: number = 0.25;

  // Audio Nodes
  private masterGain: GainNode | null = null;
  private firingOsc: OscillatorNode | null = null;
  private firingGain: GainNode | null = null;
  private subRumbleOsc: OscillatorNode | null = null;
  private subRumbleGain: GainNode | null = null;
  private mechanicalOsc: OscillatorNode | null = null;
  private mechanicalGain: GainNode | null = null;
  private exhaustNoiseGain: GainNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;

  private isInitialized: boolean = false;

  private initAudio() {
    if (this.isInitialized && this.ctx) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.ctx = new AudioCtxClass();
      const ctx = this.ctx;

      // Master output gain
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(0, ctx.currentTime);
      this.masterGain.connect(ctx.destination);

      // 1. Primary Firing Pulse Oscillator (Sawtooth waveform for sharp combustion pulses)
      this.firingOsc = ctx.createOscillator();
      this.firingOsc.type = 'sawtooth';
      this.firingGain = ctx.createGain();
      this.firingGain.gain.setValueAtTime(0.3, ctx.currentTime);
      this.firingOsc.connect(this.firingGain);
      this.firingGain.connect(this.masterGain);

      // 2. Sub-harmonic Crankcase Rumble (Sine wave)
      this.subRumbleOsc = ctx.createOscillator();
      this.subRumbleOsc.type = 'sine';
      this.subRumbleGain = ctx.createGain();
      this.subRumbleGain.gain.setValueAtTime(0.4, ctx.currentTime);
      this.subRumbleOsc.connect(this.subRumbleGain);
      this.subRumbleGain.connect(this.masterGain);

      // 3. Mechanical Valve-train & Gear Whine (Triangle wave, 2x firing rate)
      this.mechanicalOsc = ctx.createOscillator();
      this.mechanicalOsc.type = 'triangle';
      this.mechanicalGain = ctx.createGain();
      this.mechanicalGain.gain.setValueAtTime(0.15, ctx.currentTime);
      this.mechanicalOsc.connect(this.mechanicalGain);
      this.mechanicalGain.connect(this.masterGain);

      // 4. Exhaust Turbulent Flow Noise (Pink/White noise with bandpass)
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }

      this.noiseFilter = ctx.createBiquadFilter();
      this.noiseFilter.type = 'bandpass';
      this.noiseFilter.Q.value = 2.0;

      this.exhaustNoiseGain = ctx.createGain();
      this.exhaustNoiseGain.gain.setValueAtTime(0.1, ctx.currentTime);

      this.noiseNode = ctx.createBufferSource();
      this.noiseNode.buffer = noiseBuffer;
      this.noiseNode.loop = true;
      this.noiseNode.connect(this.noiseFilter);
      this.noiseFilter.connect(this.exhaustNoiseGain);
      this.exhaustNoiseGain.connect(this.masterGain);

      // Start all sound generators
      this.firingOsc.start();
      this.subRumbleOsc.start();
      this.mechanicalOsc.start();
      this.noiseNode.start();

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio initialization error:', e);
    }
  }

  public enable() {
    if (!this.isInitialized) {
      this.initAudio();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isEnabled = true;
    this.applyVolume();
  }

  public disable() {
    this.isEnabled = false;
    this.applyVolume();
  }

  public toggle(): boolean {
    if (this.isEnabled) {
      this.disable();
    } else {
      this.enable();
    }
    return this.isEnabled;
  }

  public setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    this.applyVolume();
  }

  public getVolume(): number {
    return this.volume;
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  private applyVolume() {
    if (!this.masterGain || !this.ctx) return;
    const targetGain = this.isEnabled ? this.volume : 0;
    this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
  }

  /**
   * Updates acoustic frequency and harmonics based on live engine telemetry
   */
  public update(rpm: number, throttle_pct: number, isRunning: boolean) {
    if (!this.ctx || !this.isInitialized) return;

    if (!isRunning || rpm < 200) {
      if (this.masterGain) {
        this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
      return;
    }

    if (this.isEnabled && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }

    // Single cylinder 4-stroke fires once every 2 revolutions
    const baseFiringFreq = (rpm / 60) / 2;
    const loadFactor = Math.max(0.2, throttle_pct / 100);

    const now = this.ctx.currentTime;

    // 1. Primary firing frequency
    if (this.firingOsc) {
      this.firingOsc.frequency.setTargetAtTime(Math.max(10, baseFiringFreq * 2), now, 0.05);
    }
    if (this.firingGain) {
      this.firingGain.gain.setTargetAtTime(0.25 + 0.35 * loadFactor, now, 0.05);
    }

    // 2. Sub-harmonic crankcase thump
    if (this.subRumbleOsc) {
      this.subRumbleOsc.frequency.setTargetAtTime(Math.max(10, baseFiringFreq), now, 0.05);
    }
    if (this.subRumbleGain) {
      this.subRumbleGain.gain.setTargetAtTime(0.3 + 0.2 * loadFactor, now, 0.05);
    }

    // 3. Mechanical higher harmonics (crank/valve frequency)
    if (this.mechanicalOsc) {
      this.mechanicalOsc.frequency.setTargetAtTime(Math.max(20, baseFiringFreq * 4), now, 0.05);
    }

    // 4. Exhaust roar bandpass tracking
    if (this.noiseFilter && this.exhaustNoiseGain) {
      const centerFreq = 150 + baseFiringFreq * 12 + loadFactor * 300;
      this.noiseFilter.frequency.setTargetAtTime(centerFreq, now, 0.05);
      this.exhaustNoiseGain.gain.setTargetAtTime(0.08 + 0.25 * loadFactor, now, 0.05);
    }
  }

  public dispose() {
    try {
      if (this.ctx) {
        this.ctx.close();
      }
    } catch (e) {
      // ignore
    }
    this.ctx = null;
    this.isInitialized = false;
  }
}

export const engineAudio = new EngineAudioSynthesizer();
