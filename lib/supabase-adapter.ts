/**
 * ANICHISOM OS: Supabase CRUD Adapter
 *
 * All database operations for workspaces, projects, files, events, presence
 * Replaces firestore-adapter.ts — uses Supabase Postgres instead of Firestore
 */

import { getSupabase } from './supabase';
import type { Database } from './supabase-types';
import {
  Workspace,
  Project,
  ProjectFile,
  Event,
  Presence,
  Snapshot,
} from './workspace-types';

type SupabaseDB = Database;

function client() {
  return getSupabase();
}

// ============================================================================
// HELPERS
// ============================================================================

/** Parse a timestamp/string column into a JS Date */
function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val === 'string' || typeof val === 'number') return new Date(val);
  return new Date();
}

/** Serialize dates in a nested object to ISO strings for Supabase */
function serializeDates(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...obj };
  for (const [k, v] of Object.entries(out)) {
    if (v instanceof Date) out[k] = v.toISOString();
    else if (Array.isArray(v)) {
      out[k] = v.map((item) =>
        item instanceof Date ? item.toISOString() : item
      );
    }
  }
  return out;
}

/** Unserialize ISO strings back to Dates in a row */
function unserializeDates(row: Record<string, unknown>, dateFields: string[]): Record<string, unknown> {
  const out = { ...row };
  for (const field of dateFields) {
    if (out[field]) out[field] = toDate(out[field]);
  }
  return out;
}

// ============================================================================
// WORKSPACE OPERATIONS
// ============================================================================

