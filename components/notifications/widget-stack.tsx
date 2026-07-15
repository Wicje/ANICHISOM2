'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Battery, Wifi, Search, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FS, LocalFile } from '@/lib/fs';

export function WidgetStack({ window: osWindow }: { window?: any }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioFiles, setAudioFiles] = useState<LocalFile[]>([]);
  const [currentTrack, setCurrentTrack] = useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  useEffect(() => {
    const loadAudio = async () => {
      try {
        const dirs = ['', 'Desktop', 'Downloads', 'Media'];
        const all: LocalFile[] = [];
        for (const dir of dirs) {
          const files = await FS.readDir(dir);
          if (files) all.push(...files.filter(f => f.mimeType?.startsWith('audio/')));
        }
        setAudioFiles(Array.from(new Map(all.map(f => [f.id, f])).values()));
      } catch { /* ignore */ }
    };
    loadAudio();
  }, []);

  const track = audioFiles[currentTrack];

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying && track?.content) {
      audioRef.current.src = track.content;
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack, track]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const calendarDays: number[] = [];
  for (let i = firstDay - 1; i >= 0; i--) calendarDays.push(prevDays - i);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  while (calendarDays.length < 42) calendarDays.push(calendarDays.length - daysInMonth + 1);

  const monthName = now.toLocaleString('en', { month: 'long' });
  const timeStr = now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = now.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });

  const eventTitle = 'Design\nfeedback\nsession';
  const eventTime = '14:30';

  return (
    <div className="w-full h-full flex items-start justify-center bg-gradient-to-b from-[#1a3a8a] to-[#0f2060] font-sans overflow-hidden p-4">
      <audio ref={audioRef} onEnded={() => {
        if (audioFiles.length > 0) setCurrentTrack(prev => (prev + 1) % audioFiles.length);
      }} />
      <div className="w-80 flex flex-col gap-3">
        {/* Status bar */}
        <div className="flex items-center justify-between px-1 text-white/80 text-[10px]">
          <div className="flex items-center gap-2">
            <Play className="w-3 h-3" />
            <Battery className="w-4 h-4" />
            <Wifi className="w-3 h-3" />
            <Search className="w-3 h-3" />
          </div>
          <span className="font-medium">{dateStr}  {timeStr}</span>
        </div>

        {/* Outlook Widget */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0078D4] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">O</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-semibold">Outlook</div>
              <div className="text-white/60 text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                {audioFiles.length} audio files on disk
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-white/40 text-[10px]">Today</div>
              <div className="text-white/40 text-[10px]">{timeStr}</div>
            </div>
          </div>
        </div>

        {/* Event + Calendar */}
        <div className="flex gap-3">
          {/* Next event */}
          <div className="flex-1 bg-white rounded-2xl p-4">
            <div className="text-gray-400 text-[10px] mb-1">Next event:</div>
            <div className="text-gray-900 text-lg font-bold leading-tight mb-3 whitespace-pre-line">{eventTitle}</div>
            <div className="flex items-center gap-4">
              <div>
                <div className="text-gray-400 text-[9px]">Time:</div>
                <div className="text-gray-900 text-sm font-bold">{eventTime}</div>
              </div>
              <div>
                <div className="text-gray-400 text-[9px]">With:</div>
                <div className="flex -space-x-1.5 mt-0.5">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="flex-1 bg-white rounded-2xl p-3">
            <div className="text-gray-900 text-sm font-bold mb-2">{monthName}</div>
            <div className="grid grid-cols-7 gap-0.5">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-[8px] text-gray-400 text-center font-medium">{d}</div>
              ))}
              {calendarDays.map((d, i) => (
                <div
                  key={i}
                  className={cn(
                    "text-[9px] text-center py-0.5 rounded-full",
                    d === now.getDate() ? "bg-red-500 text-white font-bold" : "text-gray-600",
                    d < 1 || d > daysInMonth ? "text-gray-300" : ""
                  )}
                >
                  {d}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Music + Weather */}
        <div className="flex gap-3">
          {/* Music */}
          <div className="flex-1 bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
            <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 mb-3 overflow-hidden">
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-4xl">🎵</div>
              </div>
            </div>
            <div className="text-white text-sm font-semibold truncate">{track?.name?.replace(/\.[^.]+$/, '') || 'No track'}</div>
            <div className="text-white/50 text-xs">{track ? 'Local File' : 'Add audio files'}</div>
            <div className="flex items-center justify-between mt-3">
              <button onClick={() => { if (audioFiles.length > 0) setCurrentTrack(prev => (prev - 1 + audioFiles.length) % audioFiles.length); }} className="text-white/50 hover:text-white"><Shuffle className="w-3 h-3" /></button>
              <button onClick={() => { if (audioFiles.length > 0) setCurrentTrack(prev => (prev - 1 + audioFiles.length) % audioFiles.length); }} className="text-white/50 hover:text-white"><SkipBack className="w-3 h-3 fill-current" /></button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-white hover:text-white/80"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              </button>
              <button onClick={() => { if (audioFiles.length > 0) setCurrentTrack(prev => (prev + 1) % audioFiles.length); }} className="text-white/50 hover:text-white"><SkipForward className="w-3 h-3 fill-current" /></button>
              <button className="text-white/50 hover:text-white"><Repeat className="w-3 h-3" /></button>
            </div>
          </div>

          {/* Weather */}
          <div className="flex-1 bg-white rounded-2xl p-4 flex flex-col">
            <div className="text-gray-900 text-3xl font-light">26°</div>
            <div className="text-gray-400 text-xs mt-1">H: 28  L: 19</div>
            <div className="mt-auto flex items-center gap-2">
              <span className="text-2xl">☀️</span>
              <span className="text-gray-700 text-sm">Sunny</span>
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/10 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            <span className="text-white text-xl font-light">30:00</span>
          </div>
          <div className="ml-auto flex gap-2">
            <button className="px-4 py-2 bg-white/10 rounded-xl text-white text-xs font-medium hover:bg-white/20 transition-colors">
              Start
            </button>
            <button className="px-4 py-2 bg-white/10 rounded-xl text-white text-xs font-medium hover:bg-white/20 transition-colors">
              Change<br />Timer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WidgetStack;
