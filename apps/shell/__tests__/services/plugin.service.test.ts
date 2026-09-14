/**
 * Tests for Plugin Service — lifecycle, permissions, version checks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PluginService } from '@/lib/services/plugin.service';
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
  id: 'svc-test-plugin',
  name: 'Service Test Plugin',
  version: '1.0.0',
  description: 'A test plugin for service tests',
  author: 'Test Author',
  category: 'utility',
  permissions: ['files:read', 'ui.showNotification' as PluginPermission, 'network:fetch'],
  runtime: 'iframe',
  entryUrl: 'https://example.com/plugin.html',
  source: 'marketplace',
};

const TEST_MANIFEST_NATIVE: PluginManifest = {
  id: 'svc-native-plugin',
  name: 'Native Test Plugin',
  version: '2.1.0',
  description: 'A native test plugin',
  author: 'Test Author 2',
  category: 'creative',
  permissions: ['workspace:read'],
  runtime: 'native',
  source: 'marketplace',
};

beforeEach(() => {
  // Reset both registry module and store state
  registry.unregisterPlugin('svc-test-plugin');
  registry.unregisterPlugin('svc-native-plugin');
  registry.unregisterPlugin('bad-url-plugin');
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

describe('PluginService', () => {
  describe('install', () => {
    it('should install a registered plugin', async () => {
      usePluginStore.getState().registerPlugin(TEST_MANIFEST);
      const result = await PluginService.install('svc-test-plugin');
      expect(result.success).toBe(true);
      expect(result.pluginId).toBe('svc-test-plugin');
      expect(usePluginStore.getState().isPluginActive('svc-test-plugin')).toBe(true);
    });

    it('should fail for unregistered plugin', async () => {
      const result = await PluginService.install('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail for already-installed plugin', async () => {
      usePluginStore.getState().registerPlugin(TEST_MANIFEST);
      await PluginService.install('svc-test-plugin');
      const result = await PluginService.install('svc-test-plugin');
      expect(result.success).toBe(false);
      expect(result.error).toContain('already installed');
    });

    it('should fail for iframe plugin with invalid entryUrl', async () => {
      const badManifest: PluginManifest = {
        ...TEST_MANIFEST,
        id: 'bad-url-plugin',
        entryUrl: 'not-a-valid-url',
      };
      usePluginStore.getState().registerPlugin(badManifest);
      const result = await PluginService.install('bad-url-plugin');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid entry URL');
    });
  });

  describe('uninstall', () => {
    it('should uninstall an installed plugin', async () => {
      usePluginStore.getState().registerPlugin(TEST_MANIFEST);
      await PluginService.install('svc-test-plugin');
      const result = await PluginService.uninstall('svc-test-plugin');
      expect(result.success).toBe(true);
      expect(usePluginStore.getState().isPluginActive('svc-test-plugin')).toBe(false);
    });

    it('should fail for non-installed plugin', async () => {
      const result = await PluginService.uninstall('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not installed');
    });
  });

  describe('toggle', () => {
    it('should toggle a plugin', async () => {
      usePluginStore.getState().registerPlugin(TEST_MANIFEST);
      await PluginService.install('svc-test-plugin');
      expect(usePluginStore.getState().isPluginActive('svc-test-plugin')).toBe(true);

      PluginService.toggle('svc-test-plugin');
      expect(usePluginStore.getState().isPluginActive('svc-test-plugin')).toBe(false);

      PluginService.toggle('svc-test-plugin');
      expect(usePluginStore.getState().isPluginActive('svc-test-plugin')).toBe(true);
    });

    it('should return false for non-installed plugin', () => {
      const result = PluginService.toggle('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('checkPermissions', () => {
    it('should grant permissions declared in manifest', () => {
      usePluginStore.getState().registerPlugin(TEST_MANIFEST);
      usePluginStore.getState().installPlugin('svc-test-plugin');

      const result = PluginService.checkPermissions('svc-test-plugin', ['files:read', 'network:fetch']);
      expect(result.granted).toBe(true);
      expect(result.denied).toHaveLength(0);
    });

    it('should deny permissions not declared in manifest', () => {
      usePluginStore.getState().registerPlugin(TEST_MANIFEST);
      usePluginStore.getState().installPlugin('svc-test-plugin');

      const result = PluginService.checkPermissions('svc-test-plugin', ['files:write']);
      expect(result.granted).toBe(false);
      expect(result.denied).toContain('files:write');
    });

    it('should deny permissions when privacy override is off', () => {
      usePluginStore.getState().registerPlugin(TEST_MANIFEST);
      usePluginStore.getState().installPlugin('svc-test-plugin');
      usePluginStore.getState().setPrivacyOverride('svc-test-plugin', 'files:read', false);

      const result = PluginService.checkPermissions('svc-test-plugin', ['files:read']);
      expect(result.granted).toBe(false);
      expect(result.denied).toContain('files:read');
    });

    it('should deny all for uninstalled plugin', () => {
      const result = PluginService.checkPermissions('svc-test-plugin', ['files:read']);
      expect(result.granted).toBe(false);
      expect(result.denied).toHaveLength(1);
    });
  });

  describe('isRpcMethodAllowed', () => {
    it('should allow methods with no permission requirement', () => {
      usePluginStore.getState().registerPlugin(TEST_MANIFEST);
      usePluginStore.getState().installPlugin('svc-test-plugin');

      expect(PluginService.isRpcMethodAllowed('svc-test-plugin', 'workspace.getCurrentWorkspace')).toBe(true);
    });

    it('should allow methods with granted permission', () => {
      usePluginStore.getState().registerPlugin(TEST_MANIFEST);
      usePluginStore.getState().installPlugin('svc-test-plugin');

      expect(PluginService.isRpcMethodAllowed('svc-test-plugin', 'files.listFiles')).toBe(true);
    });

    it('should deny methods with denied permission', () => {
      usePluginStore.getState().registerPlugin(TEST_MANIFEST);
      usePluginStore.getState().installPlugin('svc-test-plugin');

      // files.saveFile requires files:write, which is NOT in TEST_MANIFEST
      expect(PluginService.isRpcMethodAllowed('svc-test-plugin', 'files.saveFile')).toBe(false);
    });

    it('should deny methods with privacy override off', () => {
      usePluginStore.getState().registerPlugin(TEST_MANIFEST);
      usePluginStore.getState().installPlugin('svc-test-plugin');
      usePluginStore.getState().setPrivacyOverride('svc-test-plugin', 'files:read', false);

      // files.listFiles requires files:read, which is overridden to false
      expect(PluginService.isRpcMethodAllowed('svc-test-plugin', 'files.listFiles')).toBe(false);
    });
  });

  describe('checkVersion', () => {
    it('should detect no update available', () => {
      usePluginStore.getState().registerPlugin(TEST_MANIFEST);

      const result = PluginService.checkVersion('svc-test-plugin', '1.0.0');
      expect(result.updateAvailable).toBe(false);
      expect(result.current).toBe('1.0.0');
    });

    it('should detect newer version available', () => {
      usePluginStore.getState().registerPlugin(TEST_MANIFEST);

      const result = PluginService.checkVersion('svc-test-plugin', '2.0.0');
      expect(result.updateAvailable).toBe(true);
    });

    it('should handle versions with v prefix', () => {
      const manifest: PluginManifest = { ...TEST_MANIFEST, version: 'v1.5.0' };
      usePluginStore.getState().registerPlugin(manifest);

      const result = PluginService.checkVersion('svc-test-plugin', '1.6.0');
      expect(result.updateAvailable).toBe(true);
    });
  });

  describe('openPlugin', () => {
    it('should return window data for iframe plugin', () => {
      usePluginStore.getState().registerPlugin(TEST_MANIFEST);
      usePluginStore.getState().installPlugin('svc-test-plugin');

      const result = PluginService.openPlugin('svc-test-plugin');
      expect(result).not.toBeNull();
      expect(result!.appId).toBe('svc-test-plugin');
      expect(result!.data.pluginUrl).toBe('https://example.com/plugin.html');
    });

    it('should return window data for native plugin', () => {
      usePluginStore.getState().registerPlugin(TEST_MANIFEST_NATIVE);
      usePluginStore.getState().installPlugin('svc-native-plugin');

      const result = PluginService.openPlugin('svc-native-plugin');
      expect(result).not.toBeNull();
      expect(result!.appId).toBe('svc-native-plugin');
      expect(result!.data.pluginUrl).toBeUndefined();
    });

    it('should return null for unknown plugin', () => {
      const result = PluginService.openPlugin('nonexistent');
      expect(result).toBeNull();
    });

    it('should return null for inactive plugin', () => {
      usePluginStore.getState().registerPlugin(TEST_MANIFEST);
      // Don't install — plugin is not active

      const result = PluginService.openPlugin('svc-test-plugin');
      expect(result).toBeNull();
    });
  });

  describe('validateManifest', () => {
    it('should validate a complete manifest', () => {
      const result = PluginService.validateManifest(TEST_MANIFEST);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for missing required fields', () => {
      const result = PluginService.validateManifest({});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail for invalid semver', () => {
      const result = PluginService.validateManifest({ ...TEST_MANIFEST, version: 'abc' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('semver'))).toBe(true);
    });

    it('should fail for iframe plugin without entryUrl', () => {
      const result = PluginService.validateManifest({ ...TEST_MANIFEST, entryUrl: undefined });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('entryUrl'))).toBe(true);
    });

    it('should pass for native plugin without entryUrl', () => {
      const result = PluginService.validateManifest(TEST_MANIFEST_NATIVE);
      expect(result.valid).toBe(true);
    });
  });
});
