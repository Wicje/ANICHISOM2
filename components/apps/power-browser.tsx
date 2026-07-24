'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useBrowserStore, PinnedApp } from '@/lib/stores/browser.store';
import { useWindowStore } from '@/lib/stores/window.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import {
  ArrowLeft, ArrowRight, RotateCw, Home, Lock, ExternalLink, Search,
  Maximize2, Minimize2, Download, Plus, X, Star, Bookmark, Trash2,
  Pin, PinOff, PanelLeftClose, PanelLeftOpen, Columns, GripVertical, Scissors,
  Globe, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrowserClipService } from '@/lib/services/browser-clip.service';

// Sites known to block iframe embedding aggressively
const KNOWN_BLOCKED_HOSTS = new Set([
  'figma.com', 'www.figma.com',
  'docs.google.com', 'drive.google.com',
  'github.com', 'gitlab.com',
  'notion.so', 'www.notion.so',
  'airtable.com', 'www.airtable.com',
  'trello.com', 'www.trello.com',
  'linear.app',
  'vercel.com', 'app.vercel.com',
  'netlify.com', 'app.netlify.com',
  'youtube.com', 'www.youtube.com',
  'twitter.com', 'x.com', 'www.x.com',
  'facebook.com', 'www.facebook.com',
  'instagram.com', 'www.instagram.com',
  'linkedin.com', 'www.linkedin.com',
  'reddit.com', 'www.reddit.com',
  'medium.com',
  'spotify.com', 'open.spotify.com',
]);

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function isKnownBlocked(url: string): boolean {
  const host = getHostname(url);
  return KNOWN_BLOCKED_HOSTS.has(host);
}

