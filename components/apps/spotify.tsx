'use client';

import React, { useState, useEffect } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Headphones, Key, Check,
  Heart, Radio, ListMusic, Volume2, Sparkles, Folder, Music, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { audioSystem } from '@/lib/services/audio-engine';
import { useMediaStore, MediaTrack } from '@/lib/stores/media.store';
import { FS } from '@/lib/fs';

export default function SpotifyApp() {
  const {
    currentTrack,
    queue,
    isPlaying,
    progress,
    duration,
    volume,
    playTrack,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    addTrackToQueue
  } = useMediaStore();

  const [liked, setLiked] = useState(false);
  const [viewMode, setViewMode] = useState<'player' | 'queue' | 'setup'>('player');
  const [clientId, setClientId] = useState('');
  const [savedClientId, setSavedClientId] = useState('');

  // Load local music files into queue
  useEffect(() => {
    const loadLocalAudio = async () => {
      try {
        const dirs = ['', 'Desktop', 'Downloads', 'Media'];
        for (const dir of dirs) {
          const files = await FS.readDir(dir);
          if (files) {
            const audios = files.filter(f => f.mimeType?.startsWith('audio/'));
            audios.forEach(a => {
              addTrackToQueue({
                id: a.id,
                title: a.name.replace(/\.[^.]+$/, ''),
                artist: 'Local Filesystem',
                album: 'Local Workspace',
                coverUrl: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?q=80&w=600&auto=format&fit=crop',
                audioUrl: a.content,
                duration: 210,
                source: 'local',
              });
            });
          }
        }
      } catch {}
    };
    loadLocalAudio();
  }, [addTrackToQueue]);

  useEffect(() => {
    try {
      const stored = (typeof window !== 'undefined' ? localStorage.getItem('continuaos_spotify_client_id') : '') || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '';
      if (stored) setSavedClientId(stored);
    } catch {}
  }, []);

  const handleSaveClientId = () => {
    if (!clientId.trim()) return;
    try {
      localStorage.setItem('continuaos_spotify_client_id', clientId.trim());
      setSavedClientId(clientId.trim());
      audioSystem.playClick();
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'Spotify Linked', description: 'Client ID saved securely.', type: 'success' }
      }));
    } catch {}
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full h-full bg-slate-950/95 backdrop-blur-3xl text-white font-sans flex flex-col justify-between p-6 select-none relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute -inset-10 bg-gradient-to-br from-emerald-600/10 via-teal-900/10 to-cyan-900/15 blur-3xl pointer-events-none" />

      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between z-10 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#1DB954]/20 border border-[#1DB954]/40 flex items-center justify-center text-[#1DB954]">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide">Spotify & Continua Music</h2>
            <p className="text-[10px] text-white/50">Unified OS Audio Engine & Dynamic Island Sync</p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-black/40 border border-white/15 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setViewMode('player')}
            className={cn("px-3 py-1 rounded-lg transition-colors", viewMode === 'player' ? "bg-[#1DB954] text-black font-bold" : "text-white/60 hover:text-white")}
          >
            Player
          </button>
          <button
            onClick={() => setViewMode('queue')}
            className={cn("px-3 py-1 rounded-lg transition-colors flex items-center gap-1", viewMode === 'queue' ? "bg-[#1DB954] text-black font-bold" : "text-white/60 hover:text-white")}
          >
            <ListMusic className="w-3.5 h-3.5" /> Queue ({queue.length})
          </button>
          <button
            onClick={() => setViewMode('setup')}
            className={cn("px-3 py-1 rounded-lg transition-colors flex items-center gap-1", viewMode === 'setup' ? "bg-[#1DB954] text-black font-bold" : "text-white/60 hover:text-white")}
          >
            <Key className="w-3 h-3" /> OAuth Setup
          </button>
        </div>
      </div>

      {/* Body: Player View */}
      {viewMode === 'player' && (
        <div className="flex-1 flex flex-col items-center justify-center my-4 z-10">
          <div className="w-full max-w-sm bg-neutral-900/80 border border-white/20 shadow-2xl rounded-3xl p-5 flex flex-col justify-between gap-4 backdrop-blur-2xl">
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#1DB954] uppercase tracking-widest font-bold flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" /> Unified Audio Stream
              </span>
              <button
                onClick={() => setLiked(!liked)}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Heart className={cn("w-4 h-4", liked ? "fill-rose-500 text-rose-500" : "text-white/50")} />
              </button>
            </div>

            {/* Artwork */}
            <div className="aspect-square w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative group">
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Track Info */}
            <div className="text-center">
              <h3 className="text-base font-bold truncate">{currentTrack.title}</h3>
              <p className="text-xs text-white/50">{currentTrack.artist}</p>
            </div>

            {/* Progress Slider */}
            <div className="space-y-1">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={progress}
                onChange={(e) => seek(Number(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-full appearance-none outline-none accent-[#1DB954] cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-white/40 font-mono">
                <span>{formatTime(progress)}</span>
                <span>-{formatTime(Math.max(0, duration - progress))}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6">
              <button onClick={prevTrack} className="p-2 text-white/70 hover:text-white transition-colors">
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-[#1DB954] text-black font-bold flex items-center justify-center shadow-lg shadow-[#1DB954]/20 hover:scale-105 active:scale-95 transition-all"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black ml-0.5" />}
              </button>
              <button onClick={nextTrack} className="p-2 text-white/70 hover:text-white transition-colors">
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Body: Queue View */}
      {viewMode === 'queue' && (
        <div className="flex-1 my-4 z-10 flex flex-col gap-2 max-w-lg mx-auto w-full overflow-y-auto custom-scrollbar">
          <div className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">Up Next & Queue</div>
          {queue.map((t, idx) => (
            <div
              key={`${t.id}-${idx}`}
              onClick={() => playTrack(t)}
              className={cn(
                "p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all",
                currentTrack.id === t.id
                  ? "bg-[#1DB954]/15 border-[#1DB954]/40 text-white"
                  : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <img src={t.coverUrl} alt={t.title} className="w-10 h-10 rounded-xl object-cover" />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold truncate">{t.title}</span>
                  <span className="text-[10px] text-white/50 truncate">{t.artist}</span>
                </div>
              </div>
              {currentTrack.id === t.id && isPlaying && (
                <Music className="w-4 h-4 text-[#1DB954] animate-pulse shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Body: OAuth Setup */}
      {viewMode === 'setup' && (
        <div className="flex-1 my-4 z-10 flex flex-col justify-center max-w-lg mx-auto space-y-5 bg-slate-900/90 border border-white/15 rounded-3xl p-6 backdrop-blur-2xl">
          <div className="flex items-center gap-2 text-[#1DB954] font-bold text-sm">
            <Key className="w-4 h-4" /> Spotify Developer Setup Assistant
          </div>

          <p className="text-xs text-white/70 leading-relaxed">
            To link your personal Spotify Premium Account and enable direct API playback:
          </p>

          <ol className="text-xs text-white/60 space-y-2 list-decimal list-inside bg-black/40 p-4 rounded-xl border border-white/10 font-mono">
            <li>Open <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" className="text-[#1DB954] underline">developer.spotify.com/dashboard</a></li>
            <li>Click <strong>Create App</strong> and specify your app name.</li>
            <li>Add Redirect URI: <code className="text-cyan-300">http://localhost:3000/callback</code></li>
            <li>Copy your <strong>Client ID</strong> and paste it below.</li>
          </ol>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste Spotify Client ID..."
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="flex-1 bg-black border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-[#1DB954]"
            />
            <button
              onClick={handleSaveClientId}
              className="bg-[#1DB954] text-black font-bold px-4 py-2 rounded-xl text-xs hover:bg-[#1ed760] transition-colors"
            >
              Connect Account
            </button>
          </div>

          {savedClientId && (
            <div className="text-[11px] text-[#1DB954] flex items-center gap-1 font-mono">
              <Check className="w-3.5 h-3.5" /> Client ID active: {savedClientId.slice(0, 8)}...
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="z-10 flex items-center justify-between text-[10px] text-white/40 border-t border-white/10 pt-3">
        <span>Connected to Continua OS Audio Service</span>
        <span>Audio Profile: {audioSystem.getSoundProfile().toUpperCase()}</span>
      </div>
    </div>
  );
}
