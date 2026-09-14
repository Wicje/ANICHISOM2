/**
 * Context Kernel — In-Memory & Local Storage Driver
 *
 * Pluggable repository implementation that stores context records in memory / local state.
 * Fully decoupled from Supabase, enabling zero-cloud testing, offline desktop runtimes,
 * and self-hosted environments.
 */

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
import { resolveVectorClockConflict, incrementVectorClock } from './vector-clock';

export class MemoryContextRepository implements ContextRepository {
  /** Map of "{userId}:{domain}" -> ContextRecord */
  private records = new Map<string, ContextRecord>();

  /** Map of snapshotId -> ContextSnapshot */
  private snapshots = new Map<string, ContextSnapshot>();

  /** Map of "{userId}:{deviceId}" -> DeviceSyncState */
  private deviceStates = new Map<string, DeviceSyncState>();

  private makeKey(userId: string, domain: string): string {
    return `${userId}:${domain}`;
  }

  async save(request: SaveContextRequest): Promise<SaveContextResponse> {
    const key = this.makeKey(request.userId, request.domain);
    const existing = this.records.get(key);

    const version = request.version > 0 ? request.version : (existing?.version || 0) + 1;
    const updatedAt = new Date().toISOString();
    const vectorClock = incrementVectorClock(existing?.vectorClock, request.deviceId);

    const record: ContextRecord = {
      id: key,
      userId: request.userId,
      domain: request.domain,
      data: request.data,
      version,
      deviceId: request.deviceId,
      updatedAt,
      schemaVersion: CONTEXT_KERNEL_VERSION,
      deleted: false,
      vectorClock,
    };

    this.records.set(key, record);

    return {
      id: key,
      domain: request.domain,
      version,
      updatedAt,
    };
  }

  async get(userId: string, domain: string): Promise<ContextRecord | null> {
    const key = this.makeKey(userId, domain);
    const record = this.records.get(key);
    if (!record || record.deleted) return null;
    return record;
  }

  async pull(userId: string, request: PullContextRequest): Promise<PullContextResponse> {
    const userRecords: ContextRecord[] = [];
    const requestedDomains = request.domains ? new Set(request.domains) : null;
    const sinceVersion = request.sinceVersion ?? 0;

    for (const [key, record] of this.records.entries()) {
      if (record.userId !== userId || record.deleted) continue;
      if (requestedDomains && !requestedDomains.has(record.domain)) continue;
      if (record.version <= sinceVersion) continue;

      userRecords.push(record);
    }

    return {
      domains: userRecords,
      schemaVersion: CONTEXT_KERNEL_VERSION,
    };
  }

  async getAll(userId: string): Promise<ContextRecord[]> {
    const userRecords: ContextRecord[] = [];
    for (const [, record] of this.records.entries()) {
      if (record.userId === userId && !record.deleted) {
        userRecords.push(record);
      }
    }
    return userRecords;
  }

  async delete(userId: string, domain: string, deviceId: string): Promise<void> {
    const key = this.makeKey(userId, domain);
    const existing = this.records.get(key);
    const updatedAt = new Date().toISOString();
    const vectorClock = incrementVectorClock(existing?.vectorClock, deviceId);

    if (existing) {
      existing.deleted = true;
      existing.updatedAt = updatedAt;
      existing.version += 1;
      existing.vectorClock = vectorClock;
      existing.tombstone = {
        domain,
        deletedAt: updatedAt,
        vectorClock,
        deletedByDeviceId: deviceId,
      };
    } else {
      this.records.set(key, {
        id: key,
        userId,
        domain,
        data: null,
        version: 1,
        deviceId,
        updatedAt,
        schemaVersion: CONTEXT_KERNEL_VERSION,
        deleted: true,
        vectorClock,
        tombstone: {
          domain,
          deletedAt: updatedAt,
          vectorClock,
          deletedByDeviceId: deviceId,
        },
      });
    }
  }

  async hardDelete(userId: string, domain: string): Promise<void> {
    const key = this.makeKey(userId, domain);
    this.records.delete(key);
  }

  resolveConflict(local: ContextRecord, remote: ContextRecord): ConflictResolution {
    return resolveVectorClockConflict(local, remote);
  }

