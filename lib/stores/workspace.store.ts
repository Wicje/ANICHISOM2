import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { syncQueue } from '@/lib/sync-queue';
import { Workspace, Event } from '@/lib/workspace-types';

export type WorkspaceMode = 'private' | 'agency';

export type Snapshot = {
  id: string;
  timestamp: number;
  name: string;
  windows: any[];
};

type WorkspaceState = {
  workspaceMode: WorkspaceMode;
  activeWorkspace: number;
  installedApps: string[];
  recentApps: string[];
  snapshots: Snapshot[];
  workspaceId: string;
  workspaces: Workspace[];
  mode: 'create' | 'review' | 'present';
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  setActiveWorkspace: (id: number) => void;
  installApp: (appId: string) => void;
  uninstallApp: (appId: string) => void;
  saveSnapshot: (name: string, windows: Snapshot['windows']) => void;
  restoreSnapshot: (id: string) => Snapshot | null;
  setWorkspaceId: (id: string) => void;
  setWorkspaces: (ws: Workspace[]) => void;
  setMode: (mode: 'create' | 'review' | 'present') => void;
  emitEvent: (event: Omit<Event, 'id' | 'timestamp'>) => void;
  addRecentApp: (appId: string) => void;
  loadPersisted: () => Promise<void>;
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaceMode: 'private',
  activeWorkspace: 0,
  installedApps: [],
  recentApps: [],
  snapshots: [],
  workspaceId: 'personal',
  workspaces: [],
  mode: 'create',

  setWorkspaceMode: (workspaceMode) => set({ workspaceMode }),
  setActiveWorkspace: (activeWorkspace) => set({ activeWorkspace }),

  installApp: (appId) => {
    const { installedApps } = get();
    if (!installedApps.includes(appId)) {
      set({ installedApps: [...installedApps, appId] });
    }
  },

  uninstallApp: (appId) => {
    set((s) => ({
      installedApps: s.installedApps.filter((id) => id !== appId),
    }));
  },

  saveSnapshot: (name, windows) => {
    const newSnapshot: Snapshot = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      name,
      windows: structuredClone(windows),
    };
    set((s) => {
      const updated = [newSnapshot, ...s.snapshots];
      idbSet('anichisom_os_snapshots', updated);
      return { snapshots: updated };
    });
  },

  restoreSnapshot: (id) => {
    const { snapshots } = get();
    return snapshots.find((s) => s.id === id) || null;
  },

  setWorkspaceId: (workspaceId) => set({ workspaceId }),
  setWorkspaces: (workspaces) => set({ workspaces }),
  setMode: (mode) => set({ mode }),

  emitEvent: (eventData) => {
    const event: Event = {
      ...eventData,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    syncQueue.enqueue(event);
  },

  addRecentApp: (appId) => {
    set((s) => {
      const next = [appId, ...s.recentApps.filter((id) => id !== appId)].slice(0, 5);
      return { recentApps: next };
    });
  },

  loadPersisted: async () => {
    const snapshots = await idbGet('anichisom_os_snapshots');
    if (snapshots) set({ snapshots });
  },
}));
