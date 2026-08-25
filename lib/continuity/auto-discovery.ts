/**
 * Workspace Auto-Discovery — Groups related resources into workspaces.
 *
 * Analyzes accumulated resources and suggests workspace groupings
 * based on domain, project tags, access patterns, and content similarity.
 */
import type { WorkspaceResource } from './types';

export interface WorkspaceGroup {
  id: string;
  suggestedName: string;
  resources: WorkspaceResource[];
  confidence: number; // 0-1, how confident we are in this grouping
  criteria: string; // what made us group these
}

/**
 * Group resources into workspace clusters based on heuristics.
 */
export function discoverWorkspaces(resources: WorkspaceResource[]): WorkspaceGroup[] {
  if (resources.length === 0) return [];

  const groups: WorkspaceGroup[] = [];

  // 1. Group by domain (e.g., all github.com resources)
  const domainGroups = groupByDomain(resources);
  for (const [domain, res] of Object.entries(domainGroups)) {
    if (res.length >= 2) {
      groups.push({
        id: `domain-${domain}`,
        suggestedName: nameFromDomain(domain, res),
        resources: res,
        confidence: 0.7,
        criteria: `Same domain: ${domain}`,
      });
    }
  }

  // 2. Group by file path prefix (e.g., all files in same project)
  const pathGroups = groupByPath(resources);
  for (const [prefix, res] of Object.entries(pathGroups)) {
    if (res.length >= 2) {
      groups.push({
        id: `path-${prefix}`,
        suggestedName: nameFromPath(prefix, res),
        resources: res,
        confidence: 0.8,
        criteria: `Same project: ${prefix}`,
      });
    }
  }

  // 3. Group by app type (e.g., all code-editor resources)
  const appGroups = groupByApp(resources);
  for (const [appId, res] of Object.entries(appGroups)) {
    if (res.length >= 2) {
      groups.push({
        id: `app-${appId}`,
        suggestedName: nameFromApp(appId, res),
        resources: res,
        confidence: 0.6,
        criteria: `Same app: ${appId}`,
      });
    }
  }

  // 4. Group by recency (resources accessed close in time)
  const timeGroups = groupByTime(resources);
  for (const [key, res] of Object.entries(timeGroups)) {
    if (res.length >= 3) {
      groups.push({
        id: `time-${key}`,
        suggestedName: nameFromTime(res),
        resources: res,
        confidence: 0.5,
        criteria: 'Accessed around the same time',
      });
    }
  }

  // Merge overlapping groups (resources in multiple groups → highest confidence wins)
  return mergeGroups(groups);
}

function groupByDomain(resources: WorkspaceResource[]): Record<string, WorkspaceResource[]> {
  const groups: Record<string, WorkspaceResource[]> = {};
  for (const r of resources) {
    if (r.type === 'url' && r.metadata.url) {
      try {
        const url = new URL(r.metadata.url);
        const domain = url.hostname.replace('www.', '');
        if (!groups[domain]) groups[domain] = [];
        groups[domain].push(r);
      } catch { /* invalid URL */ }
    }
  }
  return groups;
}

function groupByPath(resources: WorkspaceResource[]): Record<string, WorkspaceResource[]> {
  const groups: Record<string, WorkspaceResource[]> = {};
  for (const r of resources) {
    if (r.type === 'file' && r.metadata.filePath) {
      const parts = r.metadata.filePath.split('/');
      // Use first 2-3 path segments as the grouping key
      const prefix = parts.slice(0, Math.min(3, parts.length - 1)).join('/');
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(r);
    }
  }
  return groups;
}

function groupByApp(resources: WorkspaceResource[]): Record<string, WorkspaceResource[]> {
  const groups: Record<string, WorkspaceResource[]> = {};
  for (const r of resources) {
    if (r.type === 'application') {
      const appId = r.metadata.appId || r.identifier;
      if (!groups[appId]) groups[appId] = [];
      groups[appId].push(r);
    }
  }
  return groups;
}

function groupByTime(resources: WorkspaceResource[]): Record<string, WorkspaceResource[]> {
  const groups: Record<string, WorkspaceResource[]> = {};
  const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

  // Sort by last accessed
  const sorted = [...resources].sort((a, b) => a.lastAccessed - b.lastAccessed);

  let currentKey = '';
  let currentGroup: WorkspaceResource[] = [];

  for (const r of sorted) {
    const last = currentGroup[currentGroup.length - 1];
    if (currentGroup.length === 0 || (last && r.lastAccessed - last.lastAccessed < WINDOW_MS)) {
      currentGroup.push(r);
    } else {
      if (currentGroup.length >= 3) {
        const first = currentGroup[0];
        if (first) groups[`cluster-${first.lastAccessed}`] = currentGroup;
      }
      currentGroup = [r];
    }
  }

  if (currentGroup.length >= 3) {
    const first = currentGroup[0];
    if (first) groups[`cluster-${first.lastAccessed}`] = currentGroup;
  }

  return groups;
}

function mergeGroups(groups: WorkspaceGroup[]): WorkspaceGroup[] {
  // Sort by confidence (highest first)
  groups.sort((a, b) => b.confidence - a.confidence);

  const seen = new Set<string>();
  const merged: WorkspaceGroup[] = [];

  for (const group of groups) {
    const resourceIds = new Set(group.resources.map(r => r.id));
    const hasOverlap = [...resourceIds].some(id => seen.has(id));

    if (!hasOverlap || group.confidence > 0.7) {
      merged.push(group);
      for (const id of resourceIds) seen.add(id);
    }
  }

  return merged;
}

// ─── Name generators ────────────────────────────────────────

function nameFromDomain(domain: string, resources: WorkspaceResource[]): string {
  const titles = resources
    .map(r => r.metadata.title || r.name)
    .filter(Boolean);

  if (titles.length > 0) {
    // Use the most common word from titles
    const words = titles.join(' ').split(/\s+/).filter(w => w.length > 3);
    const freq = new Map<string, number>();
    for (const w of words) {
      freq.set(w.toLowerCase(), (freq.get(w.toLowerCase()) || 0) + 1);
    }
    const top = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) return `${top[0]} (${domain})`;
  }

  // Fallback: domain name
  const parts = domain.split('.');
  const first = parts[0] || domain;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function nameFromPath(prefix: string, resources: WorkspaceResource[]): string {
  const parts = prefix.split('/');
  const projectName = parts[parts.length - 1] || prefix;
  return projectName.charAt(0).toUpperCase() + projectName.slice(1);
}

function nameFromApp(appId: string, resources: WorkspaceResource[]): string {
  const appNames: Record<string, string> = {
    'code-editor': 'Code Session',
    'terminal': 'Terminal Work',
    'browser': 'Browsing',
    'file-manager': 'File Management',
    'markdown-editor': 'Writing',
    'pdf-reader': 'Reading',
  };
  return appNames[appId] || appId;
}

function nameFromTime(resources: WorkspaceResource[]): string {
  const types = new Set(resources.map(r => r.type));
  if (types.has('url') && types.has('application')) return 'Multi-task Session';
  if (types.has('url')) return 'Research Session';
  if (types.has('file')) return 'File Work';
  if (types.has('application')) return 'App Session';
  return 'Quick Session';
}
