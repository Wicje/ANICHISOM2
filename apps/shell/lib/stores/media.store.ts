'use client';

import { create } from 'zustand';
import { audioSystem } from '@/lib/services/audio-engine';

export interface MediaTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl: string;
  audioUrl?: string;
  duration?: number;
  source: 'local' | 'stream' | 'spotify';
}

const DEFAULT_TRACKS: MediaTrack[] = [
  {
    id: 'track-1',
    title: 'Continua Focus Stream',
    artist: 'Terence Howard & Ziklag Lab',
    album: 'High Art Sessions',
    coverUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop',
    duration: 245,
    source: 'stream',
  },
  {
    id: 'track-2',
    title: 'Cyberpunk Neon Drift',
    artist: 'Continua Audio Lab',
    album: 'Zero Latency',
    coverUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=600&auto=format&fit=crop',
    duration: 198,
    source: 'stream',
  },
  {
    id: 'track-3',
    title: 'Deep Focus Ambient',
    artist: 'Ziklag Soundscapes',
    album: 'Atmospheres Vol. 1',
    coverUrl: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?q=80&w=600&auto=format&fit=crop',
    duration: 312,
    source: 'stream',
  },
];

interface MediaState {
  currentTrack: MediaTrack;
  queue: MediaTrack[];
  isPlaying: boolean;
  progress: number; // in seconds
  duration: number; // in seconds
  volume: number; // 0 to 1
  isMuted: boolean;
  isShuffle: boolean;
  isRepeat: boolean;

  playTrack: (track: MediaTrack) => void;
  togglePlay: () => void;
  setIsPlaying: (playing: boolean) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (progressSeconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setQueue: (queue: MediaTrack[]) => void;
  addTrackToQueue: (track: MediaTrack) => void;
}

// Global Audio Element Singleton
let globalAudio: HTMLAudioElement | null = null;

function getGlobalAudio() {
  if (typeof window === 'undefined') return null;
  if (!globalAudio) {
    globalAudio = new Audio();
    globalAudio.crossOrigin = 'anonymous';

    globalAudio.addEventListener('timeupdate', () => {
      if (globalAudio) {
        useMediaStore.setState({
          progress: globalAudio.currentTime,
          duration: globalAudio.duration || 240,
        });
      }
    });

    globalAudio.addEventListener('ended', () => {
      useMediaStore.getState().nextTrack();
    });
  }
  return globalAudio;
}

export const useMediaStore = create<MediaState>((set, get) => ({
  currentTrack: DEFAULT_TRACKS[0]!,
  queue: DEFAULT_TRACKS,
  isPlaying: false,
  progress: 0,
  duration: 245,
  volume: 0.8,
  isMuted: false,
  isShuffle: false,
  isRepeat: false,

  playTrack: (track: MediaTrack) => {
    const audio = getGlobalAudio();
    if (audio && track.audioUrl) {
      audio.src = track.audioUrl;
      audio.play().catch(() => {});
    }
    set({ currentTrack: track, isPlaying: true, progress: 0, duration: track.duration || 240 });
    window.dispatchEvent(new CustomEvent('os:spotify-track-change', {
      detail: { title: track.title, artist: track.artist, cover: track.coverUrl, isPlaying: true }
    }));
  },

  togglePlay: () => {
    const { isPlaying, currentTrack } = get();
    const nextState = !isPlaying;
    const audio = getGlobalAudio();

    if (audio && currentTrack.audioUrl) {
      if (nextState) audio.play().catch(() => {});
      else audio.pause();
    }

    set({ isPlaying: nextState });
    window.dispatchEvent(new CustomEvent('os:spotify-track-change', {
      detail: { title: currentTrack.title, artist: currentTrack.artist, cover: currentTrack.coverUrl, isPlaying: nextState }
    }));
  },

  setIsPlaying: (playing: boolean) => {
    const { currentTrack } = get();
    const audio = getGlobalAudio();
    if (audio && currentTrack.audioUrl) {
      if (playing) audio.play().catch(() => {});
      else audio.pause();
    }
    set({ isPlaying: playing });
    window.dispatchEvent(new CustomEvent('os:spotify-track-change', {
      detail: { title: currentTrack.title, artist: currentTrack.artist, cover: currentTrack.coverUrl, isPlaying: playing }
    }));
  },

  nextTrack: () => {
    const { queue, currentTrack } = get();
    if (queue.length === 0) return;
    const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % queue.length;
    const next = queue[nextIndex] || queue[0]!;
    get().playTrack(next);
  },

  prevTrack: () => {
    const { queue, currentTrack } = get();
    if (queue.length === 0) return;
    const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    const prev = queue[prevIndex] || queue[0]!;
    get().playTrack(prev);
  },

  seek: (progressSeconds: number) => {
    const audio = getGlobalAudio();
    if (audio && audio.duration) {
      audio.currentTime = progressSeconds;
    }
    set({ progress: progressSeconds });
  },

  setVolume: (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    const audio = getGlobalAudio();
    if (audio) audio.volume = clamped;
    set({ volume: clamped, isMuted: clamped === 0 });
  },

  toggleMute: () => {
    const { isMuted, volume } = get();
    const audio = getGlobalAudio();
    if (audio) audio.muted = !isMuted;
    set({ isMuted: !isMuted });
  },

  setQueue: (newQueue: MediaTrack[]) => {
    set({ queue: newQueue });
  },

  addTrackToQueue: (track: MediaTrack) => {
    set((state) => ({ queue: [...state.queue, track] }));
  },
}));
