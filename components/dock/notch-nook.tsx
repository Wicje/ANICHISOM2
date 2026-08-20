'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Music, Play, Pause, SkipBack, SkipForward,
  LayoutGrid, Wifi, Bluetooth, Sun, Moon, Volume2, EyeOff,
  Folder, Share2, Trash2, Radio, Camera, Sparkles, X, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useMediaStore } from '@/lib/stores/media.store';
import { motion, AnimatePresence } from 'motion/react';
import { audioSystem } from '@/lib/services/audio-engine';

export function NotchNook({ window: osWindow }: { window?: any }) {
  const setShowNotch = useThemeStore((s) => s.setShowNotch);
  const { currentTrack, isPlaying, togglePlay, nextTrack, prevTrack, volume, setVolume } = useMediaStore();

  const [activeTab, setActiveTab] = useState<'media' | 'shelf' | 'toggles'>('media');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<Array<{ id: string; name: string; size: string }>>([]);
  const [cameraActive, setCameraActive] = useState(false);

  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Detect live camera usage across the OS
  useEffect(() => {
    const handleCameraState = (e: any) => {
      if (e.detail?.active !== undefined) setCameraActive(!!e.detail.active);
    };
    window.addEventListener('os:camera-state', handleCameraState);
    return () => window.removeEventListener('os:camera-state', handleCameraState);
  }, []);

  // Handle deliberate hover with 180ms debounce
  const handleMouseEnter = () => {
    setIsHovered(true);
    hoverTimerRef.current = setTimeout(() => {
      setIsExpanded(true);
    }, 180);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (!isDragOver) {
      setIsExpanded(false);
    }
  };

  // Drag & drop shelf handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    setIsExpanded(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    audioSystem.playClick();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).map((f, i) => ({
        id: `drop-${Date.now()}-${i}`,
        name: f.name,
        size: `${(f.size / 1024).toFixed(1)} KB`
      }));
      setDroppedFiles(prev => [...prev, ...files]);
      setActiveTab('shelf');
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'File Staged to Notch Shelf', description: `${files.length} item(s) ready to share or airDrop.`, type: 'success' }
      }));
    }
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
    <div
      className="w-full flex justify-center pointer-events-none pt-0 select-none font-sans"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <motion.div
        layout
        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
        className={cn(
          "bg-black text-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.15)] origin-top pointer-events-auto transition-all overflow-hidden border border-black",
          isExpanded
            ? "rounded-b-[32px] px-6 py-5 w-[660px] max-w-[95vw] mt-0"
            : isPlaying
            ? "rounded-b-[20px] px-4 py-1.5 w-[280px] h-[34px] cursor-pointer"
            : isDragOver
            ? "rounded-b-[24px] px-4 py-2 w-[340px] h-[48px] ring-2 ring-cyan-400 bg-slate-950"
            : "rounded-b-[18px] px-3.5 py-1 w-[180px] h-[32px] cursor-pointer"
        )}
      >
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            /* ─── Compact / Dynamic Island Pill Mode ─── */
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-between h-full w-full"
            >
              {/* Left: Camera Bezel & Privacy Dot / Music Wave */}
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-neutral-900 border border-neutral-700/80 relative flex items-center justify-center shadow-inner">
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-950" />
                  {cameraActive && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </div>

                {cameraActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Camera Active" />
                )}

                {isPlaying && (
                  <div className="flex items-center gap-1.5 pl-1">
                    <Music className="w-3 h-3 text-[#10F4A0] animate-pulse" />
                    <span className="text-[11px] font-semibold text-white/90 truncate max-w-[120px]">
                      {currentTrack.title}
                    </span>
                  </div>
                )}

                {isDragOver && (
                  <span className="text-xs font-bold text-cyan-400 animate-pulse flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Drop file here
                  </span>
                )}
              </div>

              {/* Right: Audio Waveform or Minimal Pill Indicator */}
              <div className="flex items-center gap-2">
                {isPlaying ? (
                  <div className="flex gap-[2px] items-end h-3">
                    {[1, 2, 3, 4].map(i => (
                      <motion.div
                        key={i}
                        animate={{ height: ['3px', '12px', '3px'] }}
                        transition={{ repeat: Infinity, duration: 0.5 + i * 0.15 }}
                        className="w-[2.5px] bg-[#10F4A0] rounded-t-sm"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors">
                    <span className="text-[10px] font-mono font-medium">Notch</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowNotch(false);
                        window.dispatchEvent(new CustomEvent('os:notify', {
                          detail: { title: 'Notch Hidden', description: 'Re-enable anytime from Control Center or Settings.', type: 'info' }
                        }));
                      }}
                      className="p-0.5 rounded hover:bg-white/10 hover:text-white transition-colors"
                      title="Hide Hardware Notch"
                    >
                      <EyeOff className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* ─── Expanded Bento Hub (NotchNook Pro) ─── */
            <motion.div
              key="expanded"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-4 text-white"
            >
              {/* Top Navigation Tabs */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-xl">
                  {[
                    { id: 'media', label: 'Media Player', icon: Music },
                    { id: 'shelf', label: `Drop Shelf (${droppedFiles.length})`, icon: Folder },
                    { id: 'toggles', label: 'Quick Tools', icon: LayoutGrid },
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isSelected = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id as any);
                          audioSystem.playClick();
                        }}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                          isSelected ? "bg-white text-black shadow-md" : "text-white/60 hover:text-white"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setShowNotch(false);
                      window.dispatchEvent(new CustomEvent('os:notify', {
                        detail: { title: 'Notch Hidden', description: 'Re-enable anytime from Control Center or Settings.', type: 'info' }
                      }));
                    }}
                    className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors"
                    title="Hide Notch"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors"
                    title="Collapse"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ─── 1. Media Player Tab ─── */}
              {activeTab === 'media' && (
                <div className="flex items-center justify-between gap-6">
                  {/* Left: Track Information & Controls */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-900 via-purple-950 to-black border border-white/20 flex items-center justify-center shadow-xl shrink-0 relative overflow-hidden">
                      <img
                        src={currentTrack.coverUrl}
                        alt={currentTrack.title}
                        className={cn("absolute inset-0 w-full h-full object-cover transition-transform duration-700", isPlaying && "scale-110")}
                      />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-bold text-white truncate tracking-tight">{currentTrack.title}</span>
                      <span className="text-xs text-white/50 truncate mt-0.5">{currentTrack.artist}</span>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => {
                            prevTrack();
                            audioSystem.playClick();
                          }}
                          className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        >
                          <SkipBack className="w-4 h-4 fill-current" />
                        </button>
                        <button
                          onClick={() => {
                            togglePlay();
                            audioSystem.playClick();
                          }}
                          className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
                        >
                          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                        </button>
                        <button
                          onClick={() => {
                            nextTrack();
                            audioSystem.playClick();
                          }}
                          className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        >
                          <SkipForward className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="w-px h-16 bg-white/10" />

                  {/* Right: Calendar Strip */}
                  <div className="flex flex-col shrink-0 min-w-[170px]">
                    <span className="text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
                      {now.toLocaleString('en', { month: 'short', year: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-1.5 justify-between">
                      {dates.map((d, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <span className={cn("text-[9px] font-bold", d === now.getDate() ? "text-cyan-400" : "text-white/30")}>
                            {days[i]}
                          </span>
                          <span className={cn(
                            "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all",
                            d === now.getDate() ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/50" : "text-white/60"
                          )}>
                            {d}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── 2. Notch Drop Shelf Tab ─── */}
              {activeTab === 'shelf' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Drag & drop files from your desktop or Finder to stage them here.</span>
                    {droppedFiles.length > 0 && (
                      <button
                        onClick={() => setDroppedFiles([])}
                        className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px] font-semibold"
                      >
                        <Trash2 className="w-3 h-3" /> Clear All
                      </button>
                    )}
                  </div>

                  {droppedFiles.length === 0 ? (
                    <div className="h-28 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 flex flex-col items-center justify-center gap-2 text-center p-4">
                      <Folder className="w-6 h-6 text-cyan-400" />
                      <span className="text-xs font-semibold text-slate-300">Drop Zone Ready</span>
                      <span className="text-[10px] text-slate-500">Files dropped here stay available across all apps</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-32 overflow-y-auto custom-scrollbar">
                      {droppedFiles.map(f => (
                        <div key={f.id} className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-semibold text-white truncate">{f.name}</span>
                              <span className="text-[10px] text-slate-400">{f.size}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('os:open-airdrop'));
                            }}
                            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white shrink-0"
                            title="AirDrop"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── 3. Quick System Toggles Tab ─── */}
              {activeTab === 'toggles' && (
                <div className="flex items-center gap-4 w-full">
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    {[
                      {
                        label: 'Wi-Fi',
                        icon: <Wifi className="w-4 h-4" />,
                        active: typeof navigator !== 'undefined' ? navigator.onLine : true,
                        onClick: () => {
                          window.dispatchEvent(new CustomEvent('os:notify', {
                            detail: { title: 'Wi-Fi Status', description: navigator.onLine ? 'Connected to high-speed network' : 'Offline mode active', type: 'info' }
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
                        icon: <Radio className="w-4 h-4" />,
                        active: true,
                        onClick: () => {
                          window.dispatchEvent(new CustomEvent('os:open-airdrop'));
                        }
                      },
                      {
                        label: 'Night Shift',
                        icon: <Sun className="w-4 h-4" />,
                        active: useThemeStore.getState().screenShader === 'amber-warm',
                        onClick: () => {
                          const curr = useThemeStore.getState().screenShader;
                          useThemeStore.getState().setScreenShader(curr === 'amber-warm' ? 'none' : 'amber-warm');
                        }
                      },
                      {
                        label: 'Continuity',
                        icon: <Camera className="w-4 h-4" />,
                        active: true,
                        onClick: () => {
                          const { useWindowStore } = require('@/lib/stores/window.store');
                          useWindowStore.getState().openWindow('continuity-hub', 'iPhone Mirroring & Continuity');
                        }
                      },
                    ].map(({ label, icon, active, onClick }) => (
                      <button
                        key={label}
                        onClick={() => {
                          onClick();
                          audioSystem.playClick();
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1 p-2.5 rounded-2xl text-[10px] font-bold transition-all",
                          active
                            ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/30"
                            : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/80"
                        )}
                      >
                        {icon}
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="w-px h-20 bg-white/10" />

                  {/* Sliders */}
                  <div className="flex flex-col gap-3 min-w-[140px]">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Sun className="w-3 h-3" /> Display
                      </span>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        defaultValue="90"
                        onChange={(e) => {
                          document.documentElement.style.filter = `brightness(${e.target.value}%)`;
                        }}
                        className="w-full h-1.5 rounded-full accent-cyan-400 bg-white/10 cursor-pointer"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Volume2 className="w-3 h-3" /> Sound
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume * 100}
                        onChange={(e) => setVolume(Number(e.target.value) / 100)}
                        className="w-full h-1.5 rounded-full accent-cyan-400 bg-white/10 cursor-pointer"
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
