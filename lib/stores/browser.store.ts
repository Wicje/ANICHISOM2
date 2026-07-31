/**
 * Browser Zustand Store — tabs, pinned apps, bookmarks.
 *
 * All persistence through Context Layer (readDomain/writeDomain).
 */
import { create } from 'zustand';
import { readDomain, writeDomain } from '@/lib/context-layer';

const DOMAIN = 'browser';
const LEGACY_KEYS = {
  pinned: 'continuaos_browser_pinned_apps',
  tabs: 'continuaos_browser_tabs',
  bookmarks: 'continuaos_browser_bookmarks',
};

export type PinnedApp = {
  id: string;
  url: string;
  title: string;
  icon: string;
  lastVisited?: number;
  lastUrl?: string;
  sessionId?: string;
};

type BrowserTab = {
  id: string;
  url: string;
  title: string;
  history: string[];
  historyIndex: number;
  pinnedAppId?: string;
};

export type Bookmark = {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  createdAt: number;
  folder?: string;
};

type BrowserState = {
  pinnedApps: PinnedApp[];
  tabs: BrowserTab[];
  activeTabId: string;
  sidebarVisible: boolean;
  focusMode: boolean;
  splitView: boolean;
  splitViewTarget: string | null;
  bookmarks: Bookmark[];
  _loaded: boolean;

  addPinnedApp: (url: string, title: string, icon?: string) => void;
  removePinnedApp: (id: string) => void;
  reorderPinnedApps: (fromIndex: number, toIndex: number) => void;
  updatePinnedAppLastUrl: (id: string, lastUrl: string) => void;
  addTab: (url?: string, pinnedAppId?: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabUrl: (id: string, url: string, title: string) => void;
  navigateTab: (id: string, url: string, title: string) => void;
  addBookmark: (url: string, title: string, favicon?: string) => void;
  removeBookmark: (id: string) => void;
  isBookmarked: (url: string) => boolean;
  toggleSidebar: () => void;
  toggleFocusMode: () => void;
  toggleSplitView: (targetAppId?: string) => void;
  loadPersisted: () => Promise<void>;
  persist: () => void;
};

function getDomainTitle(urlStr: string): string {
  try {
    if (!urlStr) return 'New Tab';
    return new URL(urlStr).hostname.replace('www.', '');
  } catch {
    return urlStr || 'New Tab';
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function persistBrowser(state: BrowserState) {
  if (!state._loaded) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    writeDomain(DOMAIN, {
      pinnedApps: state.pinnedApps,
      tabs: state.tabs.map(t => ({ id: t.id, url: t.url, title: t.title, pinnedAppId: t.pinnedAppId })),
      bookmarks: state.bookmarks,
    });
  }, 2000);
}

export const useBrowserStore = create<BrowserState>((set, get) => ({
  pinnedApps: [],
  tabs: [{
    id: '1',
    url: 'https://duckduckgo.com/',
    title: 'DuckDuckGo',
    history: ['https://duckduckgo.com/'],
    historyIndex: 0,
  }],
  activeTabId: '1',
  sidebarVisible: true,
  focusMode: false,
  splitView: false,
  splitViewTarget: null,
  bookmarks: [],
  _loaded: false,

  addPinnedApp: (url, title, icon) => {
    const pinned: PinnedApp = {
      id: `pin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url, title,
      icon: icon || `https://www.google.com/s2/favicons?domain=${new URL(url.startsWith('http') ? url : `https://${url}`).hostname}&sz=64`,
      lastVisited: Date.now(), lastUrl: url,
    };
    set(s => { const next = [...s.pinnedApps, pinned]; return { pinnedApps: next }; });
    persistBrowser(get());
  },

  removePinnedApp: (id) => {
    set(s => ({ pinnedApps: s.pinnedApps.filter(p => p.id !== id) }));
    persistBrowser(get());
  },

  reorderPinnedApps: (fromIndex, toIndex) => {
    set(s => {
      const next = [...s.pinnedApps];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved!);
      return { pinnedApps: next };
    });
    persistBrowser(get());
  },

  updatePinnedAppLastUrl: (id, lastUrl) => {
    set(s => ({
      pinnedApps: s.pinnedApps.map(p => p.id === id ? { ...p, lastUrl, lastVisited: Date.now() } : p),
    }));
    persistBrowser(get());
  },

  addTab: (url, pinnedAppId) => {
    const defaultUrl = url || 'https://duckduckgo.com/';
    const newId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newTab: BrowserTab = {
      id: newId, url: defaultUrl, title: getDomainTitle(defaultUrl),
      history: [defaultUrl], historyIndex: 0, pinnedAppId,
    };
    set(s => ({ tabs: [...s.tabs, newTab], activeTabId: newId }));
    persistBrowser(get());
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get();
    if (tabs.length <= 1) return;
    const next = tabs.filter(t => t.id !== id);
    const newActive = activeTabId === id ? next[next.length - 1]!.id : activeTabId;
    set({ tabs: next, activeTabId: newActive });
    persistBrowser(get());
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTabUrl: (id, url, title) => {
    set(s => ({ tabs: s.tabs.map(t => t.id === id ? { ...t, url, title } : t) }));
  },

  navigateTab: (id, url, title) => {
    set(s => {
      const next = s.tabs.map(t => {
        if (t.id !== id) return t;
        const newHistory = t.history.slice(0, t.historyIndex + 1);
        newHistory.push(url);
        return { ...t, url, title: title || getDomainTitle(url), history: newHistory, historyIndex: newHistory.length - 1 };
      });
      const tab = next.find(t => t.id === id);
      if (tab?.pinnedAppId) {
        const pinnedApps = s.pinnedApps.map(p => p.id === tab.pinnedAppId ? { ...p, lastUrl: url, lastVisited: Date.now() } : p);
        return { tabs: next, pinnedApps };
      }
      return { tabs: next };
    });
    persistBrowser(get());
  },

  toggleSidebar: () => set(s => ({ sidebarVisible: !s.sidebarVisible })),
  toggleFocusMode: () => set(s => ({ focusMode: !s.focusMode })),
  toggleSplitView: (targetAppId) => {
    set(s => {
      if (s.splitView && !targetAppId) return { splitView: false, splitViewTarget: null };
      return { splitView: true, splitViewTarget: targetAppId || null };
    });
  },

  addBookmark: (url, title, favicon) => {
    const { bookmarks } = get();
    if (bookmarks.some(b => b.url === url)) return;
    const bookmark: Bookmark = {
      id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url, title,
      favicon: favicon || `https://www.google.com/s2/favicons?domain=${getDomainTitle(url)}&sz=64`,
      createdAt: Date.now(),
    };
    set(s => ({ bookmarks: [...s.bookmarks, bookmark] }));
    persistBrowser(get());
  },

  removeBookmark: (id) => {
    set(s => ({ bookmarks: s.bookmarks.filter(b => b.id !== id) }));
    persistBrowser(get());
  },

  isBookmarked: (url) => get().bookmarks.some(b => b.url === url),

  loadPersisted: async () => {
    // Try Context Layer first, fall back to legacy keys
    const ctxData = await readDomain<{ pinnedApps?: PinnedApp[]; tabs?: Partial<BrowserTab>[]; bookmarks?: Bookmark[] }>(DOMAIN);
    if (ctxData && (ctxData.pinnedApps || ctxData.tabs || ctxData.bookmarks)) {
      const updates: Partial<BrowserState> = {};
      if (ctxData.pinnedApps?.length) updates.pinnedApps = ctxData.pinnedApps;
      if (ctxData.bookmarks?.length) updates.bookmarks = ctxData.bookmarks;
      if (ctxData.tabs?.length) {
        updates.tabs = ctxData.tabs.map(t => ({
          id: t.id || `tab-${Date.now()}`, url: t.url || '', title: t.title || getDomainTitle(t.url || ''),
          history: t.history || [t.url || ''], historyIndex: t.historyIndex || 0, pinnedAppId: t.pinnedAppId,
        }));
        updates.activeTabId = updates.tabs![0]!.id;
      }
      if (Object.keys(updates).length > 0) set(updates);
    } else {
      // Migration: read from legacy keys
      const { get: idbGet } = await import('idb-keyval');
      const [pinnedApps, tabs, bookmarks] = await Promise.all([
        idbGet<PinnedApp[]>(LEGACY_KEYS.pinned),
        idbGet<Partial<BrowserTab>[]>(LEGACY_KEYS.tabs),
        idbGet<Bookmark[]>(LEGACY_KEYS.bookmarks),
      ]);
      const updates: Partial<BrowserState> = {};
      if (pinnedApps?.length) updates.pinnedApps = pinnedApps;
      if (bookmarks?.length) updates.bookmarks = bookmarks;
      if (tabs?.length) {
        updates.tabs = tabs.map(t => ({
          id: t.id || `tab-${Date.now()}`, url: t.url || '', title: t.title || getDomainTitle(t.url || ''),
          history: t.history || [t.url || ''], historyIndex: t.historyIndex || 0, pinnedAppId: t.pinnedAppId,
        }));
        updates.activeTabId = updates.tabs![0]!.id;
      }
      if (Object.keys(updates).length > 0) {
        set(updates);
        persistBrowser(get());
      }
    }
    const currentTabs = get().tabs;
    if (!currentTabs || currentTabs.length === 0) {
      set({
        tabs: [{
          id: '1',
          url: 'https://duckduckgo.com/',
          title: 'DuckDuckGo',
          history: ['https://duckduckgo.com/'],
          historyIndex: 0,
        }],
        activeTabId: '1',
      });
    }
    set({ _loaded: true });
  },

  persist: () => persistBrowser(get()),
}));
