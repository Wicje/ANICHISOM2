import { describe, it, expect } from 'vitest';
import { pickLatestContext } from '@/lib/hydration';
import type { WorkContext } from '@/lib/context-kernel/graph';

function makeContext(
  projectId: string,
  updatedAt: string,
  extras: Partial<WorkContext> = {}
): WorkContext {
  return {
    id: `ctx_${projectId}`,
    projectId,
    projectName: `Project ${projectId}`,
    updatedAt,
    deviceId: 'device-1',
    browserTabs: [],
    tasks: [],
    ...extras,
  };
}

describe('Hydration Mapping — pickLatestContext', () => {
  it('accepts a single valid WorkContext', () => {
    const ctx = makeContext('a', '2026-01-01T00:00:00Z');
    expect(pickLatestContext(ctx)?.projectId).toBe('a');
  });

  it('rejects malformed payloads', () => {
    expect(pickLatestContext(null)).toBeNull();
    expect(pickLatestContext(undefined)).toBeNull();
    expect(pickLatestContext('nope')).toBeNull();
    expect(pickLatestContext({ foo: 1 })).toBeNull();
    // missing browserTabs array
    expect(pickLatestContext({ projectId: 'a', updatedAt: 'x' })).toBeNull();
  });

  it('selects the freshest context from a ContextGraph shape', () => {
    const graph = {
      contexts: {
        a: makeContext('a', '2026-01-01T00:00:00Z'),
        b: makeContext('b', '2026-03-01T00:00:00Z'),
        c: makeContext('c', '2026-02-01T00:00:00Z'),
      },
    };
    expect(pickLatestContext(graph)?.projectId).toBe('b');
  });

  it('ignores invalid entries inside a graph', () => {
    const graph = {
      contexts: {
        good: makeContext('good', '2026-01-01T00:00:00Z'),
        bad: { projectId: 42 },
        alsoBad: null,
      },
    };
    expect(pickLatestContext(graph)?.projectId).toBe('good');
  });

  it('handles legacy array-of-checkpoints shape', () => {
    const arr = [
      makeContext('old', '2025-12-01T00:00:00Z'),
      makeContext('new', '2026-05-01T00:00:00Z'),
    ];
    expect(pickLatestContext(arr)?.projectId).toBe('new');
  });

  it('returns null when no candidates are valid', () => {
    expect(pickLatestContext({ contexts: { x: 'junk' } })).toBeNull();
    expect(pickLatestContext(['junk', 3])).toBeNull();
  });
});
