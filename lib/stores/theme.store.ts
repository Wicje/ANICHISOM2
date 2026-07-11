import { create } from 'zustand';

export type PerformanceMode = 'light' | 'heavy';

type ThemeState = {
  wallpaper: string;
  themeColor: string;
  fontFamily: string;
  screenShader: string;
  performanceMode: PerformanceMode;
  setWallpaper: (url: string) => void;
  setThemeColor: (color: string) => void;
  setFontFamily: (font: string) => void;
  setScreenShader: (shader: string) => void;
  setPerformanceMode: (mode: PerformanceMode) => void;
};

export const useThemeStore = create<ThemeState>((set) => ({
  wallpaper: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
  themeColor: '#00f0ff',
  fontFamily: 'system-ui, sans-serif',
  screenShader: 'none',
  performanceMode: 'heavy',

  setWallpaper: (wallpaper) => set({ wallpaper }),
  setThemeColor: (themeColor) => set({ themeColor }),
  setFontFamily: (fontFamily) => set({ fontFamily }),
  setScreenShader: (screenShader) => set({ screenShader }),
  setPerformanceMode: (performanceMode) => set({ performanceMode }),
}));
