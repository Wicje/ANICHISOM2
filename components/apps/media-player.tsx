import React, { useState, useRef, useEffect } from 'react';
import { OSWindow } from '@/lib/os-context';
import { Play, Pause, SkipForward, SkipBack, Volume2, Maximize, Film, Music, ListVideo, X, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FS, LocalFile } from '@/lib/fs';

export function MediaPlayerApp({ window: osWindow }: { window: OSWindow }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<LocalFile[]>([]);
  
  const [currentFileUrl, setCurrentFileUrl] = useState<string | undefined>(osWindow.data?.fileUrl);
  const [currentMimeType, setCurrentMimeType] = useState<string | undefined>(osWindow.data?.mimeType);
  const [currentTitle, setCurrentTitle] = useState<string | undefined>('Now Playing');

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  const isAudio = currentMimeType?.startsWith('audio/');
  const isVideo = currentMimeType?.startsWith('video/') || (!isAudio && currentFileUrl);

  // Fetch playlist (all media files in OS)
  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const root = await FS.readDir('');
        const desktop = await FS.readDir('Desktop');
        const downloads = await FS.readDir('Downloads');
        const media = await FS.readDir('Media');
        const all = [...(root||[]), ...(desktop||[]), ...(downloads||[]), ...(media||[])];
        const unique = Array.from(new Map(all.map(item => [item.id, item])).values());
        
        const onlyMedia = unique.filter(f => f.mimeType?.startsWith('video/') || f.mimeType?.startsWith('audio/'));
        setMediaFiles(onlyMedia);
      } catch (e) {
        console.warn(e);
      }
    };
    fetchMedia();
  }, []);

  useEffect(() => {
    if (mediaRef.current) {
      if (isPlaying) {
         mediaRef.current.play().catch(e => console.warn(e));
      } else {
         mediaRef.current.pause();
      }
    }
  }, [isPlaying, currentFileUrl]);

  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.volume = volume;
    }
  }, [volume]);

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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mediaRef.current?.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  const playNext = () => {
    if (mediaFiles.length === 0) return;
    const currentIndex = mediaFiles.findIndex(f => (f.content || f.id) === currentFileUrl);
    const nextIndex = (currentIndex + 1) % mediaFiles.length;
    const nextFile = mediaFiles[nextIndex];
    if (nextFile) {
      setCurrentFileUrl(nextFile.content || nextFile.id);
      setCurrentMimeType(nextFile.mimeType);
      setCurrentTitle(nextFile.name);
      setIsPlaying(true);
    }
  };

  const playPrev = () => {
    if (mediaFiles.length === 0) return;
    const currentIndex = mediaFiles.findIndex(f => (f.content || f.id) === currentFileUrl);
    const prevIndex = currentIndex <= 0 ? mediaFiles.length - 1 : currentIndex - 1;
    const prevFile = mediaFiles[prevIndex];
    if (prevFile) {
      setCurrentFileUrl(prevFile.content || prevFile.id);
      setCurrentMimeType(prevFile.mimeType);
      setCurrentTitle(prevFile.name);
      setIsPlaying(true);
    }
  };

  if (!currentFileUrl && mediaFiles.length === 0) {
    return (
      <div className="flex flex-col w-full h-full bg-black text-white items-center justify-center gap-4">
        <Film className="w-16 h-16 text-white/20" />
        <p className="text-white/50 text-sm">No media file loaded.</p>
        <p className="text-white/30 text-xs">Double-click a video or audio file from your Desktop to play.</p>
      </div>
    );
  }

  // Auto-select first if none provided but we have playlist
  if (!currentFileUrl && mediaFiles.length > 0) {
     setCurrentFileUrl(mediaFiles[0].content || mediaFiles[0].id);
     setCurrentMimeType(mediaFiles[0].mimeType);
     setCurrentTitle(mediaFiles[0].name);
  }

  return (
    <div className="flex w-full h-full bg-black text-white font-sans overflow-hidden">
      
      {/* Main Player Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center bg-black overflow-hidden group">
        
        {/* Top Gradient (Appears on hover) */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-start justify-between p-4 pointer-events-none">
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-wide">{currentTitle}</span>
            <span className="text-xs text-white/50 uppercase tracking-wider">{isAudio ? 'Audio Player' : 'CinePlay Video'}</span>
          </div>
          <button 
            onClick={(e) => { e.preventDefault(); setShowPlaylist(!showPlaylist); }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md pointer-events-auto transition-colors"
          >
            <ListVideo className="w-4 h-4" />
          </button>
        </div>

        {/* Media Surface */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isVideo ? (
            <video 
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              src={currentFileUrl}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={playNext}
              onClick={() => setIsPlaying(!isPlaying)}
              autoPlay
            />
          ) : (
            <div className="flex flex-col items-center gap-8 z-0">
              <div className={cn(
                "w-64 h-64 rounded-full flex items-center justify-center transition-all duration-1000",
                isPlaying ? "bg-gradient-to-tr from-rose-500 via-purple-500 to-indigo-500 animate-[spin_10s_linear_infinite] shadow-[0_0_100px_rgba(225,29,72,0.4)] scale-105" 
                          : "bg-white/5 border border-white/10 scale-100"
              )}>
                <div className="w-24 h-24 rounded-full bg-black flex items-center justify-center border border-white/10 z-10">
                   <Music className={cn("w-8 h-8 transition-colors", isPlaying ? "text-white" : "text-white/30")} />
                </div>
              </div>
              <div className="text-center">
                 <h2 className="text-2xl font-bold">{currentTitle}</h2>
                 <p className="text-white/40 mt-1">Audio File</p>
              </div>
              <audio 
                ref={mediaRef as React.RefObject<HTMLAudioElement>}
                src={currentFileUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={playNext}
                autoPlay
              />
            </div>
          )}
        </div>

        {/* Controls Overlay (Fade in on hover) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 pb-6 px-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-5 z-20">
          
          {/* Scrubber */}
          <div className="flex items-center gap-4 text-xs font-mono text-white/70">
            <span>{formatTime(progress)}</span>
            <div className="flex-1 relative h-1.5 group/scrubber cursor-pointer">
              {/* Background track */}
              <div className="absolute inset-0 bg-white/20 rounded-full" />
              {/* Progress track */}
              <div 
                className="absolute top-0 left-0 bottom-0 bg-white rounded-full group-hover/scrubber:bg-blue-500 transition-colors"
                style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
              />
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
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
            </div>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Bottom Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 group/vol">
              <Volume2 className="w-5 h-5 text-white/70 hover:text-white cursor-pointer" />
              <div className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300 ease-out">
                 <input 
                   type="range" min="0" max="1" step="0.01" 
                   value={volume} onChange={(e) => setVolume(Number(e.target.value))}
                   className="w-full h-1 bg-white/20 rounded-full appearance-none accent-white cursor-pointer"
                 />
              </div>
            </div>
            
            <div className="flex items-center gap-8">
              <SkipBack onClick={playPrev} className="w-6 h-6 text-white/70 hover:text-white cursor-pointer fill-current" />
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-black" /> : <Play className="w-6 h-6 fill-black ml-1" />}
              </button>
              <SkipForward onClick={playNext} className="w-6 h-6 text-white/70 hover:text-white cursor-pointer fill-current" />
            </div>

            <div className="flex items-center gap-4">
              <Maximize onClick={toggleFullscreen} className="w-5 h-5 text-white/70 hover:text-white cursor-pointer" />
            </div>
          </div>

        </div>
      </div>

      {/* Playlist Sidebar */}
      {showPlaylist && (
        <div className="w-72 bg-[#121212] border-l border-white/10 flex flex-col shrink-0 animate-in slide-in-from-right-10 duration-300">
           <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-2">
                 <LayoutGrid className="w-4 h-4 text-white/50" />
                 <span className="font-semibold text-sm tracking-wide text-white/90">Up Next</span>
              </div>
              <button onClick={() => setShowPlaylist(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-4 h-4 text-white/50" />
              </button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
              {mediaFiles.length === 0 ? (
                <div className="p-4 text-center text-xs text-white/40">No other media found on your OS disk. Add some in FileManager!</div>
              ) : (
                mediaFiles.map((file, i) => {
                  const isPlayingThis = (file.content || file.id) === currentFileUrl;
                  const isAudioFile = file.mimeType?.startsWith('audio/');
                  return (
                    <div 
                      key={i} 
                      onClick={() => {
                        setCurrentFileUrl(file.content || file.id);
                        setCurrentMimeType(file.mimeType);
                        setCurrentTitle(file.name);
                        setIsPlaying(true);
                      }}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors group",
                        isPlayingThis ? "bg-blue-600/20" : "hover:bg-white/5"
                      )}
                    >
                      <div className="w-10 h-10 rounded bg-black/50 border border-white/10 flex items-center justify-center shrink-0">
                         {isPlayingThis ? (
                           <div className="flex gap-0.5 items-end h-3">
                             <div className="w-1 bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                             <div className="w-1 bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                             <div className="w-1 bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                           </div>
                         ) : isAudioFile ? (
                           <Music className="w-4 h-4 text-white/50 group-hover:text-white" />
                         ) : (
                           <Film className="w-4 h-4 text-white/50 group-hover:text-white" />
                         )}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className={cn("text-xs font-medium truncate", isPlayingThis ? "text-blue-400" : "text-white/80")}>
                          {file.name}
                        </span>
                        <span className="text-[10px] text-white/40 uppercase">
                          {isAudioFile ? 'Audio' : 'Video'}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
           </div>
        </div>
      )}

    </div>
  );
}
