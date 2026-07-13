/**
 * Tests for Background Sync Service — queue management and replay.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackgroundSyncService } from '@/lib/services/background-sync.service';

// Mock idb-keyval
const mockStore = new Map<string, any>();
vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(mockStore.get(key))),
  set: vi.fn((key: string, value: any) => { mockStore.set(key, value); return Promise.resolve(); }),
  del: vi.fn((key: string) => { mockStore.delete(key); return Promise.resolve(); }),
}));

beforeEach(() => {
  mockStore.clear();
  vi.restoreAllMocks();
  // Prevent auto-process on queue() by pretending we're offline
  Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
});

describe('BackgroundSyncService', () => {
  describe('Queue management', () => {
    it('should queue an action', async () => {
      const action = await BackgroundSyncService.queue({
        url: '/api/campaigns',
        method: 'POST',
        body: { name: 'Test Campaign' },
      });

      expect(action.id).toBeDefined();
      expect(action.status).toBe('pending');
      expect(action.retries).toBe(0);
      expect(action.method).toBe('POST');
    });

    it('should get pending actions', async () => {
      await BackgroundSyncService.queue({ url: '/api/a', method: 'POST' });
      await BackgroundSyncService.queue({ url: '/api/b', method: 'PUT' });

      const pending = await BackgroundSyncService.getPendingActions();
      expect(pending).toHaveLength(2);
    });

    it('should get status with correct pending count', async () => {
      await BackgroundSyncService.queue({ url: '/api/a', method: 'POST' });
      const status = await BackgroundSyncService.getStatus();
      expect(status.pendingCount).toBe(1);
    });

    it('should remove an action', async () => {
      const action = await BackgroundSyncService.queue({ url: '/api/a', method: 'POST' });
      const before = await BackgroundSyncService.getPendingActions();
      expect(before).toHaveLength(1);
      await BackgroundSyncService.removeAction(action.id);
      const after = await BackgroundSyncService.getPendingActions();
      expect(after).toHaveLength(0);
    });

    it('should clear the entire queue', async () => {
      await BackgroundSyncService.queue({ url: '/api/a', method: 'POST' });
      await BackgroundSyncService.queue({ url: '/api/b', method: 'PUT' });
      await BackgroundSyncService.clearQueue();
      const pending = await BackgroundSyncService.getPendingActions();
      expect(pending).toHaveLength(0);
    });
  });

  describe('Process queue', () => {
    it('should process pending actions successfully', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('OK', { status: 200 }));

      await BackgroundSyncService.queue({ url: '/api/test', method: 'POST', body: { x: 1 } });
      const result = await BackgroundSyncService.processQueue();
      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should retry on network failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      await BackgroundSyncService.queue({ url: '/api/test', method: 'POST' });
      await BackgroundSyncService.processQueue();

      const pending = await BackgroundSyncService.getPendingActions();
      expect(pending).toHaveLength(1);
      expect(pending[0]!.retries).toBe(1);
    });

    it('should mark as failed after max retries', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      await BackgroundSyncService.queue({ url: '/api/test', method: 'POST' });
      for (let i = 0; i < 5; i++) {
        await BackgroundSyncService.processQueue();
      }

      const failed = await BackgroundSyncService.getFailedActions();
      expect(failed).toHaveLength(1);
    });
  });

  describe('Retry and failed actions', () => {
    it('should retry a failed action', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Fail'));

      const action = await BackgroundSyncService.queue({ url: '/api/test', method: 'POST' });
      for (let i = 0; i < 5; i++) {
        await BackgroundSyncService.processQueue();
      }

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('OK', { status: 200 }));
      const retried = await BackgroundSyncService.retryAction(action.id);
      expect(retried).toBe(true);

      const pending = await BackgroundSyncService.getPendingActions();
      expect(pending).toHaveLength(1);
      expect(pending[0]!.retries).toBe(0);
    });

    it('should return false when retrying non-existent action', async () => {
      const result = await BackgroundSyncService.retryAction('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('Connectivity listeners', () => {
    it('should register and unregister listeners', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      const unregister = BackgroundSyncService.registerConnectivityListeners();

      expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      unregister();

      expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });
});
