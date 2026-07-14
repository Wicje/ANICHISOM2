'use client';

import React from 'react';
import { useWindowStore } from '@/lib/stores/window.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';import { APP_MANIFEST } from '@/lib/app-manifest';
import { Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MissionControlProps {
  onClose: () => void;
}

export function MissionControl({ onClose }: MissionControlProps) {
  const wallpaper = useThemeStore((s) => s.wallpaper);
  const windows = useWindowStore((s) => s.windows);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  return (
    <div className="absolute inset-0 z-[240] bg-black/40 backdrop-blur-xl pointer-events-auto flex flex-col animate-in fade-in duration-200">
      <div className="h-48 bg-black/40 border-b border-white/10 flex items-center justify-center gap-10 px-8 py-6">
        {[0, 1, 2].map(wsIndex => (
          <button
            key={wsIndex}
            onClick={() => {
              setActiveWorkspace(wsIndex);
              onClose();
            }}
            className={cn(
              "relative w-64 h-full rounded-2xl border-2 overflow-hidden transition-all duration-300 group shadow-2xl",
              activeWorkspace === wsIndex ? "border-blue-500 scale-105 shadow-[0_0_30px_rgba(59,130,246,0.3)]" : "border-white/20 hover:border-white/50 hover:scale-105"
            )}
          >
            <div className="absolute inset-0 bg-cover bg-center opacity-60 group-hover:opacity-100 transition-opacity" style={{ backgroundImage: `url("${wallpaper}")` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-3 left-0 right-0 text-center font-bold text-white text-sm shadow-sm">
              Desktop {wsIndex + 1}
            </div>
          </button>
        ))}
      </div>
      <div className="flex-1 p-12 flex flex-wrap content-start gap-8 justify-center overflow-y-auto">
        {windows.filter(w => w.workspace === activeWorkspace || w.workspace === undefined).map(win => {
          const appEntry = APP_MANIFEST.find(a => a.id === win.appId);
          const Icon = appEntry?.icon || Folder;
          return (
            <button
              key={win.id}
              onClick={() => {
                focusWindow(win.id);
                onClose();
              }}
              className="relative w-72 h-48 bg-black/40 border border-white/20 rounded-2xl overflow-hidden hover:scale-105 hover:border-blue-400 transition-all duration-300 shadow-2xl flex flex-col group backdrop-blur-md"
            >
              <div className="h-10 bg-white/10 border-b border-white/10 flex items-center px-4 gap-3">
                <Icon className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-medium truncate">{win.title}</span>
              </div>
              <div className="flex-1 flex items-center justify-center group-hover:bg-white/5 transition-colors">
                <Icon className="w-20 h-20 text-white/20 group-hover:text-white/40 transition-colors" />
              </div>
            </button>
          );
        })}
        {windows.filter(w => w.workspace === activeWorkspace || w.workspace === undefined).length === 0 && (
          <div className="w-full text-center text-white/50 mt-32 text-2xl font-medium tracking-tight">No open windows on Desktop {activeWorkspace + 1}</div>
        )}
      </div>
    </div>
  );
}
