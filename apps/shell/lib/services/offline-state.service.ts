/**
 * Offline State Service — persists Zustand store snapshots to IndexedDB
 * and restores them on app load for offline-first experience.
 *
 * Uses a debounced write to avoid excessive IndexedDB operations.
 * Stores state under key `continuaos-offline-state` in IndexedDB.
 */

import { get, set } from 'idb-keyval';

// ─── Types ──────────────────────────────────────────────────

export type OfflineStateSnapshot = {
  version: number;
  timestamp: number;
  auth: {
    currentUser: any | null;
  };
  theme: {
    wallpaper: string;
    themeColor: string;
    fontFamily: string;
    screenShader: string;
    performanceMode: string;
  };
  workspace: {
    workspaceMode: string;
    workspaceId: string | null;
    installedApps: string[];
    recentApps: string[];
  };
  browser: {
    pinnedApps: any[];
    tabs: any[];
  };
  campaign: {
    boards: any[];
  };
  file: {
    currentSource: string;
    currentPath: string;
    connectedSources: string[];
  };
};

const STORAGE_KEY = 'continuaos-offline-state';
const CURRENT_VERSION = 1;
const DEBOUNCE_MS = 2000;
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Debounced Write ────────────────────────────────────────

let writeTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSnapshot: OfflineStateSnapshot | null = null;

async function flushWrite(): Promise<void> {
  if (!pendingSnapshot) return;
  try {
    await set(STORAGE_KEY, pendingSnapshot);
  } catch {
    // IndexedDB may be full or unavailable
  }
  pendingSnapshot = null;
  writeTimer = null;
}

// ─── Service ────────────────────────────────────────────────

export const OfflineStateService = {
  /**
   * Save the current state snapshot. Debounced — multiple calls within
   * DEBOUNCE_MS window result in a single write.
   */
  async saveSnapshot(snapshot: Omit<OfflineStateSnapshot, 'version' | 'timestamp'>): Promise<void> {
    const fullSnapshot: OfflineStateSnapshot = {
      ...snapshot,
      version: CURRENT_VERSION,
      timestamp: Date.now(),
    };

    pendingSnapshot = fullSnapshot;

    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(flushWrite, DEBOUNCE_MS);
  },

  /**
   * Force an immediate save (bypasses debounce).
   */
  async saveSnapshotImmediate(snapshot: Omit<OfflineStateSnapshot, 'version' | 'timestamp'>): Promise<void> {
    if (writeTimer) clearTimeout(writeTimer);
    pendingSnapshot = {
      ...snapshot,
      version: CURRENT_VERSION,
      timestamp: Date.now(),
    };
    await flushWrite();
  },

  /**
   * Load the saved snapshot. Returns null if no snapshot exists
   * or if the snapshot is stale (>24 hours old).
   */
  async loadSnapshot(): Promise<OfflineStateSnapshot | null> {
    try {
      const snapshot = await get<OfflineStateSnapshot>(STORAGE_KEY);
      if (!snapshot) return null;
      if (Date.now() - snapshot.timestamp > STALE_THRESHOLD_MS) {
        return null; // Too old, start fresh
      }
      return snapshot;
    } catch {
      return null;
    }
  },

  /**
   * Clear the saved snapshot.
   */
  async clearSnapshot(): Promise<void> {
    if (writeTimer) clearTimeout(writeTimer);
    pendingSnapshot = null;
    try {
      const { del } = await import('idb-keyval');
      await del(STORAGE_KEY);
    } catch {
      // Ignore
    }
  },

  /**
   * Check if a saved snapshot exists and is fresh.
   */
  async hasFreshSnapshot(): Promise<boolean> {
    const snapshot = await this.loadSnapshot();
    return snapshot !== null;
  },

  /**
   * Get the age of the last snapshot in milliseconds.
   */
  async getSnapshotAge(): Promise<number | null> {
    try {
      const snapshot = await get<OfflineStateSnapshot>(STORAGE_KEY);
      if (!snapshot) return null;
      return Date.now() - snapshot.timestamp;
    } catch {
      return null;
    }
  },

  /**
   * Register to save state before the page unloads.
   */
  registerBeforeUnload(getSnapshot: () => Omit<OfflineStateSnapshot, 'version' | 'timestamp'>): () => void {
    const handler = () => {
      // Synchronous save attempt before unload
      const snapshot = getSnapshot();
      const fullSnapshot: OfflineStateSnapshot = {
        ...snapshot,
        version: CURRENT_VERSION,
        timestamp: Date.now(),
      };
      // Use sendBeacon or synchronous IndexedDB for reliability
      try {
        const data = JSON.stringify(fullSnapshot);
        // Try async write first, but it may not complete
        set(STORAGE_KEY, fullSnapshot).catch(() => {});
        // Also try sendBeacon as backup
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/pwa/sync-state', data);
        }
      } catch {
        // Best effort
      }
    };

    window.addEventListener('beforeunload', handler);
    window.addEventListener('pagehide', handler);

    return () => {
      window.removeEventListener('beforeunload', handler);
      window.removeEventListener('pagehide', handler);
    };
  },
};
