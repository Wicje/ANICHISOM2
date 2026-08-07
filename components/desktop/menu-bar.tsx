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

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) return null;

  return (
    <span className="tabular-nums font-semibold">{format(time, 'EEE MMM d  h:mm a')}</span>
  );
}

function OsSyncStatus() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <div className="flex items-center gap-1.5 cursor-default select-none" style={{ color: online ? '#10b981' : 'var(--os-text-muted)' }}>
      <span className={cn("w-2 h-2 rounded-full", online ? "bg-emerald-400 shadow-[0_0_6px_#10b981]" : "bg-slate-400")} />
      <span className="hidden sm:inline text-xs font-medium">{online ? 'Online' : 'Offline'}</span>
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
  const openWindow = useWindowStore((s) => s.openWindow);
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

  const [showWifiMenu, setShowWifiMenu] = useState(false);
  const [activeWifi, setActiveWifi] = useState('Continua_Studio_5G');
  const [wifiEnabled, setWifiEnabled] = useState(true);

  const wifiNetworks = [
    { ssid: 'Continua_Studio_5G', signal: '100%', secured: true },
    { ssid: 'Fiber_Ultra_Guest', signal: '85%', secured: true },
    { ssid: 'Home_Lab_Mesh', signal: '70%', secured: true },
    { ssid: 'Direct_5G_Hotspot', signal: '60%', secured: false },
  ];

  const activeUser = currentUser || {
    id: 'guest-user',
    name: 'Continua User',
    role: 'admin' as const,
    avatarUrl: '/images/avatar_cyber.jpg',
  };

  return (
    <header role="menubar" aria-label="OS menu bar" className="h-8 flex items-center shrink-0 w-full glass-panel rounded-none border-x-0 border-t-0 z-[260] px-4 sticky top-0 text-[13px] font-medium contain-layout" style={{ color: 'var(--os-text)' }}>
      <div className="flex items-center gap-6">
        <div
          className="font-bold flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform select-none"
          onClick={() => setShowLaunchpad(!showLaunchpad)}
          title="Launchpad / App Launcher"
        >
          {activeUser.avatarUrl ? (
            <img 
              src={activeUser.avatarUrl} 
              alt="User Avatar" 
              className="w-6 h-6 rounded-lg object-cover border border-[#10F4A0]/50 shadow-md shadow-[#10F4A0]/20" 
            />
          ) : (
            <span
              className="w-6 h-6 flex items-center justify-center rounded-lg text-[13px] font-black"
              style={{
                background: 'linear-gradient(135deg, var(--os-primary) 0%, #06b6d4 100%)',
                color: '#000',
                boxShadow: '0 0 8px var(--os-primary-muted, rgba(16,244,160,0.3))',
              }}
            >
              C
            </span>
          )}
        </div>
        <div 
          className="font-bold flex items-center cursor-pointer hover:bg-white/10 transition-colors uppercase tracking-wider text-xs px-2.5 py-1 rounded-lg gap-2 border border-white/10" 
          onClick={() => openWindow('settings', 'Settings')}
          title="Account Settings & Avatar"
        >
          {activeUser.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img loading="lazy" src={activeUser.avatarUrl} alt="avatar" className="w-5 h-5 rounded-full object-cover border border-[#10F4A0]/50" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#10F4A0] to-cyan-400 text-slate-950 flex items-center justify-center text-[10px] font-black">
              {activeUser.name?.[0] || 'C'}
            </div>
          )}
          <span>{activeUser.name}</span>
        </div>
        <div className="hidden sm:flex gap-4">
          <div className="group relative">
            <button role="menuitem" className="px-2 py-0.5 rounded transition-colors cursor-default" style={{ color: 'var(--os-text)' }} aria-expanded={openMenu === 'file'} aria-haspopup="true" onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')} onKeyDown={(e) => { if (e.key === 'Escape') setOpenMenu(null); if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenMenu(openMenu === 'file' ? null : 'file'); } }}>File</button>
            <div role="menu" className={cn("absolute top-full left-0 mt-1 transition-transform origin-top-left glass-panel text-xs font-medium rounded-lg shadow-2xl py-1 min-w-[180px] z-[300]", openMenu === 'file' ? "scale-100" : "scale-0 group-hover:scale-100")} style={{ color: 'var(--os-text)' }} onMouseLeave={() => setOpenMenu(null)}>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" style={{ color: 'var(--os-text-muted)' }} onClick={(e) => { e.stopPropagation(); setOpenMenu(null); useWorkspaceStore.getState().saveSnapshot('Desktop State', useWindowStore.getState().windows); window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Saved State', description: 'OS Workspace layout saved. Restore it from Time Machine.', type: 'success' } })); }}>Save Desktop State</button>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" style={{ color: 'var(--os-text-muted)' }} onClick={(e) => { e.stopPropagation(); setOpenMenu(null); window.dispatchEvent(new CustomEvent('os:open-spotlight')); }}>New File (Spotlight)</button>
              <div className="h-px my-1" style={{ background: 'var(--os-border)' }}></div>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors text-rose-400 font-semibold" onClick={(e) => { e.stopPropagation(); setOpenMenu(null); wipeSession(); }}>Wipe Local Data</button>
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
            <div role="menu" className={cn("absolute top-full left-0 mt-1 transition-transform origin-top-left glass-panel text-xs font-medium rounded-lg shadow-2xl py-1 min-w-[180px] z-[300]", openMenu === 'view' ? "scale-100" : "scale-0 group-hover:scale-100")} style={{ color: 'var(--os-text)' }} onMouseLeave={() => setOpenMenu(null)}>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors font-semibold text-cyan-400" onClick={(e) => { e.stopPropagation(); setOpenMenu(null); useThemeStore.getState().toggleNotch(); }}>Toggle Hardware Notch</button>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors font-bold text-[#10F4A0]" onClick={(e) => { e.stopPropagation(); setOpenMenu(null); window.dispatchEvent(new CustomEvent('os:open-spatial')); }}>3D Spatial Stage Manager</button>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors font-bold text-cyan-300" onClick={(e) => { e.stopPropagation(); setOpenMenu(null); window.dispatchEvent(new CustomEvent('os:open-timemachine')); }}>Visual OS Time Machine</button>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors font-bold text-emerald-300" onClick={(e) => { e.stopPropagation(); setOpenMenu(null); openWindow('p2p-airdrop', 'AirDrop P2P'); }}>P2P AirDrop Transfer</button>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" style={{ color: 'var(--os-text-muted)' }} onClick={(e) => { e.stopPropagation(); setOpenMenu(null); openWindow('virtual-display-manager', 'Multi-Monitor Manager'); }}>Multi-Monitor Manager</button>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" style={{ color: 'var(--os-text-muted)' }} onClick={(e) => { e.stopPropagation(); setOpenMenu(null); applyWorkspaceLayout('creative-split'); }}>Multi-View Workspace</button>
              <button role="menuitem" className="w-full text-left px-4 py-1.5 transition-colors" style={{ color: 'var(--os-text-muted)' }} onClick={(e) => { e.stopPropagation(); setOpenMenu(null); setShowMissionControl(true); }}>Mission Control</button>
            </div>
          </div>

          <div className="flex items-center ml-4 pl-4" style={{ borderLeft: '1px solid var(--os-border)' }}>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('os:open-spotlight'))}
              className="flex items-center gap-2 px-2.5 py-1 rounded transition-colors cursor-pointer hover:bg-white/10"
              style={{ background: 'var(--os-hover)', color: 'var(--os-text-muted)' }}
              title="Search (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="text-xs opacity-70 font-mono">⌘K</span>
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
          <OsSyncStatus />
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <button
              onClick={(e) => { e.stopPropagation(); setShowWifiMenu(!showWifiMenu); }}
              className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
              style={{ color: wifiEnabled ? '#10b981' : 'var(--os-text-muted)' }}
              title={`Wi-Fi: ${wifiEnabled ? activeWifi : 'Off'}`}
            >
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden md:inline font-mono opacity-80 max-w-[100px] truncate">{wifiEnabled ? activeWifi : 'Off'}</span>
            </button>

            {showWifiMenu && (
              <div 
                className="absolute top-full right-0 mt-2 w-64 glass-panel border border-white/20 rounded-2xl shadow-2xl p-3 z-[400] flex flex-col gap-2 backdrop-blur-2xl text-slate-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" /> Wi-Fi Connections
                  </span>
                  <button
                    onClick={() => setWifiEnabled(!wifiEnabled)}
                    className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors", wifiEnabled ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-slate-700 text-slate-400")}
                  >
                    {wifiEnabled ? 'On' : 'Off'}
                  </button>
                </div>

                {wifiEnabled ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 px-1">Known Networks</span>
                    {wifiNetworks.map((net) => (
                      <button
                        key={net.ssid}
                        onClick={() => {
                          setActiveWifi(net.ssid);
                          setShowWifiMenu(false);
                          window.dispatchEvent(new CustomEvent('os:notify', {
                            detail: { title: 'Wi-Fi Network Switch', description: `Switched to ${net.ssid}`, type: 'success' }
                          }));
                        }}
                        className={cn(
                          "flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors text-left",
                          activeWifi === net.ssid ? "bg-blue-600/30 text-blue-300 font-bold border border-blue-500/40" : "hover:bg-white/10 text-slate-200"
                        )}
                      >
                        <span className="truncate max-w-[140px]">{net.ssid}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] opacity-60 font-mono">{net.signal}</span>
                          {activeWifi === net.ssid && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic py-2 text-center">Wi-Fi is turned off</span>
                )}
              </div>
            )}
          </div>

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
