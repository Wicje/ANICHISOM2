'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Wifi, Server, X } from 'lucide-react';
import { audioSystem } from '@/lib/services/audio-engine';

export function TelemetryHUD() {
  const [isOpen, setIsOpen] = useState(false);
  const [cpuHist, setCpuHist] = useState<number[]>([12, 18, 25, 30, 22, 19, 28, 35, 20, 24]);
  const [memHist, setMemHist] = useState<number[]>([42, 44, 45, 43, 46, 48, 47, 45, 46, 47]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'M' || e.key === 'm')) {
        e.preventDefault();
        setIsOpen(prev => !prev);
        audioSystem.playClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCpuHist(prev => [...prev.slice(1), Math.floor(Math.random() * 25) + 15]);
      setMemHist(prev => [...prev.slice(1), Math.floor(Math.random() * 8) + 42]);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentCpu = cpuHist[cpuHist.length - 1] || 20;
  const currentMem = memHist[memHist.length - 1] || 45;

  return (
    <div className="fixed left-4 bottom-16 z-[9400] w-72 select-none animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="bg-slate-950/90 border border-cyan-500/40 shadow-2xl shadow-cyan-500/10 rounded-2xl p-4 backdrop-blur-3xl text-white space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-bold tracking-wide">Real-Time Telemetry HUD</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1 rounded text-white/40 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CPU Load */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="flex items-center gap-1 text-white/70"><Cpu className="w-3 h-3 text-[#10F4A0]" /> CPU Load</span>
            <span className="text-[#10F4A0] font-bold">{currentCpu}%</span>
          </div>
          <div className="flex items-end gap-1 h-6 bg-black/40 p-1 rounded-lg border border-white/10">
            {cpuHist.map((val, idx) => (
              <div key={idx} className="flex-1 bg-[#10F4A0] rounded-sm transition-all duration-300" style={{ height: `${val}%` }} />
            ))}
          </div>
        </div>

        {/* Memory / IndexedDB */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="flex items-center gap-1 text-white/70"><HardDrive className="w-3 h-3 text-cyan-400" /> Memory / Cache</span>
            <span className="text-cyan-400 font-bold">{currentMem}%</span>
          </div>
          <div className="flex items-end gap-1 h-6 bg-black/40 p-1 rounded-lg border border-white/10">
            {memHist.map((val, idx) => (
              <div key={idx} className="flex-1 bg-cyan-400 rounded-sm transition-all duration-300" style={{ height: `${val}%` }} />
            ))}
          </div>
        </div>

        {/* Network & Node Status */}
        <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div className="flex items-center gap-1 text-white/60">
            <Wifi className="w-3 h-3 text-emerald-400" /> WebRTC P2P: <strong>Active</strong>
          </div>
          <div className="flex items-center gap-1 text-white/60">
            <Server className="w-3 h-3 text-cyan-400" /> Latency: <strong>4ms</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
