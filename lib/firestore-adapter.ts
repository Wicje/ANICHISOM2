/**
 * ANICHISOM OS: Firestore CRUD Adapter
 * 
 * All database operations for workspaces, projects, files, events, presence
 * Phase 1: Infrastructure
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  type QueryConstraint,
  writeBatch,
  type CollectionReference,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Workspace,
  Project,
  ProjectFile,
  Event,
  Presence,
  Comment,
  Approval,
  Snapshot,
} from './workspace-types';

// ============================================================================
// HELPER: Convert timestamps
// ============================================================================

const toFirestoreDate = (date: Date): Timestamp => Timestamp.fromDate(date);
const fromFirestoreDate = (ts: any): Date => ts?.toDate?.() || new Date();

// ============================================================================
// WORKSPACE OPERATIONS
// ============================================================================

export const workspaceAdapter = {
  /**
   * Create a new workspace
   */
  async create(workspace: Workspace): Promise<void> {
    try {
      const ref = doc(db, 'workspaces', workspace.id);
      await setDoc(ref, {
        ...workspace,
        createdAt: toFirestoreDate(workspace.createdAt),
        updatedAt: toFirestoreDate(workspace.updatedAt),
        members: workspace.members.map((m) => ({
          ...m,
          joinedAt: toFirestoreDate(m.joinedAt),
        })),
      });
    } catch (error) {
      console.error('[v0] Failed to create workspace:', error);
      throw error;
    }
  },

  /**
   * Get workspace by ID
   */
  async get(workspaceId: string): Promise<Workspace | null> {
    try {
      const ref = doc(db, 'workspaces', workspaceId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;

      const data = snap.data();
      return {
        ...data,
        createdAt: fromFirestoreDate(data.createdAt),
        updatedAt: fromFirestoreDate(data.updatedAt),
        members: data.members.map((m: any) => ({
          ...m,
          joinedAt: fromFirestoreDate(m.joinedAt),
        })),
      } as Workspace;
    } catch (error) {
      console.error('[v0] Failed to get workspace:', error);
      return null;
    }
  },

  /**
   * Get all workspaces for a user
   */
  async getByUser(userId: string): Promise<Workspace[]> {
    try {
      const q = query(
        collection(db, 'workspaces'),
        where('members', 'array-contains', { userId })
      );
      const snap = await getDocs(q);
      return snap.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          createdAt: fromFirestoreDate(data.createdAt),
          updatedAt: fromFirestoreDate(data.updatedAt),
          members: data.members.map((m: any) => ({
            ...m,
            joinedAt: fromFirestoreDate(m.joinedAt),
          })),
        } as Workspace;
      });
    } catch (error) {
      console.error('[v0] Failed to get user workspaces:', error);
      return [];
    }
  },

  /**
   * Update workspace
   */
  async update(workspaceId: string, updates: Partial<Workspace>): Promise<void> {
    try {
      const ref = doc(db, 'workspaces', workspaceId);
      await updateDoc(ref, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('[v0] Failed to update workspace:', error);
      throw error;
    }
  },

  /**
   * Subscribe to workspace changes (real-time)
   */
  onChanged(workspaceId: string, callback: (ws: Workspace | null) => void) {
    try {
      const ref = doc(db, 'workspaces', workspaceId);
      return onSnapshot(ref, (snap) => {
        if (!snap.exists()) {
          callback(null);
          return;
        }
        const data = snap.data();
        callback({
          ...data,
          createdAt: fromFirestoreDate(data.createdAt),
          updatedAt: fromFirestoreDate(data.updatedAt),
          members: data.members.map((m: any) => ({
            ...m,
            joinedAt: fromFirestoreDate(m.joinedAt),
          })),
        } as Workspace);
      });
    } catch (error) {
      console.error('[v0] Failed to subscribe to workspace:', error);
      return () => {};
    }
  },
};

// ============================================================================
// PROJECT OPERATIONS
// ============================================================================

