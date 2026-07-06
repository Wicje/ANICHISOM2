'use client';

import React, { useState, useEffect, useRef } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { ArrowLeft, ArrowRight, RotateCw, Home, Lock, ExternalLink, Search, Maximize2, Minimize2, Download, Plus, X, Star, Bookmark } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type BrowserTab = {
  id: string;
  url: string;
  title: string;
  history: string[];
  historyIndex: number;
};

export function MiniBrowser({ window }: { window: OSWindow }) {
  const { performanceMode, updateWindowData, maximizeWindow } = useOS();

  // Tab State
  const [tabs, setTabs] = useState<BrowserTab[]>(
    window.data?.tabs || [
      { id: '1', url: window.data?.url || '', title: 'New Tab', history: [window.data?.url || ''], historyIndex: 0 }
    ]
  );
  const [activeTabId, setActiveTabId] = useState<string>(window.data?.activeTabId || tabs[0].id);
  const [isFocusMode, setIsFocusMode] = useState(window.data?.isFocusMode || false);
  
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const [inputUrl, setInputUrl] = useState(activeTab.url);

  // Keep input bar in sync when switching tabs or history changes
  useEffect(() => {
    setInputUrl(activeTab.url);
  }, [activeTab.url, activeTabId]);

  // Context Memory: Sync tabs to global window state
  useEffect(() => {
    updateWindowData(window.id, { tabs, activeTabId });
  }, [tabs, activeTabId, window.id, updateWindowData]);

  const updateActiveTab = (updates: Partial<BrowserTab>) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, ...updates } : t));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl) return;
    
    let finalUrl = inputUrl;
    
    // Check if it's a domain-like string (e.g. example.com)
    const isDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(inputUrl) || inputUrl.startsWith('http');
    
    if (isDomain) {
      if (!inputUrl.startsWith('http')) {
        finalUrl = `https://${inputUrl}`;
        setInputUrl(finalUrl);
      }
    } else {
      // It's a search query. Use Google.
      finalUrl = `https://www.google.com/search?q=${encodeURIComponent(inputUrl)}&igu=1`;
    }
    
    // Navigate
    const newHistory = activeTab.history.slice(0, activeTab.historyIndex + 1);
    newHistory.push(finalUrl);
    
    updateActiveTab({ 
      url: finalUrl, 
      title: getDomainTitle(finalUrl),
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  };

  const getDomainTitle = (urlStr: string) => {
    try {
      if (!urlStr) return 'New Tab';
      const hostname = new URL(urlStr).hostname;
      return hostname.replace('www.', '');
    } catch {
      return 'Search';
    }
  };

  const navigateBack = () => {
    if (activeTab.historyIndex > 0) {
      const newIndex = activeTab.historyIndex - 1;
      updateActiveTab({ url: activeTab.history[newIndex], historyIndex: newIndex });
    }
  };

  const navigateForward = () => {
    if (activeTab.historyIndex < activeTab.history.length - 1) {
      const newIndex = activeTab.historyIndex + 1;
      updateActiveTab({ url: activeTab.history[newIndex], historyIndex: newIndex });
    }
  };

  const reload = () => {
    // Force iframe reload by updating URL with a dummy param briefly or just updating state
    const current = activeTab.url;
    updateActiveTab({ url: '' });
    setTimeout(() => updateActiveTab({ url: current }), 50);
  };

  const addNewTab = () => {
    const newId = crypto.randomUUID();
    setTabs(prev => [...prev, { id: newId, url: '', title: 'New Tab', history: [''], historyIndex: 0 }]);
    setActiveTabId(newId);
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      // If closing last tab, just reset it
      setTabs([{ id: crypto.randomUUID(), url: '', title: 'New Tab', history: [''], historyIndex: 0 }]);
      return;
    }
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const toggleFocusMode = () => {
    const nextMode = !isFocusMode;
    setIsFocusMode(nextMode);
    updateWindowData(window.id, { isFocusMode: nextMode });
    
    if (nextMode && !window.isMaximized) {
      maximizeWindow(window.id);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white text-black font-sans relative group/browser">
      {/* Floating Unfocus Button (Visible only in Focus Mode) */}
      {isFocusMode && (
        <button 
          onClick={toggleFocusMode}
          className="absolute top-4 right-4 z-[100] bg-black/80 hover:bg-black text-white p-2 rounded-full shadow-2xl backdrop-blur transition-all opacity-0 group-hover/browser:opacity-100"
          title="Exit Focus Mode"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
      )}

      {/* Tab Bar */}
      {!isFocusMode && (
        <div className="h-10 bg-slate-200 flex items-end px-2 pt-2 gap-1 overflow-x-auto shrink-0 custom-scrollbar">
          {tabs.map(tab => (
            <div 
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={cn(
                "group flex items-center justify-between min-w-[120px] max-w-[200px] h-8 px-3 rounded-t-lg text-xs transition-colors cursor-pointer border border-b-0 select-none",
                activeTabId === tab.id 
                  ? "bg-slate-50 border-black/10 text-black shadow-[0_4px_0_0_#f8fafc]" 
                  : "bg-transparent border-transparent text-slate-500 hover:bg-slate-300"
              )}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                 {tab.url ? (
                    <img src={`https://www.google.com/s2/favicons?domain=${tab.url}`} alt="" className="w-3.5 h-3.5 shrink-0 grayscale opacity-70" onError={(e) => e.currentTarget.style.display = 'none'} />
                 ) : (
                    <Search className="w-3 h-3 shrink-0" />
                 )}
                 <span className="truncate">{tab.title}</span>
              </div>
              <button 
                onClick={(e) => closeTab(e, tab.id)}
                className={cn("p-1 rounded-full hover:bg-black/10 ml-2 transition-colors", activeTabId === tab.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button onClick={addNewTab} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-300 rounded-t-lg transition-colors ml-1">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Browser Chrome & Address Bar */}
      {!isFocusMode && (
        <div className="flex flex-col border-b border-black/10 bg-slate-50 shrink-0 z-10 transition-all shadow-sm">
          <div className="h-12 flex items-center justify-between px-4 gap-4">
            <div className="flex items-center gap-2 text-slate-500">
              <button disabled={activeTab.historyIndex <= 0} onClick={navigateBack} className="p-1.5 rounded-full hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button disabled={activeTab.historyIndex >= activeTab.history.length - 1} onClick={navigateForward} className="p-1.5 rounded-full hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={reload} className="p-1.5 rounded-full hover:bg-black/5 transition-colors ml-1">
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
            
            <form 
              onSubmit={handleSubmit}
              className="flex-1 max-w-2xl mx-auto flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-black/10 focus-within:border-black/30 focus-within:shadow-sm transition-all"
            >
              {activeTab.url && !activeTab.url.includes('search?q=') ? <Lock className="w-3 h-3 text-emerald-600 shrink-0" /> : <Search className="w-3 h-3 text-slate-400 shrink-0" />}
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Search Google or enter web address"
                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700"
              />
              <button type="button" className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                 <Star className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="flex items-center gap-2 text-slate-500">
              <button className="hover:text-black hover:bg-black/5 rounded p-1.5 transition-colors" title="Download to Files">
                <Download className="w-4 h-4" />
              </button>
              <button className="hover:text-black hover:bg-black/5 rounded p-1.5 transition-colors" title="Focus Mode" onClick={toggleFocusMode}>
                <Maximize2 className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-slate-300 mx-1" />
              {activeTab.url && (
                <a href={activeTab.url} target="_blank" rel="noopener noreferrer" className="hover:text-black hover:bg-black/5 rounded p-1.5 transition-colors" title="Open in new window">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Bookmarks Bar */}
          <div className="h-8 bg-slate-50 px-4 flex items-center gap-4 text-xs font-medium text-slate-600 overflow-x-auto border-t border-black/5">
             <button onClick={() => updateActiveTab({ url: 'https://github.com' })} className="flex items-center gap-1.5 hover:bg-black/5 px-2 py-1 rounded transition-colors"><Bookmark className="w-3 h-3 text-slate-400"/> GitHub</button>
             <button onClick={() => updateActiveTab({ url: 'https://figma.com' })} className="flex items-center gap-1.5 hover:bg-black/5 px-2 py-1 rounded transition-colors"><Bookmark className="w-3 h-3 text-slate-400"/> Figma</button>
             <button onClick={() => updateActiveTab({ url: 'https://vercel.com' })} className="flex items-center gap-1.5 hover:bg-black/5 px-2 py-1 rounded transition-colors"><Bookmark className="w-3 h-3 text-slate-400"/> Vercel</button>
             <button onClick={() => updateActiveTab({ url: 'https://news.ycombinator.com' })} className="flex items-center gap-1.5 hover:bg-black/5 px-2 py-1 rounded transition-colors"><Bookmark className="w-3 h-3 text-slate-400"/> HackerNews</button>
          </div>
        </div>
      )}

      {/* Browser Content Layers */}
      <div className="flex-1 bg-slate-100 relative overflow-hidden">
        {tabs.map(tab => (
          <div 
            key={tab.id} 
            className={cn(
              "absolute inset-0 flex flex-col transition-opacity duration-200",
              activeTabId === tab.id ? "opacity-100 z-10" : "opacity-0 pointer-events-none -z-10"
            )}
          >
           {!tab.url ? (
       <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white relative z-10 overflow-y-auto">
         {window.data?.projectId === 'nike-campaign' && (
           <div className="max-w-4xl w-full flex flex-col gap-6 pt-12">
             <div className="w-12 h-12 bg-black mb-4"></div>
             <h1 className="font-sans text-5xl font-black uppercase tracking-tighter">Force 40th <br/>Anniversary</h1>
             <p className="text-xl text-slate-500 font-serif italic mb-8 max-w-xl">
               Celebrating four decades of culture. A live preview of the interactive campaign landing page.
             </p>
             <div className="w-full aspect-video bg-slate-100 rounded-xl overflow-hidden relative group">
               <Image src="https://picsum.photos/seed/nike/1000/600" fill className="object-cover" alt="Hero" />
               <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex items-end">
                 <button className="bg-white text-black px-6 py-2 font-bold uppercase rounded-full text-xs">Buy Now</button>
               </div>
             </div>
           </div>
         )}
         {window.data?.projectId === 'tesla-redesign' && (
           <div className="max-w-4xl w-full flex flex-col gap-6 pt-12 text-center items-center">
             <div className="text-red-600 font-bold tracking-widest uppercase mb-4 text-xl">TESLA</div>
             <h1 className="font-sans text-4xl font-extralight tracking-tight text-slate-900">Model OS Concept UI</h1>
             <div className="w-full h-96 bg-black rounded-3xl mt-8 flex px-8 py-6 gap-6 relative shadow-2xl shadow-black/20">
               <div className="w-64 h-full border border-white/10 rounded-2xl flex flex-col p-4 bg-white/5">
                 <div className="text-white font-mono text-sm">68° / Auto</div>
               </div>
               <div className="flex-1 h-full border border-white/10 rounded-2xl p-4 bg-white/5 relative overflow-hidden">
                 <Image src="https://picsum.photos/seed/map/800/600" fill className="opacity-50 object-cover rounded-xl" alt="Map" />
               </div>
             </div>
           </div>
         )}
         {!['nike-campaign', 'tesla-redesign'].includes(window.data?.projectId) && (
             <div className="max-w-3xl w-full h-full flex flex-col pt-12 relative z-10">
               <h1 className="text-4xl font-display font-medium tracking-tight mb-6">{window.data?.projectId ? `Project Live Preview: ${window.data.projectId}` : 'Research Index _ 01'}</h1>
               <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                 An aggregation of visual references, structural concepts, and thematic logic for upcoming campaigns. 
                 Start by searching Google or entering a URL above. Note: some sites block being embedded.
               </p>
               
               <div className="grid grid-cols-2 gap-8">
                 <div className="aspect-[4/3] bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 overflow-hidden relative group">
                   <Image src="https://picsum.photos/seed/design1/800/600" fill className="object-cover brightness-95 group-hover:scale-105 transition-transform duration-700" alt="Reference 1" />
                   <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity">
                     Ref: Brutalist typography
                   </div>
                 </div>
                 <div className="aspect-[4/3] bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 overflow-hidden relative group">
                   <Image src="https://picsum.photos/seed/design2/800/600" fill className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt="Reference 2" />
                   <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity">
                     Ref: Glassmorphism layout
                   </div>
                 </div>
               </div>
             </div>
         )}
       </div>
         ) : (
           <div className="w-full h-full relative">
              {/* Overlay message if sites block iframes via headers */}
             {tab.url && ['figma.com', 'framer.com', 'github.com', 'x.com', 'twitter.com', 'linkedin.com', 'claude.ai', 'youtube.com'].some(domain => {
               try {
                 const hostname = new URL(tab.url).hostname;
                 return hostname === domain || hostname.endsWith(`.${domain}`);
               } catch (e) {
                 return false;
               }
             }) ? (
               <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-8 text-center">
                 <Lock className="w-12 h-12 text-slate-400 mb-6" />
                 <h2 className="text-2xl font-semibold mb-2">Web App Requires Native Tab</h2>
                 <p className="text-slate-500 max-w-md mb-8">
                   For security and session persistence (X-Frame-Options), this site must run in a native browser context. Your OS will remember the URL and session state natively.
                 </p>
                 <a href={tab.url} target="_blank" rel="noopener noreferrer" className="bg-black text-white px-6 py-3 rounded-full flex items-center gap-2 hover:bg-slate-800 transition-colors">
                   Open {new URL(tab.url).hostname} <ExternalLink className="w-4 h-4" />
                 </a>
               </div>
             ) : (
               <iframe 
                 src={tab.url} 
                 className="w-full h-full border-none bg-white absolute inset-0 z-20" 
                 title={`Browser Tab ${tab.id}`}
                 sandbox="allow-scripts allow-same-origin allow-forms allow-popups" 
                 loading={performanceMode === 'light' ? 'lazy' : 'eager'}
               />
             )}
           </div>
         )}
          </div>
        ))}
      </div>
    </div>
  );
}
