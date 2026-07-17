import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import type { AmbientPreset } from '@/lib/services/ambient-sounds';

export type PerformanceMode = 'light' | 'heavy';
export type ColorMode = 'light' | 'dark';

const STORAGE_KEY = 'anichisom-theme';
const THEME_KEY = 'anichisom-theme-settings';

type ThemeState = {
  wallpaper: string;
  themeColor: string;
  fontFamily: string;
  screenShader: string;
  performanceMode: PerformanceMode;
  colorMode: ColorMode;
  volume: number;
  muted: boolean;
  animationsEnabled: boolean;
  glassmorphism: boolean;
  aeroSnap: boolean;
  ambientSound: AmbientPreset;
  setWallpaper: (url: string) => void;
  setThemeColor: (color: string) => void;
  setFontFamily: (font: string) => void;
  setScreenShader: (shader: string) => void;
  setPerformanceMode: (mode: PerformanceMode) => void;
  setColorMode: (mode: ColorMode) => void;
  setVolume: (vol: number) => void;
  setMuted: (muted: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setGlassmorphism: (enabled: boolean) => void;
  setAeroSnap: (enabled: boolean) => void;
  setAmbientSound: (preset: AmbientPreset) => void;
  hydrateAll: () => Promise<void>;
};

const DEFAULTS = {
  wallpaper: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
  themeColor: '#0058bc',
  fontFamily: '"ABeeZee", system-ui, sans-serif',
  screenShader: 'none',
  performanceMode: 'heavy' as PerformanceMode,
  colorMode: 'light' as ColorMode,
  volume: 80,
  muted: false,
  animationsEnabled: true,
  glassmorphism: true,
  aeroSnap: true,
  ambientSound: 'off' as AmbientPreset,
};

function persistTheme(settings: Partial<ThemeState>) {
  if (typeof window === 'undefined') return;
    const { setWallpaper, setThemeColor, setFontFamily, setScreenShader, setPerformanceMode, setColorMode, setVolume, setMuted, setAnimationsEnabled, setGlassmorphism, setAeroSnap, setAmbientSound, hydrateAll, ...rest } = settings as any;
  idbSet(THEME_KEY, rest).catch(() => {});
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  ...DEFAULTS,

  setWallpaper: (wallpaper) => {
    set({ wallpaper });
    persistTheme({ ...get(), wallpaper });
  },

  setThemeColor: (themeColor) => {
    set({ themeColor });
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--os-primary', themeColor);
    }
    persistTheme({ ...get(), themeColor });
  },

  setFontFamily: (fontFamily) => {
    set({ fontFamily });
    persistTheme({ ...get(), fontFamily });
  },

  setScreenShader: (screenShader) => {
    set({ screenShader });
    persistTheme({ ...get(), screenShader });
  },

  setPerformanceMode: (performanceMode) => {
    set({ performanceMode });
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('performance-light', performanceMode === 'light');
    }
    persistTheme({ ...get(), performanceMode });
  },

  setColorMode: (colorMode) => {
    set({ colorMode });
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', colorMode === 'dark');
    }
    idbSet(STORAGE_KEY, colorMode).catch(() => {});
    persistTheme({ ...get(), colorMode });
  },

  setVolume: (volume) => {
    set({ volume });
    persistTheme({ ...get(), volume });
  },

  setMuted: (muted) => {
    set({ muted });
    persistTheme({ ...get(), muted });
  },

  setAnimationsEnabled: (animationsEnabled) => {
    set({ animationsEnabled });
    persistTheme({ ...get(), animationsEnabled });
  },

  setGlassmorphism: (glassmorphism) => {
    set({ glassmorphism });
    persistTheme({ ...get(), glassmorphism });
  },

  setAeroSnap: (aeroSnap) => {
    set({ aeroSnap });
    persistTheme({ ...get(), aeroSnap });
  },

  setAmbientSound: (ambientSound) => {
    set({ ambientSound });
    persistTheme({ ...get(), ambientSound });
  },

  hydrateAll: async () => {
    try {
      const [savedColorMode, savedTheme] = await Promise.all([
        idbGet<ColorMode>(STORAGE_KEY),
        idbGet<Partial<ThemeState>>(THEME_KEY),
      ]);

      const patch: Partial<ThemeState> = {};

      if (savedColorMode && (savedColorMode === 'light' || savedColorMode === 'dark')) {
        patch.colorMode = savedColorMode;
      }

      if (savedTheme) {
        if (savedTheme.wallpaper) patch.wallpaper = savedTheme.wallpaper;
        if (savedTheme.themeColor) patch.themeColor = savedTheme.themeColor;
        if (savedTheme.fontFamily) patch.fontFamily = savedTheme.fontFamily;
        if (savedTheme.screenShader) patch.screenShader = savedTheme.screenShader;
        if (savedTheme.performanceMode) patch.performanceMode = savedTheme.performanceMode;
        if (typeof savedTheme.volume === 'number') patch.volume = savedTheme.volume;
        if (typeof savedTheme.muted === 'boolean') patch.muted = savedTheme.muted;
        if (typeof savedTheme.animationsEnabled === 'boolean') patch.animationsEnabled = savedTheme.animationsEnabled;
        if (typeof savedTheme.glassmorphism === 'boolean') patch.glassmorphism = savedTheme.glassmorphism;
        if (typeof savedTheme.aeroSnap === 'boolean') patch.aeroSnap = savedTheme.aeroSnap;
        if (savedTheme.ambientSound) patch.ambientSound = savedTheme.ambientSound;
      }

      if (Object.keys(patch).length > 0) {
        set(patch);
      }

      const final = get();
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', final.colorMode === 'dark');
        document.body.classList.toggle('performance-light', final.performanceMode === 'light');
        document.documentElement.style.setProperty('--os-primary', final.themeColor);
      }
    } catch {}
  },
}));
