'use client';

import React, { useEffect, useState } from 'react';
import { Monitor, Plus, Move, Shield, Radio, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { virtualDisplayManager, DisplayInfo } from '@/lib/virtual-display';
import { useWindowStore } from '@/lib/stores/window.store';

export function VirtualDisplayManagerApp() {
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const windows = useWindowStore((s) => s.windows);
  const currentDisplayId = virtualDisplayManager.getCurrentDisplayId();

  useEffect(() => {
    setDisplays(virtualDisplayManager.getDisplays());
    return virtualDisplayManager.subscribe(() => {
      setDisplays(virtualDisplayManager.getDisplays());
    });
  }, []);

  const handleSpawnDisplay = () => {
    virtualDisplayManager.spawnSecondaryDisplay();
  };

  return (
    <div className="w-full h-full bg-slate-950 text-slate-100 font-sans flex flex-col overflow-hidden select-none">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base tracking-wide text-white">Multi-Monitor Display Manager</h2>
            <p className="text-xs text-slate-400">WebRTC & Satellite Display Window Sync</p>
          </div>
        </div>

        <button
          onClick={handleSpawnDisplay}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:brightness-110 text-xs font-bold text-slate-950 transition-all shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" /> Spawn Secondary Monitor
        </button>
      </div>

      {/* Main Layout Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {/* Visual Monitor Canvas */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[260px] relative overflow-hidden">
          <div className="absolute top-4 left-4 text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Virtual Canvas Arranger
          </div>

          <div className="flex items-center justify-center gap-6 my-6">
            {displays.map((disp, idx) => {
              const isCurrent = disp.id === currentDisplayId;
              return (
                <div
                  key={disp.id}
                  className={`w-52 h-36 rounded-xl border-2 p-3 flex flex-col justify-between transition-all relative shadow-2xl ${
                    isCurrent
                      ? 'bg-cyan-500/10 border-cyan-400 text-white ring-4 ring-cyan-500/20 scale-105'
                      : 'bg-white/5 border-white/20 text-slate-300 hover:border-white/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold truncate max-w-[120px]">{disp.name}</span>
                    {disp.isPrimary && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950">
                        Primary
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-center my-auto">
                    <Monitor className={`w-8 h-8 ${isCurrent ? 'text-cyan-400' : 'text-slate-500'}`} />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{disp.width}x{disp.height}</span>
                    <span>{isCurrent ? 'THIS WINDOW' : 'SATELLITE'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-400 font-medium text-center max-w-md">
            Drag windows between monitors or launch secondary satellite windows to extend your ContinuaOS workspace.
          </p>
        </div>

        {/* Windows Placement List */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Desktop Windows ({windows.length})</h3>

          {windows.length === 0 ? (
            <div className="p-8 rounded-xl bg-white/5 border border-white/5 text-center text-xs text-slate-500">
              No windows open. Launch applications from the Dock or Launchpad to route them across displays.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {windows.map((win) => (
                <div
                  key={win.id}
                  className="p-3.5 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-xs">
                      {win.appId.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs text-white truncate max-w-[150px]">{win.title}</span>
                      <span className="text-[10px] text-slate-400">Workspace #{win.workspace ? win.workspace + 1 : 1}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Built-in
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
