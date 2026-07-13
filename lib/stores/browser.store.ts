import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';

export type PinnedApp = {
  id: string;
  url: string;
  title: string;
  icon: string; // URL to favicon or emoji
  lastVisited?: number;
  lastUrl?: string; // Context memory: last URL visited under this pin
  sessionId?: string; // Persistent session identifier
};

type BrowserTab = {
  id: string;
  url: string;
  title: string;
  history: string[];
  historyIndex: number;
  pinnedAppId?: string; // Which pinned app this tab belongs to
};

type BrowserState = {
  pinnedApps: PinnedApp[];
  tabs: BrowserTab[];
  activeTabId: string;
  sidebarVisible: boolean;
  focusMode: boolean;
  splitView: boolean;
  splitViewTarget: string | null; // App ID to show alongside browser

  // Pinned apps
  addPinnedApp: (url: string, title: string, icon?: string) => void;
  removePinnedApp: (id: string) => void;
  reorderPinnedApps: (fromIndex: number, toIndex: number) => void;
  updatePinnedAppLastUrl: (id: string, lastUrl: string) => void;

  // Tabs
  addTab: (url?: string, pinnedAppId?: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabUrl: (id: string, url: string, title: string) => void;
  navigateTab: (id: string, url: string, title: string) => void;

  // UI
  toggleSidebar: () => void;
  toggleFocusMode: () => void;
  toggleSplitView: (targetAppId?: string) => void;

  // Persistence
  loadPersisted: () => Promise<void>;
  persist: () => void;
};

const PINNED_APPS_KEY = 'anichisom_browser_pinned_apps';
const TABS_KEY = 'anichisom_browser_tabs';

function getDomainTitle(urlStr: string): string {
  try {
    if (!urlStr) return 'New Tab';
    return new URL(urlStr).hostname.replace('www.', '');
  } catch {
    return urlStr || 'New Tab';
  }
}

export const useBrowserStore = create<BrowserState>((set, get) => ({
  pinnedApps: [],
  tabs: [
    {
      id: '1',
      url: 'https://duckduckgo.com/',
      title: 'DuckDuckGo',
      history: ['https://duckduckgo.com/'],
      historyIndex: 0,
    },
  ],
  activeTabId: '1',
  sidebarVisible: true,
  focusMode: false,
  splitView: false,
  splitViewTarget: null,

  addPinnedApp: (url, title, icon) => {
    const pinned: PinnedApp = {
      id: `pin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url,
      title,
      icon: icon || `https://www.google.com/s2/favicons?domain=${new URL(url.startsWith('http') ? url : `https://${url}`).hostname}&sz=64`,
      lastVisited: Date.now(),
      lastUrl: url,
    };
    set((s) => {
      const next = [...s.pinnedApps, pinned];
      idbSet(PINNED_APPS_KEY, next);
      return { pinnedApps: next };
    });
  },

  removePinnedApp: (id) => {
    set((s) => {
      const next = s.pinnedApps.filter((p) => p.id !== id);
      idbSet(PINNED_APPS_KEY, next);
      return { pinnedApps: next };
    });
  },

  reorderPinnedApps: (fromIndex, toIndex) => {
    set((s) => {
      const next = [...s.pinnedApps];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved!);
      idbSet(PINNED_APPS_KEY, next);
      return { pinnedApps: next };
    });
  },

  updatePinnedAppLastUrl: (id, lastUrl) => {
    set((s) => {
      const next = s.pinnedApps.map((p) =>
        p.id === id ? { ...p, lastUrl, lastVisited: Date.now() } : p
      );
      idbSet(PINNED_APPS_KEY, next);
      return { pinnedApps: next };
    });
  },

  addTab: (url, pinnedAppId) => {
    const { tabs } = get();
    const defaultUrl = url || 'https://duckduckgo.com/';
    const newId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newTab: BrowserTab = {
      id: newId,
      url: defaultUrl,
      title: getDomainTitle(defaultUrl),
      history: [defaultUrl],
      historyIndex: 0,
      pinnedAppId,
    };
    set((s) => {
      const next = [...s.tabs, newTab];
      idbSet(TABS_KEY, next.map((t) => ({ id: t.id, url: t.url, title: t.title, pinnedAppId: t.pinnedAppId })));
      return { tabs: next, activeTabId: newId };
    });
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get();
    if (tabs.length <= 1) return;
    const next = tabs.filter((t) => t.id !== id);
    const newActive = activeTabId === id ? next[next.length - 1]!.id : activeTabId;
    set((s) => {
      const updatedTabs = s.tabs.filter((t) => t.id !== id);
      idbSet(TABS_KEY, updatedTabs.map((t) => ({ id: t.id, url: t.url, title: t.title, pinnedAppId: t.pinnedAppId })));
      return { tabs: updatedTabs, activeTabId: newActive };
    });
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTabUrl: (id, url, title) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, url, title } : t)),
    }));
  },

  navigateTab: (id, url, title) => {
    set((s) => {
      const next = s.tabs.map((t) => {
        if (t.id !== id) return t;
        const newHistory = t.history.slice(0, t.historyIndex + 1);
        newHistory.push(url);
        return {
          ...t,
          url,
          title: title || getDomainTitle(url),
          history: newHistory,
          historyIndex: newHistory.length - 1,
        };
      });
      // Also update pinned app's lastUrl if this tab is pinned
      const tab = next.find((t) => t.id === id);
      if (tab?.pinnedAppId) {
        const pinnedApps = s.pinnedApps.map((p) =>
          p.id === tab.pinnedAppId ? { ...p, lastUrl: url, lastVisited: Date.now() } : p
        );
        idbSet(PINNED_APPS_KEY, pinnedApps);
        return { tabs: next, pinnedApps };
      }
      return { tabs: next };
    });
  },

  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),

  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),

  toggleSplitView: (targetAppId) => {
    set((s) => {
      if (s.splitView && !targetAppId) {
        return { splitView: false, splitViewTarget: null };
      }
      return { splitView: true, splitViewTarget: targetAppId || null };
    });
  },

  loadPersisted: async () => {
    const [pinnedApps, tabs] = await Promise.all([
      idbGet<PinnedApp[]>(PINNED_APPS_KEY),
      idbGet<Partial<BrowserTab>[]>(TABS_KEY),
    ]);
    const updates: Partial<BrowserState> = {};
    if (pinnedApps && pinnedApps.length > 0) updates.pinnedApps = pinnedApps;
    if (tabs && tabs.length > 0) {
      updates.tabs = tabs.map((t) => ({
        id: t.id || `tab-${Date.now()}`,
        url: t.url || '',
        title: t.title || getDomainTitle(t.url || ''),
        history: t.history || [t.url || ''],
        historyIndex: t.historyIndex || 0,
        pinnedAppId: t.pinnedAppId,
      }));
      updates.activeTabId = updates.tabs![0]!.id;
    }
    if (Object.keys(updates).length > 0) set(updates);
  },

  persist: () => {
    const { pinnedApps, tabs } = get();
    idbSet(PINNED_APPS_KEY, pinnedApps);
    idbSet(TABS_KEY, tabs.map((t) => ({ id: t.id, url: t.url, title: t.title, pinnedAppId: t.pinnedAppId })));
  },
}));
