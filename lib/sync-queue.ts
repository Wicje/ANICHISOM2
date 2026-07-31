/**
 * ContinuaOS: Event Queue with Exponential Backoff
 * 
 * Reliable sync with offline-first support and retry logic
 * Phase 1: Infrastructure
 */

import { Event } from './workspace-types';
import { eventAdapter } from './supabase-adapter';

interface QueuedEvent {
  id: string;
  event: Event;
  retries: number;
  nextRetryAt: number;
  createdAt: number;
}

const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 1000; // 1 second
const MAX_DELAY_MS = 60000; // 1 minute
const PERSIST_BATCH_SIZE = 5;
const PERSIST_DEBOUNCE_MS = 500;

/**
 * SyncQueue manages reliable event delivery with exponential backoff
 * 
 * Features:
 * - Offline-first: queues events while offline
 * - Auto-retry: exponential backoff (1s, 2s, 4s, 8s, 16s, 60s max)
 * - Persistent: survives page refresh via IndexedDB
 * - Batching: flushes multiple events in one request
 */
export class SyncQueue {
  private queue: Map<string, QueuedEvent> = new Map();
  private processing = false;
  private timeoutId: NodeJS.Timeout | null = null;
  private persistTimeoutId: NodeJS.Timeout | null = null;
  private pendingPersistMutations = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadFromIndexedDB();
    }
  }

  /**
   * Add event to queue for syncing
   */
  enqueue(event: Event): void {
    const id = event.id;

    // Implement queue size limit (max 1000 events)
    if (this.queue.size >= 1000) {
      const oldestId = Array.from(this.queue.keys())[0];
      if (oldestId) {
        this.queue.delete(oldestId);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('os:sync-dropped', {
            detail: { count: 1, lastDroppedId: oldestId }
          }));
        }
      }
    }

    this.queue.set(id, {
      id,
      event,
      retries: 0,
      nextRetryAt: Date.now(),
      createdAt: Date.now(),
    });

    this.schedulePersist();
    this.scheduleProcess(0); // process immediately
  }

  /**
   * Trigger processing using adaptive delay instead of polling
   */
  private triggerProcessing(): void {
    if (this.processing) return;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.queue.size === 0) return;

    const now = Date.now();
    let nextRunDelay = -1;

    for (const queuedEvent of this.queue.values()) {
      if (queuedEvent.nextRetryAt <= now) {
        nextRunDelay = 0;
        break;
      } else {
        const delay = queuedEvent.nextRetryAt - now;
        if (nextRunDelay === -1 || delay < nextRunDelay) {
          nextRunDelay = delay;
        }
      }
    }

    if (nextRunDelay === 0) {
      this.process();
    } else if (nextRunDelay > 0) {
      this.timeoutId = setTimeout(() => {
        this.process();
      }, nextRunDelay);
    }
  }

  /**
   * Stop processing (cleanup)
   */
  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.persistTimeoutId) {
      clearTimeout(this.persistTimeoutId);
      this.persistTimeoutId = null;
    }
  }

  /**
   * Process the queue: send events to Firestore
   */
  private async process(): Promise<void> {
    if (this.processing) return;
    
    this.processing = true;

    try {
      const now = Date.now();
      let processed = 0;

      for (const [id, queuedEvent] of Array.from(this.queue)) {
        if (queuedEvent.nextRetryAt > now) {
          continue;
        }

        try {
          await eventAdapter.add(queuedEvent.event);
          this.queue.delete(id);
          processed++;
        } catch (error: unknown) {
          queuedEvent.retries++;

          if (queuedEvent.retries >= MAX_RETRIES) {
            this.queue.delete(id);
          } else {
            const delay = Math.min(
              INITIAL_DELAY_MS * Math.pow(2, queuedEvent.retries - 1),
              MAX_DELAY_MS
            );
            queuedEvent.nextRetryAt = now + delay;
          }
        }
      }

      if (processed > 0) {
        this.schedulePersist(true);
      }
    } finally {
      this.processing = false;
      this.triggerProcessing();
    }
  }

  /**
   * Force flush all pending events
   */
  async flush(): Promise<number> {
    const now = Date.now();
    for (const queuedEvent of this.queue.values()) {
      queuedEvent.nextRetryAt = now;
    }

    await this.process();
    return this.queue.size;
  }

  /**
   * Get pending events (for debugging)
   */
  getPending(): QueuedEvent[] {
    return Array.from(this.queue.values());
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.size;
  }

  /**
   * Clear queue (use with caution)
   */
  clear(): void {
    this.queue.clear();
    this.schedulePersist(true);
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  // ============================================================================
  // PERSISTENCE (IndexedDB)
  // ============================================================================

  /**
   * Load queue from IndexedDB on startup
   */
  private async loadFromIndexedDB(): Promise<void> {
    try {
      const { get } = await import('idb-keyval');
      const stored = await get('continuaos_sync_queue');
      
      if (stored && Array.isArray(stored)) {
        for (const item of stored) {
          this.queue.set(item.id, item);
        }
      }
      this.triggerProcessing();
    } catch (error) {
      // Silently fail if IndexedDB not available
    }
  }

  /**
   * Persist queue to IndexedDB
   */
  private async persistToIndexedDB(): Promise<void> {
    try {
      if (this.persistTimeoutId) {
        clearTimeout(this.persistTimeoutId);
        this.persistTimeoutId = null;
      }
      this.pendingPersistMutations = 0;

      const { set } = await import('idb-keyval');
      const items = Array.from(this.queue.values());
      await set('continuaos_sync_queue', items);
    } catch (error) {
      // Silently fail if IndexedDB not available
    }
  }

  /**
   * Persist after a small batch or debounce window to avoid writing IndexedDB
   * for every high-frequency event.
   */
  private schedulePersist(force = false): void {
    this.pendingPersistMutations++;

    if (force || this.pendingPersistMutations >= PERSIST_BATCH_SIZE) {
      void this.persistToIndexedDB();
      return;
    }

    if (this.persistTimeoutId) return;

    this.persistTimeoutId = setTimeout(() => {
      void this.persistToIndexedDB();
    }, PERSIST_DEBOUNCE_MS);
  }

  // ============================================================================
  // STATISTICS & DEBUGGING
  // ============================================================================

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    pending: number;
    retryScheduled: number;
    oldestEvent: number; // Age in ms
  } {
    const now = Date.now();
    let oldestEvent = 0;

    let retryScheduled = 0;
    for (const item of this.queue.values()) {
      if (item.nextRetryAt > now) {
        retryScheduled++;
      }
      oldestEvent = Math.max(oldestEvent, now - item.createdAt);
    }

    return {
      total: this.queue.size,
      pending: this.queue.size - retryScheduled,
      retryScheduled,
      oldestEvent,
    };
  }

  /**
   * Log queue status (for debugging)
   */
  logStatus(): void {
    const stats = this.getStats();
    // Debug method for optional use - logging removed for production
  }
}

/**
 * Global singleton instance
 */
export const syncQueue = new SyncQueue();

/**
 * Hook for cleanup on page unload
 */
if (typeof window !== 'undefined') {
  const cleanup = () => {
    syncQueue.stop();
  };
  
  window.addEventListener('beforeunload', cleanup);
  window.addEventListener('unload', cleanup);
  
  // Prevent listener accumulation if module reloads
  if ((window as any).__continuaos_cleanup) {
    window.removeEventListener('beforeunload', (window as any).__continuaos_cleanup);
    window.removeEventListener('unload', (window as any).__continuaos_cleanup);
  }
  (window as any).__continuaos_cleanup = cleanup;
}
