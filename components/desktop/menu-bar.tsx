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
    <div className="flex items-center gap-1.5" style={{ color: 'var(--os-primary)' }}>
      <RefreshCw className="w-3 h-3 animate-spin" />
      <span className="hidden sm:inline text-xs">Syncing to Cloud...</span>
    </div>
  ) : (
    <div className="flex items-center gap-1.5 transition-colors cursor-default" style={{ color: 'var(--os-text-muted)' }}>
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
    <header role="menubar" aria-label="OS menu bar" className="h-8 flex items-center shrink-0 w-full glass-panel rounded-none border-x-0 border-t-0 z-[260] px-4 sticky top-0 text-[13px] font-medium contain-layout" style={{ color: 'var(--os-text)' }}>
      <div className="flex items-center gap-6">
        <div
          className="font-bold flex items-center gap-2 cursor-pointer hover:scale-110 transition-transform"
          onClick={() => setShowLaunchpad(!showLaunchpad)}
        >
          
        </div>
        <div className="font-bold flex items-center cursor-default uppercase tracking-wider text-xs px-2 py-0.5 rounded gap-2" style={{ background: 'var(--os-hover)' }}>
          {currentUser.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentUser.avatarUrl} alt="avatar" className="w-4 h-4 rounded-full" referrerPolicy="no-referrer" loading="lazy" />
          )}
          {currentUser.name}
        </div>
        <div className="hidden sm:flex gap-4">
          <div className="group relative">
            <button role="menuitem" className="px-2 py-0.5 rounded transition-colors cursor-default" style={{ color: 'var(--os-text)' }}>File</button>
            <div role="menu" className="absolute top-full left-0 mt-1 scale-0 group-hover:scale-100 transition-transform origin-top-left glass-panel text-xs font-medium rounded-lg shadow-2xl py-1 min-w-[160px] z-[300]" style={{ color: 'var(--os-text)' }}>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" style={{ color: 'var(--os-text-muted)' }} onClick={() => window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Saved State', description: 'OS State saved.', type: 'success' } }))}>Save Desktop State</button>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" style={{ color: 'var(--os-text-muted)' }} onClick={() => window.dispatchEvent(new CustomEvent('os:open-spotlight'))}>New File (Spotlight)</button>
              <div className="h-px my-1" style={{ background: 'var(--os-border)' }}></div>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" onClick={() => wipeSession()}>Wipe Local Data</button>
            </div>
          </div>
          <div className="group relative">
            <button role="menuitem" className="px-2 py-0.5 rounded transition-colors cursor-default" style={{ color: 'var(--os-text)' }}>Edit</button>
            <div role="menu" className="absolute top-full left-0 mt-1 scale-0 group-hover:scale-100 transition-transform origin-top-left glass-panel text-xs font-medium rounded-lg shadow-2xl py-1 min-w-[160px] z-[300]" style={{ color: 'var(--os-text)' }}>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" style={{ color: 'var(--os-text-muted)' }}>Undo (Cmd+Z)</button>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" style={{ color: 'var(--os-text-muted)' }}>Redo (Cmd+Shift+Z)</button>
              <div className="h-px my-1" style={{ background: 'var(--os-border)' }}></div>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" style={{ color: 'var(--os-text-muted)' }} onClick={() => setShowLaunchpad(true)}>Edit OS Apps</button>
            </div>
          </div>
          <div className="group relative">
            <button role="menuitem" className="px-2 py-0.5 rounded transition-colors cursor-default" style={{ color: 'var(--os-text)' }}>View</button>
            <div role="menu" className="absolute top-full left-0 mt-1 scale-0 group-hover:scale-100 transition-transform origin-top-left glass-panel text-xs font-medium rounded-lg shadow-2xl py-1 min-w-[160px] z-[300]" style={{ color: 'var(--os-text)' }}>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" style={{ color: 'var(--os-text-muted)' }} onClick={() => applyWorkspaceLayout('creative-split')}>Multi-View Workspace</button>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" style={{ color: 'var(--os-text-muted)' }} onClick={() => setShowMissionControl(true)}>Mission Control</button>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" style={{ color: 'var(--os-text-muted)' }} onClick={() => setShowSnapshots(!showSnapshots)}>Time Machine</button>
            </div>
          </div>

          <div className="pl-4" style={{ borderLeft: '1px solid var(--os-border)' }}>
            <WorkspaceSelector />
          </div>

          <div className="flex items-center gap-2 ml-4 pl-4" style={{ borderLeft: '1px solid var(--os-border)' }}>
            {[0, 1, 2].map(ws => (
              <button
                key={ws}
                onClick={() => setActiveWorkspace(ws)}
                className="px-2 py-0.5 rounded text-xs transition-colors"
                style={{
                  background: activeWorkspace === ws ? 'var(--os-hover)' : 'transparent',
                  color: activeWorkspace === ws ? 'var(--os-text)' : 'var(--os-text-muted)',
                }}
              >
                Desktop {ws + 1}
              </button>
            ))}
          </div>

          <div className="flex items-center ml-4 pl-4" style={{ borderLeft: '1px solid var(--os-border)' }}>
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
              className="flex items-center gap-2 px-2 py-1 rounded transition-colors cursor-pointer"
              style={{ background: 'var(--os-hover)', color: 'var(--os-text-muted)' }}
              title="Search (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="text-xs opacity-50 font-mono">⌘K</span>
            </button>
          </div>

          <div className="flex items-center gap-1 ml-4 pl-4 rounded-md p-0.5" style={{ borderLeft: '1px solid var(--os-border)', background: 'var(--os-hover)' }}>
            <button
              onClick={() => setWorkspaceMode('private')}
              className="px-3 py-1 rounded text-xs font-semibold tracking-wide transition-all"
              style={{
                background: workspaceMode === 'private' ? 'var(--os-surface)' : 'transparent',
                color: workspaceMode === 'private' ? 'var(--os-text)' : 'var(--os-text-muted)',
                boxShadow: workspaceMode === 'private' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Private
            </button>
            <button
              onClick={() => setWorkspaceMode('agency')}
              className="px-3 py-1 rounded text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5"
              style={{
                background: workspaceMode === 'agency' ? 'var(--os-primary)' : 'transparent',
                color: workspaceMode === 'agency' ? 'white' : 'var(--os-text-muted)',
                boxShadow: workspaceMode === 'agency' ? '0 1px 3px rgba(0,88,188,0.2)' : 'none',
              }}
            >
              <Users className="w-3.5 h-3.5" />
              Agency
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 ml-auto">
        <div className="flex items-center gap-2 pr-4" style={{ borderRight: '1px solid var(--os-border)' }}>
          <PresenceIndicator />
        </div>
        <div className="flex items-center gap-4 pr-4" style={{ borderRight: '1px solid var(--os-border)' }}>
          <button
            onClick={() => setPerformanceMode(performanceMode === 'heavy' ? 'light' : 'heavy')}
            className="flex items-center gap-1.5 transition-colors cursor-pointer text-xs group px-2 py-1 rounded"
            title={performanceMode === 'light' ? "Light Mode Active" : "Heavy Mode Active"}
            style={{
              color: performanceMode === 'light' ? '#f59e0b' : 'var(--os-text-muted)',
              background: performanceMode === 'light' ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
            }}
          >
            {performanceMode === 'light' ? <ZapOff className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline font-medium tracking-wide">
              {performanceMode === 'light' ? 'Light' : 'Heavy'}
            </span>
          </button>
          <OsSyncStatus />
          <div className="group relative flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 hover:opacity-100 cursor-pointer transition-colors" style={{ opacity: 0.7 }} />
            <div className="absolute top-full right-0 mt-2 scale-0 group-hover:scale-100 transition-transform px-3 py-2 glass-panel text-xs font-medium rounded shadow-xl whitespace-nowrap z-[100]" style={{ color: 'var(--os-text)' }}>
              <div className="font-bold mb-1" style={{ color: '#10b981' }}>Sandboxed Environment</div>
              <div style={{ color: 'var(--os-text-muted)' }}>Apps are isolated & secure.</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="cursor-pointer transition-colors focus:outline-none"
            onClick={() => window.dispatchEvent(new CustomEvent('os:open-spotlight'))}
            title="Global Search (Cmd/Ctrl + K)"
            style={{ color: 'var(--os-text-muted)' }}
          >
            <Search className="w-4 h-4" />
          </button>
          <div className="group relative flex items-center justify-center">
            <Power onClick={() => logout()} className="w-4 h-4 cursor-pointer transition-colors" style={{ color: 'var(--os-error)', opacity: 0.8 }} />
            <div className="absolute top-full right-0 mt-2 scale-0 group-hover:scale-100 transition-transform px-3 py-2 glass-panel text-xs font-medium rounded shadow-xl whitespace-nowrap z-[100]" style={{ color: 'var(--os-text)' }}>
              Sign Out
            </div>
          </div>
          <button
            className="cursor-pointer transition-colors focus:outline-none flex items-center gap-2 px-2 py-1 rounded transition-colors"
            onClick={() => setShowControlCenter(!showControlCenter)}
            style={{ color: 'var(--os-text)' }}
          >
            <OsClock />
          </button>
        </div>
      </div>
    </header>
  );
}
