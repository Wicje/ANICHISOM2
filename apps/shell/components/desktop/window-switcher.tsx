'use client';

import React from 'react';
import { useWindowStore } from '@/lib/stores/window.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { APP_MANIFEST } from '@/lib/app-manifest';
import { Folder, X, Minus, AppWindow, Command } from 'lucide-react';
import { AppIconInline } from '@/components/ui/app-icon';
import { cn } from '@/lib/utils';

interface WindowSwitcherProps {
  switcherIndex: number;
}

export function WindowSwitcher({ switcherIndex }: WindowSwitcherProps) {
  const windows = useWindowStore((s) => s.windows);
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const activeWindows = windows.filter(w => w.workspace === activeWorkspace || w.workspace === undefined);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/50 backdrop-blur-md pointer-events-auto select-none">
      <div className="bg-[var(--os-glass-bg)] border border-[var(--os-border)] backdrop-blur-2xl p-6 rounded-3xl shadow-2xl flex flex-col gap-6 items-center max-w-4xl max-h-[80vh] overflow-hidden">
        
        {/* Switcher Card List */}
        <div className="flex gap-4 items-center flex-wrap justify-center p-2">
          {activeWindows.map((win, idx) => {
            const appEntry = APP_MANIFEST.find(a => a.id === win.appId);
            const isSelected = switcherIndex === idx;

            return (
              <div
                key={win.id}
                className={cn(
                  "flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-200 min-w-[110px] max-w-[130px] text-center border relative group",
                  isSelected
                    ? "bg-white/15 border-[var(--os-primary)] scale-110 shadow-2xl shadow-[var(--os-primary)]/20 ring-1 ring-[var(--os-primary)]/50"
                    : "border-transparent opacity-60 hover:opacity-90 hover:bg-white/5"
                )}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center relative">
                  <AppIconInline icon={appEntry?.icon || AppWindow} iconImage={appEntry?.iconImage} size={48} className="drop-shadow-lg" />
                  {win.isMinimized && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400/90 ring-2 ring-black flex items-center justify-center text-[8px] font-bold text-black" title="Minimized">
                      -
                    </span>
                  )}
                </div>
                <div className="flex flex-col w-full">
                  <span className="text-[12px] font-semibold text-white truncate w-full" title={win.title}>
                    {win.title}
                  </span>
                  <span className="text-[10px] text-[var(--os-text-muted)] truncate w-full">
                    {appEntry?.title || win.appId}
                  </span>
                </div>
              </div>
            );
          })}

          {activeWindows.length === 0 && (
            <div className="text-white/50 text-sm py-8">No open applications</div>
          )}
        </div>

        {/* Hotkey Helper Footer */}
        {activeWindows.length > 0 && (
          <div className="flex items-center gap-4 text-[11px] font-mono text-[var(--os-text-muted)] border-t border-[var(--os-border)] pt-3 px-4">
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">⇥</kbd> Cycle</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">Q</kbd> Quit</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">H</kbd> Hide</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">↵</kbd> Switch</span>
          </div>
        )}
      </div>
    </div>
  );
}
