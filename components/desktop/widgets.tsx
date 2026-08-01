'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Activity, Cpu, HardDrive, Sun, CloudRain, Sparkles, Move } from 'lucide-react';

export interface Widget {
  id: string;
  type: 'notes' | 'cpu' | 'weather';
  x: number;
  y: number;
  content?: string;
}

interface WidgetsLayerProps {
  widgets: Widget[];
  setWidgets: React.Dispatch<React.SetStateAction<Widget[]>>;
}

export function WidgetsLayer({ widgets, setWidgets }: WidgetsLayerProps) {
  const [screenSize, setScreenSize] = useState({ width: 1200, height: 800 });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleResize = () => {
      setScreenSize({ width: window.innerWidth, height: window.innerHeight });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    const widget = widgets.find(w => w.id === id);
    if (!widget) return;
    setDraggingId(id);
    setDragOffset({
      x: e.clientX - widget.x,
      y: e.clientY - widget.y
    });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId) return;
    const maxX = Math.max(10, screenSize.width - 300);
    const maxY = Math.max(40, screenSize.height - 240);
    
    const newX = Math.min(Math.max(10, e.clientX - dragOffset.x), maxX);
    const newY = Math.min(Math.max(40, e.clientY - dragOffset.y), maxY);

    setWidgets(prev => prev.map(w => w.id === draggingId ? { ...w, x: newX, y: newY } : w));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingId) {
      setDraggingId(null);
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch (err) {
        // Ignore pointer release error
      }
    }
  };

  return (
    <div 
      className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {widgets.map(widget => {
        // Responsive Clamp for mobile screens
        const responsiveX = Math.min(widget.x, Math.max(10, screenSize.width - 290));
        const responsiveY = Math.min(widget.y, Math.max(40, screenSize.height - 220));

        return (
          <div
            key={widget.id}
            className="absolute pointer-events-auto select-none touch-none transition-shadow duration-200"
            style={{ left: responsiveX, top: responsiveY }}
            onContextMenu={(e) => { 
              e.stopPropagation(); 
              e.preventDefault(); 
              setWidgets(prev => prev.filter(w => w.id !== widget.id)); 
            }}
          >
            {/* ─── Sticky Note Widget ─── */}
            {widget.type === 'notes' && (
              <div className="w-[calc(100vw-2rem)] max-w-[280px] sm:max-w-xs bg-amber-500/10 backdrop-blur-2xl border border-amber-400/25 shadow-2xl rounded-2xl p-4 flex flex-col group transition-all duration-200 hover:border-amber-400/50">
                <div 
                  className="flex items-center justify-between text-amber-200/60 text-xs font-bold uppercase tracking-wider mb-2 cursor-grab active:cursor-grabbing pb-1 border-b border-amber-400/10"
                  onPointerDown={(e) => handlePointerDown(widget.id, e)}
                >
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <Move className="w-3.5 h-3.5 opacity-60" />
                    <span>Quick Note</span>
                  </div>
                  <button 
                    onClick={() => setWidgets(prev => prev.filter(w => w.id !== widget.id))} 
                    className="p-1 hover:bg-amber-400/20 rounded-lg text-amber-300 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  className="w-full h-32 bg-transparent border-none outline-none resize-none text-amber-100 font-medium text-xs leading-relaxed placeholder:text-amber-200/40 custom-scrollbar"
                  defaultValue={widget.content}
                  placeholder="Write thoughts or snippets..."
                  onPointerDown={e => e.stopPropagation()}
                />
              </div>
            )}

            {/* ─── CPU / System Stats Widget ─── */}
            {widget.type === 'cpu' && (
              <div className="w-[calc(100vw-2rem)] max-w-[280px] sm:max-w-xs bg-neutral-950/80 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl p-4 flex flex-col gap-3 group transition-all duration-200 hover:border-cyan-500/40">
                <div 
                  className="flex items-center justify-between text-white/50 cursor-grab active:cursor-grabbing pb-2 border-b border-white/10"
                  onPointerDown={(e) => handlePointerDown(widget.id, e)}
                >
                  <div className="text-xs font-bold uppercase flex items-center gap-1.5 text-cyan-300">
                    <Activity className="w-3.5 h-3.5 text-[#10F4A0] animate-pulse" /> 
                    <span>System Telemetry</span>
                  </div>
                  <button 
                    onClick={() => setWidgets(prev => prev.filter(w => w.id !== widget.id))} 
                    className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px] font-medium text-white/80">
                      <span className="flex items-center gap-1"><Cpu className="w-3 h-3 text-emerald-400" /> CPU Core</span>
                      <span className="font-mono text-[#10F4A0]">14%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="w-[14%] h-full bg-[#10F4A0] rounded-full transition-all duration-500" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px] font-medium text-white/80">
                      <span className="flex items-center gap-1"><HardDrive className="w-3 h-3 text-cyan-400" /> Memory</span>
                      <span className="font-mono text-cyan-400">4.8 GB</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="w-[48%] h-full bg-cyan-400 rounded-full transition-all duration-500" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
