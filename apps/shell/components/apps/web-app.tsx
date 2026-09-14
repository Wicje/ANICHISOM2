'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Heart, SkipBack, Pause, Play, SkipForward, ExternalLink, Zap, X, Check, ShieldAlert, Globe, Download, Copy, RefreshCw } from 'lucide-react';
import { isTauri, getBrowserName } from '@/lib/platform';
import { cn } from '@/lib/utils';
import { isCatalogItemKnownBlocked } from '@/lib/known-blocked-hosts';
import { WEB_APP_CATALOG } from '@/lib/web-app-catalog';

function isKnownBlocked(url: string): boolean {
  return isCatalogItemKnownBlocked(url);
}

export default function WebApp({ window: osWindow }: { window: any }) {
  const { data } = osWindow;
  const catalogItem = WEB_APP_CATALOG.find(app => app.id === osWindow.appId || app.id === data?.appId);

  const PREDEFINED_URLS: Record<string, string> = {
    figma: 'https://www.figma.com',
    spotify: 'https://open.spotify.com',
    youtube: 'https://www.youtube.com/embed?listType=search&list=',
    canva: 'https://www.canva.com',
    linear: 'https://linear.app',
  };

  const url = data?.url || catalogItem?.url || PREDEFINED_URLS[osWindow.appId] || 'https://duckduckgo.com';
  
  const [loading, setLoading] = useState(true);
  const [iframeFailed, setIframeFailed] = useState(false);
  const [extensionInstalled, setExtensionInstalled] = useState(
    () =>
      typeof window !== 'undefined' &&
      (!!(window as any).__CONTINUA_EXTENSION_ACTIVE__ ||
        !!document.getElementById('continua-extension-marker'))
  );
  const [initWait, setInitWait] = useState(catalogItem?.isDirectEmbed ? false : true);
  const [showGuide, setShowGuide] = useState(false);
  const [proxyOptIn, setProxyOptIn] = useState(false);
  const [spotifyView, setSpotifyView] = useState<'card' | 'web'>('card');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(35);
  const [liked, setLiked] = useState(true);

  useEffect(() => {
    const detectExtension = () =>
      typeof window !== 'undefined' &&
      (!!(window as any).__CONTINUA_EXTENSION_ACTIVE__ ||
        !!document.getElementById('continua-extension-marker'));

    const handler = () => setExtensionInstalled(true);
    window.addEventListener('continua-extension-ready', handler);

    // Give the content script up to 250ms to inject before falling back to proxy
    const timer = setTimeout(() => {
      setInitWait(false);
    }, 250);

    // Keep re-checking for a few seconds — the extension content script may
    // inject later than the initial window. If it activates after we have
    // already fallen back to the proxy, the iframe swaps to native embedding.
    let polls = 0;
    const pollInterval = setInterval(() => {
      polls += 1;
      if (detectExtension()) {
        setExtensionInstalled(true);
        clearInterval(pollInterval);
      } else if (polls >= 8) {
        clearInterval(pollInterval);
      }
    }, 300);

    // If the iframe is still loading after 10s, it's likely blocked by CSP/X-Frame-Options.
    // Show the extension guide with an "Open in Browser" fallback.
    let failTimer: ReturnType<typeof setTimeout> | undefined;
    if (!catalogItem?.isDirectEmbed && !isTauri()) {
      failTimer = setTimeout(() => {
        if (!detectExtension()) {
          setIframeFailed(true);
        }
      }, 10000);
    }

    const contextHandler = () => {
      window.dispatchEvent(new CustomEvent('os:context-response', {
        detail: {
          appId: osWindow.appId,
          context: `Web App Container viewing URL: ${url}\nExtension Active: ${detectExtension()}`
        }
      }));
    };
    window.addEventListener('os:request-context', contextHandler);

    return () => {
      window.removeEventListener('continua-extension-ready', handler);
      window.removeEventListener('os:request-context', contextHandler);
      clearTimeout(timer);
      clearInterval(pollInterval);
      if (failTimer) clearTimeout(failTimer);
    };
  }, [url, osWindow.appId, catalogItem?.isDirectEmbed]);

  // For native-feeling PWAs, we strip X-Frame-Options via extension or Tauri natively.
  // When no extension is detected, we automatically default to Live In-OS Stream Mode (via /api/proxy)
  // so the user is NEVER blocked by an error screen!
  const isDirect = !!catalogItem?.isDirectEmbed;
  const isProxied = !isDirect && !extensionInstalled && !isTauri() && url.startsWith('http');
  const finalUrl = isDirect ? url : isProxied ? `/api/proxy?url=${encodeURIComponent(url)}` : url;

  if (initWait && !extensionInstalled && !isTauri()) {
    return (
      <div className="w-full h-full relative bg-[var(--os-bg)] text-[var(--os-text)] flex flex-col items-center justify-center font-sans p-6 gap-3 select-none">
        <Loader2 className="w-7 h-7 text-[var(--os-primary)] animate-spin" />
        <span className="text-xs font-semibold text-[var(--os-text-muted)]">Connecting to {catalogItem?.name || osWindow.title || 'App'}...</span>
      </div>
    );
  }

  if (osWindow.appId === 'spotify' && spotifyView === 'card') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-slate-950/90 backdrop-blur-3xl relative overflow-hidden select-none">
        {/* Background Ambient Blur Glow */}
        <div className="absolute -inset-10 bg-gradient-to-br from-emerald-600/20 via-teal-900/10 to-emerald-900/20 blur-3xl pointer-events-none" />

        {/* High-Art Glassmorphism System Overlay Card */}
        <div className="w-full max-w-[340px] h-[400px] rounded-[36px] bg-neutral-900/80 border border-white/20 shadow-[0_30px_70px_rgba(0,0,0,0.8)] p-5 flex flex-col justify-between relative backdrop-blur-2xl text-white contain-layout">
          
          {/* Top Info Bar */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
              <div className="w-5 h-5 rounded-full bg-slate-700 overflow-hidden ring-1 ring-white/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop" alt="avatar" className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-bold tracking-wide text-slate-100">Terence Howard</span>
              <span className="text-[10px] text-slate-400 font-mono">@terenceh</span>
            </div>

            <button 
              onClick={() => setLiked(!liked)} 
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-colors"
            >
              <Heart className={cn("w-4 h-4 transition-colors", liked ? "fill-rose-500 text-rose-500" : "text-white/60")} />
            </button>
          </div>

          {/* Center Cover Artwork */}
          <div className="absolute inset-x-5 top-16 bottom-28 rounded-2xl overflow-hidden shadow-2xl group border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop" 
              alt="Track Cover" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 text-left">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block font-mono text-[9px]">Now Playing</span>
              <span className="text-sm font-black text-white truncate block">High Art Studio Session</span>
            </div>
          </div>

          {/* Bottom Audio Controls */}
          <div className="z-10 flex flex-col gap-3.5">
            {/* Progress Slider */}
            <div className="flex flex-col gap-1.5">
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-full appearance-none outline-none accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-white/50 font-mono">
                <span>0:52</span>
                <span>-1:21</span>
              </div>
            </div>

            {/* Play / Pause / Skip (Vector Icons) */}
            <div className="flex items-center justify-center gap-6">
              <button className="p-2 text-white/70 hover:text-white transition-colors cursor-pointer">
                <SkipBack className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {
                  const nextPlaying = !isPlaying;
                  setIsPlaying(nextPlaying);
                  window.dispatchEvent(new CustomEvent('os:spotify-track-change', {
                    detail: { title: 'High Art Studio Session', artist: 'Terence Howard', isPlaying: nextPlaying }
                  }));
                }}
                className="w-12 h-12 rounded-full bg-white text-slate-950 font-bold flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-slate-950" /> : <Play className="w-5 h-5 fill-slate-950 ml-0.5" />}
              </button>
              <button className="p-2 text-white/70 hover:text-white transition-colors cursor-pointer">
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setSpotifyView('web')} 
          className="mt-3 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer z-10 flex items-center gap-1"
        >
          <span>Full Spotify Web Player</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    );
  }

  useEffect(() => {
    const reloadHandler = (e: any) => {
      if (!e.detail?.appId || e.detail.appId === osWindow.appId) {
        setLoading(true);
        const iframe = document.querySelector(`iframe[title="${osWindow.title}"]`) as HTMLIFrameElement;
        if (iframe) iframe.src = finalUrl;
      }
    };
    window.addEventListener('os:reload-webapp', reloadHandler);
    return () => window.removeEventListener('os:reload-webapp', reloadHandler);
  }, [osWindow.appId, osWindow.title, finalUrl]);

  return (
    <div className="w-full h-full relative bg-white flex flex-col overflow-hidden" style={{ zIndex: 1, isolation: 'isolate' }}>
      {loading && !iframeFailed && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm text-slate-200">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      )}

      {iframeFailed && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/90 backdrop-blur-md">
          <div className="text-center max-w-sm p-6 space-y-4">
            <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Unable to Load in-App View</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                This app requires a real browser environment and cannot be embedded. 
                Install the Continua Browser Extension for native iframe support, or open it in an external browser tab.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowGuide(true)}
                className="px-4 py-2 text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" /> Install Extension
              </button>
              <button
                onClick={() => window.open(url, '_blank')}
                className="px-4 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open in Browser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pristine Full-Bleed Third-Party App Viewport (Tools managed via 4th Titlebar Circle) */}
      <iframe
        src={finalUrl}
        className="w-full h-full flex-1 border-none bg-white relative z-0"
        title={osWindow.title}
        sandbox={isProxied ? "allow-scripts allow-forms allow-popups allow-modals allow-downloads" : "allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"}
        onLoad={() => setLoading(false)}
        onError={() => setLoading(false)}
      />

      {showGuide && (
        <ExtensionGuideModal
          url={url}
          extensionInstalled={extensionInstalled}
          onClose={() => setShowGuide(false)}
        />
      )}
    </div>
  );
}

