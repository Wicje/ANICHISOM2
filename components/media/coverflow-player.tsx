'use client';

import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, List, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Track {
  title: string;
  artist: string;
  color: string;
}

const tracks: Track[] = [
  { title: 'Diamonds Glac...', artist: 'Rihanna', color: '#8B7355' },
  { title: 'Velvet Rive...', artist: 'Rihanna', color: '#555' },
  { title: 'Blinding Lights', artist: 'The Weeknd', color: '#C4842D' },
  { title: 'Papa 1 Theme', artist: 'Tyler', color: '#444' },
  { title: 'Chennai Express', artist: 'Raja, Ila,...', color: '#555' },
];

export function CoverflowPlayer() {
  const [activeIndex, setActiveIndex] = useState(2);
  const [isPlaying, setIsPlaying] = useState(true);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#C4842D] via-[#A06820] to-[#7A4E15] font-sans overflow-hidden">
      {/* Cover Flow */}
      <div className="relative w-full h-[60%] flex items-center justify-center perspective-[800px]">
        <div className="relative flex items-center justify-center w-full h-full">
          {tracks.map((track, i) => {
            const offset = i - activeIndex;
            const absOffset = Math.abs(offset);
            const isActive = i === activeIndex;

            return (
              <div
                key={i}
                className={cn(
                  "absolute transition-all duration-500 cursor-pointer rounded-xl overflow-hidden shadow-2xl",
                  isActive ? "z-20" : "z-10"
                )}
                style={{
                  width: isActive ? '240px' : '180px',
                  height: isActive ? '280px' : '220px',
                  transform: `translateX(${offset * 120}px) scale(${isActive ? 1 : 0.85}) rotateY(${offset * -8}deg)`,
                  opacity: absOffset > 2 ? 0 : 1 - absOffset * 0.2,
                }}
                onClick={() => setActiveIndex(i)}
              >
                <div
                  className="w-full h-full rounded-xl flex items-end p-4"
                  style={{ background: `linear-gradient(135deg, ${track.color}, ${track.color}dd)` }}
                >
                  <div className="w-full">
                    <div className="text-white/60 text-sm font-medium truncate">{track.title}</div>
                    <div className="text-white/40 text-xs truncate">{track.artist}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Player Controls */}
      <div className="w-full max-w-xl px-6 mt-auto mb-12">
              <div className="bg-white/10 backdrop-blur-2xl rounded-2xl px-6 py-3 flex items-center gap-4 border border-white/10">
          {/* Track info */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10">
              <div className="w-full h-full" style={{ background: tracks[activeIndex]?.color ?? '#555' }} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">{tracks[activeIndex]?.title ?? ''}</div>
              <div className="text-[10px] text-white/50 truncate">{tracks[activeIndex]?.artist ?? ''}</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 mx-auto">
            <button className="text-white/60 hover:text-white transition-colors">
              <SkipBack className="w-4 h-4 fill-current" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-white hover:text-white/80 transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>
            <button className="text-white/60 hover:text-white transition-colors">
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3 shrink-0">
            <button className="text-white/40 hover:text-white/70 transition-colors">
              <MessageSquare className="w-4 h-4" />
            </button>
            <button className="text-white/40 hover:text-white/70 transition-colors">
              <List className="w-4 h-4" />
            </button>
            <button className="text-white/40 hover:text-white/70 transition-colors">
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CoverflowPlayer;
