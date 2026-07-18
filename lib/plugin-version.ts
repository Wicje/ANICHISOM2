/**
 * ContinuaOS — Plugin Version Management
 * 
 * Handles plugin upgrades, migrations, and version compatibility.
 */

import { z } from 'zod';

// ─── Version Comparison ─────────────────────────────────────

/**
 * Compare two semver strings.
 * Returns: -1 (a < b), 0 (equal), 1 (a > b)
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);

  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

/**
 * Check if a version satisfies a range.
 * Supports: exact, ^, ~, >=, <=
 */
export function satisfiesRange(version: string, range: string): boolean {
  // Exact match
  if (!range.startsWith('^') && !range.startsWith('~') && !range.startsWith('>') && !range.startsWith('<')) {
    return version === range;
  }

  if (range.startsWith('^')) {
    // Compatible with version (allows patch/minor changes)
    const target = range.slice(1);
    const cmp = compareVersions(version, target);
    if (cmp === -1) return false;
    // Major must match
    const [majorA] = version.split('.').map(Number);
    const [majorT] = target.split('.').map(Number);
    return majorA === majorT;
  }

  if (range.startsWith('~')) {
    // Approximately equivalent (allows patch changes only)
    const target = range.slice(1);
    const cmp = compareVersions(version, target);
    if (cmp === -1) return false;
    const [majorA, minorA] = version.split('.').map(Number);
    const [majorT, minorT] = target.split('.').map(Number);
    return majorA === majorT && minorA === minorT;
  }

  if (range.startsWith('>=')) {
    return compareVersions(version, range.slice(2)) >= 0;
  }

  if (range.startsWith('<=')) {
    return compareVersions(version, range.slice(2)) <= 0;
  }

  return false;
}

// ─── Migration System ───────────────────────────────────────

export interface Migration {
  /** Version this migration applies from */
  fromVersion: string;
  /** Version this migration applies to */
  toVersion: string;
  /** Migration function — transforms data */
  migrate: (data: Record<string, unknown>) => Record<string, unknown>;
  /** Description of what this migration does */
  description: string;
}

export interface PluginVersion {
  /** Plugin ID */
  pluginId: string;
  /** Current installed version */
  currentVersion: string;
  /** Available version (if update available) */
  latestVersion: string;
  /** List of migrations for this plugin */
  migrations: Migration[];
}

/**
 * Get the migration path between two versions.
 * Returns ordered list of migrations to apply.
 */
export function getMigrationPath(
  migrations: Migration[],
  fromVersion: string,
  toVersion: string
): Migration[] {
  const path: Migration[] = [];
  let currentVersion = fromVersion;

  // Find all migrations that need to be applied
  const sortedMigrations = [...migrations].sort((a, b) =>
    compareVersions(a.fromVersion, b.fromVersion)
  );

  for (const migration of sortedMigrations) {
    if (
      compareVersions(migration.fromVersion, currentVersion) >= 0 &&
      compareVersions(migration.toVersion, toVersion) <= 0
    ) {
      path.push(migration);
      currentVersion = migration.toVersion;
    }
  }

  return path;
}

/**
 * Apply a migration path to data.
 */
export function applyMigrations(
  data: Record<string, unknown>,
  migrations: Migration[]
): Record<string, unknown> {
  let result = { ...data };

  for (const migration of migrations) {
    try {
      result = migration.migrate(result);
    } catch (error) {
      console.error(`Migration failed: ${migration.description}`, error);
      throw new Error(`Migration failed: ${migration.description}`);
    }
  }

  return result;
}

// ─── Plugin Registry ────────────────────────────────────────

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  manifestUrl: string;
  installedAt: string;
  lastUpdated: string;
  enabled: boolean;
}

// In-memory plugin registry (in production, persist to IndexedDB)
const pluginRegistry = new Map<string, PluginInfo>();

/**
 * Register a plugin in the local registry.
 */
export function registerPlugin(info: PluginInfo): void {
  pluginRegistry.set(info.id, info);
}

/**
 * Get a plugin from the local registry.
 */
export function getPlugin(id: string): PluginInfo | undefined {
  return pluginRegistry.get(id);
}

/**
 * Get all registered plugins.
 */
export function getAllPlugins(): PluginInfo[] {
  return Array.from(pluginRegistry.values());
}

/**
 * Update a plugin's version.
 */
export function updatePlugin(id: string, newVersion: string): void {
  const plugin = pluginRegistry.get(id);
  if (plugin) {
    pluginRegistry.set(id, {
      ...plugin,
      version: newVersion,
      lastUpdated: new Date().toISOString(),
    });
  }
}

/**
 * Remove a plugin from the registry.
 */
export function removePlugin(id: string): void {
  pluginRegistry.delete(id);
}

/**
 * Enable/disable a plugin.
 */
export function setPluginEnabled(id: string, enabled: boolean): void {
  const plugin = pluginRegistry.get(id);
  if (plugin) {
    pluginRegistry.set(id, { ...plugin, enabled });
  }
}

/**
 * Check if a plugin update is available.
 */
export function hasUpdateAvailable(id: string, latestVersion: string): boolean {
  const plugin = pluginRegistry.get(id);
  if (!plugin) return false;
  return compareVersions(latestVersion, plugin.version) > 0;
}

/**
 * Get all plugins with available updates.
 */
export function getPluginsWithUpdates(): Array<PluginInfo & { latestVersion: string }> {
  return [];
  // In production, this would check a remote registry for updates
}
