/**
 * ANICHISOM OS: Complete TypeScript Type Definitions
 * 
 * All types for workspaces, projects, files, events, and collaboration
 * Phase 1: Infrastructure
 */

// ============================================================================
// WORKSPACE TYPES
// ============================================================================

export interface Workspace {
  id: string;
  name: string;
  ownerId: string; // Firebase user ID
  isPrivate: boolean; // true for side-gigs, false for team workspaces
  members: WorkspaceMember[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  userId: string;
  role: 'admin' | 'editor' | 'viewer';
  joinedAt: Date;
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  clientId: string; // Client name or user ID
  brief: string; // Rich text description
  status: 'discovery' | 'design' | 'review' | 'delivered';
  phase: 'discovery' | 'design' | 'review';
  timeline: ProjectTimeline;
  team: ProjectTeamMember[];
  deliverables: Deliverable[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // Firebase user ID
}

export interface ProjectTimeline {
  startDate: Date;
  endDate: Date;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  name: string;
  date: Date;
  description?: string;
}

export interface ProjectTeamMember {
  userId: string;
  name: string;
  role: string; // 'designer', 'developer', 'manager', etc.
}

export interface Deliverable {
  id: string;
  name: string;
  status: 'pending' | 'in-progress' | 'approved' | 'delivered';
  assigneeId: string;
  dueDate: Date;
  description?: string;
}

// ============================================================================
// FILE TYPES
// ============================================================================

export interface ProjectFile {
  id: string;
  projectId: string;
  name: string;
  type: 'image' | 'code' | 'document' | 'video' | 'audio' | 'other';
  url: string; // Vercel Blob URL or local path
  editingUserId?: string; // File lock: who's editing
  editingSessionId?: string; // Which session has the lock
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  fileSize?: number;
  mimeType?: string;
}

// ============================================================================
// EVENT TYPES (for audit trail and event sourcing)
// ============================================================================

export const EVENT_HISTORY_LIMIT = 100;

export type EventType =
  | 'file_edited'
  | 'comment_added'
  | 'approval_given'
  | 'phase_changed'
  | 'project_created'
  | 'project_updated'
  | 'deliverable_status_changed'
  | 'team_member_added'
  | 'team_member_removed'
  | 'file_locked'
  | 'file_unlocked'
  | 'snapshot_created'
  | 'snapshot_restored'
  | 'ai_analysis_generated'
  | 'proposal_saved'
  | 'approval_comment'
  | 'approval_granted'
  | 'approval_rejected'
  | 'undo'
  | 'redo'
  | 'deliverable_created'
  | 'palette_created'
  | 'moodboard_created'
  | 'asset_added'
  | 'gig_posted'
  | 'proposal_submitted'
  | 'case_created'
  | 'evidence_logged'
  | 'hash_verified'
  | 'chain_of_custody_updated';

export interface Event {
  id: string;
  workspaceId: string;
  type: EventType;
  entityId: string; // projectId, fileId, deliverableId, etc.
  userId: string; // Who triggered the event
  oldValue?: any; // Previous value (for diffs)
  newValue?: any; // New value (for diffs)
  comment?: string; // Human-readable description
  timestamp: Date;
  createdAt?: Date; // Compatibility alias
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  };
}

// ============================================================================
// PRESENCE & COLLABORATION TYPES
// ============================================================================

export interface Presence {
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  workspaceId: string;
  isOnline: boolean;
  lastSeen: Date;
  currentFileId?: string; // Which file they're editing
  currentAppId?: string; // Which app they have open
  status?: 'active' | 'idle' | 'away';
}

export interface FileLock {
  fileId: string;
  userId: string;
  sessionId: string;
  acquiredAt: Date;
  expiresAt: Date; // Auto-release after 30 mins
}

// ============================================================================
// COLLABORATION TYPES (Phase 2A+)
// ============================================================================

export interface Comment {
  id: string;
  entityId: string; // projectId, fileId, deliverableId
  entityType: 'project' | 'file' | 'deliverable';
  userId: string;
  userName: string;
  content: string;
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
  mentions?: string[]; // Array of user IDs
}

export interface Approval {
  id: string;
  deliverableId: string;
  projectId: string;
  approverId: string; // User who approved
  approverName: string;
  status: 'pending' | 'approved' | 'rejected';
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// MOODBOARD & PREFERENCE TYPES (Phase 3A+)
// ============================================================================

export interface MoodboardVote {
  id: string;
  projectId: string;
  moodImageId: string;
  userId: string;
  voteValue: 'like' | 'neutral' | 'dislike';
  timestamp: Date;
}

export interface ClientPreference {
  projectId: string;
  colorPalette: {
    primary: string[];
    secondary: string[];
    accent: string[];
  };
  styleProfile: {
    complexity: 'minimal' | 'moderate' | 'complex';
    mood: string[]; // e.g. ['playful', 'professional', 'artistic']
    inspirations: string[]; // image IDs
  };
  lastUpdated: Date;
}

// ============================================================================
// PROPOSAL TYPES (Phase 3B+)
// ============================================================================

export interface Proposal {
  id: string;
  projectId: string;
  workspaceId: string;
  clientName: string;
  scope: string; // Markdown description
  deliverables: ProposalDeliverable[];
  timeline: {
    startDate: Date;
    endDate: Date;
    phases: string[];
  };
  estimatedPrice?: number;
  currencyCode?: string;
  generatedAt: Date;
  updatedAt: Date;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  sentTo?: string; // Client email
  sentAt?: Date;
  approvedAt?: Date;
}

export interface ProposalDeliverable {
  name: string;
  description: string;
  dueDate: Date;
}

// ============================================================================
// SIDE-GIG TYPES (Phase 3C+)
// ============================================================================

export interface TimeEntry {
  id: string;
  sideGigId: string; // Workspace ID (side-gig workspace)
  userId: string;
  userName: string;
  startTime: Date;
  endTime: Date;
  hours: number;
  hourlyRate: number;
  billable: boolean;
  description?: string;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  sideGigId: string;
  invoiceNumber: string;
  fromName: string;
  fromEmail: string;
  toName: string;
  toEmail: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  currencyCode: string;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  createdAt: Date;
  sentAt?: Date;
  paidAt?: Date;
}

export interface InvoiceLineItem {
  description: string;
  hours: number;
  hourlyRate: number;
  amount: number;
}

// ============================================================================
// SNAPSHOT TYPES (for version control)
// ============================================================================

export interface Snapshot {
  id: string;
  projectId: string;
  workspaceId: string;
  name: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
  data: {
    projectState: Project;
    files: ProjectFile[];
    deliverables: Deliverable[];
  };
}

// ============================================================================
// EXTENDED OS CONTEXT TYPE (integrates with existing OSWindow)
// ============================================================================

export interface OSContextExtension {
  workspaceId: string;
  setWorkspaceId: (id: string) => void;
  workspaces: Workspace[];
  setWorkspaces: (ws: Workspace[]) => void;
  mode: 'create' | 'review' | 'present';
  setMode: (mode: 'create' | 'review' | 'present') => void;
  emitEvent: (event: Omit<Event, 'id' | 'timestamp'>) => void;
  currentPresence: Presence | null;
  onlineUsers: Presence[];
  setOnlineUsers: (users: Presence[]) => void;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ProjectPhase = 'discovery' | 'design' | 'review';
export type ProjectStatus = 'discovery' | 'design' | 'review' | 'delivered';
export type UserRole = 'admin' | 'filmmaker' | 'technician';
export type WorkspaceRole = 'admin' | 'editor' | 'viewer';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_WORKSPACE_NAME = 'Personal';
export const FILE_LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const HEARTBEAT_INTERVAL_MS = 5000; // 5 seconds
export const SYNC_QUEUE_FLUSH_INTERVAL_MS = 2000; // 2 seconds
export const MAX_RETRIES = 5;
export const INITIAL_RETRY_DELAY_MS = 1000;
export const MAX_RETRY_DELAY_MS = 60000;
