'use client';

import React, { useState } from 'react';
import {
  Wifi, Battery, Search, Bell, Moon, Sun, Bluetooth, Airplay,
  Volume2, Music, Calendar, Cloud, Thermometer, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ControlCenterProps {
  className?: string;
}

export function HomeWidgetPanel({ className }: ControlCenterProps) {
  const [brightness, setBrightness] = useState(75);
  const [volume, setVolume] = useState(50);

  return (
    <div className={cn("w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a2a4a] to-[#0a1525] font-sans overflow-hidden p-6", className)}>
      <div className="grid grid-cols-4 gap-3 max-w-lg w-full">
        {/* WiFi */}
        <button className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center hover:bg-white/15 transition-colors">
          <Wifi className="w-5 h-5 text-white" />
        </button>

        {/* Bluetooth */}
        <button className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center hover:bg-white/15 transition-colors">
          <Bluetooth className="w-5 h-5 text-white" />
        </button>

        {/* AirDrop */}
        <button className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center hover:bg-white/15 transition-colors">
          <Airplay className="w-5 h-5 text-white" />
        </button>

        {/* Focus */}
        <button className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center hover:bg-white/15 transition-colors">
          <Moon className="w-5 h-5 text-white" />
        </button>

        {/* Music widget - spans 2 cols */}
        <div className="col-span-2 rounded-2xl bg-white/10 backdrop-blur-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
            <Music className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-white truncate">Now Playing</div>
            <div className="text-[9px] text-white/50 truncate">Song title here</div>
          </div>
        </div>

        {/* Brightness */}
        <div className="col-span-2 rounded-2xl bg-white/10 backdrop-blur-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sun className="w-3.5 h-3.5 text-white/60" />
            <span className="text-[10px] text-white/60">Brightness</span>
          </div>
          <input
            type="range"
            min="0"
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
            <span className="text-[10px] text-white/60">Volume</span>
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
            <div className="text-lg font-bold text-white">72°</div>
            <div className="text-[9px] text-white/50">Sunny</div>
          </div>
          <span className="text-2xl">☀️</span>
        </div>

        {/* Dark Mode */}
        <button className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center hover:bg-white/15 transition-colors">
          <Sun className="w-5 h-5 text-white" />
        </button>

        {/* Screen Mirroring */}
        <button className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center hover:bg-white/15 transition-colors">
          <Airplay className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}

export default HomeWidgetPanel;
