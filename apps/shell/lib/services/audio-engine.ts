'use client';

export type SoundProfile = 'glass' | 'mechanical' | 'arcade' | 'minimal';

class OAudioEngine {
  private ctx: AudioContext | null = null;
  private profile: SoundProfile = 'mechanical';

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('continuaos:sound-profile') as SoundProfile;
        if (saved && ['glass', 'mechanical', 'arcade', 'minimal'].includes(saved)) {
          this.profile = saved;
        }
      } catch {}
    }
  }

  setSoundProfile(profile: SoundProfile) {
    this.profile = profile;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('continuaos:sound-profile', profile);
      } catch {}
    }
  }

  getSoundProfile(): SoundProfile {
    return this.profile;
  }

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

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volMultiplier = 1) {
    const vol = this.getVolume();
    if (vol === 0 || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(vol * volMultiplier, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {}
  }

  /**
   * Play UI Click sound tailored to current sound profile
   */
  playClick() {
    this.init();
    const vol = this.getVolume();
    if (vol === 0 || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      if (this.profile === 'mechanical') {
        // Mechanical Switch "Thock & Click" — Dual transient pop + metallic resonance
        const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.03, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBuffer.length; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.Q.setValueAtTime(3.5, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol * 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        whiteNoise.start(now);

        // Low frequency switch bottoming-out thock
        this.playTone(180, 'triangle', 0.04, 0.25);
      } else if (this.profile === 'glass') {
        // Soft Glass Tap — High frequency sine bell decay
        this.playTone(1200, 'sine', 0.04, 0.2);
        setTimeout(() => this.playTone(2400, 'sine', 0.02, 0.08), 10);
      } else if (this.profile === 'arcade') {
        // 8-Bit Retro Blip — Quick square pitch slide
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
        gain.gain.setValueAtTime(vol * 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else {
        // Minimalist Pop — Subtle quiet sine pop
        this.playTone(600, 'sine', 0.025, 0.12);
      }
    } catch {}
  }

  /**
   * Play Keypress sound (used for keyboard typing in Terminal, Code Editor, Inputs)
   */
  playKeyPress() {
    this.init();
    const vol = this.getVolume();
    if (vol === 0 || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Slight pitch variation for realistic tactile typing feel
      const pitchVariation = (Math.random() - 0.5) * 60;

      if (this.profile === 'mechanical') {
        this.playTone(220 + pitchVariation, 'triangle', 0.035, 0.2);
      } else if (this.profile === 'glass') {
        this.playTone(1100 + pitchVariation, 'sine', 0.03, 0.12);
      } else if (this.profile === 'arcade') {
        this.playTone(350 + pitchVariation, 'square', 0.03, 0.08);
      } else {
        this.playTone(500 + pitchVariation, 'sine', 0.02, 0.08);
      }
    } catch {}
  }

  playSwoosh() {
    const vol = this.getVolume();
    if (vol === 0 || !this.ctx) return;
    try {
      const duration = 0.18;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + duration);
      
      gain.gain.setValueAtTime(vol * 0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {}
  }

  playNotification(pan: number = 0) {
    const vol = this.getVolume();
    if (vol === 0 || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.50, this.ctx.currentTime + 0.12); // C6
      
      gain.gain.setValueAtTime(vol * 0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      
      panner.pan.value = pan;
      
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch {}
  }

  playWindowOpen() {
    this.playTone(523, 'sine', 0.08, 0.15);
    setTimeout(() => this.playTone(784, 'sine', 0.08, 0.12), 45);
  }

  playWindowClose() {
    this.playTone(784, 'sine', 0.06, 0.12);
    setTimeout(() => this.playTone(523, 'sine', 0.06, 0.08), 45);
  }

  playStartup() {
    const vol = this.getVolume();
    if (vol === 0 || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0, now + i * 0.1);
        gain.gain.linearRampToValueAtTime(vol * 0.15, now + i * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.28);
      });
    } catch {}
  }

  playError() {
    this.playTone(220, 'sawtooth', 0.12, 0.1);
    setTimeout(() => this.playTone(165, 'sawtooth', 0.18, 0.08), 80);
  }

  playScreenshot() {
    this.playTone(1200, 'sine', 0.04, 0.2);
    setTimeout(() => this.playTone(800, 'sine', 0.06, 0.15), 40);
  }
}

export const audioSystem = new OAudioEngine();
