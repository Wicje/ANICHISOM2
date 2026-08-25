'use client';

/**
 * Team Store — workspace shares and org presence.
 *
 * Manages sharing workspaces with team members and tracking
 * who is active in the organization.
 */
import { create } from 'zustand';
import { useAuthStore } from '@/lib/stores/auth.store';

interface WorkspaceShare {
  id: string;
  workspaceId: string;
  sharedBy: string;
  sharedWith: string | null;
  orgId: string | null;
  permission: 'view' | 'edit' | 'admin';
  createdAt: number;
}

interface OrgPresence {
  userId: string;
  orgId: string;
  deviceName: string;
  deviceType: string;
  lastHeartbeatAt: number;
}

interface TeamState {
  shares: WorkspaceShare[];
  presence: OrgPresence[];
  sharesLoading: boolean;
  presenceLoading: boolean;
  error: string | null;

  shareWorkspace: (workspaceId: string, email: string, permission?: 'view' | 'edit') => Promise<boolean>;
  unshareWorkspace: (shareId: string, workspaceId: string) => Promise<boolean>;
  loadShares: (workspaceId: string) => Promise<void>;
  loadOrgPresence: (orgId: string) => Promise<void>;
  getSharesForWorkspace: (workspaceId: string) => WorkspaceShare[];
  getActiveMembers: () => OrgPresence[];
}

export const useTeamStore = create<TeamState>((set, get) => ({
  shares: [],
  presence: [],
  sharesLoading: false,
  presenceLoading: false,
  error: null,

  shareWorkspace: async (workspaceId, email, permission = 'view') => {
    const user = useAuthStore.getState().currentUser;
    if (!user) return false;

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, permission }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        set(state => ({
          shares: [...state.shares, {
            id: data.data.id,
            workspaceId,
            sharedBy: user.id,
            sharedWith: null,
            orgId: null,
            permission,
            createdAt: Date.now(),
          }],
        }));
        return true;
      }
      set({ error: data.error || 'Failed to share' });
    } catch (err) {
      console.error('[team] Share failed:', err);
      set({ error: 'Network error' });
    }
    return false;
  },

  unshareWorkspace: async (shareId, workspaceId) => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/unshare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId }),
      });

      if (res.ok) {
        set(state => ({
          shares: state.shares.filter(s => s.id !== shareId),
        }));
        return true;
      }
    } catch (err) {
      console.error('[team] Unshare failed:', err);
    }
    return false;
  },

  loadShares: async (workspaceId) => {
    set({ sharesLoading: true, error: null });
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/shares`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const fetched = (data.data || []).map((s: any) => ({
            id: s.id,
            workspaceId: s.workspace_id?.replace('workspace_snapshot_', '') || workspaceId,
            sharedBy: s.shared_by,
            sharedWith: s.shared_with,
            orgId: s.org_id || null,
            permission: s.permission || 'view',
            createdAt: s.created_at ? new Date(s.created_at).getTime() : Date.now(),
          }));
          set(state => {
            // Merge with existing, avoiding duplicates
            const existingIds = new Set(state.shares.map(s => s.id));
            const newShares = fetched.filter((s: WorkspaceShare) => !existingIds.has(s.id));
            return { shares: [...state.shares, ...newShares] };
          });
        }
      }
    } catch {
      set({ error: 'Failed to load shares' });
    } finally {
      set({ sharesLoading: false });
    }
  },

  loadOrgPresence: async (orgId) => {
    set({ presenceLoading: true, error: null });
    try {
      const res = await fetch(`/api/orgs/${orgId}/presence`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          set({ presence: data.data || [] });
        }
      }
    } catch {
      set({ error: 'Failed to load presence' });
    } finally {
      set({ presenceLoading: false });
    }
  },

  getSharesForWorkspace: (workspaceId) => {
    return get().shares.filter(s => s.workspaceId === workspaceId);
  },

  getActiveMembers: () => {
    const now = Date.now();
    const fiveMinutesMs = 5 * 60 * 1000;
    const presence = get().presence;

    const seen = new Set<string>();
    return presence.filter(p => {
      if (now - p.lastHeartbeatAt > fiveMinutesMs) return false;
      if (seen.has(p.userId)) return false;
      seen.add(p.userId);
      return true;
    });
  },
}));
