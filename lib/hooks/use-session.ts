'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { API, SESSION } from '@/lib/config';

interface SessionUser {
  id: string;
  uniqueId: string;
  role: string;
}

/**
 * Check and return the current session from the server.
 * Debounced to avoid spam on rapid focus/blur cycles.
 */
export function useSession() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch(API.AUTH_SESSION, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        setSessionUser(null);
        setCurrentUser(null);
        return;
      }

      const data = await response.json();
      const user: SessionUser = {
        id: data.user?.id || data.data?.user?.id,
        uniqueId: data.user?.uniqueId || data.data?.user?.uniqueId,
        role: data.user?.role || data.data?.user?.role || 'user',
      };
      setSessionUser(user);
    } catch {
      // Offline or network error — keep current state
    } finally {
      setLoading(false);
    }
  }, [setCurrentUser]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return { sessionUser, loading, checkSession };
}
