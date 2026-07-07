import React, { useState, useRef, useEffect } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { ChevronLeft, ChevronRight, RotateCw, Shield, Search, Plus, X, Globe, Star, Command } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = {
  id: string;
  url: string;
  title: string;
  loading: boolean;
};

export function BrowserApp({ window: osWindow }: { window: OSWindow }) {
  const { themeColor } = useOS();
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', url: osWindow.data?.url || 'https://duckduckgo.com/', title: 'DuckDuckGo', loading: false }
  ]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [inputUrl, setInputUrl] = useState(tabs[0].url);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setInputUrl(activeTab.url);
  }, [activeTabId, activeTab.url]);

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
    
    setTabs(prev => prev.map(t => {
      if (t.id === activeTabId) {
        return { ...t, url: finalUrl, title: finalUrl, loading: true };
      }
      return t;
    }));
    setInputUrl(finalUrl);
  };

  const newTab = () => {
    const id = crypto.randomUUID();
    setTabs(prev => [...prev, { id, url: 'https://duckduckgo.com/', title: 'New Tab', loading: true }]);
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

  return (
    <div className="flex w-full h-full bg-[#111111] text-white font-sans overflow-hidden">
      
      {/* Sidebar (Arc Style) */}
      <div 
        className={cn(
          "flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden shrink-0 bg-[#1c1c1e] border-r border-white/5",
          sidebarOpen ? "w-64" : "w-0 border-r-0"
        )}
      >
        {/* Address Bar Area */}
        <div className="p-3 pb-4">
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

        {/* Pinned / Favorites */}
        <div className="px-4 py-2 flex items-center justify-between">
           <div className="flex items-center gap-3 text-white/50">
             <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/20 hover:scale-105 transition-transform cursor-pointer shadow-sm">
                <Globe className="w-4 h-4" />
             </div>
             <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/20 hover:scale-105 transition-transform cursor-pointer shadow-sm">
                <Star className="w-4 h-4" />
             </div>
             <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/20 hover:scale-105 transition-transform cursor-pointer shadow-sm">
                <Command className="w-4 h-4" />
             </div>
           </div>
           <button onClick={newTab} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
              <Plus className="w-4 h-4" />
           </button>
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
      </div>

      {/* Main View Area */}
      <div className="flex-1 bg-white relative flex flex-col min-w-0">
        
        {/* Top Control Bar (Visible when sidebar closed) */}
        {!sidebarOpen && (
           <div className="absolute top-0 left-0 right-0 h-12 bg-white/90 backdrop-blur-md border-b border-black/10 flex items-center px-4 gap-4 z-10">
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
            src={tab.url}
            className={cn("w-full h-full border-none", activeTabId === tab.id ? "block" : "hidden")}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            onLoad={() => handleIframeLoad(tab.id)}
          />
        ))}

        {/* Disclaimer */}
        <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md text-white text-[10px] p-2 rounded-lg shadow-xl flex justify-between items-center opacity-30 hover:opacity-100 transition-opacity pointer-events-none z-30 max-w-md">
           <span>Note: Some sites block embedded viewing (X-Frame-Options). Search uses DuckDuckGo.</span>
           <button className="underline pointer-events-auto hover:text-blue-400 ml-4" onClick={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}>Dismiss</button>
        </div>
      </div>
    </div>
  );
}
