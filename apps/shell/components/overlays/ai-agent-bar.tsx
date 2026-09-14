'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Terminal, ArrowRight, X, Command, Check, Activity, Zap, Copy, Bot, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWindowActions } from '@/lib/hooks/use-window-actions';
import { useWindowStore } from '@/lib/stores/window.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useFocusStore } from '@/lib/stores/focus.store';
import { audioSystem } from '@/lib/services/audio-engine';
import { slashSkills } from '@/lib/skills/slash-skills';
import { getAiProvider } from '@/lib/ai-providers/ai-provider-factory';
import { FS } from '@/lib/fs';

export function AIAgentBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [executing, setExecuting] = useState(false);
  const [responseMsg, setResponseMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { openWindow } = useWindowActions();
  const { colorMode, setColorMode } = useThemeStore();
  const { toggle: toggleFocus, enable: enableFocus } = useFocusStore();

  const windows = useWindowStore((s) => s.windows);
  const highestZIndex = useWindowStore((s) => s.highestZIndex);

  // Active focused window detection for screen awareness
  const activeWindow = useMemo(() => {
    return windows.find(w => w.zIndex >= highestZIndex && !w.isMinimized);
  }, [windows, highestZIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Space, Ctrl+Space, or Cmd+Shift+A
      if ((e.metaKey || e.ctrlKey) && (e.code === 'Space' || (e.shiftKey && (e.key === 'A' || e.key === 'a')))) {
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

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawQuery = query.trim();
    if (!rawQuery || executing) return;
    setExecuting(true);
    setResponseMsg('Analyzing workspace context & executing...');
    audioSystem.playClick();

    try {
      if (rawQuery.startsWith('/')) {
        const skillRes = await slashSkills.execute(rawQuery);
        setResponseMsg(skillRes);
        window.dispatchEvent(new CustomEvent('os:notify', {
          detail: { title: 'Slash Skill Executed', description: skillRes.slice(0, 100), type: 'success' }
        }));
      } else {
        const q = rawQuery.toLowerCase();
        if (q.includes('deep work') || q.includes('focus mode')) {
          enableFocus(45, 'deep-work');
          setResponseMsg('Deep Work Focus session enabled (45 min). Inactive windows dimmed.');
        } else if (q.includes('filming') || q.includes('presentation mode')) {
          enableFocus(30, 'filming');
          setResponseMsg('Filming Mode activated. Distractions silenced.');
        } else if (q.includes('focus') || q.includes('do not disturb')) {
          toggleFocus();
          setResponseMsg('Focus session toggled.');
        } else if (q.includes('dark') || q.includes('light') || q.includes('theme')) {
          const nextMode = colorMode === 'dark' ? 'light' : 'dark';
          setColorMode(nextMode);
          setResponseMsg(`Color mode switched to ${nextMode}.`);
        } else if (q.includes('open terminal') || q === 'terminal') {
          openWindow('terminal', 'Terminal');
          setResponseMsg('Opened Terminal.');
        } else if (q.includes('open code') || q === 'code editor') {
          openWindow('code', 'Code Editor');
          setResponseMsg('Opened Code Editor.');
        } else if (q.includes('open settings') || q === 'settings') {
          openWindow('settings', 'Settings');
          setResponseMsg('Opened Settings.');
        } else if (q.includes('open music') || q === 'spotify') {
          openWindow('spotify', 'Spotify Player');
          setResponseMsg('Opened Spotify Player.');
        } else {
          // Route to AI provider with screen context
          const screenContext = activeWindow 
            ? `[Focused Window: ${activeWindow.title} (App ID: ${activeWindow.appId})]` 
            : `[Desktop Workspace: ${windows.length} open windows]`;

          const aiProvider = getAiProvider();
          const response = await aiProvider.chat({
            messages: [
              { 
                role: 'system', 
                content: `You are the ContinuaOS Omnibar Copilot. Current screen context: ${screenContext}. Answer concisely and help the user control the OS or understand their workspace.` 
              },
              { role: 'user', content: rawQuery }
            ]
          });
          const text = response.text || 'Action completed.';
          setResponseMsg(text);
          window.dispatchEvent(new CustomEvent('os:notify', {
            detail: { title: 'Omnibar Copilot', description: text.slice(0, 90), type: 'success' }
          }));
        }
      }
    } catch (err: any) {
      setResponseMsg(`Agent Error: ${err.message || 'Execution failed'}`);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9500] w-full max-w-2xl px-4 select-none animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-slate-950/95 border border-[#10F4A0]/40 shadow-[0_20px_70px_rgba(16,244,160,0.18)] rounded-3xl p-4 backdrop-blur-3xl text-white flex flex-col gap-3">
        {/* Context Chip Header */}
        <div className="flex items-center justify-between px-1 text-[11px] text-white/60">
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#10F4A0]" />
            <span className="font-bold text-white tracking-wide">Continua Omnibar Copilot</span>
            <span className="text-white/30">•</span>
            <span className="font-mono text-emerald-400">
              {activeWindow ? `Focused: ${activeWindow.title}` : 'Workspace Idle'}
            </span>
          </div>
          <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded-full text-white/50">
            Cmd+Space
          </span>
        </div>

        <form onSubmit={handleExecute} className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-[#10F4A0]/20 border border-[#10F4A0]/40 flex items-center justify-center text-[#10F4A0] shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder={activeWindow ? `Ask about ${activeWindow.title} or control OS...` : "Ask AI Copilot to control OS, open apps, or summarize..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-white/40 outline-none font-sans"
            autoFocus
          />
          <button
            type="submit"
            disabled={executing}
            className="px-3.5 py-2 rounded-2xl bg-[#10F4A0] hover:bg-[#10F4A0]/90 text-slate-950 font-bold text-xs transition-all shadow-md shadow-[#10F4A0]/20 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
          >
            <span>Run</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-2xl bg-white/5 hover:bg-white/15 text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </form>

        {responseMsg && (
          <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3 flex items-start justify-between gap-2 font-mono max-h-48 overflow-y-auto">
            <div className="flex items-start gap-2 flex-1">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="whitespace-pre-wrap leading-relaxed">{responseMsg}</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(responseMsg);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white shrink-0 transition-colors"
              title="Copy"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
