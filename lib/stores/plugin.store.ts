/**
 * Plugin Zustand Store — reactive state for the plugin registry.
 *
 * Delegates persistence to `lib/plugin-registry.ts` (localStorage).
 * Adds reactive Zustand state + loading/error + computed selectors.
 */
import { create } from 'zustand';
import type {
  PluginManifest,
  PluginInstallState,
  PluginPermission,
  PluginCategory,
} from '@/lib/plugin-registry';
import {
  getAllPlugins,
  getInstalledPlugins,
  getPlugin,
  getPluginsByCategory,
  getPluginsBySource,
  searchPlugins as registrySearch,
  registerPlugin as registryRegister,
  unregisterPlugin as registryUnregister,
  installPlugin as registryInstall,
  uninstallPlugin as registryUninstall,
  togglePluginEnabled as registryToggle,
  getInstallState as registryGetInstallState,
  isPluginActive as registryIsActive,
  setPrivacyOverride as registrySetPrivacy,
  persistInstallStates,
  loadInstallStates,
  subscribe as registrySubscribe,
} from '@/lib/plugin-registry';

// ─── State ───────────────────────────────────────────────────────────────

interface PluginState {
  /** All registered plugin manifests (synced from registry) */
  plugins: PluginManifest[];
  /** Plugins that are installed AND enabled */
  activePlugins: PluginManifest[];
  /** Map of plugin ID → install state for all installed plugins */
  installStates: Record<string, PluginInstallState>;
  /** Whether the registry has been bootstrapped from localStorage */
  bootstrapped: boolean;
  /** Currently loading async operation (e.g., 'fetch-marketplace') */
  loading: string | null;
  /** Last error message */
  error: string | null;

  // ─── Actions ──────────────────────────────────────────────────────

  /** Bootstrap: load install states from localStorage, sync state */
  bootstrap: () => void;

  /** Register a new plugin manifest */
  registerPlugin: (manifest: PluginManifest) => void;
  /** Unregister a plugin entirely */
  unregisterPlugin: (id: string) => void;

  /** Install a plugin (must be registered first) */
  installPlugin: (id: string) => void;
  /** Uninstall a plugin */
  uninstallPlugin: (id: string) => void;
  /** Toggle plugin enabled/disabled */
  togglePlugin: (id: string) => void;

  /** Set a privacy override for a specific permission */
  setPrivacyOverride: (pluginId: string, permission: string, allowed: boolean) => void;

  /** Check if a specific permission is granted for a plugin (accounting for overrides) */
  isPermissionGranted: (pluginId: string, permission: PluginPermission) => boolean;

  /** Get a single plugin manifest */
  getPlugin: (id: string) => PluginManifest | undefined;
  /** Get install state for a plugin */
  getInstallState: (id: string) => PluginInstallState | undefined;
  /** Check if a plugin is installed AND active */
  isPluginActive: (id: string) => boolean;

  /** Search plugins by query */
  searchPlugins: (query: string) => PluginManifest[];
  /** Get plugins by category */
  getPluginsByCategory: (category: PluginCategory) => PluginManifest[];
  /** Get plugins by source */
  getPluginsBySource: (source: PluginManifest['source']) => PluginManifest[];

  /** Set loading state */
  setLoading: (op: string | null) => void;
  /** Set error state */
  setError: (err: string | null) => void;

  /** Sync internal state from the registry module */
  syncFromRegistry: () => void;
}

export const usePluginStore = create<PluginState>((set, get) => ({
  plugins: [],
  activePlugins: [],
  installStates: {},
  bootstrapped: false,
  loading: null,
  error: null,

  bootstrap: () => {
    loadInstallStates();
    get().syncFromRegistry();
    set({ bootstrapped: true });
  },

  registerPlugin: (manifest) => {
    registryRegister(manifest);
    get().syncFromRegistry();
  },

  unregisterPlugin: (id) => {
    registryUnregister(id);
    get().syncFromRegistry();
  },

  installPlugin: (id) => {
    registryInstall(id);
    persistInstallStates();
    get().syncFromRegistry();
  },

  uninstallPlugin: (id) => {
    registryUninstall(id);
    persistInstallStates();
    get().syncFromRegistry();
  },

  togglePlugin: (id) => {
    registryToggle(id);
    persistInstallStates();
    get().syncFromRegistry();
  },

  setPrivacyOverride: (pluginId, permission, allowed) => {
    registrySetPrivacy(pluginId, permission, allowed);
    persistInstallStates();
    get().syncFromRegistry();
  },

  isPermissionGranted: (pluginId, permission) => {
    const state = get().installStates[pluginId];
    if (!state) return false;
    // If plugin has a privacy override for this permission, use it
    if (state.privacyOverrides && permission in state.privacyOverrides) {
      return state.privacyOverrides[permission]!;
    }
    // Default: permission is granted if the plugin declared it in its manifest
    const plugin = getPlugin(pluginId);
    return plugin?.permissions.includes(permission) ?? false;
  },

  getPlugin: (id) => getPlugin(id),

  getInstallState: (id) => registryGetInstallState(id),

  isPluginActive: (id) => registryIsActive(id),

  searchPlugins: (query) => registrySearch(query),

  getPluginsByCategory: (category) => getPluginsByCategory(category),

  getPluginsBySource: (source) => getPluginsBySource(source),

  setLoading: (op) => set({ loading: op }),

  setError: (err) => set({ error: err }),

  syncFromRegistry: () => {
    const all = getAllPlugins();
    const installed = getInstalledPlugins();
    const states: Record<string, PluginInstallState> = {};
    installed.forEach((p) => {
      const s = registryGetInstallState(p.id);
      if (s) states[p.id] = s;
    });
    set({ plugins: all, activePlugins: installed, installStates: states });
  },
}));

// ─── Auto-subscribe to registry changes ────────────────────────────────

if (typeof window !== 'undefined') {
  registrySubscribe(() => {
    usePluginStore.getState().syncFromRegistry();
  });
}
