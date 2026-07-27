'use client';

import React, { useState, useMemo } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useWindowStore } from '@/lib/stores/window.store';
import { useWindowActions } from '@/lib/hooks/use-window-actions';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { APP_MANIFEST } from '@/lib/app-manifest';
import { getAllPlugins, isPluginActive } from '@/lib/plugin-registry';
import { Search } from 'lucide-react';

interface LaunchpadProps {
  onClose: () => void;
}

export function Launchpad({ onClose }: LaunchpadProps) {
  const { currentUser } = useAuthStore();
  const { openWindow } = useWindowActions();
  const { installedApps } = useWorkspaceStore();
  const [query, setQuery] = useState('');

  if (!currentUser) return null;

  const isSuperUser = currentUser.role === 'admin';

  const filteredApps = useMemo(() => {
    const q = query.toLowerCase().trim();
    return APP_MANIFEST.filter(app => {
      if (!app.roles.includes(currentUser.role) && !isSuperUser) return false;
      if (q && !app.title.toLowerCase().includes(q) && !app.id.toLowerCase().includes(q) && !(app.description || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [currentUser, isSuperUser, query, installedApps]);

  return (
    <div className="absolute inset-0 z-[250] bg-black/60 backdrop-blur-2xl pointer-events-auto flex flex-col items-center pt-24 pb-12 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-xl mb-8 px-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search applications..."
            className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-6 py-4 text-white text-lg font-medium focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all text-center placeholder:text-white/30 shadow-2xl"
            autoFocus
          />
        </div>
      </div>

      {filteredApps.length === 0 && (
        <div className="text-white/40 text-sm mt-12">No apps found{query ? ` for "${query}"` : ''}</div>
      )}

      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-8 max-w-5xl mx-auto mt-8 px-8">
        {filteredApps.map(app => (
          <button
            key={app.id}
            onClick={() => {
              openWindow(app.id);
              onClose();
            }}
            className="flex flex-col items-center gap-2 group outline-none w-20"
          >
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/25 transition-all duration-200 group-hover:scale-110 shadow-lg border border-white/10">
              <app.icon className="w-8 h-8 text-white" />
            </div>
            <span className="text-white text-xs font-medium drop-shadow-md text-center line-clamp-2 w-full px-1">{app.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
