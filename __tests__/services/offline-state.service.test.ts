/**
 * Tests for Offline State Service — snapshot persistence and restore.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OfflineStateService } from '@/lib/services/offline-state.service';

// Mock idb-keyval
const mockStore = new Map<string, any>();
vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(mockStore.get(key))),
  set: vi.fn((key: string, value: any) => { mockStore.set(key, value); return Promise.resolve(); }),
  del: vi.fn((key: string) => { mockStore.delete(key); return Promise.resolve(); }),
}));

beforeEach(() => {
  mockStore.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OfflineStateService', () => {
  const sampleSnapshot = {
    auth: { currentUser: { uid: 'user-1', email: 'test@test.com' } },
    theme: { wallpaper: '', themeColor: '#6366f1', fontFamily: 'system', screenShader: '', performanceMode: 'balanced' },
    workspace: { workspaceMode: 'personal', workspaceId: 'ws-1', installedApps: ['browser'], recentApps: ['browser'] },
    browser: { pinnedApps: [], tabs: [] },
    campaign: { boards: [] },
    file: { currentSource: 'opfs', currentPath: '/', connectedSources: ['opfs'] },
  };

  it('should save and load a snapshot', async () => {
    await OfflineStateService.saveSnapshotImmediate(sampleSnapshot);
    const loaded = await OfflineStateService.loadSnapshot();
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(1);
    expect(loaded!.auth.currentUser.uid).toBe('user-1');
    expect(loaded!.theme.themeColor).toBe('#6366f1');
  });

  it('should return null when no snapshot exists', async () => {
    const loaded = await OfflineStateService.loadSnapshot();
    expect(loaded).toBeNull();
  });

  it('should return null for stale snapshots (>24h)', async () => {
    vi.useFakeTimers();
    await OfflineStateService.saveSnapshotImmediate(sampleSnapshot);
    vi.advanceTimersByTime(25 * 60 * 60 * 1000);
    const loaded = await OfflineStateService.loadSnapshot();
    expect(loaded).toBeNull();
    vi.useRealTimers();
  });

  it('should clear snapshot', async () => {
    await OfflineStateService.saveSnapshotImmediate(sampleSnapshot);
    expect(await OfflineStateService.hasFreshSnapshot()).toBe(true);
    await OfflineStateService.clearSnapshot();
    expect(await OfflineStateService.hasFreshSnapshot()).toBe(false);
  });

  it('should report hasFreshSnapshot correctly', async () => {
    expect(await OfflineStateService.hasFreshSnapshot()).toBe(false);
    await OfflineStateService.saveSnapshotImmediate(sampleSnapshot);
    expect(await OfflineStateService.hasFreshSnapshot()).toBe(true);
  });

  it('should get snapshot age', async () => {
    expect(await OfflineStateService.getSnapshotAge()).toBeNull();
    await OfflineStateService.saveSnapshotImmediate(sampleSnapshot);
    const age = await OfflineStateService.getSnapshotAge();
    expect(age).toBeGreaterThanOrEqual(0);
    expect(age).toBeLessThan(1000);
  });

  it('should debounce saves', async () => {
    vi.useFakeTimers();

    // First debounced save — queues a write with 2000ms debounce
    OfflineStateService.saveSnapshot(sampleSnapshot);

    // Advance 1000ms — debounce hasn't flushed yet
    vi.advanceTimersByTime(1000);
    const mid = await OfflineStateService.loadSnapshot();
    expect(mid).toBeNull(); // Not written yet

    // Second debounced save — resets the timer
    OfflineStateService.saveSnapshot({
      ...sampleSnapshot,
      theme: { ...sampleSnapshot.theme, themeColor: '#ef4444' },
    });

    // Advance another 1000ms (total 2000ms from first save) — timer was reset, still not flushed
    vi.advanceTimersByTime(1000);
    const mid2 = await OfflineStateService.loadSnapshot();
    expect(mid2).toBeNull(); // Still not written (timer was reset)

    // Advance 2000ms more — this time the debounce flushes
    vi.advanceTimersByTime(2000);
    const after = await OfflineStateService.loadSnapshot();
    expect(after).not.toBeNull();
    expect(after!.theme.themeColor).toBe('#ef4444'); // Second save won

    vi.useRealTimers();
  });

  it('should register beforeunload handler', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const unregister = OfflineStateService.registerBeforeUnload(() => sampleSnapshot);

    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('pagehide', expect.any(Function));

    unregister();

    expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pagehide', expect.any(Function));
  });
});
