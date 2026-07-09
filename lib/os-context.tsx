'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { get, set, clear, del } from 'idb-keyval';
import { syncQueue } from '@/lib/sync-queue';
import { Workspace, Event } from '@/lib/workspace-types';

export type OSWindow = {
  id: string;
  appId: string;
  title: string;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  width: number;
  height: number;
  x: number;
  y: number;
  data?: any; // For passing initial state or props to the app
  workspace?: number;
};

export type Snapshot = {
  id: string;
  timestamp: number;
  name: string;
  windows: OSWindow[];
};

export type PerformanceMode = 'light' | 'heavy';

export type OSRole = 'admin' | 'filmmaker' | 'technician' | 'user';

export type OSUser = {
  id: string;
  name: string;
  role: OSRole;
  avatarUrl?: string; // Add avatar support
};

export type WorkspaceMode = 'private' | 'agency';

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
  // Phase 1: Workspace extensions
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
  const [currentUser, setCurrentUser] = useState<OSUser | null>(null);
  const [windows, setWindows] = useState<OSWindow[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>('heavy');
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('private');
  const [activeWorkspace, setActiveWorkspace] = useState(0);
  const [installedApps, setInstalledApps] = useState<string[]>([]);
  const [recentApps, setRecentApps] = useState<string[]>([]);
  const highestZIndexRef = useRef(10);
  const isHydratedRef = useRef(false);
  // Phase 1: Workspace state
  const [workspaceId, setWorkspaceId] = useState<string>('personal');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [mode, setMode] = useState<'create' | 'review' | 'present'>('create');
  const [wallpaper, setWallpaper] = useState<string>('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop');
  const [themeColor, setThemeColor] = useState<string>('#00f0ff');
  const [fontFamily, setFontFamily] = useState<string>('system-ui, sans-serif');
  const [screenShader, setScreenShader] = useState<string>('none');

  useEffect(() => {
    // Load local snapshots
    get('anichisom_os_snapshots').then(data => {
      if (data) setSnapshots(data);
    });

    // Check session via API endpoint (replaces Firebase auth)
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include', // Include cookies
        });

        if (!response.ok) {
          // Session invalid or expired
          setCurrentUser(null);
          del('anichisom_os_user_cache');
          setWindows([]);
          return;
        }

        const data = await response.json();
        const osUser: OSUser = {
          id: data.user.id,
          name: data.user.uniqueId,
          role: (data.user.role as OSRole) || 'user',
        };

        setCurrentUser(osUser);
        set('anichisom_os_user_cache', osUser);

        // Load local desktop state if not hydrated
        if (!isHydratedRef.current) {
          const localData = await get('anichisom_os_desktop');
          if (localData && localData.windows) {
            setWindows(localData.windows);
            if (localData.workspaceMode) setWorkspaceMode(localData.workspaceMode);
            if (localData.installedApps) setInstalledApps(localData.installedApps);
            if (localData.recentApps) setRecentApps(localData.recentApps);
            if (localData.wallpaper) setWallpaper(localData.wallpaper);
            if (localData.themeColor) setThemeColor(localData.themeColor);
            if (localData.fontFamily) setFontFamily(localData.fontFamily);
            if (localData.screenShader) setScreenShader(localData.screenShader);
            const highest = Math.max(10, ...localData.windows.map((w: any) => w.zIndex || 10));
            highestZIndexRef.current = highest;
          }
          isHydratedRef.current = true;
        }
      } catch (error) {
        // Fallback to cached user if offline
        const cachedUser = await get('anichisom_os_user_cache');
        if (cachedUser) {
          setCurrentUser(cachedUser);
          if (!isHydratedRef.current) {
            const localData = await get('anichisom_os_desktop');
            if (localData && localData.windows) {
              setWindows(localData.windows);
              if (localData.workspaceMode) setWorkspaceMode(localData.workspaceMode);
              if (localData.installedApps) setInstalledApps(localData.installedApps);
              if (localData.recentApps) setRecentApps(localData.recentApps);
              if (localData.wallpaper) setWallpaper(localData.wallpaper);
              if (localData.themeColor) setThemeColor(localData.themeColor);
              if (localData.fontFamily) setFontFamily(localData.fontFamily);
              if (localData.screenShader) setScreenShader(localData.screenShader);
            }
            isHydratedRef.current = true;
          }
        }
      }
    };

    checkSession();

    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') void checkSession();
    };

    window.addEventListener('focus', checkSession);
    window.addEventListener('online', checkSession);
    document.addEventListener('visibilitychange', checkWhenVisible);

    return () => {
      window.removeEventListener('focus', checkSession);
      window.removeEventListener('online', checkSession);
      document.removeEventListener('visibilitychange', checkWhenVisible);
    };
  }, []);

  // Global Desktop State Serialization (Phase 4)
  useEffect(() => {
    if (!currentUser || !isHydratedRef.current) return;
    
    // Throttle save to prevent hammering DB and IndexedDB
    const t = setTimeout(async () => {
      try {
        // Save to IndexedDB (local fast path)
        await set('anichisom_os_desktop', { windows, workspaceMode, installedApps, recentApps, wallpaper, themeColor, fontFamily, screenShader });
        
        // Sync to server for Cross-Device Resumé (async)
        try {
          await fetch('/api/workspaces/sync', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              desktopState: { windows, workspaceMode, installedApps, recentApps, wallpaper, themeColor, fontFamily, screenShader, lastUpdated: Date.now() }
            }),
          });
        } catch (e) {
          // Silently fail if offline
        }
      } catch (e) {
        // Silently fail if sync not available
      }
    }, 2000);
    
    return () => clearTimeout(t);
  }, [windows, workspaceMode, installedApps, recentApps, currentUser, wallpaper, themeColor, fontFamily, screenShader]);

  const saveSnapshot = useCallback((name: string) => {
    const newSnapshot: Snapshot = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      name,
      windows: structuredClone(windows)
    };
    setSnapshots(prev => {
      const updated = [newSnapshot, ...prev];
      set('anichisom_os_snapshots', updated);
      return updated;
    });
  }, [windows]);

  const restoreSnapshot = useCallback((id: string) => {
    const snap = snapshots.find(s => s.id === id);
    if (snap) {
      setWindows(structuredClone(snap.windows));
      const highest = Math.max(10, ...snap.windows.map(w => w.zIndex));
      highestZIndexRef.current = highest;
    }
  }, [snapshots]);

  const installApp = useCallback(async (appId: string) => {
    setInstalledApps(prev => {
      const next = prev.includes(appId) ? prev : [...prev, appId];
      set('anichisom_os_desktop', { windows, workspaceMode, installedApps: next, recentApps, wallpaper, themeColor, fontFamily, screenShader });
      return next;
    });
  }, [windows, workspaceMode, recentApps, wallpaper, themeColor, fontFamily, screenShader]);

  const uninstallApp = useCallback(async (appId: string) => {
    setInstalledApps(prev => {
      const next = prev.filter(id => id !== appId);
      set('anichisom_os_desktop', { windows, workspaceMode, installedApps: next, recentApps, wallpaper, themeColor, fontFamily, screenShader });
      return next;
    });
    // Also close the app if it's open
    setWindows(curr => curr.filter(w => w.appId !== appId));
  }, [windows, workspaceMode, recentApps, wallpaper, themeColor, fontFamily, screenShader]);

  const notify = useCallback((title: string, options?: NotificationOptions) => {
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

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.error('Logout error:', e);
    }
    setCurrentUser(null);
    await del('anichisom_os_user_cache');
    setWindows([]);
  }, []);

  const wipeSession = useCallback(async () => {
    // Leave no trace - clear indexdb and local storage
    await clear();
    localStorage.clear();
    window.location.reload();
  }, []);

  const focusWindow = useCallback((id: string) => {
    highestZIndexRef.current += 1;
    const nextZ = highestZIndexRef.current;
    
    setWindows((curr) => 
      curr.map((w) => w.id === id ? { ...w, zIndex: nextZ, isMinimized: false } : w)
    );
  }, []);

  const openWindow = useCallback((appId: string, title?: string, data?: any) => {
    // Add to recent apps
    setRecentApps(prev => {
      const next = [appId, ...prev.filter(id => id !== appId)].slice(0, 5); // Keep top 5 recent
      set('anichisom_os_desktop', { windows, workspaceMode, installedApps, recentApps: next, wallpaper, themeColor, fontFamily, screenShader });
      return next;
    });

    const defaultTitles: Record<string, string> = {
      'terminal': 'Terminal',
      'browser': 'Mini Browser',
      'files': 'File Manager',
      'moodboard': 'Moodboard',
      'code': 'Code Editor',
      'campaign': 'Campaign Lab'
    };

    const newId = `${appId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const windowTitle = title || defaultTitles[appId] || 'App';
    
    highestZIndexRef.current += 1;
    const nextZ = highestZIndexRef.current;

    setWindows((curr) => {
      // Prevent duplicate instances for single-instance apps
      const singleInstanceApps = ['terminal', 'files', 'settings', 'store', 'campaign', 'admin'];
      const existing = singleInstanceApps.includes(appId) ? curr.find((w) => w.appId === appId && w.workspace === activeWorkspace) : null;
      if (existing) {
        return curr.map((w) => 
          (w.appId === appId && w.workspace === activeWorkspace)
            ? { ...w, zIndex: nextZ, isMinimized: false } 
            : w
        );
      }
      
      const offset = (curr.length % 5) * 40;
      const newWindow: OSWindow = {
        id: newId,
        appId,
        title: windowTitle,
        isMinimized: false,
        isMaximized: false,
        zIndex: nextZ,
        width: 800,
        height: 600,
        x: 100 + offset,
        y: 100 + offset,
        data,
        workspace: activeWorkspace,
      };
      
      return [...curr, newWindow];
    });
  }, [activeWorkspace, windows, workspaceMode, installedApps, wallpaper, themeColor, fontFamily, screenShader]);

  const closeWindow = useCallback((id: string) => {
    setWindows((curr) => curr.filter((w) => w.id !== id));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((curr) => curr.map((w) => w.id === id ? { ...w, isMinimized: true } : w));
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    setWindows((curr) => curr.map((w) => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w));
  }, []);

  const updateWindowDimensions = useCallback((id: string, x: number, y: number, width: number, height: number) => {
    setWindows((curr) => curr.map((w) => w.id === id ? { ...w, x, y, width, height } : w));
  }, []);

  const updateWindowData = useCallback((id: string, data: any) => {
    setWindows((curr) => curr.map((w) => w.id === id ? { ...w, data: { ...w.data, ...data } } : w));
  }, []);

  const loadProject = useCallback((projectId: string) => {
    // Determine project specific layout
    const padding = 40;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const topSpace = 30; // menubar
    const gap = 10;
    
    // Clear all windows
    setWindows([]);
    
    setTimeout(() => {
      let nextZ = highestZIndexRef.current;
      
      const newWindows: OSWindow[] = [];
      const halfW = (w - (padding * 2) - gap) / 2;
      const termH = Math.min(300, h * 0.3);
      const topH = h - topSpace - padding - padding - termH - gap;

      newWindows.push({
        id: `browser-${Date.now()}-1`,
        appId: 'browser',
        title: `${projectId} - Live Preview`,
        isMinimized: false,
        isMaximized: false,
        zIndex: ++nextZ,
        width: halfW,
        height: topH,
        x: padding,
        y: topSpace + padding,
        data: { projectId },
        workspace: activeWorkspace
      });

      newWindows.push({
        id: `code-${Date.now()}-2`,
        appId: 'code',
        title: `${projectId} - Source Code`,
        isMinimized: false,
        isMaximized: false,
        zIndex: ++nextZ,
        width: halfW,
        height: topH,
        x: padding + halfW + gap,
        y: topSpace + padding,
        data: { projectId },
        workspace: activeWorkspace
      });

      newWindows.push({
        id: `moodboard-${Date.now()}-3`,
        appId: 'moodboard',
        title: `${projectId} - Moodboard`,
        isMinimized: true, // Start minimized so they can open it from dock
        isMaximized: false,
        zIndex: ++nextZ,
        width: 800,
        height: 600,
        x: 100,
        y: 100,
        data: { projectId },
        workspace: activeWorkspace
      });

      newWindows.push({
        id: `terminal-${Date.now()}-4`,
        appId: 'terminal',
        title: `Terminal`,
        isMinimized: false,
        isMaximized: false,
        zIndex: ++nextZ,
        width: w - (padding * 2),
        height: termH,
        x: padding,
        y: topSpace + padding + topH + gap,
        data: { projectId },
        workspace: activeWorkspace
      });

      setWindows(newWindows);
      highestZIndexRef.current = nextZ;
    }, 100);
  }, [activeWorkspace]);
  // Phase 1: Emit event to sync queue
  const emitEvent = useCallback((eventData: Omit<Event, 'id' | 'timestamp'>) => {
    const event: Event = {
      ...eventData,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    syncQueue.enqueue(event);
  }, []);

  const applyWorkspaceLayout = useCallback((layout: 'creative-split') => {
    if (layout === 'creative-split') {
      const padding = 40;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const topSpace = 30; // menubar
      
      const gap = 10;
      const halfW = (w - (padding * 2) - gap) / 2;
      const termH = Math.min(300, h * 0.3);
      const topH = h - topSpace - padding - padding - termH - gap;
      
      // We will ensure moodboard, code, and terminal exist
      let nextZ = highestZIndexRef.current;

      setWindows(curr => {
        const layoutApps = ['moodboard', 'code', 'terminal'];
        
        let newWindows = [...curr];
        
        layoutApps.forEach(appId => {
           if (!newWindows.find(w => w.appId === appId)) {
             newWindows.push({
                id: `${appId}-preset`,
                appId,
                title: appId === 'code' ? 'Code Editor' : appId === 'moodboard' ? 'Moodboard' : 'Terminal',
                isMinimized: false,
                isMaximized: false,
                zIndex: ++nextZ,
                width: 400,
                height: 400,
                x: 0,
                y: 0,
                workspace: activeWorkspace
             });
           }
        });

        // Set dimensions
        return newWindows.map(win => {
          if (win.appId === 'moodboard') {
            return { ...win, x: padding, y: topSpace + padding, width: halfW, height: topH, isMaximized: false, isMinimized: false, zIndex: ++nextZ };
          }
          if (win.appId === 'code') {
            return { ...win, x: padding + halfW + gap, y: topSpace + padding, width: halfW, height: topH, isMaximized: false, isMinimized: false, zIndex: ++nextZ };
          }
          if (win.appId === 'terminal') {
            return { ...win, x: padding, y: topSpace + padding + topH + gap, width: w - (padding * 2), height: termH, isMaximized: false, isMinimized: false, zIndex: ++nextZ };
          }
          return win;
        });
      });
      highestZIndexRef.current = nextZ;
    }
  }, [activeWorkspace]);

  const value = useMemo(() => ({
    currentUser,
    setCurrentUser,
    logout,
    windows,
    snapshots,
    performanceMode,
    workspaceMode,
    activeWorkspace,
    setActiveWorkspace,
    setWorkspaceMode,
    setPerformanceMode,
    installedApps,
    recentApps,
    installApp,
    uninstallApp,
    openWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    maximizeWindow,
    updateWindowDimensions,
    updateWindowData,
    applyWorkspaceLayout,
    loadProject,
    saveSnapshot,
    restoreSnapshot,
    wipeSession,
    // Phase 1: Workspace extensions
    workspaceId,
    setWorkspaceId,
    workspaces,
    setWorkspaces,
    mode,
    setMode,
    emitEvent,
    wallpaper,
    setWallpaper,
    themeColor,
    setThemeColor,
    fontFamily,
    setFontFamily,
    screenShader,
    setScreenShader,
    notify,
  }), [currentUser, logout, windows, snapshots, performanceMode, workspaceMode, activeWorkspace, installedApps, recentApps, installApp, uninstallApp, openWindow, closeWindow, focusWindow, minimizeWindow, maximizeWindow, updateWindowDimensions, updateWindowData, applyWorkspaceLayout, loadProject, saveSnapshot, restoreSnapshot, wipeSession, workspaceId, workspaces, mode, emitEvent, wallpaper, themeColor, fontFamily, screenShader, notify]);

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
  const { windows } = useOS();
  const windowNode = windows.find(w => w.id === windowId);
  const isFocused = windowNode ? windowNode.zIndex >= Math.max(...windows.map(w => w.zIndex)) : false;
  return {
    isVisible: windowNode ? !windowNode.isMinimized : false,
    isFocused
  };
}
