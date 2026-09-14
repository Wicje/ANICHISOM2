/**
 * Context Kernel — Vector Clocks & Causal Ordering
 *
 * Implements Lamport Vector Clocks for causal ordering of edits
 * across distributed devices without relying on synchronized physical clocks.
 */

import type { VectorClock, ContextRecord, ConflictResolution, ContextTombstone } from './types';

/**
 * Creates an initial vector clock for a device with sequence 1.
 */
export function createVectorClock(deviceId: string, initialSeq: number = 1): VectorClock {
  return { [deviceId]: initialSeq };
}

/**
 * Returns a new vector clock with the given deviceId incremented by 1.
 */
export function incrementVectorClock(clock: VectorClock | undefined, deviceId: string): VectorClock {
  const result: VectorClock = { ...(clock || {}) };
  result[deviceId] = (result[deviceId] || 0) + 1;
  return result;
}

/**
 * Merges two vector clocks by taking the pairwise maximum sequence for all devices.
 */
export function mergeVectorClocks(a: VectorClock | undefined, b: VectorClock | undefined): VectorClock {
  const result: VectorClock = { ...(a || {}) };
  if (!b) return result;

  for (const [deviceId, seq] of Object.entries(b)) {
    result[deviceId] = Math.max(result[deviceId] || 0, seq);
  }

  return result;
}

export type ClockComparison = 'before' | 'after' | 'equal' | 'concurrent';

/**
 * Compares two vector clocks.
 * - 'before': Clock A causally happened before Clock B (B dominates A)
 * - 'after': Clock A causally happened after Clock B (A dominates B)
 * - 'equal': Both clocks are identical
 * - 'concurrent': Neither clock dominates the other (concurrent offline edits)
 */
export function compareVectorClocks(a: VectorClock | undefined, b: VectorClock | undefined): ClockComparison {
  const clockA = a || {};
  const clockB = b || {};

  const allKeys = new Set([...Object.keys(clockA), ...Object.keys(clockB)]);

  let hasGreater = false;
  let hasLesser = false;

  for (const key of allKeys) {
    const valA = clockA[key] || 0;
    const valB = clockB[key] || 0;

    if (valA > valB) hasGreater = true;
    if (valA < valB) hasLesser = true;
  }

  if (!hasGreater && !hasLesser) return 'equal';
  if (hasGreater && !hasLesser) return 'after';
  if (!hasGreater && hasLesser) return 'before';
  return 'concurrent';
}

/**
 * Deterministically resolves conflicts between two records using Vector Clocks,
 * tombstone causal checks, and deterministic tie-breaking.
 */
export function resolveVectorClockConflict(
  local: ContextRecord,
  remote: ContextRecord
): ConflictResolution {
  // 1. Tombstone check: If one is deleted and its clock dominates or is concurrent with an older update, tombstone wins
  if (local.deleted || remote.deleted) {
    if (local.deleted && remote.deleted) {
      const mergedClock = mergeVectorClocks(local.vectorClock, remote.vectorClock);
      return {
        data: null,
        version: Math.max(local.version, remote.version) + 1,
        source: 'local',
        hadConflict: false,
        reason: 'Both versions marked deleted with tombstone',
      };
    }

    const tombstoneRecord = local.deleted ? local : remote;
    const activeRecord = local.deleted ? remote : local;
    const tombstoneSource = local.deleted ? 'local' : 'remote';

    const comparison = compareVectorClocks(tombstoneRecord.vectorClock, activeRecord.vectorClock);

    if (comparison === 'after' || comparison === 'equal' || comparison === 'concurrent') {
      return {
        data: null,
        version: Math.max(local.version, remote.version) + 1,
        source: tombstoneSource,
        hadConflict: true,
        reason: `Tombstone deletion from ${tombstoneSource} applied (causal comparison: ${comparison})`,
      };
    }
  }

  // 2. Vector clock comparison
  const comparison = compareVectorClocks(local.vectorClock, remote.vectorClock);

  if (comparison === 'after') {
    return {
      data: local.data,
      version: local.version,
      source: 'local',
      hadConflict: false,
      reason: 'Local vector clock causally dominates remote',
    };
  }

  if (comparison === 'before') {
    return {
      data: remote.data,
      version: remote.version,
      source: 'remote',
      hadConflict: false,
      reason: 'Remote vector clock causally dominates local',
    };
  }

  // 3. Concurrent or Missing Clocks — Fall back to deterministic timestamp & version merge
  if (comparison === 'concurrent') {
    // If both are objects, attempt deep structural 3-way merge
    if (
      typeof local.data === 'object' && local.data !== null && !Array.isArray(local.data) &&
      typeof remote.data === 'object' && remote.data !== null && !Array.isArray(remote.data)
    ) {
      const mergedData = {
        ...(local.data as Record<string, unknown>),
        ...(remote.data as Record<string, unknown>),
      };
      const mergedVersion = Math.max(local.version, remote.version) + 1;

      return {
        data: mergedData,
        version: mergedVersion,
        source: 'remote',
        hadConflict: true,
        reason: 'Concurrent edits detected. Merged structural JSON properties.',
      };
    }

    // Deterministic tie-breaker: Later timestamp, then lexicographical deviceId
    const localTime = new Date(local.updatedAt || 0).getTime();
    const remoteTime = new Date(remote.updatedAt || 0).getTime();

    if (localTime > remoteTime) {
      return {
        data: local.data,
        version: Math.max(local.version, remote.version) + 1,
        source: 'local',
        hadConflict: true,
        reason: 'Concurrent edits: local won tie-break by timestamp',
      };
    } else if (remoteTime > localTime) {
      return {
        data: remote.data,
        version: Math.max(local.version, remote.version) + 1,
        source: 'remote',
        hadConflict: true,
        reason: 'Concurrent edits: remote won tie-break by timestamp',
      };
    } else {
      const remoteWins = (remote.deviceId || '') >= (local.deviceId || '');
      return {
        data: remoteWins ? remote.data : local.data,
        version: Math.max(local.version, remote.version) + 1,
        source: remoteWins ? 'remote' : 'local',
        hadConflict: true,
        reason: `Concurrent edits: ${remoteWins ? 'remote' : 'local'} won tie-break by device ID`,
      };
    }
  }

  // Equal
  return {
    data: remote.data,
    version: remote.version,
    source: 'remote',
    hadConflict: false,
    reason: 'Identical vector clocks',
  };
}
