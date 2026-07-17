'use client';

class OAudioEngine {
  private ctx: AudioContext | null = null;

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
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {}
  }

  playClick() {
    this.playTone(800, 'sine', 0.05, 0.2);
  }

  playSwoosh() {
    const vol = this.getVolume();
    if (vol === 0 || !this.ctx) return;
    try {
      const duration = 0.2;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + duration);
      
      gain.gain.setValueAtTime(vol * 0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
      
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
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(vol * 0.5, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
      
      panner.pan.value = pan;
      
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    } catch {}
  }

  playWindowOpen() {
    this.playTone(440, 'sine', 0.1, 0.15);
    setTimeout(() => this.playTone(660, 'sine', 0.1, 0.1), 50);
  }

  playWindowClose() {
    this.playTone(660, 'sine', 0.08, 0.12);
    setTimeout(() => this.playTone(440, 'sine', 0.08, 0.08), 50);
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
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(vol * 0.15, now + i * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.3);
      });
    } catch {}
  }

  playError() {
    this.playTone(200, 'sawtooth', 0.15, 0.1);
    setTimeout(() => this.playTone(150, 'sawtooth', 0.2, 0.08), 100);
  }
}

export const audioSystem = new OAudioEngine();