export const workspaceAdapter = {
  async create(workspace: Workspace): Promise<void> {
    try {
      await client().from('workspaces').upsert({
        id: workspace.id,
        name: workspace.name,
        ownerId: workspace.ownerId,
        isPrivate: workspace.isPrivate,
        members: workspace.members.map((m) => ({
          ...m,
          joinedAt: m.joinedAt.toISOString(),
        })),
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error('[v0] Failed to create workspace:', error);
      throw error;
    }
  },

  async get(workspaceId: string): Promise<Workspace | null> {
    try {
      const { data, error } = await client()
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();
      if (error || !data) return null;
      return {
        ...data,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
        members: (data.members ?? []).map((m: Record<string, unknown>) => ({
          ...m,
          joinedAt: toDate(m.joinedAt),
        })),
      } as Workspace;
    } catch (error) {
      console.error('[v0] Failed to get workspace:', error);
      return null;
    }
  },

  async getByUser(userId: string): Promise<Workspace[]> {
    try {
      const { data, error } = await client()
        .from('workspaces')
        .select('*')
        .contains('members', [{ userId }]);
      if (error || !data) return [];
      return data.map((row: Record<string, unknown>) => ({
        ...row,
        createdAt: toDate(row.createdAt),
        updatedAt: toDate(row.updatedAt),
        members: (row.members as Record<string, unknown>[] ?? []).map((m: Record<string, unknown>) => ({
          ...m,
          joinedAt: toDate(m.joinedAt),
        })),
      })) as Workspace[];
    } catch (error) {
      console.error('[v0] Failed to get user workspaces:', error);
      return [];
    }
  },

  async update(workspaceId: string, updates: Partial<Workspace>): Promise<void> {
    try {
      const payload: Record<string, unknown> = { ...updates, updatedAt: new Date().toISOString() };
      if (updates.members) {
        payload.members = updates.members.map((m) => ({
          ...m,
          joinedAt: m.joinedAt instanceof Date ? m.joinedAt.toISOString() : m.joinedAt,
        }));
      }
      await client().from('workspaces').update(payload).eq('id', workspaceId);
    } catch (error) {
      console.error('[v0] Failed to update workspace:', error);
      throw error;
    }
  },

  onChanged(workspaceId: string, callback: (ws: Workspace | null) => void) {
    const channel = client()
      .channel(`workspace:${workspaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workspaces', filter: `id=eq.${workspaceId}` },
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          if (payload.eventType === 'DELETE') {
            callback(null);
            return;
          }
          const row = payload.new;
          callback({
            ...row,
            createdAt: toDate(row.createdAt),
            updatedAt: toDate(row.updatedAt),
            members: (row.members as Record<string, unknown>[] ?? []).map((m: Record<string, unknown>) => ({
              ...m,
              joinedAt: toDate(m.joinedAt),
            })),
          } as Workspace);
        }
      )
      .subscribe();

    return () => {
      client().removeChannel(channel);
    };
  },
};

// ============================================================================
// PROJECT OPERATIONS
// ============================================================================

export const projectAdapter = {
  async create(project: Project): Promise<void> {
    try {
      await client().from('projects').upsert({
        id: project.id,
        workspaceId: project.workspaceId,
        name: project.name,
        clientId: project.clientId,
        brief: project.brief,
        status: project.status,
        phase: project.phase,
        timeline: {
          ...project.timeline,
          startDate: project.timeline.startDate.toISOString(),
          endDate: project.timeline.endDate.toISOString(),
          milestones: project.timeline.milestones.map((m) => ({
            ...m,
            date: m.date.toISOString(),
          })),
        },
        team: project.team ?? [],
        deliverables: project.deliverables.map((d) => ({
          ...d,
          dueDate: d.dueDate.toISOString(),
        })),
        createdBy: project.createdBy,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error('[v0] Failed to create project:', error);
      throw error;
    }
  },

  async get(projectId: string): Promise<Project | null> {
    try {
      const { data, error } = await client()
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      if (error || !data) return null;
      return {
        ...data,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
        timeline: {
          ...data.timeline,
          startDate: toDate(data.timeline?.startDate),
          endDate: toDate(data.timeline?.endDate),
          milestones: (data.timeline?.milestones ?? []).map((m: Record<string, unknown>) => ({
            ...m,
            date: toDate(m.date),
          })),
        },
        deliverables: (data.deliverables ?? []).map((d: Record<string, unknown>) => ({
          ...d,
          dueDate: toDate(d.dueDate),
        })),
      } as Project;
    } catch (error) {
      console.error('[v0] Failed to get project:', error);
      return null;
    }
  },

  async getByWorkspace(workspaceId: string): Promise<Project[]> {
    try {
      const { data, error } = await client()
        .from('projects')
        .select('*')
        .eq('workspaceId', workspaceId)
        .order('updatedAt', { ascending: false });
      if (error || !data) return [];
      return data.map((row: Record<string, unknown>) => ({
        ...row,
        createdAt: toDate(row.createdAt),
        updatedAt: toDate(row.updatedAt),
        timeline: {
          ...(row.timeline as Record<string, unknown>),
          startDate: toDate((row.timeline as Record<string, unknown>)?.startDate),
          endDate: toDate((row.timeline as Record<string, unknown>)?.endDate),
          milestones: ((row.timeline as Record<string, unknown>)?.milestones as Record<string, unknown>[] ?? []).map((m: Record<string, unknown>) => ({
            ...m,
            date: toDate(m.date),
          })),
        },
        deliverables: (row.deliverables as Record<string, unknown>[] ?? []).map((d: Record<string, unknown>) => ({
          ...d,
          dueDate: toDate(d.dueDate),
        })),
      })) as Project[];
    } catch (error) {
      console.error('[v0] Failed to get projects:', error);
      return [];
    }
  },

  async update(projectId: string, updates: Partial<Project>): Promise<void> {
    try {
      const payload: Record<string, unknown> = { ...updates, updatedAt: new Date().toISOString() };
      if (updates.timeline) {
        payload.timeline = {
          ...updates.timeline,
          startDate: updates.timeline.startDate.toISOString(),
          endDate: updates.timeline.endDate.toISOString(),
          milestones: updates.timeline.milestones.map((m) => ({
            ...m,
            date: m.date.toISOString(),
          })),
        };
      }
      if (updates.deliverables) {
        payload.deliverables = updates.deliverables.map((d) => ({
          ...d,
          dueDate: d.dueDate.toISOString(),
        }));
      }
      await client().from('projects').update(payload).eq('id', projectId);
    } catch (error) {
      console.error('[v0] Failed to update project:', error);
      throw error;
    }
  },

  onChanged(projectId: string, callback: (p: Project | null) => void) {
    const channel = client()
      .channel(`project:${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` },
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          if (payload.eventType === 'DELETE') {
            callback(null);
            return;
          }
          const row = payload.new;
          callback({
            ...row,
            createdAt: toDate(row.createdAt),
            updatedAt: toDate(row.updatedAt),
            timeline: {
              ...(row.timeline as Record<string, unknown>),
              startDate: toDate((row.timeline as Record<string, unknown>)?.startDate),
              endDate: toDate((row.timeline as Record<string, unknown>)?.endDate),
              milestones: ((row.timeline as Record<string, unknown>)?.milestones as Record<string, unknown>[] ?? []).map((m: Record<string, unknown>) => ({
                ...m,
                date: toDate(m.date),
              })),
            },
            deliverables: (row.deliverables as Record<string, unknown>[] ?? []).map((d: Record<string, unknown>) => ({
              ...d,
              dueDate: toDate(d.dueDate),
            })),
          } as Project);
        }
      )
      .subscribe();

    return () => {
      client().removeChannel(channel);
    };
  },
};

// ============================================================================
// FILE OPERATIONS
// ============================================================================

export const fileAdapter = {
  async create(file: ProjectFile): Promise<void> {
    try {
      await client().from('files').upsert({
        id: file.id,
        projectId: file.projectId,
        name: file.name,
        type: file.type,
        url: file.url,
        editingUserId: file.editingUserId ?? null,
        editingSessionId: file.editingSessionId ?? null,
        createdBy: file.createdBy,
        fileSize: file.fileSize ?? null,
        mimeType: file.mimeType ?? null,
        createdAt: file.createdAt.toISOString(),
        updatedAt: file.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error('[v0] Failed to create file:', error);
      throw error;
    }
  },

  async get(fileId: string): Promise<ProjectFile | null> {
    try {
      const { data, error } = await client()
        .from('files')
        .select('*')
        .eq('id', fileId)
        .single();
      if (error || !data) return null;
      return {
        ...data,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      } as ProjectFile;
    } catch (error) {
      console.error('[v0] Failed to get file:', error);
      return null;
    }
  },

  async getByProject(projectId: string): Promise<ProjectFile[]> {
    try {
      const { data, error } = await client()
        .from('files')
        .select('*')
        .eq('projectId', projectId);
      if (error || !data) return [];
      return data.map((row: Record<string, unknown>) => ({
        ...row,
        createdAt: toDate(row.createdAt),
        updatedAt: toDate(row.updatedAt),
      })) as ProjectFile[];
    } catch (error) {
      console.error('[v0] Failed to get files:', error);
      return [];
    }
  },

  async update(fileId: string, updates: Partial<ProjectFile>): Promise<void> {
    try {
      const payload: Record<string, unknown> = { ...updates, updatedAt: new Date().toISOString() };
      await client().from('files').update(payload).eq('id', fileId);
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
  async add(event: Event): Promise<void> {
    try {
      await client().from('events').upsert({
        id: event.id,
        workspaceId: event.workspaceId,
        entityId: event.entityId,
        type: event.type,
        userId: event.userId,
        oldValue: event.oldValue ?? null,
        newValue: event.newValue ?? null,
        comment: event.comment ?? null,
        metadata: event.metadata ?? {},
        timestamp: event.timestamp.toISOString(),
      });
    } catch (error) {
      console.error('[v0] Failed to add event:', error);
      throw error;
    }
  },

  async getByWorkspace(
    workspaceId: string,
    _constraints: Array<Record<string, unknown>> = []
  ): Promise<Event[]> {
    try {
      // Extract limit from constraints (only constraint Supabase adapter needs)
      let limitVal = 1000;
      for (const c of _constraints) {
        if (typeof c === 'object' && c !== null && typeof c._limit === 'number') {
          limitVal = c._limit;
        }
      }

      const { data, error } = await client()
        .from('events')
        .select('*')
        .eq('workspaceId', workspaceId)
        .order('timestamp', { ascending: false })
        .limit(limitVal);
      if (error || !data) return [];
      return data.map((row: Record<string, unknown>) => ({
        ...row,
        timestamp: toDate(row.timestamp),
      })) as Event[];
    } catch (error) {
      console.error('[v0] Failed to get events:', error);
      return [];
    }
  },

  async getByEntity(workspaceId: string, entityId: string): Promise<Event[]> {
    try {
      const { data, error } = await client()
        .from('events')
        .select('*')
        .eq('workspaceId', workspaceId)
        .eq('entityId', entityId)
        .order('timestamp', { ascending: false });
      if (error || !data) return [];
      return data.map((row: Record<string, unknown>) => ({
        ...row,
        timestamp: toDate(row.timestamp),
      })) as Event[];
    } catch (error) {
      console.error('[v0] Failed to get entity events:', error);
      return [];
    }
  },

  onChanged(workspaceId: string, callback: (events: Event[]) => void) {
    // Initial fetch
    let currentEvents: Event[] = [];

    const fetchEvents = async () => {
      const { data } = await client()
        .from('events')
        .select('*')
        .eq('workspaceId', workspaceId)
        .order('timestamp', { ascending: false })
        .limit(500);
      if (data) {
        currentEvents = data.map((row: Record<string, unknown>) => ({
          ...row,
          timestamp: toDate(row.timestamp),
        })) as Event[];
        callback(currentEvents);
      }
    };

    fetchEvents();

    const channel = client()
      .channel(`events:${workspaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `workspaceId=eq.${workspaceId}` },
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          if (payload.eventType === 'DELETE') {
            currentEvents = currentEvents.filter((e) => e.id !== payload.old?.id);
          } else {
            const row = payload.new;
            const evt = {
              ...row,
              timestamp: toDate(row.timestamp),
            } as Event;
            if (payload.eventType === 'INSERT') {
              currentEvents.unshift(evt);
            } else {
              currentEvents = currentEvents.map((e) => (e.id === evt.id ? evt : e));
            }
          }
          callback([...currentEvents]);
        }
      )
      .subscribe();

    return () => {
      client().removeChannel(channel);
    };
  },
};

// ============================================================================
// PRESENCE OPERATIONS
// ============================================================================

export const presenceAdapter = {
  async update(userId: string, workspaceId: string, presence: Partial<Presence>): Promise<void> {
    try {
      const presenceId = `${userId}_${workspaceId}`;
      await client().from('presence').upsert({
        id: presenceId,
        userId,
        workspaceId,
        ...presence,
        lastSeen: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[v0] Failed to update presence:', error);
    }
  },

  async getOnlineUsers(workspaceId: string): Promise<Presence[]> {
    try {
      const { data, error } = await client()
        .from('presence')
        .select('*')
        .eq('workspaceId', workspaceId)
        .eq('isOnline', true);
      if (error || !data) return [];
      return data.map((row: Record<string, unknown>) => ({
        ...row,
        lastSeen: toDate(row.lastSeen),
      })) as Presence[];
    } catch (error) {
      console.error('[v0] Failed to get online users:', error);
      return [];
    }
  },

  onChanged(workspaceId: string, callback: (users: Presence[]) => void) {
    const channel = client()
      .channel(`presence:${workspaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'presence', filter: `workspaceId=eq.${workspaceId}` },
        () => {
          // On any change, refetch all online users
          presenceAdapter.getOnlineUsers(workspaceId).then(callback);
        }
      )
      .subscribe();

    return () => {
      client().removeChannel(channel);
    };
  },
};

// ============================================================================
// SNAPSHOT OPERATIONS
// ============================================================================

export const snapshotAdapter = {
  async create(snapshot: Snapshot): Promise<void> {
    try {
      await client().from('snapshots').upsert({
        id: snapshot.id,
        projectId: snapshot.projectId,
        workspaceId: snapshot.workspaceId,
        name: snapshot.name,
        data: snapshot.data,
        createdBy: snapshot.createdBy,
        createdAt: snapshot.createdAt.toISOString(),
      });
    } catch (error) {
      console.error('[v0] Failed to create snapshot:', error);
      throw error;
    }
  },

  async getByProject(projectId: string): Promise<Snapshot[]> {
    try {
      const { data, error } = await client()
        .from('snapshots')
        .select('*')
        .eq('projectId', projectId)
        .order('createdAt', { ascending: false });
      if (error || !data) return [];
      return data.map((row: Record<string, unknown>) => ({
        ...row,
        createdAt: toDate(row.createdAt),
      })) as Snapshot[];
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
  async addEvents(events: Event[]): Promise<void> {
    try {
      const rows = events.map((e) => ({
        id: e.id,
        workspaceId: e.workspaceId,
        entityId: e.entityId,
        type: e.type,
        userId: e.userId,
        oldValue: e.oldValue ?? null,
        newValue: e.newValue ?? null,
        comment: e.comment ?? null,
        metadata: e.metadata ?? {},
        timestamp: e.timestamp.toISOString(),
      }));
      // Supabase supports up to 1000 rows per insert
      const BATCH_SIZE = 1000;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        await client().from('events').upsert(rows.slice(i, i + BATCH_SIZE));
      }
    } catch (error) {
      console.error('[v0] Failed to batch add events:', error);
      throw error;
    }
  },
};
