'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Grid, Layers, Search, Wifi, Bell, HardDrive, Eye,
  EyeOff, Users, Battery, BatteryCharging,
} from 'lucide-react';

import { useWindowStore } from '@/lib/stores/window.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { useNotificationStore } from '@/lib/stores/notification.store';
import { useHardwareState } from '@/lib/hooks/use-hardware';
import { useContextPrivacyStore } from '@/lib/stores/context-privacy.store';
import type { PrivacyMode } from '@/lib/context-kernel/graph';

import { Chip } from './chip';
import { Island, type IslandPanel } from './island';

// ── THE IMPASTO BAR ─────────────────────────────────────────────────────────
// The island in the middle, and the two sides in capsules at the screen
// edges (impasto's "spread" style). Every module is a chip; its detail opens
// in the island, never in a popup of its own.

const PRIVACY_TIER_META: Record<PrivacyMode, { label: string; icon: React.ElementType; color: string }> = {
  standard: { label: 'Standard', icon: Eye, color: '#8e8e93' },
  local_only: { label: 'Local Only', icon: HardDrive, color: '#64d2ff' },
  private_session: { label: 'Paused', icon: EyeOff, color: '#ffd60a' },
};

export interface ImpastoBarProps {
  setShowLaunchpad: (v: boolean | ((p: boolean) => boolean)) => void;
  setShowMissionControl: (v: boolean) => void;
  logout: () => void;
  wipeSession: () => void;
  onLock: () => void;
}

