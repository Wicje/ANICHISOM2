import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
}));

// Mock sync-queue
vi.mock('@/lib/sync-queue', () => ({
  syncQueue: {
    enqueue: vi.fn(),
  },
}));
