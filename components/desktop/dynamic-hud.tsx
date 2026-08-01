'use client';

import React, { useState } from 'react';
import { Play, Pause, Music, Timer, Activity, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFocusStore } from '@/lib/stores/focus.store';
import { audioSystem } from '@/lib/services/audio-engine';

export function DynamicHUD() {
  const { enabled: focusEnabled, isRunning: focusRunning, remainingSeconds, toggle: toggleFocus } = useFocusStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed top-1.5 left-1/2 -translate-x-1/2 z-[270] pointer-events-auto select-none">
      <div 
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={cn(
          "transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] rounded-full border border-white/20 shadow-2xl backdrop-blur-3xl overflow-hidden bg-slate-950/85 text-white flex items-center justify-center cursor-pointer",
          isExpanded 
            ? "w-[360px] h-11 px-4 rounded-2xl bg-slate-950/95 border-[#10F4A0]/50 shadow-lg shadow-[#10F4A0]/10" 
            : "w-44 h-6 px-3 rounded-full hover:border-[#10F4A0]/50"
        )}
      >
        {!isExpanded ? (
          /* Collapsed Pill State */
          <div className="flex items-center justify-between w-full text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10F4A0] animate-pulse" />
              <span className="text-[10px] font-extrabold text-white/90 tracking-widest uppercase">Continua</span>
            </div>
            {focusRunning ? (
              <div className="flex items-center gap-1 text-[#10F4A0] text-[10px] font-mono">
                <Timer className="w-3 h-3" />
                <span>{formatTime(remainingSeconds)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-cyan-400 text-[10px]">
                <Activity className="w-3 h-3" />
                <span className="capitalize">{audioSystem.getSoundProfile()}</span>
              </div>
            )}
          </div>
        ) : (
          /* Expanded HUD State */
          <div className="flex items-center justify-between w-full gap-3 text-xs">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => { toggleFocus(); audioSystem.playClick(); }}
                className={cn(
                  "p-1.5 rounded-lg border transition-all",
                  focusRunning ? "bg-[#10F4A0]/20 border-[#10F4A0] text-[#10F4A0]" : "bg-white/5 border-white/10 hover:bg-white/15 text-white/70"
                )}
                title="Toggle Focus Session"
              >
                <Timer className="w-3.5 h-3.5" />
              </button>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-white leading-none">
                  {focusRunning ? `Focus Session (${formatTime(remainingSeconds)})` : 'Continua HUD Active'}
                </span>
                <span className="text-[9px] text-white/50 mt-0.5">
                  Sound: <strong className="text-[#10F4A0] uppercase">{audioSystem.getSoundProfile()}</strong>
                </span>
              </div>
            </div>

            {/* Quick Status Badge */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] bg-[#10F4A0]/20 text-[#10F4A0] px-2 py-0.5 rounded-full font-bold border border-[#10F4A0]/40">
                P2P Ready
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-white/40" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