function ExtensionGuideModal({
  url,
  extensionInstalled,
  onClose,
}: {
  url: string;
  extensionInstalled: boolean;
  onClose: () => void;
}) {
  const browser = getBrowserName();
  const isFirefox = browser === 'firefox';
  const [copied, setCopied] = useState(false);

  const downloadUrl = isFirefox 
    ? '/api/extension/download?format=xpi' 
    : '/api/extension/download?format=zip';

  const handleCopyFolder = async () => {
    try {
      await navigator.clipboard.writeText('chrome-extension');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[var(--os-surface)] text-[var(--os-text)] rounded-3xl border border-[var(--os-border)] shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[var(--os-border)] flex items-center justify-between bg-[var(--os-surface-dim)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[var(--os-primary)]/15 text-[var(--os-primary)] border border-[var(--os-primary)]/30">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--os-text)]">Continua Context Bridge Extension</h3>
              <p className="text-xs text-[var(--os-text-muted)]">Zero-friction iframe embedding &amp; context sync</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--os-text-muted)] hover:text-[var(--os-text)] hover:bg-[var(--os-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {extensionInstalled ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400">
              <Check className="w-6 h-6 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-emerald-300">Extension is Active &amp; Connected</h4>
                <p className="text-xs text-emerald-400/80">Framing restrictions are stripped in real time. Reload this window if the page still fails to load.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[var(--os-primary)]/10 border border-[var(--os-primary)]/20 text-[var(--os-primary)] text-xs leading-relaxed">
                Sites like Notion and Figma enforce strict framing headers. The Continua extension removes them instantly so they run as native in-OS desktop apps.
              </div>

              {/* 1-Click Automated Download Card */}
              <div className="bg-[var(--os-surface-dim)] border border-[var(--os-border)] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[var(--os-text)]">1-Click Package Download</div>
                    <div className="text-[10px] text-[var(--os-text-muted)]">Detected browser: <strong className="capitalize text-[var(--os-primary)]">{browser}</strong></div>
                  </div>
                  <a
                    href={downloadUrl}
                    download={isFirefox ? "continua-context-bridge.xpi" : "continua-context-bridge.zip"}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--os-primary)] hover:brightness-110 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Download {isFirefox ? '.XPI' : '.ZIP'}
                  </a>
                </div>

                <div className="pt-2 border-t border-[var(--os-border)] flex items-center justify-between text-[11px] text-[var(--os-text-muted)]">
                  <span>Target directory: <code className="text-[10px] font-mono text-[var(--os-text)]">chrome-extension/</code></span>
                  <button 
                    onClick={handleCopyFolder}
                    className="flex items-center gap-1 text-[10px] text-[var(--os-primary)] hover:underline font-semibold"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? 'Copied' : 'Copy Path'}
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="text-xs font-bold text-[var(--os-text)] uppercase tracking-wider">Quick Setup (15 Seconds)</div>
                {isFirefox ? (
                  <div className="space-y-3">
                    <ol className="space-y-2 text-xs text-[var(--os-text-muted)] list-decimal list-inside leading-relaxed">
                      <li>Click <strong className="text-[var(--os-text)]">Download .XPI</strong> above (saves to your PC Downloads).</li>
                      <li>In a new Firefox tab, open <code className="text-[11px] font-mono text-[var(--os-primary)] bg-[var(--os-surface)] px-1.5 py-0.5 rounded border border-[var(--os-border)]">about:addons</code> (or <code className="text-[11px] font-mono text-[var(--os-primary)] bg-[var(--os-surface)] px-1.5 py-0.5 rounded border border-[var(--os-border)]">about:debugging#/runtime/this-firefox</code>).</li>
                      <li>Click the ⚙️ <strong className="text-[var(--os-text)]">Gear icon</strong> at the top right &rarr; select <strong className="text-[var(--os-text)]">"Install Add-on From File..."</strong> (or "Load Temporary Add-on").</li>
                      <li>Select the downloaded <code className="text-[10px] text-[var(--os-text)] font-mono">continua-context-bridge.xpi</code> file.</li>
                    </ol>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText('about:addons');
                            window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Copied', description: 'Copied "about:addons" to clipboard. Paste in a new browser tab.', type: 'info' } }));
                          } catch {}
                        }}
                        className="px-3 py-1.5 bg-[var(--os-surface)] hover:bg-[var(--os-hover)] text-[var(--os-text)] text-xs rounded-xl border border-[var(--os-border)] font-semibold transition-all flex items-center gap-1.5"
                      >
                        <Copy className="w-3 h-3 text-[var(--os-primary)]" /> Copy "about:addons"
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText('about:debugging#/runtime/this-firefox');
                            window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Copied', description: 'Copied "about:debugging" to clipboard. Paste in a new browser tab.', type: 'info' } }));
                          } catch {}
                        }}
                        className="px-3 py-1.5 bg-[var(--os-surface)] hover:bg-[var(--os-hover)] text-[var(--os-text)] text-xs rounded-xl border border-[var(--os-border)] font-semibold transition-all flex items-center gap-1.5"
                      >
                        <Copy className="w-3 h-3 text-[var(--os-primary)]" /> Copy "about:debugging"
                      </button>
                    </div>
                  </div>
                ) : (
                  <ol className="space-y-2 text-xs text-[var(--os-text-muted)] list-decimal list-inside leading-relaxed">
                    <li>Download &amp; unzip the package, or locate <code className="text-[10px] text-[var(--os-text)]">chrome-extension/</code>.</li>
                    <li>Open <code className="text-[10px] text-[var(--os-primary)]">chrome://extensions</code> (or <code className="text-[10px] text-[var(--os-primary)]">brave://extensions</code>) and toggle <strong className="text-[var(--os-text)]">Developer mode</strong> ON.</li>
                    <li>Click <strong className="text-[var(--os-text)]">Load unpacked</strong> and select the folder.</li>
                  </ol>
                )}
              </div>

              <button
                onClick={() => window.open(url, '_blank')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-[var(--os-surface-dim)] hover:bg-[var(--os-hover)] text-[var(--os-text)] rounded-xl border border-[var(--os-border)] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Or open this app in an external browser tab
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[var(--os-border)] bg-[var(--os-surface-dim)] flex items-center justify-between">
          <span className={cn("flex items-center gap-2 text-xs font-semibold", extensionInstalled ? "text-emerald-400" : "text-amber-400")}>
            <span className={cn("w-2 h-2 rounded-full animate-pulse", extensionInstalled ? "bg-emerald-400" : "bg-amber-400")} />
            {extensionInstalled ? 'Bridge Active' : 'Extension Not Detected'}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-[var(--os-surface)] hover:bg-[var(--os-hover)] text-[var(--os-text)] border border-[var(--os-border)] rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
