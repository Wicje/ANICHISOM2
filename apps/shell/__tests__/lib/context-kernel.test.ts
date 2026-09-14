import { describe, it, expect, beforeEach } from 'vitest';
import {
  createVectorClock,
  incrementVectorClock,
  mergeVectorClocks,
  compareVectorClocks,
  resolveVectorClockConflict,
  computeDeltaOperations,
  applyDeltaOperations,
  createContextDelta,
  applyContextDelta,
  MemoryContextRepository,
  createContextDriver,
  getContextRepository,
  setContextRepository,
  resetContextRepository,
  type ContextRecord,
} from '@/lib/context-kernel';

describe('Context Kernel — Vector Clocks & Conflict Resolution', () => {
  it('creates and increments vector clocks correctly', () => {
    let clock = createVectorClock('device-A', 1);
    expect(clock).toEqual({ 'device-A': 1 });

    clock = incrementVectorClock(clock, 'device-A');
    expect(clock).toEqual({ 'device-A': 2 });

    clock = incrementVectorClock(clock, 'device-B');
    expect(clock).toEqual({ 'device-A': 2, 'device-B': 1 });
  });

  it('merges vector clocks by pairwise maximum', () => {
    const clockA = { 'device-A': 3, 'device-B': 1 };
    const clockB = { 'device-A': 2, 'device-B': 4, 'device-C': 1 };

    const merged = mergeVectorClocks(clockA, clockB);
    expect(merged).toEqual({
      'device-A': 3,
      'device-B': 4,
      'device-C': 1,
    });
  });

  it('detects causal relationships and concurrency', () => {
    const clock1 = { 'device-A': 1, 'device-B': 1 };
    const clock2 = { 'device-A': 2, 'device-B': 1 };
    const clock3 = { 'device-A': 1, 'device-B': 2 };

    expect(compareVectorClocks(clock1, clock2)).toBe('before');
    expect(compareVectorClocks(clock2, clock1)).toBe('after');
    expect(compareVectorClocks(clock2, clock3)).toBe('concurrent');
    expect(compareVectorClocks(clock1, clock1)).toBe('equal');
  });

  it('resolves conflicts when one clock dominates', () => {
    const local: ContextRecord = {
      id: 'user-1:theme',
      userId: 'user-1',
      domain: 'theme',
      data: { dark: true },
      version: 2,
      deviceId: 'device-A',
      updatedAt: new Date().toISOString(),
      schemaVersion: '1.0.0',
      deleted: false,
      vectorClock: { 'device-A': 2, 'device-B': 1 },
    };

    const remote: ContextRecord = {
      id: 'user-1:theme',
      userId: 'user-1',
      domain: 'theme',
      data: { dark: false },
      version: 1,
      deviceId: 'device-B',
      updatedAt: new Date().toISOString(),
      schemaVersion: '1.0.0',
      deleted: false,
      vectorClock: { 'device-A': 1, 'device-B': 1 },
    };

    const resolution = resolveVectorClockConflict(local, remote);
    expect(resolution.source).toBe('local');
    expect(resolution.data).toEqual({ dark: true });
    expect(resolution.hadConflict).toBe(false);
  });

  it('merges structural properties on concurrent edits', () => {
    const local: ContextRecord = {
      id: 'user-1:settings',
      userId: 'user-1',
      domain: 'settings',
      data: { sound: 'mechanical', volume: 80 },
      version: 2,
      deviceId: 'device-A',
      updatedAt: new Date().toISOString(),
      schemaVersion: '1.0.0',
      deleted: false,
      vectorClock: { 'device-A': 2, 'device-B': 1 },
    };

    const remote: ContextRecord = {
      id: 'user-1:settings',
      userId: 'user-1',
      domain: 'settings',
      data: { sound: 'glass', notifications: true },
      version: 2,
      deviceId: 'device-B',
      updatedAt: new Date().toISOString(),
      schemaVersion: '1.0.0',
      deleted: false,
      vectorClock: { 'device-A': 1, 'device-B': 2 },
    };

    const resolution = resolveVectorClockConflict(local, remote);
    expect(resolution.hadConflict).toBe(true);
    expect(resolution.data).toEqual({
      sound: 'glass',
      volume: 80,
      notifications: true,
    });
  });

  it('respects tombstone deletions', () => {
    const active: ContextRecord = {
      id: 'user-1:notes',
      userId: 'user-1',
      domain: 'notes',
      data: { text: 'hello' },
      version: 1,
      deviceId: 'device-A',
      updatedAt: '2026-08-01T10:00:00Z',
      schemaVersion: '1.0.0',
      deleted: false,
      vectorClock: { 'device-A': 1 },
    };

    const tombstone: ContextRecord = {
      id: 'user-1:notes',
      userId: 'user-1',
      domain: 'notes',
      data: null,
      version: 2,
      deviceId: 'device-B',
      updatedAt: '2026-08-01T11:00:00Z',
      schemaVersion: '1.0.0',
      deleted: true,
      vectorClock: { 'device-A': 1, 'device-B': 1 },
      tombstone: {
        domain: 'notes',
        deletedAt: '2026-08-01T11:00:00Z',
        vectorClock: { 'device-A': 1, 'device-B': 1 },
        deletedByDeviceId: 'device-B',
      },
    };

    const resolution = resolveVectorClockConflict(active, tombstone);
    expect(resolution.source).toBe('remote');
    expect(resolution.data).toBeNull();
  });
});

