'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useWindowStore } from '@/lib/stores/window.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { Search, Zap, ZapOff, Cloud, ShieldCheck, Power, Users, RefreshCw } from 'lucide-react';
import { PresenceIndicator } from '@/components/presence-indicator';
import { WorkspaceSelector } from '@/components/workspace-selector';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

function OsClock() {
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) return null;
  return <>{format(time, 'EEE MMM d  h:mm a')}</>;
}

function OsSyncStatus() {
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const syncTimer = setInterval(() => {
      setIsSyncing(true);
      timeout = setTimeout(() => setIsSyncing(false), 2000);
    }, 15000);
    return () => {
      clearInterval(syncTimer);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  return isSyncing ? (
    <div className="flex items-center gap-1.5 text-blue-400">
      <RefreshCw className="w-3 h-3 animate-spin" />
      <span className="hidden sm:inline text-xs">Syncing to Cloud...</span>
    </div>
  ) : (
    <div className="flex items-center gap-1.5 text-white/50 hover:text-white/80 cursor-default transition-colors">
      <Cloud className="w-4 h-4" />
      <span className="hidden sm:inline text-xs">Synced</span>
    </div>
  );
}

interface MenuBarProps {
  showLaunchpad: boolean;
  setShowLaunchpad: (v: boolean | ((p: boolean) => boolean)) => void;
  showControlCenter: boolean;
  setShowControlCenter: (v: boolean) => void;
  setShowMissionControl: (v: boolean) => void;
  showSnapshots: boolean;
  setShowSnapshots: (v: boolean) => void;
  applyWorkspaceLayout: (layout: 'creative-split') => void;
  performanceMode: 'light' | 'heavy';
  setPerformanceMode: (mode: 'light' | 'heavy') => void;
  logout: () => void;
  wipeSession: () => void;
}

export function MenuBar({
  showLaunchpad,
  setShowLaunchpad,
  showControlCenter,
  setShowControlCenter,
  setShowMissionControl,
  showSnapshots,
  setShowSnapshots,
  applyWorkspaceLayout,
  performanceMode,
  setPerformanceMode,
  logout,
  wipeSession,
}: MenuBarProps) {
  const { currentUser } = useAuthStore();
  const { workspaceMode, setWorkspaceMode, activeWorkspace, setActiveWorkspace } = useWorkspaceStore();

  if (!currentUser) return null;

  return (
    <header role="menubar" aria-label="OS menu bar" className="h-7 flex items-center shrink-0 w-full bg-black/20 backdrop-blur-3xl border-b border-white/10 z-[260] px-4 sticky top-0 text-[13px] font-medium text-white/90">
      <div className="flex items-center gap-6">
        <div
          className="font-bold text-white flex items-center gap-2 cursor-pointer hover:scale-110 transition-transform"
          onClick={() => setShowLaunchpad(!showLaunchpad)}
        >
          
        </div>
        <div className="font-bold flex items-center cursor-default uppercase tracking-wider text-xs bg-white/20 px-2 py-0.5 rounded gap-2">
          {currentUser.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentUser.avatarUrl} alt="avatar" className="w-4 h-4 rounded-full" referrerPolicy="no-referrer" loading="lazy" />
          )}
          {currentUser.name}
        </div>
        <div className="hidden sm:flex gap-4">
          <div className="group relative">
            <button role="menuitem" className="hover:bg-white/20 px-2 py-0.5 rounded transition-colors cursor-default">File</button>
            <div role="menu" className="absolute top-full left-0 mt-1 scale-0 group-hover:scale-100 transition-transform origin-top-left bg-black/80 backdrop-blur-xl border border-white/10 text-white text-xs font-medium rounded-lg shadow-2xl py-1 min-w-[160px] z-[300]">
              <button role="menuitem" className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors" onClick={() => window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Saved State', message: 'OS State saved.' } }))}>Save Desktop State</button>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors" onClick={() => window.dispatchEvent(new CustomEvent('os:open-spotlight'))}>New File (Spotlight)</button>
              <div className="h-px bg-white/10 my-1"></div>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 hover:bg-rose-500 hover:text-white transition-colors" onClick={() => wipeSession()}>Wipe Local Data</button>
            </div>
          </div>
          <div className="group relative">
            <button role="menuitem" className="hover:bg-white/20 px-2 py-0.5 rounded transition-colors cursor-default">Edit</button>
            <div role="menu" className="absolute top-full left-0 mt-1 scale-0 group-hover:scale-100 transition-transform origin-top-left bg-black/80 backdrop-blur-xl border border-white/10 text-white text-xs font-medium rounded-lg shadow-2xl py-1 min-w-[160px] z-[300]">
              <button role="menuitem" className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors text-white/50">Undo (Cmd+Z)</button>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors text-white/50">Redo (Cmd+Shift+Z)</button>
              <div className="h-px bg-white/10 my-1"></div>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors" onClick={() => setShowLaunchpad(true)}>Edit OS Apps</button>
            </div>
          </div>
          <div className="group relative">
            <button role="menuitem" className="hover:bg-white/20 px-2 py-0.5 rounded transition-colors cursor-default">View</button>
            <div role="menu" className="absolute top-full left-0 mt-1 scale-0 group-hover:scale-100 transition-transform origin-top-left bg-black/80 backdrop-blur-xl border border-white/10 text-white text-xs font-medium rounded-lg shadow-2xl py-1 min-w-[160px] z-[300]">
              <button role="menuitem" className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-between" onClick={() => applyWorkspaceLayout('creative-split')}>Multi-View Workspace</button>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors" onClick={() => setShowMissionControl(true)}>Mission Control</button>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors" onClick={() => setShowSnapshots(!showSnapshots)}>Time Machine</button>
            </div>
          </div>

          <div className="border-l border-white/20 pl-4">
            <WorkspaceSelector />
          </div>

          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-white/20">
            {[0, 1, 2].map(ws => (
              <button
                key={ws}
                onClick={() => setActiveWorkspace(ws)}
                className={cn(
                  "px-2 py-0.5 rounded text-xs transition-colors",
                  activeWorkspace === ws ? "bg-white/20 text-white" : "text-white/60 hover:text-white/90 hover:bg-white/10"
                )}
              >
                Desktop {ws + 1}
              </button>
            ))}
          </div>

          <div className="flex items-center ml-4 pl-4 border-l border-white/20">
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
              className="flex items-center gap-2 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Search (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="text-xs opacity-50 font-mono">⌘K</span>
            </button>
          </div>

          <div className="flex items-center gap-1 ml-4 pl-4 border-l border-white/20 bg-black/20 rounded-md p-0.5 border border-white/10 shadow-inner">
            <button
              onClick={() => setWorkspaceMode('private')}
              className={cn(
                "px-3 py-1 rounded text-xs font-semibold tracking-wide transition-all",
                workspaceMode === 'private' ? "bg-white text-black shadow-md" : "text-white/50 hover:text-white/90"
              )}
            >
              Private
            </button>
            <button
              onClick={() => setWorkspaceMode('agency')}
              className={cn(
                "px-3 py-1 rounded text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5",
                workspaceMode === 'agency' ? "bg-blue-500 text-white shadow-md shadow-blue-500/20" : "text-white/50 hover:text-white/90"
              )}
            >
              <Users className="w-3.5 h-3.5" />
              Agency
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 ml-auto">
        <div className="flex items-center gap-2 border-r border-white/10 pr-4">
          <PresenceIndicator />
        </div>
        <div className="flex items-center gap-4 border-r border-white/10 pr-4">
          <button
            onClick={() => setPerformanceMode(performanceMode === 'heavy' ? 'light' : 'heavy')}
            className={cn(
              "flex items-center gap-1.5 transition-colors cursor-pointer text-xs group px-2 py-1 rounded",
              performanceMode === 'light' ? "text-amber-400 bg-amber-400/10 hover:bg-amber-400/20" : "text-white/50 hover:text-white/80 hover:bg-white/5"
            )}
            title={performanceMode === 'light' ? "Light Mode Active" : "Heavy Mode Active"}
          >
            {performanceMode === 'light' ? <ZapOff className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline font-medium tracking-wide">
              {performanceMode === 'light' ? 'Light' : 'Heavy'}
            </span>
          </button>
          <OsSyncStatus />
          <div className="group relative flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-400/80 hover:text-emerald-400 cursor-pointer transition-colors" />
            <div className="absolute top-full right-0 mt-2 scale-0 group-hover:scale-100 transition-transform px-3 py-2 bg-black/80 backdrop-blur-xl border border-white/10 text-white text-xs font-medium rounded shadow-xl whitespace-nowrap z-[100]">
              <div className="font-bold text-emerald-400 mb-1">Sandboxed Environment</div>
              <div className="text-white/60">Apps are isolated & secure.</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="cursor-pointer hover:text-white text-white/80 transition-colors focus:outline-none"
            onClick={() => window.dispatchEvent(new CustomEvent('os:open-spotlight'))}
            title="Global Search (Cmd/Ctrl + K)"
          >
            <Search className="w-4 h-4" />
          </button>
          <div className="group relative flex items-center justify-center">
            <Power onClick={() => logout()} className="w-4 h-4 text-rose-500/80 hover:text-rose-500 cursor-pointer transition-colors" />
            <div className="absolute top-full right-0 mt-2 scale-0 group-hover:scale-100 transition-transform px-3 py-2 bg-rose-500/20 backdrop-blur-xl border border-rose-500/30 text-white text-xs font-medium rounded shadow-xl whitespace-nowrap z-[100]">
              Sign Out
            </div>
          </div>
          <button
            className="text-white/90 cursor-pointer hover:text-white ml-2 focus:outline-none flex items-center gap-2 px-2 py-1 rounded hover:bg-white/10 transition-colors"
            onClick={() => setShowControlCenter(!showControlCenter)}
          >
            <OsClock />
          </button>
        </div>
      </div>
    </header>
  );
}
