'use client';

import React, { useState, useEffect } from 'react';
import { History, RotateCcw, X, Clock, Calendar, Check, ArrowUp, ArrowDown, Sparkles, Folder, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOS } from '@/lib/os-context';
import { audioSystem } from '@/lib/services/audio-engine';

interface TimeMachineProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TimeMachine({ isOpen, onClose }: TimeMachineProps) {
  const { snapshots, restoreSnapshot } = useOS();
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Mock past timeline snapshots if user only has 0 or 1
  const timelineSnapshots = snapshots.length > 0 ? snapshots : [
    { id: 'snap-1', name: 'Automatic Checkpoint (Now)', timestamp: Date.now(), windows: [{ id: 'w1', title: 'File Manager' }] },
    { id: 'snap-2', name: 'Before Code Refactor', timestamp: Date.now() - 3600000 * 2, windows: [{ id: 'w1', title: 'Code Editor' }, { id: 'w2', title: 'Terminal' }] },
    { id: 'snap-3', name: 'Yesterday Workspace', timestamp: Date.now() - 3600000 * 24, windows: [{ id: 'w1', title: 'Productivity Suite' }] },
    { id: 'snap-4', name: 'Clean Desktop State', timestamp: Date.now() - 3600000 * 48, windows: [] }
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowUp') {
        setSelectedIndex(prev => Math.max(0, prev - 1));
        audioSystem.playClick();
      }
      if (e.key === 'ArrowDown') {
        setSelectedIndex(prev => Math.min(timelineSnapshots.length - 1, prev + 1));
        audioSystem.playClick();
      }
      if (e.key === 'Enter') {
        const snap = timelineSnapshots[selectedIndex];
        if (snap) {
          restoreSnapshot(snap.id);
          audioSystem.playClick();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, timelineSnapshots, restoreSnapshot, onClose]);

  if (!isOpen) return null;

  const currentSnap = timelineSnapshots[selectedIndex] || timelineSnapshots[0];

  return (
    <div className="fixed inset-0 z-[999] bg-black/95 flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden font-sans">
      {/* 3D Moving Starfield Particles Canvas */}
      <div className="absolute inset-0 pointer-events-none opacity-60 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-purple-950/20 to-black animate-pulse" />
      
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 border border-purple-400/50 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              Time Machine <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">3D Restore</span>
            </h2>
            <p className="text-xs text-purple-200/60">Navigate backwards through historical workspace snapshots</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition-colors border border-white/15"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 3D Stacked Perspective Workspace Container */}
      <div className="flex-1 my-4 flex items-center justify-center relative w-full" style={{ perspective: '1200px' }}>
        {timelineSnapshots.map((snap, idx) => {
          const diff = idx - selectedIndex;
          if (diff < -2 || diff > 3) return null;

          const zOffset = -diff * 180;
          const yOffset = diff * 50;
          const scale = 1 - Math.abs(diff) * 0.12;
          const opacity = diff === 0 ? 1 : Math.max(0.2, 0.8 - Math.abs(diff) * 0.3);

          return (
            <div
              key={snap.id}
              onClick={() => {
                setSelectedIndex(idx);
                audioSystem.playClick();
              }}
              style={{
                transform: `translate3d(0px, ${yOffset}px, ${zOffset}px) scale(${scale})`,
                opacity,
                zIndex: 50 - Math.abs(diff),
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              className={cn(
                "absolute w-full max-w-2xl h-80 rounded-3xl border p-6 flex flex-col justify-between shadow-2xl backdrop-blur-2xl cursor-pointer",
                diff === 0
                  ? "bg-slate-900/90 border-[#10F4A0] shadow-[0_0_50px_rgba(16,244,160,0.2)]"
                  : "bg-slate-950/70 border-white/10 hover:border-white/30"
              )}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="font-bold text-sm text-white ml-2">{snap.name}</span>
                </div>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/30">
                  {new Date(snap.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>

              {/* Mock Snapshot UI Window Thumbnails */}
              <div className="flex-1 py-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Folder className="w-4 h-4 text-cyan-400" /> Virtual Filesystem
                  </div>
                  <span className="text-[11px] text-slate-400">Desktop, Documents & Media preserved</span>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <FileText className="w-4 h-4 text-purple-400" /> Active Windows ({snap.windows?.length || 0})
                  </div>
                  <span className="text-[11px] text-slate-400">Window coordinates & layouts cached</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
                <span>Snapshot ID: {snap.id}</span>
                <span className="text-emerald-400 font-medium">Ready to Rollback</span>
              </div>
            </div>
          );
        })}

        {/* Right Scrubber Rail (macOS Time Machine Style) */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-50 bg-white/5 backdrop-blur-md p-2 rounded-2xl border border-white/10">
          <button
            onClick={() => {
              setSelectedIndex(prev => Math.max(0, prev - 1));
              audioSystem.playClick();
            }}
            disabled={selectedIndex === 0}
            className="p-2 rounded-xl hover:bg-white/10 text-white disabled:opacity-30 transition-all"
            title="Earlier"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          
          <div className="flex flex-col items-center gap-1.5 py-2">
            {timelineSnapshots.map((_, i) => (
              <div
                key={i}
                onClick={() => setSelectedIndex(i)}
                className={cn(
                  "w-2.5 rounded-full transition-all cursor-pointer",
                  selectedIndex === i ? "h-6 bg-[#10F4A0]" : "h-2 bg-white/30 hover:bg-white/60"
                )}
              />
            ))}
          </div>

          <button
            onClick={() => {
              setSelectedIndex(prev => Math.min(timelineSnapshots.length - 1, prev + 1));
              audioSystem.playClick();
            }}
            disabled={selectedIndex === timelineSnapshots.length - 1}
            className="p-2 rounded-xl hover:bg-white/10 text-white disabled:opacity-30 transition-all"
            title="Later"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Actions Footer */}
      <div className="w-full flex items-center justify-between z-50 pt-2 border-t border-white/10">
        <div className="text-xs text-white/50">
          Use <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-white">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-white">↓</kbd> to scrub timeline, <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-white">Enter</kbd> to restore
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all border border-white/10"
          >
            Cancel (Esc)
          </button>
          <button
            onClick={() => {
              if (currentSnap) {
                restoreSnapshot(currentSnap.id);
                audioSystem.playClick();
                onClose();
              }
            }}
            className="px-6 py-2 rounded-xl bg-[#10F4A0] hover:bg-[#10F4A0]/90 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-[#10F4A0]/25 flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Restore &quot;{currentSnap?.name}&quot;
          </button>
        </div>
      </div>
    </div>
  );
}

export default TimeMachine;

