/**
 * Zustand persistence factory — eliminates duplicated IDB persist/hydrate
 * boilerplate across 11+ stores.
 *
 * Usage:
 *   import { createPersistedStore } from '@/lib/stores/persisted-store';
 *
 *   const useMyStore = createPersistedStore('my-store', { count: 0 }, (set, get) => ({
 *     increment: () => set({ count: get().count + 1 }),
 *   }));
 */

import { create, StateCreator, StoreApi, UseBoundStore } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { mark, measure } from '@/lib/perf';

const STORAGE_PREFIX = 'continuaos-';
const DEBOUNCE_MS = 2000;

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Schedule a debounced write to IndexedDB.
 * Each store key gets its own timer — changing store A doesn't reset store B's timer.
 */
function schedulePersist<T>(key: string, data: T): void {
  const existing = debounceTimers.get(key);
  if (existing) clearTimeout(existing);

  debounceTimers.set(key, setTimeout(() => {
    idbSet(`${STORAGE_PREFIX}${key}`, data).catch((e: unknown) => {
      console.warn(`[PersistedStore:${key}] Failed to persist:`, e);
    });
    debounceTimers.delete(key);
  }, DEBOUNCE_MS));
}

/**
 * Create a Zustand store with automatic IndexedDB persistence.
 *
 * @param storageKey - Short key for IDB (e.g. 'brand-state'). Stored as 'continuaos-brand-state'.
 * @param initialState - Initial state values to persist.
 * @param creator - Zustand state creator (set, get, api) => state additions.
 * @returns A Zustand store with an added `hydrate()` method.
 */
export function createPersistedStore<T extends object>(
  storageKey: string,
  initialState: T,
  creator: StateCreator<T & { hydrate: () => Promise<void> }, [], [], T>
): UseBoundStore<StoreApi<T & { hydrate: () => Promise<void> }>> {
  // Build full state with hydrate
  const fullCreator: StateCreator<T & { hydrate: () => Promise<void> }, [], [], T> = (set, get, api) => {
    const userState = creator(
      set as any,
      get as any,
      api as any,
    );

    // Auto-persist on every state change (debounced)
    const originalSet = set;
    const persistingSet: typeof set = (...args: any[]) => {
      (originalSet as any)(...args);
      const state = (api as StoreApi<T & { hydrate: () => Promise<void> }>).getState();
      const { hydrate: _, ...persistable } = state as any;
      schedulePersist(storageKey, persistable);
    };

    // Re-create user state with persisting setter
    const stateWithPersist = creator(
      persistingSet as any,
      get as any,
      api as any,
    );

    return {
      ...stateWithPersist,
      hydrate: async () => {
        mark(`store:hydrate:${storageKey}`);
        try {
          const data = await idbGet<Partial<T>>(`${STORAGE_PREFIX}${storageKey}`);
          if (data) {
            set(data as any);
          }
        } catch (e) {
          console.warn(`[PersistedStore:${storageKey}] Failed to hydrate:`, e);
        }
        measure(`store:hydrate:${storageKey}`);
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
  storageKey: string,
  persistKeys: (keyof T)[]
): void {
  const fullKey = `${STORAGE_PREFIX}${storageKey}`;

  // Subscribe to changes and debounce persist
  store.subscribe((state, prevState) => {
    // Only persist if a persisted key changed
    const changed = persistKeys.some(k => state[k] !== prevState[k]);
    if (!changed) return;

    const data: Partial<T> = {};
    for (const k of persistKeys) {
      (data as any)[k] = state[k];
    }
    schedulePersist(storageKey, data);
  });

  // Hydrate function
  (store as any).hydrate = async () => {
    mark(`store:hydrate:${storageKey}`);
    try {
      const data = await idbGet<Partial<T>>(fullKey);
      if (data) {
        store.setState(data);
      }
    } catch (e) {
      console.warn(`[PersistedStore:${storageKey}] Failed to hydrate:`, e);
    }
    measure(`store:hydrate:${storageKey}`);
  };
}
