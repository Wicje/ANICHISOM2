/**
 * Private Registry Service — GitHub-based private plugin hosting with org-scoped access control.
 *
 * Allows organizations to host private plugin registries via GitHub repos.
 * The registry is a GitHub repo containing plugin manifests in a structured format.
 */

// ─── Types ──────────────────────────────────────────────────────────────

export interface RegistryConfig {
  id: string;
  name: string;
  orgName: string;
  repoUrl: string;
  branch: string;
  accessToken: string;
  isDefault: boolean;
  createdAt: number;
}

export interface RegistryPlugin {
  manifest: any;
  registryId: string;
  path: string;
  lastSync: number;
}

export interface OrgMember {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  addedAt: number;
}

// ─── Storage ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'continuaos-private-registries';

function loadFromStorage(): {
  registries: Map<string, RegistryConfig>;
  members: Map<string, OrgMember[]>;
} {
  const registries = new Map<string, RegistryConfig>();
  const members = new Map<string, OrgMember[]>();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.registries) {
        for (const [k, v] of Object.entries(parsed.registries) as [string, RegistryConfig][]) {
          registries.set(k, v);
        }
      }
      if (parsed.members) {
        for (const [k, v] of Object.entries(parsed.members) as [string, OrgMember[]][]) {
          members.set(k, v);
        }
      }
    }
  } catch {
    // corrupt storage, start fresh
  }
  return { registries, members };
}

function persistToStorage() {
  const registriesObj: Record<string, RegistryConfig> = {};
  for (const [k, v] of registries) registriesObj[k] = v;
  const membersObj: Record<string, OrgMember[]> = {};
  for (const [k, v] of members) membersObj[k] = v;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ registries: registriesObj, members: membersObj }));
}

const { registries, members } = loadFromStorage();

import { generateId } from '@/lib/utils';

// ─── Helpers ────────────────────────────────────────────────────────────

function parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
  try {
    const url = new URL(repoUrl);
    const parts = url.pathname.replace(/^\//, '').replace(/\/$/, '').split('/');
    if (parts.length >= 2) {
      return { owner: parts[0]!, repo: parts[1]! };
    }
  } catch {
    // not a valid URL, try github shorthand
    const match = repoUrl.match(/^([^/]+)\/([^/]+)$/);
    if (match) return { owner: match[1]!, repo: match[2]! };
  }
  return null;
}

// ─── Service ────────────────────────────────────────────────────────────

