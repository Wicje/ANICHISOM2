'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X, Activity, Cpu, HardDrive, Sun, CloudRain, Cloud, Sparkles, Move,
  Clock, TrendingUp, Music, Play, Pause, Plus, Check, Calendar, CloudSun
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { readDomain, writeDomain } from '@/lib/context-layer';

export type WidgetType = 'notes' | 'cpu' | 'weather' | 'clock' | 'stocks' | 'audio';

export interface Widget {
  id: string;
  type: WidgetType;
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
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setScreenSize({ width: window.innerWidth, height: window.innerHeight });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Clock ticker
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Load / Persist widgets
  useEffect(() => {
    readDomain('widgets').then((res: any) => {
      if (res?.data?.widgets && Array.isArray(res.data.widgets) && res.data.widgets.length > 0) {
        setWidgets(res.data.widgets);
      }
    }).catch(() => {});
  }, [setWidgets]);

  const persistWidgets = (newWidgets: Widget[]) => {
    setWidgets(newWidgets);
    writeDomain('widgets', { widgets: newWidgets }).catch(() => {});
  };

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

    setWidgets(prev => {
      const updated = prev.map(w => w.id === draggingId ? { ...w, x: newX, y: newY } : w);
      writeDomain('widgets', { widgets: updated }).catch(() => {});
      return updated;
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingId) {
      setDraggingId(null);
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch (err) {}
    }
  };

  const addWidget = (type: WidgetType) => {
    const newWidget: Widget = {
      id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      type,
      x: 80 + (widgets.length * 30) % 300,
      y: 100 + (widgets.length * 30) % 250,
      content: type === 'notes' ? 'Quick reminder or snippet...' : undefined
    };
    persistWidgets([...widgets, newWidget]);
    setShowGallery(false);
  };

  const removeWidget = (id: string) => {
    persistWidgets(widgets.filter(w => w.id !== id));
  };

  useEffect(() => {
    const handleToggleGallery = () => setShowGallery(prev => !prev);
    window.addEventListener('os:toggle-widget-stack', handleToggleGallery);
    return () => window.removeEventListener('os:toggle-widget-stack', handleToggleGallery);
  }, []);