describe('Context Kernel — Delta Synchronization', () => {
  it('computes fine-grained delta operations on objects', () => {
    const base = { theme: 'dark', sound: 'glass', dock: { size: 48, pinned: ['browser'] } };
    const current = { theme: 'dark', sound: 'mechanical', dock: { size: 56, pinned: ['browser', 'terminal'] } };

    const ops = computeDeltaOperations(base, current);

    expect(ops.some((op) => op.path.join('.') === 'sound' && op.value === 'mechanical')).toBe(true);
    expect(ops.some((op) => op.path.join('.') === 'dock.size' && op.value === 56)).toBe(true);
  });

  it('applies delta operations correctly', () => {
    const base = { a: 1, nested: { b: 2 } };
    const operations = [
      { op: 'set' as const, path: ['a'], value: 10 },
      { op: 'set' as const, path: ['nested', 'c'], value: 3 },
    ];

    const result = applyDeltaOperations(base, operations);
    expect(result).toEqual({ a: 10, nested: { b: 2, c: 3 } });
  });

  it('creates and applies a ContextDelta patch', () => {
    const baseRecord: ContextRecord = {
      id: 'user-1:workspace',
      userId: 'user-1',
      domain: 'workspace',
      data: { openWindows: ['w1'] },
      version: 3,
      deviceId: 'device-A',
      updatedAt: new Date().toISOString(),
      schemaVersion: '1.0.0',
      deleted: false,
      vectorClock: { 'device-A': 3 },
    };

    const delta = createContextDelta(
      baseRecord,
      'workspace',
      { openWindows: ['w1', 'w2'], active: 'w2' },
      'device-B'
    );

    expect(delta.baseVersion).toBe(3);
    expect(delta.targetVersion).toBe(4);
    expect(delta.vectorClock).toEqual({ 'device-A': 3, 'device-B': 1 });

    const updated = applyContextDelta(baseRecord, delta);
    expect(updated.data).toEqual({ openWindows: ['w1', 'w2'], active: 'w2' });
    expect(updated.version).toBe(4);
  });
});

describe('Context Kernel — Pluggable Storage Drivers', () => {
  let memoryRepo: MemoryContextRepository;

  beforeEach(() => {
    resetContextRepository();
    memoryRepo = new MemoryContextRepository();
  });

  it('saves and retrieves records with vector clocks', async () => {
    const res = await memoryRepo.save({
      userId: 'user-99',
      domain: 'browser',
      data: { tabs: ['https://continua.os'] },
      version: 1,
      deviceId: 'laptop-1',
    });

    expect(res.version).toBe(1);

    const record = await memoryRepo.get('user-99', 'browser');
    expect(record).not.toBeNull();
    expect(record?.data).toEqual({ tabs: ['https://continua.os'] });
    expect(record?.vectorClock).toEqual({ 'laptop-1': 1 });
  });

  it('pulls filtered domain updates', async () => {
    await memoryRepo.save({ userId: 'u1', domain: 'theme', data: { mode: 'dark' }, version: 1, deviceId: 'd1' });
    await memoryRepo.save({ userId: 'u1', domain: 'notes', data: { count: 5 }, version: 2, deviceId: 'd1' });

    const pulled = await memoryRepo.pull('u1', { domains: ['notes'] });
    expect(pulled.domains.length).toBe(1);
    expect(pulled.domains[0]?.domain).toBe('notes');
  });

  it('creates and restores from snapshot', async () => {
    await memoryRepo.save({ userId: 'u1', domain: 'theme', data: { mode: 'cyber' }, version: 1, deviceId: 'd1' });
    await memoryRepo.save({ userId: 'u1', domain: 'dock', data: { size: 64 }, version: 1, deviceId: 'd1' });

    const snap = await memoryRepo.createSnapshot('u1', {});
    expect(snap.domains.length).toBe(2);

    // Modify state
    await memoryRepo.save({ userId: 'u1', domain: 'theme', data: { mode: 'light' }, version: 2, deviceId: 'd1' });

    // Restore from snapshot
    const result = await memoryRepo.restoreFromSnapshot('u1', { snapshotId: snap.id });
    expect(result.restored).toBe(2);

    const restored = await memoryRepo.get('u1', 'theme');
    expect(restored?.data).toEqual({ mode: 'cyber' });
  });

  it('swaps drivers dynamically in Registry', () => {
    const memory = createContextDriver('memory');
    setContextRepository(memory);

    expect(getContextRepository()).toBe(memory);

    resetContextRepository();
    expect(getContextRepository()).not.toBe(memory);
  });
});
