import { create } from 'zustand';

interface FocusState {
  enabled: boolean;
  durationMinutes: number;
  targetEndTime: number | null;
  toggle: () => void;
  enable: (minutes?: number) => void;
  disable: () => void;
  getRemainingSeconds: () => number;
}

export const useFocusStore = create<FocusState>((set, get) => ({
  enabled: false,
  durationMinutes: 25,
  targetEndTime: null,

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

  enable: (minutes = 25) =>
    set({
      enabled: true,
      durationMinutes: minutes,
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
