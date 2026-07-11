/**
 * Tests for Plugin Zustand Store.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePluginStore } from '@/lib/stores/plugin.store';
import * as registry from '@/lib/plugin-registry';
import type { PluginManifest, PluginPermission } from '@/lib/plugin-registry';

// Mock localStorage
const localStorageMock: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => localStorageMock[key] || null),
  setItem: vi.fn((key: string, val: string) => { localStorageMock[key] = val; }),
  removeItem: vi.fn((key: string) => { delete localStorageMock[key]; }),
  clear: vi.fn(() => { Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]); }),
});

const TEST_MANIFEST: PluginManifest = {
  id: 'test-plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  description: 'A test plugin',
  author: 'Test Author',
  category: 'utility',
  permissions: ['files:read', 'ui.showNotification' as PluginPermission],
  runtime: 'iframe',
  entryUrl: 'https://example.com/plugin.html',
  source: 'marketplace',
};

const TEST_MANIFEST_2: PluginManifest = {
  id: 'test-plugin-2',
  name: 'Test Plugin 2',
  version: '2.0.0',
  description: 'Another test plugin',
  author: 'Test Author 2',
  category: 'creative',
  permissions: ['files:write', 'workspace:write' as PluginPermission],
  runtime: 'native',
  source: 'marketplace',
};

beforeEach(() => {
  // Clear the registry state
  registry.unregisterPlugin('test-plugin');
  registry.unregisterPlugin('test-plugin-2');
  // Reset store to initial state
  usePluginStore.setState({
    plugins: [],
    activePlugins: [],
    installStates: {},
    bootstrapped: false,
    loading: null,
    error: null,
  });
  vi.clearAllMocks();
});

describe('PluginStore', () => {
  describe('Bootstrap', () => {
    it('should start unbootstrapped', () => {
      const state = usePluginStore.getState();
      expect(state.bootstrapped).toBe(false);
    });

    it('should bootstrap and sync from registry', () => {
      registry.registerPlugin(TEST_MANIFEST);
      registry.installPlugin('test-plugin');

      const store = usePluginStore.getState();
      store.bootstrap();

      const state = usePluginStore.getState();
      expect(state.bootstrapped).toBe(true);
      expect(state.plugins).toHaveLength(1);
      expect(state.plugins[0].id).toBe('test-plugin');
      expect(state.activePlugins).toHaveLength(1);
      expect(state.installStates['test-plugin']).toBeDefined();
    });
  });

  describe('Plugin Registration', () => {
    it('should register a plugin and sync state', () => {
      const store = usePluginStore.getState();
      store.registerPlugin(TEST_MANIFEST);

      const state = usePluginStore.getState();
      expect(state.plugins).toHaveLength(1);
      expect(state.plugins[0].id).toBe('test-plugin');
    });

    it('should unregister a plugin', () => {
      const store = usePluginStore.getState();
      store.registerPlugin(TEST_MANIFEST);
      store.unregisterPlugin('test-plugin');

      const state = usePluginStore.getState();
      expect(state.plugins).toHaveLength(0);
    });
  });

  describe('Install / Uninstall', () => {
    it('should install a plugin', () => {
      const store = usePluginStore.getState();
      store.registerPlugin(TEST_MANIFEST);
      store.installPlugin('test-plugin');

      const state = usePluginStore.getState();
      expect(state.installStates['test-plugin']).toBeDefined();
      expect(state.installStates['test-plugin'].enabled).toBe(true);
      expect(state.activePlugins).toHaveLength(1);
    });

    it('should uninstall a plugin', () => {
      const store = usePluginStore.getState();
      store.registerPlugin(TEST_MANIFEST);
      store.installPlugin('test-plugin');
      store.uninstallPlugin('test-plugin');

      const state = usePluginStore.getState();
      expect(state.installStates['test-plugin']).toBeUndefined();
      expect(state.activePlugins).toHaveLength(0);
    });

    it('should toggle plugin enabled/disabled', () => {
      const store = usePluginStore.getState();
      store.registerPlugin(TEST_MANIFEST);
      store.installPlugin('test-plugin');

      store.togglePlugin('test-plugin');
      expect(usePluginStore.getState().installStates['test-plugin'].enabled).toBe(false);

      store.togglePlugin('test-plugin');
      expect(usePluginStore.getState().installStates['test-plugin'].enabled).toBe(true);
    });
  });

  describe('Privacy Overrides', () => {
    it('should set privacy override', () => {
      const store = usePluginStore.getState();
      store.registerPlugin(TEST_MANIFEST);
      store.installPlugin('test-plugin');
      store.setPrivacyOverride('test-plugin', 'files:read', false);

      const state = usePluginStore.getState();
      expect(state.installStates['test-plugin'].privacyOverrides?.['files:read']).toBe(false);
    });

    it('should check permission with override (denied)', () => {
      const store = usePluginStore.getState();
      store.registerPlugin(TEST_MANIFEST);
      store.installPlugin('test-plugin');
      store.setPrivacyOverride('test-plugin', 'files:read', false);

      const granted = usePluginStore.getState().isPermissionGranted('test-plugin', 'files:read');
      expect(granted).toBe(false);
    });

    it('should check permission with override (allowed)', () => {
      const store = usePluginStore.getState();
      store.registerPlugin(TEST_MANIFEST);
      store.installPlugin('test-plugin');
      store.setPrivacyOverride('test-plugin', 'files:read', true);

      const granted = usePluginStore.getState().isPermissionGranted('test-plugin', 'files:read');
      expect(granted).toBe(true);
    });

    it('should default to manifest permissions when no override', () => {
      const store = usePluginStore.getState();
      store.registerPlugin(TEST_MANIFEST);
      store.installPlugin('test-plugin');

      // files:read is declared in the manifest
      expect(usePluginStore.getState().isPermissionGranted('test-plugin', 'files:read')).toBe(true);
      // files:write is NOT declared in the manifest
      expect(usePluginStore.getState().isPermissionGranted('test-plugin', 'files:write')).toBe(false);
    });

    it('should deny permission for uninstalled plugin', () => {
      const store = usePluginStore.getState();
      store.registerPlugin(TEST_MANIFEST);

      const granted = usePluginStore.getState().isPermissionGranted('test-plugin', 'files:read');
      expect(granted).toBe(false);
    });
  });

  describe('Selectors', () => {
    it('should get a single plugin', () => {
      const store = usePluginStore.getState();
      store.registerPlugin(TEST_MANIFEST);

      const plugin = usePluginStore.getState().getPlugin('test-plugin');
      expect(plugin?.name).toBe('Test Plugin');
    });

    it('should return undefined for unknown plugin', () => {
      const plugin = usePluginStore.getState().getPlugin('nonexistent');
      expect(plugin).toBeUndefined();
    });

    it('should check if plugin is active', () => {
      const store = usePluginStore.getState();
      store.registerPlugin(TEST_MANIFEST);

      expect(usePluginStore.getState().isPluginActive('test-plugin')).toBe(false);

      store.installPlugin('test-plugin');
      expect(usePluginStore.getState().isPluginActive('test-plugin')).toBe(true);
    });

    it('should search plugins', () => {
      const store = usePluginStore.getState();
      store.registerPlugin(TEST_MANIFEST);
      store.registerPlugin(TEST_MANIFEST_2);

      const results = usePluginStore.getState().searchPlugins('creative');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('test-plugin-2');
    });

    it('should filter by category', () => {
      const store = usePluginStore.getState();
      store.registerPlugin(TEST_MANIFEST);
      store.registerPlugin(TEST_MANIFEST_2);

      const results = usePluginStore.getState().getPluginsByCategory('utility');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('test-plugin');
    });

    it('should filter by source', () => {
      const store = usePluginStore.getState();
      store.registerPlugin(TEST_MANIFEST);
      store.registerPlugin(TEST_MANIFEST_2);

      const results = usePluginStore.getState().getPluginsBySource('marketplace');
      expect(results).toHaveLength(2);
    });
  });

  describe('Loading / Error', () => {
    it('should set and clear loading state', () => {
      const store = usePluginStore.getState();
      expect(store.loading).toBeNull();

      store.setLoading('fetch-marketplace');
      expect(usePluginStore.getState().loading).toBe('fetch-marketplace');

      store.setLoading(null);
      expect(usePluginStore.getState().loading).toBeNull();
    });

    it('should set and clear error state', () => {
      const store = usePluginStore.getState();
      expect(store.error).toBeNull();

      store.setError('Network error');
      expect(usePluginStore.getState().error).toBe('Network error');

      store.setError(null);
      expect(usePluginStore.getState().error).toBeNull();
    });
  });
});
