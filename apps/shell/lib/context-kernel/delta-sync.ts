/**
 * Context Kernel — Granular Delta Synchronization
 *
 * Computes and applies incremental diff patches between context states,
 * avoiding full object serialization over the network for large domains.
 */

import type { DeltaOperation, ContextDelta, ContextRecord, VectorClock } from './types';
import { incrementVectorClock, mergeVectorClocks } from './vector-clock';

/**
 * Recursively computes delta operations between base and current states.
 */
export function computeDeltaOperations(
  base: unknown,
  current: unknown,
  path: string[] = []
): DeltaOperation[] {
  const operations: DeltaOperation[] = [];

  if (base === current) {
    return operations;
  }

  // Primitive or type change
  if (
    typeof base !== 'object' || base === null ||
    typeof current !== 'object' || current === null ||
    Array.isArray(base) !== Array.isArray(current)
  ) {
    operations.push({ op: 'set', path, value: current });
    return operations;
  }

  // Arrays: Compute item diffs or replace if structure differs
  if (Array.isArray(base) && Array.isArray(current)) {
    // If arrays contain objects with 'id', match by id
    const baseHasIds = base.length > 0 && typeof base[0] === 'object' && base[0] !== null && 'id' in base[0];
    const currentHasIds = current.length > 0 && typeof current[0] === 'object' && current[0] !== null && 'id' in current[0];

    if (baseHasIds && currentHasIds) {
      const baseMap = new Map((base as Array<{ id: string }>).map((item) => [item.id, item]));
      const currentMap = new Map((current as Array<{ id: string }>).map((item) => [item.id, item]));

      // Deleted items
      for (const [id] of baseMap) {
        if (!currentMap.has(id)) {
          operations.push({ op: 'delete', path: [...path, id] });
        }
      }

      // Added or modified items
      for (const [id, currentItem] of currentMap) {
        const baseItem = baseMap.get(id);
        if (!baseItem) {
          operations.push({ op: 'append', path: [...path, id], value: currentItem });
        } else {
          operations.push(...computeDeltaOperations(baseItem, currentItem, [...path, id]));
        }
      }
      return operations;
    }

    // Default array replacement
    operations.push({ op: 'set', path, value: current });
    return operations;
  }

  // Plain objects
  const baseObj = base as Record<string, unknown>;
  const currentObj = current as Record<string, unknown>;

  const allKeys = new Set([...Object.keys(baseObj), ...Object.keys(currentObj)]);

  for (const key of allKeys) {
    if (!(key in currentObj)) {
      // Key deleted
      operations.push({ op: 'delete', path: [...path, key] });
    } else if (!(key in baseObj)) {
      // Key added
      operations.push({ op: 'set', path: [...path, key], value: currentObj[key] });
    } else {
      // Key potentially changed
      operations.push(...computeDeltaOperations(baseObj[key], currentObj[key], [...path, key]));
    }
  }

  return operations;
}

/**
 * Applies a list of delta operations to a base state to produce the updated state.
 */
export function applyDeltaOperations(base: unknown, operations: DeltaOperation[]): unknown {
  if (operations.length === 0) return base;

  // Clone base deeply
  let root: any = base === undefined || base === null ? {} : JSON.parse(JSON.stringify(base));

  for (const op of operations) {
    if (op.path.length === 0) {
      if (op.op === 'set') {
        root = op.value;
      }
      continue;
    }

    let current = root;
    for (let i = 0; i < op.path.length - 1; i++) {
      const segment = op.path[i]!;
      if (!(segment in current) || typeof current[segment] !== 'object' || current[segment] === null) {
        current[segment] = {};
      }
      current = current[segment];
    }

    const lastKey = op.path[op.path.length - 1]!;

    switch (op.op) {
      case 'set':
        current[lastKey] = op.value;
        break;
      case 'delete':
        if (Array.isArray(current)) {
          const index = current.findIndex((item) => typeof item === 'object' && item !== null && item.id === lastKey);
          if (index !== -1) current.splice(index, 1);
        } else {
          delete current[lastKey];
        }
        break;
      case 'append':
        if (Array.isArray(current)) {
          current.push(op.value);
        } else {
          current[lastKey] = op.value;
        }
        break;
      case 'merge':
        if (typeof current[lastKey] === 'object' && current[lastKey] !== null && typeof op.value === 'object' && op.value !== null) {
          current[lastKey] = { ...current[lastKey], ...op.value };
        } else {
          current[lastKey] = op.value;
        }
        break;
    }
  }

  return root;
}

/**
 * Creates a ContextDelta instance from a base record and updated state.
 */
export function createContextDelta(
  baseRecord: ContextRecord | null,
  domain: string,
  updatedData: unknown,
  deviceId: string
): ContextDelta {
  const baseVersion = baseRecord?.version || 0;
  const targetVersion = baseVersion + 1;
  const baseClock = baseRecord?.vectorClock || {};
  const newClock = incrementVectorClock(baseClock, deviceId);

  const operations = computeDeltaOperations(baseRecord?.data ?? null, updatedData);

  return {
    domain,
    baseVersion,
    targetVersion,
    vectorClock: newClock,
    deviceId,
    timestamp: new Date().toISOString(),
    operations,
  };
}

/**
 * Applies a ContextDelta patch to an existing ContextRecord.
 */
export function applyContextDelta(
  record: ContextRecord | null,
  delta: ContextDelta
): ContextRecord {
  const mergedClock = mergeVectorClocks(record?.vectorClock, delta.vectorClock);
  const updatedData = applyDeltaOperations(record?.data ?? null, delta.operations);

  return {
    id: record?.id || `${record?.userId || 'usr'}:${delta.domain}`,
    userId: record?.userId || 'unknown',
    domain: delta.domain,
    data: updatedData,
    version: Math.max(record?.version || 0, delta.targetVersion),
    deviceId: delta.deviceId,
    updatedAt: delta.timestamp,
    schemaVersion: record?.schemaVersion || '1.0.0',
    deleted: false,
    vectorClock: mergedClock,
  };
}
