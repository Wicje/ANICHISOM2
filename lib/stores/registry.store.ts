/**
 * Registry Zustand Store — reactive state for the private plugin registry.
 *
 * Wraps the PrivateRegistryService with Zustand state and debounced IndexedDB persistence.
 */
import { create } from 'zustand';
import { withPersistence } from '@/lib/stores/persisted-store';
import { PrivateRegistryService } from '@/lib/services/private-registry.service';
import type { RegistryConfig, RegistryPlugin, OrgMember } from '@/lib/services/private-registry.service';

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
  },

  setDefaultRegistry: (id) => {
    PrivateRegistryService.setDefaultRegistry(id);
    const all = PrivateRegistryService.getRegistries();
    const registries: Record<string, RegistryConfig> = {};
    for (const r of all) registries[r.id] = r;
    set({ registries, activeRegistryId: id });
  },

  syncRegistry: async (id) => {
    try {
      set({ syncing: true, lastError: null });
      const plugins = await PrivateRegistryService.syncRegistry(id);
      set((s) => ({
        registryPlugins: { ...s.registryPlugins, [id]: plugins },
        syncing: false,
      }));
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
    } catch (e: any) {
      set({ syncing: false, lastError: e.message || 'Sync all failed' });
    }
  },

  addOrgMember: (orgName, email, role) => {
    const member = PrivateRegistryService.addOrgMember(orgName, email, role);
    const orgMembers = { ...get().orgMembers, [orgName]: PrivateRegistryService.getOrgMembers(orgName) };
    set({ orgMembers });
    return member;
  },

  removeOrgMember: (orgName, memberId) => {
    PrivateRegistryService.removeOrgMember(orgName, memberId);
    const orgMembers = { ...get().orgMembers, [orgName]: PrivateRegistryService.getOrgMembers(orgName) };
    set({ orgMembers });
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
}));

withPersistence(useRegistryStore, 'registry-state', ['registries', 'registryPlugins', 'orgMembers', 'activeRegistryId']);
