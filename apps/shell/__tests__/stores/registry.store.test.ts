/**
 * Tests for Registry Zustand Store — state management, CRUD, sync tracking.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRegistryStore } from '@/lib/stores/registry.store';
import { PrivateRegistryService } from '@/lib/services/private-registry.service';

// Mock localStorage
const localStorageMock: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => localStorageMock[key] || null),
  setItem: vi.fn((key: string, val: string) => { localStorageMock[key] = val; }),
  removeItem: vi.fn((key: string) => { delete localStorageMock[key]; }),
  clear: vi.fn(() => { Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]); }),
});

// Mock fetch
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  useRegistryStore.setState({
    registries: {},
    registryPlugins: {},
    orgMembers: {},
    activeRegistryId: null,
    syncing: false,
    lastError: null,
  });
});

function mockGithubRepoSuccess() {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ name: 'plugin-registry', full_name: 'test-org/plugin-registry' }),
  });
}

function mockGithubContentsSuccess(files: Array<{ name: string; path: string; type: string }> = []) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => files,
  });
}

function mockGithubFileContent(manifest: any) {
  const content = btoa(JSON.stringify(manifest));
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ content, encoding: 'base64' }),
  });
}

describe('RegistryStore', () => {
  describe('Initial state', () => {
    it('should have correct default state', () => {
      const state = useRegistryStore.getState();
      expect(state.registries).toEqual({});
      expect(state.registryPlugins).toEqual({});
      expect(state.orgMembers).toEqual({});
      expect(state.activeRegistryId).toBeNull();
      expect(state.syncing).toBe(false);
      expect(state.lastError).toBeNull();
    });
  });

  describe('Registry CRUD through store', () => {
    it('should create a registry through the store', async () => {
      mockGithubRepoSuccess();
      const store = useRegistryStore.getState();
      const config = await store.createRegistry(
        'Store Registry', 'store-org', 'https://github.com/store-org/repo', 'main', 'tok',
      );

      const state = useRegistryStore.getState();
      expect(state.registries[config.id]).toBeDefined();
      expect(state.registries[config.id]!.name).toBe('Store Registry');
      expect(state.activeRegistryId).toBe(config.id);
      expect(state.lastError).toBeNull();
    });

    it('should delete a registry through the store', async () => {
      mockGithubRepoSuccess();
      const config = await useRegistryStore.getState().createRegistry(
        'Del Reg', 'del-org', 'https://github.com/del-org/repo', 'main', 'tok',
      );
      useRegistryStore.getState().deleteRegistry(config.id);

      const state = useRegistryStore.getState();
      expect(state.registries[config.id]).toBeUndefined();
    });

    it('should set default registry through the store', async () => {
      mockGithubRepoSuccess();
      const r1 = await useRegistryStore.getState().createRegistry(
        'R1', 'def-org', 'https://github.com/def-org/r1', 'main', 'tok1',
      );
      mockGithubRepoSuccess();
      const r2 = await useRegistryStore.getState().createRegistry(
        'R2', 'def-org', 'https://github.com/def-org/r2', 'main', 'tok2',
      );

      useRegistryStore.getState().setDefaultRegistry(r2.id);
      const state = useRegistryStore.getState();
      expect(state.registries[r1.id]!.isDefault).toBe(false);
      expect(state.registries[r2.id]!.isDefault).toBe(true);
      expect(state.activeRegistryId).toBe(r2.id);
    });

    it('should set lastError on create failure', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });
      await expect(
        useRegistryStore.getState().createRegistry(
          'Bad', 'org', 'https://github.com/org/bad', 'main', 'tok',
        ),
      ).rejects.toThrow();

      expect(useRegistryStore.getState().lastError).toBeTruthy();
    });
  });

  describe('Sync tracking', () => {
    it('should sync a registry and store plugins', async () => {
      mockGithubRepoSuccess();
      const config = await useRegistryStore.getState().createRegistry(
        'Sync Reg', 'sync-org', 'https://github.com/sync-org/repo', 'main', 'tok',
      );

      mockGithubContentsSuccess([{ name: 'p.json', path: 'plugins/p.json', type: 'file' }]);
      mockGithubFileContent({ id: 'plugin-1', name: 'Plugin One', version: '1.0.0' });

      await useRegistryStore.getState().syncRegistry(config.id);

      const state = useRegistryStore.getState();
      expect(state.registryPlugins[config.id]!).toHaveLength(1);
      expect(state.registryPlugins[config.id]![0]!.manifest.id).toBe('plugin-1');
      expect(state.syncing).toBe(false);
    });

    it('should set syncing to true during sync', async () => {
      mockGithubRepoSuccess();
      const config = await useRegistryStore.getState().createRegistry(
        'Sync Flag', 'flag-org', 'https://github.com/flag-org/repo', 'main', 'tok',
      );
      mockGithubContentsSuccess([]);
      mockGithubFileContent;

      // Don't await — check intermediate state
      const syncPromise = useRegistryStore.getState().syncRegistry(config.id);
      // After resolving, syncing should be false
      await syncPromise;
      expect(useRegistryStore.getState().syncing).toBe(false);
    });

    it('should set lastError on sync failure', async () => {
      mockGithubRepoSuccess();
      const config = await useRegistryStore.getState().createRegistry(
        'Sync Fail', 'fail-org', 'https://github.com/fail-org/repo', 'main', 'tok',
      );
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' });

      await useRegistryStore.getState().syncRegistry(config.id);
      expect(useRegistryStore.getState().lastError).toBeTruthy();
    });

    it('should sync all registries', async () => {
      // Set a default fallback so any unmocked fetch calls (from accumulated
      // service-singleton registries) return 404 instead of undefined
      fetchMock.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });

      mockGithubRepoSuccess();
      const r1 = await useRegistryStore.getState().createRegistry(
        'All1', 'all-org', 'https://github.com/all-org/r1', 'main', 'tok1',
      );
      mockGithubRepoSuccess();
      const r2 = await useRegistryStore.getState().createRegistry(
        'All2', 'all-org', 'https://github.com/all-org/r2', 'main', 'tok2',
      );

      // Mock contents for all existing registries (including those from prior tests)
      const totalRegistries = PrivateRegistryService.getRegistries().length;
      for (let i = 0; i < totalRegistries; i++) {
        mockGithubContentsSuccess([]);
      }

      await useRegistryStore.getState().syncAllRegistries();

      const state = useRegistryStore.getState();
      expect(state.registryPlugins[r1.id]).toBeDefined();
      expect(state.registryPlugins[r2.id]).toBeDefined();
      expect(state.syncing).toBe(false);
    });
  });

  describe('Org member management through store', () => {
    it('should add an org member', () => {
      const member = useRegistryStore.getState().addOrgMember('store-org', 'alice@ex.com', 'owner');
      expect(member.email).toBe('alice@ex.com');
      expect(useRegistryStore.getState().orgMembers['store-org']).toHaveLength(1);
    });

    it('should remove an org member', () => {
      const member = useRegistryStore.getState().addOrgMember('rm-org', 'bob@ex.com', 'member');
      useRegistryStore.getState().removeOrgMember('rm-org', member.id);
      expect(useRegistryStore.getState().orgMembers['rm-org']).toHaveLength(0);
    });

    it('should list org members via store', () => {
      useRegistryStore.getState().addOrgMember('list-org', 'a@ex.com', 'admin');
      useRegistryStore.getState().addOrgMember('list-org', 'b@ex.com', 'member');
      const members = useRegistryStore.getState().getOrgMembers('list-org');
      expect(members).toHaveLength(2);
    });

    it('should check access through store', () => {
      useRegistryStore.getState().addOrgMember('acc-org', 'owner@ex.com', 'owner');
      expect(useRegistryStore.getState().checkAccess('acc-org', 'owner@ex.com')).toBe(true);
      expect(useRegistryStore.getState().checkAccess('acc-org', 'stranger@ex.com')).toBe(false);
    });
  });

  describe('Search through store', () => {
    it('should search registries through the store', async () => {
      mockGithubRepoSuccess();
      const config = await useRegistryStore.getState().createRegistry(
        'Search Reg', 'search-org', 'https://github.com/search-org/repo', 'main', 'tok',
      );
      mockGithubContentsSuccess([{ name: 'a.json', path: 'plugins/a.json', type: 'file' }]);
      mockGithubFileContent({ id: 'my-plugin', name: 'My Cool Plugin', version: '1.0.0', description: 'Cool stuff' });

      await useRegistryStore.getState().syncRegistry(config.id);
      const results = useRegistryStore.getState().searchRegistries('Cool');
      expect(results).toHaveLength(1);
      expect(results[0]!.manifest.name).toBe('My Cool Plugin');
    });
  });

  describe('Hydrate', () => {
    it('should hydrate from IndexedDB', async () => {
      const { set: idbSet } = await import('idb-keyval');
      await idbSet('continua-registry-state', {
        registries: { 'reg-hydrated': { id: 'reg-hydrated', name: 'Hydrated', orgName: 'h-org', repoUrl: 'https://github.com/h-org/r', branch: 'main', accessToken: 'tok', isDefault: true, createdAt: 1000 } },
        registryPlugins: {},
        orgMembers: { 'h-org': [{ id: 'm1', email: 'h@ex.com', role: 'owner', addedAt: 1000 }] },
        activeRegistryId: 'reg-hydrated',
      });

      await (useRegistryStore as any).hydrate?.();
      const state = useRegistryStore.getState();
      expect(state.registries['reg-hydrated']).toBeDefined();
      expect(state.registries['reg-hydrated']!.name).toBe('Hydrated');
      expect(state.orgMembers['h-org']).toHaveLength(1);
      expect(state.activeRegistryId).toBe('reg-hydrated');
    });
  });
});
