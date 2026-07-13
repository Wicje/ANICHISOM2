/**
 * Version Management Service — plugin version checking, update notifications,
 * and minOSVersion enforcement.
 *
 * Non-React service layer. Manages semver comparison, update history,
 * auto-update preferences, and OS compatibility checks.
 */

// ─── Types ──────────────────────────────────────────────────────────────

export interface VersionInfo {
  pluginId: string;
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  minOSVersion?: string;
  changelog?: string;
  downloadUrl?: string;
  updatedAt: number;
}

export interface UpdateRecord {
  pluginId: string;
  fromVersion: string;
  toVersion: string;
  updatedAt: number;
  success: boolean;
}

// ─── Storage ────────────────────────────────────────────────────────────

const HISTORY_KEY = 'anichisom-version-history';
const AUTO_UPDATE_KEY = 'anichisom-auto-update';

function loadHistory(): UpdateRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveHistory(records: UpdateRecord[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
}

function loadAutoUpdatePrefs(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(AUTO_UPDATE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveAutoUpdatePrefs(prefs: Record<string, boolean>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTO_UPDATE_KEY, JSON.stringify(prefs));
}

// ─── Helpers ────────────────────────────────────────────────────────────

function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const clean = version.replace(/^v/, '');
  const parts = clean.split('.').map(Number);
  return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
}

// ─── Version Management Service ────────────────────────────────────────

export const VersionManagementService = {
  /**
   * Compare two semver strings.
   * Returns -1 if a < b, 0 if equal, 1 if a > b.
   */
  compareSemver(a: string, b: string): -1 | 0 | 1 {
    const va = parseVersion(a);
    const vb = parseVersion(b);

    if (va.major !== vb.major) return va.major < vb.major ? -1 : 1;
    if (va.minor !== vb.minor) return va.minor < vb.minor ? -1 : 1;
    if (va.patch !== vb.patch) return va.patch < vb.patch ? -1 : 1;
    return 0;
  },

  /**
   * Compare current plugin version against a latest version.
   * Returns a VersionInfo object indicating whether an update is available.
   */
  checkForUpdate(
    pluginId: string,
    currentVersion: string,
    latestVersion: string,
    minOSVersion?: string,
    changelog?: string,
    downloadUrl?: string,
  ): VersionInfo {
    return {
      pluginId,
      currentVersion,
      latestVersion,
      updateAvailable: this.compareSemver(latestVersion, currentVersion) === 1,
      minOSVersion,
      changelog,
      downloadUrl,
      updatedAt: Date.now(),
    };
  },

  /**
   * Check if the current OS version meets the minimum requirement.
   */
  isOSCompatible(minOSVersion: string): boolean {
    if (typeof navigator === 'undefined') return true;

    const ua = navigator.userAgent;
    let currentVersion = '0.0.0';

    if (ua.includes('Windows NT')) {
      const match = ua.match(/Windows NT (\d+\.\d+)/);
      if (match) currentVersion = match[1]!;
    } else if (ua.includes('Mac OS X')) {
      const match = ua.match(/Mac OS X (\d+[._]\d+(?:[._]\d+)?)/);
      if (match) currentVersion = match[1]!.replace(/_/g, '.');
    } else if (ua.includes('Linux')) {
      const match = ua.match(/Linux\s+(\d+\.\d+)/);
      if (match) currentVersion = match[1]!;
    }

    return this.compareSemver(currentVersion, minOSVersion) !== -1;
  },

  /**
   * Store an update record in history.
   */
  recordUpdate(
    pluginId: string,
    fromVersion: string,
    toVersion: string,
    success: boolean,
  ): void {
    const records = loadHistory();
    records.push({
      pluginId,
      fromVersion,
      toVersion,
      updatedAt: Date.now(),
      success,
    });
    saveHistory(records);
  },

  /**
   * Get update history, optionally filtered by pluginId.
   */
  getUpdateHistory(pluginId?: string): UpdateRecord[] {
    const records = loadHistory();
    if (pluginId) {
      return records.filter((r) => r.pluginId === pluginId);
    }
    return records;
  },

  /**
   * Get all plugins that have available updates.
   */
  getAvailableUpdates(): VersionInfo[] {
    const records = loadHistory();
    const seen = new Set<string>();
    const updates: VersionInfo[] = [];

    for (const record of records) {
      if (!seen.has(record.pluginId)) {
        seen.add(record.pluginId);
        if (this.compareSemver(record.toVersion, record.fromVersion) === 1) {
          updates.push({
            pluginId: record.pluginId,
            currentVersion: record.fromVersion,
            latestVersion: record.toVersion,
            updateAvailable: true,
            updatedAt: record.updatedAt,
          });
        }
      }
    }

    return updates;
  },

  /**
   * Check auto-update preference for a plugin.
   */
  shouldAutoUpdate(pluginId: string): boolean {
    const prefs = loadAutoUpdatePrefs();
    return prefs[pluginId] ?? false;
  },

  /**
   * Set auto-update preference for a plugin.
   */
  setAutoUpdate(pluginId: string, enabled: boolean): void {
    const prefs = loadAutoUpdatePrefs();
    prefs[pluginId] = enabled;
    saveAutoUpdatePrefs(prefs);
  },
};
