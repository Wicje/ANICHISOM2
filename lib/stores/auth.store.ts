import { create } from 'zustand';
import { get as idbGet, set as idbSet, del as idbDel, clear } from 'idb-keyval';

export type OSRole = 'admin' | 'filmmaker' | 'technician' | 'user';

export type OSUser = {
  id: string;
  name: string;
  role: OSRole;
  avatarUrl?: string;
};

type AuthState = {
  currentUser: OSUser | null;
  setCurrentUser: (user: OSUser | null) => void;
  logout: () => Promise<void>;
  wipeSession: () => Promise<void>;
  checkSession: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,

  setCurrentUser: (user) => {
    set({ currentUser: user });
    if (user) {
      idbSet('anichisom_os_user_cache', user);
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.error('Logout error:', e);
    }
    set({ currentUser: null });
    await idbDel('anichisom_os_user_cache');
  },

  wipeSession: async () => {
    await clear();
    localStorage.clear();
    window.location.reload();
  },

  checkSession: async () => {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        set({ currentUser: null });
    await idbDel('anichisom_os_user_cache');
        return;
      }

      const data = await response.json();
      const osUser: OSUser = {
        id: data.user.id,
        name: data.user.uniqueId,
        role: (data.user.role as OSRole) || 'user',
      };

      set({ currentUser: osUser });
      idbSet('anichisom_os_user_cache', osUser);
    } catch {
      const cachedUser = await idbGet('anichisom_os_user_cache');
      if (cachedUser) {
        set({ currentUser: cachedUser });
      }
    }
  },
}));
