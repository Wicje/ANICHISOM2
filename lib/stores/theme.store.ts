import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';

export type PerformanceMode = 'light' | 'heavy';
export type ColorMode = 'light' | 'dark';

const STORAGE_KEY = 'anichisom-theme-color-mode';

type ThemeState = {
  wallpaper: string;
  themeColor: string;
  fontFamily: string;
  screenShader: string;
  performanceMode: PerformanceMode;
  colorMode: ColorMode;
  setWallpaper: (url: string) => void;
  setThemeColor: (color: string) => void;
  setFontFamily: (font: string) => void;
  setScreenShader: (shader: string) => void;
  setPerformanceMode: (mode: PerformanceMode) => void;
  setColorMode: (mode: ColorMode) => void;
  hydrateColorMode: () => Promise<void>;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  wallpaper: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
  themeColor: '#0058bc',
  fontFamily: 'system-ui, sans-serif',
  screenShader: 'none',
  performanceMode: 'heavy',
  colorMode: 'light',

  setWallpaper: (wallpaper) => set({ wallpaper }),
  setThemeColor: (themeColor) => set({ themeColor }),
  setFontFamily: (fontFamily) => set({ fontFamily }),
  setScreenShader: (screenShader) => set({ screenShader }),
  setPerformanceMode: (performanceMode) => set({ performanceMode }),

  setColorMode: (colorMode) => {
    set({ colorMode });
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', colorMode === 'dark');
    }
    idbSet(STORAGE_KEY, colorMode).catch(() => {});
  },

  hydrateColorMode: async () => {
    try {
      const saved = await idbGet<ColorMode>(STORAGE_KEY);
      if (saved && (saved === 'light' || saved === 'dark')) {
        set({ colorMode: saved });
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', saved === 'dark');
        }
      }
    } catch {}
  },
}));
