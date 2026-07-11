'use client';

import React from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useWindowStore } from '@/lib/stores/window.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { APP_MANIFEST } from '@/lib/app-manifest';
import { getAllPlugins, isPluginActive } from '@/lib/plugin-registry';

interface LaunchpadProps {
  onClose: () => void;
}

export function Launchpad({ onClose }: LaunchpadProps) {
  const { currentUser } = useAuthStore();
  const { openWindow } = useWindowStore();
  const { installedApps } = useWorkspaceStore();

  if (!currentUser) return null;

  const isSuperUser = currentUser.role === 'admin';

  return (
    <div className="absolute inset-0 z-[250] bg-black/60 backdrop-blur-2xl pointer-events-auto flex flex-col items-center pt-24 pb-12 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-xl mb-16 px-4">
        <input
          type="text"
          placeholder="Search applications..."
          className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white text-lg font-medium focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all text-center placeholder:text-white/30 shadow-2xl"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-x-4 gap-y-12 max-w-6xl mx-auto mt-24 px-8">
        {APP_MANIFEST.map(app => {
          if (!app.roles.includes(currentUser.role) && !isSuperUser) return null;
          if (!app.isCore && !installedApps.includes(app.id) && !isPluginActive(app.id)) return null;
          return (
            <button
              key={app.id}
              onClick={() => {
                openWindow(app.id);
                onClose();
              }}
              className="flex flex-col items-center gap-3 group outline-none w-24"
            >
              <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center group-hover:bg-white/25 transition-all duration-300 group-hover:scale-110 shadow-lg border border-white/10 group-focus:ring-2 ring-white/50">
                <app.icon className="w-10 h-10 text-white" />
              </div>
              <span className="text-white text-sm font-medium drop-shadow-md text-center line-clamp-1 w-full px-1">{app.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
