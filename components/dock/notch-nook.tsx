'use client';

import React, { useState, useEffect } from 'react';
import { Music, Settings, Play, Pause, SkipBack, SkipForward, LayoutGrid, Wifi, Bluetooth, Moon, Sun, Monitor, Bell, Battery, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FS, LocalFile } from '@/lib/fs';
import { useThemeStore } from '@/lib/stores/theme.store';
import { motion, AnimatePresence } from 'motion/react';

export function NotchNook({ window: osWindow }: { window?: any }) {
  const setShowNotch = useThemeStore((s) => s.setShowNotch);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioFiles, setAudioFiles] = useState<LocalFile[]>([]);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [activeTab, setActiveTab] = useState<'nook' | 'tray'>('nook');
  const [isExpanded, setIsExpanded] = useState(false);
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

  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const openSpotifyApp = () => {
    try {
      const { useWindowStore } = require('@/lib/stores/window.store');
      useWindowStore.getState().openWindow('spotify', 'Spotify Player');
    } catch {}
  };

  useEffect(() => {
    // Default active track or Spotify session
    setSpotifyTrack({
      title: 'Starboy',
      artist: 'The Weeknd, Daft Punk',
      cover: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop',
    });
  }, []);

  useEffect(() => {
    if (!audioRef.current || spotifyToken) return;
    if (isPlaying && track?.content) {
      audioRef.current.src = track.content;
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack, track, spotifyToken]);

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
    <div className="w-full flex justify-center pointer-events-none pt-0"
         onMouseEnter={() => setIsExpanded(true)}
         onMouseLeave={() => setIsExpanded(false)}>
      <audio ref={audioRef} onEnded={playNext} />
      
      <motion.div 
        layout
        initial={{ y: -50, scale: 0.9, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={cn(
          "bg-black backdrop-blur-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] origin-top pointer-events-auto transition-all overflow-hidden",
          isExpanded ? "rounded-[40px] px-6 py-5 w-[640px] mt-2" : "rounded-b-[16px] px-4 py-1.5 w-[320px] cursor-pointer h-[32px]"
        )}
      >
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            <motion.div 
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-between h-8"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-inner overflow-hidden relative" style={{ background: spotifyTrack ? '#1db954' : 'linear-gradient(to bottom right, #6366f1, #a855f7)' }}>
                  {spotifyTrack ? (
                    <img src={spotifyTrack.cover} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <Music className="w-3 h-3 text-white relative z-10" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-white/90 truncate max-w-[120px] leading-tight">
                    {spotifyTrack ? spotifyTrack.title : trackTitle}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {isPlaying && (
                  <div className="flex gap-[2px] items-end h-3">
                    {[1,2,3].map(i => (
                      <motion.div key={i} animate={{ height: ['3px', '10px', '3px'] }} transition={{ repeat: Infinity, duration: 0.6 + (i * 0.2) }} className="w-[3px] bg-white rounded-t-sm opacity-80" />
                    ))}
                  </div>
                )}
                <div className="flex gap-2 text-white/40 items-center">
                  <Battery className="w-4 h-4" />
                  <Wifi className="w-4 h-4" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNotch(false);
                      window.dispatchEvent(new CustomEvent('os:notify', {
                        detail: { title: 'Notch Hidden', description: 'You can re-enable the notch anytime from Control Center or Settings.', type: 'info' },
                      }));
                    }}
                    className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors ml-1"
                    title="Hide Notch (Re-enable from Control Center)"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="flex items-center gap-6"
            >
              {/* Tab indicators */}
              <div className="flex flex-col gap-2 shrink-0 bg-white/5 p-1 rounded-full ring-1 ring-white/10">
                <button
                  onClick={() => setActiveTab('nook')}
                  className={cn(
                    "flex flex-col items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
                    activeTab === 'nook' ? "bg-white/20 text-white shadow-sm ring-1 ring-white/30" : "text-white/40 hover:text-white/80 hover:bg-white/10"
                  )}
                >
                  <Music className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveTab('tray')}
                  className={cn(
                    "flex flex-col items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
                    activeTab === 'tray' ? "bg-white/20 text-white shadow-sm ring-1 ring-white/30" : "text-white/40 hover:text-white/80 hover:bg-white/10"
                  )}
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              {activeTab === 'nook' && (
                <>
                  <div className="flex items-center gap-5 shrink-0">
                    <div className="w-16 h-16 rounded-[20px] overflow-hidden bg-gradient-to-br from-indigo-900 to-black relative ring-1 ring-white/20 shadow-2xl group">
                      {spotifyTrack ? (
                        <img src={spotifyTrack.cover} alt="Cover" className={cn("absolute inset-0 w-full h-full object-cover transition-transform duration-1000", isPlaying ? "scale-110" : "scale-100")} />
                      ) : (
                        <>
                          <div className={cn("absolute inset-0 bg-gradient-to-br from-indigo-500/50 via-purple-500/50 to-pink-500/50 transition-transform duration-1000", isPlaying ? "scale-110 rotate-3" : "scale-100 rotate-0")} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Music className="w-7 h-7 text-white shadow-lg" />
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex flex-col min-w-[140px] max-w-[180px]">
                      <span className="text-sm font-bold text-white tracking-wide truncate">{spotifyTrack ? spotifyTrack.title : trackTitle}</span>
                      <span className="text-xs font-medium text-white/50 truncate mt-0.5 flex items-center gap-1">
                        {spotifyTrack ? (
                           <>
                             <svg className="w-3 h-3 text-[#1db954]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.54.659.301 1.02zm1.44-3.3c-.301.42-.84.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15.001 10.62 18.66 12.84c.361.181.54.84.301 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.2-1.2 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.56.3z"/></svg>
                             {spotifyTrack.artist}
                           </>
                        ) : trackArtist}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 ml-2">
                      <button onClick={playPrev} className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                        <SkipBack className="w-4 h-4 fill-current" />
                      </button>
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10"
                      >
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                      </button>
                      <button onClick={playNext} className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                        <SkipForward className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  </div>

                  <div className="w-px h-16 bg-white/10 mx-2" />

                  {/* Calendar Widget */}
                  <div className="flex flex-col shrink-0 min-w-[160px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white/70 uppercase tracking-wider">
                        {now.toLocaleString('en', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-between">
                      {dates.map((d, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <span className={cn("text-[8px] font-bold tracking-widest", d === now.getDate() ? "text-indigo-400" : "text-white/30")}>
                            {days[i]}
                          </span>
                          <span className={cn(
                            "text-xs font-bold transition-all w-6 h-6 flex items-center justify-center rounded-full",
                            d === now.getDate()
                              ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/50"
                              : "text-white/50"
                          )}>
                            {d}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'tray' && (
                <div className="flex items-center gap-4 min-w-[380px] w-full">
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    {[
                      {
                        label: 'Wi-Fi',
                        icon: <Wifi className="w-4 h-4" />,
                        active: typeof navigator !== 'undefined' ? navigator.onLine : true,
                        onClick: () => {
                          window.dispatchEvent(new CustomEvent('os:notify', {
                            detail: { title: 'Network Status', description: navigator.onLine ? 'Connected to High-Speed Wi-Fi' : 'Offline Mode Active', type: 'info' }
                          }));
                        }
                      },
                      {
                        label: 'Bluetooth',
                        icon: <Bluetooth className="w-4 h-4" />,
                        active: true,
                        onClick: async () => {
                          const { hardwareManager } = await import('@/lib/hardware');
                          await hardwareManager.requestBluetoothDevice();
                        }
                      },
                      {
                        label: 'Spotify',
                        icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.54.659.301 1.02zm1.44-3.3c-.301.42-.84.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15.001 10.62 18.66 12.84c.361.181.54.84.301 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.2-1.2 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.56.3z"/></svg>,
                        active: !!spotifyToken,
                        onClick: () => {
                          if (spotifyToken) setSpotifyToken(null);
                          else {
                            setSpotifyToken('mock_token_123');
                            setIsPlaying(true);
                            window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Spotify Connected', description: 'Listening to Audio Stream', type: 'success' } }));
                          }
                        }
                      },
                      {
                        label: useThemeStore.getState().colorMode === 'dark' ? 'Dark Mode' : 'Light Mode',
                        icon: <Moon className="w-4 h-4" />,
                        active: useThemeStore.getState().colorMode === 'dark',
                        onClick: () => {
                          const curr = useThemeStore.getState().colorMode;
                          useThemeStore.getState().setColorMode(curr === 'dark' ? 'light' : 'dark');
                        }
                      },
                      {
                        label: 'AirDrop',
                        icon: <Monitor className="w-4 h-4" />,
                        active: true,
                        onClick: async () => {
                          window.dispatchEvent(new CustomEvent('os:notify', {
                            detail: { title: 'AirDrop P2P Discovery', description: 'Scanning local WebRTC peers for instant file transfer...', type: 'info' }
                          }));
                          const { virtualDisplayManager } = await import('@/lib/virtual-display');
                          virtualDisplayManager.spawnSecondaryDisplay();
                        }
                      },
                      {
                        label: 'Night Shift',
                        icon: <Sun className="w-4 h-4" />,
                        active: useThemeStore.getState().screenShader === 'amber-warm',
                        onClick: () => {
                          const curr = useThemeStore.getState().screenShader;
                          useThemeStore.getState().setScreenShader(curr === 'amber-warm' ? 'none' : 'amber-warm');
                          window.dispatchEvent(new CustomEvent('os:notify', {
                            detail: { title: 'Night Shift', description: curr === 'amber-warm' ? 'Disabled warm screen filter' : 'Enabled warm blue-light screen filter', type: 'info' }
                          }));
                        }
                      },
                    ].map(({ label, icon, active, onClick }) => (
                      <button
                        key={label}
                        onClick={onClick}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl text-[9px] font-bold transition-all duration-200",
                          active && label === 'Spotify'
                            ? "bg-[#1db954]/20 text-[#1db954] ring-1 ring-[#1db954]/30 shadow-inner"
                            : active
                            ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30 shadow-inner"
                            : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70"
                        )}
                      >
                        {icon}
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="w-px h-20 bg-white/10 mx-2" />
                  <div className="flex flex-col gap-4 min-w-[130px]">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest flex items-center gap-1"><Sun className="w-3 h-3"/> Display</span>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        defaultValue="80"
                        onChange={(e) => {
                          if (typeof document !== 'undefined') {
                            document.documentElement.style.filter = `brightness(${e.target.value}%)`;
                          }
                        }}
                        className="w-full h-1.5 rounded-full accent-indigo-400 bg-white/10"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest flex items-center gap-1"><Music className="w-3 h-3"/> Sound</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={useThemeStore.getState().volume}
                        onChange={(e) => useThemeStore.getState().setVolume(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full accent-indigo-400 bg-white/10"
                      />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default NotchNook;
