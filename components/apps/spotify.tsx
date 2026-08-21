'use client';

import React, { useState, useEffect } from 'react';
import {
  Headphones, Play, Pause, Radio, ListMusic, Globe, Search,
  Sparkles, ExternalLink, RefreshCw, Check, Music2, Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaStore } from '@/lib/stores/media.store';

const FEATURED_SPOTIFY_PLAYLISTS = [
  { id: '37i9dQZF1DXcBWIGoYBM5M', name: "Today's Top Hits", genre: 'Pop / Global', color: 'from-emerald-500 to-green-900', cover: 'https://i.scdn.co/image/ab67706f00000002b55b6074da1d43715fc16d6d' },
  { id: '37i9dQZF1DX0XUsuxWHRQd', name: 'RapCaviar', genre: 'Hip-Hop / Rap', color: 'from-rose-500 to-red-900', cover: 'https://i.scdn.co/image/ab67706f000000026e515187c071e45918e9f838' },
  { id: '37i9dQZF1DWUa8ZRTfalHk', name: 'Pop Rising', genre: 'Trending Hits', color: 'from-cyan-500 to-blue-900', cover: 'https://i.scdn.co/image/ab67706f000000028cf56184542d9df8df3e8a51' },
  { id: '37i9dQZF1DX48cUvBllZ1y', name: 'Afro Hits', genre: 'Afrobeats', color: 'from-amber-500 to-yellow-900', cover: 'https://i.scdn.co/image/ab67706f00000002b8004f1418701a520bfd7a18' },
  { id: '37i9dQZF1DWWQRwui0ExPn', name: 'Lofi Beats', genre: 'Chill / Study', color: 'from-purple-500 to-indigo-900', cover: 'https://i.scdn.co/image/ab67706f000000024f2b934b176cf6b1c3413998' },
  { id: '37i9dQZF1DX4WYpdgoIcn6', name: 'Chill Hits', genre: 'Acoustic & Vibe', color: 'from-teal-500 to-slate-900', cover: 'https://i.scdn.co/image/ab67706f00000002c8eb160867167a5369c70425' },
];