export function ImpastoBar({
  setShowLaunchpad,
  setShowMissionControl,
  logout,
  wipeSession,
  onLock,
}: ImpastoBarProps) {
  const openWindow = useWindowStore((s) => s.openWindow);
  const windows = useWindowStore((s) => s.windows);
  const wifiEnabled = useThemeStore((s) => s.wifiEnabled);
  const workspaceMode = useWorkspaceStore((s) => s.workspaceMode);
  const setWorkspaceMode = useWorkspaceStore((s) => s.setWorkspaceMode);
  const unreadCount = useNotificationStore((s) => s.notifications.filter((n) => !n.read).length);
  const { battery } = useHardwareState();
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const [panel, setPanel] = useState<IslandPanel | null>(null);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const spotlight = useCallback(() => {
    window.dispatchEvent(new CustomEvent('os:open-spotlight'));
  }, []);

  const openSettings = useCallback(() => {
    setPanel(null);
    openWindow('settings', 'Settings');
  }, [openWindow]);

  const togglePanel = useCallback((p: IslandPanel) => {
    setPanel((cur) => (cur === p ? null : p));
  }, []);

  const batteryPct = battery ? Math.round(battery.level * 100) : null;
  const batteryCharging = battery?.charging ?? false;

  return (
    <header className="fixed top-0 inset-x-0 z-[260] pointer-events-none" style={{ height: 40 }}>
      {/* ── LEFT ZONE ─────────────────────────────────────────────────── */}
      <div className="absolute left-[18px] top-[16px] flex items-center gap-2 pointer-events-auto">
        <Chip
          mark={<Grid className="w-[13px] h-[13px]" />}
          aria-label="Launchpad"
          onClick={() => setShowLaunchpad((v) => !v)}
        />
        <Chip
          mark={<Layers className="w-[13px] h-[13px]" />}
          aria-label="Mission Control"
          onClick={() => setShowMissionControl(true)}
        />
        <Chip
          mark={<Search className="w-[13px] h-[13px]" />}
          aria-label="Spotlight search"
          onClick={spotlight}
        />
        <Chip
          mark={<Users className="w-[13px] h-[13px]" />}
          figure={
            <span className="flex items-center gap-1.5">
              <span
                className="imp-dot"
                style={{ background: workspaceMode === 'agency' ? '#32d74b' : '#8e8e93' }}
              />
              <span className="text-[11px]" style={{ color: workspaceMode === 'agency' ? '#fff' : '#8e8e93' }}>
                {workspaceMode === 'agency' ? 'Agency' : 'Private'}
              </span>
            </span>
          }
          aria-label="Toggle workspace mode"
          onClick={() => setWorkspaceMode(workspaceMode === 'agency' ? 'private' : 'agency')}
        />
      </div>

      {/* ── ISLAND ────────────────────────────────────────────────────── */}
      <Island
        openPanel={panel}
        onOpenPanel={(p) => setPanel(p)}
        onClose={() => setPanel(null)}
        onOpenSettings={openSettings}
        onSpotlight={spotlight}
        onLock={onLock}
        onLogout={logout}
        onWipe={wipeSession}
      />

      {/* ── RIGHT ZONE ────────────────────────────────────────────────── */}
      <div className="absolute right-[18px] top-[16px] flex items-center gap-2 pointer-events-auto">
        <NowPlayingChip
          onOpen={() => {
            const win = windows.find((w) => w.appId === 'media-player');
            if (win) useWindowStore.getState().focusWindow(win.id);
            else openWindow('media-player', 'Media Player');
          }}
        />

        <Chip
          mark={<Wifi className="w-[13px] h-[13px]" style={{ color: wifiEnabled ? '#0a84ff' : undefined }} />}
          figure={
            <span className="text-[11px] max-w-[90px] truncate" style={{ color: wifiEnabled ? '#fff' : '#8e8e93' }}>
              {wifiEnabled ? 'Continua' : 'Off'}
            </span>
          }
          active={panel === 'wifi'}
          aria-label="Wi-Fi"
          onClick={() => togglePanel('wifi')}
        />

        {batteryPct !== null && (
          <Chip
            mark={
              batteryCharging ? (
                <BatteryCharging className="w-[13px] h-[13px]" style={{ color: '#32d74b' }} />
              ) : (
                <Battery className="w-[13px] h-[13px]" />
              )
            }
            figure={<span className="text-[11px]">{batteryPct}%</span>}
            aria-label={`Battery ${batteryPct}%`}
            onClick={() => togglePanel('controls')}
          />
        )}

        <Chip
          mark={
            <span className="relative flex">
              <Bell className="w-[13px] h-[13px]" />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 min-w-[13px] h-[13px] px-0.5 flex items-center justify-center text-[8px] font-bold rounded-full"
                  style={{ background: '#ff453a', color: '#fff' }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </span>
          }
          aria-label="Notification Center"
          onClick={() => window.dispatchEvent(new CustomEvent('os:toggle-notification-center'))}
        />

        <PrivacyChip />
        <SyncChip online={online} />
      </div>
    </header>
  );
}

// ── CONTEXT PRIVACY ────────────────────────────────────────────────────────
function PrivacyChip() {
  const { mode, hydrated, hydrate } = useContextPrivacyStore();
  const openWindow = useWindowStore((s) => s.openWindow);

  useEffect(() => {
    hydrate();
    const onChange = () => hydrate();
    window.addEventListener('os:privacy-mode-changed', onChange);
    return () => window.removeEventListener('os:privacy-mode-changed', onChange);
  }, [hydrate]);

  if (!hydrated) return null;
  const meta = PRIVACY_TIER_META[mode];
  const Icon = meta.icon;

  return (
    <Chip
      mark={<Icon className="w-[13px] h-[13px]" style={{ color: meta.color }} />}
      aria-label={`Context engine: ${meta.label}`}
      onClick={() => openWindow('settings', 'Settings')}
    />
  );
}

// ── SYNC / ONLINE ──────────────────────────────────────────────────────────
function SyncChip({ online }: { online: boolean }) {
  return (
    <Chip
      mark={
        <span className="relative flex w-2 h-2">
          <span
            className="imp-dot"
            style={{ background: online ? '#32d74b' : '#8e8e93', boxShadow: online ? '0 0 6px #32d74b' : 'none' }}
          />
        </span>
      }
      aria-label={online ? 'Online' : 'Offline'}
      onClick={() => useWorkspaceStore.getState().saveSnapshot('Desktop State', useWindowStore.getState().windows)}
      title="Save desktop state"
    />
  );
}

// ── NOW PLAYING ────────────────────────────────────────────────────────────
function NowPlayingChip({ onOpen }: { onOpen: () => void }) {
  const [media, setMedia] = useState<{ isPlaying: boolean; title: string } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.title && d.title !== 'Now Playing') setMedia(d);
    };
    window.addEventListener('os:media-playback', handler);
    return () => window.removeEventListener('os:media-playback', handler);
  }, []);

  if (!media) return null;

  return (
    <Chip
      mark={
        <span className="flex items-end gap-[2px] h-[10px]" style={{ color: '#fff' }} aria-hidden>
          {[4, 7, 5].map((h, i) => (
            <span
              key={i}
              className="w-[2px] rounded-full bg-current"
              style={{
                height: h,
                animation: media.isPlaying ? `imp-eq 1s ease-in-out ${i * 0.18}s infinite` : 'none',
                opacity: media.isPlaying ? 1 : 0.55,
              }}
            />
          ))}
        </span>
      }
      figure={<span className="text-[11px] max-w-[120px] truncate">{media.title}</span>}
      aria-label="Now playing"
      onClick={onOpen}
      muted={!media.isPlaying}
    />
  );
}