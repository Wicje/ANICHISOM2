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
  dynamicWallpaper: boolean;
  showNotch: boolean;
  wifiEnabled: boolean;
  bluetoothEnabled: boolean;
  airDropEnabled: boolean;
  brightness: number;
  nightShift: boolean;
  nightShiftTemperature: number;
  setWallpaper: (url: string) => void;
  setThemeColor: (color: string) => void;
  setFontFamily: (font: string) => void;
  setScreenShader: (shader: string) => void;
  setPerformanceMode: (mode: PerformanceMode) => void;
  setColorMode: (mode: ColorMode) => void;
  setVolume: (vol: number) => void;
  setMuted: (muted: boolean) => void;
  setBrightness: (brightness: number) => void;
  setNightShift: (enabled: boolean) => void;
  setNightShiftTemperature: (temp: number) => void;
  setWifiEnabled: (enabled: boolean) => void;
  setBluetoothEnabled: (enabled: boolean) => void;
  setAirDropEnabled: (enabled: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setGlassmorphism: (enabled: boolean) => void;
  setAeroSnap: (enabled: boolean) => void;
  setAmbientSound: (preset: AmbientPreset) => void;
  setDynamicWallpaper: (enabled: boolean) => void;
  setShowNotch: (show: boolean) => void;
  toggleNotch: () => void;
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
  brightness: 100,
  nightShift: false,
  nightShiftTemperature: 50,
  animationsEnabled: true,
  glassmorphism: true,
  aeroSnap: true,
  ambientSound: 'off' as AmbientPreset,
  dynamicWallpaper: true,
  showNotch: true,
  wifiEnabled: true,
  bluetoothEnabled: true,
  airDropEnabled: true,
};

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastPersistedJson: string | null = null;

function writeThemeDomain(data: Record<string, unknown>) {
  const json = JSON.stringify(data);
  if (json === lastPersistedJson) return;
  lastPersistedJson = json;
  void writeDomain(DOMAIN, data);
}

function serializeTheme(state: ThemeState): Record<string, unknown> {
  const { setWallpaper, setThemeColor, setFontFamily, setScreenShader, setPerformanceMode, setColorMode, setVolume, setMuted, setAnimationsEnabled, setGlassmorphism, setAeroSnap, setAmbientSound, setDynamicWallpaper, setWifiEnabled, setBluetoothEnabled, setAirDropEnabled, hydrateAll, ...data } = state as any;
  return data;
}

function persistTheme(state: ThemeState) {
  if (typeof window === 'undefined') return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    writeThemeDomain(serializeTheme(state));
  }, 300);
}

// Flush any pending theme write before the page unloads so a quick reload
// doesn't lose the last change (e.g. wallpaper).
if (typeof window !== 'undefined') {
  const flushTheme = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    writeThemeDomain(serializeTheme(useThemeStore.getState()));
  };
  window.addEventListener('pagehide', flushTheme);
  window.addEventListener('beforeunload', flushTheme);
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
  setBrightness: (brightness) => {
    set({ brightness });
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--os-brightness', `${brightness}%`);
    }
    persistTheme({ ...get(), brightness });
  },
  setNightShift: (nightShift) => {
    set({ nightShift });
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('night-shift-active', nightShift);
    }
    persistTheme({ ...get(), nightShift });
  },
  setNightShiftTemperature: (nightShiftTemperature) => {
    set({ nightShiftTemperature });
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--os-night-shift-temp', `${nightShiftTemperature}`);
    }
    persistTheme({ ...get(), nightShiftTemperature });
  },
  setAnimationsEnabled: (animationsEnabled) => { set({ animationsEnabled }); persistTheme({ ...get(), animationsEnabled }); },
  setGlassmorphism: (glassmorphism) => { set({ glassmorphism }); persistTheme({ ...get(), glassmorphism }); },
  setAeroSnap: (aeroSnap) => { set({ aeroSnap }); persistTheme({ ...get(), aeroSnap }); },
  setAmbientSound: (ambientSound) => { set({ ambientSound }); persistTheme({ ...get(), ambientSound }); },
  setDynamicWallpaper: (dynamicWallpaper) => { set({ dynamicWallpaper }); persistTheme({ ...get(), dynamicWallpaper }); },
  setShowNotch: (showNotch) => { set({ showNotch }); persistTheme({ ...get(), showNotch }); },
  toggleNotch: () => { const next = !get().showNotch; set({ showNotch: next }); persistTheme({ ...get(), showNotch: next }); },
  setWifiEnabled: (wifiEnabled) => { set({ wifiEnabled }); persistTheme({ ...get(), wifiEnabled }); },
  setBluetoothEnabled: (bluetoothEnabled) => { set({ bluetoothEnabled }); persistTheme({ ...get(), bluetoothEnabled }); },
  setAirDropEnabled: (airDropEnabled) => { set({ airDropEnabled }); persistTheme({ ...get(), airDropEnabled }); },

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
