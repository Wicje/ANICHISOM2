'use client';

import React, { useState, useEffect } from 'react';
import { Music, Settings, Play, Pause, SkipBack, SkipForward, LayoutGrid, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FS, LocalFile } from '@/lib/fs';
import { motion, AnimatePresence } from 'framer-motion';

export function NotchNook({ window: osWindow }: { window?: any }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioFiles, setAudioFiles] = useState<LocalFile[]>([]);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [activeTab, setActiveTab] = useState<'nook' | 'tray'>('nook');
  const [isHovered, setIsHovered] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const loadAudio = async () => {
      try {
        const dirs = ['', 'Desktop', 'Downloads', 'Media'];
        const all: LocalFile[] = [];
        for (const dir of dirs) {
          const files = await FS.readDir(dir);
          if (files) all.push(...files.filter(f => f.mimeType?.startsWith('audio/')));
        }
        const unique = Array.from(new Map(all.map(f => [f.id, f])).values());
        setAudioFiles(unique);
      } catch { /* ignore */ }
    };
    loadAudio();
  }, []);

  const track = audioFiles[currentTrack];
  const trackTitle = track?.name?.replace(/\.[^.]+$/, '') || 'No track loaded';
  const trackArtist = track ? 'Local File' : 'Add audio files to play';

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying && track?.content) {
      audioRef.current.src = track.content;
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack, track]);

  const playPrev = () => {
    if (audioFiles.length === 0) return;
    setCurrentTrack(prev => (prev - 1 + audioFiles.length) % audioFiles.length);
  };

  const playNext = () => {
    if (audioFiles.length === 0) return;
    setCurrentTrack(prev => (prev + 1) % audioFiles.length);
  };

  const now = new Date();
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.getDate();
  });

  return (
    <div className="w-full flex justify-center pointer-events-none mt-2"
         onMouseEnter={() => setIsHovered(true)}
         onMouseLeave={() => setIsHovered(false)}>
      <audio ref={audioRef} onEnded={playNext} />
      <motion.div 
        layout
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="flex items-center gap-6 bg-black/95 backdrop-blur-3xl rounded-[40px] px-8 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_20px_60px_-10px_rgba(0,0,0,0.8),0_0_20px_rgba(255,255,255,0.05)] border border-white/5 ring-1 ring-white/10 max-w-2xl pointer-events-auto origin-top"
      >
        {/* Tab indicators - Segmented Control Style */}
        <div className="flex flex-col gap-2 shrink-0 bg-white/5 p-1 rounded-3xl ring-1 ring-white/10 shadow-inner">
          <button
            onClick={() => setActiveTab('nook')}
            className={cn(
              "flex flex-col items-center justify-center w-12 h-12 rounded-[20px] transition-all duration-300",
              activeTab === 'nook' ? "bg-white/15 text-white shadow-md ring-1 ring-white/20" : "text-white/40 hover:text-white/80 hover:bg-white/5"
            )}
          >
            <LayoutGrid className="w-5 h-5 mb-0.5" />
          </button>
          <button
            onClick={() => setActiveTab('tray')}
            className={cn(
              "flex flex-col items-center justify-center w-12 h-12 rounded-[20px] transition-all duration-300",
              activeTab === 'tray' ? "bg-white/15 text-white shadow-md ring-1 ring-white/20" : "text-white/40 hover:text-white/80 hover:bg-white/5"
            )}
          >
            <Settings className="w-5 h-5 mb-0.5" />
          </button>
        </div>

        {/* Music Player */}
        <div className="flex items-center gap-5 shrink-0 group">
          <div className="w-16 h-16 rounded-[22px] overflow-hidden bg-gradient-to-br from-gray-800 to-black relative ring-1 ring-white/15 shadow-xl group-hover:shadow-2xl group-hover:ring-white/30 transition-all duration-300">
            {/* Animated Album Art Background */}
            <div className={cn("absolute inset-0 bg-gradient-to-br from-indigo-500/40 via-purple-500/40 to-pink-500/40 opacity-70 transition-transform duration-1000", isPlaying ? "scale-110 rotate-3" : "scale-100 rotate-0")} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Music className="w-6 h-6 text-white shadow-sm" />
            </div>
            {/* Live Waveform Indicator */}
            {isPlaying && (
              <div className="absolute bottom-2 left-2 flex gap-0.5 items-end h-3">
                 {[1,2,3].map(i => (
                   <motion.div key={i} animate={{ height: ['4px', '12px', '4px'] }} transition={{ repeat: Infinity, duration: 0.6 + (i * 0.2) }} className="w-1 bg-white rounded-t-sm opacity-80" />
                 ))}
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-[140px] max-w-[180px]">
            <span className="text-[15px] font-bold text-white tracking-wide truncate drop-shadow-sm">{trackTitle}</span>
            <span className="text-[12px] font-medium text-white/50 truncate mt-0.5">{trackArtist}</span>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <button onClick={playPrev} className="p-2.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200">
              <SkipBack className="w-4 h-4 fill-current" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
            </button>
            <button onClick={playNext} className="p-2.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200">
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/10 to-transparent mx-2" />

        {/* Calendar Widget */}
        <div className="flex flex-col shrink-0 min-w-[160px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 uppercase tracking-widest">{now.toLocaleString('en', { month: 'short' })}</span>
            <div className="flex items-center gap-1.5 text-white/40 bg-white/5 px-2 py-0.5 rounded-full ring-1 ring-white/5">
              <Calendar className="w-3 h-3 text-blue-400/70" />
              <span className="text-[10px] font-bold tracking-wider">{audioFiles.length} Tracks</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 justify-between">
            {dates.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "text-[9px] font-bold tracking-widest",
                    d === now.getDate() ? "text-blue-400" : "text-white/30"
                  )}
                >
                  {days[i]}
                </span>
                <span
                  className={cn(
                    "text-xs font-bold transition-all duration-300 w-6 h-6 flex items-center justify-center rounded-full",
                    d === now.getDate() 
                      ? "bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] ring-1 ring-white/20" 
                      : "text-white/50 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {d}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default NotchNook;
