/**
 * Context Kernel — Conflict Resolution
 *
 * Implements the conflict resolution strategies defined in the protocol.
 * Default: last-write-wins based on version number.
 *
 * Future strategies can be added here (manual merge, CRDT, etc.)
 */

import type { ContextRecord, ConflictResolution } from './types';

/**
 * Resolve a conflict between two versions of the same domain.
 *
 * Strategy: last-write-wins by version number.
 * If versions are equal, remote wins (it's the more recent write from a different device).
 */
export function lastWriteWins(
  local: ContextRecord,
  remote: ContextRecord
): ConflictResolution {
  if (local.version > remote.version) {
    return {
      data: local.data,
      version: local.version,
      source: 'local',
      hadConflict: local.data !== remote.data,
      reason: `Local version ${local.version} > remote version ${remote.version}`,
    };
  }

  if (remote.version > local.version) {
    return {
      data: remote.data,
      version: remote.version,
      source: 'remote',
      hadConflict: local.data !== remote.data,
      reason: `Remote version ${remote.version} > local version ${local.version}`,
    };
  }

  // Equal versions: remote wins
  return {
    data: remote.data,
    version: remote.version,
    source: 'remote',
    hadConflict: local.data !== remote.data,
    reason: `Equal versions (${local.version}), remote wins by convention`,
  };
}

/**
 * Detect if two records conflict (have different data at the same version).
 */
export function detectConflict(
  local: ContextRecord,
  remote: ContextRecord
): boolean {
  if (local.version === remote.version && local.data !== remote.data) {
    return true;
  }
  return false;
}

/**
 * Merge two records. For simple state (JSON objects), this does a shallow merge.
 * For complex state, the domain-specific handler should implement custom merge logic.
 */
export function shallowMerge(
  base: unknown,
  incoming: unknown
): unknown {
  if (
    typeof base === 'object' && base !== null && !Array.isArray(base) &&
    typeof incoming === 'object' && incoming !== null && !Array.isArray(incoming)
  ) {
    return { ...(base as Record<string, unknown>), ...(incoming as Record<string, unknown>) };
  }
  // Arrays and primitives: incoming wins
  return incoming;
}
