'use client';

import React, { createContext, useContext, useCallback, useEffect, useRef, useMemo } from 'react';
import { readDomain, writeDomain } from '@/lib/context-layer';
import { clear as idbClear } from 'idb-keyval';
import { syncQueue } from '@/lib/sync-queue';
import { Workspace, Event } from '@/lib/workspace-types';
import { initSessionKeyRandom, isSessionUnlocked, lockSession } from '@/lib/services/session-encryption.service';
import { useAuthStore, OSUser, OSRole } from '@/lib/stores/auth.store';
import { useWindowStore, OSWindow } from '@/lib/stores/window.store';
import { useThemeStore, PerformanceMode } from '@/lib/stores/theme.store';
import { useWorkspaceStore, WorkspaceMode, Snapshot } from '@/lib/stores/workspace.store';
import { assembleOnBoot } from '@/lib/workspace-assembly';

export type { OSWindow } from '@/lib/stores/window.store';
export type { Snapshot } from '@/lib/stores/workspace.store';
export type { PerformanceMode } from '@/lib/stores/theme.store';
export type { OSRole, OSUser } from '@/lib/stores/auth.store';
export type { WorkspaceMode } from '@/lib/stores/workspace.store';

type OSContextType = {
  currentUser: OSUser | null;
  setCurrentUser: (user: OSUser | null) => void;
  logout: () => Promise<void>;
  windows: OSWindow[];
  snapshots: Snapshot[];
  performanceMode: PerformanceMode;
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  activeWorkspace: number;
  setActiveWorkspace: (id: number) => void;
  setPerformanceMode: (mode: PerformanceMode) => void;
  installedApps: string[];
  recentApps: string[];
  installApp: (appId: string) => Promise<void>;
  uninstallApp: (appId: string) => Promise<void>;
  openWindow: (appId: string, title?: string, data?: any) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  updateWindowDimensions: (id: string, x: number, y: number, width: number, height: number) => void;
  updateWindowData: (id: string, data: any) => void;
  applyWorkspaceLayout: (layout: 'creative-split') => void;
  loadProject: (projectId: string) => void;
  saveSnapshot: (name: string) => void;
  restoreSnapshot: (id: string) => void;
  wipeSession: () => Promise<void>;
  workspaceId: string;
  setWorkspaceId: (id: string) => void;
  workspaces: Workspace[];
  setWorkspaces: (ws: Workspace[]) => void;
  mode: 'create' | 'review' | 'present';
  setMode: (mode: 'create' | 'review' | 'present') => void;
  emitEvent: (event: Omit<Event, 'id' | 'timestamp'>) => void;
  wallpaper: string;
  setWallpaper: (url: string) => void;
  themeColor: string;
  setThemeColor: (color: string) => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  screenShader: string;
  setScreenShader: (shader: string) => void;
  notify: (title: string, options?: NotificationOptions) => void;
};

const OSContext = createContext<OSContextType | undefined>(undefined);

