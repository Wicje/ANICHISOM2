import { create } from 'zustand';
import { mark, measure } from '@/lib/perf';
import { readDomain, writeDomain } from '@/lib/context-layer';

const WINDOWS_DOMAIN = 'windows';

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let lastPendingState: { windows: OSWindow[]; highestZIndex: number } | null = null;

function flushPersistWindows(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (lastPendingState) {
    writeDomain(WINDOWS_DOMAIN, {
      windows: lastPendingState.windows,
      highestZIndex: lastPendingState.highestZIndex,
    }).catch(() => {});
  }
}

function persistWindows(state: WindowState, immediate = false): void {
  lastPendingState = {
    windows: state.windows,
    highestZIndex: state.highestZIndex,
  };
  if (immediate) {
    flushPersistWindows();
    return;
  }
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    flushPersistWindows();
  }, 1000);
}

// Ensure pending window state changes are never lost when browser closes or tabs switch
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushPersistWindows);
  window.addEventListener('pagehide', flushPersistWindows);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushPersistWindows();
    }
  });
}

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
  data?: any;
  workspace?: number;
};

type WindowState = {
  windows: OSWindow[];
  highestZIndex: number;
  hydrate: () => Promise<void>;
  openWindow: (appId: string, title?: string, data?: any, activeWorkspace?: number) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  updateWindowDimensions: (id: string, x: number, y: number, width: number, height: number) => void;
  updateWindowData: (id: string, data: any) => void;
  setWindows: (windows: OSWindow[]) => void;
  loadProject: (projectId: string, activeWorkspace?: number) => void;
  applyWorkspaceLayout: (layout: 'creative-split', activeWorkspace?: number) => void;
};

const DEFAULT_TITLES: Record<string, string> = {
  'terminal': 'Terminal',
  'browser': 'Power Browser',
  'files': 'File Manager',
  'moodboard': 'Moodboard',
  'code': 'Code Editor',
  'campaign': 'Campaign Lab',
  'hardware-manager': 'Hardware & Peripheral Subsystem',
  'virtual-display-manager': 'Multi-Monitor Display Manager',
  'app-store': 'ContinuaOS App Store',
};

import { useWorkspaceStore } from '@/lib/stores/workspace.store';

const SINGLE_INSTANCE_APPS = ['terminal', 'files', 'settings', 'store', 'campaign', 'admin', 'moodboard', 'image-viewer', 'browser', 'hardware-manager', 'virtual-display-manager', 'app-store'];

