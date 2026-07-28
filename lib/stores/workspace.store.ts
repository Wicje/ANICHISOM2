/**
 * Workspace Zustand Store — workspace mode, active workspace, installed apps.
 *
 * All persistence through Context Layer (readDomain/writeDomain).
 */
import { create } from 'zustand';
import { readDomain, writeDomain } from '@/lib/context-layer';
import { syncQueue } from '@/lib/sync-queue';
import { Workspace, Event } from '@/lib/workspace-types';

const DOMAIN = 'workspace';
const LEGACY_SNAPSHOTS_KEY = 'continuaos_os_snapshots';

export type WorkspaceMode = 'private' | 'agency';

export type Snapshot = {
  id: string;
  timestamp: number;
  name: string;
  windows: any[];
};

export type CustomWebApp = {
  id: string;
  title: string;
  url: string;
  iconImage: string; // Favicon URL
};

type WorkspaceState = {
  workspaceMode: WorkspaceMode;
  activeWorkspace: number;
  installedApps: string[];
  customWebApps: CustomWebApp[];
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
  addCustomWebApp: (app: CustomWebApp) => void;
  loadPersisted: () => Promise<void>;
};

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function persistWorkspace(state: WorkspaceState) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    writeDomain(DOMAIN, {
      workspaceMode: state.workspaceMode,
      activeWorkspace: state.activeWorkspace,
      installedApps: state.installedApps,
      customWebApps: state.customWebApps,
      recentApps: state.recentApps,
      snapshots: state.snapshots,
      workspaceId: state.workspaceId,
      mode: state.mode,
    });
  }, 2000);
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaceMode: 'private',
  activeWorkspace: 0,
  installedApps: [],
  customWebApps: [],
  recentApps: [],
  snapshots: [],
  workspaceId: 'personal',
  workspaces: [],
  mode: 'create',

  setWorkspaceMode: (workspaceMode) => { set({ workspaceMode }); persistWorkspace(get()); },
  setActiveWorkspace: (activeWorkspace) => { set({ activeWorkspace }); persistWorkspace(get()); },

  installApp: (appId) => {
    const { installedApps } = get();
    if (!installedApps.includes(appId)) {
      set({ installedApps: [...installedApps, appId] });
      persistWorkspace(get());
    }
  },

  uninstallApp: (appId) => {
    set(s => ({ installedApps: s.installedApps.filter(id => id !== appId), customWebApps: s.customWebApps.filter(app => app.id !== appId) }));
    persistWorkspace(get());
  },

  addCustomWebApp: (app) => {
    set(s => {
      // Don't add if already exists
      if (s.customWebApps.some(a => a.id === app.id)) return s;
      return { 
        customWebApps: [...s.customWebApps, app],
        installedApps: [...s.installedApps, app.id] 
      };
    });
    persistWorkspace(get());
  },

  saveSnapshot: (name, windows) => {
    const newSnapshot: Snapshot = { id: crypto.randomUUID(), timestamp: Date.now(), name, windows: structuredClone(windows) };
    set(s => {
      const updated = [newSnapshot, ...s.snapshots];
      return { snapshots: updated };
    });
    persistWorkspace(get());
  },

  restoreSnapshot: (id) => get().snapshots.find(s => s.id === id) || null,
  setWorkspaceId: (workspaceId) => { set({ workspaceId }); persistWorkspace(get()); },
  setWorkspaces: (workspaces) => set({ workspaces }),
  setMode: (mode) => { set({ mode }); persistWorkspace(get()); },

  emitEvent: (eventData) => {
    const event: Event = { ...eventData, id: crypto.randomUUID(), timestamp: new Date() };
    syncQueue.enqueue(event);
  },

  addRecentApp: (appId) => {
    set(s => ({ recentApps: [appId, ...s.recentApps.filter(id => id !== appId)].slice(0, 5) }));
    persistWorkspace(get());
  },

  loadPersisted: async () => {
    try {
      const ctxData = await readDomain<Partial<WorkspaceState>>(DOMAIN);
      if (ctxData) {
        const patch: Partial<WorkspaceState> = {};
        if (ctxData.workspaceMode) patch.workspaceMode = ctxData.workspaceMode;
        if (typeof ctxData.activeWorkspace === 'number') patch.activeWorkspace = ctxData.activeWorkspace;
        if (ctxData.installedApps?.length) patch.installedApps = ctxData.installedApps;
        if (ctxData.recentApps?.length) patch.recentApps = ctxData.recentApps;
        if (ctxData.snapshots?.length) patch.snapshots = ctxData.snapshots;
        if (ctxData.workspaceId) patch.workspaceId = ctxData.workspaceId;
        if (ctxData.mode) patch.mode = ctxData.mode;
        if (Object.keys(patch).length > 0) set(patch);
        return;
      }
      // Migration: legacy snapshots
      const { get: idbGet } = await import('idb-keyval');
      const snapshots = await idbGet<Snapshot[]>(LEGACY_SNAPSHOTS_KEY);
      if (snapshots) { set({ snapshots }); persistWorkspace(get()); }
    } catch {}
  },
}));
