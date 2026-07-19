/**
 * Theme Zustand Store — appearance settings.
 *
 * All persistence through Context Layer (readDomain/writeDomain).
 */
import { create } from 'zustand';
import { readDomain, writeDomain } from '@/lib/context-layer';
import type { AmbientPreset } from '@/lib/services/ambient-sounds';

export type PerformanceMode = 'light' | 'heavy';
export type ColorMode = 'light' | 'dark';

const DOMAIN = 'theme';
const LEGACY_KEY = 'continuaos-theme-settings';
const LEGACY_COLOR_KEY = 'continuaos-theme';

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

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function persistTheme(state: ThemeState) {
  if (typeof window === 'undefined') return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const { setWallpaper, setThemeColor, setFontFamily, setScreenShader, setPerformanceMode, setColorMode, setVolume, setMuted, setAnimationsEnabled, setGlassmorphism, setAeroSnap, setAmbientSound, hydrateAll, ...data } = state as any;
    writeDomain(DOMAIN, data);
  }, 2000);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  ...DEFAULTS,

  setWallpaper: (wallpaper) => { set({ wallpaper }); persistTheme({ ...get(), wallpaper }); },
  setThemeColor: (themeColor) => {
    set({ themeColor });
    if (typeof document !== 'undefined') document.documentElement.style.setProperty('--os-primary', themeColor);
    persistTheme({ ...get(), themeColor });
  },
  setFontFamily: (fontFamily) => { set({ fontFamily }); persistTheme({ ...get(), fontFamily }); },
  setScreenShader: (screenShader) => { set({ screenShader }); persistTheme({ ...get(), screenShader }); },
  setPerformanceMode: (performanceMode) => {
    set({ performanceMode });
    if (typeof document !== 'undefined') document.body.classList.toggle('performance-light', performanceMode === 'light');
    persistTheme({ ...get(), performanceMode });
  },
  setColorMode: (colorMode) => {
    set({ colorMode });
    if (typeof document !== 'undefined') document.documentElement.classList.toggle('dark', colorMode === 'dark');
    persistTheme({ ...get(), colorMode });
  },
  setVolume: (volume) => { set({ volume }); persistTheme({ ...get(), volume }); },
  setMuted: (muted) => { set({ muted }); persistTheme({ ...get(), muted }); },
  setAnimationsEnabled: (animationsEnabled) => { set({ animationsEnabled }); persistTheme({ ...get(), animationsEnabled }); },
  setGlassmorphism: (glassmorphism) => { set({ glassmorphism }); persistTheme({ ...get(), glassmorphism }); },
  setAeroSnap: (aeroSnap) => { set({ aeroSnap }); persistTheme({ ...get(), aeroSnap }); },
  setAmbientSound: (ambientSound) => { set({ ambientSound }); persistTheme({ ...get(), ambientSound }); },

  hydrateAll: async () => {
    try {
      // Try Context Layer first, fall back to legacy IDB keys
      let patch: Partial<ThemeState> = {};
      const ctxData = await readDomain<Partial<ThemeState>>(DOMAIN);
      if (ctxData && Object.keys(ctxData).length > 0) {
        patch = ctxData;
      } else {
        // Migration: read from legacy keys
        const { get: idbGet } = await import('idb-keyval');
        const [savedColorMode, savedTheme] = await Promise.all([
          idbGet<ColorMode>(LEGACY_COLOR_KEY),
          idbGet<Partial<ThemeState>>(LEGACY_KEY),
        ]);
        if (savedColorMode) patch.colorMode = savedColorMode;
        if (savedTheme) Object.assign(patch, savedTheme);
        // Migrate to Context Layer
        if (Object.keys(patch).length > 0) writeDomain(DOMAIN, patch);
      }

      if (Object.keys(patch).length > 0) set(patch as any);

      const final = get();
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', final.colorMode === 'dark');
        document.body.classList.toggle('performance-light', final.performanceMode === 'light');
        document.documentElement.style.setProperty('--os-primary', final.themeColor);
      }
    } catch {}
  },
}));
