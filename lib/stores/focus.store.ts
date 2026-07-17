import { create } from 'zustand';

interface FocusState {
  enabled: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
}

export const useFocusStore = create<FocusState>((set) => ({
  enabled: false,
  toggle: () => set((s) => ({ enabled: !s.enabled })),
  enable: () => set({ enabled: true }),
  disable: () => set({ enabled: false }),
}));
