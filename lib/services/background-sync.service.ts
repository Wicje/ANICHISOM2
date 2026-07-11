/**
 * Background Sync Service — queues failed network requests and replays
 * them when the browser reconnects. Uses the Service Worker sync queue
 * or falls back to direct IndexedDB storage.
 *
 * Client-side API for components to queue mutations that should be
 * retried when connectivity returns.
 */

import { get, set } from 'idb-keyval';

// ─── Types ──────────────────────────────────────────────────

export type SyncAction = {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'in-progress' | 'failed' | 'completed';
  error?: string;
  tags?: string[];   // e.g. ['campaign', 'moodboard'] for selective sync
};

export type SyncStatus = {
  isOnline: boolean;
  pendingCount: number;
  lastSyncAttempt: number | null;
  lastSyncSuccess: number | null;
};

const QUEUE_KEY = 'anichisom-background-sync-queue';
const STATUS_KEY = 'anichisom-sync-status';
const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // ms

// ─── Queue Management ───────────────────────────────────────

async function getQueue(): Promise<SyncAction[]> {
  try {
    return (await get<SyncAction[]>(QUEUE_KEY)) || [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: SyncAction[]): Promise<void> {
  try {
    await set(QUEUE_KEY, queue);
  } catch {
    // Queue may be lost — acceptable for MVP
  }
}

async function updateStatus(partial: Partial<SyncStatus>): Promise<void> {
  try {
    const current = (await get<SyncStatus>(STATUS_KEY)) || {
      isOnline: navigator.onLine,
      pendingCount: 0,
      lastSyncAttempt: null,
      lastSyncSuccess: null,
    };
    await set(STATUS_KEY, { ...current, ...partial });
  } catch {
    // Ignore
  }
}

// ─── Service ────────────────────────────────────────────────

export const BackgroundSyncService = {
  /**
   * Queue a mutation action for background sync.
   */
  async queue(action: Omit<SyncAction, 'id' | 'timestamp' | 'retries' | 'maxRetries' | 'status'>): Promise<SyncAction> {
    const entry: SyncAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0,
      maxRetries: MAX_RETRIES,
      status: 'pending',
    };

    const queue = await getQueue();
    queue.push(entry);
    await saveQueue(queue);
    await updateStatus({ pendingCount: queue.filter((q) => q.status === 'pending').length });

    // Try to send to service worker for background sync
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_QUEUE_ADD',
        payload: entry,
      });
    }

    // If online, try to process immediately
    if (navigator.onLine) {
      this.processQueue();
    }

    return entry;
  },

  /**
   * Process all pending actions in the queue.
   */
  async processQueue(): Promise<{ processed: number; failed: number }> {
    const queue = await getQueue();
    const pending = queue.filter((q) => q.status === 'pending');
    let processed = 0;
    let failed = 0;

    await updateStatus({ lastSyncAttempt: Date.now() });

    for (const action of pending) {
      action.status = 'in-progress';
      await saveQueue(queue);

      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: {
            'Content-Type': 'application/json',
            ...action.headers,
          },
          body: action.body ? JSON.stringify(action.body) : undefined,
        });

        if (response.ok) {
          action.status = 'completed';
          processed++;
        } else {
          action.retries++;
          action.error = `HTTP ${response.status}`;
          if (action.retries >= action.maxRetries) {
            action.status = 'failed';
            failed++;
          } else {
            action.status = 'pending';
          }
        }
      } catch (error) {
        action.retries++;
        action.error = error instanceof Error ? error.message : 'Network error';
        if (action.retries >= action.maxRetries) {
          action.status = 'failed';
          failed++;
        } else {
          action.status = 'pending';
        }
      }
    }

    // Remove completed entries
    const remaining = queue.filter((q) => q.status !== 'completed');
    await saveQueue(remaining);
    await updateStatus({
      pendingCount: remaining.filter((q) => q.status === 'pending').length,
      lastSyncSuccess: processed > 0 ? Date.now() : undefined,
    });

    return { processed, failed };
  },

  /**
   * Get the current sync status.
   */
  async getStatus(): Promise<SyncStatus> {
    const queue = await getQueue();
    const stored = await get<SyncStatus>(STATUS_KEY);
    return {
      isOnline: navigator.onLine,
      pendingCount: queue.filter((q) => q.status === 'pending').length,
      lastSyncAttempt: stored?.lastSyncAttempt || null,
      lastSyncSuccess: stored?.lastSyncSuccess || null,
    };
  },

  /**
   * Get all pending actions.
   */
  async getPendingActions(): Promise<SyncAction[]> {
    const queue = await getQueue();
    return queue.filter((q) => q.status === 'pending');
  },

  /**
   * Get all failed actions (exceeded retry limit).
   */
  async getFailedActions(): Promise<SyncAction[]> {
    const queue = await getQueue();
    return queue.filter((q) => q.status === 'failed');
  },

  /**
   * Retry a specific failed action.
   */
  async retryAction(actionId: string): Promise<boolean> {
    const queue = await getQueue();
    const action = queue.find((q) => q.id === actionId);
    if (!action || action.status !== 'failed') return false;
    action.status = 'pending';
    action.retries = 0;
    action.error = undefined;
    await saveQueue(queue);
    if (navigator.onLine) this.processQueue();
    return true;
  },

  /**
   * Remove a specific action from the queue.
   */
  async removeAction(actionId: string): Promise<void> {
    const queue = await getQueue();
    const filtered = queue.filter((q) => q.id !== actionId);
    await saveQueue(filtered);
    await updateStatus({ pendingCount: filtered.filter((q) => q.status === 'pending').length });
  },

  /**
   * Clear the entire queue.
   */
  async clearQueue(): Promise<void> {
    await saveQueue([]);
    await updateStatus({ pendingCount: 0 });
  },

  /**
   * Register online/offline listeners to auto-process queue.
   */
  registerConnectivityListeners(): () => void {
    const handleOnline = () => {
      updateStatus({ isOnline: true });
      this.processQueue();
    };
    const handleOffline = () => {
      updateStatus({ isOnline: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },

  /**
   * Listen for SW sync completion messages.
   */
  onSyncComplete(callback: (data: { remaining: number; total: number }) => void): () => void {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        callback({ remaining: event.data.remaining, total: event.data.total });
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  },
};
