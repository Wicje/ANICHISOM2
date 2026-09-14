'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Download, X, Smartphone, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

type DeferredPrompt = {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPrompt | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already running as installed PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone) {
      setIsInstalled(true);
      return;
    }

    // Check if already dismissed in this session
    const dismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as unknown as DeferredPrompt);
      // Show banner after a short delay
      setTimeout(() => setShowBanner(true), 3000);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      setShowBanner(false);
    } catch {
      // Install failed silently
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  }, []);

  // Don't show if installed or standalone
  if (isInstalled || isStandalone) return null;

  return (
    <>
      {/* Install Banner */}
      {showBanner && deferredPrompt && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-4 flex items-center gap-4 max-w-md">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-600 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Install ContinuaOS</p>
              <p className="text-xs text-white/50 mt-0.5">Add to home screen for the full experience</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstall}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="p-1.5 text-white/40 hover:text-white/70 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Standalone install button for use in settings or other UI locations.
 */
export function PWAInstallButton({ className }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPrompt | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (standalone) { setIsInstalled(true); return; }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as unknown as DeferredPrompt);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleClick = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  if (isInstalled) {
    return (
      <div className={cn('flex items-center gap-2 text-green-400 text-xs', className)}>
        <Monitor className="w-3.5 h-3.5" />
        Installed as app
      </div>
    );
  }

  if (!deferredPrompt) return null;

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-colors',
        className,
      )}
    >
      <Smartphone className="w-3.5 h-3.5" />
      Install ContinuaOS
    </button>
  );
}
