/**
 * Registry Zustand Store — reactive state for the private plugin registry.
 *
 * Wraps the PrivateRegistryService with Zustand state and debounced IndexedDB persistence.
 */
import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { PrivateRegistryService } from '@/lib/services/private-registry.service';
import type { RegistryConfig, RegistryPlugin, OrgMember } from '@/lib/services/private-registry.service';

// ─── Storage ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'anichisom-registry-state';
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

interface PersistedRegistry {
  registries: Record<string, RegistryConfig>;
  registryPlugins: Record<string, RegistryPlugin[]>;
  orgMembers: Record<string, OrgMember[]>;
  activeRegistryId: string | null;
}

function schedulePersist(state: RegistryState) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const data: PersistedRegistry = {
      registries: state.registries,
      registryPlugins: state.registryPlugins,
      orgMembers: state.orgMembers,
      activeRegistryId: state.activeRegistryId,
    };
    idbSet(STORAGE_KEY, data).catch((e: unknown) => {
      console.warn('[RegistryStore] Failed to persist:', e);
    });
  }, 2000);
}

// ─── State ──────────────────────────────────────────────────────────────

interface RegistryState {
  registries: Record<string, RegistryConfig>;
  registryPlugins: Record<string, RegistryPlugin[]>;
  orgMembers: Record<string, OrgMember[]>;
  activeRegistryId: string | null;
  syncing: boolean;
  lastError: string | null;

  // ─── Actions ──────────────────────────────────────────────────────
  createRegistry: (
    name: string,
    orgName: string,
    repoUrl: string,
    branch: string,
    accessToken: string,
  ) => Promise<RegistryConfig>;
  deleteRegistry: (id: string) => void;
  setDefaultRegistry: (id: string) => void;
  syncRegistry: (id: string) => Promise<void>;
  syncAllRegistries: () => Promise<void>;
  addOrgMember: (orgName: string, email: string, role: OrgMember['role']) => OrgMember;
  removeOrgMember: (orgName: string, memberId: string) => void;
  getOrgMembers: (orgName: string) => OrgMember[];
  checkAccess: (orgName: string, email: string) => boolean;
  searchRegistries: (query: string) => RegistryPlugin[];
  hydrate: () => Promise<void>;
}

export const useRegistryStore = create<RegistryState>((set, get) => ({
  registries: {},
  registryPlugins: {},
  orgMembers: {},
  activeRegistryId: null,
  syncing: false,
  lastError: null,

  createRegistry: async (name, orgName, repoUrl, branch, accessToken) => {
    try {
      set({ lastError: null });
      const config = await PrivateRegistryService.createRegistry(name, orgName, repoUrl, branch, accessToken);
      const all = PrivateRegistryService.getRegistries();
      const registries: Record<string, RegistryConfig> = {};
      for (const r of all) registries[r.id] = r;
      set({ registries, activeRegistryId: config.id });
      schedulePersist(get());
      return config;
    } catch (e: any) {
      set({ lastError: e.message || 'Failed to create registry' });
      throw e;
    }
  },

  deleteRegistry: (id) => {
    PrivateRegistryService.deleteRegistry(id);
    const all = PrivateRegistryService.getRegistries();
    const registries: Record<string, RegistryConfig> = {};
    for (const r of all) registries[r.id] = r;
    const { [id]: _, ...restPlugins } = get().registryPlugins;
    const activeRegistryId = get().activeRegistryId === id ? null : get().activeRegistryId;
    set({ registries, registryPlugins: restPlugins, activeRegistryId });
    schedulePersist(get());
  },

  setDefaultRegistry: (id) => {
    PrivateRegistryService.setDefaultRegistry(id);
    const all = PrivateRegistryService.getRegistries();
    const registries: Record<string, RegistryConfig> = {};
    for (const r of all) registries[r.id] = r;
    set({ registries, activeRegistryId: id });
    schedulePersist(get());
  },

  syncRegistry: async (id) => {
    try {
      set({ syncing: true, lastError: null });
      const plugins = await PrivateRegistryService.syncRegistry(id);
      set((s) => ({
        registryPlugins: { ...s.registryPlugins, [id]: plugins },
        syncing: false,
      }));
      schedulePersist(get());
    } catch (e: any) {
      set({ syncing: false, lastError: e.message || 'Sync failed' });
    }
  },

  syncAllRegistries: async () => {
    const ids = Object.keys(get().registries);
    set({ syncing: true, lastError: null });
    try {
      for (const id of ids) {
        try {
          const plugins = await PrivateRegistryService.syncRegistry(id);
          set((s) => ({
            registryPlugins: { ...s.registryPlugins, [id]: plugins },
          }));
        } catch {
          // continue with other registries
        }
      }
      set({ syncing: false });
      schedulePersist(get());
    } catch (e: any) {
      set({ syncing: false, lastError: e.message || 'Sync all failed' });
    }
  },

  addOrgMember: (orgName, email, role) => {
    const member = PrivateRegistryService.addOrgMember(orgName, email, role);
    const orgMembers = { ...get().orgMembers, [orgName]: PrivateRegistryService.getOrgMembers(orgName) };
    set({ orgMembers });
    schedulePersist(get());
    return member;
  },

  removeOrgMember: (orgName, memberId) => {
    PrivateRegistryService.removeOrgMember(orgName, memberId);
    const orgMembers = { ...get().orgMembers, [orgName]: PrivateRegistryService.getOrgMembers(orgName) };
    set({ orgMembers });
    schedulePersist(get());
  },

  getOrgMembers: (orgName) => {
    return get().orgMembers[orgName] || [];
  },

  checkAccess: (orgName, email) => {
    return PrivateRegistryService.checkAccess(orgName, email);
  },

  searchRegistries: (query) => {
    return PrivateRegistryService.searchRegistries(query);
  },

  hydrate: async () => {
    try {
      const data = await idbGet<PersistedRegistry>(STORAGE_KEY);
      if (data) {
        set({
          registries: data.registries || {},
          registryPlugins: data.registryPlugins || {},
          orgMembers: data.orgMembers || {},
          activeRegistryId: data.activeRegistryId || null,
        });
      }
    } catch (e) {
      console.warn('[RegistryStore] Failed to hydrate:', e);
    }
  },
}));
