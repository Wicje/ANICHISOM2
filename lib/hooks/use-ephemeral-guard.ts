'use client';

/**
 * Ephemeral Guest Session Guard
 *
 * When the OS is entered via /connect pairing (?ephemeral=true), this guard:
 *  1. Marks the session as ephemeral (privacy store + sessionStorage flag)
 *  2. Installs a passive pagehide listener that wipes all local traces when
 *     the guest closes the tab/window — no logout click required.
 *
 * The wipe fast-path is fully synchronous (localStorage/sessionStorage) so it
 * completes during unload; IndexedDB and cache cleanup run best-effort.
 */
import { useEffect } from 'react';
import { usePrivacyStore } from '@/lib/stores/privacy.store';

const EPHEMERAL_FLAG = 'continua_ephemeral_mode';

function isEphemeralSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      sessionStorage.getItem(EPHEMERAL_FLAG) === 'true' ||
      new URLSearchParams(window.location.search).get('ephemeral') === 'true'
    );
  } catch {
    return false;
  }
}

function fastWipe() {
  try {
    // Critical, synchronous traces first — these must not survive unload.
    sessionStorage.clear();
    const lsKeys = Object.keys(localStorage);
    for (const key of lsKeys) {
      if (!key.startsWith('continua_ephemeral_keep_')) {
        localStorage.removeItem(key);
      }
    }
  } catch {}

  // Best-effort async traces (usually complete even during teardown).
  try {
    import('idb-keyval').then(({ clear }) => clear()).catch(() => {});
  } catch {}
  try {
    caches?.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
  } catch {}
}

export function useEphemeralGuard() {
  useEffect(() => {
    if (!isEphemeralSession()) return;

    usePrivacyStore.getState().setEphemeralMode(true);

    const onPageHide = () => {
      if (isEphemeralSession()) fastWipe();
    };

    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, []);
}
