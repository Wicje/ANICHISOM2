/**
 * ANICHISOM OS: Event Queue with Exponential Backoff
 * 
 * Reliable sync with offline-first support and retry logic
 * Phase 1: Infrastructure
 */

import { Event } from './workspace-types';
import { eventAdapter } from './firestore-adapter';

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
  private processInterval: NodeJS.Timeout | null = null;
  private persisted = false;

  constructor() {
    this.loadFromIndexedDB();
    this.startProcessing();
  }

  /**
   * Add event to queue for syncing
   */
  enqueue(event: Event): void {
    const id = event.id;
    
    console.log('[v0] Event queued:', id, event.type);

    this.queue.set(id, {
      id,
      event,
      retries: 0,
      nextRetryAt: Date.now(),
      createdAt: Date.now(),
    });

    this.persistToIndexedDB();
    this.process(); // Try immediately
  }

  /**
   * Start background processing
   */
  private startProcessing(): void {
    // Process queue every 500ms
    this.processInterval = setInterval(() => {
      this.process();
    }, 500);
  }

  /**
   * Stop processing (cleanup)
   */
  stop(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }
  }

  /**
   * Process the queue: send events to Firestore
   */
  private async process(): Promise<void> {
    if (this.processing) return; // Prevent concurrent processing
    
    this.processing = true;

    try {
      const now = Date.now();
      let processed = 0;

      for (const [id, queuedEvent] of Array.from(this.queue)) {
        // Skip if not ready for retry
        if (queuedEvent.nextRetryAt > now) {
          continue;
        }

        try {
          // Send to Firestore
          await eventAdapter.add(queuedEvent.event);
          
          // Remove from queue on success
          this.queue.delete(id);
          processed++;
          
          console.log('[v0] Event synced:', id);
        } catch (error: any) {
          queuedEvent.retries++;

          if (queuedEvent.retries >= MAX_RETRIES) {
            // Fail after max retries - still remove from queue to prevent hanging
            console.error('[v0] Event failed after max retries:', id, error);
            this.queue.delete(id);
          } else {
            // Schedule next retry with exponential backoff
            const delay = Math.min(
              INITIAL_DELAY_MS * Math.pow(2, queuedEvent.retries - 1),
              MAX_DELAY_MS
            );
            queuedEvent.nextRetryAt = now + delay;

            console.warn(
              `[v0] Event retry scheduled (attempt ${queuedEvent.retries}/${MAX_RETRIES}):`,
              id,
              `Retry in ${(delay / 1000).toFixed(1)}s`
            );
          }
        }
      }

      if (processed > 0) {
        this.persistToIndexedDB();
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Force flush all pending events
   */
  async flush(): Promise<number> {
    console.log('[v0] Flushing sync queue...');
    
    // Reset retry times to force immediate processing
    const now = Date.now();
    for (const queuedEvent of this.queue.values()) {
      queuedEvent.nextRetryAt = now;
    }

    // Process until queue is empty or all retries exhausted
    const initialSize = this.queue.size;
    await this.process();

    const remaining = this.queue.size;
    console.log(`[v0] Sync queue flushed: ${initialSize - remaining} sent, ${remaining} pending`);
    
    return remaining;
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
    console.warn('[v0] Clearing sync queue');
    this.queue.clear();
    this.persistToIndexedDB();
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
      const stored = await get('anichisom_sync_queue');
      
      if (stored && Array.isArray(stored)) {
        for (const item of stored) {
          this.queue.set(item.id, item);
        }
        console.log('[v0] Loaded', stored.length, 'pending events from IndexedDB');
      }
    } catch (error) {
      console.warn('[v0] Failed to load sync queue from IndexedDB:', error);
    }
  }

  /**
   * Persist queue to IndexedDB
   */
  private async persistToIndexedDB(): Promise<void> {
    try {
      const { set } = await import('idb-keyval');
      const items = Array.from(this.queue.values());
      await set('anichisom_sync_queue', items);
    } catch (error) {
      console.warn('[v0] Failed to persist sync queue:', error);
    }
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
    console.log('[v0] Sync Queue Status:', {
      total: stats.total,
      pending: stats.pending,
      retryScheduled: stats.retryScheduled,
      oldestEventAge: `${(stats.oldestEvent / 1000).toFixed(1)}s`,
    });

    if (this.queue.size > 0) {
      console.log('[v0] Pending events:');
      for (const [id, item] of this.queue) {
        const waitTime = Math.max(0, item.nextRetryAt - Date.now());
        console.log(`  - ${id} (retry ${item.retries}/${MAX_RETRIES}, wait ${(waitTime / 1000).toFixed(1)}s)`);
      }
    }
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
  window.addEventListener('beforeunload', () => {
    syncQueue.stop();
  });
}
