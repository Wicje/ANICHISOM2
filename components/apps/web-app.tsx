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
