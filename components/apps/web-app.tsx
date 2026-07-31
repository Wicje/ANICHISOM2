'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { isTauri } from '@/lib/platform';

export default function WebApp({ window: osWindow }: { window: any }) {
  const { data } = osWindow;
  const PREDEFINED_URLS: Record<string, string> = {
    figma: 'https://figma.com',
    notion: 'https://notion.so',
    spotify: 'https://open.spotify.com',
    discord: 'https://discord.com/app',
    vscode: 'https://vscode.dev',
  };

  const url = data?.url || PREDEFINED_URLS[osWindow.appId] || 'https://duckduckgo.com';
  
  const [loading, setLoading] = useState(true);
  const [extensionInstalled, setExtensionInstalled] = useState(false);
  const [initWait, setInitWait] = useState(true);

  useEffect(() => {
    // Check if the Continua Extension is active
    if (typeof window !== 'undefined' && (window as any).__CONTINUA_EXTENSION_ACTIVE__) {
      setExtensionInstalled(true);
    }
    const handler = () => setExtensionInstalled(true);
    window.addEventListener('continua-extension-ready', handler);
    
    // Give the content script up to 250ms to inject before falling back to proxy
    const timer = setTimeout(() => {
      setInitWait(false);
    }, 250);

    const contextHandler = () => {
      window.dispatchEvent(new CustomEvent('os:context-response', {
        detail: {
          appId: osWindow.appId,
          context: `Web App Container viewing URL: ${url}\nExtension Active: ${extensionInstalled}`
        }
      }));
    };
    window.addEventListener('os:request-context', contextHandler);

    return () => {
      window.removeEventListener('continua-extension-ready', handler);
      window.removeEventListener('os:request-context', contextHandler);
      clearTimeout(timer);
    };
  }, [url, extensionInstalled, osWindow.appId]);

  // For native-feeling PWAs, we strip X-Frame-Options via extension or Tauri natively.
  // If we are on web without extension, we attempt the proxy as fallback (though complex sites might break).
  const isProxied = !extensionInstalled && !isTauri() && url.startsWith('http');
  const finalUrl = isProxied ? `/api/proxy?url=${encodeURIComponent(url)}` : url;

  if (initWait && !extensionInstalled && !isTauri()) {
    return (
      <div className="w-full h-full relative bg-slate-900 text-slate-100 flex flex-col items-center justify-center font-sans p-6 gap-3">
        <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
        <span className="text-xs font-medium text-slate-400">Initializing app view...</span>
      </div>
    );
  }

  if (osWindow.appId === 'spotify' && spotifyView === 'card') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-neutral-900 via-stone-900 to-zinc-950 relative overflow-hidden select-none">
        {/* Background Ambient Glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/40 via-transparent to-transparent pointer-events-none" />

        {/* High-Art Glassmorphism Card (ref_spotify.jpg inspired) */}
        <div className="w-80 h-96 rounded-[32px] bg-neutral-900/80 border border-white/15 shadow-2xl p-5 flex flex-col justify-between relative backdrop-blur-2xl text-white">
          
          {/* Top Info Bar */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
              <div className="w-5 h-5 rounded-full bg-slate-700 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop" alt="avatar" className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-bold tracking-wide">Terence Howard</span>
              <span className="text-[10px] text-white/50">@terenceh</span>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setLiked(!liked)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <span className={liked ? "text-rose-500" : "text-white/60"}>❤️</span>
              </button>
            </div>
          </div>

          {/* Center Album Art */}
          <div className="absolute inset-x-5 top-16 bottom-24 rounded-2xl overflow-hidden shadow-2xl group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop" 
              alt="Track Cover" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          </div>

          {/* Bottom Audio Controls */}
          <div className="z-10 flex flex-col gap-3">
            {/* Progress Slider */}
            <div className="flex flex-col gap-1">
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-full appearance-none outline-none accent-white cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-white/60 font-mono">
                <span>0:52</span>
                <span>-1:21</span>
              </div>
            </div>

            {/* Play / Pause / Skip */}
            <div className="flex items-center justify-center gap-6">
              <button className="text-white/70 hover:text-white transition-colors">⏮️</button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 rounded-full bg-white text-black font-bold flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
              <button className="text-white/70 hover:text-white transition-colors">⏭️</button>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setSpotifyView('web')} 
          className="mt-4 text-xs font-bold text-emerald-400 hover:underline cursor-pointer z-10"
        >
          Switch to Full Spotify Web Player ↗
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-white flex flex-col" style={{ zIndex: 1, isolation: 'isolate' }}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm text-slate-200">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      )}
      
      <iframe
        src={finalUrl}
        className="w-full h-full flex-1 border-none bg-white relative z-0"
        title={osWindow.title}
        sandbox={isProxied ? "allow-scripts allow-forms allow-popups allow-modals allow-downloads" : "allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"}
        onLoad={() => setLoading(false)}
        onError={() => setLoading(false)}
      />
    </div>
  );
}
