'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useWindowStore } from '@/lib/stores/window.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { Search, Zap, ZapOff, Cloud, ShieldCheck, Power, Users, RefreshCw, Bell, Wifi } from 'lucide-react';
import { PresenceIndicator } from '@/components/presence-indicator';
import { WorkspaceSelector } from '@/components/workspace-selector';
import { useCollabStatusStore } from '@/lib/stores/collab-status.store';
import { useNotificationStore } from '@/lib/stores/notification.store';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useHardwareState } from '@/lib/hooks/use-hardware';
import { Battery, BatteryCharging } from 'lucide-react';

import { usePomodoroStore } from '@/lib/stores/pomodoro.store';

function OsClock() {
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const { isActive, timeLeft, mode, startFocus, stop } = usePomodoroStore();

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) return null;

  const formatPomodoroTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center gap-3">
      {isActive && (
        <div 
          className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs cursor-pointer font-bold transition-all"
          onClick={(e) => { e.stopPropagation(); stop(); }}
          style={{ 
            background: mode === 'focus' ? 'var(--os-error, #ef4444)' : 'var(--os-primary, #10b981)',
            color: '#fff',
            boxShadow: `0 0 8px ${mode === 'focus' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
          }}
          title={mode === 'focus' ? 'Click to stop Focus Mode' : 'Click to end Break'}
        >
          <span className="animate-pulse">{mode === 'focus' ? '🎯' : '☕'}</span>
          <span>{formatPomodoroTime(timeLeft)}</span>
        </div>
      )}
      {!isActive && (
        <div 
          className="text-[10px] uppercase font-bold tracking-widest text-slate-400 hover:text-slate-200 cursor-pointer px-1 transition-colors"
          onClick={(e) => { e.stopPropagation(); startFocus(); }}
          title="Start Pomodoro Focus Session"
        >
          FOCUS
        </div>
      )}
      <div className="border-l border-white/10 h-4 mx-1"></div>
      <span className="tabular-nums">{format(time, 'EEE MMM d  h:mm a')}</span>
    </div>
  );
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
  const currentUser = useAuthStore((s) => s.currentUser);
  const workspaceMode = useWorkspaceStore((s) => s.workspaceMode);
  const setWorkspaceMode = useWorkspaceStore((s) => s.setWorkspaceMode);
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const isConnected = useCollabStatusStore((s) => s.isConnected());
  const totalPeers = useCollabStatusStore((s) => s.totalPeers());
  const unreadCount = useNotificationStore((s) => s.notifications.filter(n => !n.read).length);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { battery, network } = useHardwareState();

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenu]);

  if (!currentUser) return null;

  return (
    <header role="menubar" aria-label="OS menu bar" className="h-8 flex items-center shrink-0 w-full glass-panel rounded-none border-x-0 border-t-0 z-[260] px-4 sticky top-0 text-[13px] font-medium contain-layout" style={{ color: 'var(--os-text)' }}>
      <div className="flex items-center gap-6">
        <div
          className="font-bold flex items-center gap-2 cursor-pointer hover:scale-110 transition-transform select-none"
          onClick={() => setShowLaunchpad(!showLaunchpad)}
          title="Launchpad"
        >
          <span
            className="w-5 h-5 flex items-center justify-center rounded-md text-[13px] font-black"
            style={{
              background: 'linear-gradient(135deg, var(--os-primary) 0%, #06b6d4 100%)',
              color: '#000',
              boxShadow: '0 0 8px var(--os-primary-muted, rgba(16,244,160,0.3))',
            }}
          >
            C
          </span>
        </div>
        <div className="font-bold flex items-center cursor-default uppercase tracking-wider text-xs px-2 py-0.5 rounded gap-2" style={{ background: 'var(--os-hover)' }}>
          {currentUser.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img loading="lazy" src={currentUser.avatarUrl} alt="avatar" className="w-4 h-4 rounded-full" referrerPolicy="no-referrer" />
          )}
          {currentUser.name}
        </div>
        <div className="hidden sm:flex gap-4">
          <div className="group relative">
            <button role="menuitem" className="px-2 py-0.5 rounded transition-colors cursor-default" style={{ color: 'var(--os-text)' }} aria-expanded={openMenu === 'file'} aria-haspopup="true" onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')} onKeyDown={(e) => { if (e.key === 'Escape') setOpenMenu(null); if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenMenu(openMenu === 'file' ? null : 'file'); } }}>File</button>
            <div role="menu" className={cn("absolute top-full left-0 mt-1 transition-transform origin-top-left glass-panel text-xs font-medium rounded-lg shadow-2xl py-1 min-w-[160px] z-[300]", openMenu === 'file' ? "scale-100" : "scale-0 group-hover:scale-100")} style={{ color: 'var(--os-text)' }} onMouseLeave={() => setOpenMenu(null)}>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" style={{ color: 'var(--os-text-muted)' }} onClick={(e) => { e.stopPropagation(); setOpenMenu(null); window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Saved State', description: 'OS State saved.', type: 'success' } })); }}>Save Desktop State</button>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" style={{ color: 'var(--os-text-muted)' }} onClick={(e) => { e.stopPropagation(); setOpenMenu(null); window.dispatchEvent(new CustomEvent('os:open-spotlight')); }}>New File (Spotlight)</button>
              <div className="h-px my-1" style={{ background: 'var(--os-border)' }}></div>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" onClick={(e) => { e.stopPropagation(); setOpenMenu(null); wipeSession(); }}>Wipe Local Data</button>
            </div>
          </div>
          <div className="group relative">
            <button role="menuitem" className="px-2 py-0.5 rounded transition-colors cursor-default" style={{ color: 'var(--os-text)' }} aria-expanded={openMenu === 'edit'} aria-haspopup="true" onClick={() => setOpenMenu(openMenu === 'edit' ? null : 'edit')} onKeyDown={(e) => { if (e.key === 'Escape') setOpenMenu(null); if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenMenu(openMenu === 'edit' ? null : 'edit'); } }}>Edit</button>
            <div role="menu" className={cn("absolute top-full left-0 mt-1 transition-transform origin-top-left glass-panel text-xs font-medium rounded-lg shadow-2xl py-1 min-w-[160px] z-[300]", openMenu === 'edit' ? "scale-100" : "scale-0 group-hover:scale-100")} style={{ color: 'var(--os-text)' }} onMouseLeave={() => setOpenMenu(null)}>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" style={{ color: 'var(--os-text-muted)' }} onClick={(e) => { e.stopPropagation(); setOpenMenu(null); }}>Undo (Cmd+Z)</button>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" style={{ color: 'var(--os-text-muted)' }} onClick={(e) => { e.stopPropagation(); setOpenMenu(null); }}>Redo (Cmd+Shift+Z)</button>
              <div className="h-px my-1" style={{ background: 'var(--os-border)' }}></div>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" style={{ color: 'var(--os-text-muted)' }} onClick={(e) => { e.stopPropagation(); setOpenMenu(null); setShowLaunchpad(true); }}>Edit OS Apps</button>
            </div>
          </div>
          <div className="group relative">
            <button role="menuitem" className="px-2 py-0.5 rounded transition-colors cursor-default" style={{ color: 'var(--os-text)' }} aria-expanded={openMenu === 'view'} aria-haspopup="true" onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')} onKeyDown={(e) => { if (e.key === 'Escape') setOpenMenu(null); if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenMenu(openMenu === 'view' ? null : 'view'); } }}>View</button>
            <div role="menu" className={cn("absolute top-full left-0 mt-1 transition-transform origin-top-left glass-panel text-xs font-medium rounded-lg shadow-2xl py-1 min-w-[160px] z-[300]", openMenu === 'view' ? "scale-100" : "scale-0 group-hover:scale-100")} style={{ color: 'var(--os-text)' }} onMouseLeave={() => setOpenMenu(null)}>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" style={{ color: 'var(--os-text-muted)' }} onClick={(e) => { e.stopPropagation(); setOpenMenu(null); applyWorkspaceLayout('creative-split'); }}>Multi-View Workspace</button>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" style={{ color: 'var(--os-text-muted)' }} onClick={(e) => { e.stopPropagation(); setOpenMenu(null); setShowMissionControl(true); }}>Mission Control</button>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" style={{ color: 'var(--os-text-muted)' }} onClick={(e) => { e.stopPropagation(); setOpenMenu(null); setShowSnapshots(!showSnapshots); }}>Time Machine</button>
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
                boxShadow: workspaceMode === 'agency' ? '0 1px 3px rgba(16,244,160,0.3)' : 'none',
              }}
            >
              <Users className="w-3.5 h-3.5" />
              Agency
              {workspaceMode === 'agency' && (
                <span className="flex items-center gap-1 ml-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: isConnected ? '#10b981' : '#ef4444',
                      boxShadow: isConnected ? '0 0 4px #10b981' : '0 0 4px #ef4444',
                    }}
                  />
                  {totalPeers > 0 && (
                    <span className="text-[10px] opacity-80">{totalPeers}</span>
                  )}
                </span>
              )}
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
          {network && (
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest" style={{ color: 'var(--os-text-muted)' }} title={`Network: ${network.effectiveType}`}>
              <Wifi className="w-3.5 h-3.5" />
            </div>
          )}
          {battery && (
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--os-text-muted)' }} title={`Battery: ${Math.round(battery.level * 100)}%`}>
              {Math.round(battery.level * 100)}%
              {battery.charging ? <BatteryCharging className="w-4 h-4 text-green-400" /> : <Battery className="w-4 h-4" />}
            </div>
          )}
          <button
            className="cursor-pointer transition-colors focus:outline-none relative"
            onClick={() => window.dispatchEvent(new CustomEvent('os:toggle-notification-center'))}
            title="Notification Center"
            style={{ color: 'var(--os-text-muted)' }}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 flex items-center justify-center bg-red-500 text-white text-[8px] font-bold rounded-full border border-[var(--os-bg)] px-0.5 leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
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
            className="cursor-pointer transition-colors focus:outline-none flex items-center gap-2 px-2 py-1 rounded transition-colors relative"
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
