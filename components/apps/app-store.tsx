'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import {
  Store, Download, CheckCircle, Star, Plus, Shield, Sparkles,
  Search, Code2, Upload, ExternalLink, Trash2, Eye, EyeOff,
  Package, Lock, Globe, Filter, ChevronRight, Zap, Heart,
  MessageSquare, LayoutGrid, Tag, Users, X as XIcon, Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAllPlugins, getInstalledPlugins, getPlugin, searchPlugins,
  installPlugin, uninstallPlugin, togglePluginEnabled, registerPlugin,
  setPrivacyOverride, getInstallState, isPluginActive,
  PluginManifest, PluginCategory, PluginPermission, PluginInstallState,
  subscribe,
} from '@/lib/plugin-registry';
import { usePluginStore } from '@/lib/stores/plugin.store';
import { PluginService } from '@/lib/services/plugin.service';
import { APP_MANIFEST } from '@/lib/app-manifest';
import { AppIconInline } from '@/components/ui/app-icon';

// Look up iconImage from the manifest by app ID
function getIconImage(appId: string): string | undefined {
  return APP_MANIFEST.find(a => a.id === appId)?.iconImage;
}

// ─── Static catalog for apps/packs not yet in the dynamic registry ──────

const STORE_APPS: Array<{ id: string; name: string; desc: string; icon: string; category: string; rating: number }> = [
  { id: 'browser', name: 'Power Browser', desc: 'A fast, privacy-first web browser with pinned apps and context memory.', icon: '🌐', category: 'productivity', rating: 4.8 },
  { id: 'campaign-lab', name: 'Campaign Lab', desc: 'Surpass Notion with databases, views, and campaign management.', icon: '📊', category: 'productivity', rating: 4.9 },
  { id: 'moodboard', name: 'Moodboard Pro', desc: 'Free-form canvas surpassing Milanote with reactions, connections, and voting.', icon: '🎨', category: 'creative', rating: 4.9 },
  { id: 'files', name: 'Files Bridge', desc: 'Google Drive, Dropbox, and local files in one unified manager.', icon: '📁', category: 'productivity', rating: 4.7 },
  { id: 'assistant', name: 'AI Assistant', desc: 'Connect to any AI model — Claude, Gemini, Qwen, OpenAI, local models.', icon: '🤖', category: 'productivity', rating: 4.8 },
  // Native Web Apps (Ecosystem)
  { id: 'figma', name: 'Figma', desc: 'Collaborative interface design tool. Runs natively in ContinuaOS.', icon: '🎨', category: 'creative', rating: 4.9 },
  { id: 'notion', name: 'Notion', desc: 'All-in-one workspace for your notes, tasks, wikis.', icon: '📝', category: 'productivity', rating: 4.8 },
  { id: 'spotify', name: 'Spotify', desc: 'Listen to music and podcasts while you work.', icon: '🎧', category: 'media', rating: 4.7 },
  { id: 'discord', name: 'Discord', desc: 'Chat and voice communication.', icon: '💬', category: 'social', rating: 4.8 },
  { id: 'vscode', name: 'VS Code Web', desc: 'Cloud-based code editor via StackBlitz.', icon: '💻', category: 'dev', rating: 4.9 },
];

const ECOSYSTEM_PACKS: Array<{ id: string; name: string; desc: string; icon: string; category: string; rating: number }> = [
  { id: 'proposals', name: 'ContinuaOS Creative Pack', desc: 'The ultimate agency toolkit. Moodboard Mill, Proposal Generator, Client Portal, and Brand Guides.', icon: '✨', category: 'Ecosystem Pack', rating: 4.9 },
  { id: 'ziklag', name: 'Ziklag Forensics Pack', desc: 'Data recovery and forensics toolkit. Case Management, Chain of Custody, and Evidence Logs.', icon: '🗄️', category: 'Ecosystem Pack', rating: 5.0 },
  { id: 'clothing', name: 'Clothing Brand Pack', desc: 'End-to-end fashion venture management. Lookbooks, inventory, and Shopify integration.', icon: '👕', category: 'Ecosystem Pack', rating: 4.7 },
  { id: 'hardware', name: 'Hardware Pack', desc: 'Electronics venture management. BOMs, firmware tracking, and component libraries.', icon: '🔌', category: 'Ecosystem Pack', rating: 4.8 },
  { id: 'developer', name: 'Developer Pack', desc: 'Freelance developer environment. Deployment tracking, code review logs, and CI bridge.', icon: '💻', category: 'Ecosystem Pack', rating: 4.9 },
  { id: 'photography', name: 'Photography Pack', desc: 'Freelance photography toolkit. Galleries, client delivery, and print orders.', icon: '📷', category: 'Ecosystem Pack', rating: 4.8 },
  { id: 'sidegigs', name: 'Side Gigs Pack', desc: 'Manage multiple side hustles easily. Income tracking, client CRM, and task boards.', icon: '💼', category: 'Ecosystem Pack', rating: 4.6 },
];

