'use client';

import React, { useState, useEffect } from 'react';
import {
  Wifi, Battery, Search, Bell, Moon, Sun, Bluetooth, Airplay,
  Volume2, Music, Calendar, Cloud, Thermometer, Clock,
  CloudSun, CloudFog, CloudRain, Snowflake, type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useFocusStore } from '@/lib/stores/focus.store';

const WEATHER_ICONS: Record<string, LucideIcon> = {
  sun: Sun,
  'cloud-sun': CloudSun,
  'cloud-fog': CloudFog,
  'cloud-rain': CloudRain,
  snowflake: Snowflake,
};

function WeatherIcon({ name }: { name: string }) {
  const Icon = WEATHER_ICONS[name] ?? Sun;
  return <Icon className="w-5 h-5" />;
}

interface ControlCenterProps {
  className?: string;
}

export function HomeWidgetPanel({ className }: ControlCenterProps) {
  const { volume, setVolume, colorMode, setColorMode, screenShader, setScreenShader, brightness, setBrightness } = useThemeStore();
  const { enabled: focusActive, toggle: toggleFocus } = useFocusStore();
  
  const [weather, setWeather] = useState<{ temp: number; desc: string; icon: string }>({ temp: 72, desc: 'Sunny', icon: 'sun' });
  const [isProximityActive, setIsProximityActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Dynamic calendar
  const now = useState(() => new Date())[0];
  const calendarMonth = now.toLocaleString('en-US', { month: 'long' });
  const calendarYear = now.getFullYear();
  const todayDate = now.getDate();
  const firstDay = new Date(calendarYear, now.getMonth(), 1).getDay();
  const daysInMonth = new Date(calendarYear, now.getMonth() + 1, 0).getDate();
  const prevMonthDays = new Date(calendarYear, now.getMonth(), 0).getDate();

  // Dynamic timezone clocks
  const [localTime, setLocalTime] = useState('');
  const [remoteTime, setRemoteTime] = useState('');
  useEffect(() => {
    const updateTimes = () => {
      const t = new Date();
      setLocalTime(t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
      setRemoteTime(t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' }));
    };
    updateTimes();
    const id = setInterval(updateTimes, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let rafId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const edgeThreshold = 18; // px from right edge
        if (e.clientX >= window.innerWidth - edgeThreshold) {
          setIsProximityActive(true);
        } else if (e.clientX < window.innerWidth - 380 && !isHovered) {
          setIsProximityActive(false);
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isHovered]);

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
          let icon = 'sun';
          if (code >= 1 && code <= 3) { desc = 'Partly Cloudy'; icon = 'cloud-sun'; }
          else if (code >= 45 && code <= 48) { desc = 'Foggy'; icon = 'cloud-fog'; }
          else if (code >= 51 && code <= 67) { desc = 'Rainy'; icon = 'cloud-rain'; }
          else if (code >= 71) { desc = 'Snowy'; icon = 'snowflake'; }
          setWeather({ temp, desc, icon });
        } catch { /* keep default fallback */ }
      },
      () => { /* keep default fallback on denied geolocation */ }
    );
  }, []);

  return (
    <div className={cn("w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1a2a4a] to-[#0a1525] font-sans overflow-hidden p-6 gap-6", className)}>
      {/* Calendar & Timezone Widget Stack (ref_calendar.jpg inspired) */}
      <div className="flex flex-col md:flex-row gap-4 w-full max-w-2xl bg-neutral-900/90 border border-white/15 shadow-2xl rounded-[32px] p-5 backdrop-blur-2xl text-white select-none">
        
        {/* Left Calendar Grid */}
        <div className="w-full md:w-52 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-sm font-black">{calendarMonth}</span>
            <span className="text-[10px] text-white/50">{calendarYear}</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-white/40">
            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-white/80">
            {Array.from({ length: firstDay }, (_, i) => (
              <span key={`prev-${i}`} className="opacity-30">{prevMonthDays - firstDay + i + 1}</span>
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              return (
                <span
                  key={day}
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center mx-auto",
                    day === todayDate ? "bg-rose-500 text-white font-bold shadow-md" : ""
                  )}
                >
                  {day}
                </span>
              );
            })}
          </div>
        </div>

        {/* Right Dashboard Stack */}
        <div className="flex-1 flex flex-col gap-4">
          
          {/* Top Row: Timezones & Next Meeting */}
          <div className="grid grid-cols-2 gap-3">
            {/* Timezones */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Timezones
              </span>
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Local</span>
                  <span className="text-[9px] text-emerald-400 font-bold">LOCAL</span>
                </div>
                <span className="text-xs font-mono font-bold">{localTime || '--:--'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-white/10 pt-1.5">
                <div className="flex flex-col">
                  <span className="text-xs font-bold">New York, US</span>
                  <span className="text-[9px] text-white/40 font-mono">-6H</span>
                </div>
                <span className="text-xs font-mono font-bold text-white/60">{remoteTime || '--:--'}</span>
              </div>
            </div>

            {/* Next Meeting */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex -space-x-1.5 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=60&auto=format&fit=crop" alt="avatar" className="w-5 h-5 rounded-full border border-black object-cover" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=60&auto=format&fit=crop" alt="avatar" className="w-5 h-5 rounded-full border border-black object-cover" />
                </div>
                <span className="text-[10px] text-white/50 font-bold">13 members</span>
              </div>
              <div>
                <span className="text-xs text-white/60 leading-tight block">Next Meeting</span>
                <span className="text-base font-black text-white">in 00:19 min</span>
              </div>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('os:start-recording'))}
                className="w-full py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>Start recording</span>
              </button>
            </div>
          </div>

          {/* Bottom Row: Today's Agenda */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col gap-1">
              <span className="text-[9px] font-bold text-white/40 uppercase">Today</span>
              <span className="text-xs font-bold text-white">Grid Systems</span>
              <span className="text-xs font-mono font-bold text-emerald-400">03:30 PM - 04:00 PM</span>
              <span className="text-[9px] text-white/40 mt-1">Time left 5h 39 min</span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col gap-1">
              <span className="text-[9px] font-bold text-white/40 uppercase">Today</span>
              <span className="text-xs font-bold text-white">Web Typography</span>
              <span className="text-xs font-mono font-bold text-cyan-400">05:10 PM - 06:20 PM</span>
              <span className="text-[9px] text-white/40 mt-1">Time left 7h 29 min</span>
            </div>
          </div>

        </div>
      </div>

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
            focusActive ? "bg-cyan-500 text-white" : "bg-white/10 text-white hover:bg-white/15"
          )}
          title="Toggle Focus Mode"
        >
          <Moon className="w-5 h-5" />
        </button>

        {/* Music widget - spans 2 cols */}
        <div className="col-span-2 rounded-2xl bg-white/10 backdrop-blur-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-emerald-600 flex items-center justify-center shrink-0">
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
          <span className="text-2xl"><WeatherIcon name={weather.icon} /></span>
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
