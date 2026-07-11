/**
 * Privacy Zustand Store — per-app privacy model.
 *
 * Each app can be Private (only owner sees data) or Shared (visible to collaborators).
 * Privacy overrides can be set per-app and per-workspace.
 */
import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';

// ─── Types ────────────────────────────────────────────────────────────────

export type PrivacyLevel = 'private' | 'shared' | 'restricted';

export interface AppPrivacySettings {
  appId: string;
  level: PrivacyLevel;
  allowedUserIds?: string[];   // only for 'restricted' level
  inheritWorkspace?: boolean;  // use workspace default
  updatedAt: number;
}

export interface WorkspacePrivacyDefaults {
  level: PrivacyLevel;
  restrictedUserIds?: string[];
}

// ─── Storage ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'anichisom-privacy-state';

interface PersistedPrivacy {
  appSettings: Record<string, AppPrivacySettings>;
  workspaceDefaults: WorkspacePrivacyDefaults;
}

// ─── State ────────────────────────────────────────────────────────────────

interface PrivacyState {
  appSettings: Record<string, AppPrivacySettings>;
  workspaceDefaults: WorkspacePrivacyDefaults;

  // ─── App Privacy ──────────────────────────────────────────────────
  setAppPrivacy: (appId: string, level: PrivacyLevel, allowedUserIds?: string[]) => void;
  getAppPrivacy: (appId: string) => AppPrivacySettings;
  removeAppPrivacy: (appId: string) => void;
  isAppPrivate: (appId: string) => boolean;
  isAppVisibleToUser: (appId: string, userId: string, ownerUserId: string) => boolean;

  // ─── Workspace Defaults ──────────────────────────────────────────
  setWorkspaceDefault: (level: PrivacyLevel, restrictedUserIds?: string[]) => void;
  getWorkspaceDefault: () => WorkspacePrivacyDefaults;

  // ─── Bulk Operations ─────────────────────────────────────────────
  getAllPrivateApps: () => string[];
  getAllSharedApps: () => string[];
  getAppsWithAccess: (userId: string, ownerUserId: string) => string[];
  getPrivacySummary: () => { private: number; shared: number; restricted: number };

  // ─── Persistence ─────────────────────────────────────────────────
  hydrate: () => Promise<void>;
}

function schedulePersist(state: PrivacyState) {
  const data: PersistedPrivacy = {
    appSettings: state.appSettings,
    workspaceDefaults: state.workspaceDefaults,
  };
  idbSet(STORAGE_KEY, data).catch((e: unknown) => {
    console.warn('[PrivacyStore] Failed to persist:', e);
  });
}

export const usePrivacyStore = create<PrivacyState>((set, get) => ({
  appSettings: {},
  workspaceDefaults: {
    level: 'shared',
    restrictedUserIds: [],
  },

  // ─── App Privacy ──────────────────────────────────────────────────

  setAppPrivacy: (appId, level, allowedUserIds) => {
    set((s) => {
      const appSettings = {
        ...s.appSettings,
        [appId]: {
          appId,
          level,
          allowedUserIds: level === 'restricted' ? allowedUserIds : undefined,
          inheritWorkspace: false,
          updatedAt: Date.now(),
        },
      };
      schedulePersist({ ...s, appSettings });
      return { appSettings };
    });
  },

  getAppPrivacy: (appId) => {
    const s = get();
    if (s.appSettings[appId]) return s.appSettings[appId];
    // Fall back to workspace default
    return {
      appId,
      level: s.workspaceDefaults.level,
      inheritWorkspace: true,
      updatedAt: Date.now(),
    };
  },

  removeAppPrivacy: (appId) => {
    set((s) => {
      const { [appId]: _, ...rest } = s.appSettings;
      schedulePersist({ ...s, appSettings: rest });
      return { appSettings: rest };
    });
  },

  isAppPrivate: (appId) => {
    const settings = get().getAppPrivacy(appId);
    return settings.level === 'private';
  },

  isAppVisibleToUser: (appId, userId, ownerUserId) => {
    // Owner always sees their own apps
    if (userId === ownerUserId) return true;

    const settings = get().getAppPrivacy(appId);
    switch (settings.level) {
      case 'private':
        return false;
      case 'shared':
        return true;
      case 'restricted':
        return settings.allowedUserIds?.includes(userId) ?? false;
      default:
        return true;
    }
  },

  // ─── Workspace Defaults ──────────────────────────────────────────

  setWorkspaceDefault: (level, restrictedUserIds) => {
    set((s) => {
      const workspaceDefaults = {
        level,
        restrictedUserIds: level === 'restricted' ? restrictedUserIds : [],
      };
      schedulePersist({ ...s, workspaceDefaults });
      return { workspaceDefaults };
    });
  },

  getWorkspaceDefault: () => get().workspaceDefaults,

  // ─── Bulk Operations ─────────────────────────────────────────────

  getAllPrivateApps: () => {
    return Object.values(get().appSettings)
      .filter((s) => s.level === 'private')
      .map((s) => s.appId);
  },

  getAllSharedApps: () => {
    return Object.values(get().appSettings)
      .filter((s) => s.level === 'shared')
      .map((s) => s.appId);
  },

  getAppsWithAccess: (userId, ownerUserId) => {
    const s = get();
    const allApps = new Set([
      ...Object.keys(s.appSettings),
      // Include apps using workspace default
    ]);

    const accessible: string[] = [];
    for (const appId of allApps) {
      if (s.isAppVisibleToUser(appId, userId, ownerUserId)) {
        accessible.push(appId);
      }
    }
    return accessible;
  },

  getPrivacySummary: () => {
    const settings = Object.values(get().appSettings);
    return {
      private: settings.filter((s) => s.level === 'private').length,
      shared: settings.filter((s) => s.level === 'shared').length,
      restricted: settings.filter((s) => s.level === 'restricted').length,
    };
  },

  // ─── Persistence ─────────────────────────────────────────────────

  hydrate: async () => {
    try {
      const data = await idbGet<PersistedPrivacy>(STORAGE_KEY);
      if (data) {
        set({
          appSettings: data.appSettings || {},
          workspaceDefaults: data.workspaceDefaults || { level: 'shared' },
        });
      }
    } catch (e) {
      console.warn('[PrivacyStore] Failed to hydrate:', e);
    }
  },
}));
