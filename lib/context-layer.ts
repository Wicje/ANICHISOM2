/**
 * Continua Context Layer
 *
 * Central API for session state persistence and sync.
 * All stores read/write through this layer instead of direct IDB.
 *
 * Architecture:
 * - Local: IDB (fast path, always available)
 * - Cloud: API routes → Context Kernel → Supabase
 *
 * In Private mode: IDB only (fast, local)
 * In Agency mode: IDB + API mirror (cross-device sync)
 */

import { get as idbGet, set as idbSet, keys as idbKeys, del as idbDel } from 'idb-keyval';
import { mark, measure } from '@/lib/perf';

const STORAGE_PREFIX = 'continua-';
const SYNC_VERSION_PREFIX = 'continua-sync:';
const DEBOUNCE_MS = 2000;

type SyncMode = 'private' | 'agency';

interface ContextLayerConfig {
  mode: SyncMode;
  userId: string | null;
  deviceId: string;
}

function getPersistentDeviceId(): string {
  if (typeof window !== 'undefined') {
    let stored = localStorage.getItem('continuaos_device_id');
    if (!stored) {
      stored = typeof crypto !== 'undefined' ? crypto.randomUUID().slice(0, 8) : 'device-' + Math.random().toString(36).substring(2, 6);
      try { localStorage.setItem('continuaos_device_id', stored); } catch {}
    }
    return stored;
  }
  return 'unknown';
}

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
let config: ContextLayerConfig = {
  mode: 'private',
  userId: null,
  deviceId: getPersistentDeviceId(),
};

// ─── Offline Awareness ─────────────────────────────────────────

let _isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { _isOnline = true; });
  window.addEventListener('offline', () => { _isOnline = false; });
}

/** Whether the device is currently online. */
export function isOnline(): boolean {
  return _isOnline;
}

/** Get current sync status for UI display. */
export function getSyncStatus(): { online: boolean; mode: SyncMode; userId: string | null } {
  return { online: _isOnline, mode: config.mode, userId: config.userId };
}

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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('os:sync-error', {
        detail: { domain, error: String(e) }
      }));
    }
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
 * Export the full context as a JSON-serializable object (Issue 69: dynamic key scanning).
 */
export async function exportContext(): Promise<Record<string, unknown>> {
  try {
    const allKeys = await idbKeys();
    const domainKeys = (allKeys as string[])
      .filter((key) => typeof key === 'string' && key.startsWith(STORAGE_PREFIX) && !key.startsWith('continua-blob:'))
      .map((key) => key.slice(STORAGE_PREFIX.length));

    // Fallback to core domains if IDB is empty
    const domainsToExport = Array.from(
      new Set([
        ...domainKeys,
        'theme', 'browser', 'workspace', 'books', 'brand', 'feedback',
        'photography', 'hardware', 'clothing', 'forensics', 'sidegigs',
        'devops', 'privacy', 'registry', 'campaign', 'onboarding', 'focus', 'notifications', 'moodboard'
      ])
    );

    return readAllDomains(domainsToExport);
  } catch {
    const defaultDomains = [
      'theme', 'browser', 'workspace', 'books', 'brand', 'feedback',
      'photography', 'hardware', 'clothing', 'forensics', 'sidegigs',
      'devops', 'privacy', 'registry', 'campaign', 'onboarding', 'focus', 'notifications', 'moodboard'
    ];
    return readAllDomains(defaultDomains);
  }
}

/**
 * Import a context (merge mode).
 */
export async function importContext(context: Record<string, unknown>): Promise<void> {
  await writeAllDomains(context);
}

// ─── Blob Storage (for moodboard and binary data) ─────────────────

const BLOB_PREFIX = 'continua-blob:';

/**
 * Check if the browser is approaching its storage quota (e.g. >90% full).
 */
export async function isStorageQuotaExceeded(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const { usage, quota } = await navigator.storage.estimate();
      if (usage !== undefined && quota !== undefined) {
        // If usage is above 90% of quota
        return (usage / quota) > 0.9;
      }
    } catch (e) {
      console.warn('[ContextLayer] Failed to estimate storage:', e);
    }
  }
  return false;
}

/**
 * Store a blob (binary data) in IDB.
 * Used by moodboard for images/videos that can't go through JSON domain sync.
 */
export async function writeBlob(key: string, data: Blob | ArrayBuffer): Promise<boolean> {
  try {
    const isExceeded = await isStorageQuotaExceeded();
    if (isExceeded) {
      console.error('[ContextLayer] Quota exceeded. Cannot save blob:', key);
      // Dispatch an event so the UI can show a warning toast
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('continua-storage-warning'));
      }
      return false; // Failed to write due to space
    }
    await idbSet(`${BLOB_PREFIX}${key}`, data);
    
    void queueBlobForSync(key);
    if (typeof window !== 'undefined' && navigator.onLine) {
      void processOfflineSyncQueue();
    }
    
    return true;
  } catch (e) {
    console.warn(`[ContextLayer] Blob write failed for ${key}:`, e);
    return false;
  }
}

/**
 * Read a blob from IDB.
 */
