/**
 * Context Kernel — Supabase Driver
 *
 * The first implementation of ContextRepository.
 * Uses Supabase PostgreSQL as the storage backend.
 *
 * This is a DRIVER, not the protocol.
 * To swap to a different backend, implement ContextRepository with a new driver.
 */

import { createAdminClient } from '@/utils/supabase/admin';
import type { ContextRepository } from './repository';
import type {
  ContextRecord,
  ContextSnapshot,
  SaveContextRequest,
  SaveContextResponse,
  PullContextRequest,
  PullContextResponse,
  SnapshotRequest,
  RestoreRequest,
  ConflictResolution,
  DeviceSyncState,
} from './types';
import { CONTEXT_KERNEL_VERSION } from './types';
import { lastWriteWins } from './conflict';

function generateId(): string {
  return crypto.randomUUID();
}

export class SupabaseContextRepository implements ContextRepository {
  // ─── Core CRUD ──────────────────────────────────────────────

  async save(request: SaveContextRequest): Promise<SaveContextResponse> {
    const supabase = createAdminClient();
    const id = `${request.userId}:${request.domain}`;
    const now = new Date().toISOString();

    // Fetch existing record to verify server version and resolve conflicts (Issue 74, 75)
    const { data: existing } = await supabase
      .from('context_records')
      .select('version, updated_at, data, device_id')
      .eq('id', id)
      .maybeSingle();

    let newVersion = 1;
    if (existing) {
      // Evaluate lastWriteWins conflict resolution if version mismatch
      const incomingRecord: ContextRecord = {
        id,
        userId: request.userId,
        domain: request.domain,
        data: request.data,
        version: request.version,
        deviceId: request.deviceId,
        updatedAt: now,
        schemaVersion: CONTEXT_KERNEL_VERSION,
        deleted: false,
      };

      const existingRecord: ContextRecord = {
        id,
        userId: request.userId,
        domain: request.domain,
        data: existing.data,
        version: existing.version,
        deviceId: existing.device_id,
        updatedAt: existing.updated_at,
        schemaVersion: CONTEXT_KERNEL_VERSION,
        deleted: false,
      };

      const resolution = lastWriteWins(incomingRecord, existingRecord);
      if (resolution.source === 'remote') {
        return {
          id,
          domain: request.domain,
          version: existing.version,
          updatedAt: existing.updated_at,
        };
      }

      newVersion = existing.version + 1;
    }

    const { error } = await supabase
      .from('context_records')
      .upsert({
        id,
        user_id: request.userId,
        domain: request.domain,
        data: request.data,
        version: newVersion,
        device_id: request.deviceId,
        updated_at: now,
        schema_version: CONTEXT_KERNEL_VERSION,
        deleted: false,
      }, { onConflict: 'id' });

    if (error) {
      throw new Error(`Context save failed: ${error.message}`);
    }

    return {
      id,
      domain: request.domain,
      version: newVersion,
      updatedAt: now,
    };
  }

  async get(userId: string, domain: string): Promise<ContextRecord | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('context_records')
      .select('*')
      .eq('user_id', userId)
      .eq('domain', domain)
      .eq('deleted', false)
      .single();

    if (error || !data) return null;

