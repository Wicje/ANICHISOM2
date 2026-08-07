'use client';

import React, { useState, useMemo } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useWindowStore } from '@/lib/stores/window.store';
import { useWindowActions } from '@/lib/hooks/use-window-actions';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { APP_MANIFEST } from '@/lib/app-manifest';
import { WEB_APP_CATALOG } from '@/lib/web-app-catalog';
import { getAllPlugins, isPluginActive } from '@/lib/plugin-registry';
import { Search, Globe, File as FileIcon } from 'lucide-react';
import { AppIcon } from '@/components/ui/app-icon';
import { VirtualFS } from '@/lib/terminal/commands';
import { useFileStore } from '@/lib/stores/file.store';

interface LaunchpadProps {
  onClose: () => void;
}

export function Launchpad({ onClose }: LaunchpadProps) {
  const { currentUser } = useAuthStore();
  const { openWindow } = useWindowActions();
  const { installedApps } = useWorkspaceStore();
  const [query, setQuery] = useState('');
  const [fileResults, setFileResults] = useState<{ path: string, name: string }[]>([]);
  
  React.useEffect(() => {
    if (!query.trim()) {
      setFileResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const vfs = new VirtualFS();
      const results = await vfs.find(query.trim());
      setFileResults(results.map(r => ({ path: r, name: r.split('/').pop() || r })).slice(0, 12));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  if (!currentUser) return null;

  const isSuperUser = currentUser.role === 'admin';

  const filteredApps = useMemo(() => {
    const q = query.toLowerCase().trim();
    
    // Convert custom web apps to the same format as APP_MANIFEST entries
    const customAppsFormatted = useWorkspaceStore.getState().customWebApps.map(app => ({
      id: app.id,
      title: app.title,
      iconImage: app.iconImage,
      icon: Globe, // Fallback lucide icon
      roles: ['user', 'admin'],
      description: `Installed Web App: ${app.url}`,
      url: app.url,
    }));

    // Apps installed from the App Store that aren't already in the manifest
    // (e.g. GitHub, Canva, Linear, Slack) appear in the launchpad once installed.
    const manifestIds = new Set(APP_MANIFEST.map(app => app.id));
    const installedStoreApps = installedApps
      .map(id => WEB_APP_CATALOG.find(app => app.id === id))
      .filter((app): app is (typeof WEB_APP_CATALOG)[number] => !!app && !manifestIds.has(app.id))
      .map(app => ({
        id: app.id,
        title: app.name,
        iconImage: app.iconImage,
        icon: app.icon,
        roles: ['user', 'admin'],
        description: app.description,
        url: app.url,
      }));

    const combinedApps = [...APP_MANIFEST, ...customAppsFormatted, ...installedStoreApps];

    return combinedApps.filter(app => {
      if (!app.roles.includes(currentUser.role) && !isSuperUser) return false;
      if (q && !app.title.toLowerCase().includes(q) && !app.id.toLowerCase().includes(q) && !(app.description || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [currentUser, isSuperUser, query, installedApps]);

  const handleOpenFile = (path: string, name: string) => {
    const mime = name.includes('.') ? name.split('.').pop()! : '';
    const appId = useFileStore.getState().resolveSmartRoute(mime, name);
    if (appId) {
      openWindow(appId, name, { fileId: path });
    } else {
      openWindow('code', name, { fileId: path });
    }
    onClose();
  };

  return (
    <div className="absolute inset-0 z-[250] bg-black/60 backdrop-blur-2xl pointer-events-auto flex flex-col items-center pt-24 pb-12 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-xl mb-8 px-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search applications and files..."
            className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-6 py-4 text-white text-lg font-medium focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all text-center placeholder:text-white/30 shadow-2xl"
            autoFocus
          />
        </div>
      </div>

      {filteredApps.length === 0 && fileResults.length === 0 && (
        <div className="text-white/40 text-sm mt-12">No results found{query ? ` for "${query}"` : ''}</div>
      )}

      <div className="w-full max-w-5xl mx-auto px-8 space-y-12 mt-8">
        {filteredApps.length > 0 && (
          <div>
            {query && <h3 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-4">Applications</h3>}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-x-6 gap-y-10">
              {filteredApps.map(app => (
                <button
                  key={app.id}
                  onClick={() => {
                    if ((app as any).url) {
                       openWindow('web-app', app.title, { url: (app as any).url });
                    } else {
                       openWindow(app.id);
                    }
                    onClose();
                  }}
                  className="flex flex-col items-center gap-3 group outline-none w-24 mx-auto"
                >
                  <div className="w-20 h-20 sm:w-22 sm:h-22 flex items-center justify-center group-hover:scale-110 transition-all duration-200">
                    <AppIcon 
                      appId={app.id} 
                      icon={app.icon} 
                      iconImage={app.iconImage} 
                      className="w-full h-full shadow-2xl rounded-3xl border border-white/15 p-2 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl" 
                    />
                  </div>
                  <span className="text-white/90 group-hover:text-white text-xs font-semibold drop-shadow-md text-center line-clamp-2 w-full px-1 tracking-tight">{app.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {fileResults.length > 0 && (
          <div>
            <h3 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-4">Files & Documents</h3>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-8">
              {fileResults.map(file => (
                <button
                  key={file.path}
                  onClick={() => handleOpenFile(file.path, file.name)}
                  className="flex flex-col items-center gap-2 group outline-none w-20 mx-auto"
                >
                  <div className="w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 bg-white/5 rounded-2xl border border-white/10">
                    <FileIcon className="w-8 h-8 text-white/70" />
                  </div>
                  <span className="text-white text-xs font-medium drop-shadow-md text-center line-clamp-2 w-full px-1">{file.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
