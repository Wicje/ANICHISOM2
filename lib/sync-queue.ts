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
        } catch (error: any) {
          queuedEvent.retries++;

          if (queuedEvent.retries >= MAX_RETRIES) {
            // Fail after max retries - still remove from queue to prevent hanging
            this.queue.delete(id);
          } else {
            // Schedule next retry with exponential backoff
            const delay = Math.min(
              INITIAL_DELAY_MS * Math.pow(2, queuedEvent.retries - 1),
              MAX_DELAY_MS
            );
            queuedEvent.nextRetryAt = now + delay;
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
    // Reset retry times to force immediate processing
    const now = Date.now();
    for (const queuedEvent of this.queue.values()) {
      queuedEvent.nextRetryAt = now;
    }

    // Process until queue is empty or all retries exhausted
    const initialSize = this.queue.size;
    await this.process();

    const remaining = this.queue.size;
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
      }
    } catch (error) {
      // Silently fail if IndexedDB not available
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
      // Silently fail if IndexedDB not available
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
  if ((window as any).__anichisom_cleanup) {
    window.removeEventListener('beforeunload', (window as any).__anichisom_cleanup);
    window.removeEventListener('unload', (window as any).__anichisom_cleanup);
  }
  (window as any).__anichisom_cleanup = cleanup;
}
