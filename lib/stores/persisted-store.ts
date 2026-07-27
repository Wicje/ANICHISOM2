/**
 * Zustand persistence factory — Context Layer backed.
 *
 * All persistence flows through readDomain/writeDomain from context-layer.ts.
 * This is the ONLY IDB path for Zustand stores. No direct idb-keyval imports.
 *
 * Usage:
 *   import { createPersistedStore } from '@/lib/stores/persisted-store';
 *
 *   const useMyStore = createPersistedStore('my-domain', { count: 0 }, (set, get) => ({
 *     increment: () => set({ count: get().count + 1 }),
 *   }));
 */

import { create, StateCreator, StoreApi, UseBoundStore } from 'zustand';
import { readDomain, writeDomain } from '@/lib/context-layer';
import { mark, measure } from '@/lib/perf';

const DEBOUNCE_MS = 2000;

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingWrites = new Map<string, any>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    pendingWrites.forEach((data, domain) => {
      // Fire-and-forget IDB write for anything pending (will queue the transaction sync)
      writeDomain(domain, data).catch(() => {});
    });
  });
}

/**
 * Schedule a debounced write through the Context Layer.
 */
function schedulePersist<T>(domain: string, data: T): void {
  pendingWrites.set(domain, data);

  const existing = debounceTimers.get(domain);
  if (existing) clearTimeout(existing);

  debounceTimers.set(domain, setTimeout(() => {
    const latestData = pendingWrites.get(domain);
    if (latestData !== undefined) {
      writeDomain(domain, latestData).catch((e: unknown) => {
        console.warn(`[PersistedStore:${domain}] Failed to persist:`, e);
      });
      pendingWrites.delete(domain);
    }
    debounceTimers.delete(domain);
  }, DEBOUNCE_MS));
}

/**
 * Create a Zustand store with automatic Context Layer persistence.
 *
 * @param domain - Context domain name (e.g. 'theme', 'workspace', 'browser').
 *                 Stored via writeDomain → IDB key 'continuaos-{domain}'.
 * @param initialState - Initial state values.
 * @param creator - Zustand state creator (set, get, api) => state additions.
 * @returns A Zustand store with an added `hydrate()` method.
 */
export function createPersistedStore<T extends object>(
  domain: string,
  initialState: T,
  creator: StateCreator<T & { hydrate: () => Promise<void> }, [], [], T>
): UseBoundStore<StoreApi<T & { hydrate: () => Promise<void> }>> {
  const fullCreator: StateCreator<T & { hydrate: () => Promise<void> }, [], [], T> = (set, get, api) => {
    const originalSet = set;
    const persistingSet: typeof set = (...args: any[]) => {
      (originalSet as any)(...args);
      const state = (api as StoreApi<T & { hydrate: () => Promise<void> }>).getState();
      const { hydrate: _, ...persistable } = state as any;
      schedulePersist(domain, persistable);
    };

    const userState = creator(
      persistingSet as any,
      get as any,
      api as any,
    );

    return {
      ...userState,
      hydrate: async () => {
        mark(`store:hydrate:${domain}`);
        try {
          const data = await readDomain<Partial<T>>(domain);
          if (data) {
            set(data as any);
          }
        } catch (e) {
          console.warn(`[PersistedStore:${domain}] Failed to hydrate:`, e);
        }
        measure(`store:hydrate:${domain}`);
      },
    };
  };

  return create<T & { hydrate: () => Promise<void> }>()(fullCreator as any);
}

/**
 * Simpler approach: create a store normally, then wrap it with persistence.
 * Call `hydrate()` on mount, and `persist()` after state changes.
 */
export function withPersistence<T extends object>(
  store: UseBoundStore<StoreApi<T>>,
  domain: string,
  persistKeys: (keyof T)[]
): void {
  store.subscribe((state, prevState) => {
    const changed = persistKeys.some(k => state[k] !== prevState[k]);
    if (!changed) return;

    const data: Partial<T> = {};
    for (const k of persistKeys) {
      (data as any)[k] = state[k];
    }
    schedulePersist(domain, data);
  });

  (store as any).hydrate = async () => {
    mark(`store:hydrate:${domain}`);
    try {
      const data = await readDomain<Partial<T>>(domain);
      if (data) {
        store.setState(data);
      }
    } catch (e) {
      console.warn(`[PersistedStore:${domain}] Failed to hydrate:`, e);
    }
    measure(`store:hydrate:${domain}`);
  };
}
