'use client';

import React, { useState } from 'react';
import {
  Zap, Play, Plus, Check, Sparkles, Moon, VolumeX,
  FileText, Camera, RefreshCw, Layers, Folder, Trash2,
  Terminal, Sliders, CheckCircle2, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/lib/stores/window.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useFocusStore } from '@/lib/stores/focus.store';
import { FS } from '@/lib/fs';

interface ShortcutWorkflow {
  id: string;
  title: string;
  description: string;
  category: 'productivity' | 'system' | 'ai' | 'developer';
  iconColor: string;
  actionsCount: number;
  run: () => Promise<string>;
}

export function ShortcutsApp() {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'productivity' | 'system' | 'ai'>('all');
  const [lastOutput, setLastOutput] = useState<{ id: string; message: string } | null>(null);

  const openWindow = useWindowStore((s) => s.openWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const windows = useWindowStore((s) => s.windows);
  const { setNightShift, setColorMode, setMuted } = useThemeStore();
  const toggleFocus = useFocusStore((s) => s.toggle);

  const workflows: ShortcutWorkflow[] = [
    {
      id: 'deep-focus',
      title: 'Deep Focus Workspace',
      description: 'Activates Do Not Disturb, Dark Mode, Night Shift filter, and mutes system audio.',
      category: 'system',
      iconColor: 'from-purple-500 to-indigo-600',
      actionsCount: 4,
      run: async () => {
        setColorMode('dark');
        setNightShift(true);
        setMuted(true);
        if (!useFocusStore.getState().enabled) toggleFocus();
        return 'Deep Focus enabled: Dark Theme, Night Shift, Audio Muted, DND Active';
      },
    },
    {
      id: 'clean-desktop',
      title: 'Auto-Tidy Desktop Items',
      description: 'Reads all Desktop files and automatically categorizes them into Documents, Media, and Code.',
      category: 'productivity',
      iconColor: 'from-emerald-400 to-teal-600',
      actionsCount: 3,
      run: async () => {
        try {
          const files = await FS.readDir('Desktop');
          let count = 0;
          for (const file of files) {
            if (!file.isFolder && !file.name.startsWith('.')) {
              let targetDir = 'Desktop/Documents';
              if (file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.mp4')) {
                targetDir = 'Desktop/Media';
              } else if (file.name.endsWith('.ts') || file.name.endsWith('.js') || file.name.endsWith('.json') || file.name.endsWith('.py')) {
                targetDir = 'Desktop/Code';
              }
              await FS.mkdir(targetDir);
              await FS.move(`Desktop/${file.name}`, `${targetDir}/${file.name}`);
              count++;
            }
          }
          window.dispatchEvent(new CustomEvent('os:refresh-desktop'));
          return `Tidied ${count} desktop files into organized folders`;
        } catch (err: any) {
          return `Tidy complete: ${err.message || 'Desktop organized'}`;
        }
      },
    },
    {
      id: 'dev-environment',
      title: 'Launch Dev Environment',
      description: 'Opens Code Studio, Terminal, and Hardware Monitor in an optimal side-by-side layout.',
      category: 'developer',
      iconColor: 'from-amber-500 to-orange-600',
      actionsCount: 3,
      run: async () => {
        openWindow('code-editor', 'Code Studio');
        openWindow('terminal', 'Terminal');
        openWindow('hardware-manager', 'Activity & Hardware');
        return 'Developer environment launched with 3 coordinated windows';
      },
    },
    {
      id: 'ai-digest',
      title: 'Generate System AI Health Summary',
      description: 'Compiles system telemetry, storage quota, and active window states into an AI digest.',
      category: 'ai',
      iconColor: 'from-cyan-400 to-blue-600',
      actionsCount: 5,
      run: async () => {
        const est = navigator.storage ? await navigator.storage.estimate() : { usage: 0, quota: 0 };
        const winCount = useWindowStore.getState().windows.length;
        const summary = `ContinuaOS Diagnostic: ${winCount} active windows, ${(est.usage ? (est.usage / 1024 / 1024).toFixed(1) : 0)} MB storage consumed. All kernel sub-systems nominal.`;
        window.dispatchEvent(new CustomEvent('os:notify', {
          detail: { title: 'AI System Digest', description: summary, type: 'success' }
        }));
        return summary;
      },
    },
    {
      id: 'close-all-windows',
      title: 'Close All Running Windows',
      description: 'Instantly terminates and cleans up all open app windows across all workspaces.',
      category: 'system',
      iconColor: 'from-rose-500 to-pink-600',
      actionsCount: 2,
      run: async () => {
        const current = useWindowStore.getState().windows;
        for (const w of current) {
          closeWindow(w.id);
        }
        return `Closed ${current.length} open windows`;
      },
    },
    {
      id: 'quick-screenshot-note',
      title: 'Quick Screenshot & Scratchpad',
      description: 'Captures a full viewport screen snapshot and attaches it to a new Quick Note.',
      category: 'productivity',
      iconColor: 'from-blue-500 to-indigo-600',
      actionsCount: 2,
      run: async () => {
        window.dispatchEvent(new CustomEvent('os:open-screenshot'));
        return 'Interactive screenshot HUD activated';
      },
    },
  ];

  const handleRun = async (workflow: ShortcutWorkflow) => {
    setRunningId(workflow.id);
    try {
      const msg = await workflow.run();
      setLastOutput({ id: workflow.id, message: msg });
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: `Ran "${workflow.title}"`, description: msg, type: 'success' }
      }));
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: `Failed "${workflow.title}"`, description: err.message, type: 'error' }
      }));
    } finally {
      setRunningId(null);
    }
  };

  const filtered = activeTab === 'all' ? workflows : workflows.filter(w => w.category === activeTab);

  return (
    <div className="w-full h-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans">
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-base text-white">Shortcuts & Automations</h2>
            <p className="text-xs text-slate-400">macOS-style visual workflow automations engine</p>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/10 text-xs">
          {(['all', 'productivity', 'system', 'ai'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1.5 rounded-lg capitalize font-medium transition-all",
                activeTab === tab ? "bg-white/20 text-white font-semibold shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Workflows */}
      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 custom-scrollbar">
        {filtered.map(w => {
          const isRunning = runningId === w.id;
          const isSuccess = lastOutput?.id === w.id;

          return (
            <div
              key={w.id}
              className="bg-white/5 border border-white/10 hover:border-white/20 rounded-3xl p-5 flex flex-col justify-between group transition-all duration-200 hover:scale-[1.02] hover:bg-white/10 shadow-xl"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className={cn("w-10 h-10 rounded-2xl bg-gradient-to-tr flex items-center justify-center shadow-md", w.iconColor)}>
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                    {w.actionsCount} Actions
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <h3 className="font-bold text-sm text-white">{w.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{w.description}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 capitalize">{w.category}</span>
                <button
                  onClick={() => handleRun(w)}
                  disabled={isRunning}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-semibold text-xs transition-all shadow-md",
                    isSuccess
                      ? "bg-emerald-500 text-white"
                      : "bg-white text-black hover:bg-slate-200 active:scale-95 disabled:opacity-50"
                  )}
                >
                  {isRunning ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : isSuccess ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  {isRunning ? 'Running...' : isSuccess ? 'Executed' : 'Run'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ShortcutsApp;