    return this.toRecord(data);
  }

  async pull(userId: string, request: PullContextRequest): Promise<PullContextResponse> {
    const supabase = createAdminClient();

    let query = supabase
      .from('context_records')
      .select('*')
      .eq('user_id', userId)
      .eq('deleted', false);

    if (request.domains && request.domains.length > 0) {
      query = query.in('domain', request.domains);
    }

    if (request.sinceVersion !== undefined) {
      query = query.gt('version', request.sinceVersion);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Context pull failed: ${error.message}`);
    }

    return {
      domains: (data || []).map(this.toRecord),
      schemaVersion: CONTEXT_KERNEL_VERSION,
    };
  }

  async getAll(userId: string): Promise<ContextRecord[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('context_records')
      .select('*')
      .eq('user_id', userId)
      .eq('deleted', false);

    if (error) {
      throw new Error(`Context getAll failed: ${error.message}`);
    }

    return (data || []).map(this.toRecord);
  }

  async delete(userId: string, domain: string, deviceId: string): Promise<void> {
    const supabase = createAdminClient();
    const id = `${userId}:${domain}`;

    const { error } = await supabase
      .from('context_records')
      .update({
        deleted: true,
        data: null,
        device_id: deviceId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Context delete failed: ${error.message}`);
    }
  }

  async hardDelete(userId: string, domain: string): Promise<void> {
    const supabase = createAdminClient();
    const id = `${userId}:${domain}`;

    const { error } = await supabase
      .from('context_records')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Context hard delete failed: ${error.message}`);
    }
  }

  // ─── Conflict Resolution ────────────────────────────────────

  resolveConflict(local: ContextRecord, remote: ContextRecord): ConflictResolution {
    return lastWriteWins(local, remote);
  }

  // ─── Snapshots ──────────────────────────────────────────────

  async createSnapshot(userId: string, request: SnapshotRequest): Promise<ContextSnapshot> {
    const allDomains = await this.getAll(userId);
    const domains = request.domains
      ? allDomains.filter(d => request.domains!.includes(d.domain))
      : allDomains;

    const snapshot: ContextSnapshot = {
      id: generateId(),
      userId,
      createdAt: new Date().toISOString(),
      schemaVersion: CONTEXT_KERNEL_VERSION,
      deviceId: 'system',
      domains,
      metadata: {
        domainCount: domains.length,
        totalSizeBytes: new TextEncoder().encode(JSON.stringify(domains)).length,
      },
    };

    // Store snapshot in context_records as a special domain
    const supabase = createAdminClient();
    await supabase
      .from('context_records')
      .upsert({
        id: `snapshot:${snapshot.id}`,
        user_id: userId,
        domain: `__snapshot:${snapshot.id}`,
        data: snapshot,
        version: 1,
        device_id: 'system',
        updated_at: snapshot.createdAt,
        schema_version: CONTEXT_KERNEL_VERSION,
        deleted: false,
      }, { onConflict: 'id' });

    return snapshot;
  }

  async getSnapshot(snapshotId: string): Promise<ContextSnapshot | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('context_records')
      .select('data')
      .eq('id', `snapshot:${snapshotId}`)
      .single();

    if (error || !data) return null;
    return data.data as ContextSnapshot;
  }

  async listSnapshots(userId: string, limit = 10): Promise<ContextSnapshot[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('context_records')
      .select('data')
      .eq('user_id', userId)
      .like('domain', '__snapshot:%')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) return [];
    return (data || []).map(row => row.data as ContextSnapshot);
  }

  async restoreFromSnapshot(userId: string, request: RestoreRequest): Promise<{ restored: number }> {
    const snapshot = await this.getSnapshot(request.snapshotId);
    if (!snapshot) throw new Error('Snapshot not found');

    const domains = request.domains
      ? snapshot.domains.filter(d => request.domains!.includes(d.domain))
      : snapshot.domains;

    let restored = 0;
    for (const record of domains) {
      await this.save({
        userId,
        domain: record.domain,
        data: record.data,
        version: record.version,
        deviceId: 'restore',
      });
      restored++;
    }

    return { restored };
  }

  async deleteSnapshot(snapshotId: string): Promise<void> {
    const supabase = createAdminClient();
    await supabase
      .from('context_records')
      .delete()
      .eq('id', `snapshot:${snapshotId}`);
  }

  // ─── Device Sync State ──────────────────────────────────────

  async getDeviceSyncState(userId: string, deviceId: string): Promise<DeviceSyncState | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('context_records')
      .select('data')
      .eq('user_id', userId)
      .eq('domain', `__device:${deviceId}`)
      .single();

    if (error || !data) return null;
    return data.data as DeviceSyncState;
  }

  async updateDeviceSyncState(userId: string, state: DeviceSyncState): Promise<void> {
    const supabase = createAdminClient();

    await supabase
      .from('context_records')
      .upsert({
        id: `${userId}:__device:${state.deviceId}`,
        user_id: userId,
        domain: `__device:${state.deviceId}`,
        data: state,
        version: 1,
        device_id: state.deviceId,
        updated_at: new Date().toISOString(),
        schema_version: CONTEXT_KERNEL_VERSION,
        deleted: false,
      }, { onConflict: 'id' });
  }

  // ─── Bulk Operations ────────────────────────────────────────

  async exportAll(userId: string): Promise<ContextSnapshot> {
    return this.createSnapshot(userId, {});
  }

  async importAll(userId: string, snapshot: ContextSnapshot): Promise<{ imported: number; conflicts: number }> {
    let imported = 0;
    let conflicts = 0;

    for (const record of snapshot.domains) {
      const existing = await this.get(userId, record.domain);

      if (existing) {
        const resolution = this.resolveConflict(existing, record);
        if (resolution.hadConflict) conflicts++;

        await this.save({
          userId,
          domain: record.domain,
          data: resolution.data,
          version: resolution.source === 'local' ? existing.version : record.version,
          deviceId: 'import',
        });
      } else {
        await this.save({
          userId,
          domain: record.domain,
          data: record.data,
          version: 0,
          deviceId: 'import',
        });
      }
      imported++;
    }

    return { imported, conflicts };
  }

  // ─── Cleanup ────────────────────────────────────────────────

  async deleteUser(userId: string): Promise<void> {
    const supabase = createAdminClient();
    await supabase
      .from('context_records')
      .delete()
      .eq('user_id', userId);
  }

  async getStats(userId: string): Promise<{
    domainCount: number;
    totalSizeBytes: number;
    snapshotCount: number;
    lastSyncAt: string | null;
  }> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('context_records')
      .select('domain, data, updated_at')
      .eq('user_id', userId)
      .eq('deleted', false);

    if (error || !data) {
      return { domainCount: 0, totalSizeBytes: 0, snapshotCount: 0, lastSyncAt: null };
    }

    const domains = data.filter(d => !d.domain.startsWith('__'));
    const snapshots = data.filter(d => d.domain.startsWith('__snapshot:'));

    const totalSize = new TextEncoder().encode(
      JSON.stringify(data.map(d => d.data))
    ).length;

    const lastSync = data.length > 0
      ? data.reduce((latest, d) => (d.updated_at > latest ? d.updated_at : latest), '')
      : null;

    return {
      domainCount: domains.length,
      totalSizeBytes: totalSize,
      snapshotCount: snapshots.length,
      lastSyncAt: lastSync,
    };
  }

  // ─── Internal Helpers ───────────────────────────────────────

  private toRecord(row: any): ContextRecord {
    return {
      id: row.id,
      userId: row.user_id,
      domain: row.domain,
      data: row.data,
      version: row.version,
      deviceId: row.device_id,
      updatedAt: row.updated_at,
      schemaVersion: row.schema_version || CONTEXT_KERNEL_VERSION,
      deleted: row.deleted || false,
    };
  }
}
