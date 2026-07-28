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
    vscode: 'https://stackblitz.com',
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

    return () => {
      window.removeEventListener('continua-extension-ready', handler);
      clearTimeout(timer);
    };
  }, []);

  // For native-feeling PWAs, we strip X-Frame-Options via extension or Tauri natively.
  // If we are on web without extension, we attempt the proxy as fallback (though complex sites might break).
  const finalUrl = extensionInstalled || isTauri() 
    ? url 
    : (url.startsWith('http') ? `/api/proxy?url=${encodeURIComponent(url)}` : url);

  if (initWait && !extensionInstalled && !isTauri()) {
    // Waiting for potential extension injection to prevent double-load
    return (
      <div className="w-full h-full relative bg-white flex flex-col items-center justify-center">
         <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-white flex flex-col" style={{ zIndex: 1, isolation: 'isolate' }}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}
      
      <iframe
        src={finalUrl}
        className="w-full h-full flex-1 border-none bg-white relative z-0"
        title={osWindow.title}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
        onLoad={() => setLoading(false)}
        onError={() => setLoading(false)}
      />
    </div>
  );
}
