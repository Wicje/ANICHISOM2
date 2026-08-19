import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, Download, Check, Play } from 'lucide-react';
import { useWindowStore } from '@/lib/stores/window.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { cn } from '@/lib/utils';
import { AppIcon } from '@/components/ui/app-icon';
import { WEB_APP_CATALOG, WebAppCatalogItem } from '@/lib/web-app-catalog';

export { WEB_APP_CATALOG };

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'All Apps' },
  { id: 'developer', label: '💻 Developer' },
  { id: 'design', label: '🎨 Designer' },
  { id: 'business', label: '💼 Business & PM' },
  { id: 'student', label: '🎓 Student & STEM' },
  { id: 'writer', label: '✍️ Writer & Editor' },
  { id: 'media', label: '🎵 Media' },
];

export function AppStoreApp() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const openWindow = useWindowStore((s) => s.openWindow);
  const installedAppIds = useWorkspaceStore((s) => s.installedApps);

  // Seed the workspace store with the catalog's pre-installed apps on the very
  // first run only (when nothing has ever been persisted for this workspace).
  useEffect(() => {
    if (useWorkspaceStore.getState().installedApps.length > 0) return;
    let cancelled = false;
    import('@/lib/context-layer').then(({ readDomain }) => {
      readDomain('workspace').then((persisted) => {
        if (cancelled) return;
        if (persisted) return;
        const { installedApps, installApp } = useWorkspaceStore.getState();
        if (installedApps.length === 0) {
          WEB_APP_CATALOG.filter((app) => app.installed).forEach((app) => installApp(app.id));
        }
      });
    });
    return () => { cancelled = true; };
  }, []);

  const toggleInstall = (id: string) => {
    const ws = useWorkspaceStore.getState();
    const installed = ws.installedApps.includes(id);
    if (installed) {
      ws.uninstallApp(id);
    } else {
      ws.installApp(id);
    }
    window.dispatchEvent(
      new CustomEvent('os:notify', {
        detail: {
          title: installed ? 'App Uninstalled' : 'App Installed',
          description: `${installed ? 'Removed' : 'Added'} to your OS Launchpad & Dock.`,
          type: installed ? 'info' : 'success',
        },
      })
    );
  };

  const handleLaunch = (app: WebAppCatalogItem) => {
    openWindow('web-app', app.name, { url: app.url, appId: app.id, title: app.name, iconImage: app.iconImage });
  };

  const filtered = WEB_APP_CATALOG.filter((app) => {
    const matchSearch = app.name.toLowerCase().includes(search.toLowerCase()) || app.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'all' || app.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="w-full h-full bg-[#0a0b10]/85 backdrop-blur-3xl border border-white/12 text-slate-100 font-sans flex flex-col overflow-hidden select-none">
      {/* Top Bar */}
      <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
              ContinuaOS App Store
              <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/20">35+ Apps</span>
            </h2>
            <p className="text-xs text-white/50">Curated Web Apps, PWAs, and Native Extensions</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search catalog..."
            className="w-full pl-9 pr-4 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="px-6 py-3 border-b border-white/5 bg-black/20 flex items-center gap-2 overflow-x-auto custom-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={cn(
              "px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200",
              category === cat.id
                ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/25 ring-1 ring-white/30"
                : "text-white/50 hover:bg-white/10 hover:text-white"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Catalog Grid */}
      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4 custom-scrollbar">
        {filtered.map((app) => {
          const installed = installedAppIds.includes(app.id);
          return (
            <div
              key={app.id}
              className="p-5 rounded-3xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-cyan-500/30 transition-all duration-300 flex items-start justify-between gap-4 shadow-2xl backdrop-blur-xl group"
            >
              <div className="flex items-start gap-4">
                <AppIcon icon={app.icon} iconImage={app.iconImage} className="w-12 h-12 rounded-2xl group-hover:scale-105 transition-transform shrink-0" />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">{app.name}</h3>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full border border-amber-400/20">
                      ★ {app.rating}
                    </span>
                    {app.isDirectEmbed && (
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full border border-emerald-400/20 uppercase tracking-wider">
                        Direct In-OS
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/50 mt-1 leading-relaxed line-clamp-2">{app.description}</p>
                  <span className="text-[10px] text-white/30 font-mono mt-2 truncate max-w-[220px]">{app.url}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => toggleInstall(app.id)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95",
                    installed
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                      : "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:brightness-110 shadow-cyan-500/20"
                  )}
                >
                  {installed ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Installed
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" /> Install
                    </>
                  )}
                </button>

                {installed && (
                  <button
                    onClick={() => handleLaunch(app)}
                    className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-2xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-all active:scale-95"
                  >
                    <Play className="w-3 h-3 text-cyan-400" /> Launch
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AppStoreApp;