export const PrivateRegistryService = {
  async createRegistry(
    name: string,
    orgName: string,
    repoUrl: string,
    branch: string,
    accessToken: string,
  ): Promise<RegistryConfig> {
    const parsed = parseRepoUrl(repoUrl);
    if (!parsed) throw new Error('Invalid repository URL');

    // Validate GitHub repo is accessible
    const checkUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`;
    const res = await fetch(checkUrl, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github.v3+json' },
    });
    if (!res.ok) {
      throw new Error(`GitHub repo not accessible: ${res.status} ${res.statusText}`);
    }

    // If this is the first registry for the org, make it default
    const orgHasRegistries = Array.from(registries.values()).some((r) => r.orgName === orgName);
    const isDefault = !orgHasRegistries;

    const config: RegistryConfig = {
      id: generateId('reg'),
      name,
      orgName,
      repoUrl,
      branch,
      accessToken,
      isDefault,
      createdAt: Date.now(),
    };

    registries.set(config.id, config);
    persistToStorage();
    return config;
  },

  deleteRegistry(id: string): void {
    if (!registries.has(id)) throw new Error(`Registry "${id}" not found`);
    registries.delete(id);
    // Also remove cached plugins for this registry
    (PrivateRegistryService as any)['_pluginCache']?.delete(id);
    persistToStorage();
  },

  getRegistries(): RegistryConfig[] {
    return Array.from(registries.values());
  },

  setDefaultRegistry(id: string): void {
    const target = registries.get(id);
    if (!target) throw new Error(`Registry "${id}" not found`);
    for (const reg of registries.values()) {
      if (reg.orgName === target.orgName) {
        registries.set(reg.id, { ...reg, isDefault: reg.id === id });
      }
    }
    persistToStorage();
  },

  async syncRegistry(id: string): Promise<RegistryPlugin[]> {
    const config = registries.get(id);
    if (!config) throw new Error(`Registry "${id}" not found`);

    const parsed = parseRepoUrl(config.repoUrl);
    if (!parsed) throw new Error('Invalid repository URL');

    const contentsUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/plugins?ref=${config.branch}`;
    const res = await fetch(contentsUrl, {
      headers: { Authorization: `Bearer ${config.accessToken}`, Accept: 'application/vnd.github.v3+json' },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch plugin manifests: ${res.status} ${res.statusText}`);
    }

    const files: Array<{ name: string; path: string; type: string }> = await res.json();
    const jsonFiles = files.filter((f) => f.type === 'file' && f.name.endsWith('.json'));

    const plugins: RegistryPlugin[] = [];
    for (const file of jsonFiles) {
      try {
        const raw = await fetch(
          `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/${file.path}?ref=${config.branch}`,
          {
            headers: {
              Authorization: `Bearer ${config.accessToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          },
        );
        if (raw.ok) {
          const content = await raw.json();
          // GitHub API returns base64-encoded content
          const decoded = atob(content.content);
          const manifest = JSON.parse(decoded);
          plugins.push({
            manifest,
            registryId: id,
            path: file.path,
            lastSync: Date.now(),
          });
        }
      } catch {
        // skip malformed files
      }
    }

    pluginCache.set(id, plugins);
    persistToStorage();
    return plugins;
  },

  // ─── Org Members ────────────────────────────────────────────────

  addOrgMember(orgName: string, email: string, role: 'owner' | 'admin' | 'member'): OrgMember {
    if (!members.has(orgName)) members.set(orgName, []);
    const orgMembers = members.get(orgName)!;

    // Prevent duplicate emails
    const existing = orgMembers.find((m) => m.email === email);
    if (existing) throw new Error(`Member "${email}" already exists in org "${orgName}"`);

    const member: OrgMember = {
      id: generateId('member'),
      email,
      role,
      addedAt: Date.now(),
    };
    orgMembers.push(member);
    persistToStorage();
    return member;
  },

  removeOrgMember(orgName: string, memberId: string): void {
    const orgMembers = members.get(orgName);
    if (!orgMembers) throw new Error(`Org "${orgName}" not found`);
    const idx = orgMembers.findIndex((m) => m.id === memberId);
    if (idx === -1) throw new Error(`Member "${memberId}" not found in org "${orgName}"`);
    orgMembers.splice(idx, 1);
    persistToStorage();
  },

  getOrgMembers(orgName: string): OrgMember[] {
    return members.get(orgName) || [];
  },

  checkAccess(orgName: string, email: string): boolean {
    // Owners always have access
    const orgMembers = members.get(orgName) || [];
    return orgMembers.some((m) => m.email === email);
  },

  // ─── Search ─────────────────────────────────────────────────────

  searchRegistries(query: string): RegistryPlugin[] {
    const q = query.toLowerCase();
    const results: RegistryPlugin[] = [];
    for (const plugins of pluginCache.values()) {
      for (const plugin of plugins) {
        const manifest = plugin.manifest;
        if (
          manifest.name?.toLowerCase().includes(q) ||
          manifest.description?.toLowerCase().includes(q) ||
          manifest.id?.toLowerCase().includes(q) ||
          manifest.author?.toLowerCase().includes(q)
        ) {
          results.push(plugin);
        }
      }
    }
    return results;
  },
};

// ─── Plugin Cache (internal) ───────────────────────────────────────────

const pluginCache = new Map<string, RegistryPlugin[]>();

// Expose for service's internal use
(PrivateRegistryService as any)['_pluginCache'] = pluginCache;
