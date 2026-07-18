import { get as idbGet, set as idbSet, del as idbDel, clear as idbClear } from 'idb-keyval';
import { useWindowStore, OSWindow } from '@/lib/stores/window.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';

const DESKTOP_KEY = 'continuaos_os_desktop';

type PersistedDesktop = {
  windows: OSWindow[];
  workspaceMode: string;
  installedApps: string[];
  recentApps: string[];
  wallpaper: string;
  themeColor: string;
  fontFamily: string;
  screenShader: string;
  lastUpdated?: number;
};

/**
 * Storage service — handles IndexedDB persistence and server sync.
 * Decoupled from React lifecycle for use in services and middleware.
 */
export const StorageService = {
  async persistDesktop(): Promise<void> {
    const windowState = useWindowStore.getState();
    const themeState = useThemeStore.getState();
    const workspaceState = useWorkspaceStore.getState();

    const data: PersistedDesktop = {
      windows: windowState.windows,
      workspaceMode: workspaceState.workspaceMode,
      installedApps: workspaceState.installedApps,
      recentApps: workspaceState.recentApps,
      wallpaper: themeState.wallpaper,
      themeColor: themeState.themeColor,
      fontFamily: themeState.fontFamily,
      screenShader: themeState.screenShader,
      lastUpdated: Date.now(),
    };

    await idbSet(DESKTOP_KEY, data);

    // Async server sync (fire and forget)
    try {
      await fetch('/api/workspaces/sync', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ desktopState: data }),
      });
    } catch {
      // Silently fail if offline
    }
  },

  async loadDesktop(): Promise<PersistedDesktop | null> {
    const data = await idbGet(DESKTOP_KEY);
    return data || null;
  },

  async hydrateStores(): Promise<boolean> {
    const data = await idbGet(DESKTOP_KEY);
    if (!data || !data.windows) return false;

    const windowStore = useWindowStore.getState();
    const themeStore = useThemeStore.getState();
    const workspaceStore = useWorkspaceStore.getState();

    windowStore.setWindows(data.windows);
    if (data.workspaceMode) workspaceStore.setWorkspaceMode(data.workspaceMode as any);
    if (data.installedApps) workspaceStore.installedApps = data.installedApps;
    if (data.recentApps) workspaceStore.recentApps = data.recentApps;
    if (data.wallpaper) themeStore.setWallpaper(data.wallpaper);
    if (data.themeColor) themeStore.setThemeColor(data.themeColor);
    if (data.fontFamily) themeStore.setFontFamily(data.fontFamily);
    if (data.screenShader) themeStore.setScreenShader(data.screenShader);

    return true;
  },
};