export const projectAdapter = {
  /**
   * Create a new project
   */
  async create(project: Project): Promise<void> {
    try {
      const ref = doc(db, 'projects', project.id);
      await setDoc(ref, {
        ...project,
        createdAt: toFirestoreDate(project.createdAt),
        updatedAt: toFirestoreDate(project.updatedAt),
        timeline: {
          ...project.timeline,
          startDate: toFirestoreDate(project.timeline.startDate),
          endDate: toFirestoreDate(project.timeline.endDate),
          milestones: project.timeline.milestones.map((m) => ({
            ...m,
            date: toFirestoreDate(m.date),
          })),
        },
        deliverables: project.deliverables.map((d) => ({
          ...d,
          dueDate: toFirestoreDate(d.dueDate),
        })),
      });
    } catch (error) {
      console.error('[v0] Failed to create project:', error);
      throw error;
    }
  },

  /**
   * Get project by ID
   */
  async get(projectId: string): Promise<Project | null> {
    try {
      const ref = doc(db, 'projects', projectId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;

      const data = snap.data();
      return {
        ...data,
        createdAt: fromFirestoreDate(data.createdAt),
        updatedAt: fromFirestoreDate(data.updatedAt),
        timeline: {
          ...data.timeline,
          startDate: fromFirestoreDate(data.timeline.startDate),
          endDate: fromFirestoreDate(data.timeline.endDate),
          milestones: data.timeline.milestones.map((m: any) => ({
            ...m,
            date: fromFirestoreDate(m.date),
          })),
        },
        deliverables: data.deliverables.map((d: any) => ({
          ...d,
          dueDate: fromFirestoreDate(d.dueDate),
        })),
      } as Project;
    } catch (error) {
      console.error('[v0] Failed to get project:', error);
      return null;
    }
  },

  /**
   * Get all projects in a workspace
   */
  async getByWorkspace(workspaceId: string): Promise<Project[]> {
    try {
      const q = query(
        collection(db, 'projects'),
        where('workspaceId', '==', workspaceId),
        orderBy('updatedAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          createdAt: fromFirestoreDate(data.createdAt),
          updatedAt: fromFirestoreDate(data.updatedAt),
          timeline: {
            ...data.timeline,
            startDate: fromFirestoreDate(data.timeline.startDate),
            endDate: fromFirestoreDate(data.timeline.endDate),
            milestones: data.timeline.milestones.map((m: any) => ({
              ...m,
              date: fromFirestoreDate(m.date),
            })),
          },
          deliverables: data.deliverables.map((d: any) => ({
            ...d,
            dueDate: fromFirestoreDate(d.dueDate),
          })),
        } as Project;
      });
    } catch (error) {
      console.error('[v0] Failed to get projects:', error);
      return [];
    }
  },

  /**
   * Update project
   */
  async update(projectId: string, updates: Partial<Project>): Promise<void> {
    try {
      const ref = doc(db, 'projects', projectId);
      const payload: any = { ...updates, updatedAt: Timestamp.now() };

      if (updates.timeline) {
        payload.timeline = {
          ...updates.timeline,
          startDate: toFirestoreDate(updates.timeline.startDate),
          endDate: toFirestoreDate(updates.timeline.endDate),
          milestones: updates.timeline.milestones.map((m) => ({
            ...m,
            date: toFirestoreDate(m.date),
          })),
        };
      }

      if (updates.deliverables) {
        payload.deliverables = updates.deliverables.map((d) => ({
          ...d,
          dueDate: toFirestoreDate(d.dueDate),
        }));
      }

      await updateDoc(ref, payload);
    } catch (error) {
      console.error('[v0] Failed to update project:', error);
      throw error;
    }
  },

  /**
   * Subscribe to project changes
   */
  onChanged(projectId: string, callback: (p: Project | null) => void) {
    try {
      const ref = doc(db, 'projects', projectId);
      return onSnapshot(ref, (snap) => {
        if (!snap.exists()) {
          callback(null);
          return;
        }
        const data = snap.data();
        callback({
          ...data,
          createdAt: fromFirestoreDate(data.createdAt),
          updatedAt: fromFirestoreDate(data.updatedAt),
          timeline: {
            ...data.timeline,
            startDate: fromFirestoreDate(data.timeline.startDate),
            endDate: fromFirestoreDate(data.timeline.endDate),
            milestones: data.timeline.milestones.map((m: any) => ({
              ...m,
              date: fromFirestoreDate(m.date),
            })),
          },
          deliverables: data.deliverables.map((d: any) => ({
            ...d,
            dueDate: fromFirestoreDate(d.dueDate),
          })),
        } as Project);
      });
    } catch (error) {
      console.error('[v0] Failed to subscribe to project:', error);
      return () => {};
    }
  },
};

