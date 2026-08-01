'use client';

import React, { useState } from 'react';
import { History, RotateCcw, X, Clock, Calendar, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOS } from '@/lib/os-context';
import { audioSystem } from '@/lib/services/audio-engine';

interface TimeMachineProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TimeMachine({ isOpen, onClose }: TimeMachineProps) {
  const { snapshots, restoreSnapshot } = useOS();
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[290] bg-slate-950/90 backdrop-blur-3xl flex flex-col items-center justify-between p-8 select-none animate-in fade-in duration-300">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">Visual OS Time Machine</h2>
            <p className="text-xs text-white/50">Rewind desktop state & restore workspace snapshots</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition-colors border border-white/15"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Timeline Scrubber */}
      <div className="w-full max-w-4xl flex-1 my-6 flex flex-col items-center justify-center gap-6">
        <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/30">
          Available Desktop Snapshots ({snapshots.length})
        </div>

        {snapshots.length === 0 ? (
          <div className="text-white/40 text-sm flex flex-col items-center gap-2">
            <Clock className="w-8 h-8 text-white/20" />
            <span>No snapshots saved yet. Save a desktop snapshot from File menu to rewind.</span>
          </div>
        ) : (
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
            {snapshots.map((snap) => {
              const isSelected = selectedSnapshotId === snap.id;
              const dateStr = new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={snap.id}
                  onClick={() => {
                    setSelectedSnapshotId(snap.id);
                    audioSystem.playClick();
                  }}
                  className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3",
                    isSelected 
                      ? "bg-[#10F4A0]/20 border-[#10F4A0] shadow-lg shadow-[#10F4A0]/20" 
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{snap.name}</span>
                    <span className="text-[10px] font-mono text-white/50">{dateStr}</span>
                  </div>
                  <div className="text-[10px] text-white/40">
                    {snap.windows?.length || 0} Open Window(s)
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      restoreSnapshot(snap.id);
                      audioSystem.playClick();
                      onClose();
                    }}
                    className="w-full py-1.5 rounded-lg bg-[#10F4A0]/20 hover:bg-[#10F4A0]/30 text-[#10F4A0] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 border border-[#10F4A0]/40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restore This State
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-xs text-white/40 text-center">
        Press Esc to close Time Machine
      </div>
    </div>
  );
}
