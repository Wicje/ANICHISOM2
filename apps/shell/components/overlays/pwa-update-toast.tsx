'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { audioSystem } from '@/lib/services/audio-engine';

export function PWAUpdateToast() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowUpdate(true);
        }

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(installingWorker);
              setShowUpdate(true);
            }
          });
        });
      } catch {}
    };

    handleServiceWorker();
  }, []);

  const handleApplyUpdate = () => {
    audioSystem.playClick();
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  return (
    <AnimatePresence>
      {showUpdate && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[99999] pointer-events-auto"
        >
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-neutral-900/90 text-white border border-white/20 shadow-2xl backdrop-blur-2xl">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-black shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-wide">ContinuaOS Update Ready</span>
              <span className="text-[10px] text-white/60">New features and improvements are ready</span>
            </div>
            <button
              onClick={handleApplyUpdate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 text-xs font-bold shadow-md transition-all ml-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload OS</span>
            </button>
            <button
              onClick={() => setShowUpdate(false)}
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
