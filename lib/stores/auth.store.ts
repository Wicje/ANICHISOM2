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

const DEFAULT_GUEST_USER: OSUser = {
  id: 'guest-user',
  name: 'Continua User',
  role: 'admin',
  avatarUrl: '/images/avatar_cyber.jpg',
};

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: DEFAULT_GUEST_USER,
  sessionChecked: false,

  setCurrentUser: (user) => {
    const nextUser = user || DEFAULT_GUEST_USER;
    set({ currentUser: nextUser });
    writeDomain(AUTH_DOMAIN, nextUser);
  },

  logout: async () => {
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Logout error:', e);
    }
    set({ currentUser: DEFAULT_GUEST_USER });
    writeDomain(AUTH_DOMAIN, DEFAULT_GUEST_USER);
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
    } else {
      set({ currentUser: DEFAULT_GUEST_USER, sessionChecked: true });
    }

    // 2. Background: validate with Supabase, update if logged in
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await withTimeout(
        supabase.auth.getUser(),
        5000
      );

      if (user) {
        const osUser: OSUser = {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: (user.user_metadata?.role as OSRole) || 'user',
          avatarUrl: user.user_metadata?.avatar_url || cachedUser?.avatarUrl || '/images/avatar_cyber.jpg',
        };
        set({ currentUser: osUser, sessionChecked: true });
        writeDomain(AUTH_DOMAIN, osUser);
      }
    } catch {
      // Fall back to cached user or default guest user
      if (!get().currentUser) {
        set({ currentUser: cachedUser || DEFAULT_GUEST_USER, sessionChecked: true });
      }
    }
  },
}));