export default function SpotifyApp() {
  const { playTrack, setIsPlaying } = useMediaStore();
  const [selectedEmbedUri, setSelectedEmbedUri] = useState<string>('playlist/37i9dQZF1DXcBWIGoYBM5M');
  const [customInput, setCustomInput] = useState('');
  const [viewMode, setViewMode] = useState<'featured' | 'web' | 'embed'>('featured');
  const [currentPlaylistTitle, setCurrentPlaylistTitle] = useState("Today's Top Hits");

  const handleSelectPlaylist = (playlist: typeof FEATURED_SPOTIFY_PLAYLISTS[0]) => {
    setSelectedEmbedUri(`playlist/${playlist.id}`);
    setCurrentPlaylistTitle(playlist.name);
    setViewMode('embed');
    
    // Broadcast track update to Dynamic Notch
    playTrack({
      id: `sp-${playlist.id}`,
      title: playlist.name,
      artist: `Spotify • ${playlist.genre}`,
      album: 'Spotify Live Stream',
      coverUrl: playlist.cover || 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?q=80&w=600&auto=format&fit=crop',
      source: 'spotify',
    });
    setIsPlaying(true);
    window.dispatchEvent(new CustomEvent('os:spotify-track-change', {
      detail: { title: playlist.name, artist: playlist.genre }
    }));
  };

  const handleCustomSearchOrUri = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    let uri = customInput.trim();
    // Parse Spotify URL: https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT or playlist/album
    const match = uri.match(/open\.spotify\.com\/(track|playlist|album|artist)\/([a-zA-Z0-9]+)/);
    if (match && match[1] && match[2]) {
      uri = `${match[1]}/${match[2]}`;
    } else if (!uri.includes('/')) {
      // Default to search or track
      uri = `track/${uri}`;
    }

    setSelectedEmbedUri(uri);
    setCurrentPlaylistTitle(`Custom: ${uri}`);
    setViewMode('embed');
    setCustomInput('');
  };

  return (
    <div className="w-full h-full bg-[#0d1117] text-white font-sans flex flex-col justify-between select-none overflow-hidden relative">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#1DB954]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-900/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header */}
      <div className="p-4 border-b border-white/10 bg-black/40 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#1DB954] flex items-center justify-center text-black shadow-[0_0_20px_rgba(29,185,84,0.4)]">
            <Headphones className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide flex items-center gap-2">
              Spotify Real Music <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/30">LIVE</span>
            </h2>
            <p className="text-[11px] text-white/50">{currentPlaylistTitle}</p>
          </div>
        </div>

        {/* View Mode Navigation */}
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setViewMode('featured')}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
              viewMode === 'featured' ? "bg-[#1DB954] text-black font-bold shadow-md" : "text-white/60 hover:text-white"
            )}
          >
            <ListMusic className="w-3.5 h-3.5" /> Hit Playlists
          </button>
          <button
            onClick={() => setViewMode('embed')}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
              viewMode === 'embed' ? "bg-[#1DB954] text-black font-bold shadow-md" : "text-white/60 hover:text-white"
            )}
          >
            <Radio className="w-3.5 h-3.5" /> Player
          </button>
          <button
            onClick={() => setViewMode('web')}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
              viewMode === 'web' ? "bg-[#1DB954] text-black font-bold shadow-md" : "text-white/60 hover:text-white"
            )}
          >
            <Globe className="w-3.5 h-3.5" /> Full Web App
          </button>
        </div>
      </div>

      {/* Search & URL Input Bar */}
      <div className="px-4 py-2.5 bg-black/20 border-b border-white/5 z-10 shrink-0">
        <form onSubmit={handleCustomSearchOrUri} className="flex gap-2 max-w-2xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Paste any Spotify song/playlist URL or track ID (e.g. open.spotify.com/track/...)"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-[#1DB954] transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-xl bg-[#1DB954] text-black font-bold text-xs hover:bg-[#1ed760] transition-colors"
          >
            Play
          </button>
        </form>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-hidden z-10 flex flex-col">
        {/* 1. Featured Playlists Grid */}
        {viewMode === 'featured' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <h3 className="text-base font-bold mb-1">Global Top Playlists & Trending Hits</h3>
                <p className="text-xs text-white/50">Click any playlist to stream real songs instantly through Continua OS</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {FEATURED_SPOTIFY_PLAYLISTS.map((playlist) => (
                  <div
                    key={playlist.id}
                    onClick={() => handleSelectPlaylist(playlist)}
                    className="group p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-[#1DB954]/50 cursor-pointer transition-all duration-300 flex flex-col justify-between gap-4 relative overflow-hidden"
                  >
                    <div className={cn("absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl opacity-40 bg-gradient-to-br", playlist.color)} />
                    
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl overflow-hidden shadow-lg border border-white/10 shrink-0">
                        <img src={playlist.cover} alt={playlist.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm truncate group-hover:text-[#1DB954] transition-colors">{playlist.name}</span>
                        <span className="text-xs text-white/50 mt-0.5">{playlist.genre}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-white/60">
                      <span className="flex items-center gap-1 font-mono">
                        <Music2 className="w-3 h-3 text-[#1DB954]" /> Stream Live
                      </span>
                      <span className="w-7 h-7 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                        <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. Embedded Real Spotify Player */}
        {viewMode === 'embed' && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 bg-black/40">
            <div className="w-full max-w-3xl h-full rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-black">
              <iframe
                title="Spotify Real Player"
                src={`https://open.spotify.com/embed/${selectedEmbedUri}?utm_source=generator&theme=0`}
                width="100%"
                height="100%"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="w-full h-full"
              />
            </div>
          </div>
        )}

        {/* 3. Full Web Player */}
        {viewMode === 'web' && (
          <div className="flex-1 w-full h-full bg-black">
            <iframe
              title="Spotify Web App"
              src="https://open.spotify.com"
              width="100%"
              height="100%"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              className="w-full h-full border-0"
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 bg-black/60 backdrop-blur-xl flex items-center justify-between text-[11px] text-white/50 z-10 shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" /> Spotify Web Engine Active
        </span>
        <a
          href="https://open.spotify.com"
          target="_blank"
          rel="noreferrer"
          className="hover:text-white flex items-center gap-1 text-[#1DB954]"
        >
          Open Spotify in Web <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
