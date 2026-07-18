/**
 * Plugin Registry — Dynamic runtime registration for third-party apps/plugins.
 *
 * Mirrors the server-side connector-registry/ai-provider-factory patterns
 * but works on the client side for React component registration.
 *
 * Plugins register a manifest + component, and the desktop merges them
 * into the APPS dict at render time.
 */

import type { ComponentType } from 'react';

// ─── Manifest Types ────────────────────────────────────────────────────────

export type PluginCategory = 'productivity' | 'creative' | 'development' | 'communication' | 'analytics' | 'media' | 'social' | 'utility' | 'other';

export type PluginPermission = 'files:read' | 'files:write' | 'network:fetch' | 'clipboard:read' | 'clipboard:write' | 'workspace:read' | 'workspace:write' | 'presence:read' | 'notifications:send' | 'window:open' | 'ai:query';

export type PluginRuntime = 'iframe' | 'native';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  authorUrl?: string;
  iconUrl?: string;
  category: PluginCategory;
  permissions: PluginPermission[];
  runtime: PluginRuntime;
  entryUrl?: string;             // For iframe plugins: URL to load
  component?: ComponentType<any>; // For native plugins: React component
  roles?: string[];              // OS roles that can use this plugin
  isCore?: boolean;              // true = always visible (built-in)
  homepage?: string;
  screenshots?: string[];
  tags?: string[];
  minOSVersion?: string;
  changelog?: string;
  rating?: number;               // 0-5 average user rating
  installCount?: number;
  publishedAt?: number;
  updatedAt?: number;
  source: 'builtin' | 'local' | 'marketplace' | 'custom';
}

export interface PluginInstallState {
  id: string;
  installedAt: number;
  enabled: boolean;
  privacyOverrides?: Record<string, boolean>; // per-permission privacy toggle
}

// ─── Registry ──────────────────────────────────────────────────────────────

const registry = new Map<string, PluginManifest>();
const installStates = new Map<string, PluginInstallState>();
let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach(l => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  return () => { listeners = listeners.filter(l => l !== listener); };
}

/** Register a new plugin manifest into the registry */
export function registerPlugin(manifest: PluginManifest): void {
  if (registry.has(manifest.id)) {
    console.warn(`[PluginRegistry] Overwriting existing plugin: ${manifest.id}`);
  }
  registry.set(manifest.id, manifest);
  notify();
}

/** Unregister a plugin from the registry */
export function unregisterPlugin(id: string): void {
  registry.delete(id);
  installStates.delete(id);
  notify();
}

/** Get a single plugin manifest */
export function getPlugin(id: string): PluginManifest | undefined {
  return registry.get(id);
}

/** Get all registered plugin manifests */
export function getAllPlugins(): PluginManifest[] {
  return Array.from(registry.values());
}

/** Get plugins by category */
export function getPluginsByCategory(category: PluginCategory): PluginManifest[] {
  return Array.from(registry.values()).filter(m => m.category === category);
}

/** Get plugins by source */
export function getPluginsBySource(source: PluginManifest['source']): PluginManifest[] {
  return Array.from(registry.values()).filter(m => m.source === source);
}

/** Search plugins by name/description/tags */
export function searchPlugins(query: string): PluginManifest[] {
  const q = query.toLowerCase();
  return Array.from(registry.values()).filter(m =>
    m.name.toLowerCase().includes(q) ||
    m.description.toLowerCase().includes(q) ||
    m.tags?.some(t => t.toLowerCase().includes(q)) ||
    m.category.includes(q)
  );
}

// ─── Install State ─────────────────────────────────────────────────────────

/** Mark a plugin as installed */
export function installPlugin(id: string): void {
  if (!registry.has(id)) {
    console.warn(`[PluginRegistry] Cannot install unknown plugin: ${id}`);
    return;
  }
  installStates.set(id, {
    id,
    installedAt: Date.now(),
    enabled: true,
  });
  notify();
}

/** Mark a plugin as uninstalled */
export function uninstallPlugin(id: string): void {
  installStates.delete(id);
  notify();
}

/** Get install state for a plugin */
export function getInstallState(id: string): PluginInstallState | undefined {
  return installStates.get(id);
}

/** Get all installed plugins */
export function getInstalledPlugins(): PluginManifest[] {
  return Array.from(installStates.keys())
    .map(id => registry.get(id))
    .filter((m): m is PluginManifest => m !== undefined);
}

/** Toggle plugin enabled/disabled */
export function togglePluginEnabled(id: string): void {
  const state = installStates.get(id);
  if (state) {
    state.enabled = !state.enabled;
    installStates.set(id, { ...state });
    notify();
  }
}

/** Set a privacy override for a specific permission on a plugin */
export function setPrivacyOverride(pluginId: string, permission: string, allowed: boolean): void {
  const state = installStates.get(pluginId);
  if (state) {
    const overrides = state.privacyOverrides || {};
    overrides[permission] = allowed;
    installStates.set(pluginId, { ...state, privacyOverrides: overrides });
    notify();
  }
}

/** Check if a plugin is installed AND enabled */
export function isPluginActive(id: string): boolean {
  const state = installStates.get(id);
  return state?.enabled === true;
}

// ─── Persistence ───────────────────────────────────────────────────────────

const STORAGE_KEY = 'continuaos_plugin_states';

/** Save install states to localStorage */
export function persistInstallStates(): void {
  try {
    const data = Array.from(installStates.entries());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[PluginRegistry] Failed to persist install states:', e);
  }
}

/** Load install states from localStorage */
export function loadInstallStates(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as Array<[string, PluginInstallState]>;
      data.forEach(([id, state]) => installStates.set(id, state));
      notify();
    }
  } catch (e) {
    console.warn('[PluginRegistry] Failed to load install states:', e);
  }
}

// ─── Builtin Plugin Registration ───────────────────────────────────────────

/**
 * Called once at app startup to register built-in plugins that map
 * to existing APPS entries in desktop.tsx. This bridges the static
 * APPS dict with the dynamic registry.
 */
export function registerBuiltinPlugins(builtinAppIds: string[]): void {
  builtinAppIds.forEach(id => {
    if (!registry.has(id)) {
      registerPlugin({
        id,
        name: id, // Desktop will override with proper names
        version: '1.0.0',
        description: `Built-in ${id} app`,
        author: 'ContinuaOS',
        category: 'productivity',
        permissions: [],
        runtime: 'native',
        roles: ['admin', 'filmmaker', 'technician', 'designer', 'client', 'user'],
        isCore: true,
        source: 'builtin',
      });
      // Built-in apps are always "installed"
      if (!installStates.has(id)) {
        installStates.set(id, { id, installedAt: 0, enabled: true });
      }
    }
  });
}