// ============================================================================
// FILE OPERATIONS
// ============================================================================

export const fileAdapter = {
  /**
   * Create a new file record
   */
  async create(file: ProjectFile): Promise<void> {
    try {
      const ref = doc(db, 'files', file.id);
      await setDoc(ref, {
        ...file,
        createdAt: toFirestoreDate(file.createdAt),
        updatedAt: toFirestoreDate(file.updatedAt),
      });
    } catch (error) {
      console.error('[v0] Failed to create file:', error);
      throw error;
    }
  },

  /**
   * Get file by ID
   */
  async get(fileId: string): Promise<ProjectFile | null> {
    try {
      const ref = doc(db, 'files', fileId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;

      const data = snap.data();
      return {
        ...data,
        createdAt: fromFirestoreDate(data.createdAt),
        updatedAt: fromFirestoreDate(data.updatedAt),
      } as ProjectFile;
    } catch (error) {
      console.error('[v0] Failed to get file:', error);
      return null;
    }
  },

  /**
   * Get all files in a project
   */
  async getByProject(projectId: string): Promise<ProjectFile[]> {
    try {
      const q = query(
        collection(db, 'files'),
        where('projectId', '==', projectId)
      );
      const snap = await getDocs(q);
      return snap.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          createdAt: fromFirestoreDate(data.createdAt),
          updatedAt: fromFirestoreDate(data.updatedAt),
        } as ProjectFile;
      });
    } catch (error) {
      console.error('[v0] Failed to get files:', error);
      return [];
    }
  },

  /**
   * Update file (including lock)
   */
  async update(fileId: string, updates: Partial<ProjectFile>): Promise<void> {
    try {
      const ref = doc(db, 'files', fileId);
      await updateDoc(ref, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('[v0] Failed to update file:', error);
      throw error;
    }
  },
};

// ============================================================================
// EVENT OPERATIONS
// ============================================================================

export const eventAdapter = {
  /**
   * Add event to audit trail
   */
  async add(event: Event): Promise<void> {
    try {
      const ref = doc(db, 'events', event.id);
      await setDoc(ref, {
        ...event,
        timestamp: toFirestoreDate(event.timestamp),
      });
    } catch (error) {
      console.error('[v0] Failed to add event:', error);
      throw error;
    }
  },

  /**
   * Get events for a workspace
   */
  async getByWorkspace(
    workspaceId: string,
    constraints: QueryConstraint[] = []
  ): Promise<Event[]> {
    try {
      const baseConstraints = [
        where('workspaceId', '==', workspaceId),
        orderBy('timestamp', 'desc'),
        limit(1000),
      ];
      const q = query(collection(db, 'events'), ...baseConstraints, ...constraints);
      const snap = await getDocs(q);
      return snap.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          timestamp: fromFirestoreDate(data.timestamp),
        } as Event;
      });
    } catch (error) {
      console.error('[v0] Failed to get events:', error);
      return [];
    }
  },

  /**
   * Get events for a specific entity (project, file, etc)
   */
  async getByEntity(
    workspaceId: string,
    entityId: string
  ): Promise<Event[]> {
    try {
      const q = query(
        collection(db, 'events'),
        where('workspaceId', '==', workspaceId),
        where('entityId', '==', entityId),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          timestamp: fromFirestoreDate(data.timestamp),
        } as Event;
      });
    } catch (error) {
      console.error('[v0] Failed to get entity events:', error);
      return [];
    }
  },

  /**
   * Subscribe to events in real-time
   */
  onChanged(workspaceId: string, callback: (events: Event[]) => void) {
    try {
      const q = query(
        collection(db, 'events'),
        where('workspaceId', '==', workspaceId),
        orderBy('timestamp', 'desc'),
        limit(500)
      );
      return onSnapshot(q, (snap) => {
        const events = snap.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            timestamp: fromFirestoreDate(data.timestamp),
          } as Event;
        });
        callback(events);
      });
    } catch (error) {
      console.error('[v0] Failed to subscribe to events:', error);
      return () => {};
    }
  },
};

