import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock idb-keyval with in-memory store
const idbStore = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(idbStore.get(key))),
  set: vi.fn((key: string, value: unknown) => { idbStore.set(key, value); return Promise.resolve(); }),
  del: vi.fn((key: string) => { idbStore.delete(key); return Promise.resolve(); }),
  clear: vi.fn(() => { idbStore.clear(); return Promise.resolve(); }),
}));

// Mock sync-queue
vi.mock('@/lib/sync-queue', () => ({
  syncQueue: {
    enqueue: vi.fn(),
  },
}));
