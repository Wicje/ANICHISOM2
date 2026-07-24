import { create } from 'zustand';
import { mark, measure } from '@/lib/perf';

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
};

const SINGLE_INSTANCE_APPS = ['terminal', 'files', 'settings', 'store', 'campaign', 'admin', 'moodboard', 'image-viewer', 'browser'];

export const useWindowStore = create<WindowState>((set, get) => ({
  windows: [],
  highestZIndex: 10,

  openWindow: (appId, title, data, activeWorkspace = 0) => {
    mark('window:open');
    const { windows, highestZIndex } = get();

    const newId = `${appId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const windowTitle = title || DEFAULT_TITLES[appId] || 'App';
    const nextZ = highestZIndex + 1;

    // Prevent duplicate instances for single-instance apps
    const existing = SINGLE_INSTANCE_APPS.includes(appId)
      ? windows.find((w) => w.appId === appId && w.workspace === activeWorkspace)
      : null;

    if (existing) {
      set({
        highestZIndex: nextZ,
        windows: windows.map((w) =>
          w.appId === appId && w.workspace === activeWorkspace
            ? { ...w, zIndex: nextZ, isMinimized: false, data: data ? { ...w.data, ...data } : w.data }
            : w
        ),
      });
      if (appId === 'moodboard' && (data?.url || data?.image)) {
        window.dispatchEvent(new CustomEvent('os:clip-to-moodboard', {
          detail: { url: data.url, image: data.image, title: title || 'Imported File' },
        }));
      }
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
      workspace: activeWorkspace,
    };

    set({ highestZIndex: nextZ, windows: [...windows, newWindow] });
    measure('window:open');
  },

  closeWindow: (id) => {
    mark('window:close');
    set((s) => ({ windows: s.windows.filter((w) => w.id !== id) }));
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
    measure('window:focus');
  },

  minimizeWindow: (id) => {
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, isMinimized: true } : w)),
    }));
  },

  maximizeWindow: (id) => {
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, isMaximized: !w.isMaximized } : w
      ),
    }));
  },

  updateWindowDimensions: (id, x, y, width, height) => {
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, x, y, width, height } : w)),
    }));
  },

  updateWindowData: (id, data) => {
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, data: { ...w.data, ...data } } : w
      ),
    }));
  },

  setWindows: (windows) => {
    const highest = Math.max(10, ...windows.map((w) => w.zIndex || 10));
    set({ windows, highestZIndex: highest });
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
