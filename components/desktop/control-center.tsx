'use client';

import React from 'react';
import { useWindowStore } from '@/lib/stores/window.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useNotificationStore } from '@/lib/stores/notification.store';
import { useSyncStore } from '@/lib/stores/sync.store';
import {
  Wifi, Bluetooth, Radio, Sun, Moon, Volume2, VolumeX,
  Sliders, Eye, Sparkles, Brain, ShieldCheck, Cloud, Zap, Trash2,
  Droplets, Wind, CloudRain, Music, Laptop, X, Shield, Lock, Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

function WeatherWidget() {
  const [weather, setWeather] = React.useState<any>(null);

  React.useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,is_day,precipitation,wind_speed_10m&timezone=auto`);
        const data = await res.json();
        setWeather(data.current);
      } catch (err) {
        console.error('Failed to fetch weather', err);
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(37.7749, -122.4194) // Default SF/Cupertino
      );
    } else {
      fetchWeather(37.7749, -122.4194);
    }
  }, []);

  if (!weather) return null;

  return (
    <div className="w-full p-4 rounded-2xl flex flex-col gap-2 relative overflow-hidden bg-gradient-to-br from-sky-600 to-blue-800 text-white shadow-lg shadow-sky-900/20">
      <div className="flex items-center justify-between z-10">
        <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Cupertino Weather</span>
        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded-full">
          Live <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>
      <div className="flex items-end justify-between z-10">
        <div>
          <span className="text-3xl font-black tabular-nums">{Math.round(weather.temperature_2m)}°</span>
          <span className="text-xs opacity-80 ml-2 font-medium">{weather.is_day ? 'Daytime' : 'Night'}</span>
        </div>
        {weather.precipitation > 0 ? <CloudRain className="w-8 h-8 opacity-90" /> : (weather.is_day ? <Sun className="w-8 h-8 opacity-90" /> : <Moon className="w-8 h-8 opacity-90" />)}
      </div>
      <div className="flex gap-4 text-[11px] font-medium opacity-90 z-10 border-t border-white/15 pt-2">
        <div className="flex items-center gap-1"><Droplets className="w-3 h-3" /> {weather.relative_humidity_2m}% Humidity</div>
        <div className="flex items-center gap-1"><Wind className="w-3 h-3" /> {weather.wind_speed_10m} km/h</div>
      </div>
    </div>
  );
}

interface ControlCenterProps {
  onClose: () => void;
}

export function ControlCenter({ onClose }: ControlCenterProps) {
  const openWindow = useWindowStore((s) => s.openWindow);
  const {
    performanceMode, setPerformanceMode,
    colorMode, setColorMode,
    volume, setVolume,
    muted, setMuted,
    brightness, setBrightness,
    nightShift, setNightShift,
    nightShiftTemperature, setNightShiftTemperature,
    showNotch, toggleNotch,
    wifiEnabled, setWifiEnabled,
    bluetoothEnabled, setBluetoothEnabled,
    airDropEnabled, setAirDropEnabled,
  } = useThemeStore();
  const { notifications, clearAll, markAllRead } = useNotificationStore();
  const { isSyncing, connectedDevices, startSync, stopSync } = useSyncStore();

  const recentNotifications = notifications.slice(0, 4);

  return (
    <div className="fixed top-9 right-3 h-[calc(100vh-3.5rem)] w-88 max-w-[92vw] bg-[var(--os-glass-bg)] border border-[var(--os-glass-border)] backdrop-blur-3xl rounded-3xl shadow-2xl z-[9990] flex flex-col pointer-events-auto overflow-hidden animate-in slide-in-from-top-2 duration-200">
      
      {/* Header */}
      <div className="px-5 py-3.5 flex justify-between items-center border-b border-[var(--os-border)]">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[var(--os-primary)]" />
          <h3 className="font-semibold text-sm text-[var(--os-text)]">Control Center</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-[var(--os-hover)] text-[var(--os-text-muted)] hover:text-[var(--os-text)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        
        {/* Top 2x2 Bento Module: Connectivity & Focus */}
        <div className="grid grid-cols-2 gap-3">
          
          {/* Connectivity Group */}
          <div className="bg-[var(--os-surface-elevated)] border border-[var(--os-border)] p-3 rounded-2xl flex flex-col gap-2.5 shadow-sm">
            {/* Wi-Fi */}
            <div
              onClick={() => setWifiEnabled(!wifiEnabled)}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm", wifiEnabled ? "bg-[var(--os-primary)] text-white" : "bg-[var(--os-hover)] text-[var(--os-text-muted)]")}>
                <Wifi className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-[var(--os-text)] truncate">Wi-Fi</span>
                <span className="text-[10px] text-[var(--os-text-muted)] truncate">{wifiEnabled ? 'Continua-5G' : 'Off'}</span>
              </div>
            </div>

            {/* Bluetooth */}
            <div
              onClick={async () => {
                setBluetoothEnabled(!bluetoothEnabled);
                if (!bluetoothEnabled && 'bluetooth' in navigator) {
                  try {
                    // @ts-ignore
                    const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
                    window.dispatchEvent(new CustomEvent('os:notify', {
                      detail: { title: 'Bluetooth Paired', description: `Connected to ${device.name || 'Device'}`, type: 'success' },
                    }));
                  } catch {}
                }
              }}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm", bluetoothEnabled ? "bg-[var(--os-primary)] text-white" : "bg-[var(--os-hover)] text-[var(--os-text-muted)]")}>
                <Bluetooth className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-[var(--os-text)] truncate">Bluetooth</span>
                <span className="text-[10px] text-[var(--os-text-muted)] truncate">{bluetoothEnabled ? 'On' : 'Off'}</span>
              </div>
            </div>

            {/* AirDrop */}
            <div
              onClick={() => {
                setAirDropEnabled(!airDropEnabled);
                window.dispatchEvent(new CustomEvent('os:open-airdrop'));
              }}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm", airDropEnabled ? "bg-[var(--os-primary)] text-white" : "bg-[var(--os-hover)] text-[var(--os-text-muted)]")}>
                <Radio className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-[var(--os-text)] truncate">AirDrop</span>
                <span className="text-[10px] text-[var(--os-text-muted)] truncate">Contacts Only</span>
              </div>
            </div>
          </div>

          {/* Quick Toggles Bento */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setColorMode(colorMode === 'light' ? 'dark' : 'light')}
              className="p-3 rounded-2xl bg-[var(--os-surface-elevated)] border border-[var(--os-border)] hover:bg-[var(--os-hover)] transition-all flex items-center gap-3 text-left shadow-sm"
            >
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center", colorMode === 'dark' ? "bg-indigo-600 text-white" : "bg-amber-400 text-black")}>
                {colorMode === 'light' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-[var(--os-text)]">{colorMode === 'dark' ? 'Dark' : 'Light'}</span>
                <span className="text-[10px] text-[var(--os-text-muted)]">Theme</span>
              </div>
            </button>

            <button
              onClick={() => setPerformanceMode(performanceMode === 'heavy' ? 'light' : 'heavy')}
              className="p-3 rounded-2xl bg-[var(--os-surface-elevated)] border border-[var(--os-border)] hover:bg-[var(--os-hover)] transition-all flex items-center gap-3 text-left shadow-sm"
            >
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center", performanceMode === 'heavy' ? "bg-amber-500 text-white" : "bg-[var(--os-hover)] text-[var(--os-text-muted)]")}>
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-[var(--os-text)]">Heavy Mode</span>
                <span className="text-[10px] text-[var(--os-text-muted)]">{performanceMode === 'heavy' ? 'Active' : 'Eco'}</span>
              </div>
            </button>
          </div>
        </div>

        {/* ─── macOS Display Brightness & Night Shift Slider Bento ─── */}
        <div className="bg-[var(--os-surface-elevated)] border border-[var(--os-border)] p-3.5 rounded-2xl flex flex-col gap-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--os-text)] flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400" /> Display Brightness
            </span>
            <span className="text-xs font-mono text-[var(--os-text-muted)]">{brightness}%</span>
          </div>

          <div className="relative flex items-center">
            <input
              type="range"
              min="20"
              max="100"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full h-7 bg-[var(--os-hover)] rounded-xl appearance-none cursor-pointer accent-[var(--os-primary)] p-1"
            />
          </div>

          {/* Night Shift Toggle (macOS Parity) */}
          <div className="flex items-center justify-between border-t border-[var(--os-border)] pt-2.5">
            <button
              onClick={() => setNightShift(!nightShift)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm",
                nightShift
                  ? "bg-amber-500 text-white shadow-amber-500/20"
                  : "bg-[var(--os-hover)] text-[var(--os-text-muted)] hover:text-[var(--os-text)]"
              )}
            >
              <Moon className="w-3.5 h-3.5" /> Night Shift: {nightShift ? 'On' : 'Off'}
            </button>

            <button
              onClick={() => toggleNotch()}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm",
                showNotch
                  ? "bg-[var(--os-primary)] text-white"
                  : "bg-[var(--os-hover)] text-[var(--os-text-muted)] hover:text-[var(--os-text)]"
              )}
            >
              Notch: {showNotch ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        {/* ─── macOS Sound / Volume Slider Bento ─── */}
        <div className="bg-[var(--os-surface-elevated)] border border-[var(--os-border)] p-3.5 rounded-2xl flex flex-col gap-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--os-text)] flex items-center gap-1.5">
              {muted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
              Sound Volume
            </span>
            <span className="text-xs font-mono text-[var(--os-text-muted)]">{muted ? 'Muted' : `${volume}%`}</span>
          </div>

          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setMuted(!muted)}
              className="p-1 rounded-lg hover:bg-[var(--os-hover)] text-[var(--os-text-muted)] hover:text-[var(--os-text)]"
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={muted ? 0 : volume}
              onChange={(e) => {
                if (muted) setMuted(false);
                setVolume(Number(e.target.value));
              }}
              className="flex-1 h-7 bg-[var(--os-hover)] rounded-xl appearance-none cursor-pointer accent-[var(--os-primary)] p-1"
            />
          </div>
        </div>

        {/* Weather Preview */}
        <WeatherWidget />

        {/* Quick App Launches */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { onClose(); openWindow('assistant', 'AI Assistant'); }}
            className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2 text-xs font-semibold hover:bg-emerald-500/20 transition-all shadow-sm"
          >
            <Brain className="w-4 h-4" /> AI Assistant
          </button>
          <button
            onClick={() => { onClose(); openWindow('hardware-manager', 'Hardware Subsystem'); }}
            className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center gap-2 text-xs font-semibold hover:bg-sky-500/20 transition-all shadow-sm"
          >
            <ShieldCheck className="w-4 h-4" /> Hardware
          </button>
        </div>

        {/* Notifications Section */}
        <div className="flex flex-col gap-2 border-t border-[var(--os-border)] pt-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--os-text-muted)] flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" /> Notifications
            </span>
            {recentNotifications.length > 0 && (
              <button
                onClick={() => { clearAll(); markAllRead(); }}
                className="text-[10px] text-[var(--os-text-muted)] hover:text-rose-400 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Clear All
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            {recentNotifications.length === 0 ? (
              <div className="rounded-xl p-3 text-center text-xs text-[var(--os-text-muted)] bg-[var(--os-hover)]">
                No recent notifications
              </div>
            ) : (
              recentNotifications.map((n) => (
                <div key={n.id} className="rounded-xl p-2.5 bg-[var(--os-surface-elevated)] border border-[var(--os-border)] flex flex-col gap-0.5">
                  <div className="text-xs font-medium text-[var(--os-text)]">{n.title}</div>
                  {n.description && (
                    <div className="text-[11px] text-[var(--os-text-muted)] line-clamp-2">{n.description}</div>
                  )}
                  <div className="text-[9px] text-[var(--os-text-muted)] mt-1 font-mono">
                    {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

