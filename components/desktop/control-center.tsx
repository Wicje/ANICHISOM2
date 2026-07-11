'use client';

import React from 'react';
import { useWindowStore } from '@/lib/stores/window.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { Zap, Brain, Cloud, ShieldCheck } from 'lucide-react';

interface ControlCenterProps {
  onClose: () => void;
}

export function ControlCenter({ onClose }: ControlCenterProps) {
  const { openWindow } = useWindowStore();
  const { performanceMode, setPerformanceMode } = useThemeStore();

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-black/60 backdrop-blur-3xl shadow-2xl border-l border-white/10 z-[60] flex flex-col pointer-events-auto overflow-hidden animate-in slide-in-from-right">
      <div className="p-4 border-b border-white/10 flex justify-between items-center">
        <h3 className="text-white font-medium text-sm">Action Center</h3>
        <button onClick={onClose} className="text-white/50 hover:text-white">✕</button>
      </div>
      <div className="p-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPerformanceMode(performanceMode === 'heavy' ? 'light' : 'heavy')}
            className={`p-3 rounded-xl flex flex-col items-start gap-2 transition-colors ${
              performanceMode === 'heavy' ? "bg-amber-500 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            <Zap className="w-5 h-5" />
            <span className="text-xs font-medium">Heavy Mode</span>
          </button>
          <button
            onClick={() => {
              onClose();
              openWindow('ai-gateway', 'AI Gateway Settings');
            }}
            className="p-3 rounded-xl bg-emerald-500 text-white flex flex-col items-start gap-2 hover:bg-emerald-400 transition-colors"
          >
            <Brain className="w-5 h-5" />
            <span className="text-xs font-medium">AI Gateway</span>
          </button>
          <button className="p-3 rounded-xl bg-white/10 text-white flex flex-col items-start gap-2 opacity-50 cursor-not-allowed">
            <Cloud className="w-5 h-5" />
            <span className="text-xs font-medium">Cloud Sync</span>
          </button>
          <button className="p-3 rounded-xl bg-white/10 text-white flex flex-col items-start gap-2 opacity-50 cursor-not-allowed">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-medium">Sandbox</span>
          </button>
        </div>
        <div>
          <div className="text-white/50 text-xs font-bold uppercase tracking-wider mb-3">Notifications</div>
          <div className="flex flex-col gap-2">
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="text-white text-sm font-medium mb-1">AI Compilation Complete</div>
              <div className="text-white/60 text-xs">Moodboard layout has been regenerated.</div>
              <div className="text-white/40 text-[10px] mt-2">Just now</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="text-white text-sm font-medium mb-1">File Saved</div>
              <div className="text-white/60 text-xs">system_architecture.pdf was saved to Documents.</div>
              <div className="text-white/40 text-[10px] mt-2">2m ago</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
