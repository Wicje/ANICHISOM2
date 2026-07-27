'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Battery, Wifi, Search, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FS, LocalFile } from '@/lib/fs';

export function WidgetStack({ window: osWindow }: { window?: any }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioFiles, setAudioFiles] = useState<LocalFile[]>([]);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(30 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerInput, setTimerInput] = useState('30');
  const [showTimerInput, setShowTimerInput] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!timerRunning || timerSeconds <= 0) {
      setTimerRunning(false);
      return;
    }
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const formatTimer = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const changeTimer = () => {
    const mins = parseInt(timerInput);
    if (!isNaN(mins) && mins > 0) {
      setTimerSeconds(mins * 60);
      setTimerRunning(false);
    }
  };

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
    <div className="w-80 flex flex-col gap-4 bg-black/60 backdrop-blur-[40px] rounded-[36px] p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,1),inset_0_1px_0_rgba(255,255,255,0.15)] border border-white/5 font-sans overflow-hidden ring-1 ring-white/10 relative">
      {/* Decorative ambient background */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 blur-[60px] opacity-60" />
      </div>

      <audio ref={audioRef} onEnded={() => {
        if (audioFiles.length > 0) setCurrentTrack(prev => (prev + 1) % audioFiles.length);
      }} />
      
        {/* Status bar */}
        <div className="flex items-center justify-between px-2 pt-1 text-white/90 text-[11px] font-semibold tracking-wide relative z-10 drop-shadow-md">
          <div className="flex items-center gap-2.5">
            <Play className="w-3.5 h-3.5 opacity-80" />
            <Battery className="w-4 h-4 opacity-80" />
            <Wifi className="w-3.5 h-3.5 opacity-80" />
          </div>
          <span>{dateStr}  <span className="opacity-60 ml-1">{timeStr}</span></span>
        </div>

        {/* Outlook Widget */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-[28px] p-4 border border-white/10 shadow-[0_8px_32px_-10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] group hover:bg-white/15 transition-all duration-300 relative z-10 cursor-default">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[18px] bg-gradient-to-b from-[#0078D4] to-[#005a9e] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(0,120,212,0.4),inset_0_1px_2px_rgba(255,255,255,0.4)]">
              <span className="text-white text-lg font-black tracking-wide drop-shadow-md">O</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-[15px] font-bold tracking-wide">Outlook</div>
              <div className="text-white/60 text-xs font-semibold flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
                {audioFiles.length} local audio files
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-blue-400/80 text-[10px] uppercase tracking-widest font-bold">Today</div>
              <div className="text-white/90 text-[13px] font-black mt-1 tracking-wider">{timeStr}</div>
            </div>
          </div>
        </div>

        {/* Event + Calendar */}
        <div className="flex gap-4 relative z-10">
          {/* Next event */}
          <div className="flex-1 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 backdrop-blur-xl rounded-[28px] p-4.5 border border-white/10 shadow-[0_8px_32px_-10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] group hover:bg-white/10 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
            <div className="text-indigo-300/80 text-[10px] uppercase tracking-widest mb-2 font-bold flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" /> Next event</div>
            <div className="text-white text-[17px] font-extrabold leading-[1.1] mb-4 tracking-tight relative z-10">{eventTitle}</div>
            <div className="flex items-center gap-5 relative z-10">
              <div>
                <div className="text-white/40 text-[9px] uppercase tracking-widest font-semibold">Time</div>
                <div className="text-white/90 text-xs font-bold mt-1 tracking-wider">{eventTime}</div>
              </div>
              <div>
                <div className="text-white/40 text-[9px] uppercase tracking-widest font-semibold mb-1">With</div>
                <div className="flex -space-x-2 relative z-10">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border border-white/20 shadow-md relative z-20 hover:-translate-y-1 transition-transform" style={{ zIndex: 10 - i }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="flex-1 bg-gradient-to-b from-white/10 to-transparent backdrop-blur-xl rounded-[28px] p-4 border border-white/10 shadow-[0_8px_32px_-10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] group hover:bg-white/10 transition-all duration-300">
            <div className="text-white font-black mb-3 tracking-widest text-center uppercase text-sm drop-shadow-sm">{monthName}</div>
            <div className="grid grid-cols-7 gap-y-1.5">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-[9px] text-white/30 text-center font-bold tracking-wider">{d}</div>
              ))}
              {calendarDays.map((d, i) => (
                <div
                  key={i}
                  className={cn(
                    "text-[11px] text-center w-6 h-6 mx-auto flex items-center justify-center rounded-full transition-all duration-300 font-bold",
                    d === now.getDate() && d > 0 && d <= daysInMonth
                      ? "bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-[0_2px_10px_rgba(225,29,72,0.6)] ring-1 ring-red-400/50" 
                      : "text-white/70",
                    (d < 1 || d > daysInMonth) ? "text-white/20" : "hover:bg-white/20 cursor-pointer"
                  )}
                >
                  {d}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Music + Weather */}
        <div className="flex gap-4 relative z-10">
          {/* Music */}
          <div className="flex-1 bg-gradient-to-br from-gray-800/80 to-black/80 backdrop-blur-xl rounded-[28px] p-4.5 border border-white/10 shadow-[0_8px_32px_-10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] group hover:border-white/20 transition-all duration-300">
            <div className="w-full aspect-square rounded-[20px] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 mb-4 relative overflow-hidden ring-1 ring-white/20 shadow-[0_10px_20px_-5px_rgba(0,0,0,0.5)] group-hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.6)] transition-all duration-500">
              <div className="w-full h-full flex items-center justify-center bg-black/20">
                <div className="text-4xl filter drop-shadow-xl scale-100 group-hover:scale-110 transition-transform duration-500">🎵</div>
              </div>
            </div>
            <div className="text-white text-[13px] font-bold truncate tracking-wide drop-shadow-md">{track?.name?.replace(/\.[^.]+$/, '') || 'No track'}</div>
            <div className="text-white/50 text-[11px] font-semibold mt-1 tracking-wide">{track ? 'Local File' : 'Add audio files'}</div>
            <div className="flex items-center justify-between mt-4 px-0.5">
              <button onClick={() => { if (audioFiles.length > 0) setCurrentTrack(prev => (prev - 1 + audioFiles.length) % audioFiles.length); }} className="text-white/40 hover:text-white transition-colors duration-200"><Shuffle className="w-4 h-4" /></button>
              <button onClick={() => { if (audioFiles.length > 0) setCurrentTrack(prev => (prev - 1 + audioFiles.length) % audioFiles.length); }} className="text-white/60 hover:text-white transition-colors duration-200"><SkipBack className="w-4 h-4 fill-current" /></button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.3)]"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <button onClick={() => { if (audioFiles.length > 0) setCurrentTrack(prev => (prev + 1) % audioFiles.length); }} className="text-white/60 hover:text-white transition-colors duration-200"><SkipForward className="w-4 h-4 fill-current" /></button>
              <button className="text-white/40 hover:text-white transition-colors duration-200"><Repeat className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Weather */}
          <div className="flex-1 bg-gradient-to-b from-blue-500/10 to-blue-900/10 backdrop-blur-xl rounded-[28px] p-5 flex flex-col border border-white/10 shadow-[0_8px_32px_-10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] group hover:bg-white/10 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/20 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none group-hover:bg-yellow-400/30 transition-colors duration-700" />
            <div className="text-white text-4xl font-light tracking-tighter leading-none relative z-10 drop-shadow-md">26°</div>
            <div className="text-white/60 text-[11px] font-bold mt-2 relative z-10 tracking-widest">H: 28°  L: 19°</div>
            <div className="mt-auto flex items-center gap-3 relative z-10">
              <span className="text-4xl filter drop-shadow-[0_0_15px_rgba(250,204,21,0.4)] hover:scale-110 transition-transform duration-500">☀️</span>
              <span className="text-white/90 text-sm font-bold tracking-widest uppercase">Sunny</span>
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className="bg-gradient-to-r from-orange-500/10 to-red-500/5 backdrop-blur-xl rounded-[28px] p-4.5 border border-white/10 shadow-[0_8px_32px_-10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] group transition-all duration-300 relative z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-[0_4px_12px_rgba(249,115,22,0.4),inset_0_2px_4px_rgba(255,255,255,0.3)]">
                <svg className="w-5 h-5 text-white drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
              </div>
              <span className="text-white text-3xl font-black tracking-tighter drop-shadow-md" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTimer(timerSeconds)}</span>
            </div>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => {
                  if (timerSeconds === 0) {
                    setTimerSeconds(parseInt(timerInput) * 60 || 30 * 60);
                  }
                  setTimerRunning(!timerRunning);
                }}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-md",
                  timerRunning 
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                    : timerSeconds === 0 
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]" 
                      : "bg-white/10 text-white hover:bg-white/20 border border-white/10 backdrop-blur-md"
                )}
              >
                {timerRunning ? 'Pause' : timerSeconds === 0 ? 'Start' : 'Resume'}
              </button>
              <button
                onClick={() => setShowTimerInput(!showTimerInput)}
                className="px-4 py-2 bg-white/5 rounded-xl text-white/70 hover:text-white text-xs font-black uppercase tracking-widest border border-white/10 hover:bg-white/15 transition-all duration-300 backdrop-blur-md"
              >
                Edit
              </button>
            </div>
          </div>
          {showTimerInput && (
            <div className="flex items-center gap-4 mt-5 pt-5 border-t border-white/10">
              <span className="text-white/50 text-[10px] font-black uppercase tracking-widest">Minutes:</span>
              <input
                type="number"
                value={timerInput}
                onChange={(e) => setTimerInput(e.target.value)}
                className="w-20 px-3 py-2 bg-black/50 rounded-xl text-white text-sm font-bold border border-white/10 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-center shadow-inner"
                min="1"
              />
              <button
                onClick={changeTimer}
                className="px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_4px_15px_rgba(59,130,246,0.4)] hover:shadow-[0_4px_20px_rgba(59,130,246,0.6)] transition-all ml-auto"
              >
                Set
              </button>
            </div>
          )}
        </div>
      </div>
  );
}

export default WidgetStack;