export function OSProvider({ children }: { children: React.ReactNode }) {
  const isHydratedRef = useRef(false);

  // ─── Subscribe to Zustand stores ──────────────────────────────────
  const currentUser = useAuthStore((s) => s.currentUser);
  const authSetCurrentUser = useAuthStore((s) => s.setCurrentUser);
  const authLogout = useAuthStore((s) => s.logout);
  const authWipeSession = useAuthStore((s) => s.wipeSession);
  const authCheckSession = useAuthStore((s) => s.checkSession);

  const windows = useWindowStore((s) => s.windows);
  const windowOpenWindow = useWindowStore((s) => s.openWindow);
  const windowCloseWindow = useWindowStore((s) => s.closeWindow);
  const windowFocusWindow = useWindowStore((s) => s.focusWindow);
  const windowMinimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const windowMaximizeWindow = useWindowStore((s) => s.maximizeWindow);
  const windowUpdateDimensions = useWindowStore((s) => s.updateWindowDimensions);
  const windowUpdateData = useWindowStore((s) => s.updateWindowData);
  const windowSetWindows = useWindowStore((s) => s.setWindows);
  const windowLoadProject = useWindowStore((s) => s.loadProject);
  const windowApplyLayout = useWindowStore((s) => s.applyWorkspaceLayout);

  const wallpaper = useThemeStore((s) => s.wallpaper);
  const themeColor = useThemeStore((s) => s.themeColor);
  const fontFamily = useThemeStore((s) => s.fontFamily);
  const screenShader = useThemeStore((s) => s.screenShader);
  const performanceMode = useThemeStore((s) => s.performanceMode);
  const themeSetWallpaper = useThemeStore((s) => s.setWallpaper);
  const themeSetThemeColor = useThemeStore((s) => s.setThemeColor);
  const themeSetFontFamily = useThemeStore((s) => s.setFontFamily);
  const themeSetScreenShader = useThemeStore((s) => s.setScreenShader);
  const themeSetPerformanceMode = useThemeStore((s) => s.setPerformanceMode);

  const workspaceMode = useWorkspaceStore((s) => s.workspaceMode);
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const installedApps = useWorkspaceStore((s) => s.installedApps);
  const recentApps = useWorkspaceStore((s) => s.recentApps);
  const snapshots = useWorkspaceStore((s) => s.snapshots);
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const mode = useWorkspaceStore((s) => s.mode);
  const wsSetWorkspaceMode = useWorkspaceStore((s) => s.setWorkspaceMode);
  const wsSetActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const wsInstallApp = useWorkspaceStore((s) => s.installApp);
  const wsUninstallApp = useWorkspaceStore((s) => s.uninstallApp);
  const wsSaveSnapshot = useWorkspaceStore((s) => s.saveSnapshot);
  const wsRestoreSnapshot = useWorkspaceStore((s) => s.restoreSnapshot);
  const wsSetWorkspaceId = useWorkspaceStore((s) => s.setWorkspaceId);
  const wsSetWorkspaces = useWorkspaceStore((s) => s.setWorkspaces);
  const wsSetMode = useWorkspaceStore((s) => s.setMode);
  const wsEmitEvent = useWorkspaceStore((s) => s.emitEvent);
  const wsLoadPersisted = useWorkspaceStore((s) => s.loadPersisted);
  const wsAddRecentApp = useWorkspaceStore((s) => s.addRecentApp);

  // ─── Session check & hydration on user change ────────────────────
  const prevUserRef = useRef<string | null>(null);

  useEffect(() => {
    wsLoadPersisted();

    const currentUserId = currentUser?.id || null;
    if (prevUserRef.current !== currentUserId) {
      isHydratedRef.current = false;
      prevUserRef.current = currentUserId;
    }

    const hydrateDesktopState = async () => {
      if (!isHydratedRef.current) {
        const localData = await readDomain<{ windows?: any[]; workspaceMode?: string; installedApps?: string[]; recentApps?: string[]; wallpaper?: string; themeColor?: string; fontFamily?: string; screenShader?: string }>('desktop');
        if (localData && localData.windows) {
          windowSetWindows(localData.windows);
          if (localData.workspaceMode) wsSetWorkspaceMode(localData.workspaceMode as any);
          if (localData.installedApps) {
            localData.installedApps.forEach((id: string) => wsInstallApp(id));
          }
          if ((localData as any).customWebApps) {
            useWorkspaceStore.setState({ customWebApps: (localData as any).customWebApps });
          }
          if (localData.recentApps) {
            useWorkspaceStore.setState({ recentApps: localData.recentApps });
          }
          if (localData.wallpaper) themeSetWallpaper(localData.wallpaper);
          if (localData.themeColor) themeSetThemeColor(localData.themeColor);
          if (localData.fontFamily) themeSetFontFamily(localData.fontFamily);
          if (localData.screenShader) themeSetScreenShader(localData.screenShader);
        }
        isHydratedRef.current = true;
      }

      // Initialize session encryption
      if (currentUser && !isSessionUnlocked()) {
        try {
          await initSessionKeyRandom();
        } catch (e) {
          console.warn('[OSContext] Failed to init session encryption:', e);
        }
      }

      // Phase H: derive the workspace from the caller's current org seat
      // (onboarding-as-consequence). Silent no-op without memberships.
      if (currentUser) {
        assembleOnBoot().catch(() => {});
      }
    };

    hydrateDesktopState();
  }, [currentUser]);

  // ─── Desktop state persistence (throttled + sync unload mirror) ───

  useEffect(() => {
    if (!isHydratedRef.current) return;

    const flushSync = () => {
      const payload = {
        windows,
        workspaceMode,
        installedApps,
        recentApps,
        wallpaper,
        themeColor,
        fontFamily,
        screenShader,
      };
      try {
        localStorage.setItem('continuaos_desktop_sync', JSON.stringify(payload));
      } catch {}
      writeDomain('desktop', payload).catch(() => {});
    };

    window.addEventListener('beforeunload', flushSync);
    
    const t = setTimeout(async () => {
      try {
        await writeDomain('desktop', {
          windows,
          workspaceMode,
          installedApps,
          recentApps,
          wallpaper,
          themeColor,
          fontFamily,
          screenShader,
        });
        
        if (currentUser) {
          try {
            await fetch('/api/workspaces/sync', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                desktopState: { windows, workspaceMode, installedApps, recentApps, wallpaper, themeColor, fontFamily, screenShader, lastUpdated: Date.now() }
              }),
            });
          } catch {
            // Silently fail if offline
          }
        }
      } catch {
        // Silently fail
      }
    }, 2000);
    
    return () => {
      clearTimeout(t);
      window.removeEventListener('beforeunload', flushSync);
    };
  }, [windows, workspaceMode, installedApps, recentApps, currentUser, wallpaper, themeColor, fontFamily, screenShader]);

  // ─── Wrapper callbacks (preserving API compatibility) ──────────────

  const setCurrentUser = useCallback((user: OSUser | null) => {
    authSetCurrentUser(user);
  }, [authSetCurrentUser]);

  const logout = useCallback(async () => {
    lockSession();
    await authLogout();
    windowSetWindows([]);
  }, [authLogout, windowSetWindows]);

  const wipeSession = useCallback(async () => {
    if (!window.confirm("Are you sure you want to wipe this session? This will permanently delete all offline documents and settings.")) return;
    await idbClear();
    localStorage.clear();
    window.location.reload();
  }, []);

  const installApp = useCallback(async (appId: string) => {
    wsInstallApp(appId);
  }, [wsInstallApp]);

  const uninstallApp = useCallback(async (appId: string) => {
    wsUninstallApp(appId);
    // Also close the app if it's open
    const currentWindows = useWindowStore.getState().windows;
    currentWindows
      .filter((w) => w.appId === appId)
      .forEach((w) => windowCloseWindow(w.id));
  }, [wsUninstallApp, windowCloseWindow]);

  const saveSnapshot = useCallback((name: string) => {
    wsSaveSnapshot(name, windows);
  }, [wsSaveSnapshot, windows]);

  const restoreSnapshot = useCallback((id: string) => {
    const snap = wsRestoreSnapshot(id);
    if (snap) {
      windowSetWindows(structuredClone(snap.windows));
    }
  }, [wsRestoreSnapshot, windowSetWindows]);

  const openWindow = useCallback((appId: string, title?: string, data?: any) => {
    // Log to Memory Store
    import('@/lib/stores/memory.store').then(m => {
      m.useMemoryStore.getState().logEvent('app_open', `Opened ${appId}${title ? ` (${title})` : ''}`);
    });

    wsAddRecentApp(appId);
    windowOpenWindow(appId, title, data, activeWorkspace);
  }, [windowOpenWindow, activeWorkspace]);

  const notify = useCallback((title: string, options?: NotificationOptions) => {
    // Dispatch in-app toast
    window.dispatchEvent(new CustomEvent('os:notify', {
      detail: { title, description: options?.body, type: 'info' },
    }));

    // Also fire OS-level notification if permitted
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, { icon: '/favicon.ico', ...options });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { icon: '/favicon.ico', ...options });
        }
      });
    }
  }, []);

  const emitEvent = useCallback((eventData: Omit<Event, 'id' | 'timestamp'>) => {
    wsEmitEvent(eventData);
  }, [wsEmitEvent]);

  // ─── Context value (memoized to prevent cascading re-renders) ─────

  const value: OSContextType = useMemo(() => ({
    currentUser,
    setCurrentUser,
    logout,
    windows,
    snapshots,
    performanceMode,
    workspaceMode,
    setWorkspaceMode: wsSetWorkspaceMode,
    activeWorkspace,
    setActiveWorkspace: wsSetActiveWorkspace,
    setPerformanceMode: themeSetPerformanceMode,
    installedApps,
    recentApps,
    installApp,
    uninstallApp,
    openWindow,
    closeWindow: windowCloseWindow,
    focusWindow: windowFocusWindow,
    minimizeWindow: windowMinimizeWindow,
    maximizeWindow: windowMaximizeWindow,
    updateWindowDimensions: windowUpdateDimensions,
    updateWindowData: windowUpdateData,
    applyWorkspaceLayout: windowApplyLayout,
    loadProject: windowLoadProject,
    saveSnapshot,
    restoreSnapshot,
    wipeSession,
    workspaceId,
    setWorkspaceId: wsSetWorkspaceId,
    workspaces,
    setWorkspaces: wsSetWorkspaces,
    mode,
    setMode: wsSetMode,
    emitEvent,
    wallpaper,
    setWallpaper: themeSetWallpaper,
    themeColor,
    setThemeColor: themeSetThemeColor,
    fontFamily,
    setFontFamily: themeSetFontFamily,
    screenShader,
    setScreenShader: themeSetScreenShader,
    notify,
  }), [
    currentUser, windows, snapshots, performanceMode, workspaceMode, activeWorkspace,
    installedApps, recentApps, wallpaper, themeColor, fontFamily, screenShader,
    workspaceId, workspaces, mode,
    setCurrentUser, logout, wsSetWorkspaceMode, wsSetActiveWorkspace, themeSetPerformanceMode,
    installApp, uninstallApp, openWindow, windowCloseWindow, windowFocusWindow,
    windowMinimizeWindow, windowMaximizeWindow, windowUpdateDimensions, windowUpdateData,
    windowApplyLayout, windowLoadProject, saveSnapshot, restoreSnapshot, wipeSession,
    wsSetWorkspaceId, wsSetWorkspaces, wsSetMode, emitEvent, themeSetWallpaper,
    themeSetThemeColor, themeSetFontFamily, themeSetScreenShader, notify,
  ]);

  return <OSContext.Provider value={value}>{children}</OSContext.Provider>;
}

export function useOS() {
  const context = useContext(OSContext);
  if (!context) {
    throw new Error('useOS must be used within an OSProvider');
  }
  return context;
}

export function useAppVisibility(windowId: string) {
  const windows = useWindowStore((s) => s.windows);
  const highestZIndex = useWindowStore((s) => s.highestZIndex);
  const windowNode = windows.find(w => w.id === windowId);
  const isFocused = windowNode ? windowNode.zIndex >= highestZIndex : false;
  return {
    isVisible: windowNode ? !windowNode.isMinimized : false,
    isFocused
  };
}
