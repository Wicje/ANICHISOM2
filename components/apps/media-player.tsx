import React, { useState, useRef, useEffect, useCallback } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { Play, Pause, SkipForward, SkipBack, Volume2, Maximize, Film, Music, ListVideo, X, LayoutGrid, Disc, Mic2, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FS, LocalFile } from '@/lib/fs';
import { useCollaborativeDoc, CollaborativeDocState } from '@/lib/hooks/useCollaborativeDoc';

type ViewMode = 'player' | 'coverflow';

export interface LyricLine {
  time: number;
  text: string;
}

export function parseLRC(lrcText: string): LyricLine[] {
  const lines = lrcText.split('\n');
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const mins = parseInt(match[1]!, 10);
      const secs = parseInt(match[2]!, 10);
      const ms = parseFloat(`0.${match[3]!}`);
      const time = mins * 60 + secs + ms;
      const text = line.replace(timeRegex, '').trim();
      if (text) result.push({ time, text });
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

export function MediaPlayerApp({ window: osWindow }: { window: OSWindow }) {
  const { workspaceMode } = useOS();
  const collab = useCollaborativeDoc({
    appPrefix: 'media',
    docId: osWindow.id,
    sharedTypes: [
      { name: 'playlist', kind: 'Array' },
      { name: 'playback', kind: 'Map' },
    ],
    undoTrackingTypes: ['playlist'],
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<LocalFile[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('player');
  const [coverflowIndex, setCoverflowIndex] = useState(2);

  const [currentFileUrl, setCurrentFileUrl] = useState<string | undefined>(osWindow.data?.fileUrl);
  const [currentMimeType, setCurrentMimeType] = useState<string | undefined>(osWindow.data?.mimeType);
  const [currentTitle, setCurrentTitle] = useState<string | undefined>('Now Playing');

  // Synced Lyrics (LRCLIB) State
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [showLyrics, setShowLyrics] = useState(false);
  const [activeLyricIndex, setActiveLyricIndex] = useState<number>(-1);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const visualizerCanvasRef = useRef<HTMLCanvasElement>(null);

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  const isAudio = currentMimeType?.startsWith('audio/');
  const isVideo = currentMimeType?.startsWith('video/') || (!isAudio && currentFileUrl);

  const coverflowTracks = mediaFiles.map((f, i) => ({
    title: f.name.replace(/\.[^.]+$/, '').substring(0, 15),
    artist: f.mimeType?.startsWith('audio/') ? 'Audio File' : 'Video File',
    color: `hsl(${(i * 47) % 360}, 40%, 30%)`,
    file: f,
  }));

  // Fetch local media files from OS filesystem
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

  // Sync local media files into Y.Array playlist when synced
  useEffect(() => {
    if (!collab.synced) return;
    const playlistArray = collab.sharedTypesRef.current.playlist;
    if (!playlistArray) return;

    // Only seed the playlist if it's empty and we have local files
    if (playlistArray.length === 0 && mediaFiles.length > 0) {
      for (const file of mediaFiles) {
        playlistArray.push([{ url: file.content || file.id, mimeType: file.mimeType, name: file.name }]);
      }
    }
  }, [collab.synced, mediaFiles]);

  const mediaFilesRef = useRef(mediaFiles);
  useEffect(() => { mediaFilesRef.current = mediaFiles; }, [mediaFiles]);

  // Observe Y.Array playlist for remote additions/removals
  useEffect(() => {
    if (!collab.synced) return;
    const playlistArray = collab.sharedTypesRef.current.playlist;
    if (!playlistArray) return;

    const observer = () => {
      // Rebuild mediaFiles from collaborative playlist + local files
      const remoteTracks: LocalFile[] = [];
      for (let i = 0; i < playlistArray.length; i++) {
        const item = playlistArray.get(i);
        try {
          const parsed = typeof item === 'string' ? JSON.parse(item) : item[0];
          remoteTracks.push({
            id: `remote-${i}`,
            name: parsed.name,
            mimeType: parsed.mimeType,
            content: parsed.url,
          });
        } catch {}
      }
      // Merge: local files first, then remote-only tracks
      const localIds = new Set(mediaFilesRef.current.map(f => f.content || f.id));
      const merged = [...mediaFilesRef.current, ...remoteTracks.filter(r => !localIds.has(r.content || r.id))];
      setMediaFiles(merged);
    };

    playlistArray.observe(observer);
    return () => playlistArray.unobserve(observer);
  }, [collab.synced]);

  // Broadcast current track to Y.Map 'playback' for peers
  const broadcastPlayback = useCallback((url: string, mimeType: string | undefined, name: string | undefined, playing: boolean) => {
    if (!collab.synced) return;
    const playbackMap = collab.sharedTypesRef.current.playback;
    if (!playbackMap) return;
    playbackMap.set('currentUrl', url);
    playbackMap.set('currentMimeType', mimeType || '');
    playbackMap.set('currentTitle', name || 'Now Playing');
    playbackMap.set('isPlaying', playing);
  }, [collab.synced, collab.sharedTypesRef]);

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

  // Auto-fetch synced lyrics from LRCLIB
  useEffect(() => {
    if (!currentTitle || currentTitle === 'Now Playing') {
      setLyrics([]);
      return;
    }
    const cleanTitle = currentTitle.replace(/\.[^.]+$/, '').replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
    let isMounted = true;
    fetch(`https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!isMounted) return;
        if (data?.syncedLyrics) {
          setLyrics(parseLRC(data.syncedLyrics));
        } else if (data?.plainLyrics) {
          setLyrics(data.plainLyrics.split('\n').filter(Boolean).map((t: string, i: number) => ({ time: i * 5, text: t })));
        } else {
          setLyrics([]);
        }
      })
      .catch(() => {
        if (isMounted) setLyrics([]);
      });
    return () => { isMounted = false; };
  }, [currentTitle]);

  // Broadcast media playback to MenuBar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('os:media-playback', {
        detail: {
          isPlaying,
          title: currentTitle || 'Audio Track',
          artist: isAudio ? 'Audio Track' : 'Video',
          progress,
          duration
        }
      }));
    }
  }, [isPlaying, currentTitle, progress, duration, isAudio]);

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      const cur = mediaRef.current.currentTime;
      setProgress(cur);

      if (lyrics.length > 0) {
        const idx = lyrics.findIndex((l, i) => {
          const next = lyrics[i + 1];
          return cur >= l.time && (!next || cur < next.time);
        });
        if (idx !== -1 && idx !== activeLyricIndex) {
          setActiveLyricIndex(idx);
          const el = document.getElementById(`lyric-line-${idx}`);
          if (el && lyricsContainerRef.current) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
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

  // Observe Y.Map 'playback' for remote playback state (agency mode)
  useEffect(() => {
    if (!collab.synced || workspaceMode !== 'agency') return;
    const playbackMap = collab.sharedTypesRef.current.playback;
    if (!playbackMap) return;

    const observer = () => {
      const remoteUrl = playbackMap.get('currentUrl') as string | undefined;
      const remoteMimeType = playbackMap.get('currentMimeType') as string | undefined;
      const remoteTitle = playbackMap.get('currentTitle') as string | undefined;
      const remotePlaying = playbackMap.get('isPlaying') as boolean | undefined;
      if (remoteUrl && remoteUrl !== currentFileUrl) {
        setCurrentFileUrl(remoteUrl);
        setCurrentMimeType(remoteMimeType || '');
        setCurrentTitle(remoteTitle || 'Now Playing');
        if (remotePlaying !== undefined) setIsPlaying(remotePlaying);
      }
    };

    playbackMap.observe(observer);
    return () => playbackMap.unobserve(observer);
  }, [collab.synced, workspaceMode]);

  const playNext = () => {
    if (mediaFiles.length === 0) return;
    const currentIndex = mediaFiles.findIndex(f => (f.content || f.id) === currentFileUrl);
    const nextIndex = (currentIndex + 1) % mediaFiles.length;
    const nextFile = mediaFiles[nextIndex];
    if (nextFile) {
      const url = nextFile.content || nextFile.id;
      setCurrentFileUrl(url);
      setCurrentMimeType(nextFile.mimeType);
      setCurrentTitle(nextFile.name);
      setIsPlaying(true);
      broadcastPlayback(url, nextFile.mimeType, nextFile.name, true);
    }
  };

  const playPrev = () => {
    if (mediaFiles.length === 0) return;
    const currentIndex = mediaFiles.findIndex(f => (f.content || f.id) === currentFileUrl);
    const prevIndex = currentIndex <= 0 ? mediaFiles.length - 1 : currentIndex - 1;
    const prevFile = mediaFiles[prevIndex];
    if (prevFile) {
      const url = prevFile.content || prevFile.id;
      setCurrentFileUrl(url);
      setCurrentMimeType(prevFile.mimeType);
      setCurrentTitle(prevFile.name);
      setIsPlaying(true);
      broadcastPlayback(url, prevFile.mimeType, prevFile.name, true);
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
  useEffect(() => {
    if (!currentFileUrl && mediaFiles.length > 0) {
       setCurrentFileUrl(mediaFiles[0]!.content || mediaFiles[0]!.id);
       setCurrentMimeType(mediaFiles[0]!.mimeType);
       setCurrentTitle(mediaFiles[0]!.name);
    }
  }, [currentFileUrl, mediaFiles]);

  // Coverflow View
  if (viewMode === 'coverflow') {
    return (
      <div className="flex flex-col w-full h-full bg-gradient-to-b from-[#C4842D] via-[#A06820] to-[#7A4E15] font-sans overflow-hidden">
        {/* View Toggle */}
        <div className="absolute top-4 right-4 z-30">
          <button onClick={() => setViewMode('player')} className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors" title="Switch to Player">
            <Play className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Cover Flow */}
        <div className="relative w-full h-[60%] flex items-center justify-center" style={{ perspective: '800px' }}>
          <div className="relative flex items-center justify-center w-full h-full">
            {coverflowTracks.map((track, i) => {
              const offset = i - coverflowIndex;
              const absOffset = Math.abs(offset);
              const isActive = i === coverflowIndex;
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
                  onClick={() => {
                    setCoverflowIndex(i);
                    const f = coverflowTracks[i]?.file;
                    if (f?.content) {
                      setCurrentFileUrl(f.content);
                      setCurrentMimeType(f.mimeType);
                      setCurrentTitle(f.name.replace(/\.[^.]+$/, ''));
                      setIsPlaying(true);
                    }
                  }}
                >
                  <div className="w-full h-full rounded-xl flex items-end p-4" style={{ background: `linear-gradient(135deg, ${track.color}, ${track.color}dd)` }}>
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
        <div className="w-full max-w-xl px-6 mt-auto mb-12 mx-auto">
          <div className="bg-white/10 backdrop-blur-2xl rounded-2xl px-6 py-3 flex items-center gap-4 border border-white/10">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10">
                <div className="w-full h-full" style={{ background: coverflowTracks[coverflowIndex]?.color ?? '#555' }} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">{coverflowTracks[coverflowIndex]?.title ?? ''}</div>
                <div className="text-[10px] text-white/50 truncate">{coverflowTracks[coverflowIndex]?.artist ?? ''}</div>
              </div>
            </div>
            <div className="flex items-center gap-4 mx-auto">
              <button onClick={playPrev} className="text-white/60 hover:text-white transition-colors"><SkipBack className="w-4 h-4 fill-current" /></button>
              <button onClick={() => setIsPlaying(!isPlaying)} className="text-white hover:text-white/80 transition-colors">
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              </button>
              <button onClick={playNext} className="text-white/60 hover:text-white transition-colors"><SkipForward className="w-4 h-4 fill-current" /></button>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button className="text-white/40 hover:text-white/70 transition-colors"><Volume2 className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>
    );
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
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => { e.preventDefault(); setShowLyrics(!showLyrics); }}
              className={cn(
                "p-2 rounded-full backdrop-blur-md pointer-events-auto transition-colors",
                showLyrics ? "bg-emerald-500 text-white" : "bg-white/10 hover:bg-white/20 text-white/80"
              )}
              title="Synced Lyrics (LRCLIB)"
            >
              <Mic2 className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); setShowPlaylist(!showPlaylist); }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md pointer-events-auto transition-colors"
            >
              <ListVideo className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); setViewMode('coverflow'); }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md pointer-events-auto transition-colors"
              title="Coverflow View"
            >
              <Disc className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Synced Lyrics Overlay (LRCLIB & YTM-Player Pattern) */}
        {showLyrics && lyrics.length > 0 && (
          <div
            ref={lyricsContainerRef}
            className="absolute inset-0 bg-black/85 backdrop-blur-2xl z-10 flex flex-col items-center justify-start overflow-y-auto px-8 py-20 text-center scroll-smooth"
          >
            <div className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-6 flex items-center gap-1.5 shrink-0">
              <Mic2 className="w-3.5 h-3.5" /> Synced Lyrics
            </div>
            <div className="flex flex-col gap-6 max-w-lg w-full pb-20">
              {lyrics.map((line, idx) => (
                <p
                  key={idx}
                  id={`lyric-line-${idx}`}
                  onClick={() => {
                    if (mediaRef.current) {
                      mediaRef.current.currentTime = line.time;
                      setProgress(line.time);
                    }
                  }}
                  className={cn(
                    "text-base sm:text-xl font-bold cursor-pointer transition-all duration-300 py-1 select-none",
                    idx === activeLyricIndex
                      ? "text-emerald-400 scale-110 drop-shadow-[0_0_20px_rgba(16,244,160,0.6)] font-extrabold opacity-100"
                      : "text-white/40 hover:text-white/70 opacity-60 scale-95"
                  )}
                >
                  {line.text}
                </p>
              ))}
            </div>
          </div>
        )}

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
                isPlaying ? "bg-gradient-to-tr from-rose-500 via-emerald-500 to-cyan-500 animate-[spin_10s_linear_infinite] shadow-[0_0_100px_rgba(225,29,72,0.4)] scale-105" 
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
