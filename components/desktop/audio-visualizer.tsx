'use client';

import React, { useEffect, useState } from 'react';
import { audioSystem } from '@/lib/services/audio-engine';

export function AudioVisualizer() {
  const [bars, setBars] = useState<number[]>([30, 45, 60, 40, 25, 55, 70, 35, 50, 65, 30, 45]);

  useEffect(() => {
    const interval = setInterval(() => {
      setBars(prev => prev.map(() => Math.floor(Math.random() * 55) + 20));
    }, 180);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-3 right-6 z-[250] pointer-events-none opacity-40 hover:opacity-80 transition-opacity flex items-end gap-1.5 h-10 px-3 py-1.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10">
      {bars.map((h, idx) => (
        <div
          key={idx}
          className="w-1 bg-gradient-to-t from-[#10F4A0] to-cyan-400 rounded-full transition-all duration-200"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}
