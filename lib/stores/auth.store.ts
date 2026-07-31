/**
 * Auth Zustand Store — user session management.
 *
 * Auth state persisted through Context Layer (readDomain/writeDomain).
 * Supabase auth calls remain direct (auth is infrastructure, not a context domain).
 */
import { create } from 'zustand';
import { readDomain, writeDomain } from '@/lib/context-layer';

const AUTH_DOMAIN = 'auth';
const LEGACY_KEY = 'continuaos_os_user_cache';

export type OSRole = 'admin' | 'filmmaker' | 'technician' | 'user';

export type OSUser = {
  id: string;
  name: string;
  role: OSRole;
  avatarUrl?: string;
};

type AuthState = {
  currentUser: OSUser | null;
  sessionChecked: boolean;
  setCurrentUser: (user: OSUser | null) => void;
  logout: () => Promise<void>;
  wipeSession: () => Promise<void>;
  checkSession: () => Promise<void>;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  sessionChecked: false,

  setCurrentUser: (user) => {
    set({ currentUser: user });
    if (user) writeDomain(AUTH_DOMAIN, user);
  },

  logout: async () => {
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Logout error:', e);
    }
    set({ currentUser: null });
    writeDomain(AUTH_DOMAIN, null);
  },

  wipeSession: async () => {
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch { /* ignore */ }
    writeDomain(AUTH_DOMAIN, null);
    try {
      const { clear } = await import('idb-keyval');
      await clear();
    } catch {}
    const keysToRemove = [
      'continuaos_terminal_history',
      'continuaos_fs_current_path',
      'continuaos_desktop_sync',
      'continuaos_onboarding_apps_installed',
      'continuaos_os_user_cache',
      'continua-auth',
      'continua-desktop',
      'continua-workspace',
      'continua-browser',
    ];
    keysToRemove.forEach((k) => {
      try { localStorage.removeItem(k); } catch {}
    });
    window.location.reload();
  },

  checkSession: async () => {
    // 1. Instant: serve from IDB cache so UI unblocks immediately
    let cachedUser = await readDomain<OSUser>(AUTH_DOMAIN);
    if (!cachedUser) {
      // Migration: try legacy key
      const { get: idbGet } = await import('idb-keyval');
      cachedUser = (await idbGet<OSUser>(LEGACY_KEY)) ?? null;
      if (cachedUser) writeDomain(AUTH_DOMAIN, cachedUser);
    }
    if (cachedUser) {
      set({ currentUser: cachedUser, sessionChecked: true });
    }

    // 2. Background: validate with Supabase, update if changed
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await withTimeout(
        supabase.auth.getUser(),
        8000
      );

      if (user) {
        const osUser: OSUser = {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: (user.user_metadata?.role as OSRole) || 'user',
          avatarUrl: user.user_metadata?.avatar_url,
        };
        set({ currentUser: osUser, sessionChecked: true });
        writeDomain(AUTH_DOMAIN, osUser);
      } else {
        if (!cachedUser) {
          set({ currentUser: null, sessionChecked: true });
        }
        writeDomain(AUTH_DOMAIN, null);
        if (cachedUser) {
          set({ currentUser: null, sessionChecked: true });
        }
      }
    } catch {
      if (!cachedUser) {
        set({ currentUser: null, sessionChecked: true });
      }
    }
  },
}));
