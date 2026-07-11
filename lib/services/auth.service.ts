import { useAuthStore, OSUser } from '@/lib/stores/auth.store';

/**
 * Auth service — thin wrappers around auth store for use in non-React contexts.
 * Prefer useAuthStore() directly in React components.
 */
export const AuthService = {
  async checkSession(): Promise<OSUser | null> {
    await useAuthStore.getState().checkSession();
    return useAuthStore.getState().currentUser;
  },

  getCurrentUser(): OSUser | null {
    return useAuthStore.getState().currentUser;
  },

  async logout(): Promise<void> {
    await useAuthStore.getState().logout();
  },

  async wipeSession(): Promise<void> {
    await useAuthStore.getState().wipeSession();
  },
};