export function PowerBrowser({ window: osWindow }: { window: any }) {
  const { themeColor } = useThemeStore();
  const openWindow = useWindowStore((s) => s.openWindow);

  const {
    pinnedApps, tabs, activeTabId, sidebarVisible, focusMode, splitView, splitViewTarget,
    addPinnedApp, removePinnedApp, updatePinnedAppLastUrl,
    addTab, closeTab, setActiveTab, navigateTab,
    toggleSidebar, toggleFocusMode, toggleSplitView,
    addBookmark, removeBookmark, isBookmarked: checkIsBookmarked,
    loadPersisted, persist,
  } = useBrowserStore();

  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinUrl, setPinUrl] = useState('');
  const [pinTitle, setPinTitle] = useState('');
  const [searchEngine, setSearchEngine] = useState<'google' | 'duckduckgo' | 'bing'>('google');
  // Fallback state: tracks which tabs failed to load
  const [blockedTabs, setBlockedTabs] = useState<Set<string>>(new Set());
  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());

  const activeTab = (tabs.find((t) => t.id === activeTabId) || tabs[0])!;

  useEffect(() => {
    loadPersisted();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeTab) setInputUrl(activeTab.url);
  }, [activeTab?.url, activeTabId]);

  // Persist tabs on change
  useEffect(() => {
    persist();
  }, [tabs, pinnedApps]);

  const isBookmarked = activeTab ? checkIsBookmarked(activeTab.url) : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl) return;
    let finalUrl = inputUrl;
    const isDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(inputUrl) || inputUrl.startsWith('http');
    if (isDomain) {
      if (!inputUrl.startsWith('http')) finalUrl = `https://${inputUrl}`;
    } else if (inputUrl.toLowerCase().startsWith('wikipedia')) {
      const query = inputUrl.replace(/^wikipedia\s*/i, '').trim();
      finalUrl = query ? `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}` : `https://en.wikipedia.org`;
    } else {
      const q = encodeURIComponent(inputUrl);
      if (searchEngine === 'google') finalUrl = `https://www.google.com/search?q=${q}`;
      else if (searchEngine === 'duckduckgo') finalUrl = `https://html.duckduckgo.com/html/?q=${q}`;
      else finalUrl = `https://www.bing.com/search?q=${q}`;
    }
    setLoading(true);
    navigateTab(activeTabId, finalUrl, '');
  };


  // Fix: back/forward shouldn't add to history
  const goBack = () => {
    if (!activeTab || activeTab.historyIndex <= 0) return;
    const newIndex = activeTab.historyIndex - 1;
    const newUrl = activeTab.history[newIndex]!;
    useBrowserStore.getState().updateTabUrl(activeTabId, newUrl, '');
    // Manually set history index
    useBrowserStore.setState((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === activeTabId ? { ...t, url: newUrl, historyIndex: newIndex } : t
      ),
    }));
    setInputUrl(newUrl);
  };

  const goForward = () => {
    if (!activeTab || activeTab.historyIndex >= activeTab.history.length - 1) return;
    const newIndex = activeTab.historyIndex + 1;
    const newUrl = activeTab.history[newIndex]!;
    useBrowserStore.setState((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === activeTabId ? { ...t, url: newUrl, historyIndex: newIndex } : t
      ),
    }));
    setInputUrl(newUrl);
  };

  const reload = () => {
    if (!activeTab) return;
    setLoading(true);
    const current = activeTab.url;
    useBrowserStore.getState().updateTabUrl(activeTabId, '', '');
    setTimeout(() => {
      useBrowserStore.getState().updateTabUrl(activeTabId, current, activeTab.title);
    }, 50);
  };

  const handlePinApp = () => {
    if (!pinUrl) return;
    let url = pinUrl;
    if (!url.startsWith('http')) url = `https://${url}`;
    addPinnedApp(url, pinTitle || new URL(url).hostname, `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`);
    setShowPinDialog(false);
    setPinUrl('');
    setPinTitle('');
  };

  const openPinnedApp = (pin: PinnedApp) => {
    // Context memory: restore last URL if available
    const url = pin.lastUrl || pin.url;
    addTab(url, pin.id);
  };

  const handleIframeLoad = (tabId: string) => {
    setLoading(false);
    const iframe = iframeRefs.current.get(tabId);
    if (!iframe) return;

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        const text = doc.body?.textContent || '';
        // Only mark as blocked if the page explicitly cannot be embedded (CORS blocks contentDocument read)
        // Proxy errors (auth, rate-limit, fetch failure) now render as HTML — don't mark those as blocked
        const isBlocked = text.includes('refused to connect') || text.includes('net::ERR');
        if (isBlocked) {
          setBlockedTabs(prev => new Set([...prev, tabId]));
          return;
        }
      }
      // Page loaded — remove from blocked set
      setBlockedTabs(prev => {
        const next = new Set(prev);
        next.delete(tabId);
        return next;
      });
    } catch {
      // Cross-origin — page loaded, just can't inspect content. That's fine.
      setBlockedTabs(prev => {
        const next = new Set(prev);
        next.delete(tabId);
        return next;
      });
    }
  };

  const handleIframeError = (tabId: string) => {
    setBlockedTabs(prev => new Set([...prev, tabId]));
  };

  const openExternal = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full h-full flex flex-col bg-white text-black font-sans relative group/browser">
      <style>{`
        @keyframes browser-loading {
          0% { width: 0%; margin-left: 0; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>

      {/* Floating Controls (Focus Mode) */}
      {focusMode && (
        <>
          <button
            onClick={toggleFocusMode}
            className="absolute top-4 right-4 z-[100] bg-black/80 hover:bg-black text-white p-2 rounded-full shadow-2xl backdrop-blur transition-all opacity-0 group-hover/browser:opacity-100"
            title="Exit Focus Mode"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={toggleSidebar}
            className="absolute top-4 left-4 z-[100] bg-black/80 hover:bg-black text-white p-2 rounded-full shadow-2xl backdrop-blur transition-all opacity-0 group-hover/browser:opacity-100"
            title="Toggle Sidebar"
          >
            {sidebarVisible ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        </>
      )}

      <div className="flex flex-1 min-h-0">

        {/* Pinned Apps Sidebar */}
        <div
          className={cn(
            "flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden shrink-0 bg-[#1c1c1e] border-r border-white/5",
            sidebarVisible ? "w-16" : "w-0 border-r-0"
          )}
        >
          {/* Pin Button */}
          <div className="p-2 flex flex-col items-center gap-1">
            <button
              onClick={() => {
                setPinUrl(activeTab?.url || '');
                setPinTitle(activeTab?.title || '');
                setShowPinDialog(true);
              }}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              title="Pin current page"
            >
              <Pin className="w-4 h-4" />
            </button>
          </div>

          {/* Pinned Apps List */}
          <div className="flex-1 overflow-y-auto px-2 py-1 flex flex-col items-center gap-1">
            {pinnedApps.map((pin) => (
              <div
                key={pin.id}
                className="group relative w-10 h-10 rounded-xl overflow-hidden cursor-pointer hover:rounded-lg transition-all duration-200"
                onClick={() => openPinnedApp(pin)}
                title={pin.title}
              >
                <img
                  src={pin.icon}
                  alt={pin.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold text-center leading-tight px-1">
                    {pin.title.slice(0, 4)}
                  </span>
                </div>
                {/* Unpin button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePinnedApp(pin.id);
                  }}
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tab Sidebar */}
        <div className={cn(
          "flex flex-col transition-all duration-300 overflow-hidden shrink-0 bg-[#111] border-r border-white/5",
          sidebarVisible ? "w-56" : "w-0 border-r-0"
        )}>
          {/* Tab list */}
          <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all",
                  activeTabId === tab.id
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-white/5 border border-white/10">
                    <Globe className="w-3 h-3 text-white/70" />
                  </div>
                  <span className="text-[13px] font-medium truncate">{tab.title || 'New Tab'}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/20 rounded text-white/70 hover:text-white transition-all shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* New Tab */}
          <div className="px-2 pb-3">
            <button onClick={() => addTab()} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
              <Plus className="w-4 h-4" />
              <span className="text-[13px]">New Tab</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Browser Chrome */}
          {!focusMode && (
            <div className="flex flex-col border-b border-black/10 bg-slate-50 shrink-0 z-10">
              <div className="h-12 flex items-center justify-between px-4 gap-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <button disabled={!activeTab || activeTab.historyIndex <= 0} onClick={goBack} className="p-1.5 rounded-full hover:bg-black/5 disabled:opacity-30 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button disabled={!activeTab || activeTab.historyIndex >= (activeTab?.history.length || 1) - 1} onClick={goForward} className="p-1.5 rounded-full hover:bg-black/5 disabled:opacity-30 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button onClick={reload} className="p-1.5 rounded-full hover:bg-black/5 transition-colors ml-1">
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={toggleSidebar}
                    className="p-1.5 rounded-full hover:bg-black/5 transition-colors"
                    title={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
                  >
                    {sidebarVisible ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                  </button>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="flex-1 max-w-2xl mx-auto flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-black/10 focus-within:border-black/30 focus-within:shadow-sm transition-all"
                >
                  {activeTab?.url && activeTab.url.includes('http') ? (
                    <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
                  ) : (
                    <Search className="w-3 h-3 text-slate-400 shrink-0" />
                  )}
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="Search or enter URL"
                    className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700"
                  />
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const engines: Array<'google' | 'duckduckgo' | 'bing'> = ['google', 'duckduckgo', 'bing'];
                        const idx = engines.indexOf(searchEngine);
                        setSearchEngine(engines[(idx + 1) % engines.length]!);
                      }}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors uppercase"
                      title={`Search engine: ${searchEngine}. Click to switch.`}
                    >
                      {searchEngine === 'google' ? 'G' : searchEngine === 'duckduckgo' ? 'D' : 'B'}
                    </button>
                  </div>
                </form>

                <div className="flex items-center gap-2 text-slate-500">
                  <button
                    onClick={() => {
                      if (!activeTab) return;
                      if (isBookmarked) {
                        const bm = useBrowserStore.getState().bookmarks.find(b => b.url === activeTab.url);
                        if (bm) removeBookmark(bm.id);
                      } else {
                        addBookmark(activeTab.url, activeTab.title);
                      }
                    }}
                    className={cn("hover:text-black hover:bg-black/5 rounded p-1.5 transition-colors", isBookmarked && "text-amber-500")}
                    title={isBookmarked ? "Remove bookmark" : "Bookmark this page"}
                  >
                    <Star className={cn("w-4 h-4", isBookmarked && "fill-current")} />
                  </button>
                  <button
                    onClick={() => {
                      if (activeTab) {
                        setPinUrl(activeTab.url);
                        setPinTitle(activeTab.title);
                        setShowPinDialog(true);
                      }
                    }}
                    className="hover:text-black hover:bg-black/5 rounded p-1.5 transition-colors"
                    title="Pin this app"
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                  <button
                    onClick={toggleFocusMode}
                    className="hover:text-black hover:bg-black/5 rounded p-1.5 transition-colors"
                    title="Focus Mode"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleSplitView()}
                    className={cn("hover:text-black hover:bg-black/5 rounded p-1.5 transition-colors", splitView && "text-blue-500")}
                    title="Split View"
                  >
                    <Columns className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (activeTab) {
                        BrowserClipService.clipPage({
                          url: activeTab.url,
                          title: activeTab.title,
                          source: 'power-browser',
                        });
                        openWindow('moodboard', 'Moodboard Canvas');
                        window.dispatchEvent(new CustomEvent('os:notify', {
                          detail: { title: 'Clipped to Moodboard', description: `${activeTab.title || 'Page'} added to Canvas`, type: 'success' },
                        }));
                      }
                    }}
                    className="hover:text-black hover:bg-rose-50 rounded p-1.5 transition-colors text-rose-500"
                    title="Clip to Moodboard"
                  >
                    <Scissors className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {loading && (
                <div className="h-0.5 w-full overflow-hidden" style={{ background: 'var(--os-border)' }}>
                  <div
                    className="h-full"
                    style={{
                      background: 'var(--os-primary, #6366f1)',
                      animation: 'browser-loading 1.5s ease-in-out infinite',
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Browser Content */}
          <div className={cn("flex-1 bg-slate-100 relative overflow-hidden", splitView && "w-1/2")}>
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={cn(
                  "absolute inset-0 transition-opacity duration-200",
                  activeTabId === tab.id ? "opacity-100 z-10" : "opacity-0 pointer-events-none -z-10"
                )}
              >
                {!tab.url ? (
                  <NewTabPage
                    tabId={tab.id}
                    searchEngine={searchEngine}
                    onNavigate={(url) => { setLoading(true); navigateTab(activeTabId, url, ''); }}
                  />
                ) : isKnownBlocked(tab.url) && blockedTabs.has(tab.id) ? (
                  <BlockedSiteFallback
                    url={tab.url}
                    onOpenExternal={openExternal}
                    onTryProxy={() => {
                      // Force reload through proxy
                      setBlockedTabs(prev => {
                        const next = new Set(prev);
                        next.delete(tab.id);
                        return next;
                      });
                      reload();
                    }}
                  />
                ) : (
                  <>
                    <iframe
                      ref={(el) => {
                        if (el) iframeRefs.current.set(tab.id, el);
                        else iframeRefs.current.delete(tab.id);
                      }}
                      src={tab.url.startsWith('http') ? `/api/proxy?url=${encodeURIComponent(tab.url)}` : tab.url}
                      className="w-full h-full border-none bg-white absolute inset-0"
                      title={`Tab ${tab.id}`}
                      sandbox="allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox"
                      onLoad={() => handleIframeLoad(tab.id)}
                      onError={() => handleIframeError(tab.id)}
                    />
                    {blockedTabs.has(tab.id) && (
                      <BlockedSiteFallback
                        url={tab.url}
                        onOpenExternal={openExternal}
                        onTryProxy={() => {
                          setBlockedTabs(prev => {
                            const next = new Set(prev);
                            next.delete(tab.id);
                            return next;
                          });
                          reload();
                        }}
                      />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Split View Panel */}
          {splitView && (
            <div className="w-1/2 border-l border-black/10 bg-slate-50 flex items-center justify-center">
              <div className="text-center text-slate-400">
                <Columns className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select an app to view alongside</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pin App Dialog */}
      {showPinDialog && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#1c1c1e] rounded-2xl p-6 w-96 shadow-2xl border border-white/10">
            <h3 className="text-white text-lg font-medium mb-4">Pin to Sidebar</h3>
            <div className="space-y-3">
              <div>
                <label className="text-white/60 text-sm mb-1 block">URL</label>
                <input
                  type="text"
                  value={pinUrl}
                  onChange={(e) => setPinUrl(e.target.value)}
                  className="w-full h-10 bg-black/40 border border-white/10 rounded-xl px-4 text-sm text-white outline-none focus:border-white/20"
                  placeholder="https://example.com"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-white/60 text-sm mb-1 block">Name</label>
                <input
                  type="text"
                  value={pinTitle}
                  onChange={(e) => setPinTitle(e.target.value)}
                  className="w-full h-10 bg-black/40 border border-white/10 rounded-xl px-4 text-sm text-white outline-none focus:border-white/20"
                  placeholder="My App"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowPinDialog(false)}
                className="px-4 py-2 text-white/60 hover:text-white text-sm rounded-lg hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePinApp}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
              >
                Pin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const QUICK_LINKS = [
  { label: 'ContinuaOS Docs', url: 'https://docs.continuaos.com', icon: 'A', color: 'bg-indigo-100 text-indigo-600' },
  { label: 'GitHub', url: 'https://github.com', icon: 'G', color: 'bg-slate-100 text-slate-700' },
  { label: 'Supabase', url: 'https://supabase.com', icon: 'S', color: 'bg-emerald-100 text-emerald-600' },
  { label: 'Vercel', url: 'https://vercel.com', icon: 'V', color: 'bg-black text-white' },
  { label: 'Stack Overflow', url: 'https://stackoverflow.com', icon: 'O', color: 'bg-orange-100 text-orange-600' },
  { label: 'MDN Web Docs', url: 'https://developer.mozilla.org', icon: 'M', color: 'bg-sky-100 text-sky-600' },
];

function NewTabPage({
  tabId,
  searchEngine,
  onNavigate,
}: {
  tabId: string;
  searchEngine: 'google' | 'duckduckgo' | 'bing';
  onNavigate: (url: string) => void;
}) {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    let finalUrl = query;
    const isDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(query) || query.startsWith('http');
    if (isDomain) {
      if (!query.startsWith('http')) finalUrl = `https://${query}`;
    } else {
      const q = encodeURIComponent(query);
      if (searchEngine === 'google') finalUrl = `https://www.google.com/search?q=${q}`;
      else if (searchEngine === 'duckduckgo') finalUrl = `https://html.duckduckgo.com/html/?q=${q}`;
      else finalUrl = `https://www.bing.com/search?q=${q}`;
    }
    onNavigate(finalUrl);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-white px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-800 mb-8">
        Power Browser
      </h1>

      <form onSubmit={handleSearch} className="w-full max-w-lg mb-10">
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 focus-within:border-slate-300 focus-within:shadow-md transition-all">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the web or enter a URL"
            className="flex-1 bg-transparent border-none outline-none text-base text-slate-700 placeholder:text-slate-400"
            autoFocus
          />
        </div>
      </form>

      <div className="grid grid-cols-3 gap-4 w-full max-w-lg">
        {QUICK_LINKS.map((link) => (
          <button
            key={link.url}
            onClick={() => onNavigate(link.url)}
            className="group flex flex-col items-center gap-2.5 p-4 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-transform group-hover:scale-105", link.color)}>
              {link.icon}
            </div>
            <span className="text-xs font-medium text-slate-600 group-hover:text-slate-800 transition-colors text-center leading-tight">
              {link.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BlockedSiteFallback({
  url,
  onOpenExternal,
  onTryProxy,
}: {
  url: string;
  onOpenExternal: (url: string) => void;
  onTryProxy: () => void;
}) {
  const hostname = getHostname(url);
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">
          This site blocks embedding
        </h3>
        <p className="text-sm text-slate-500 mb-1">
          <span className="font-medium text-slate-700">{hostname}</span> doesn&apos;t allow
          loading inside the browser for security reasons.
        </p>
        <p className="text-xs text-slate-400 mb-6">
          This is a restriction set by the website, not by ContinuaOS.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onOpenExternal(url)}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Open in New Tab
          </button>
          <button
            onClick={onTryProxy}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
          >
            <RotateCw className="w-4 h-4" />
            Try Loading Again
          </button>
          <div className="text-[10px] text-slate-400 mt-1">
            {url.length > 60 ? url.substring(0, 60) + '...' : url}
          </div>
        </div>
      </div>
    </div>
  );
}
