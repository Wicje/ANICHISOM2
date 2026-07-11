import { describe, it, expect, beforeEach } from 'vitest';
import { useBrowserStore } from '@/lib/stores/browser.store';

describe('BrowserStore', () => {
  beforeEach(() => {
    useBrowserStore.setState({
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
    });
  });

  it('starts with default state', () => {
    const state = useBrowserStore.getState();
    expect(state.pinnedApps).toEqual([]);
    expect(state.tabs).toHaveLength(1);
    expect(state.activeTabId).toBe('1');
    expect(state.sidebarVisible).toBe(true);
    expect(state.focusMode).toBe(false);
    expect(state.splitView).toBe(false);
  });

  describe('Pinned Apps', () => {
    it('addPinnedApp adds a pinned app', () => {
      useBrowserStore.getState().addPinnedApp('https://github.com', 'GitHub');
      const { pinnedApps } = useBrowserStore.getState();
      expect(pinnedApps).toHaveLength(1);
      expect(pinnedApps[0].url).toBe('https://github.com');
      expect(pinnedApps[0].title).toBe('GitHub');
      expect(pinnedApps[0].lastUrl).toBe('https://github.com');
    });

    it('addPinnedApp auto-generates favicon URL', () => {
      useBrowserStore.getState().addPinnedApp('https://github.com', 'GitHub');
      const { pinnedApps } = useBrowserStore.getState();
      expect(pinnedApps[0].icon).toContain('google.com/s2/favicons');
      expect(pinnedApps[0].icon).toContain('github.com');
    });

    it('addPinnedApp accepts custom icon', () => {
      useBrowserStore.getState().addPinnedApp('https://github.com', 'GitHub', 'https://example.com/icon.png');
      expect(useBrowserStore.getState().pinnedApps[0].icon).toBe('https://example.com/icon.png');
    });

    it('removePinnedApp removes a pinned app', () => {
      useBrowserStore.getState().addPinnedApp('https://github.com', 'GitHub');
      const { pinnedApps } = useBrowserStore.getState();
      useBrowserStore.getState().removePinnedApp(pinnedApps[0].id);
      expect(useBrowserStore.getState().pinnedApps).toHaveLength(0);
    });

    it('reorderPinnedApps moves an app', () => {
      useBrowserStore.getState().addPinnedApp('https://github.com', 'GitHub');
      useBrowserStore.getState().addPinnedApp('https://figma.com', 'Figma');
      useBrowserStore.getState().addPinnedApp('https://vercel.com', 'Vercel');
      useBrowserStore.getState().reorderPinnedApps(0, 2);
      const { pinnedApps } = useBrowserStore.getState();
      expect(pinnedApps[0].title).toBe('Figma');
      expect(pinnedApps[2].title).toBe('GitHub');
    });

    it('updatePinnedAppLastUrl updates lastUrl and lastVisited', () => {
      useBrowserStore.getState().addPinnedApp('https://github.com', 'GitHub');
      const { pinnedApps } = useBrowserStore.getState();
      useBrowserStore.getState().updatePinnedAppLastUrl(pinnedApps[0].id, 'https://github.com/repo');
      const updated = useBrowserStore.getState().pinnedApps[0];
      expect(updated.lastUrl).toBe('https://github.com/repo');
      expect(updated.lastVisited).toBeGreaterThan(0);
    });
  });

  describe('Tabs', () => {
    it('addTab adds a new tab', () => {
      useBrowserStore.getState().addTab('https://github.com');
      const { tabs, activeTabId } = useBrowserStore.getState();
      expect(tabs).toHaveLength(2);
      const newTab = tabs.find((t) => t.id === activeTabId)!;
      expect(newTab.url).toBe('https://github.com');
      expect(newTab.history).toEqual(['https://github.com']);
    });

    it('addTab with pinnedAppId links tab to pinned app', () => {
      useBrowserStore.getState().addPinnedApp('https://github.com', 'GitHub');
      const pin = useBrowserStore.getState().pinnedApps[0];
      useBrowserStore.getState().addTab('https://github.com', pin.id);
      const newTab = useBrowserStore.getState().tabs.find((t) => t.pinnedAppId === pin.id);
      expect(newTab).toBeDefined();
      expect(newTab!.pinnedAppId).toBe(pin.id);
    });

    it('closeTab removes the tab', () => {
      useBrowserStore.getState().addTab('https://github.com');
      const secondTab = useBrowserStore.getState().tabs[1];
      useBrowserStore.getState().closeTab(secondTab.id);
      expect(useBrowserStore.getState().tabs).toHaveLength(1);
    });

    it('closeTab does not remove last tab', () => {
      useBrowserStore.getState().closeTab('1');
      expect(useBrowserStore.getState().tabs).toHaveLength(1);
    });

    it('closeTab switches active tab if closing active', () => {
      useBrowserStore.getState().addTab('https://github.com');
      useBrowserStore.getState().addTab('https://figma.com');
      const tabs = useBrowserStore.getState().tabs;
      // Active is the last added tab (tab-...)
      const activeTabId = useBrowserStore.getState().activeTabId;
      useBrowserStore.getState().closeTab(activeTabId);
      expect(useBrowserStore.getState().activeTabId).not.toBe(activeTabId);
    });

    it('setActiveTab changes active tab', () => {
      useBrowserStore.getState().addTab('https://github.com');
      const secondTab = useBrowserStore.getState().tabs[1];
      useBrowserStore.getState().setActiveTab(secondTab.id);
      expect(useBrowserStore.getState().activeTabId).toBe(secondTab.id);
    });

    it('navigateTab adds to history', () => {
      useBrowserStore.getState().navigateTab('1', 'https://github.com', 'GitHub');
      const tab = useBrowserStore.getState().tabs[0];
      expect(tab.url).toBe('https://github.com');
      expect(tab.history).toContain('https://github.com');
      expect(tab.historyIndex).toBe(tab.history.length - 1);
    });

    it('navigateTab updates pinned app lastUrl', () => {
      useBrowserStore.getState().addPinnedApp('https://github.com', 'GitHub');
      const pin = useBrowserStore.getState().pinnedApps[0];
      useBrowserStore.getState().addTab('https://github.com', pin.id);
      const tab = useBrowserStore.getState().tabs.find((t) => t.pinnedAppId === pin.id)!;
      useBrowserStore.getState().navigateTab(tab.id, 'https://github.com/repo', 'Repo');
      const updatedPin = useBrowserStore.getState().pinnedApps.find((p) => p.id === pin.id)!;
      expect(updatedPin.lastUrl).toBe('https://github.com/repo');
    });
  });

  describe('UI State', () => {
    it('toggleSidebar toggles sidebar visibility', () => {
      expect(useBrowserStore.getState().sidebarVisible).toBe(true);
      useBrowserStore.getState().toggleSidebar();
      expect(useBrowserStore.getState().sidebarVisible).toBe(false);
      useBrowserStore.getState().toggleSidebar();
      expect(useBrowserStore.getState().sidebarVisible).toBe(true);
    });

    it('toggleFocusMode toggles focus mode', () => {
      expect(useBrowserStore.getState().focusMode).toBe(false);
      useBrowserStore.getState().toggleFocusMode();
      expect(useBrowserStore.getState().focusMode).toBe(true);
    });

    it('toggleSplitView toggles split view', () => {
      expect(useBrowserStore.getState().splitView).toBe(false);
      useBrowserStore.getState().toggleSplitView();
      expect(useBrowserStore.getState().splitView).toBe(true);
      useBrowserStore.getState().toggleSplitView();
      expect(useBrowserStore.getState().splitView).toBe(false);
    });

    it('toggleSplitView with appId sets target', () => {
      useBrowserStore.getState().toggleSplitView('moodboard');
      expect(useBrowserStore.getState().splitViewTarget).toBe('moodboard');
    });
  });
});