  async createSnapshot(userId: string, request: SnapshotRequest): Promise<ContextSnapshot> {
    const allRecords = await this.getAll(userId);
    const filterDomains = request.domains ? new Set(request.domains) : null;
    const targetDomains = filterDomains
      ? allRecords.filter((r) => filterDomains.has(r.domain))
      : allRecords;

    const snapshotId = `snap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const snapshot: ContextSnapshot = {
      id: snapshotId,
      userId,
      createdAt: new Date().toISOString(),
      schemaVersion: CONTEXT_KERNEL_VERSION,
      deviceId: 'local',
      domains: targetDomains,
      metadata: {
        domainCount: targetDomains.length,
        totalSizeBytes: JSON.stringify(targetDomains).length,
      },
    };

    this.snapshots.set(snapshotId, snapshot);
    return snapshot;
  }

  async getSnapshot(snapshotId: string): Promise<ContextSnapshot | null> {
    return this.snapshots.get(snapshotId) || null;
  }

  async listSnapshots(userId: string, limit: number = 20): Promise<ContextSnapshot[]> {
    const userSnaps: ContextSnapshot[] = [];
    for (const snap of this.snapshots.values()) {
      if (snap.userId === userId) {
        userSnaps.push(snap);
      }
    }
    userSnaps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return userSnaps.slice(0, limit);
  }

  async restoreFromSnapshot(userId: string, request: RestoreRequest): Promise<{ restored: number }> {
    const snapshot = await this.getSnapshot(request.snapshotId);
    if (!snapshot || snapshot.userId !== userId) {
      throw new Error('Snapshot not found');
    }

    const filterDomains = request.domains ? new Set(request.domains) : null;
    let restored = 0;

    for (const record of snapshot.domains) {
      if (filterDomains && !filterDomains.has(record.domain)) continue;
      const key = this.makeKey(userId, record.domain);
      this.records.set(key, {
        ...record,
        userId,
        updatedAt: new Date().toISOString(),
      });
      restored++;
    }

    return { restored };
  }

  async deleteSnapshot(snapshotId: string): Promise<void> {
    this.snapshots.delete(snapshotId);
  }

  async getDeviceSyncState(userId: string, deviceId: string): Promise<DeviceSyncState | null> {
    const key = `${userId}:${deviceId}`;
    return this.deviceStates.get(key) || null;
  }

  async updateDeviceSyncState(userId: string, state: DeviceSyncState): Promise<void> {
    const key = `${userId}:${state.deviceId}`;
    this.deviceStates.set(key, state);
  }

  async exportAll(userId: string): Promise<ContextSnapshot> {
    return this.createSnapshot(userId, {});
  }

  async importAll(userId: string, snapshot: ContextSnapshot): Promise<{ imported: number; conflicts: number }> {
    let imported = 0;
    let conflicts = 0;

    for (const incoming of snapshot.domains) {
      const key = this.makeKey(userId, incoming.domain);
      const existing = this.records.get(key);

      if (existing) {
        const resolution = this.resolveConflict(existing, incoming);
        if (resolution.hadConflict) conflicts++;

        this.records.set(key, {
          ...existing,
          data: resolution.data,
          version: resolution.version,
          updatedAt: new Date().toISOString(),
        });
      } else {
        this.records.set(key, {
          ...incoming,
          userId,
          updatedAt: new Date().toISOString(),
        });
      }
      imported++;
    }

    return { imported, conflicts };
  }

  async deleteUser(userId: string): Promise<void> {
    for (const [key, record] of Array.from(this.records.entries())) {
      if (record.userId === userId) {
        this.records.delete(key);
      }
    }
    for (const [key, snap] of Array.from(this.snapshots.entries())) {
      if (snap.userId === userId) {
        this.snapshots.delete(key);
      }
    }
    for (const [key] of Array.from(this.deviceStates.entries())) {
      if (key.startsWith(`${userId}:`)) {
        this.deviceStates.delete(key);
      }
    }
  }

  async getStats(userId: string): Promise<{
    domainCount: number;
    totalSizeBytes: number;
    snapshotCount: number;
    lastSyncAt: string | null;
  }> {
    const allRecords = await this.getAll(userId);
    let totalSizeBytes = 0;
    let lastSyncAt: string | null = null;

    for (const r of allRecords) {
      totalSizeBytes += JSON.stringify(r.data).length;
      if (!lastSyncAt || new Date(r.updatedAt) > new Date(lastSyncAt)) {
        lastSyncAt = r.updatedAt;
      }
    }

    const snaps = await this.listSnapshots(userId);

    return {
      domainCount: allRecords.length,
      totalSizeBytes,
      snapshotCount: snaps.length,
      lastSyncAt,
    };
  }
}
