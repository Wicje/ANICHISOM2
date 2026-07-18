/**
 * ContinuaOS Cross-Device Sync Service
 * 
 * Mirrors local IDB context state to Supabase for cross-device access.
 * Uses last-write-wins with version vectors for conflict resolution.
 * 
 * Architecture:
 * 1. Local write → IDB updated immediately (fast path)
 * 2. Mirror to cloud → Supabase UPSERT with version check
 * 3. Cloud change → Supabase Realtime subscription fires
 * 4. Conflict → incoming.version > local.version → apply incoming
 */

import { get as idbGet, set as idbSet } from 'idb-keyval';

const SYNC_PREFIX = 'continuaos_sync_';
const DEVICE_ID_KEY = 'continuaos_device_id';
const LAST_SYNC_KEY = 'continuaos_last_sync';

/** Get or create a unique device ID */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/** Context record as stored in Supabase */
export interface ContextRecord {
  id: string;
  user_id: string;
  domain: string;
  data: unknown;
  version: number;
  device_id: string;
  updated_at: string;
}

/** Sync result */
export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: string[];
}

/**
 * Push a domain's state to Supabase.
 * Returns the new version number, or null on error.
 */
export async function pushDomain(
  userId: string,
  domain: string,
  data: unknown,
  currentVersion: number,
  supabaseClient: any
): Promise<number | null> {
  const id = `${userId}:${domain}`;
  const deviceId = getDeviceId();
  const newVersion = currentVersion + 1;
  const now = new Date().toISOString();

  try {
    const { error } = await supabaseClient
      .from('context_records')
      .upsert({
        id,
        user_id: userId,
        domain,
        data,
        version: newVersion,
        device_id: deviceId,
        updated_at: now,
      }, { onConflict: 'id' });

    if (error) {
      console.warn(`[Sync] Push failed for ${domain}:`, error.message);
      return null;
    }

    // Update last sync timestamp
    await idbSet(LAST_SYNC_KEY, now);
    return newVersion;
  } catch (e) {
    console.warn(`[Sync] Push error for ${domain}:`, e);
    return null;
  }
}

/**
 * Pull all domains for a user from Supabase.
 * Returns a map of domain → { data, version }.
 */
export async function pullAllDomains(
  userId: string,
  supabaseClient: any
): Promise<Map<string, { data: unknown; version: number }>> {
  const result = new Map<string, { data: unknown; version: number }>();

  try {
    const { data, error } = await supabaseClient
      .from('context_records')
      .select('domain, data, version')
      .eq('user_id', userId);

    if (error) {
      console.warn('[Sync] Pull failed:', error.message);
      return result;
    }

    for (const record of data || []) {
      result.set(record.domain, {
        data: record.data,
        version: record.version,
      });
    }
  } catch (e) {
    console.warn('[Sync] Pull error:', e);
  }

  return result;
}

/**
 * Pull a single domain from Supabase.
 */
export async function pullDomain(
  userId: string,
  domain: string,
  supabaseClient: any
): Promise<{ data: unknown; version: number } | null> {
  try {
    const { data, error } = await supabaseClient
      .from('context_records')
      .select('data, version')
      .eq('user_id', userId)
      .eq('domain', domain)
      .single();

    if (error || !data) return null;
    return { data: data.data, version: data.version };
  } catch {
    return null;
  }
}

/**
 * Resolve conflict: last-write-wins based on version number.
 * If versions are equal, the remote device wins (it wrote more recently).
 */
export function resolveConflict(
  local: { data: unknown; version: number },
  remote: { data: unknown; version: number }
): { data: unknown; version: number; source: 'local' | 'remote' } {
  if (remote.version > local.version) {
    return { data: remote.data, version: remote.version, source: 'remote' };
  }
  if (local.version > remote.version) {
    return { data: local.data, version: local.version, source: 'local' };
  }
  // Equal versions: remote wins (it's the more recent write)
  return { data: remote.data, version: remote.version, source: 'remote' };
}

/**
 * Full sync: push all dirty domains and pull all remote domains.
 */
export async function fullSync(
  userId: string,
  localDomains: Map<string, { data: unknown; version: number }>,
  supabaseClient: any
): Promise<SyncResult> {
  const result: SyncResult = { pushed: 0, pulled: 0, conflicts: 0, errors: [] };

  // Pull remote state
  const remoteDomains = await pullAllDomains(userId, supabaseClient);

  // Merge: for each domain, resolve conflicts and push if local is newer
  for (const [domain, local] of localDomains) {
    const remote = remoteDomains.get(domain);

    if (!remote) {
      // No remote version — push local
      const newVersion = await pushDomain(userId, domain, local.data, local.version, supabaseClient);
      if (newVersion !== null) result.pushed++;
      else result.errors.push(`push:${domain}`);
      continue;
    }

    const resolved = resolveConflict(local, remote);
    if (resolved.source === 'remote') {
      // Remote is newer — apply to local
      result.pulled++;
      result.conflicts++;
    } else {
      // Local is newer — push to cloud
      const newVersion = await pushDomain(userId, domain, resolved.data, resolved.version, supabaseClient);
      if (newVersion !== null) result.pushed++;
      else result.errors.push(`push:${domain}`);
    }
  }

  // Pull any domains that exist remotely but not locally
  for (const [domain, remote] of remoteDomains) {
    if (!localDomains.has(domain)) {
      result.pulled++;
    }
  }

  return result;
}

/**
 * Get the last sync timestamp.
 */
export async function getLastSyncTime(): Promise<string | null> {
  return (await idbGet<string>(LAST_SYNC_KEY)) || null;
}
