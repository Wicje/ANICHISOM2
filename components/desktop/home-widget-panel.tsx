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
  const { enabled: focusActive, toggle: toggleFocus } = useFocusStore();
  
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
    <div className={cn("w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1a2a4a] to-[#0a1525] font-sans overflow-hidden p-6 gap-6", className)}>
      {/* Calendar & Timezone Widget Stack (ref_calendar.jpg inspired) */}
      <div className="flex flex-col md:flex-row gap-4 w-full max-w-2xl bg-neutral-900/90 border border-white/15 shadow-2xl rounded-[32px] p-5 backdrop-blur-2xl text-white select-none">
        
        {/* Left Calendar Grid */}
        <div className="w-full md:w-52 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-sm font-black">June</span>
            <span className="text-[10px] text-white/50">2026</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-white/40">
            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-white/80">
            <span className="opacity-30">31</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span>
            <span>7</span><span>8</span><span>9</span><span>10</span><span>11</span><span>12</span><span>13</span>
            <span className="w-6 h-6 rounded-full bg-rose-500 text-white font-bold flex items-center justify-center mx-auto shadow-md">14</span>
            <span>15</span><span>16</span><span>17</span><span>18</span><span>19</span><span>20</span>
            <span>21</span><span>22</span><span>23</span><span>24</span><span>25</span><span>26</span><span>27</span>
            <span>28</span><span>29</span><span>30</span>
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
                  <span className="text-xs font-bold">Prague, CZ</span>
                  <span className="text-[9px] text-emerald-400 font-bold">LOCAL</span>
                </div>
                <span className="text-xs font-mono font-bold">02:02 PM</span>
              </div>
              <div className="flex justify-between items-center border-t border-white/10 pt-1.5">
                <div className="flex flex-col">
                  <span className="text-xs font-bold">New York, US</span>
                  <span className="text-[9px] text-white/40 font-mono">-7H</span>
                </div>
                <span className="text-xs font-mono font-bold text-white/60">06:02 PM</span>
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
                onClick={() => window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Recording Started', description: 'Meeting audio recording active', type: 'info' } }))}
                className="w-full py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <span>🔴</span> Start recording
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
