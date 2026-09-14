/**
 * Spotify Web API Service
 *
 * Uses the provider access token from the Supabase session to call
 * Spotify's Web API for playback, playlists, and library access.
 * The token comes from the OAuth scope granted during Supabase sign-in
 * with Spotify.
 */

import { createClient } from '@/utils/supabase/client';

const SPOTIFY_API = 'https://api.spotify.com/v1';

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: { name: string; images: Array<{ url: string }> };
  duration_ms: number;
  uri: string;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: Array<{ url: string }>;
  tracks: { total: number };
  uri: string;
}

export interface SpotifyPlayerState {
  is_playing: boolean;
  progress_ms: number;
  item: SpotifyTrack | null;
  device: { name: string; id: string } | null;
}

class SpotifyApiService {
  private token: string | null = null;
  private tokenExpiry = 0;

  /**
   * Get the Spotify provider access token from the current Supabase session.
   * Returns null if the user didn't sign in with Spotify.
   */
  private async getToken(): Promise<string | null> {
    // Use cached token if still valid (with 60s buffer).
    if (this.token && Date.now() < this.tokenExpiry - 60_000) {
      return this.token;
    }

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const providerToken = session?.provider_token;
      const provider = session?.user?.app_metadata?.provider;

      if (provider === 'spotify' && providerToken) {
        this.token = providerToken;
        // Supabase tokens don't expose expiry directly; assume 1 hour.
        this.tokenExpiry = Date.now() + 3600_000;
        return this.token;
      }
    } catch {}

    return null;
  }

  private async apiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
    const token = await this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${SPOTIFY_API}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...init?.headers,
        },
      });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  /** Check if Spotify auth is available. */
  async isAvailable(): Promise<boolean> {
    return (await this.getToken()) !== null;
  }

  /** Get the user's current playback state. */
  async getPlayback(): Promise<SpotifyPlayerState | null> {
    return this.apiFetch<SpotifyPlayerState>('/me/player');
  }

  /** Get the user's playlists. */
  async getPlaylists(limit = 20): Promise<SpotifyPlaylist[]> {
    const data = await this.apiFetch<{ items: SpotifyPlaylist[] }>(
      `/me/playlists?limit=${limit}`
    );
    return data?.items ?? [];
  }

  /** Get featured playlists (for discovery). */
  async getFeaturedPlaylists(limit = 6): Promise<SpotifyPlaylist[]> {
    const data = await this.apiFetch<{ playlists: { items: SpotifyPlaylist[] } }>(
      `/browse/featured-playlists?limit=${limit}`
    );
    return data?.playlists?.items ?? [];
  }

  /** Start or resume playback. */
  async play(contextUri?: string, uris?: string[]): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return false;

    try {
      const res = await fetch(`${SPOTIFY_API}/me/player/play`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...(contextUri ? { context_uri: contextUri } : {}),
          ...(uris ? { uris } : {}),
        }),
      });
      return res.ok || res.status === 204;
    } catch {
      return false;
    }
  }

  /** Pause playback. */
  async pause(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return false;

    try {
      const res = await fetch(`${SPOTIFY_API}/me/player/pause`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok || res.status === 204;
    } catch {
      return false;
    }
  }

  /** Skip to next track. */
  async next(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return false;

    try {
      const res = await fetch(`${SPOTIFY_API}/me/player/next`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok || res.status === 204;
    } catch {
      return false;
    }
  }

  /** Skip to previous track. */
  async previous(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return false;

    try {
      const res = await fetch(`${SPOTIFY_API}/me/player/previous`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok || res.status === 204;
    } catch {
      return false;
    }
  }
}

export const spotifyApi = new SpotifyApiService();
