import React, { useState, useRef, useEffect } from 'react';
import { OSWindow } from '@/lib/os-context';
import { Play, Pause, SkipForward, SkipBack, Volume2, Maximize, Film, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MediaPlayerApp({ window: osWindow }: { window: OSWindow }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  const fileUrl = osWindow.data?.fileUrl;
  const isAudio = osWindow.data?.mimeType?.startsWith('audio/');
  const isVideo = osWindow.data?.mimeType?.startsWith('video/') || (!isAudio && fileUrl);

  useEffect(() => {
    if (mediaRef.current) {
      if (isPlaying) {
         mediaRef.current.play().catch(e => console.warn(e));
      } else {
         mediaRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      setProgress(mediaRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!fileUrl) {
    return (
      <div className="flex flex-col w-full h-full bg-black text-white items-center justify-center gap-4">
        <Film className="w-16 h-16 text-white/20" />
        <p className="text-white/50 text-sm">No media file loaded.</p>
        <p className="text-white/30 text-xs">Double-click a video or audio file from your Desktop to play.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-black text-white font-sans overflow-hidden group">
      
      {/* Media View */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {isVideo ? (
          <video 
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={fileUrl}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            onClick={() => setIsPlaying(!isPlaying)}
            autoPlay
          />
        ) : (
          <div className="flex flex-col items-center gap-8">
            <div className="w-48 h-48 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-500 flex items-center justify-center shadow-[0_0_100px_rgba(225,29,72,0.3)] animate-[spin_10s_linear_infinite]">
              <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-md" />
            </div>
            <Music className="w-8 h-8 text-white/50" />
            <audio 
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              src={fileUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              autoPlay
            />
          </div>
        )}
      </div>

      {/* Controls Overlay (Fade in on hover) */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-12 pb-4 px-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-4">
        
        {/* Scrubber */}
        <div className="flex items-center gap-3 text-xs font-mono text-white/70">
          <span>{formatTime(progress)}</span>
          <input 
            type="range" 
            min="0" 
            max={duration || 100} 
            value={progress} 
            onChange={(e) => {
              if (mediaRef.current) {
                mediaRef.current.currentTime = Number(e.target.value);
                setProgress(Number(e.target.value));
              }
            }}
            className="flex-1 h-1 bg-white/20 rounded-full appearance-none accent-rose-500 cursor-pointer hover:h-1.5 transition-all"
          />
          <span>{formatTime(duration)}</span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Volume2 className="w-5 h-5 text-white/70 hover:text-white cursor-pointer" />
          </div>
          
          <div className="flex items-center gap-6">
            <SkipBack className="w-6 h-6 text-white/70 hover:text-white cursor-pointer fill-current" />
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-black" /> : <Play className="w-6 h-6 fill-black ml-1" />}
            </button>
            <SkipForward className="w-6 h-6 text-white/70 hover:text-white cursor-pointer fill-current" />
          </div>

          <div className="flex items-center gap-4">
            <Maximize className="w-5 h-5 text-white/70 hover:text-white cursor-pointer" />
          </div>
        </div>

      </div>

    </div>
  );
}