  return (
    <div 
      className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {widgets.map(widget => {
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
              removeWidget(widget.id); 
            }}
          >
            {/* ─── 1. Sticky Note Widget ─── */}
            {widget.type === 'notes' && (
              <div className="w-[calc(100vw-2rem)] max-w-[260px] sm:max-w-xs bg-amber-500/10 backdrop-blur-2xl border border-amber-400/25 shadow-2xl rounded-3xl p-4 flex flex-col group transition-all duration-200 hover:border-amber-400/50 hover:shadow-amber-500/10">
                <div 
                  className="flex items-center justify-between text-amber-200/60 text-xs font-bold uppercase tracking-wider mb-2 cursor-grab active:cursor-grabbing pb-1 border-b border-amber-400/10"
                  onPointerDown={(e) => handlePointerDown(widget.id, e)}
                >
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <Move className="w-3.5 h-3.5 opacity-60" />
                    <span>Quick Note</span>
                  </div>
                  <button 
                    onClick={() => removeWidget(widget.id)} 
                    className="p-1 hover:bg-amber-400/20 rounded-lg text-amber-300 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  className="w-full h-28 bg-transparent border-none outline-none resize-none text-amber-100 font-medium text-xs leading-relaxed placeholder:text-amber-200/40 custom-scrollbar"
                  defaultValue={widget.content}
                  onChange={(e) => {
                    const val = e.target.value;
                    const next = widgets.map(w => w.id === widget.id ? { ...w, content: val } : w);
                    setWidgets(next);
                    writeDomain('widgets', { widgets: next }).catch(() => {});
                  }}
                  placeholder="Write thoughts or snippets..."
                  onPointerDown={e => e.stopPropagation()}
                />
              </div>
            )}

            {/* ─── 2. CPU / System Telemetry Widget ─── */}
            {widget.type === 'cpu' && (
              <div className="w-[calc(100vw-2rem)] max-w-[260px] sm:max-w-xs bg-neutral-950/80 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl p-4 flex flex-col gap-3 group transition-all duration-200 hover:border-cyan-500/40">
                <div 
                  className="flex items-center justify-between text-white/50 cursor-grab active:cursor-grabbing pb-2 border-b border-white/10"
                  onPointerDown={(e) => handlePointerDown(widget.id, e)}
                >
                  <div className="text-xs font-bold uppercase flex items-center gap-1.5 text-cyan-300">
                    <Activity className="w-3.5 h-3.5 text-[#10F4A0] animate-pulse" /> 
                    <span>System Telemetry</span>
                  </div>
                  <button 
                    onClick={() => removeWidget(widget.id)} 
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

            {/* ─── 3. Clock & Calendar Widget (macOS Sonoma Parity) ─── */}
            {widget.type === 'clock' && (
              <div className="w-[calc(100vw-2rem)] max-w-[260px] sm:max-w-xs bg-slate-900/80 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl p-4 flex flex-col gap-3 group transition-all duration-200 hover:border-indigo-500/40">
                <div 
                  className="flex items-center justify-between text-white/50 cursor-grab active:cursor-grabbing pb-2 border-b border-white/10"
                  onPointerDown={(e) => handlePointerDown(widget.id, e)}
                >
                  <div className="text-xs font-bold uppercase flex items-center gap-1.5 text-indigo-300">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" /> 
                    <span>Time & Date</span>
                  </div>
                  <button 
                    onClick={() => removeWidget(widget.id)} 
                    className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between px-2">
                  <div className="flex flex-col">
                    <div className="text-2xl font-mono font-bold text-white tracking-tight">
                      {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-xs text-indigo-300 font-medium">
                      {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex flex-col items-center justify-center">
                    <span className="text-[9px] uppercase font-bold text-indigo-300 leading-none">{currentTime.toLocaleDateString([], { month: 'short' })}</span>
                    <span className="text-lg font-bold text-white leading-tight">{currentTime.getDate()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ─── 4. Live Weather Widget (macOS Sonoma Parity) ─── */}
            {widget.type === 'weather' && (
              <div className="w-[calc(100vw-2rem)] max-w-[260px] sm:max-w-xs bg-sky-950/80 backdrop-blur-2xl border border-sky-400/20 shadow-2xl rounded-3xl p-4 flex flex-col gap-3 group transition-all duration-200 hover:border-sky-400/50">
                <div 
                  className="flex items-center justify-between text-sky-200/60 cursor-grab active:cursor-grabbing pb-2 border-b border-sky-400/10"
                  onPointerDown={(e) => handlePointerDown(widget.id, e)}
                >
                  <div className="text-xs font-bold uppercase flex items-center gap-1.5 text-sky-300">
                    <CloudSun className="w-3.5 h-3.5 text-amber-300" /> 
                    <span>Cupertino · 72°</span>
                  </div>
                  <button 
                    onClick={() => removeWidget(widget.id)} 
                    className="p-1 hover:bg-sky-400/20 rounded-lg text-sky-300 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between px-2">
                  <div className="flex flex-col">
                    <span className="text-3xl font-bold text-white tracking-tight">72°F</span>
                    <span className="text-xs text-sky-200 font-medium">Mostly Sunny</span>
                  </div>
                  <Sun className="w-10 h-10 text-amber-400 animate-[spin_12s_linear_infinite]" />
                </div>
                <div className="flex items-center justify-between text-[10px] text-sky-200/70 border-t border-sky-400/10 pt-2 font-mono">
                  <span>H: 76° L: 58°</span>
                  <span>Humidity: 42%</span>
                </div>
              </div>
            )}

            {/* ─── 5. Stocks / Market Ticker Widget ─── */}
            {widget.type === 'stocks' && (
              <div className="w-[calc(100vw-2rem)] max-w-[260px] sm:max-w-xs bg-emerald-950/80 backdrop-blur-2xl border border-emerald-400/20 shadow-2xl rounded-3xl p-4 flex flex-col gap-2.5 group transition-all duration-200 hover:border-emerald-400/50">
                <div 
                  className="flex items-center justify-between text-emerald-200/60 cursor-grab active:cursor-grabbing pb-1.5 border-b border-emerald-400/10"
                  onPointerDown={(e) => handlePointerDown(widget.id, e)}
                >
                  <div className="text-xs font-bold uppercase flex items-center gap-1.5 text-emerald-300">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> 
                    <span>Market Watch</span>
                  </div>
                  <button 
                    onClick={() => removeWidget(widget.id)} 
                    className="p-1 hover:bg-emerald-400/20 rounded-lg text-emerald-300 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex flex-col gap-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between text-white">
                    <span className="font-bold">BTC</span>
                    <span>$96,420</span>
                    <span className="text-emerald-400 font-semibold">+3.4%</span>
                  </div>
                  <div className="flex items-center justify-between text-white">
                    <span className="font-bold">ETH</span>
                    <span>$3,480</span>
                    <span className="text-emerald-400 font-semibold">+2.1%</span>
                  </div>
                  <div className="flex items-center justify-between text-white">
                    <span className="font-bold">AAPL</span>
                    <span>$238.50</span>
                    <span className="text-emerald-400 font-semibold">+0.8%</span>
                  </div>
                </div>
              </div>
            )}

            {/* ─── 6. Music / Audio Mini-Widget ─── */}
            {widget.type === 'audio' && (
              <div className="w-[calc(100vw-2rem)] max-w-[260px] sm:max-w-xs bg-rose-950/80 backdrop-blur-2xl border border-rose-400/20 shadow-2xl rounded-3xl p-4 flex flex-col gap-3 group transition-all duration-200 hover:border-rose-400/50">
                <div 
                  className="flex items-center justify-between text-rose-200/60 cursor-grab active:cursor-grabbing pb-1.5 border-b border-rose-400/10"
                  onPointerDown={(e) => handlePointerDown(widget.id, e)}
                >
                  <div className="text-xs font-bold uppercase flex items-center gap-1.5 text-rose-300">
                    <Music className="w-3.5 h-3.5 text-rose-400" /> 
                    <span>Now Playing</span>
                  </div>
                  <button 
                    onClick={() => removeWidget(widget.id)} 
                    className="p-1 hover:bg-rose-400/20 rounded-lg text-rose-300 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center">
                    <Music className="w-5 h-5 text-rose-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">Continua Lo-Fi Beats</div>
                    <div className="text-[10px] text-rose-200/70 truncate">Deep Focus Ambient</div>
                  </div>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ─── macOS Sonoma Widget Picker Gallery Tray ─── */}
      {showGallery && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9990] bg-[var(--os-glass-bg)] backdrop-blur-2xl border border-[var(--os-border)] rounded-3xl shadow-2xl p-4 flex flex-col gap-3 pointer-events-auto max-w-[90vw] animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between border-b border-[var(--os-border)] pb-2 px-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#10F4A0]" />
              <span className="font-semibold text-sm text-[var(--os-text)]">Desktop Widgets Gallery</span>
            </div>
            <button
              onClick={() => setShowGallery(false)}
              className="p-1 rounded-lg hover:bg-[var(--os-hover)] text-[var(--os-text-muted)] hover:text-[var(--os-text)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto p-1 custom-scrollbar">
            <button
              onClick={() => addWidget('notes')}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/20 transition-all hover:scale-105 text-amber-200 min-w-[100px]"
            >
              <Move className="w-6 h-6 text-amber-300" />
              <span className="text-xs font-semibold">Quick Note</span>
            </button>
            <button
              onClick={() => addWidget('cpu')}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/20 transition-all hover:scale-105 text-cyan-200 min-w-[100px]"
            >
              <Activity className="w-6 h-6 text-[#10F4A0]" />
              <span className="text-xs font-semibold">Telemetry</span>
            </button>
            <button
              onClick={() => addWidget('clock')}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-400/20 transition-all hover:scale-105 text-indigo-200 min-w-[100px]"
            >
              <Clock className="w-6 h-6 text-indigo-300" />
              <span className="text-xs font-semibold">Clock & Date</span>
            </button>
            <button
              onClick={() => addWidget('weather')}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/20 transition-all hover:scale-105 text-sky-200 min-w-[100px]"
            >
              <Sun className="w-6 h-6 text-amber-400" />
              <span className="text-xs font-semibold">Weather</span>
            </button>
            <button
              onClick={() => addWidget('stocks')}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/20 transition-all hover:scale-105 text-emerald-200 min-w-[100px]"
            >
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              <span className="text-xs font-semibold">Market</span>
            </button>
            <button
              onClick={() => addWidget('audio')}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-400/20 transition-all hover:scale-105 text-rose-200 min-w-[100px]"
            >
              <Music className="w-6 h-6 text-rose-400" />
              <span className="text-xs font-semibold">Audio Mini</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

