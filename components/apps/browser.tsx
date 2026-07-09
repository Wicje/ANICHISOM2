import React, { useState, useRef, useEffect, useCallback } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { ChevronLeft, ChevronRight, RotateCw, Shield, Search, Plus, X, Globe, Star, Bookmark, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StorageAdapter } from '@/lib/storage';

type Bookmark = {
  id: string;
  url: string;
  title: string;
};

type Tab = {
  id: string;
  url: string;
  title: string;
  loading: boolean;
  history: string[];
  historyIndex: number;
};

const DEFAULT_BOOKMARKS: Bookmark[] = [
  { id: 'b1', url: 'https://duckduckgo.com', title: 'DuckDuckGo' },
  { id: 'b2', url: 'https://github.com', title: 'GitHub' },
  { id: 'b3', url: 'https://figma.com', title: 'Figma' },
  { id: 'b4', url: 'https://vercel.com', title: 'Vercel' },
];

function getDomainTitle(urlStr: string): string {
  try {
    if (!urlStr) return 'New Tab';
    return new URL(urlStr).hostname.replace('www.', '');
  } catch { return urlStr || 'New Tab'; }
}

export function BrowserApp({ window: osWindow }: { window: OSWindow }) {
  const { themeColor, workspaceMode } = useOS();
  const storage = useRef(new StorageAdapter('browser', workspaceMode)).current;

  const initialUrl = osWindow.data?.url || 'https://duckduckgo.com/';
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', url: initialUrl, title: getDomainTitle(initialUrl), loading: false, history: [initialUrl], historyIndex: 0 }
  ]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(DEFAULT_BOOKMARKS);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  useEffect(() => {
    storage.get<Bookmark[]>('bookmarks').then(saved => {
      if (saved && saved.length > 0) setBookmarks(saved);
    });
  }, [storage]);

  useEffect(() => {
    setInputUrl(activeTab.url);
  }, [activeTabId, activeTab.url]);

  const isBookmarked = bookmarks.some(b => b.url === activeTab.url);

  const toggleBookmark = useCallback(() => {
    if (!activeTab.url) return;
    if (isBookmarked) {
      setBookmarks(prev => {
        const next = prev.filter(b => b.url !== activeTab.url);
        storage.set('bookmarks', next);
        return next;
      });
    } else {
      setBookmarks(prev => {
        const next = [...prev, { id: `bm-${Date.now()}`, url: activeTab.url, title: activeTab.title }];
        storage.set('bookmarks', next);
        return next;
      });
    }
  }, [activeTab.url, activeTab.title, isBookmarked, storage]);

  const navigateToUrl = useCallback((finalUrl: string) => {
    setTabs(prev => prev.map(t => {
      if (t.id === activeTabId) {
        const newHistory = t.history.slice(0, t.historyIndex + 1);
        newHistory.push(finalUrl);
        return { ...t, url: finalUrl, title: getDomainTitle(finalUrl), loading: true, history: newHistory, historyIndex: newHistory.length - 1 };
      }
      return t;
    }));
    setInputUrl(finalUrl);
  }, [activeTabId]);

  const navigate = (e: React.FormEvent) => {
    e.preventDefault();
    let finalUrl = inputUrl;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      if (finalUrl.includes('.') && !finalUrl.includes(' ')) {
        finalUrl = 'https://' + finalUrl;
      } else {
        finalUrl = 'https://duckduckgo.com/?q=' + encodeURIComponent(finalUrl);
      }
    }
    navigateToUrl(finalUrl);
  };

  const navigateBack = () => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab || tab.historyIndex <= 0) return;
    const newIndex = tab.historyIndex - 1;
    const newUrl = tab.history[newIndex];
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: newUrl, title: getDomainTitle(newUrl), historyIndex: newIndex } : t));
    setInputUrl(newUrl);
  };

  const navigateForward = () => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab || tab.historyIndex >= tab.history.length - 1) return;
    const newIndex = tab.historyIndex + 1;
    const newUrl = tab.history[newIndex];
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: newUrl, title: getDomainTitle(newUrl), historyIndex: newIndex } : t));
    setInputUrl(newUrl);
  };

  const reload = () => {
    const current = activeTab.url;
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: '', loading: true } : t));
    setTimeout(() => {
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: current } : t));
    }, 50);
  };

  const updateActiveTab = (updates: Partial<Tab>) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, ...updates } : t));
  };

  const newTab = () => {
    const id = crypto.randomUUID();
    const defaultUrl = 'https://duckduckgo.com/';
    setTabs(prev => [...prev, { id, url: defaultUrl, title: 'DuckDuckGo', loading: true, history: [defaultUrl], historyIndex: 0 }]);
    setActiveTabId(id);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const newTabs = tabs.filter(t => t.id !== id);
    if (activeTabId === id) {
      setActiveTabId(newTabs[0].id);
    }
    setTabs(newTabs);
  };

  const handleIframeLoad = (tabId: string) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, loading: false } : t));
  };

  const deleteBookmark = (bookmarkId: string) => {
    setBookmarks(prev => {
      const next = prev.filter(b => b.id !== bookmarkId);
      storage.set('bookmarks', next);
      return next;
    });
  };

  return (
    <div className="flex w-full h-full bg-[#111111] text-white font-sans overflow-hidden">

      {/* Sidebar (Arc Style) */}
      <div
        className={cn(
          "flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden shrink-0 bg-[#1c1c1e] border-r border-white/5",
          sidebarOpen ? "w-64" : "w-0 border-r-0"
        )}
      >
        {/* Navigation Controls */}
        <div className="p-3 pb-2 flex items-center gap-2">
          <button
            onClick={navigateBack}
            disabled={activeTab.historyIndex <= 0}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-white/60 hover:text-white"
            title="Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={navigateForward}
            disabled={activeTab.historyIndex >= activeTab.history.length - 1}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-white/60 hover:text-white"
            title="Forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={reload}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            title="Reload"
          >
            <RotateCw className={cn("w-4 h-4", activeTab.loading && "animate-spin")} />
          </button>
          <button
            onClick={toggleBookmark}
            className={cn(
              "p-1.5 rounded-lg hover:bg-white/10 transition-colors",
              isBookmarked ? "text-amber-400" : "text-white/60 hover:text-white"
            )}
            title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
          >
            <Star className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Address Bar Area */}
        <div className="px-3 pb-4">
          <form onSubmit={navigate} className="relative group">
             <div className="absolute left-3 top-1/2 -translate-y-1/2">
                {activeTab.loading ? (
                  <RotateCw className="w-3.5 h-3.5 text-white/40 animate-spin" />
                ) : (
                  <Shield className="w-3.5 h-3.5 text-white/40 group-focus-within:text-blue-500 transition-colors" />
                )}
             </div>
             <input
               type="text"
               value={inputUrl}
               onChange={(e) => setInputUrl(e.target.value)}
               className="w-full h-9 bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 text-[13px] outline-none focus:border-white/20 focus:bg-black/60 transition-all shadow-inner text-white/90 placeholder:text-white/30"
               placeholder="Search DuckDuckGo or enter url"
             />
          </form>
        </div>

        {/* Bookmarks Section */}
        <div className="px-3 pb-2">
          <div className="text-[10px] uppercase tracking-wider text-white/30 mb-2 px-1">Bookmarks</div>
          <div className="flex flex-col gap-0.5">
            {bookmarks.map(bm => (
              <div
                key={bm.id}
                className="group flex items-center justify-between px-2 py-1.5 rounded-lg text-white/60 hover:bg-white/5 hover:text-white cursor-pointer transition-colors"
                onClick={() => navigateToUrl(bm.url)}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Bookmark className="w-3 h-3 shrink-0" />
                  <span className="text-[13px] truncate">{bm.title}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteBookmark(bm.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/20 rounded text-white/70 hover:text-white transition-all shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="my-2 h-px bg-white/5 mx-3" />

        {/* Tabs List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1">
          {tabs.map(tab => (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={cn(
                "group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all",
                activeTabId === tab.id
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                 <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-white/5 border border-white/10">
                   {tab.url.includes('duckduckgo') ? (
                     <Search className="w-3 h-3 text-orange-400" />
                   ) : (
                     <Globe className="w-3 h-3 text-white/70" />
                   )}
                 </div>
                 <span className="text-[13px] font-medium truncate">{tab.title}</span>
              </div>
              <button
                onClick={(e) => closeTab(tab.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/20 rounded text-white/70 hover:text-white transition-all shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* New Tab Button */}
        <div className="px-2 pb-3">
          <button onClick={newTab} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <Plus className="w-4 h-4" />
            <span className="text-[13px]">New Tab</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 bg-white relative flex flex-col min-w-0">

        {/* Top Control Bar (Visible when sidebar closed) */}
        {!sidebarOpen && (
           <div className="absolute top-0 left-0 right-0 h-12 bg-white/90 backdrop-blur-md border-b border-black/10 flex items-center px-4 gap-3 z-10">
              <button onClick={navigateBack} disabled={activeTab.historyIndex <= 0} className="p-1 rounded hover:bg-black/5 disabled:opacity-30 transition-colors" title="Back">
                <ChevronLeft className="w-4 h-4 text-black/60" />
              </button>
              <button onClick={navigateForward} disabled={activeTab.historyIndex >= activeTab.history.length - 1} className="p-1 rounded hover:bg-black/5 disabled:opacity-30 transition-colors" title="Forward">
                <ChevronRight className="w-4 h-4 text-black/60" />
              </button>
              <button onClick={reload} className="p-1 rounded hover:bg-black/5 transition-colors" title="Reload">
                <RotateCw className={cn("w-4 h-4 text-black/60", activeTab.loading && "animate-spin")} />
              </button>
              <button onClick={toggleBookmark} className={cn("p-1 rounded hover:bg-black/5 transition-colors", isBookmarked ? "text-amber-500" : "text-black/40")} title={isBookmarked ? "Remove bookmark" : "Add bookmark"}>
                <Star className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} />
              </button>
              <form onSubmit={navigate} className="flex-1 max-w-xl mx-auto relative group">
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full h-8 bg-black/5 border border-black/10 rounded-lg pl-9 pr-4 text-[13px] text-black outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                />
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/40" />
              </form>
           </div>
        )}

        {/* Sidebar Toggle Handle */}
        <div
           className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-16 bg-black/10 hover:bg-blue-500/50 cursor-pointer rounded-r-lg z-20 transition-colors"
           onClick={() => setSidebarOpen(!sidebarOpen)}
           title="Toggle Sidebar"
        />

        {/* Iframes */}
        {tabs.map(tab => (
          <iframe
            key={tab.id}
            src={tab.url.startsWith('http') ? `/api/proxy?url=${encodeURIComponent(tab.url)}` : tab.url}
            className={cn("w-full h-full border-none", activeTabId === tab.id ? "block" : "hidden")}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            onLoad={() => handleIframeLoad(tab.id)}
          />
        ))}

        {/* Disclaimer */}
        <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md text-white text-[10px] p-2 rounded-lg shadow-xl flex justify-between items-center opacity-30 hover:opacity-100 transition-opacity pointer-events-none z-30 max-w-md">
           <span>Pages are proxied to bypass iframe restrictions. Complex web apps may still require native browser.</span>
           <button className="underline pointer-events-auto hover:text-blue-400 ml-4" onClick={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}>Dismiss</button>
        </div>
      </div>
    </div>
  );
}
