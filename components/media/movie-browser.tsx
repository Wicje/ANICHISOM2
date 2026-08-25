'use client';

import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Movie {
  id: number;
  title: string;
  year: number;
  overview: string;
  voteAverage: number;
  posterPath?: string;
  backdropPath?: string;
}

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_KEY = (typeof window !== 'undefined' ? (localStorage.getItem('continuaos_tmdb_key') || '') : '') || (process.env.NEXT_PUBLIC_TMDB_API_KEY as string | undefined) || '';

async function fetchMovies(endpoint: string, params: Record<string, string> = {}): Promise<Movie[]> {
  if (!TMDB_KEY) return [];
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set('api_key', TMDB_KEY);
  url.searchParams.set('language', 'en-US');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).slice(0, 16).map((m: any) => ({
    id: m.id,
    title: m.title || 'Untitled',
    year: m.release_date ? parseInt(m.release_date) : 0,
    overview: m.overview || '',
    voteAverage: m.vote_average || 0,
    posterPath: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : undefined,
    backdropPath: m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : undefined,
  }));
}

export function MovieBrowser({ window: osWindow }: { window?: any }) {
  const [activeTab, setActiveTab] = useState<'popular' | 'new' | 'upcoming'>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Load category movies
  useEffect(() => {
    const endpoints: Record<string, string> = {
      popular: '/movie/popular',
      new: '/movie/now_playing',
      upcoming: '/movie/upcoming',
    };
    const endpoint = endpoints[activeTab];
    if (!endpoint) return;
    setIsLoading(true);
    fetchMovies(endpoint, { page: '1' }).then(m => {
      setMovies(m);
      setIsLoading(false);
    });
  }, [activeTab]);

  // Search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!debouncedQuery.trim()) { setSearchResults([]); return; }
    setIsLoading(true);
    fetchMovies('/search/movie', { query: debouncedQuery, page: '1' }).then(m => {
      setSearchResults(m);
      setIsLoading(false);
    });
  }, [debouncedQuery]);

  const displayMovies = searchResults.length > 0 ? searchResults : movies;

  return (
    <div className="w-full h-full flex flex-col bg-white font-sans overflow-hidden">
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
                  activeTab === tab ? "text-gray-900 font-semibold border-gray-900" : "text-gray-400 border-transparent hover:text-gray-600"
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
            placeholder="Search movies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 bg-gray-100 rounded-full py-2 pl-10 pr-4 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>
        <div className="text-xs text-gray-400">
          Powered by <span className="font-semibold text-gray-600">TMDB</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {!TMDB_KEY && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">TMDB API key not configured.</p>
            <p className="text-xs mt-1">Add NEXT_PUBLIC_TMDB_API_KEY to your .env.local</p>
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-x-6 gap-y-8">
            {displayMovies.map((movie) => (
              <div key={movie.id} className="flex flex-col gap-3 group cursor-pointer">
                <div className="relative rounded-xl overflow-hidden aspect-[2/3] shadow-md group-hover:shadow-xl transition-shadow">
                  {movie.posterPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" src={movie.posterPath} alt={movie.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400 text-lg font-bold">{movie.title.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-gray-900 truncate">{movie.title}</span>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">{movie.year}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400 truncate">{movie.overview ? movie.overview.slice(0, 50) + '...' : 'No description'}</span>
                    <span className="text-xs font-bold text-yellow-600 shrink-0 ml-2">★ {movie.voteAverage.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MovieBrowser;
