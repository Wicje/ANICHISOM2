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
  ResourceRelevance,
  RestoreResult,
  RestorePlan,
} from '@/lib/continuity/types';
import type { DeviceCapabilities } from '@/lib/capabilities';
import { useAuthStore } from './auth.store';

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
  restoreWorkspace: (workspace: WorkspaceSnapshot, caps: DeviceCapabilities) => Promise<RestorePlan>;
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

    // Start auto-save if capturing
    if (autoSaveTimer) clearInterval(autoSaveTimer);
    autoSaveTimer = setInterval(() => {
      const state = get();
      if (state.isCapturing && state.activeWorkspace) {
        state.saveWorkspace();
      }
    }, AUTO_SAVE_INTERVAL_MS);
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

  stopCapture: () => {
    const state = get();
    if (state.activeWorkspace) {
      // Save before stopping
      state.saveWorkspace();
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
                  dwellTimeMs: r.dwellTimeMs,
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
          set({ recentWorkspaces: data.data || [] });
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

  restoreWorkspace: async (workspace, caps) => {
    set({ isRestoring: true });

    const results: RestoreResult[] = [];

    for (const resource of workspace.resources) {
      let status: RestoreResult['status'] = 'skipped';
      let restoredUrl: string | undefined;
      let reason: string | undefined;

      switch (resource.type) {
        case 'url': {
          // Web resources can always be opened in a browser
          if (caps.hasWebWorkers || caps.hasServiceWorker) {
            status = 'restored';
            restoredUrl = resource.metadata.url || resource.identifier;
          } else {
            status = 'unavailable';
            reason = 'No browser available';
          }
          break;
        }
        case 'application': {
          // App restoration depends on the app being available
          // For web apps (running in Continua shell), always available
          status = 'restored';
          restoredUrl = resource.identifier;
          break;
        }
        case 'file': {
          // Files can be opened if they exist in the file system
          // For now, mark as restored (the file system is per-device)
          status = 'restored';
          break;
        }
        case 'note': {
          status = 'restored';
          break;
        }
      }

      results.push({
        resourceId: resource.id,
        resource,
        status,
        reason,
        restoredUrl,
      });
    }

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

if (typeof window !== 'undefined') {
  // Capture browser tab changes
  window.addEventListener('os:tab-opened', ((e: CustomEvent) => {
    const { url, title } = e.detail || {};
    if (url) {
      useContinuityStore.getState().addResource({
        type: 'url',
        identifier: url,
        name: title || url,
        metadata: { url, title },
        relevance: 'medium',
        source: '',
      });
    }
  }) as EventListener);

  // Capture file opens from the file manager
  window.addEventListener('os:file-opened', ((e: CustomEvent) => {
    const { file, appId } = e.detail || {};
    if (file) {
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
        source: '',
      });
    }
  }) as EventListener);

  // Capture app focus changes
  window.addEventListener('os:app-focused', ((e: CustomEvent) => {
    const { appId, title } = e.detail || {};
    if (appId) {
      useContinuityStore.getState().addResource({
        type: 'application',
        identifier: appId,
        name: title || appId,
        metadata: { appId, appTitle: title },
        relevance: 'medium',
        source: '',
      });
    }
  }) as EventListener);
}
