/**
 * Plugin Service — lifecycle management, permission enforcement, version checks.
 *
 * Non-React service layer. Components call these functions directly.
 * Delegates state changes to the plugin store and plugin registry.
 */
import { usePluginStore } from '@/lib/stores/plugin.store';
import type { PluginManifest, PluginPermission } from '@/lib/plugin-registry';
import { getPlugin } from '@/lib/plugin-registry';

// ─── Types ──────────────────────────────────────────────────────────────

export interface InstallResult {
  success: boolean;
  pluginId: string;
  error?: string;
}

export interface PermissionCheckResult {
  granted: boolean;
  denied: PluginPermission[];
  reason?: string;
}

export interface VersionCheckResult {
  current: string;
  latest: string;
  updateAvailable: boolean;
}

// ─── Semver helpers ─────────────────────────────────────────────────────

function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const parts = version.replace(/^v/, '').split('.').map(Number);
  return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
}

function isNewer(a: string, b: string): boolean {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (va.major > vb.major) return true;
  if (va.major < vb.major) return false;
  if (va.minor > vb.minor) return true;
  if (va.minor < vb.minor) return false;
  return va.patch > vb.patch;
}

// ─── Plugin Service ─────────────────────────────────────────────────────

export const PluginService = {
  /**
   * Full install lifecycle:
   * 1. Validate manifest exists in registry
   * 2. Check for version conflicts
   * 3. Run permission pre-check
   * 4. Install via registry + store
   * 5. Persist
   */
  async install(pluginId: string): Promise<InstallResult> {
    const store = usePluginStore.getState();

    // Step 1: Ensure plugin is registered
    const manifest = store.getPlugin(pluginId);
    if (!manifest) {
      return { success: false, pluginId, error: `Plugin "${pluginId}" not found in registry. Register it first.` };
    }

    // Step 2: Check if already installed
    const existing = store.getInstallState(pluginId);
    if (existing?.enabled) {
      return { success: false, pluginId, error: `Plugin "${pluginId}" is already installed and enabled.` };
    }

    // Step 3: Validate entry URL for iframe plugins
    if (manifest.runtime === 'iframe' && manifest.entryUrl) {
      try {
        new URL(manifest.entryUrl);
      } catch {
        return { success: false, pluginId, error: `Invalid entry URL: ${manifest.entryUrl}` };
      }
    }

    // Step 4: Permission pre-check (logs warnings but doesn't block)
    const permResult = this.checkPermissions(pluginId, manifest.permissions);
    if (permResult.denied.length > 0) {
      console.warn(
        `[PluginService] Plugin "${pluginId}" requests ${permResult.denied.length} permission(s) that are denied:`,
        permResult.denied,
      );
    }

    // Step 5: Perform install
    try {
      store.installPlugin(pluginId);
      return { success: true, pluginId };
    } catch (e: any) {
      return { success: false, pluginId, error: e.message || 'Install failed' };
    }
  },

  /**
   * Uninstall lifecycle:
   * 1. Disable the plugin (stop sandbox)
   * 2. Remove from registry install state
   * 3. Persist
   */
  async uninstall(pluginId: string): Promise<InstallResult> {
    const store = usePluginStore.getState();

    const existing = store.getInstallState(pluginId);
    if (!existing) {
      return { success: false, pluginId, error: `Plugin "${pluginId}" is not installed.` };
    }

    try {
      store.uninstallPlugin(pluginId);
      return { success: true, pluginId };
    } catch (e: any) {
      return { success: false, pluginId, error: e.message || 'Uninstall failed' };
    }
  },

  /**
   * Toggle a plugin's enabled state without full uninstall.
   */
  toggle(pluginId: string): boolean {
    const store = usePluginStore.getState();
    const state = store.getInstallState(pluginId);
    if (!state) return false;
    store.togglePlugin(pluginId);
    return true;
  },

  /**
   * Check permissions for a plugin against its declared permissions.
   * Accounts for privacy overrides.
   */
  checkPermissions(pluginId: string, permissions: PluginPermission[]): PermissionCheckResult {
    const store = usePluginStore.getState();
    const denied: PluginPermission[] = [];

    for (const perm of permissions) {
      if (!store.isPermissionGranted(pluginId, perm)) {
        denied.push(perm);
      }
    }

    return {
      granted: denied.length === 0,
      denied,
      reason: denied.length > 0
        ? `${denied.length} permission(s) denied by privacy overrides: ${denied.join(', ')}`
        : undefined,
    };
  },

  /**
   * Check if a specific RPC method is allowed given the plugin's permissions.
   * Maps RPC method names to required permissions.
   */
  isRpcMethodAllowed(pluginId: string, method: string): boolean {
    const requiredPermission = RPC_METHOD_PERMISSIONS[method];
    if (!requiredPermission) return true; // No permission required
    const store = usePluginStore.getState();
    return store.isPermissionGranted(pluginId, requiredPermission);
  },

  /**
   * Compare current plugin version against a target version.
   */
  checkVersion(pluginId: string, targetVersion: string): VersionCheckResult {
    const manifest = getPlugin(pluginId);
    const current = manifest?.version || '0.0.0';
    return {
      current,
      latest: targetVersion,
      updateAvailable: isNewer(targetVersion, current),
    };
  },

  /**
   * Open a plugin — returns the window data needed to render it.
   */
  openPlugin(pluginId: string): { appId: string; title: string; data: Record<string, any> } | null {
    const manifest = getPlugin(pluginId);
    if (!manifest) return null;

    const store = usePluginStore.getState();
    const installState = store.getInstallState(pluginId);
    if (!installState?.enabled) return null;

    if (manifest.runtime === 'iframe' && manifest.entryUrl) {
      return {
        appId: pluginId,
        title: manifest.name,
        data: { pluginUrl: manifest.entryUrl, pluginId },
      };
    }

    // Native plugin — just return the appId, desktop will resolve the component
    return {
      appId: pluginId,
      title: manifest.name,
      data: {},
    };
  },

  /**
   * Register a plugin from a remote manifest URL (fetch + register).
   */
  async registerFromUrl(manifestUrl: string): Promise<InstallResult> {
    try {
      const res = await fetch(manifestUrl);
      if (!res.ok) return { success: false, pluginId: '', error: `Failed to fetch manifest: ${res.status}` };
      const manifest: PluginManifest = await res.json();
      if (!manifest.id || !manifest.name || !manifest.version) {
        return { success: false, pluginId: '', error: 'Invalid manifest: missing id, name, or version' };
      }
      const store = usePluginStore.getState();
      store.registerPlugin(manifest);
      return { success: true, pluginId: manifest.id };
    } catch (e: any) {
      return { success: false, pluginId: '', error: e.message || 'Failed to fetch manifest' };
    }
  },

  /**
   * Validate a plugin manifest has all required fields.
   */
  validateManifest(manifest: Partial<PluginManifest>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!manifest.id) errors.push('Missing required field: id');
    if (!manifest.name) errors.push('Missing required field: name');
    if (!manifest.version) errors.push('Missing required field: version');
    if (!manifest.description) errors.push('Missing required field: description');
    if (!manifest.author) errors.push('Missing required field: author');
    if (!manifest.category) errors.push('Missing required field: category');
    if (!manifest.permissions) errors.push('Missing required field: permissions');
    if (!manifest.runtime) errors.push('Missing required field: runtime');
    if (manifest.runtime === 'iframe' && !manifest.entryUrl) {
      errors.push('iframe plugins require an entryUrl');
    }
    if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      errors.push('Version must follow semver format (e.g., 1.0.0)');
    }
    return { valid: errors.length === 0, errors };
  },
};

// ─── RPC Method → Permission Map ───────────────────────────────────────

/** Maps RPC method names to the permission required to invoke them */
const RPC_METHOD_PERMISSIONS: Record<string, PluginPermission> = {
  'files.listFiles': 'files:read',
  'files.openFile': 'files:read',
  'files.saveFile': 'files:write',
  'events.emit': 'workspace:write',
  'events.subscribe': 'workspace:read',
  'presence.getOnlineUsers': 'presence:read',
  'presence.setActivity': 'workspace:write',
  'calls.startCall': 'workspace:write',
  'calls.joinCall': 'workspace:write',
  'ui.showNotification': 'notifications:send',
  'ui.openWindow': 'window:open',
  'auth.getCurrentUser': 'workspace:read',
  'auth.hasPermission': 'workspace:read',
  'campaignLab.getCampaigns': 'workspace:read',
  'campaignLab.updateCampaignStatus': 'workspace:write',
};
