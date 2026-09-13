'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Wifi, Bluetooth, Radio, Moon, Sun, Zap, Sparkles, Volume2, VolumeX,
  Laptop, Wand2, AppWindow, Magnet, Brain, Settings, Search,
  Lock, LogOut, Trash2, ChevronRight,
} from 'lucide-react';

import { useWindowStore } from '@/lib/stores/window.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { cn } from '@/lib/utils';

// ── THE CONTROL CENTRE ─────────────────────────────────────────────────────
// ported from impasto's ControlsPanel: a row of session actions and doors
// over a grid of QuickTiles, hosted inside the island. Tiles state what they
// do (their detail line is the current value), not "on/off", and lit tiles
// carry a hairline of accent instead of a block. Destructive session actions
// arm red and run on a second click.

export interface ControlCenterViewProps {
  onClose: () => void;
  onNavigate: (panel: 'wifi') => void;
  onOpenSettings: () => void;
  onSpotlight: () => void;
  onLock: () => void;
  onLogout: () => void;
  onWipe: () => void;
}

interface Tile {
  key: string;
  icon: React.ElementType;
  label: string;
  detail: string;
  active: boolean;
  expandable?: boolean;
  onActivate: () => void;
  onExpand?: () => void;
}

export function ControlCenterView({
  onClose,
  onNavigate,
  onOpenSettings,
  onSpotlight,
  onLock,
  onLogout,
  onWipe,
}: ControlCenterViewProps) {
  const openWindow = useWindowStore((s) => s.openWindow);
  const {
    wifiEnabled, setWifiEnabled,
    bluetoothEnabled, setBluetoothEnabled,
    airDropEnabled, setAirDropEnabled,
    colorMode, setColorMode,
    performanceMode, setPerformanceMode,
    nightShift, setNightShift,
    showNotch, toggleNotch,
    volume, setVolume, muted, setMuted,
    animationsEnabled, setAnimationsEnabled,
    glassmorphism, setGlassmorphism,
    aeroSnap, setAeroSnap,
    brightness, setBrightness,
  } = useThemeStore();

  const [armed, setArmed] = useState('');
  const disarm = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (disarm.current) clearTimeout(disarm.current); }, []);

  const runSession = (action: string, immediate: boolean, run: () => void) => {
    if (!immediate && armed !== action) {
      setArmed(action);
      if (disarm.current) clearTimeout(disarm.current);
      disarm.current = setTimeout(() => setArmed(''), 3000);
      return;
    }
    setArmed('');
    if (disarm.current) clearTimeout(disarm.current);
    closePanel();
    run();
  };

  const closePanel = () => {
    setArmed('');
    onClose();
  };

  const tiles: Tile[] = [
    {
      key: 'wifi',
      icon: Wifi,
      label: 'Wi-Fi',
      detail: wifiEnabled ? 'Continua' : 'Off',
      active: wifiEnabled,
      expandable: true,
      onActivate: () => setWifiEnabled(!wifiEnabled),
      onExpand: () => onNavigate('wifi'),
    },
    {
      key: 'bluetooth',
      icon: Bluetooth,
      label: 'Bluetooth',
      detail: bluetoothEnabled ? 'On' : 'Off',
      active: bluetoothEnabled,
      onActivate: () => setBluetoothEnabled(!bluetoothEnabled),
    },
    {
      key: 'airdrop',
      icon: Radio,
      label: 'AirDrop',
      detail: airDropEnabled ? 'Contacts Only' : 'Off',
      active: airDropEnabled,
      onActivate: () => {
        setAirDropEnabled(!airDropEnabled);
        window.dispatchEvent(new CustomEvent('os:open-airdrop'));
      },
    },
    {
      key: 'dark',
      icon: colorMode === 'dark' ? Moon : Sun,
      label: 'Dark Mode',
      detail: colorMode === 'dark' ? 'On' : 'Off',
      active: colorMode === 'dark',
      onActivate: () => setColorMode(colorMode === 'light' ? 'dark' : 'light'),
    },
    {
      key: 'heavy',
      icon: Zap,
      label: 'Heavy Mode',
      detail: performanceMode === 'heavy' ? 'On' : 'Off',
      active: performanceMode === 'heavy',
      onActivate: () => setPerformanceMode(performanceMode === 'heavy' ? 'light' : 'heavy'),
    },
    {
      key: 'night',
      icon: Sparkles,
      label: 'Night Shift',
      detail: nightShift ? 'On' : 'Off',
      active: nightShift,
      onActivate: () => setNightShift(!nightShift),
    },
    {
      key: 'sound',
      icon: muted ? VolumeX : Volume2,
      label: 'Sound',
      detail: muted ? 'Muted' : `${volume}%`,
      active: !muted,
      onActivate: () => setMuted(!muted),
    },
    {
      key: 'notch',
      icon: Laptop,
      label: 'Notch',
      detail: showNotch ? 'Visible' : 'Hidden',
      active: showNotch,
      onActivate: () => toggleNotch(),
    },
    {
      key: 'anims',
      icon: Wand2,
      label: 'Animations',
      detail: animationsEnabled ? 'On' : 'Off',
      active: animationsEnabled,
      onActivate: () => setAnimationsEnabled(!animationsEnabled),
    },
    {
      key: 'glass',
      icon: AppWindow,
      label: 'Glass',
      detail: glassmorphism ? 'On' : 'Off',
      active: glassmorphism,
      onActivate: () => setGlassmorphism(!glassmorphism),
    },
    {
      key: 'snap',
      icon: Magnet,
      label: 'Aero Snap',
      detail: aeroSnap ? 'On' : 'Off',
      active: aeroSnap,
      onActivate: () => setAeroSnap(!aeroSnap),
    },
    {
      key: 'assistant',
      icon: Brain,
      label: 'Assistant',
      detail: 'Open · AI',
      active: false,
      onActivate: () => {
        closePanel();
        openWindow('assistant', 'AI Assistant');
      },
    },
  ];

  return (
    <div className="imp-panel">
      {/* ── TOP ROW: session actions + doors ─────────────────────────────── */}
      <div className="flex items-center gap-2" style={{ height: 28 }}>
        <button
          className={cn('imp-power', armed === 'lock' && 'imp-power--armed')}
          onClick={() => runSession('lock', true, onLock)}
          aria-label="Lock screen"
        >
          <Lock className="w-[13px] h-[13px]" />
          <span className="imp-power-label">Lock</span>
        </button>
        <button
          className={cn('imp-power', armed === 'logout' && 'imp-power--armed')}
          onClick={() => runSession('logout', false, onLogout)}
          aria-label="Log out"
        >
          <LogOut className="w-[13px] h-[13px]" />
          <span className="imp-power-label">Log Out</span>
        </button>
        <button
          className={cn('imp-power', armed === 'wipe' && 'imp-power--armed')}
          onClick={() => runSession('wipe', false, onWipe)}
          aria-label="Erase"
        >
          <Trash2 className="w-[13px] h-[13px]" />
          <span className="imp-power-label">Erase</span>
        </button>

        <div className="flex-1" />

        <button className="imp-iconbtn" onClick={() => onNavigate('wifi')} aria-label="Wi-Fi settings">
          <Wifi className="w-[13px] h-[13px]" />
        </button>
        <button className="imp-iconbtn" onClick={onSpotlight} aria-label="Spotlight search">
          <Search className="w-[13px] h-[13px]" />
        </button>
        <button className="imp-iconbtn" onClick={onOpenSettings} aria-label="System settings">
          <Settings className="w-[13px] h-[13px]" />
        </button>
      </div>

      {/* ── QUICK TILE GRID ──────────────────────────────────────────────── */}
      <div style={{ height: 12 }} />
      <div className="grid flex-1" style={{ gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
        {tiles.map((tile) => (
          <QuickTile key={tile.key} tile={tile} />
        ))}
      </div>

      {/* ── SLIDER ROW ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-8 mt-3">
        <Slider
          icon={<Sun className="w-3.5 h-3.5" style={{ color: '#ffd60a' }} />}
          label="Brightness"
          value={brightness}
          onChange={setBrightness}
        />
        <Slider
          icon={muted ? <VolumeX className="w-3.5 h-3.5" style={{ color: '#ff453a' }} /> : <Volume2 className="w-3.5 h-3.5" style={{ color: '#0a84ff' }} />}
          label={muted ? 'Muted' : 'Volume'}
          value={muted ? 0 : volume}
          onChange={(v) => { if (muted) setMuted(false); setVolume(v); }}
        />
      </div>
    </div>
  );
}

// ── QUICK TILE ─────────────────────────────────────────────────────────────
function QuickTile({ tile }: { tile: Tile }) {
  const Icon = tile.icon;
  return (
    <button
      className={cn('imp-tile', tile.active && 'imp-tile--on')}
      onClick={tile.onActivate}
      style={{ position: 'relative', paddingRight: tile.expandable ? 34 : 12 }}
    >
      <span className="imp-tile-icon">
        <Icon className="w-4 h-4" style={{ strokeWidth: 2 }} />
      </span>
      <span className="flex flex-col min-w-0">
        <span className="imp-tile-label truncate">{tile.label}</span>
        <span className="imp-tile-detail truncate">{tile.detail}</span>
      </span>
      {tile.expandable && tile.onExpand && (
        <span
          className="absolute top-0 bottom-0 right-0 flex items-center justify-center w-7"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            tile.onExpand?.();
          }}
        >
          <ChevronRight className="w-3.5 h-3.5" style={{ color: '#8e8e93' }} />
        </span>
      )}
    </button>
  );
}

// ── COMPACT SYSTEM SLIDER ──────────────────────────────────────────────────
function Slider({
  icon,
  label,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-1">
      {icon}
      <span className="text-[11px] font-semibold text-[var(--os-text)] w-[68px] flex-shrink-0">{label}</span>
      <div className="flex-1">
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="imp-slider"
          style={{ ['--imp-slider-fill' as string]: `${value}%` }}
          aria-label={label}
        />
      </div>
      <span className="text-[10px] tabular-nums text-[var(--os-text-muted)] w-8 text-right">{value}%</span>
    </div>
  );
}