// ============================================================================
// PRESENCE OPERATIONS
// ============================================================================

export const presenceAdapter = {
  /**
   * Update presence (heartbeat)
   */
  async update(userId: string, workspaceId: string, presence: Partial<Presence>): Promise<void> {
    try {
      const presenceId = `${userId}_${workspaceId}`;
      const ref = doc(db, 'presence', presenceId);
      await setDoc(ref, {
        userId,
        workspaceId,
        ...presence,
        lastSeen: Timestamp.now(),
      }, { merge: true });
    } catch (error) {
      console.error('[v0] Failed to update presence:', error);
    }
  },

  /**
   * Get all online users in a workspace
   */
  async getOnlineUsers(workspaceId: string): Promise<Presence[]> {
    try {
      const q = query(
        collection(db, 'presence'),
        where('workspaceId', '==', workspaceId),
        where('isOnline', '==', true)
      );
      const snap = await getDocs(q);
      return snap.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          lastSeen: fromFirestoreDate(data.lastSeen),
        } as Presence;
      });
    } catch (error) {
      console.error('[v0] Failed to get online users:', error);
      return [];
    }
  },

  /**
   * Subscribe to presence changes
   */
  onChanged(workspaceId: string, callback: (users: Presence[]) => void) {
    try {
      const q = query(
        collection(db, 'presence'),
        where('workspaceId', '==', workspaceId)
      );
      return onSnapshot(q, (snap) => {
        const users = snap.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            lastSeen: fromFirestoreDate(data.lastSeen),
          } as Presence;
        });
        callback(users);
      });
    } catch (error) {
      console.error('[v0] Failed to subscribe to presence:', error);
      return () => {};
    }
  },
};

// ============================================================================
// SNAPSHOT OPERATIONS
// ============================================================================

export const snapshotAdapter = {
  /**
   * Create a snapshot (version)
   */
  async create(snapshot: Snapshot): Promise<void> {
    try {
      const ref = doc(db, 'snapshots', snapshot.id);
      await setDoc(ref, {
        ...snapshot,
        createdAt: toFirestoreDate(snapshot.createdAt),
      });
    } catch (error) {
      console.error('[v0] Failed to create snapshot:', error);
      throw error;
    }
  },

  /**
   * Get snapshots for a project
   */
  async getByProject(projectId: string): Promise<Snapshot[]> {
    try {
      const q = query(
        collection(db, 'snapshots'),
        where('projectId', '==', projectId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          createdAt: fromFirestoreDate(data.createdAt),
        } as Snapshot;
      });
    } catch (error) {
      console.error('[v0] Failed to get snapshots:', error);
      return [];
    }
  },
};

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export const batchAdapter = {
  /**
   * Batch add multiple events (useful for event queue flush)
   */
  async addEvents(events: Event[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      events.forEach((event) => {
        const ref = doc(db, 'events', event.id);
        batch.set(ref, {
          ...event,
          timestamp: toFirestoreDate(event.timestamp),
        });
      });
      await batch.commit();
    } catch (error) {
      console.error('[v0] Failed to batch add events:', error);
      throw error;
    }
  },
};
