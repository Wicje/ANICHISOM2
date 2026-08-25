/**
 * Continua Continuity Engine — Core Types
 *
 * These types define the workspace model for the continuity layer.
 * The engine captures "what the user is working on" and restores it
 * on another device.
 */

import type { DeviceCapabilities } from '@/lib/capabilities';

// ─── Workspace ──────────────────────────────────────────────

export interface WorkspaceSnapshot {
  id: string;
  userId: string;
  name: string;
  activeTask: string;
  resources: WorkspaceResource[];
  deviceCapabilities: DeviceCapabilities;
  capturedAt: number;
  syncedAt: number;
  isActive: boolean;
}

export type ResourceType = 'url' | 'file' | 'application' | 'note';

export type ResourceRelevance = 'high' | 'medium' | 'low';

export interface WorkspaceResource {
  id: string;
  type: ResourceType;
  identifier: string;       // URL, file path, app id, or note id
  name: string;             // Human-readable name
  metadata: ResourceMetadata;
  relevance: ResourceRelevance;
  lastAccessed: number;     // timestamp
  firstAccessed: number;    // timestamp
  dwellTimeMs: number;      // total time spent
  accessCount: number;      // how many times accessed
  source: string;           // device fingerprint that captured this
}

export interface ResourceMetadata {
  // URL-specific
  url?: string;
  title?: string;
  favicon?: string;

  // File-specific
  filePath?: string;
  fileSize?: number;
  mimeType?: string;

  // App-specific
  appId?: string;
  appTitle?: string;

  // Note-specific
  content?: string;

  // Generic
  tags?: string[];
  [key: string]: any;
}

// ─── Workspace Events (for capture) ────────────────────────

export type WorkspaceEventKind =
  | 'resource_opened'
  | 'resource_focused'
  | 'resource_closed'
  | 'resource_modified'
  | 'workspace_created'
  | 'workspace_renamed'
  | 'task_changed';

export interface WorkspaceEvent {
  kind: WorkspaceEventKind;
  timestamp: number;
  resourceId?: string;
  workspaceId?: string;
  data?: Record<string, any>;
}

// ─── Restore ───────────────────────────────────────────────

export type RestoreStatus = 'restored' | 'unavailable' | 'skipped' | 'failed';

export interface RestoreResult {
  resourceId: string;
  resource: WorkspaceResource;
  status: RestoreStatus;
  reason?: string;          // why unavailable/failed
  restoredUrl?: string;     // the URL that was actually opened
}

export interface RestorePlan {
  workspace: WorkspaceSnapshot;
  results: RestoreResult[];
  restoredCount: number;
  unavailableCount: number;
  skippedCount: number;
  capabilities: DeviceCapabilities;
}

// ─── Relevance Scoring ─────────────────────────────────────

export interface RelevanceFactors {
  recencyMs: number;        // time since last access
  frequency: number;        // accesses per hour
  dwellTimeMs: number;      // total time spent
  relatedCount: number;     // how many other resources are related
  isCurrentlyOpen: boolean; // still open on source device
}

// ─── Device Trust ──────────────────────────────────────────

export type TrustLevel = 'trusted' | 'temporary' | 'revoked';

export interface DeviceRegistration {
  id: string;
  userId: string;
  deviceName: string;
  trustLevel: TrustLevel;
  platform: string;
  browser: string;
  fingerprint: string;
  capabilities: DeviceCapabilities;
  lastSeenAt: number;
  createdAt: number;
  revokedAt: number | null;
}
