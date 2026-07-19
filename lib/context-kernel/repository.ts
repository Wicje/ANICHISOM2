/**
 * Context Repository — Protocol Contract
 *
 * This is the interface that every storage driver must implement.
 * The frontend and API routes only talk to this interface — never
 * directly to Supabase, IndexedDB, or any other backend.
 *
 * To add a new storage backend: implement ContextRepository.
 * To swap backends: change one import. Nothing else changes.
 */

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

export interface ContextRepository {
  // ─── Core CRUD ──────────────────────────────────────────────

  /** Save a domain's context. Upserts by {userId}:{domain}. */
  save(request: SaveContextRequest): Promise<SaveContextResponse>;

  /** Get a single domain's context. */
  get(userId: string, domain: string): Promise<ContextRecord | null>;

  /** Pull one or more domains (optionally only if newer than a version). */
  pull(userId: string, request: PullContextRequest): Promise<PullContextResponse>;

  /** Get all domains for a user. */
  getAll(userId: string): Promise<ContextRecord[]>;

  /** Delete a domain (soft delete — sets tombstone). */
  delete(userId: string, domain: string, deviceId: string): Promise<void>;

  /** Hard delete — removes the record entirely. For GDPR/right-to-erasure. */
  hardDelete(userId: string, domain: string): Promise<void>;

  // ─── Conflict Resolution ────────────────────────────────────

  /** Resolve a conflict between local and remote versions. */
  resolveConflict(
    local: ContextRecord,
    remote: ContextRecord
  ): ConflictResolution;

  // ─── Snapshots ──────────────────────────────────────────────

  /** Create a point-in-time snapshot of all (or selected) domains. */
  createSnapshot(userId: string, request: SnapshotRequest): Promise<ContextSnapshot>;

  /** Get a snapshot by ID. */
  getSnapshot(snapshotId: string): Promise<ContextSnapshot | null>;

  /** List snapshots for a user (most recent first). */
  listSnapshots(userId: string, limit?: number): Promise<ContextSnapshot[]>;

  /** Restore context from a snapshot. */
  restoreFromSnapshot(userId: string, request: RestoreRequest): Promise<{ restored: number }>;

  /** Delete a snapshot. */
  deleteSnapshot(snapshotId: string): Promise<void>;

  // ─── Device Sync State ──────────────────────────────────────

  /** Get sync state for a device. */
  getDeviceSyncState(userId: string, deviceId: string): Promise<DeviceSyncState | null>;

  /** Update sync state for a device. */
  updateDeviceSyncState(userId: string, state: DeviceSyncState): Promise<void>;

  // ─── Bulk Operations ────────────────────────────────────────

  /** Export all context for a user (full snapshot). */
  exportAll(userId: string): Promise<ContextSnapshot>;

  /** Import context from a snapshot (merge mode). */
  importAll(userId: string, snapshot: ContextSnapshot): Promise<{ imported: number; conflicts: number }>;

  // ─── Cleanup ────────────────────────────────────────────────

  /** Delete ALL context for a user (GDPR compliance). */
  deleteUser(userId: string): Promise<void>;

  /** Get storage stats for a user. */
  getStats(userId: string): Promise<{
    domainCount: number;
    totalSizeBytes: number;
    snapshotCount: number;
    lastSyncAt: string | null;
  }>;
}
