'use client';

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Movie {
  title: string;
  year: number;
  streaming: string;
  countries: number;
  posterColor: string;
  posterPath?: string;
}

const movies: Movie[] = [
  { title: 'Dream Scenario', year: 2023, streaming: 'Streaming in 24 countries', countries: 24, posterColor: '#8B4513' },
  { title: 'Drive-Away Dolls', year: 2024, streaming: 'Streaming in 8 countries', countries: 8, posterColor: '#CD853F' },
  { title: 'Knight of Cups', year: 2015, streaming: 'Streaming 19 countries', countries: 19, posterColor: '#2F4F4F' },
  { title: 'Memory', year: 2023, streaming: 'Streaming in 11 countries', countries: 11, posterColor: '#4A4A4A' },
  { title: 'The Square', year: 2017, streaming: 'Streaming in 5 countries', countries: 5, posterColor: '#8B7355' },
  { title: 'Close', year: 2022, streaming: 'Streaming in 27 countries', countries: 27, posterColor: '#556B2F' },
  { title: 'Maestro', year: 2023, streaming: 'Streaming in 18 countries', countries: 18, posterColor: '#1a1a1a' },
  { title: 'Past Lives', year: 2023, streaming: 'Streaming 23 countries', countries: 23, posterColor: '#4682B4' },
];

export function MovieBrowser({ window: osWindow }: { window?: any }) {
  const [activeTab, setActiveTab] = useState<'popular' | 'new' | 'upcoming'>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const searchMovies = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(debouncedQuery)}&api_key=demo&language=en-US&page=1`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(
            (data.results || []).slice(0, 8).map((m: any) => ({
              title: m.title || 'Untitled',
              year: m.release_date ? parseInt(m.release_date) : 0,
              streaming: m.overview ? m.overview.slice(0, 60) + '...' : 'No description',
              countries: m.vote_count || 0,
              posterColor: `hsl(${Math.abs(m.id * 37) % 360}, 40%, 30%)`,
              posterPath: m.poster_path ? `https://image.tmdb.org/t/p/w300${m.poster_path}` : undefined,
            }))
          );
        }
      } catch {
        // API may not be available, fall back to static data
      }
      setIsLoading(false);
    };
    searchMovies();
  }, [debouncedQuery]);

  const displayMovies = searchResults.length > 0 ? searchResults : movies;

  return (
    <div className="w-full h-full flex flex-col bg-white font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
            </svg>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            {(['popular', 'new', 'upcoming'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "capitalize transition-colors pb-1 border-b-2",
                  activeTab === tab
                    ? "text-gray-900 font-semibold border-gray-900"
                    : "text-gray-400 border-transparent hover:text-gray-600"
                )}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search movies or tv shows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 bg-gray-100 rounded-full py-2 pl-10 pr-4 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>

        <div className="text-xs text-gray-400">
          Powered by <span className="font-semibold text-gray-600">FineTune</span>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <div className="grid grid-cols-4 gap-x-6 gap-y-8">
          {displayMovies.map((movie, i) => (
            <div key={i} className="flex flex-col gap-3 group cursor-pointer">
              <div className="relative rounded-xl overflow-hidden aspect-[2/3] shadow-md group-hover:shadow-xl transition-shadow">
                {movie.posterPath ? (
                  <img src={movie.posterPath} alt={movie.title} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${movie.posterColor}, ${movie.posterColor}cc)` }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white/30 text-lg font-bold">{movie.title.charAt(0)}</span>
                    </div>
                  </>
                )}
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-gray-900">{movie.title}</span>
                  <span className="text-xs text-gray-400">{movie.year}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400">{movie.streaming}</span>
                  <button className="text-xs font-semibold text-gray-900 hover:underline">See where</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MovieBrowser;
