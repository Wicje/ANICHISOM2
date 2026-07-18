/**
 * ContinuaOS Context Layer
 * 
 * Central API for session state persistence and sync.
 * All stores read/write through this layer instead of direct IDB.
 * 
 * In Private mode: IDB only (fast, local)
 * In Agency mode: IDB + Supabase mirror (cross-device sync)
 */

import { get as idbGet, set as idbSet } from 'idb-keyval';
import { mark, measure } from '@/lib/perf';

const STORAGE_PREFIX = 'continuaos-';
const DEBOUNCE_MS = 2000;

type SyncMode = 'private' | 'agency';

interface ContextLayerConfig {
  mode: SyncMode;
  userId: string | null;
  deviceId: string;
}

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
let config: ContextLayerConfig = {
  mode: 'private',
  userId: null,
  deviceId: typeof crypto !== 'undefined' ? crypto.randomUUID().slice(0, 8) : 'unknown',
};

/** Configure the context layer */
export function configureContextLayer(cfg: Partial<ContextLayerConfig>): void {
  config = { ...config, ...cfg };
}

/** Get current config */
export function getContextLayerConfig(): Readonly<ContextLayerConfig> {
  return config;
}

/**
 * Read a domain from IDB (fast path).
 */
export async function readDomain<T>(domain: string): Promise<T | null> {
  mark(`ctx:read:${domain}`);
  try {
    const data = await idbGet<T>(`${STORAGE_PREFIX}${domain}`);
    measure(`ctx:read:${domain}`);
    return data ?? null;
  } catch (e) {
    console.warn(`[ContextLayer] Read failed for ${domain}:`, e);
    measure(`ctx:read:${domain}`);
    return null;
  }
}

/**
 * Write a domain to IDB (immediate) + schedule cloud sync.
 */
export async function writeDomain<T>(domain: string, data: T): Promise<void> {
  mark(`ctx:write:${domain}`);
  
  // Immediate IDB write
  try {
    await idbSet(`${STORAGE_PREFIX}${domain}`, data);
  } catch (e) {
    console.warn(`[ContextLayer] Write failed for ${domain}:`, e);
  }

  measure(`ctx:write:${domain}`);

  // Schedule cloud sync (debounced)
  if (config.mode === 'agency' && config.userId) {
    scheduleCloudSync(domain, data);
  }
}

/**
 * Read all domains at once (for boot hydration).
 */
export async function readAllDomains<T extends Record<string, unknown>>(
  domains: string[]
): Promise<Partial<T>> {
  mark('ctx:readAll');
  const result: Record<string, unknown> = {};
  
  const entries = await Promise.allSettled(
    domains.map(async (domain) => {
      const data = await idbGet(`${STORAGE_PREFIX}${domain}`);
      return { domain, data };
    })
  );

  for (const entry of entries) {
    if (entry.status === 'fulfilled' && entry.value.data) {
      result[entry.value.domain] = entry.value.data;
    }
  }

  measure('ctx:readAll');
  return result as Partial<T>;
}

/**
 * Write multiple domains at once (for context import).
 */
export async function writeAllDomains(domains: Record<string, unknown>): Promise<void> {
  mark('ctx:writeAll');
  
  await Promise.allSettled(
    Object.entries(domains).map(([domain, data]) =>
      idbSet(`${STORAGE_PREFIX}${domain}`, data)
    )
  );

  measure('ctx:writeAll');

  // Schedule cloud sync for all domains
  if (config.mode === 'agency' && config.userId) {
    for (const [domain, data] of Object.entries(domains)) {
      scheduleCloudSync(domain, data);
    }
  }
}

/**
 * Export the full context as a JSON-serializable object.
 */
export async function exportContext(): Promise<Record<string, unknown>> {
  const domains = [
    'theme', 'browser', 'workspace', 'books', 'brand', 'feedback',
    'photography', 'hardware', 'clothing', 'forensics', 'sidegigs',
    'devops', 'privacy', 'registry', 'campaign', 'onboarding',
  ];
  
  return readAllDomains(domains);
}

/**
 * Import a context (merge mode).
 */
export async function importContext(context: Record<string, unknown>): Promise<void> {
  await writeAllDomains(context);
}

// ─── Cloud Sync (debounced) ──────────────────────────────────────────

let syncInProgress = false;

async function scheduleCloudSync(domain: string, data: unknown): Promise<void> {
  // Debounce: if a sync is already scheduled for this domain, skip
  const key = `sync:${domain}`;
  const existing = debounceTimers.get(key);
  if (existing) clearTimeout(existing);

  debounceTimers.set(key, setTimeout(async () => {
    debounceTimers.delete(key);
    
    if (!config.userId || syncInProgress) return;
    
    try {
      const { pushDomain } = await import('@/lib/sync/context-sync');
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      
      // Read current version from IDB (stored alongside data)
      const versionKey = `${STORAGE_PREFIX}sync_version:${domain}`;
      const currentVersion = (await idbGet<number>(versionKey)) || 0;
      
      const newVersion = await pushDomain(config.userId!, domain, data, currentVersion, supabase);
      
      if (newVersion !== null) {
        await idbSet(versionKey, newVersion);
      }
    } catch (e) {
      // Non-fatal: cloud sync failed, local state is safe
      console.warn(`[ContextLayer] Cloud sync failed for ${domain}:`, e);
    }
  }, DEBOUNCE_MS));
}

/**
 * Pull all remote domains and merge with local.
 * Called during boot in Agency mode.
 */
export async function syncFromCloud(): Promise<{ pulled: number; conflicts: number }> {
  if (config.mode !== 'agency' || !config.userId) {
    return { pulled: 0, conflicts: 0 };
  }

  mark('ctx:cloudSync');
  syncInProgress = true;

  try {
    const { pullAllDomains } = await import('@/lib/sync/context-sync');
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();
    
    const remoteDomains = await pullAllDomains(config.userId, supabase);
    let pulled = 0;
    let conflicts = 0;

    for (const [domain, remote] of remoteDomains) {
      const localData = await idbGet(`${STORAGE_PREFIX}${domain}`);
      const localVersion = (await idbGet<number>(`${STORAGE_PREFIX}sync_version:${domain}`)) || 0;

      if (remote.version > localVersion) {
        // Remote is newer — apply
        await idbSet(`${STORAGE_PREFIX}${domain}`, remote.data);
        await idbSet(`${STORAGE_PREFIX}sync_version:${domain}`, remote.version);
        pulled++;
        conflicts++;
      } else if (localVersion === 0 && remote.version > 0) {
        // No local data — pull remote
        await idbSet(`${STORAGE_PREFIX}${domain}`, remote.data);
        await idbSet(`${STORAGE_PREFIX}sync_version:${domain}`, remote.version);
        pulled++;
      }
    }

    measure('ctx:cloudSync');
    return { pulled, conflicts };
  } catch (e) {
    console.warn('[ContextLayer] Cloud sync failed:', e);
    measure('ctx:cloudSync');
    return { pulled: 0, conflicts: 0 };
  } finally {
    syncInProgress = false;
  }
}
