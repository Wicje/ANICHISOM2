import { create } from 'zustand';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

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
    if (user) {
      idbSet('anichisom_os_user_cache', user);
    }
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
    await idbDel('anichisom_os_user_cache');
  },

  wipeSession: async () => {
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch { /* ignore */ }
    await idbDel('anichisom_os_user_cache');
    localStorage.removeItem('anichisom_terminal_history');
    localStorage.removeItem('anichisom_fs_current_path');
    window.location.reload();
  },

  checkSession: async () => {
    // 1. Instant: serve from IDB cache so UI unblocks immediately
    const cachedUser = await idbGet<OSUser>('anichisom_os_user_cache');
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
        idbSet('anichisom_os_user_cache', osUser);
      } else {
        // No session — clear cache
        if (!cachedUser) {
          set({ currentUser: null, sessionChecked: true });
        }
        await idbDel('anichisom_os_user_cache');
        // Only clear if we didn't have a cached user (avoid flash)
        if (cachedUser) {
          set({ currentUser: null, sessionChecked: true });
        }
      }
    } catch {
      // Supabase timed out or errored — keep whatever cache had
      if (!cachedUser) {
        set({ currentUser: null, sessionChecked: true });
      }
    }
  },
}));
