import { create } from 'zustand';

export type FocusPreset = 'deep-work' | 'filming' | 'zen' | 'custom';

interface FocusState {
  enabled: boolean;
  durationMinutes: number;
  targetEndTime: number | null;
  preset: FocusPreset;
  toggle: () => void;
  enable: (minutes?: number, preset?: FocusPreset) => void;
  disable: () => void;
  setPreset: (preset: FocusPreset) => void;
  getRemainingSeconds: () => number;
}

export const useFocusStore = create<FocusState>((set, get) => ({
  enabled: false,
  durationMinutes: 25,
  targetEndTime: null,
  preset: 'deep-work',

  setPreset: (preset: FocusPreset) => set({ preset }),

  toggle: () => {
    const currentState = get().enabled;
    if (currentState) {
      set({ enabled: false, targetEndTime: null });
    } else {
      const minutes = get().durationMinutes || 25;
      set({
        enabled: true,
        targetEndTime: Date.now() + minutes * 60 * 1000,
      });
    }
  },

  enable: (minutes = 25, preset = 'deep-work') =>
    set({
      enabled: true,
      durationMinutes: minutes,
      preset,
      targetEndTime: Date.now() + minutes * 60 * 1000,
    }),

  disable: () => set({ enabled: false, targetEndTime: null }),

  getRemainingSeconds: () => {
    const { enabled, targetEndTime } = get();
    if (!enabled || !targetEndTime) return 0;
    const diff = Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000));
    return diff;
  },
}));
