'use client';

import React, { useState, useEffect } from 'react';
import {
  Wifi, Battery, Search, Bell, Moon, Sun, Bluetooth, Airplay,
  Volume2, Music, Calendar, Cloud, Thermometer, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useFocusStore } from '@/lib/stores/focus.store';

interface ControlCenterProps {
  className?: string;
}

export function HomeWidgetPanel({ className }: ControlCenterProps) {
  const { volume, setVolume, colorMode, setColorMode, screenShader, setScreenShader } = useThemeStore();
  const { isActive: focusActive, toggleFocus } = useFocusStore();
  
  const [brightness, setBrightnessState] = useState(80);
  const [weather, setWeather] = useState<{ temp: number; desc: string; icon: string }>({ temp: 72, desc: 'Sunny', icon: '☀️' });

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m,weathercode&temperature_unit=fahrenheit`);
          if (!res.ok) return;
          const data = await res.json();
          const temp = Math.round(data.current?.temperature_2m ?? 72);
          const code = data.current?.weathercode ?? 0;
          let desc = 'Clear';
          let icon = '☀️';
          if (code >= 1 && code <= 3) { desc = 'Partly Cloudy'; icon = '⛅'; }
          else if (code >= 45 && code <= 48) { desc = 'Foggy'; icon = '🌫️'; }
          else if (code >= 51 && code <= 67) { desc = 'Rainy'; icon = '🌧️'; }
          else if (code >= 71) { desc = 'Snowy'; icon = '❄️'; }
          setWeather({ temp, desc, icon });
        } catch { /* keep default fallback */ }
      },
      () => { /* keep default fallback on denied geolocation */ }
    );
  }, []);

  const setBrightness = (val: number) => {
    setBrightnessState(val);
    if (typeof document !== 'undefined') {
      document.documentElement.style.filter = `brightness(${val}%)`;
    }
  };

  return (
    <div className={cn("w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a2a4a] to-[#0a1525] font-sans overflow-hidden p-6", className)}>
      <div className="grid grid-cols-4 gap-3 max-w-lg w-full">
        {/* WiFi */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Wi-Fi Status', description: navigator.onLine ? 'Connected to High-Speed Wi-Fi' : 'Offline Mode Active', type: 'info' } }))}
          className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center hover:bg-white/15 transition-colors cursor-pointer"
          title="Wi-Fi Status"
        >
          <Wifi className="w-5 h-5 text-white" />
        </button>

        {/* Bluetooth */}
        <button
          onClick={async () => {
            const { hardwareManager } = await import('@/lib/hardware');
            await hardwareManager.requestBluetoothDevice();
          }}
          className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center hover:bg-white/15 transition-colors cursor-pointer"
          title="Pair Bluetooth Device"
        >
          <Bluetooth className="w-5 h-5 text-white" />
        </button>

        {/* AirDrop */}
        <button
          onClick={async () => {
            window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'AirDrop Discovery', description: 'Scanning local WebRTC peers for instant file transfer...', type: 'info' } }));
            const { virtualDisplayManager } = await import('@/lib/virtual-display');
            virtualDisplayManager.spawnSecondaryDisplay();
          }}
          className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center hover:bg-white/15 transition-colors cursor-pointer"
          title="AirDrop / Satellite Display"
        >
          <Airplay className="w-5 h-5 text-white" />
        </button>

        {/* Focus */}
        <button
          onClick={() => toggleFocus()}
          className={cn(
            "w-14 h-14 rounded-2xl backdrop-blur-xl flex items-center justify-center transition-colors cursor-pointer",
            focusActive ? "bg-indigo-500 text-white" : "bg-white/10 text-white hover:bg-white/15"
          )}
          title="Toggle Focus Mode"
        >
          <Moon className="w-5 h-5" />
        </button>

        {/* Music widget - spans 2 cols */}
        <div className="col-span-2 rounded-2xl bg-white/10 backdrop-blur-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
            <Music className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-white truncate">Continua Audio Engine</div>
            <div className="text-[9px] text-white/50 truncate">Local Media & Streaming</div>
          </div>
        </div>

        {/* Brightness */}
        <div className="col-span-2 rounded-2xl bg-white/10 backdrop-blur-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sun className="w-3.5 h-3.5 text-white/60" />
            <span className="text-[10px] text-white/60">Brightness ({brightness}%)</span>
          </div>
          <input
            type="range"
            min="20"
            max="100"
            value={brightness}
            onChange={e => setBrightness(Number(e.target.value))}
            className="w-full h-1 bg-white/20 rounded-full appearance-none accent-white cursor-pointer"
          />
        </div>

        {/* Volume */}
        <div className="col-span-2 rounded-2xl bg-white/10 backdrop-blur-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Volume2 className="w-3.5 h-3.5 text-white/60" />
            <span className="text-[10px] text-white/60">Volume ({volume}%)</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            className="w-full h-1 bg-white/20 rounded-full appearance-none accent-white cursor-pointer"
          />
        </div>

        {/* Weather */}
        <div className="col-span-2 rounded-2xl bg-white/10 backdrop-blur-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-white">{weather.temp}°F</div>
            <div className="text-[9px] text-white/50">{weather.desc}</div>
          </div>
          <span className="text-2xl">{weather.icon}</span>
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
          className={cn(
            "w-14 h-14 rounded-2xl backdrop-blur-xl flex items-center justify-center transition-colors cursor-pointer",
            colorMode === 'dark' ? "bg-white/20 text-yellow-300" : "bg-white/10 text-white"
          )}
          title="Toggle Color Mode"
        >
          <Sun className="w-5 h-5" />
        </button>

        {/* Screen Mirroring */}
        <button
          onClick={async () => {
            const { virtualDisplayManager } = await import('@/lib/virtual-display');
            virtualDisplayManager.spawnSecondaryDisplay();
          }}
          className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center hover:bg-white/15 transition-colors cursor-pointer"
          title="Multi-Monitor Display Sync"
        >
          <Airplay className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}

export default HomeWidgetPanel;
