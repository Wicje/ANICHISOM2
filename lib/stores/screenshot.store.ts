import { create } from 'zustand';

interface ScreenshotState {
  active: boolean;
  start: () => void;
  cancel: () => void;
}

export const useScreenshotStore = create<ScreenshotState>((set) => ({
  active: false,
  start: () => set({ active: true }),
  cancel: () => set({ active: false }),
}));
