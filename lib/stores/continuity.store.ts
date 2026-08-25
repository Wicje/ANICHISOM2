/**
 * Continuity Store — workspace capture, sync, and restore.
 *
 * The core store for the continuity engine. Tracks the user's active
 * workspace and syncs it to the cloud for cross-device restoration.
 */
import { create } from 'zustand';
import type {
  WorkspaceSnapshot,
  WorkspaceResource,
  ResourceType,
  RestoreResult,
  RestorePlan,
} from '@/lib/continuity/types';
import type { DeviceCapabilities } from '@/lib/capabilities';
import { useAuthStore } from './auth.store';
import { useDeviceStore } from './device.store';
import { buildSmartRestoreResults } from '@/lib/continuity/smart-restore';

const AUTO_SAVE_INTERVAL_MS = 30_000; // 30 seconds

let autoSaveTimer: ReturnType<typeof setInterval> | null = null;

function makeId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `ws-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makeResourceId(type: ResourceType, identifier: string): string {
  return `${type}:${identifier}`;
}

type ContinuityState = {
  // Active workspace
  activeWorkspace: WorkspaceSnapshot | null;
  recentWorkspaces: WorkspaceSnapshot[];
  isCapturing: boolean;

  // Restore state
  isRestoring: boolean;
  restorePlan: RestorePlan | null;

  // Actions
  initialize: () => Promise<void>;
  startCapture: (name?: string) => void;
  stopCapture: () => void;
  addResource: (resource: Omit<WorkspaceResource, 'id' | 'firstAccessed' | 'lastAccessed' | 'accessCount' | 'dwellTimeMs'>) => void;
  updateResource: (resourceId: string, updates: Partial<WorkspaceResource>) => void;
  removeResource: (resourceId: string) => void;
  setActiveTask: (task: string) => void;
  renameWorkspace: (name: string) => void;
  saveWorkspace: () => Promise<void>;
  loadWorkspaces: () => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  restoreWorkspace: (workspace: WorkspaceSnapshot, caps: DeviceCapabilities, selectedIds?: Set<string>) => Promise<RestorePlan>;
  getActiveResources: () => WorkspaceResource[];
};

export const useContinuityStore = create<ContinuityState>((set, get) => ({
  activeWorkspace: null,
  recentWorkspaces: [],
  isCapturing: false,
  isRestoring: false,
  restorePlan: null,

  initialize: async () => {
    await get().loadWorkspaces();

    // Auto-resume most recent workspace or start a new one
    const state = get();
    if (!state.isCapturing && !state.activeWorkspace) {
      const recent = [...state.recentWorkspaces].sort(
        (a, b) => (b.syncedAt || b.capturedAt) - (a.syncedAt || a.capturedAt)
      );
      if (recent.length > 0) {
        const r = recent[0]!;
        const resumed: WorkspaceSnapshot = {
          id: r.id,
          userId: r.userId,
          name: r.name,
          activeTask: r.activeTask || '',
          resources: r.resources || [],
          deviceCapabilities: r.deviceCapabilities || ({} as DeviceCapabilities),
          capturedAt: r.capturedAt || Date.now(),
          syncedAt: r.syncedAt || 0,
          isActive: true,
        };
        set({ activeWorkspace: resumed, isCapturing: true });
      } else {
        get().startCapture('Current Session');
      }
    }

    // Start auto-save timer
    if (autoSaveTimer) clearInterval(autoSaveTimer);
    autoSaveTimer = setInterval(() => {
      const s = get();
      if (s.isCapturing && s.activeWorkspace) {
        s.saveWorkspace();
      }
    }, AUTO_SAVE_INTERVAL_MS);

    // Set up event listeners for automatic capture
    setupCaptureListeners();
  },

  startCapture: (name?: string) => {
    const user = useAuthStore.getState().currentUser;
    if (!user) return;

    const workspace: WorkspaceSnapshot = {
      id: makeId(),
      userId: user.id,
      name: name || 'Untitled Workspace',
      activeTask: '',
      resources: [],
      deviceCapabilities: {} as DeviceCapabilities, // filled on save
      capturedAt: Date.now(),
      syncedAt: 0,
      isActive: true,
    };

    set({ activeWorkspace: workspace, isCapturing: true });

    window.dispatchEvent(new CustomEvent('os:notify', {
      detail: { title: 'Workspace Capture Started', description: `Tracking: ${workspace.name}`, type: 'info' },
    }));
  },

  stopCapture: async () => {
    const state = get();
    if (state.activeWorkspace) {
      await state.saveWorkspace();
    }
    set({ isCapturing: false });
  },

  addResource: (resource) => {
    const state = get();
    if (!state.activeWorkspace) return;

    const resourceId = makeResourceId(resource.type, resource.identifier);
    const existing = state.activeWorkspace.resources.find(r => r.id === resourceId);

    if (existing) {
      // Update existing resource
      set({
        activeWorkspace: {
          ...state.activeWorkspace,
          resources: state.activeWorkspace.resources.map(r =>
            r.id === resourceId
              ? {
                  ...r,
                  lastAccessed: Date.now(),
                  accessCount: r.accessCount + 1,
                  metadata: { ...r.metadata, ...resource.metadata },
                }
              : r
          ),
        },
      });
    } else {
      // Add new resource
      const newResource: WorkspaceResource = {
        id: resourceId,
        type: resource.type,
        identifier: resource.identifier,
        name: resource.name,
        metadata: resource.metadata,
        relevance: resource.relevance || 'medium',
        lastAccessed: Date.now(),
        firstAccessed: Date.now(),
        dwellTimeMs: 0,
        accessCount: 1,
        source: resource.source || '',
      };

      set({
        activeWorkspace: {
          ...state.activeWorkspace,
          resources: [...state.activeWorkspace.resources, newResource],
        },
      });
    }
  },

  updateResource: (resourceId, updates) => {
    const state = get();
    if (!state.activeWorkspace) return;

    set({
      activeWorkspace: {
        ...state.activeWorkspace,
        resources: state.activeWorkspace.resources.map(r =>
          r.id === resourceId ? { ...r, ...updates } : r
        ),
      },
    });
  },

  removeResource: (resourceId) => {
    const state = get();
    if (!state.activeWorkspace) return;

    set({
      activeWorkspace: {
        ...state.activeWorkspace,
        resources: state.activeWorkspace.resources.filter(r => r.id !== resourceId),
      },
    });
  },

  setActiveTask: (task) => {
    const state = get();
    if (!state.activeWorkspace) return;
    set({ activeWorkspace: { ...state.activeWorkspace, activeTask: task } });
  },

  renameWorkspace: (name) => {
    const state = get();
    if (!state.activeWorkspace) return;
    set({ activeWorkspace: { ...state.activeWorkspace, name } });
  },

  saveWorkspace: async () => {
    const state = get();
    if (!state.activeWorkspace) return;

    const { detectCapabilities } = await import('@/lib/capabilities');
    const caps = detectCapabilities();

    const workspace = {
      ...state.activeWorkspace,
      deviceCapabilities: caps,
      syncedAt: Date.now(),
    };

    try {
      const res = await fetch('/api/workspaces/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace }),
      });

      if (res.ok) {
        set({ activeWorkspace: workspace });
      }
    } catch (err) {
      console.error('[continuity] Save failed:', err);
    }
  },

  loadWorkspaces: async () => {
    try {
      const res = await fetch('/api/workspaces');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          set({ recentWorkspaces: (data.data || []) as WorkspaceSnapshot[] });
        }
      }
    } catch {
      // Silently fail
    }
  },

  deleteWorkspace: async (id: string) => {
    try {
      const res = await fetch(`/api/workspaces/${id}`, { method: 'DELETE' });
      if (res.ok) {
        set(state => ({
          recentWorkspaces: state.recentWorkspaces.filter(w => w.id !== id),
        }));
      }
    } catch (err) {
      console.error('[continuity] Delete failed:', err);
    }
  },

  restoreWorkspace: async (workspace, caps, selectedIds) => {
    set({ isRestoring: true });

    const results = buildSmartRestoreResults(workspace.resources, caps, selectedIds);

    const plan: RestorePlan = {
      workspace,
      results,
      restoredCount: results.filter(r => r.status === 'restored').length,
      unavailableCount: results.filter(r => r.status === 'unavailable').length,
      skippedCount: results.filter(r => r.status === 'skipped' || r.status === 'failed').length,
      capabilities: caps,
    };

    set({ restorePlan: plan, isRestoring: false });
    return plan;
  },

  getActiveResources: () => {
    const state = get();
    return state.activeWorkspace?.resources || [];
  },
}));

// ─── Event listeners for automatic resource capture ────────
// Tracked for cleanup to prevent leaks on HMR / multiple initialize() calls.

let captureCleanupFns: (() => void)[] = [];

function setupCaptureListeners() {
  if (typeof window === 'undefined') return;

  // Tear down any previous listeners first
  captureCleanupFns.forEach(fn => fn());
  captureCleanupFns = [];

  const onTabOpened = ((e: CustomEvent) => {
    const { url, title } = e.detail || {};
    if (url) {
      const source = useDeviceStore.getState().deviceId || '';
      useContinuityStore.getState().addResource({
        type: 'url',
        identifier: url,
        name: title || url,
        metadata: { url, title },
        relevance: 'medium',
        source,
      });
    }
  }) as EventListener;

  const onFileOpened = ((e: CustomEvent) => {
    const { file, appId } = e.detail || {};
    if (file) {
      const source = useDeviceStore.getState().deviceId || '';
      useContinuityStore.getState().addResource({
        type: 'file',
        identifier: file.id || file.path,
        name: file.name,
        metadata: {
          filePath: file.path,
          mimeType: file.mimeType,
          fileSize: file.size,
          appId,
        },
        relevance: 'high',
        source,
      });
    }
  }) as EventListener;

  const onAppFocused = ((e: CustomEvent) => {
    const { appId, title } = e.detail || {};
    if (appId) {
      const source = useDeviceStore.getState().deviceId || '';
      useContinuityStore.getState().addResource({
        type: 'application',
        identifier: appId,
        name: title || appId,
        metadata: { appId, appTitle: title },
        relevance: 'medium',
        source,
      });
    }
  }) as EventListener;

  window.addEventListener('os:tab-opened', onTabOpened);
  window.addEventListener('os:file-opened', onFileOpened);
  window.addEventListener('os:app-focused', onAppFocused);

  captureCleanupFns.push(
    () => window.removeEventListener('os:tab-opened', onTabOpened),
    () => window.removeEventListener('os:file-opened', onFileOpened),
    () => window.removeEventListener('os:app-focused', onAppFocused),
  );
}