const CATEGORIES: Array<{ id: PluginCategory | 'Ecosystem Pack'; label: string; icon: string }> = [
  { id: 'productivity', label: 'Productivity', icon: '⚡' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
  { id: 'development', label: 'Development', icon: '💻' },
  { id: 'communication', label: 'Communication', icon: '💬' },
  { id: 'analytics', label: 'Analytics', icon: '📊' },
  { id: 'media', label: 'Media', icon: '🎬' },
  { id: 'utility', label: 'Utilities', icon: '🔧' },
  { id: 'Ecosystem Pack', label: 'Venture Packs', icon: '📦' },
];

const PERMISSION_LABELS: Record<PluginPermission, { label: string; desc: string; risk: 'low' | 'medium' | 'high' }> = {
  'files:read': { label: 'Read Files', desc: 'Access your files and documents', risk: 'low' },
  'files:write': { label: 'Write Files', desc: 'Create and modify files', risk: 'medium' },
  'network:fetch': { label: 'Network Access', desc: 'Make HTTP requests to external services', risk: 'medium' },
  'clipboard:read': { label: 'Read Clipboard', desc: 'Access clipboard contents', risk: 'medium' },
  'clipboard:write': { label: 'Write Clipboard', desc: 'Write to the clipboard', risk: 'low' },
  'workspace:read': { label: 'Read Workspace', desc: 'View workspace data and settings', risk: 'low' },
  'workspace:write': { label: 'Modify Workspace', desc: 'Change workspace configuration', risk: 'high' },
  'presence:read': { label: 'See Users', desc: 'View who is online and their activity', risk: 'low' },
  'notifications:send': { label: 'Send Notifications', desc: 'Display notifications to the user', risk: 'low' },
  'window:open': { label: 'Open Windows', desc: 'Open other app windows', risk: 'medium' },
  'ai:query': { label: 'Use AI', desc: 'Send queries to AI models through the assistant', risk: 'medium' },
};

type TabId = 'discover' | 'installed' | 'developer' | 'publish';

export function AppStoreApp({ window: osWindow }: { window: OSWindow }) {
  const { installedApps, installApp, uninstallApp, openWindow } = useOS();
  const [activeTab, setActiveTab] = useState<TabId>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [registryPlugins, setRegistryPlugins] = useState<PluginManifest[]>([]);
  const [detailView, setDetailView] = useState<string | null>(null);
  const [publishForm, setPublishForm] = useState({
    name: '', version: '1.0.0', description: '', author: '',
    category: 'utility' as PluginCategory, entryUrl: '', runtime: 'iframe' as PluginManifest['runtime'],
    permissions: [] as PluginPermission[], tags: '',
  });

  const openApp = useCallback((id: string) => {
    const result = PluginService.openPlugin(id);
    if (result) {
      openWindow(result.appId, result.title, result.data);
    } else {
      openWindow(id);
    }
  }, [openWindow]);

  // Listen for registry changes
  useEffect(() => {
    const unsub = subscribe(() => setRegistryPlugins(getAllPlugins()));
    return unsub;
  }, []);

  // Fetch marketplace plugins from the API
  const [marketplacePlugins, setMarketplacePlugins] = useState<any[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/plugins')
      .then(r => r.ok ? r.json() : { plugins: [] })
      .then(data => { if (!cancelled) setMarketplacePlugins(data.plugins || []); })
      .catch(() => { /* silent — API may not be available yet */ });
    return () => { cancelled = true; };
  }, []);

  // Merge static catalog + dynamic registry + marketplace for display
  const allItems = useMemo(() => {
    const staticItems = [...STORE_APPS, ...ECOSYSTEM_PACKS].map(item => ({
      ...item,
      source: item.category === 'Ecosystem Pack' ? 'builtin' : 'builtin',
      runtime: 'native' as const,
      permissions: [],
      roles: ['admin', 'filmmaker', 'technician'],
    }));
    // Deduplicate: registry entries override static ones, marketplace overrides static
    const merged = new Map<string, any>();
    staticItems.forEach(item => merged.set(item.id, item));
    marketplacePlugins.forEach(p => merged.set(p.id, p));
    registryPlugins.forEach(p => merged.set(p.id, p));
    return Array.from(merged.values());
  }, [registryPlugins, marketplacePlugins]);

  const filteredItems = useMemo(() => {
    let items = allItems;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.desc.toLowerCase().includes(q) ||
        (i.tags && i.tags.some((t: string) => t.toLowerCase().includes(q)))
      );
    }
    if (selectedCategory) {
      items = items.filter(i => i.category === selectedCategory);
    }
    return items;
  }, [allItems, searchQuery, selectedCategory]);

  const isInstalled = useCallback((id: string) => {
    return installedApps.includes(id) || isPluginActive(id);
  }, [installedApps]);

  const handleInstall = useCallback(async (id: string) => {
    if (!installedApps.includes(id)) {
      installApp(id);
    }
    await PluginService.install(id);
  }, [installedApps, installApp]);

  const handleUninstall = useCallback(async (id: string) => {
    uninstallApp(id);
    await PluginService.uninstall(id);
  }, [uninstallApp]);

  // ─── Detail View ────────────────────────────────────────────────────────
  const detailItem = detailView ? allItems.find(i => i.id === detailView) : null;
  const detailInstallState = detailView ? getInstallState(detailView) : undefined;

  if (detailItem) {
    const perms = (detailItem.permissions || []) as PluginPermission[];
    return (
      <div className="flex flex-col w-full h-full bg-[#0a0a0a] text-white font-sans overflow-hidden">
        <div className="h-14 border-b border-white/10 bg-white/5 flex items-center px-6 shrink-0 gap-3">
          <button onClick={() => setDetailView(null)} className="text-white/40 hover:text-white flex items-center gap-1 text-sm font-bold">
            <ChevronRight className="w-4 h-4 rotate-180" /> Back
          </button>
          <span className="text-white/30">/</span>
          <span className="font-bold">{detailItem.name}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center text-4xl shrink-0 shadow-inner overflow-hidden">
                <AppIconInline iconImage={getIconImage(detailItem.id)} size={64} className="w-full h-full object-contain" />
                {!getIconImage(detailItem.id) && <span className="text-4xl">{detailItem.icon}</span>}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-1">{detailItem.name}</h1>
                <p className="text-white/60 mb-2">{detailItem.desc}</p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-yellow-500 font-bold"><Star className="w-3 h-3 fill-yellow-500" /> {detailItem.rating}</span>
                  <span className="text-white/30">by {detailItem.author || 'ContinuaOS'}</span>
                  <span className="text-white/30 bg-white/5 px-2 py-0.5 rounded">{detailItem.category}</span>
                  {detailItem.runtime && <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{detailItem.runtime}</span>}
                </div>
              </div>
              <div className="shrink-0">
                {isInstalled(detailItem.id) ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => openApp(detailItem.id)} className="px-5 py-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold transition-colors shadow-lg">Open</button>
                    <button onClick={() => handleUninstall(detailItem.id)} className="px-3 py-2 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold border border-red-500/20">Remove</button>
                  </div>
                ) : (
                  <button onClick={() => handleInstall(detailItem.id)} className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-sm font-bold transition-colors border border-white/10 flex items-center gap-2">
                    <Download className="w-4 h-4" /> Install
                  </button>
                )}
              </div>
            </div>

            {/* Permissions & Privacy */}
            {perms.length > 0 && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" /> Permissions & Privacy
                </h3>
                <div className="space-y-2">
                  {perms.map(perm => {
                    const info = PERMISSION_LABELS[perm];
                    if (!info) return null;
                    const overridden = detailInstallState?.privacyOverrides?.[perm];
                    return (
                      <div key={perm} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            info.risk === 'low' ? "bg-emerald-400" : info.risk === 'medium' ? "bg-yellow-400" : "bg-red-400",
                          )} />
                          <span className="text-sm font-medium">{info.label}</span>
                          <span className="text-xs text-white/40">{info.desc}</span>
                        </div>
                        {isInstalled(detailItem.id) && (
                          <button
                            onClick={() => usePluginStore.getState().setPrivacyOverride(detailItem.id, perm, overridden !== false)}
                            className={cn(
                              "w-8 h-4 rounded-full transition-colors relative",
                              overridden === false ? "bg-red-500/30" : "bg-emerald-500/30",
                            )}
                          >
                            <div className={cn(
                              "absolute w-3 h-3 rounded-full top-0.5 transition-all",
                              overridden === false ? "left-0.5 bg-red-400" : "left-[18px] bg-emerald-400",
                            )} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 text-[10px] text-white/30 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Privacy-first: all permissions default to disabled. Toggle to allow.
                </div>
              </div>
            )}

            {/* Screenshots placeholder */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-sm font-bold mb-3">Screenshots</h3>
              <div className="grid grid-cols-2 gap-3">
                {(detailItem.screenshots || ['/placeholder1', '/placeholder2']).map((src: string, i: number) => (
                  <div key={i} className="aspect-video bg-white/5 rounded-lg border border-white/5 flex items-center justify-center text-white/20 text-xs">
                    {src.startsWith('/') ? `Screenshot ${i + 1}` : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" src={src} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover rounded-lg" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Tabs View ─────────────────────────────────────────────────────

  return (
    <div className="flex flex-col w-full h-full bg-[#0a0a0a] text-white font-sans overflow-hidden">

      {/* Header */}
      <div className="h-14 border-b border-white/10 bg-white/5 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Store className="w-5 h-5 text-blue-400" />
          <span className="font-bold text-sm tracking-tight">App Hub</span>
          <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded font-mono">v2</span>
        </div>

        <div className="flex bg-black/50 rounded-lg p-1 border border-white/10">
          {([
            { id: 'discover', label: 'Discover', icon: Sparkles },
            { id: 'installed', label: 'Installed', icon: CheckCircle },
            { id: 'developer', label: 'Developer', icon: Code2 },
            { id: 'publish', label: 'Publish', icon: Upload },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5",
                activeTab === tab.id ? "bg-white/20 text-white shadow-sm" : "text-white/40 hover:text-white/70",
              )}
            >
              <tab.icon className="w-3 h-3" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 relative">

        {/* ─── Discover Tab ────────────────────────────────────────────────── */}
        {activeTab === 'discover' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Search bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                <Search className="w-4 h-4 text-white/30 mr-3" />
                <input
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-white/30"
                  placeholder="Search apps, plugins, venture packs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-white/40 hover:text-white">
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('os:add-custom-app'))}
                className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-white/10"
              >
                <Plus className="w-3.5 h-3.5" /> Add Custom App
              </button>
            </div>

            {/* Category filters */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "px-3 py-1 rounded-lg text-[11px] font-bold transition-colors",
                  selectedCategory === null ? "bg-blue-500 text-white" : "bg-white/5 text-white/40 hover:text-white/70 border border-white/10",
                )}
              >
                All
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1",
                    selectedCategory === cat.id ? "bg-blue-500 text-white" : "bg-white/5 text-white/40 hover:text-white/70 border border-white/10",
                  )}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            {/* Featured banner */}
            {!searchQuery && !selectedCategory && (
              <div className="w-full h-44 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex flex-col justify-end relative overflow-hidden group cursor-pointer shadow-2xl"
                onClick={() => setDetailView('ziklag')}>
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                <div className="absolute top-4 right-4 text-4xl opacity-30">🗄️</div>
                <div className="relative z-10">
                  <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded mb-2 inline-block">Featured Pack</span>
                  <h2 className="text-2xl font-bold mb-1">Ziklag Forensics Pack</h2>
                  <p className="text-white/80 text-sm">Security auditing, file integrity, and data recovery for technical ventures.</p>
                </div>
              </div>
            )}

            {/* Featured apps row */}
            {!searchQuery && !selectedCategory && (
              <div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-400" /> Built-in Power Apps
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {STORE_APPS.filter(a => ['campaign-lab', 'moodboard', 'files'].includes(a.id)).map(app => (
                    <div
                      key={app.id}
                      className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer"
                      onClick={() => setDetailView(app.id)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xl overflow-hidden">
                          <AppIconInline iconImage={getIconImage(app.id)} size={36} className="w-full h-full object-contain" />
                          {!getIconImage(app.id) && <span className="text-xl">{app.icon}</span>}
                        </div>
                        <div>
                          <div className="font-bold text-sm">{app.name}</div>
                          <div className="flex items-center gap-1 text-[10px] text-yellow-500 font-bold"><Star className="w-2.5 h-2.5 fill-yellow-500" /> {app.rating}</div>
                        </div>
                      </div>
                      <p className="text-xs text-white/50 line-clamp-2">{app.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All items grid */}
            <div>
              <h3 className="text-sm font-bold mb-3">
                {searchQuery ? `Results for "${searchQuery}"` : selectedCategory ? CATEGORIES.find(c => c.id === selectedCategory)?.label || selectedCategory : 'All Apps & Packs'}
                <span className="text-white/30 ml-2 text-xs">{filteredItems.length} items</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredItems.map(item => {
                  const installed = isInstalled(item.id);
                  return (
                    <div
                      key={item.id}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4 hover:bg-white/10 transition-colors cursor-pointer group"
                      onClick={() => setDetailView(item.id)}
                    >
                      <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-2xl shrink-0 shadow-inner overflow-hidden">
                        <AppIconInline iconImage={getIconImage(item.id)} size={48} className="w-full h-full object-contain" />
                        {!getIconImage(item.id) && <span className="text-2xl">{item.icon}</span>}
                      </div>
                      <div className="flex flex-col justify-center flex-1 min-w-0">
                        <div className="font-bold text-sm truncate flex items-center gap-2">
                          {item.name}
                          {item.category === 'Ecosystem Pack' && (
                            <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-widest font-mono font-bold border border-blue-500/10">Venture</span>
                          )}
                          {item.source === 'marketplace' && (
                            <span className="text-[8px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded uppercase tracking-widest font-mono font-bold">3rd Party</span>
                          )}
                        </div>
                        <div className="text-xs text-white/50 line-clamp-2 mt-0.5">{item.desc}</div>
                        <div className="flex items-center gap-2 mt-1 text-[10px]">
                          <span className="text-yellow-500 font-bold flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-yellow-500" /> {item.rating}</span>
                          {item.runtime && <span className="text-white/30">{item.runtime}</span>}
                        </div>
                      </div>
                      <div className="flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {installed ? (
                          <button onClick={(e) => { e.stopPropagation(); openApp(item.id); }} className="px-3 py-1.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-colors shadow-lg">
                            Open
                          </button>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); handleInstall(item.id); }} className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors border border-white/10 flex items-center gap-1">
                            <Download className="w-3 h-3" /> Get
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {filteredItems.length === 0 && (
                <div className="text-center py-12 text-white/30">
                  No apps found. Try a different search or category.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Installed Tab ─────────────────────────────────────────────── */}
        {activeTab === 'installed' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Your Installed Apps
            </h3>

            {/* Built-in installed apps */}
            <div className="space-y-2">
              {installedApps.map(appId => {
                const item = allItems.find(a => a.id === appId);
                const pluginState = getInstallState(appId);
                if (!item) return (
                  <div key={appId} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg overflow-hidden">
                        <AppIconInline iconImage={getIconImage(appId)} size={36} className="w-full h-full object-contain" />
                        {!getIconImage(appId) && <span className="text-lg">📦</span>}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{appId}</div>
                        <div className="text-[10px] text-white/30">Custom or legacy app</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openApp(appId)} className="text-xs text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded-md transition-colors">Open</button>
                      <button onClick={() => handleUninstall(appId)} className="text-xs text-red-400 hover:text-red-300 px-3 py-1 bg-red-400/10 rounded-md transition-colors">Remove</button>
                    </div>
                  </div>
                );
                return (
                  <div key={appId} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg overflow-hidden">
                        <AppIconInline iconImage={getIconImage(item.id)} size={36} className="w-full h-full object-contain" />
                        {!getIconImage(item.id) && <span className="text-lg">{item.icon}</span>}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{item.name}</div>
                        <div className="text-[10px] text-white/30">{item.category}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pluginState && (
                        <button
                          onClick={() => usePluginStore.getState().togglePlugin(appId)}
                          className={cn(
                            "w-8 h-4 rounded-full transition-colors relative",
                            pluginState.enabled ? "bg-emerald-500/30" : "bg-white/10",
                          )}
                          title={pluginState.enabled ? 'Enabled' : 'Disabled'}
                        >
                          <div className={cn(
                            "absolute w-3 h-3 rounded-full top-0.5 transition-all",
                            pluginState.enabled ? "left-[18px] bg-emerald-400" : "left-0.5 bg-white/40",
                          )} />
                        </button>
                      )}
                      <button onClick={() => openApp(appId)} className="text-xs text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded-md transition-colors">Open</button>
                      <button onClick={() => setDetailView(appId)} className="text-xs text-white/40 hover:text-white bg-white/5 px-3 py-1 rounded-md transition-colors flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Privacy
                      </button>
                      {!item.isCore && (
                        <button onClick={() => handleUninstall(appId)} className="text-xs text-red-400 hover:text-red-300 px-3 py-1 bg-red-400/10 rounded-md transition-colors">Remove</button>
                      )}
                    </div>
                  </div>
                );
              })}
              {installedApps.length === 0 && (
                <div className="text-center py-12 text-white/30">
                  No apps installed yet. Visit Discover to find apps and venture packs.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Developer Tab ─────────────────────────────────────────────── */}
        {activeTab === 'developer' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-xl p-6 border border-purple-500/20">
              <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-purple-400" /> Developer Portal
              </h2>
              <p className="text-white/60 text-sm mb-4">
                Build plugins and apps for the ContinuaOS ecosystem. Use the Plugin SDK to create
                iframe-based or native React plugins that integrate with the OS.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="text-xs font-bold mb-1 flex items-center gap-1.5"><Package className="w-3 h-3 text-blue-400" /> Plugin SDK</div>
                  <div className="text-[10px] text-white/40">Structured API for workspace, files, AI, events, presence, and UI.</div>
                  <div className="text-[10px] text-blue-400 mt-1 font-bold">lib/plugin-sdk.ts</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="text-xs font-bold mb-1 flex items-center gap-1.5"><Shield className="w-3 h-3 text-emerald-400" /> Sandbox Runtime</div>
                  <div className="text-[10px] text-white/40">iframe isolation with postMessage IPC. Safe by default.</div>
                  <div className="text-[10px] text-emerald-400 mt-1 font-bold">plugin-sandbox.tsx</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="text-xs font-bold mb-1 flex items-center gap-1.5"><Globe className="w-3 h-3 text-orange-400" /> Connector Registry</div>
                  <div className="text-[10px] text-white/40">Register storage connectors (Google Drive, Dropbox, custom).</div>
                  <div className="text-[10px] text-orange-400 mt-1 font-bold">lib/storage-connectors/</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="text-xs font-bold mb-1 flex items-center gap-1.5"><Zap className="w-3 h-3 text-yellow-400" /> AI Provider Factory</div>
                  <div className="text-[10px] text-white/40">Register AI providers for the assistant (Claude, Gemini, local).</div>
                  <div className="text-[10px] text-yellow-400 mt-1 font-bold">lib/ai-providers/</div>
                </div>
              </div>
            </div>

            {/* Quick-start guide */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-5">
              <h3 className="text-sm font-bold mb-3">Quick Start: Build Your First Plugin</h3>
              <div className="space-y-3 text-xs text-white/60">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <div>
                    <div className="font-bold text-white/80">Create a manifest</div>
                    <div className="text-white/40">Define your plugin's id, name, permissions, runtime type, and entry URL or component.</div>
                    <code className="block mt-1 bg-black/50 p-2 rounded text-emerald-400 text-[10px]">
                      registerPlugin({'{ id: "my-plugin", name: "My Plugin", runtime: "iframe", entryUrl: "...", permissions: ["files:read"] }'})
                    </code>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <div>
                    <div className="font-bold text-white/80">Build your plugin UI</div>
                    <div className="text-white/40">For iframe plugins: create a web page that includes the Plugin SDK. For native plugins: create a React component.</div>
                    <code className="block mt-1 bg-black/50 p-2 rounded text-purple-400 text-[10px]">
                      import { '{ OSPluginAPI }' } from './plugin-sdk';<br/>
                      const api = new OSPluginAPI();
                    </code>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <div>
                    <div className="font-bold text-white/80">Publish to the marketplace</div>
                    <div className="text-white/40">Use the Publish tab to submit your plugin. Other users can discover, install, and rate it.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* API Reference */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-5">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-purple-400" /> Plugin API Reference
              </h3>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {[
                  { method: 'workspace.getCurrentWorkspace()', desc: 'Get active workspace ID' },
                  { method: 'workspace.getWorkspaceMembers()', desc: 'List workspace members' },
                  { method: 'files.listFiles()', desc: 'List files in workspace' },
                  { method: 'files.openFile(id)', desc: 'Open a file in the OS' },
                  { method: 'files.saveFile(name, content)', desc: 'Save a file to workspace' },
                  { method: 'events.emit(name, data)', desc: 'Emit a custom event' },
                  { method: 'events.subscribe(name, cb)', desc: 'Subscribe to events' },
                  { method: 'presence.getOnlineUsers()', desc: 'Get online user list' },
                  { method: 'presence.setActivity(text)', desc: 'Set your activity status' },
                  { method: 'ui.showNotification(msg)', desc: 'Show OS notification' },
                  { method: 'ui.openWindow(appId)', desc: 'Open another app' },
                  { method: 'auth.getCurrentUser()', desc: 'Get current user info' },
                  { method: 'auth.hasPermission(perm)', desc: 'Check user permissions' },
                  { method: 'ai.query(prompt, model)', desc: 'Query an AI model' },
                  { method: 'campaignLab.getCampaigns()', desc: 'List campaigns' },
                ].map(api => (
                  <div key={api.method} className="bg-black/50 p-2 rounded border border-white/5">
                    <div className="font-bold text-purple-400 font-mono">{api.method}</div>
                    <div className="text-white/40">{api.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Publish Tab ──────────────────────────────────────────────── */}
        {activeTab === 'publish' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-gradient-to-r from-emerald-900/50 to-blue-900/50 rounded-xl p-6 border border-emerald-500/20">
              <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-400" /> Publish Your Plugin
              </h2>
              <p className="text-white/60 text-sm">
                Share your plugin with the ContinuaOS community. Fill in the details below and submit for review.
              </p>
            </div>

            <div className="bg-white/5 rounded-xl border border-white/10 p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-white/60 mb-1 block">Plugin Name</label>
                <input
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={publishForm.name}
                  onChange={(e) => setPublishForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="My Awesome Plugin"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-white/60 mb-1 block">Version</label>
                  <input
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={publishForm.version}
                    onChange={(e) => setPublishForm(p => ({ ...p, version: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white/60 mb-1 block">Category</label>
                  <select
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={publishForm.category}
                    onChange={(e) => setPublishForm(p => ({ ...p, category: e.target.value as PluginCategory }))}
                  >
                    {CATEGORIES.filter(c => c.id !== 'Ecosystem Pack').map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-white/60 mb-1 block">Description</label>
                <textarea
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
                  rows={3}
                  value={publishForm.description}
                  onChange={(e) => setPublishForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe what your plugin does..."
                />
              </div>
              <div>
                <label className="text-xs font-bold text-white/60 mb-1 block">Author</label>
                <input
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={publishForm.author}
                  onChange={(e) => setPublishForm(p => ({ ...p, author: e.target.value }))}
                  placeholder="Your name or organization"
                />
              </div>

              {/* Runtime type */}
              <div>
                <label className="text-xs font-bold text-white/60 mb-1 block">Runtime Type</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPublishForm(p => ({ ...p, runtime: 'iframe' }))}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 border",
                      publishForm.runtime === 'iframe' ? "bg-blue-500 text-white border-blue-500" : "bg-white/5 text-white/40 border-white/10 hover:text-white/70",
                    )}
                  >
                    <Globe className="w-3 h-3" /> iframe (Sandboxed)
                  </button>
                  <button
                    onClick={() => setPublishForm(p => ({ ...p, runtime: 'native' }))}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 border",
                      publishForm.runtime === 'native' ? "bg-purple-500 text-white border-purple-500" : "bg-white/5 text-white/40 border-white/10 hover:text-white/70",
                    )}
                  >
                    <Code2 className="w-3 h-3" /> Native React
                  </button>
                </div>
              </div>

              {publishForm.runtime === 'iframe' && (
                <div>
                  <label className="text-xs font-bold text-white/60 mb-1 block">Entry URL</label>
                  <input
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={publishForm.entryUrl}
                    onChange={(e) => setPublishForm(p => ({ ...p, entryUrl: e.target.value }))}
                    placeholder="https://your-plugin.example.com/index.html"
                  />
                </div>
              )}

              {/* Permissions */}
              <div>
                <label className="text-xs font-bold text-white/60 mb-1 block">Required Permissions</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(PERMISSION_LABELS) as PluginPermission[]).map(perm => {
                    const info = PERMISSION_LABELS[perm];
                    const selected = publishForm.permissions.includes(perm);
                    return (
                      <button
                        key={perm}
                        onClick={() => setPublishForm(p => ({
                          ...p,
                          permissions: selected ? p.permissions.filter(pp => pp !== perm) : [...p.permissions, perm],
                        }))}
                        className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold transition-colors border flex items-center gap-1",
                          selected ? "bg-blue-500 text-white border-blue-500" : "bg-white/5 text-white/40 border-white/10",
                        )}
                      >
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          info.risk === 'low' ? "bg-emerald-400" : info.risk === 'medium' ? "bg-yellow-400" : "bg-red-400",
                        )} />
                        {info.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white/60 mb-1 block">Tags (comma-separated)</label>
                <input
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={publishForm.tags}
                  onChange={(e) => setPublishForm(p => ({ ...p, tags: e.target.value }))}
                  placeholder="design, productivity, automation"
                />
              </div>

              <button
                onClick={() => {
                  const manifest: PluginManifest = {
                    id: publishForm.name.toLowerCase().replace(/\s+/g, '-') + '-' + crypto.randomUUID().slice(0, 6),
                    name: publishForm.name,
                    version: publishForm.version,
                    description: publishForm.description,
                    author: publishForm.author,
                    category: publishForm.category,
                    permissions: publishForm.permissions,
                    runtime: publishForm.runtime,
                    entryUrl: publishForm.runtime === 'iframe' ? publishForm.entryUrl : undefined,
                    roles: ['admin', 'filmmaker', 'technician', 'designer', 'client', 'user'],
                    tags: publishForm.tags.split(',').map(t => t.trim()).filter(Boolean),
                    source: 'marketplace',
                    rating: 0,
                    installCount: 0,
                    publishedAt: Date.now(),
                  };
                  const validation = PluginService.validateManifest(manifest);
                  if (!validation.valid) {
                    alert(`Validation errors:\n${validation.errors.join('\n')}`);
                    return;
                  }
                  // Register locally via plugin store
                  usePluginStore.getState().registerPlugin(manifest);
                  PluginService.install(manifest.id);
                  handleInstall(manifest.id);
                  // Submit to server API
                  fetch('/api/plugins', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(manifest),
                  }).catch(() => { /* server may not be available */ });
                  setPublishForm({ name: '', version: '1.0.0', description: '', author: '', category: 'utility', entryUrl: '', runtime: 'iframe', permissions: [], tags: '' });
                  setActiveTab('installed');
                }}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                disabled={!publishForm.name || !publishForm.description}
              >
                <Send className="w-4 h-4" /> Publish Plugin
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
