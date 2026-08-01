'use client';

import React from 'react';
import { useWindowStore } from '@/lib/stores/window.store';
import { useWindowActions } from '@/lib/hooks/use-window-actions';
import { Box, X, Layers, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppIcon } from '@/components/ui/app-icon';
import { APP_MANIFEST } from '@/lib/app-manifest';

interface SpatialStageProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SpatialStage({ isOpen, onClose }: SpatialStageProps) {
  const windows = useWindowStore((s) => s.windows);
  const { focusWindow } = useWindowActions();

  if (!isOpen) return null;

  const openWindows = windows.filter(w => !w.isMinimized);

  return (
    <div className="fixed inset-0 z-[290] bg-slate-950/85 backdrop-blur-3xl flex flex-col items-center justify-center p-8 select-none animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="absolute top-6 left-8 right-8 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#10F4A0]/20 border border-[#10F4A0]/50 flex items-center justify-center text-[#10F4A0]">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">3D Spatial Stage Manager</h2>
            <p className="text-[10px] text-white/50">Interactive 3D Window Depth Stack</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition-colors border border-white/15"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 3D Parallax Stack View */}
      {openWindows.length === 0 ? (
        <div className="text-white/40 text-sm flex flex-col items-center gap-2">
          <Layers className="w-8 h-8 text-white/20" />
          <span>No active windows to stage in 3D. Open an app to view depth.</span>
        </div>
      ) : (
        <div 
          className="w-full max-w-5xl h-[65vh] relative flex items-center justify-center"
          style={{ perspective: '1200px' }}
        >
          <div 
            className="w-full h-full relative flex items-center justify-center transition-transform duration-500 ease-out"
            style={{ transformStyle: 'preserve-3d', transform: 'rotateY(-15deg) rotateX(10deg)' }}
          >
            {openWindows.map((win, idx) => {
              const appManifest = APP_MANIFEST.find(a => a.id === win.appId);
              const depthOffset = (idx - (openWindows.length - 1) / 2) * 90;
              const xOffset = (idx - (openWindows.length - 1) / 2) * 70;

              return (
                <div
                  key={win.id}
                  onClick={() => {
                    focusWindow(win.id);
                    onClose();
                  }}
                  className="absolute w-[440px] h-[300px] bg-slate-900/90 border-2 border-white/20 hover:border-[#10F4A0] rounded-2xl shadow-2xl p-4 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-[#10F4A0]/20 group"
                  style={{
                    transform: `translate3d(${xOffset}px, 0px, ${depthOffset}px)`,
                    backfaceVisibility: 'hidden',
                  }}
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      {appManifest && <AppIcon icon={appManifest.icon} iconImage={appManifest.iconImage} className="w-5 h-5" />}
                      <span className="text-xs font-bold text-white group-hover:text-[#10F4A0] transition-colors">{win.title}</span>
                    </div>
                    <span className="text-[9px] font-mono bg-white/10 text-white/60 px-2 py-0.5 rounded">Layer #{idx + 1}</span>
                  </div>

                  <div className="flex-1 flex items-center justify-center text-white/30 text-xs font-mono">
                    Click to Focus Window
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-white/40 pt-2 border-t border-white/10">
                    <span>App: {win.appId}</span>
                    <span>3D Depth: {depthOffset}px</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
