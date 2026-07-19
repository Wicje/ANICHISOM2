/**
 * Context Kernel — Protocol Schema
 *
 * The versioned data contract for Continua's context persistence layer.
 * Every piece of state that flows through the system conforms to this schema.
 *
 * This is Continua's intellectual property. The storage backend is a driver,
 * not the product. The schema IS the protocol.
 */

// ─── Schema Version ─────────────────────────────────────────────

/** Current schema version. Bump when the schema changes. */
export const CONTEXT_KERNEL_VERSION = '1.0.0';

// ─── Core Types ─────────────────────────────────────────────────

/**
 * A context record — the atomic unit of persistent state.
 * One record per domain per user. The domain is the namespace
 * (e.g. "theme", "browser", "workspace", "campaign").
 */
export interface ContextRecord {
  /** Unique record ID: "{userId}:{domain}" */
  id: string;

  /** The user who owns this context */
  userId: string;

  /** The domain namespace (theme, browser, workspace, etc.) */
  domain: string;

  /** The actual state data — any JSON-serializable value */
  data: unknown;

  /** Monotonically increasing version number per domain per user */
  version: number;

  /** Which device wrote this version */
  deviceId: string;

  /** ISO 8601 timestamp of last write */
  updatedAt: string;

  /** Schema version that created this record */
  schemaVersion: string;

  /** Tombstone flag: true means this domain was deleted (soft delete) */
  deleted: boolean;
}

/**
 * A context snapshot — a complete point-in-time export of a user's context.
 * Used for export, import, backup, and migration.
 */
export interface ContextSnapshot {
  /** Snapshot ID (UUID) */
  id: string;

  /** The user this snapshot belongs to */
  userId: string;

  /** ISO 8601 timestamp of snapshot creation */
  createdAt: string;

  /** Schema version at time of snapshot */
  schemaVersion: string;

  /** Device that created the snapshot */
  deviceId: string;

  /** All domain records at this point in time */
  domains: ContextRecord[];

  /** Metadata about the snapshot */
  metadata: {
    domainCount: number;
    totalSizeBytes: number;
    appVersion?: string;
  };
}

/**
 * A sync operation — tracks what changed during a sync.
 * Used for audit trail and debugging.
 */
export interface SyncOperation {
  /** Operation ID */
  id: string;

  /** The user */
  userId: string;

  /** Which domains were synced */
  domains: string[];

  /** Direction of sync */
  direction: 'push' | 'pull' | 'bidirectional';

  /** Number of records pushed */
  pushed: number;

  /** Number of records pulled */
  pulled: number;

  /** Number of conflicts resolved */
  conflicts: number;

  /** Conflict resolution strategy used */
  resolutionStrategy: 'local-wins' | 'remote-wins' | 'last-write-wins' | 'manual';

  /** ISO 8601 timestamp */
  timestamp: string;

  /** Duration in milliseconds */
  durationMs: number;

  /** Any errors that occurred */
  errors: string[];
}

// ─── Conflict Resolution ────────────────────────────────────────

/**
 * Conflict resolution result.
 */
export interface ConflictResolution {
  /** The winning data */
  data: unknown;

  /** The winning version */
  version: number;

  /** Who won: 'local' or 'remote' */
  source: 'local' | 'remote';

  /** Whether a conflict actually occurred */
  hadConflict: boolean;

  /** Human-readable explanation */
  reason: string;
}

// ─── Sync State ─────────────────────────────────────────────────

/**
 * Per-device sync state — tracks what each device has seen.
 */
export interface DeviceSyncState {
  /** Device ID */
  deviceId: string;

  /** Last version this device pushed */
  lastPushedVersion: number;

  /** Last version this device pulled */
  lastPulledVersion: number;

  /** ISO 8601 timestamp of last sync */
  lastSyncAt: string;

  /** Device metadata */
  deviceInfo?: {
    userAgent: string;
    platform: string;
    appVersion?: string;
  };
}

// ─── API Contract Types ─────────────────────────────────────────

/**
 * Request to save a domain's context.
 */
export interface SaveContextRequest {
  /** The user who owns this context */
  userId: string;
  domain: string;
  data: unknown;
  version: number;
  deviceId: string;
}

/**
 * Response after saving a context.
 */
export interface SaveContextResponse {
  id: string;
  domain: string;
  version: number;
  updatedAt: string;
}

/**
 * Request to pull context (one or more domains).
 */
export interface PullContextRequest {
  domains?: string[]; // undefined = all domains
  sinceVersion?: number; // only pull if newer than this
}

/**
 * Response after pulling context.
 */
export interface PullContextResponse {
  domains: ContextRecord[];
  schemaVersion: string;
}

/**
 * Request to create a snapshot.
 */
export interface SnapshotRequest {
  domains?: string[]; // undefined = all
}

/**
 * Request to restore from a snapshot.
 */
export interface RestoreRequest {
  snapshotId: string;
  domains?: string[]; // undefined = all domains in snapshot
}

// ─── Domain Registry ────────────────────────────────────────────

/**
 * Known context domains. This is the canonical list.
 * New domains must be registered here.
 */
export const CONTEXT_DOMAINS = [
  'theme',
  'browser',
  'workspace',
  'books',
  'brand',
  'feedback',
  'photography',
  'hardware',
  'clothing',
  'forensics',
  'sidegigs',
  'devops',
  'privacy',
  'registry',
  'campaign',
  'onboarding',
  'moodboard',
  'activity',
  'focus',
  'screenshot',
  'clipboard',
  'notifications',
  'terminal',
  'filesystem',
] as const;

export type ContextDomain = (typeof CONTEXT_DOMAINS)[number];

/**
 * Check if a string is a valid context domain.
 */
export function isValidDomain(domain: string): domain is ContextDomain {
  return (CONTEXT_DOMAINS as readonly string[]).includes(domain);
}
