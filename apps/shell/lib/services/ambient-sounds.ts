'use client';

export type AmbientPreset = 'rain' | 'cafe' | 'forest' | 'white-noise' | 'off';

const PRESETS: Record<AmbientPreset, { type: OscillatorType; freq: number; detune: number; filterFreq: number; lfoRate: number; lfoDepth: number }> = {
  rain:        { type: 'sawtooth', freq: 80,   detune: 50,  filterFreq: 400,  lfoRate: 3,   lfoDepth: 300  },
  cafe:        { type: 'triangle', freq: 120,  detune: 30,  filterFreq: 800,  lfoRate: 0.5, lfoDepth: 400  },
  forest:      { type: 'sine',     freq: 200,  detune: 70,  filterFreq: 600,  lfoRate: 2,   lfoDepth: 200  },
  'white-noise': { type: 'sawtooth', freq: 60, detune: 100, filterFreq: 2000, lfoRate: 0,   lfoDepth: 0   },
  off:         { type: 'sine',     freq: 0,    detune: 0,   filterFreq: 0,    lfoRate: 0,   lfoDepth: 0   },
};

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private nodes: { osc?: OscillatorNode; gain?: GainNode; filter?: BiquadFilterNode; lfo?: OscillatorNode; lfoGain?: GainNode } = {};
  private currentPreset: AmbientPreset = 'off';
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;

  private getVolume(): number {
    if (typeof window === 'undefined') return 0;
    try {
      const { useThemeStore } = require('@/lib/stores/theme.store');
      const state = useThemeStore.getState();
      if (state.muted) return 0;
      return state.volume / 100;
    } catch {
      return 0.5;
    }
  }

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private stopAll() {
    try {
      this.nodes.osc?.stop();
      this.nodes.lfo?.stop();
      this.noiseNode?.stop();
    } catch {}
    try {
      this.nodes.osc?.disconnect();
      this.nodes.gain?.disconnect();
      this.nodes.filter?.disconnect();
      this.nodes.lfo?.disconnect();
      this.nodes.lfoGain?.disconnect();
      this.noiseNode?.disconnect();
      this.noiseGain?.disconnect();
    } catch {}
    this.nodes = {};
    this.noiseNode = null;
    this.noiseGain = null;
  }

  play(preset: AmbientPreset) {
    if (preset === 'off' || this.currentPreset === preset) {
      this.stop();
      return;
    }

    this.stop();
    this.currentPreset = preset;
    const ctx = this.getCtx();
    const vol = this.getVolume();
    if (vol === 0) return;

    const config = PRESETS[preset];
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(vol * 0.15, ctx.currentTime);
    masterGain.connect(ctx.destination);

    if (preset === 'white-noise') {
      const buffer = this.createNoiseBuffer(ctx);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(config.filterFreq, ctx.currentTime);
      source.connect(filter);
      filter.connect(masterGain);
      source.start();
      this.noiseNode = source;
      this.noiseGain = masterGain;
      return;
    }

    const osc = ctx.createOscillator();
    osc.type = config.type;
    osc.frequency.setValueAtTime(config.freq, ctx.currentTime);
    osc.detune.setValueAtTime(config.detune, ctx.currentTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(config.filterFreq, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    if (config.lfoRate > 0) {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(config.lfoRate, ctx.currentTime);
      lfoGain.gain.setValueAtTime(config.lfoDepth, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      this.nodes.lfo = lfo;
      this.nodes.lfoGain = lfoGain;
    }

    osc.start();
    this.nodes.osc = osc;
    this.nodes.gain = masterGain;
    this.nodes.filter = filter;
  }

  stop() {
    this.currentPreset = 'off';
    this.stopAll();
  }

  setVolume(vol: number) {
    const gain = this.nodes.gain || this.noiseGain;
    if (gain) {
      gain.gain.setValueAtTime(vol * 0.15, this.ctx?.currentTime || 0);
    }
  }

  getCurrent(): AmbientPreset {
    return this.currentPreset;
  }
}

export const ambientSounds = new AmbientSoundEngine();
