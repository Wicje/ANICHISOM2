'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useBrowserStore, PinnedApp } from '@/lib/stores/browser.store';
import { useWindowStore } from '@/lib/stores/window.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import {
  ArrowLeft, ArrowRight, RotateCw, Home, Lock, ExternalLink, Search,
  Maximize2, Minimize2, Download, Plus, X, Star, Bookmark, Trash2,
  Pin, PinOff, PanelLeftClose, PanelLeftOpen, Columns, GripVertical, Scissors,
  Globe, AlertTriangle, Zap, ShieldAlert, Check, FolderDown, FolderOpen, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrowserClipService } from '@/lib/services/browser-clip.service';
import { isTauri, getBrowserName } from '@/lib/platform';
import { useDownloadsStore, DownloadItem } from '@/lib/stores/downloads.store';
import {
  startDownload, saveBlobDownload, cancelDownload, retryDownload,
  looksLikeDownloadUrl,
} from '@/lib/services/download-manager.service';
import { isKnownBlocked as isKnownBlockedUrl, getHostname } from '@/lib/known-blocked-hosts';

function isKnownBlocked(url: string): boolean {
  return isKnownBlockedUrl(url);
}

export function PowerBrowser({ window: osWindow }: { window: any }) {
  const { themeColor } = useThemeStore();
  const openWindow = useWindowStore((s) => s.openWindow);
  const addCustomWebApp = useWorkspaceStore((s) => s.addCustomWebApp);

  const {
    pinnedApps, tabs, activeTabId, sidebarVisible, focusMode, splitView, splitViewTarget,
    addPinnedApp, removePinnedApp, updatePinnedAppLastUrl,
    addTab, closeTab, setActiveTab, navigateTab,
    toggleSidebar, toggleFocusMode, toggleSplitView,
    addBookmark, removeBookmark, isBookmarked: checkIsBookmarked,
    loadPersisted, persist,
  } = useBrowserStore();

  const [inputUrl, setInputUrl] = useState('');
  const [splitUrl, setSplitUrl] = useState('https://duckduckgo.com/');
  const [splitInputUrl, setSplitInputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinUrl, setPinUrl] = useState('');
  const [pinTitle, setPinTitle] = useState('');
  const [searchEngine, setSearchEngine] = useState<'google' | 'duckduckgo' | 'bing'>('google');
  const [blockedTabs, setBlockedTabs] = useState<Set<string>>(new Set());
  const [proxyTabs, setProxyTabs] = useState<Set<string>>(new Set());
  const [extensionInstalled, setExtensionInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!(window as any).__CONTINUA_EXTENSION_ACTIVE__ ||
      !!document.getElementById('continua-extension-marker') ||
      document.documentElement.getAttribute('data-continua-extension') === 'active';
  });
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [initWait, setInitWait] = useState(true);
  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());
  const proxyIntercepts = useRef<Map<string, { doc: Document; handler: (e: MouseEvent) => void }>>(new Map());

  const downloads = useDownloadsStore((s) => s.downloads);
  const [showDownloads, setShowDownloads] = useState(false);
  const activeDownloadCount = downloads.filter(d => d.status === 'downloading' || d.status === 'queued').length;

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  useEffect(() => {
    loadPersisted();
  }, []);

  useEffect(() => {
    const checkActive = () => {
      if (typeof window === 'undefined') return false;
      return !!(window as any).__CONTINUA_EXTENSION_ACTIVE__ ||
        !!document.getElementById('continua-extension-marker') ||
        document.documentElement.getAttribute('data-continua-extension') === 'active';
    };

    if (checkActive()) {
      setExtensionInstalled(true);
    }
    const handler = () => setExtensionInstalled(true);
    const msgHandler = (e: MessageEvent) => {
      if (e.data && (e.data.type === 'continua-extension-ready' || e.data.source === 'continua-extension')) {
        setExtensionInstalled(true);
      }
    };
    window.addEventListener('continua-extension-ready', handler);
    window.addEventListener('message', msgHandler);
    
    // Give the content script up to 250ms to inject before falling back to proxy
    const timer = setTimeout(() => {
      setInitWait(false);
    }, 250);

    // Keep re-checking for a few seconds — the extension content script may
    // inject late. If it activates after the blocked fallback is showing, the
    // tab swaps to a native iframe.
    let polls = 0;
    const pollInterval = setInterval(() => {
      polls += 1;
      if (checkActive()) {
        setExtensionInstalled(true);
        clearInterval(pollInterval);
      } else if (polls >= 8) {
        clearInterval(pollInterval);
      }
    }, 300);

    return () => {
      window.removeEventListener('continua-extension-ready', handler);
      window.removeEventListener('message', msgHandler);
      clearTimeout(timer);
      clearInterval(pollInterval);
    };
  }, []);

  // Hydrate persisted downloads on mount.
  useEffect(() => {
    void useDownloadsStore.getState().loadPersisted();
  }, []);

  // Receive downloads captured by the extension content script inside
  // cross-origin frames (blocked sites rendered natively).
  useEffect(() => {
    const intercepts = proxyIntercepts.current;
    const handleMessage = (event: MessageEvent) => {
      if (event.source === window) return;
      const data = event.data as Record<string, unknown> | null;
      if (!data || data.source !== 'continua-extension' || data.type !== 'continua-download') return;

      if (data.blob instanceof ArrayBuffer) {
        void saveBlobDownload({
          blob: new Blob([data.blob], { type: typeof data.blobType === 'string' ? data.blobType : '' }),
          filename: typeof data.filename === 'string' ? data.filename : 'download',
          mimeType: typeof data.blobType === 'string' ? data.blobType : undefined,
          url: typeof data.url === 'string' ? data.url : undefined,
        });
      } else if (typeof data.url === 'string') {
        void startDownload(data.url, {
          filename: typeof data.filename === 'string' ? data.filename : undefined,
          mimeType: typeof data.mimeType === 'string' ? data.mimeType : undefined,
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      for (const { doc, handler } of intercepts.values()) {
        doc.removeEventListener('click', handler, true);
      }
      intercepts.clear();
    };
  }, []);

  // Attach a click interceptor to same-origin (proxy) iframes so file links
  // are captured into the OS instead of loading raw bytes in the frame.
  const attachProxyClickIntercept = (iframeEl: HTMLIFrameElement, tabId: string) => {
    const prev = proxyIntercepts.current.get(tabId);
    if (prev) {
      prev.doc.removeEventListener('click', prev.handler, true);
      proxyIntercepts.current.delete(tabId);
    }
    let doc: Document | null = null;
    try {
      doc = iframeEl.contentDocument;
    } catch {
      return;
    }
    if (!doc) return;
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.href || '';
      const proxyMatch = href.match(/[?&]url=([^&]+)/);
      if (!proxyMatch) return;
      let targetUrl = '';
      try {
        targetUrl = decodeURIComponent(proxyMatch[1]!);
      } catch {
        return;
      }
      if (!targetUrl || !(anchor.hasAttribute('download') || looksLikeDownloadUrl(targetUrl))) return;
      e.preventDefault();
      e.stopPropagation();
      void startDownload(targetUrl, { filename: anchor.getAttribute('download') || undefined });
    };
    doc.addEventListener('click', handler, true);
    proxyIntercepts.current.set(tabId, { doc, handler });
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeTab) setInputUrl(activeTab.url);
  }, [activeTab?.url, activeTabId]);

  // Reset split URL when closed
  useEffect(() => {
    if (!splitView) {
      setSplitUrl('https://duckduckgo.com/');
      setSplitInputUrl('');
    }
  }, [splitView]);

  // Persist tabs on change
  useEffect(() => {
    persist();
  }, [tabs, pinnedApps]);

  if (!activeTab) {
    return (
      <div className="w-full h-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans p-6">
        <Globe className="w-12 h-12 text-cyan-400 mb-3 opacity-80" />
        <h3 className="text-base font-bold text-white mb-1">No Tabs Open</h3>
        <p className="text-xs text-slate-400 mb-5">Open a new tab to start browsing the web.</p>
        <button
          onClick={() => addTab()}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" /> Open New Tab
        </button>
      </div>
    );
  }

  const isBookmarked = activeTab ? checkIsBookmarked(activeTab.url) : false;

  function getSmartUrl(rawUrl: string): string {
    if (rawUrl.includes('figma.com/file/') || rawUrl.includes('figma.com/design/')) {
      return `https://www.figma.com/embed?embed_host=continuaos&url=${encodeURIComponent(rawUrl)}`;
    }
    const ytMatch = rawUrl.match(/youtube\.com\/watch\?v=([^&]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const spMatch = rawUrl.match(/open\.spotify\.com\/(track|playlist|album)\/([^?]+)/);
    if (spMatch) return `https://open.spotify.com/embed/${spMatch[1]}/${spMatch[2]}`;
    return rawUrl;
  }
  
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
    setTimeout(() => setLoading(false), 10000); // safety fallback
    const smartUrl = getSmartUrl(finalUrl);
    navigateTab(activeTabId, smartUrl, '');
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
    setTimeout(() => setLoading(false), 10000); // safety fallback
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

    attachProxyClickIntercept(iframe, tabId);

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
    setLoading(false);
    setBlockedTabs(prev => new Set([...prev, tabId]));
  };

  const openExternal = (url: string) => {
    const width = 1200;
    const height = 800;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    window.open(url, '_blank', `popup=yes,width=${width},height=${height},left=${left},top=${top}`);
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
                    title="Pin this app inside Browser"
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (activeTab) {
                        const host = getHostname(activeTab.url);
                        const id = `web-${host.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`;
                        addCustomWebApp({
                          id,
                          title: activeTab.title || host,
                          url: activeTab.url,
                          iconImage: `https://www.google.com/s2/favicons?domain=${host}&sz=128`,
                        });
                        window.dispatchEvent(new CustomEvent('os:notify', {
                          detail: { title: 'Installed as App', description: `${activeTab.title || host} added to Launchpad`, type: 'success' },
                        }));
                      }
                    }}
                    className="hover:text-blue-600 hover:bg-blue-50 rounded p-1.5 transition-colors text-slate-500"
                    title="Install as OS App"
                  >
                    <Download className="w-4 h-4" />
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
                      onClick={() => setShowExtensionModal(true)}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold border transition-all",
                        extensionInstalled
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20 animate-pulse"
                      )}
                      title={extensionInstalled ? "Continua Extension Active (Bypassing X-Frame-Options)" : "Continua Extension Offline (Click to Install)"}
                    >
                      <Zap className={cn("w-3.5 h-3.5", extensionInstalled ? "fill-emerald-500 text-emerald-500" : "fill-amber-500 text-amber-500")} />
                      <span className="hidden sm:inline">{extensionInstalled ? 'Bridge Active' : 'Enable Extension'}</span>
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
                    <div className="relative">
                      <button
                        onClick={() => setShowDownloads(v => !v)}
                        className={cn("relative hover:text-black hover:bg-black/5 rounded p-1.5 transition-colors", showDownloads && "text-blue-500")}
                        title="Downloads — files you save stay inside ContinuaOS"
                      >
                        <FolderDown className="w-4 h-4" />
                        {activeDownloadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                            {activeDownloadCount}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              {loading && (
                <div className="h-0.5 w-full overflow-hidden" style={{ background: 'var(--os-border)' }}>
                  <div
                    className="h-full"
                    style={{
                      background: 'var(--os-primary, #00f0ff)',
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
                ) : blockedTabs.has(tab.id) ? (
                  <BlockedSiteFallback
                    url={tab.url}
                    onOpenExternal={openExternal}
                    onOpenExtensionModal={() => setShowExtensionModal(true)}
                    onTryProxy={() => {
                      setProxyTabs(prev => new Set([...prev, tab.id]));
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
                    {isTauri() ? (
                      <iframe
                        src={tab.url}
                        className="w-full h-full border-none bg-white absolute inset-0"
                        title={`Tab ${tab.id}`}
                        sandbox="allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox allow-same-origin"
                      />
                    ) : (
                      <>
                        {initWait ? (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm">
                             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                          </div>
                        ) : (
                          <iframe
                            ref={(el) => {
                              if (el) iframeRefs.current.set(tab.id, el);
                              else iframeRefs.current.delete(tab.id);
                            }}
                            src={(!extensionInstalled && (isKnownBlocked(tab.url) || proxyTabs.has(tab.id)) && tab.url.startsWith('http'))
                              ? `/api/proxy?url=${encodeURIComponent(tab.url)}`
                              : tab.url}
                            className="w-full h-full border-none bg-white absolute inset-0 z-0"
                            style={{ isolation: 'isolate' }}
                            title={`Tab ${tab.id}`}
                            sandbox="allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox allow-same-origin"
                            onLoad={() => handleIframeLoad(tab.id)}
                            onError={() => handleIframeError(tab.id)}
                          />
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Split View Panel */}
          {splitView && (
          <div className="w-1/2 border-l border-black/10 flex flex-col">
            <div className="h-10 flex items-center gap-2 px-3 border-b border-black/10 bg-slate-50 shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); if (splitInputUrl) setSplitUrl(splitInputUrl.startsWith('http') ? splitInputUrl : `https://${splitInputUrl}`); }} className="flex-1 flex items-center gap-2 bg-white border border-black/10 px-3 py-1 rounded-full text-sm">
                <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                <input value={splitInputUrl} onChange={e => setSplitInputUrl(e.target.value)} placeholder="Enter URL" className="flex-1 outline-none text-sm text-slate-700 bg-transparent" />
              </form>
              <button onClick={() => toggleSplitView()} className="p-1 rounded hover:bg-black/5 text-slate-400"><X className="w-3.5 h-3.5" /></button>
            </div>
            {isTauri() ? (
              <iframe
                src={splitUrl}
                className="flex-1 border-none bg-white"
                sandbox="allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox allow-same-origin"
              />
            ) : (
              <iframe
                src={!extensionInstalled && isKnownBlocked(splitUrl) && splitUrl.startsWith('http')
                  ? `/api/proxy?url=${encodeURIComponent(splitUrl)}`
                  : splitUrl}
                className="flex-1 border-none bg-white"
                sandbox="allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox allow-same-origin"
              />
            )}
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

      <ExtensionGuideModal
        isOpen={showExtensionModal}
        onClose={() => setShowExtensionModal(false)}
        extensionInstalled={extensionInstalled}
      />

      {showDownloads && (
        <DownloadsPanel
          downloads={downloads}
          onClose={() => setShowDownloads(false)}
          onOpenFolder={() => {
            setShowDownloads(false);
            openWindow('files', 'Downloads', { initialPath: 'Downloads' });
          }}
          onCancel={cancelDownload}
          onRetry={retryDownload}
          onRemove={(id) => useDownloadsStore.getState().removeDownload(id)}
        />
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

function DownloadsPanel({
  downloads,
  onClose,
  onOpenFolder,
  onCancel,
  onRetry,
  onRemove,
}: {
  downloads: DownloadItem[];
  onClose: () => void;
  onOpenFolder: () => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="absolute right-3 top-14 z-[120] w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <FolderDown className="w-4 h-4 text-slate-400" />
          Downloads
          {downloads.length > 0 && <span className="text-xs font-medium text-slate-400">{downloads.length}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onOpenFolder} title="Open Downloads folder" className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
            <FolderOpen className="w-4 h-4" />
          </button>
          <button onClick={onClose} title="Close" className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {downloads.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-slate-400">
            Nothing downloaded yet.
            <br />
            Files you download from the browser stay inside your OS.
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {downloads.map((d) => (
              <li key={d.id} className="px-3.5 py-2.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  {d.status === 'downloading' || d.status === 'queued' ? (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  ) : d.status === 'error' ? (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  ) : (
                    <Check className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-700 truncate" title={d.filename}>
                    {d.filename}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {d.status === 'downloading' ? (
                      d.totalBytes > 0 ? `Downloading… ${Math.round(d.progress)}%` : `Downloading… ${formatBytes(d.receivedBytes)}`
                    ) : d.status === 'queued' ? (
                      'Queued…'
                    ) : d.status === 'error' ? (
                      <span className="text-red-400">{d.error || 'Failed'}</span>
                    ) : (
                      formatBytes(d.receivedBytes)
                    )}
                  </div>
                  {d.status === 'downloading' && d.totalBytes > 0 && (
                    <div className="mt-1 h-1 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${d.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {d.status === 'done' && (
                    <button onClick={onOpenFolder} title="Open folder" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {(d.status === 'downloading' || d.status === 'queued') && (
                    <button onClick={() => onCancel(d.id)} title="Cancel" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {d.status === 'error' && (
                    <button onClick={() => onRetry(d.id)} title="Retry" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => onRemove(d.id)} title="Remove from list" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const QUICK_LINKS = [
  { label: 'ContinuaOS Docs', url: 'https://docs.continuaos.com', icon: 'A', color: 'bg-cyan-100 text-cyan-600' },
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
    const isDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(query) || query.startsWith('http');
    if (isDomain) {
      if (!query.startsWith('http')) finalUrl = `https://${query}`;
    } else if (query.toLowerCase().startsWith('wikipedia')) {
      const q = query.replace(/^wikipedia\s*/i, '').trim();
      finalUrl = q ? `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}` : `https://en.wikipedia.org`;
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
  onOpenExtensionModal,
}: {
  url: string;
  onOpenExternal: (url: string) => void;
  onTryProxy: () => void;
  onOpenExtensionModal?: () => void;
}) {
  const hostname = getHostname(url);
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-8 h-8 text-cyan-600" />
        </div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">
          Site Embedding Protected
        </h3>
        <p className="text-sm text-slate-500 mb-1">
          <span className="font-medium text-slate-700">{hostname}</span> requires header stripping via the Continua Chrome Extension.
        </p>
        <p className="text-xs text-slate-400 mb-6">
          Install the 1-click Continua Extension to bypass X-Frame-Options and load any website natively inside ContinuaOS.
        </p>
        <div className="flex flex-col gap-2.5">
          {onOpenExtensionModal && (
            <button
              onClick={onOpenExtensionModal}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-cyan-500/20"
            >
              <Zap className="w-4 h-4 fill-white" />
              Enable Continua Extension (15s Setup)
            </button>
          )}
          <button
            onClick={() => onOpenExternal(url)}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open as App Window
          </button>
          <button
            onClick={onTryProxy}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 text-slate-500 hover:text-slate-700 text-xs font-medium transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Try Loading Fallback Proxy
          </button>
          <div className="text-[10px] text-slate-400 mt-1">
            {url.length > 60 ? url.substring(0, 60) + '...' : url}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ExtensionGuideModal({
  isOpen,
  onClose,
  extensionInstalled,
}: {
  isOpen: boolean;
  onClose: () => void;
  extensionInstalled: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const folderPath = 'chrome-extension';
  const browser = getBrowserName();

  if (!isOpen) return null;

  const isFirefox = browser === 'firefox';
  const installSteps = isFirefox
    ? [
        'Open about:debugging#/runtime/this-firefox in Firefox.',
        'Click "Load Temporary Add-on..." and select the manifest.json file inside the chrome-extension folder.',
        'The extension (Continua Context Bridge) now appears under Temporary Extensions and strips framing headers in real time.',
      ]
    : [
        'Open chrome://extensions in Chrome, Brave, or Edge.',
        'Turn ON Developer mode in the top right corner.',
        'Click Load unpacked and select the chrome-extension folder in this project.',
      ];

  const handleCopyPath = () => {
    navigator.clipboard.writeText(folderPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Zap className="w-5 h-5 fill-cyan-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Continua Context Bridge Extension</h3>
              <p className="text-xs text-slate-400">Unlock native iframe embedding for Google, GitHub & YouTube</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {extensionInstalled ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400">
              <Check className="w-6 h-6 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-emerald-300">Extension is Active & Connected</h4>
                <p className="text-xs text-emerald-400/80">X-Frame-Options and CSP headers are automatically stripped for all web origins.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs leading-relaxed">
                Modern sites (Google, Notion, Figma) set security headers blocking standard iframe embeds. The Continua extension removes these headers in real time.
              </div>

              <div className="space-y-3">
                {installSteps.map((step, i) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">{i + 1}</div>
                    <div className="text-xs text-slate-300">
                      {step}
                      {i === 2 && !isFirefox && (
                        <div className="flex items-center gap-2 mt-2 p-2 bg-slate-950 border border-slate-800 rounded-lg">
                          <code className="font-mono text-xs text-cyan-300 flex-1">{folderPath}</code>
                          <button
                            onClick={handleCopyPath}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors"
                          >
                            {copied ? 'Copied!' : 'Copy Path'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className={cn("w-2 h-2 rounded-full animate-pulse", extensionInstalled ? "bg-emerald-400" : "bg-amber-400")} />
            <span className="text-slate-400">
              Status: <strong className={extensionInstalled ? "text-emerald-400" : "text-amber-400"}>{extensionInstalled ? 'Active' : 'Not Detected'}</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
