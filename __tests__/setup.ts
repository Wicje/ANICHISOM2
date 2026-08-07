import '@testing-library/jest-dom';
import { vi } from 'vitest';

// jsdom does not expose localStorage on the global by default — many stores
// and libs (zustand persist, context-layer) access it at import time.
if (typeof window !== 'undefined' && !window.localStorage) {
  const createStorage = () => {
    let store: Record<string, string> = {};
    return {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { store = {}; },
      key: (i: number) => Object.keys(store)[i] ?? null,
      get length() { return Object.keys(store).length; },
    };
  };
  Object.defineProperty(window, 'localStorage', { value: createStorage(), configurable: true });
  Object.defineProperty(window, 'sessionStorage', { value: createStorage(), configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: window.localStorage, configurable: true });
  Object.defineProperty(globalThis, 'sessionStorage', { value: window.sessionStorage, configurable: true });
}

// Mock idb-keyval with in-memory store
const idbStore = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(idbStore.get(key))),
  set: vi.fn((key: string, value: unknown) => { idbStore.set(key, value); return Promise.resolve(); }),
  del: vi.fn((key: string) => { idbStore.delete(key); return Promise.resolve(); }),
  clear: vi.fn(() => { idbStore.clear(); return Promise.resolve(); }),
  keys: vi.fn(() => Promise.resolve([...idbStore.keys()])),
}));

// jsdom doesn't implement blob: object URLs — stub them for FS reads.
if (typeof URL.createObjectURL !== 'function') {
  const urls = new Map<string, Blob>();
  URL.createObjectURL = vi.fn((blob: Blob) => {
    const url = `blob:mock-${Math.random().toString(36).slice(2)}`;
    urls.set(url, blob);
    return url;
  });
  URL.revokeObjectURL = vi.fn((url: string) => { urls.delete(url); });
}

// Mock sync-queue
vi.mock('@/lib/sync-queue', () => ({
  syncQueue: {
    enqueue: vi.fn(),
  },
}));