export const useWindowStore = create<WindowState>((set, get) => ({
  windows: [],
  highestZIndex: 10,

  hydrate: async () => {
    mark('window:hydrate');
    try {
      const data = await readDomain<{ windows?: OSWindow[]; highestZIndex?: number }>(WINDOWS_DOMAIN);
      if (data?.windows?.length) {
        const highest = Math.max(data.highestZIndex || 10, ...data.windows.map((w) => w.zIndex || 10));
        set({ windows: data.windows, highestZIndex: highest });
      }
    } catch (e) {
      console.warn('[WindowStore] Failed to hydrate:', e);
    }
    measure('window:hydrate');
  },

  openWindow: (appId, title, data, activeWorkspace) => {
    mark('window:open');
    const { windows, highestZIndex } = get();
    const currentWorkspace = activeWorkspace ?? (useWorkspaceStore.getState ? useWorkspaceStore.getState().activeWorkspace : 0);

    const newId = `${appId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const windowTitle = title || DEFAULT_TITLES[appId] || 'App';
    const nextZ = highestZIndex + 1;

    // Prevent duplicate instances for single-instance apps
    const existing = SINGLE_INSTANCE_APPS.includes(appId)
      ? windows.find((w) => w.appId === appId && (w.workspace ?? 0) === currentWorkspace)
      : null;

    if (existing) {
      set({
        highestZIndex: nextZ,
        windows: windows.map((w) =>
          w.appId === appId && (w.workspace ?? 0) === currentWorkspace
            ? { ...w, zIndex: nextZ, isMinimized: false, data: data ? { ...w.data, ...data } : w.data }
            : w
        ),
      });
      persistWindows(get());
      return;
    }

    const offset = (windows.length % 5) * 40;
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
      workspace: currentWorkspace,
    };

    set({ highestZIndex: nextZ, windows: [...windows, newWindow] });
    persistWindows(get());
    measure('window:open');
  },

  closeWindow: (id) => {
    mark('window:close');
    set((s) => ({ windows: s.windows.filter((w) => w.id !== id) }));
    persistWindows(get());
    measure('window:close');
  },

  focusWindow: (id) => {
    mark('window:focus');
    const { windows, highestZIndex } = get();
    const nextZ = highestZIndex + 1;
    set({
      highestZIndex: nextZ,
      windows: windows.map((w) =>
        w.id === id ? { ...w, zIndex: nextZ, isMinimized: false } : w
      ),
    });
    persistWindows(get());
    measure('window:focus');
  },

  minimizeWindow: (id) => {
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, isMinimized: true } : w)),
    }));
    persistWindows(get());
  },

  maximizeWindow: (id) => {
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, isMaximized: !w.isMaximized } : w
      ),
    }));
    persistWindows(get());
  },

  updateWindowDimensions: (id, x, y, width, height) => {
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, x, y, width, height } : w)),
    }));
    persistWindows(get());
  },

  updateWindowData: (id, data) => {
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, data: { ...w.data, ...data } } : w
      ),
    }));
    persistWindows(get());
  },

  setWindows: (windows) => {
    const highest = Math.max(10, ...windows.map((w) => w.zIndex || 10));
    set({ windows, highestZIndex: highest });
    persistWindows(get());
  },

  loadProject: (projectId, activeWorkspace = 0) => {
    const { highestZIndex } = get();
    const w = window.innerWidth;
    const h = window.innerHeight;
    const padding = 40;
    const topSpace = 30;
    const gap = 10;
    const halfW = (w - padding * 2 - gap) / 2;
    const termH = Math.min(300, h * 0.3);
    const topH = h - topSpace - padding - padding - termH - gap;

    let nextZ = highestZIndex;
    const newWindows: OSWindow[] = [
      {
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
        workspace: activeWorkspace,
      },
      {
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
        workspace: activeWorkspace,
      },
      {
        id: `moodboard-${Date.now()}-3`,
        appId: 'moodboard',
        title: `${projectId} - Moodboard`,
        isMinimized: true,
        isMaximized: false,
        zIndex: ++nextZ,
        width: 800,
        height: 600,
        x: 100,
        y: 100,
        data: { projectId },
        workspace: activeWorkspace,
      },
      {
        id: `terminal-${Date.now()}-4`,
        appId: 'terminal',
        title: `Terminal`,
        isMinimized: false,
        isMaximized: false,
        zIndex: ++nextZ,
        width: w - padding * 2,
        height: termH,
        x: padding,
        y: topSpace + padding + topH + gap,
        data: { projectId },
        workspace: activeWorkspace,
      },
    ];

    set({ windows: newWindows, highestZIndex: nextZ });
  },

  applyWorkspaceLayout: (layout, activeWorkspace = 0) => {
    if (layout === 'creative-split') {
      const { windows, highestZIndex } = get();
      const padding = 40;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const topSpace = 30;
      const gap = 10;
      const halfW = (w - padding * 2 - gap) / 2;
      const termH = Math.min(300, h * 0.3);
      const topH = h - topSpace - padding - padding - termH - gap;

      let nextZ = highestZIndex;
      const layoutApps = ['moodboard', 'code', 'terminal'];
      let newWindows = [...windows];

      layoutApps.forEach((appId) => {
        if (!newWindows.find((w) => w.appId === appId)) {
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
            workspace: activeWorkspace,
          });
        }
      });

      newWindows = newWindows.map((win) => {
        if (win.appId === 'moodboard') {
          return { ...win, x: padding, y: topSpace + padding, width: halfW, height: topH, isMaximized: false, isMinimized: false, zIndex: ++nextZ };
        }
        if (win.appId === 'code') {
          return { ...win, x: padding + halfW + gap, y: topSpace + padding, width: halfW, height: topH, isMaximized: false, isMinimized: false, zIndex: ++nextZ };
        }
        if (win.appId === 'terminal') {
          return { ...win, x: padding, y: topSpace + padding + topH + gap, width: w - padding * 2, height: termH, isMaximized: false, isMinimized: false, zIndex: ++nextZ };
        }
        return win;
      });

      set({ windows: newWindows, highestZIndex: nextZ });
    }
  },
}));
