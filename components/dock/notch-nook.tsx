'use client';

import React, { useState, useEffect } from 'react';
import { Music, Settings, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FS, LocalFile } from '@/lib/fs';

export function NotchNook({ window: osWindow }: { window?: any }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioFiles, setAudioFiles] = useState<LocalFile[]>([]);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [activeTab, setActiveTab] = useState<'nook' | 'tray'>('nook');
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
    <div className="w-full flex justify-center">
      <audio ref={audioRef} onEnded={playNext} />
      <div className="flex items-center gap-6 bg-[#0c0c0e] rounded-b-[24px] px-6 py-4 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] border-x border-b border-white/10 max-w-lg">
        {/* Tab indicators */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('nook')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              activeTab === 'nook' ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
            )}
          >
            <Music className="w-3 h-3" /> Nook
          </button>
          <button
            onClick={() => setActiveTab('tray')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              activeTab === 'tray' ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
            )}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
            </svg>
            Tray
          </button>
          <button className="p-1.5 text-white/40 hover:text-white/70 transition-colors ml-1">
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-10 bg-white/10" />

        {/* Music Player */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-11 h-11 rounded-lg overflow-hidden bg-white/10 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
            <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded bg-pink-500 flex items-center justify-center">
              <Music className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-white truncate">{trackTitle}</span>
            <span className="text-[10px] text-white/50 truncate">{trackArtist}</span>
          </div>
          <div className="flex items-center gap-2 ml-1">
            <button onClick={playPrev} className="text-white/60 hover:text-white transition-colors">
              <SkipBack className="w-3.5 h-3.5 fill-current" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-white hover:text-white/80 transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button onClick={playNext} className="text-white/60 hover:text-white transition-colors">
              <SkipForward className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-10 bg-white/10" />

        {/* Calendar Widget */}
        <div className="flex flex-col shrink-0">
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-base font-bold text-white">{now.toLocaleString('en', { month: 'short' })}</span>
            <div className="flex items-center gap-1">
              {dates.map((d, i) => (
                <span
                  key={i}
                  className={cn(
                    "text-[10px] w-5 text-center",
                    d === now.getDate() ? "text-blue-400 font-bold" : "text-white/40"
                  )}
                >
                  {days[i]}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/30 w-5" />
            {dates.map((d, i) => (
              <span
                key={i}
                className={cn(
                  "text-[11px] w-5 text-center font-medium",
                  d === now.getDate() ? "bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center" : "text-white/50"
                )}
              >
                {d}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-white/40">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span className="text-[10px]">{audioFiles.length} audio file{audioFiles.length !== 1 ? 's' : ''} loaded</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotchNook;
