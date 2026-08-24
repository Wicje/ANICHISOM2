'use client';

/**
 * Context Privacy Store — the three-tier privacy guardrail system.
 *
 *  1. standard        — metadata-only context checkpoints, cloud sync on
 *  2. local_only      — checkpoints stay in IndexedDB; zero cloud sync
 *  3. private_session — all context monitoring paused entirely
 *
 * Single source of truth for the tier. Persists to localStorage under
 * `continua_privacy_mode` (the key the checkpoint sensor reads) and keeps the
 * context-layer sync mode (agency/private) in sync with the tier.
 */
import { create } from 'zustand';
import type { PrivacyMode } from '@/lib/context-kernel/graph';

export const PRIVACY_MODE_KEY = 'continua_privacy_mode';

const VALID_MODES: PrivacyMode[] = ['standard', 'local_only', 'private_session'];

interface ContextPrivacyState {
  mode: PrivacyMode;
  hydrated: boolean;
  /** Apply a new tier: persists + updates the context layer sync mode. */
  setMode: (mode: PrivacyMode) => void;
  /** Load persisted tier at boot and apply it. Safe to call repeatedly. */
  hydrate: () => void;
}

function readStoredMode(): PrivacyMode {
  if (typeof window === 'undefined') return 'standard';
  try {
    const stored = localStorage.getItem(PRIVACY_MODE_KEY);
    if (stored && (VALID_MODES as string[]).includes(stored)) {
      return stored as PrivacyMode;
    }
  } catch {}
  return 'standard';
}

/** Map a privacy tier onto the context layer's cloud-sync switch. */
async function applySyncMode(mode: PrivacyMode): Promise<void> {
  if (typeof window === 'undefined') return;

  // local_only blocks all cloud sync. Other tiers follow auth state:
  // logged-in users get cross-device sync, guests stay local anyway.
  let wantCloud = mode !== 'local_only';
  if (wantCloud) {
    try {
      const { useAuthStore } = await import('@/lib/stores/auth.store');
      wantCloud = Boolean(useAuthStore.getState().currentUser);
    } catch {
      wantCloud = false;
    }
  }

  try {
    const { configureContextLayer } = await import('@/lib/context-layer');
    configureContextLayer({ mode: wantCloud ? 'agency' : 'private' });
  } catch {}
}

export const useContextPrivacyStore = create<ContextPrivacyState>((set, get) => ({
  mode: 'standard',
  hydrated: false,

  setMode: (mode) => {
    set({ mode });
    try {
      localStorage.setItem(PRIVACY_MODE_KEY, mode);
    } catch {}
    void applySyncMode(mode);
    // Let any non-React listeners (widgets, extension bridge) react
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('os:privacy-mode-changed', { detail: { mode } }));
    }
  },

  hydrate: () => {
    if (get().hydrated) return;
    const mode = readStoredMode();
    set({ mode, hydrated: true });
    void applySyncMode(mode);
  },
}));
