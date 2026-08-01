import React, { useState } from 'react';
import { ShoppingBag, Search, Download, Check, Sparkles, ExternalLink, Globe, Lock, Play, Code, Music, Target, MessageSquare, Palette, FolderOpen } from 'lucide-react';
import { useWindowStore } from '@/lib/stores/window.store';
import { cn } from '@/lib/utils';
import { AppIcon } from '@/components/ui/app-icon';
import { APP_MANIFEST } from '@/lib/app-manifest';

export interface AppCatalogItem {
  id: string;
  name: string;
  category: 'productivity' | 'design' | 'developer' | 'media';
  icon: React.ComponentType<any>;
  iconImage?: string;
  description: string;
  url: string;
  installed: boolean;
  rating: number;
}

const CATALOG: AppCatalogItem[] = [
  {
    id: 'figma',
    name: 'Figma Design System',
    category: 'design',
    icon: Palette,
    iconImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%231e1e1e'/%3E%3Cpath d='M40 30a15 15 0 0 0 0 30h15V30H40z' fill='%23f24e1e'/%3E%3Ccircle cx='70' cy='45' r='15' fill='%23ff7262'/%3E%3Ccircle cx='70' cy='75' r='15' fill='%231abcfe'/%3E%3Cpath d='M40 60a15 15 0 0 0 0 30 15 15 0 0 0 15-15V60H40z' fill='%23a259ff'/%3E%3Ccircle cx='40' cy='75' r='15' fill='%230acf83'/%3E%3C/svg%3E",
    description: 'Collaborative interface design tool & canvas embedder',
    url: 'https://www.figma.com',
    installed: true,
    rating: 4.9,
  },
  {
    id: 'github',
    name: 'GitHub Desktop & Codespaces',
    category: 'developer',
    icon: Code,
    iconImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%23181717'/%3E%3Cpath d='M60 25C40.7 25 25 40.7 25 60c0 15.5 10 28.6 24 33.3 1.8.3 2.4-.8 2.4-1.7v-6.2c-9.7 2.1-11.8-4.7-11.8-4.7-1.6-4.1-3.9-5.2-3.9-5.2-3.2-2.2.2-2.1.2-2.1 3.5.2 5.4 3.6 5.4 3.6 3.1 5.4 8.2 3.8 10.2 2.9.3-2.3 1.2-3.8 2.2-4.7-7.8-.9-15.9-3.9-15.9-17.3 0-3.8 1.4-6.9 3.6-9.3-.4-1-.1-4.4.4-9.2 0 0 2.9-.9 9.6 3.6a33.3 33.3 0 0 1 17.5 0c6.7-4.5 9.6-3.6 9.6-3.6.5 4.8.2 8.2-.3 9.2 2.3 2.4 3.6 5.5 3.6 9.3 0 13.5-8.1 16.4-15.9 17.3 1.3 1.1 2.4 3.3 2.4 6.7v10c0 1 .6 2 2.4 1.7C85 88.6 95 75.5 95 60c0-19.3-15.7-35-35-35z' fill='%23fff'/%3E%3C/svg%3E",
    description: 'Code repositories, issues, and automated Virtual FS cloning',
    url: 'https://github.com',
    installed: true,
    rating: 4.9,
  },
  {
    id: 'notion',
    name: 'Notion Workspace',
    category: 'productivity',
    icon: Sparkles,
    iconImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%23000'/%3E%3Cpath d='M35 80V40l25-10 25 10v40l-25 10z' fill='%23fff' opacity='.9'/%3E%3Cpath d='M35 40l25 10 25-10' fill='none' stroke='%23fff' stroke-width='2'/%3E%3Cline x1='60' y1='50' x2='60' y2='80' stroke='%23000' stroke-width='2'/%3E%3C/svg%3E",
    description: 'All-in-one workspace for notes, docs, and team wikis',
    url: 'https://www.notion.so',
    installed: true,
    rating: 4.8,
  },
  {
    id: 'spotify',
    name: 'Spotify Music Player',
    category: 'media',
    icon: Music,
    iconImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%231db954'/%3E%3Cpath d='M34 46c20-6 40-4 54 4M38 62c16-5 32-3 44 3M42 76c12-3 24-1 32 3' stroke='%23000' stroke-width='7' fill='none' stroke-linecap='round'/%3E%3C/svg%3E",
    description: 'Digital music service and audio streaming embedded in Notch',
    url: 'https://open.spotify.com',
    installed: true,
    rating: 4.9,
  },
  {
    id: 'vscode',
    name: 'VS Code Web',
    category: 'developer',
    icon: Code,
    iconImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%23007acc'/%3E%3Cpath d='M40 42L24 60l16 18' stroke='%23fff' stroke-width='6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M80 42l16 18-16 18' stroke='%23fff' stroke-width='6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cline x1='68' y1='36' x2='52' y2='84' stroke='%23fff' stroke-width='4' stroke-linecap='round' opacity='.6'/%3E%3C/svg%3E",
    description: 'Full web version of Visual Studio Code IDE',
    url: 'https://vscode.dev',
    installed: false,
    rating: 4.9,
  },
  {
    id: 'canva',
    name: 'Canva Design Studio',
    category: 'design',
    icon: Sparkles,
    iconImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%2300c4cc'/%3E%3Cstop offset='100%25' stop-color='%237d2ae8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='26' fill='url(%23a)'/%3E%3Ctext x='60' y='72' text-anchor='middle' font-size='48' font-weight='800' fill='%23fff' font-family='serif'%3ECanva%3C/text%3E%3C/svg%3E",
    description: 'Graphic design, presentation, and video creator',
    url: 'https://www.canva.com',
    installed: false,
    rating: 4.7,
  },
  {
    id: 'linear',
    name: 'Linear Issue Tracker',
    category: 'productivity',
    icon: Target,
    iconImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%235e6ad2'/%3E%3Ccircle cx='60' cy='60' r='24' stroke='%23fff' stroke-width='6' fill='none'/%3E%3Ccircle cx='60' cy='60' r='10' fill='%23fff'/%3E%3C/svg%3E",
    description: 'Streamlined issue tracking for software teams',
    url: 'https://linear.app',
    installed: false,
    rating: 4.9,
  },
  {
    id: 'slack',
    name: 'Slack Workspaces',
    category: 'productivity',
    icon: MessageSquare,
    iconImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%23611f69'/%3E%3Ccircle cx='42' cy='45' r='14' fill='%2336c5f0'/%3E%3Ccircle cx='78' cy='45' r='14' fill='%232eb67d'/%3E%3Ccircle cx='42' cy='78' r='14' fill='%23ecb22e'/%3E%3Ccircle cx='78' cy='78' r='14' fill='%23e01e5a'/%3E%3C/svg%3E",
    description: 'Team messaging and real-time collaboration channel',
    url: 'https://slack.com',
    installed: false,
    rating: 4.6,
  },
];

