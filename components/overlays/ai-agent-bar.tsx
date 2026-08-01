'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Terminal, ArrowRight, X, Command, Check, Activity, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWindowActions } from '@/lib/hooks/use-window-actions';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useFocusStore } from '@/lib/stores/focus.store';
import { audioSystem } from '@/lib/services/audio-engine';

export function AIAgentBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [executing, setExecuting] = useState(false);
  const [responseMsg, setResponseMsg] = useState<string | null>(null);

  const { openWindow } = useWindowActions();
  const { colorMode, setColorMode } = useThemeStore();
  const { toggle: toggleFocus } = useFocusStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setIsOpen(prev => !prev);
        audioSystem.playClick();
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExecute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setExecuting(true);
    setResponseMsg(null);
    audioSystem.playClick();

    setTimeout(() => {
      const q = query.toLowerCase();
      let result = 'Command executed successfully.';

      if (q.includes('focus') || q.includes('do not disturb')) {
        toggleFocus();
        result = 'Focus session toggled.';
      } else if (q.includes('dark') || q.includes('light') || q.includes('theme')) {
        setColorMode(colorMode === 'dark' ? 'light' : 'dark');
        result = `Color mode switched to ${colorMode === 'dark' ? 'light' : 'dark'}.`;
      } else if (q.includes('terminal') || q.includes('cmd')) {
        openWindow('terminal', 'Terminal');
        result = 'Opened Terminal.';
      } else if (q.includes('code') || q.includes('editor')) {
        openWindow('code', 'Code Editor');
        result = 'Opened Code Editor.';
      } else if (q.includes('settings')) {
        openWindow('settings', 'Settings');
        result = 'Opened Settings.';
      } else if (q.includes('spotify') || q.includes('music')) {
        openWindow('spotify', 'Spotify Player');
        result = 'Opened Spotify Player.';
      } else {
        result = `Executed AI Intent: "${query}" across Continua Kernel.`;
      }

      setResponseMsg(result);
      setExecuting(false);
      setQuery('');
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'AI Agent Action', description: result, type: 'success' }
      }));
    }, 450);
  };

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9500] w-full max-w-xl px-4 select-none animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-slate-950/90 border border-[#10F4A0]/50 shadow-[0_20px_60px_rgba(16,244,160,0.15)] rounded-2xl p-3 backdrop-blur-3xl text-white flex flex-col gap-3">
        <form onSubmit={handleExecute} className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-[#10F4A0] animate-pulse shrink-0" />
          <input
            type="text"
            placeholder="Ask AI Agent to control OS, open apps, summarize, or run commands... (Cmd+Shift+A)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-white/40 outline-none font-sans"
            autoFocus
          />
          <button
            type="submit"
            disabled={executing}
            className="p-2 rounded-xl bg-[#10F4A0]/20 hover:bg-[#10F4A0]/30 text-[#10F4A0] transition-colors border border-[#10F4A0]/40 disabled:opacity-50"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </form>

        {responseMsg && (
          <div className="text-xs text-[#10F4A0] bg-[#10F4A0]/10 border border-[#10F4A0]/30 rounded-xl p-2.5 flex items-center gap-2 font-mono">
            <Check className="w-4 h-4 shrink-0" />
            <span>{responseMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
