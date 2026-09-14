'use client';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export type SoundEffect = 'click' | 'open' | 'close' | 'pop' | 'notify' | 'desktop';

export function playClickSound(effect: SoundEffect = 'click'): void {
  if (typeof window === 'undefined') return;

  // Respect system mute setting
  let masterVol = 0.05;
  try {
    const { useThemeStore } = require('@/lib/stores/theme.store');
    const { muted, volume } = useThemeStore.getState();
    if (muted || volume <= 0) return;
    masterVol = (volume / 100) * 0.12; // Subtle, non-intrusive volume
  } catch {
    masterVol = 0.05;
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  switch (effect) {
    case 'click':
    case 'desktop': {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.03);
      gain.gain.setValueAtTime(masterVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.start(now);
      osc.stop(now + 0.03);
      break;
    }

    case 'open': {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.06);
      gain.gain.setValueAtTime(masterVol * 0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
      break;
    }

    case 'close': {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(270, now + 0.05);
      gain.gain.setValueAtTime(masterVol * 0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
      break;
    }

    case 'pop': {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.04);
      gain.gain.setValueAtTime(masterVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
      break;
    }

    case 'notify': {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      gain.gain.setValueAtTime(masterVol * 0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    }
  }
}