export function AppStoreApp() {
  const [catalog, setCatalog] = useState<AppCatalogItem[]>(CATALOG);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const openWindow = useWindowStore((s) => s.openWindow);

  const toggleInstall = (id: string) => {
    setCatalog((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          const next = !app.installed;
          window.dispatchEvent(
            new CustomEvent('os:notify', {
              detail: {
                title: next ? 'App Installed' : 'App Uninstalled',
                description: `${app.name} has been ${next ? 'installed into your OS' : 'removed'}`,
                type: next ? 'success' : 'info',
              },
            })
          );
          return { ...app, installed: next };
        }
        return app;
      })
    );
  };

  const handleLaunch = (app: AppCatalogItem) => {
    openWindow('power-browser', app.name, { url: app.url });
  };

  const filtered = catalog.filter((app) => {
    const matchSearch = app.name.toLowerCase().includes(search.toLowerCase()) || app.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'all' || app.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="w-full h-full bg-[#0a0b10]/85 backdrop-blur-3xl border border-white/12 text-slate-100 font-sans flex flex-col overflow-hidden select-none">
      {/* Top Bar */}
      <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
              ContinuaOS App Store
              <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/20">Verified</span>
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
      <div className="px-6 py-3 border-b border-white/5 bg-black/20 flex items-center gap-2">
        {['all', 'productivity', 'design', 'developer', 'media'].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "px-3.5 py-1 rounded-full text-xs font-semibold capitalize transition-all duration-200",
              category === cat
                ? "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/25 ring-1 ring-white/30"
                : "text-white/50 hover:bg-white/10 hover:text-white"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Catalog Grid */}
      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((app) => {
          const IconComp = app.icon;
          return (
            <div
              key={app.id}
              className="p-5 rounded-3xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-cyan-500/30 transition-all duration-300 flex items-start justify-between gap-4 shadow-2xl backdrop-blur-xl group"
            >
              <div className="flex items-start gap-4">
                <AppIcon icon={app.icon} iconImage={app.iconImage} className="w-12 h-12 rounded-2xl group-hover:scale-105 transition-transform" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">{app.name}</h3>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full border border-amber-400/20">
                      ★ {app.rating}
                    </span>
                  </div>
                  <p className="text-xs text-white/50 mt-1 leading-relaxed">{app.description}</p>
                  <span className="text-[10px] text-white/30 font-mono mt-2 truncate max-w-[200px]">{app.url}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => toggleInstall(app.id)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95",
                    app.installed
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                      : "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white hover:brightness-110 shadow-cyan-500/20"
                  )}
                >
                  {app.installed ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Installed
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" /> Install
                    </>
                  )}
                </button>

                {app.installed && (
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