export async function readBlob<T = Blob | ArrayBuffer>(key: string): Promise<T | null> {
  try {
    const data = await idbGet<T>(`${BLOB_PREFIX}${key}`);
    return data ?? null;
  } catch (e) {
    console.warn(`[ContextLayer] Blob read failed for ${key}:`, e);
    return null;
  }
}

/**
 * Delete a blob from IDB.
 */
export async function deleteBlob(key: string): Promise<void> {
  try {
    await idbDel(`${BLOB_PREFIX}${key}`);
  } catch (e) {
    console.warn(`[ContextLayer] Blob delete failed for ${key}:`, e);
  }
}

/**
 * Garbage collect unused blobs.
 * @param activeKeys Set of blob IDs (without prefix) currently in use.
 */
export async function garbageCollectBlobs(activeKeys: Set<string>): Promise<number> {
  try {
    const allKeys = await idbKeys();
    let deletedCount = 0;
    for (const key of allKeys) {
      if (typeof key === 'string' && key.startsWith(BLOB_PREFIX)) {
        const blobId = key.substring(BLOB_PREFIX.length);
        if (!activeKeys.has(blobId)) {
          await idbDel(key);
          deletedCount++;
        }
      }
    }
    return deletedCount;
  } catch (e) {
    console.warn('[ContextLayer] Blob garbage collection failed:', e);
    return 0;
  }
}

// ─── Cloud Sync (via API routes → Context Kernel) ────────────────

let syncInProgress = false;

// ─── Offline Blob Sync Queue ─────────────────────────────────────
const PENDING_BLOBS_KEY = 'continua-pending-blobs';

export async function queueBlobForSync(key: string): Promise<void> {
  try {
    const queue = (await idbGet<string[]>(PENDING_BLOBS_KEY)) || [];
    if (!queue.includes(key)) {
      queue.push(key);
      await idbSet(PENDING_BLOBS_KEY, queue);
    }
  } catch (e) {
    console.warn('[ContextLayer] Failed to queue blob for sync:', e);
  }
}

export async function processOfflineSyncQueue(): Promise<void> {
  if (!_isOnline || config.mode !== 'agency' || !config.userId) return;

  try {
    const queue = (await idbGet<string[]>(PENDING_BLOBS_KEY)) || [];
    if (queue.length === 0) return;

    console.log(`[ContextLayer] Processing ${queue.length} offline blobs...`);
    const remaining: string[] = [];

    for (const key of queue) {
      const blob = await readBlob(key);
      if (blob) {
        const { getSupabase } = await import('@/lib/supabase');
        const supabase = getSupabase();
        const { error } = await supabase.storage.from('continua-blobs').upload(key, blob, { upsert: true });
        if (error) {
          console.warn(`[ContextLayer] Blob upload failed for ${key}:`, error);
          remaining.push(key);
        }
      }
    }

    await idbSet(PENDING_BLOBS_KEY, remaining);
  } catch (e) {
    console.warn('[ContextLayer] Failed to process offline queue:', e);
  }
}

// Attach to network online event
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { 
    _isOnline = true; 
    processOfflineSyncQueue();
  });
}

async function scheduleCloudSync(domain: string, data: unknown): Promise<void> {
  const key = `sync:${domain}`;
  const existing = debounceTimers.get(key);
  if (existing) clearTimeout(existing);

  debounceTimers.set(key, setTimeout(async () => {
    debounceTimers.delete(key);

    if (!config.userId || syncInProgress || !_isOnline) return;

    try {
      const versionKey = `${SYNC_VERSION_PREFIX}${domain}`;
      const currentVersion = (await idbGet<number>(versionKey)) || 0;

      const res = await fetch('/api/context/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          data,
          version: currentVersion,
          deviceId: config.deviceId,
        }),
      });

      if (res.ok) {
        const body = await res.json();
        const newVersion = body.data?.version ?? currentVersion;
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
  if (config.mode !== 'agency' || !config.userId || !_isOnline) {
    return { pulled: 0, conflicts: 0 };
  }

  mark('ctx:cloudSync');
  syncInProgress = true;

  try {
    const res = await fetch('/api/context/pull');
    if (!res.ok) {
      console.warn('[ContextLayer] Cloud pull failed:', res.status);
      return { pulled: 0, conflicts: 0 };
    }

    const body = await res.json();
    const records = body.data?.domains || [];
    let pulled = 0;
    let conflicts = 0;

    for (const record of records) {
      const { domain, data, version } = record;

      // Skip internal domains (__snapshot:*, __device:*)
      if (domain.startsWith('__')) continue;

      const localVersion = (await idbGet<number>(`${SYNC_VERSION_PREFIX}${domain}`)) || 0;

      if (version > localVersion) {
        // Remote is newer — apply
        await idbSet(`${STORAGE_PREFIX}${domain}`, data);
        await idbSet(`${SYNC_VERSION_PREFIX}${domain}`, version);
        pulled++;
        if (localVersion > 0) conflicts++;
      } else if (localVersion === 0 && version > 0) {
        // No local data — pull remote
        await idbSet(`${STORAGE_PREFIX}${domain}`, data);
        await idbSet(`${SYNC_VERSION_PREFIX}${domain}`, version);
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
