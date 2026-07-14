'use client';

import React from 'react';
import { useWindowStore } from '@/lib/stores/window.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { APP_MANIFEST } from '@/lib/app-manifest';
import { Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WindowSwitcherProps {
  switcherIndex: number;
}

export function WindowSwitcher({ switcherIndex }: WindowSwitcherProps) {
  const windows = useWindowStore((s) => s.windows);
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);

  return (
    <div className="absolute inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-auto">
      <div className="bg-black/80 border border-white/20 p-8 rounded-3xl shadow-2xl flex gap-6 items-center flex-wrap max-w-4xl justify-center">
        {windows.filter(w => w.workspace === activeWorkspace || w.workspace === undefined).map((win, idx) => {
          const appEntry = APP_MANIFEST.find(a => a.id === win.appId);
          const Icon = appEntry?.icon || Folder;
          return (
            <div key={win.id} className={cn("flex flex-col items-center gap-4 p-5 rounded-2xl transition-all duration-200", switcherIndex === idx ? "bg-white/20 scale-110 shadow-xl" : "opacity-50 hover:opacity-80")}>
              <Icon className="w-14 h-14 text-white" />
              <span className="text-white text-sm font-medium tracking-wide">{win.title}</span>
            </div>
          );
        })}
        {windows.filter(w => w.workspace === activeWorkspace || w.workspace === undefined).length === 0 && (
          <div className="text-white/50 text-sm">No open windows</div>
        )}
      </div>
    </div>
  );
}
