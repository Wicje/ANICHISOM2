'use client';

import React, { useState } from 'react';
import { X, Activity } from 'lucide-react';

export interface Widget {
  id: string;
  type: 'notes' | 'cpu';
  x: number;
  y: number;
  content?: string;
}

interface WidgetsLayerProps {
  widgets: Widget[];
  setWidgets: React.Dispatch<React.SetStateAction<Widget[]>>;
}

export function WidgetsLayer({ widgets, setWidgets }: WidgetsLayerProps) {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      {widgets.map(widget => (
        <div
          key={widget.id}
          className="absolute pointer-events-auto"
          style={{ left: widget.x, top: widget.y }}
          onContextMenu={(e) => { e.stopPropagation(); e.preventDefault(); setWidgets(prev => prev.filter(w => w.id !== widget.id)); }}
        >
          {widget.type === 'notes' && (
            <div className="w-64 h-64 bg-amber-200/90 backdrop-blur-md shadow-2xl rounded-sm p-4 rotate-1 hover:rotate-0 transition-transform cursor-move flex flex-col group">
              <div className="text-amber-900/40 text-xs font-bold uppercase mb-2 flex justify-between">
                Sticky Note
                <button onClick={() => setWidgets(prev => prev.filter(w => w.id !== widget.id))} className="opacity-0 group-hover:opacity-100 hover:text-rose-500"><X className="w-3 h-3" /></button>
              </div>
              <textarea
                className="flex-1 bg-transparent border-none outline-none resize-none text-amber-900 font-medium text-sm leading-relaxed"
                defaultValue={widget.content}
                placeholder="Write a note..."
                onPointerDown={e => e.stopPropagation()}
              />
            </div>
          )}
          {widget.type === 'cpu' && (
            <div className="w-64 bg-black/60 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl p-4 flex flex-col gap-4 group">
              <div className="flex justify-between items-center text-white/50">
                <div className="text-xs font-bold uppercase flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-[#10F4A0]" /> System Stats</div>
                <button onClick={() => setWidgets(prev => prev.filter(w => w.id !== widget.id))} className="opacity-0 group-hover:opacity-100 hover:text-rose-500"><X className="w-3 h-3" /></button>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-medium text-white"><span>CPU Usage</span> <span>12%</span></div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="w-[12%] h-full bg-[#10F4A0] rounded-full" /></div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-medium text-white"><span>RAM Usage</span> <span>4.2 GB</span></div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="w-[60%] h-full bg-blue-400 rounded-full" /></div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
