/**
 * Context Summarization — Generates natural language summaries of workspace activity.
 *
 * Creates human-readable descriptions of what the user was working on,
 * useful for workspace restore screens and team context sharing.
 */
import type { WorkspaceSnapshot, WorkspaceResource } from './types';

export interface WorkspaceSummary {
  /** One-line summary (e.g., "Working on Continua landing page") */
  headline: string;
  /** Detailed summary with resource breakdown */
  description: string;
  /** Key resources highlighted */
  highlights: string[];
  /** Estimated session duration in minutes */
  durationMinutes: number;
  /** Resource counts by type */
  resourceCounts: {
    urls: number;
    files: number;
    apps: number;
    notes: number;
  };
}

/**
 * Generate a natural language summary of a workspace.
 */
export function summarizeWorkspace(workspace: WorkspaceSnapshot): WorkspaceSummary {
  const resources = workspace.resources;
  const duration = estimateDuration(resources);
  const counts = countByType(resources);

  const headline = generateHeadline(workspace, counts);
  const description = generateDescription(workspace, counts, duration);
  const highlights = extractHighlights(resources);

  return {
    headline,
    description,
    highlights,
    durationMinutes: duration,
    resourceCounts: counts,
  };
}

function estimateDuration(resources: WorkspaceResource[]): number {
  if (resources.length === 0) return 0;

  const earliest = Math.min(...resources.map(r => r.firstAccessed));
  const latest = Math.max(...resources.map(r => r.lastAccessed));
  const spanMs = latest - earliest;

  // Add up dwell times
  const totalDwell = resources.reduce((sum, r) => sum + r.dwellTimeMs, 0);

  // Use the larger of span time or dwell time (span gives "session length",
  // dwell gives "active time")
  const effectiveMs = Math.max(spanMs, totalDwell);
  return Math.round(effectiveMs / 60_000);
}

function countByType(resources: WorkspaceResource[]) {
  const counts = { urls: 0, files: 0, apps: 0, notes: 0 };
  for (const r of resources) {
    switch (r.type) {
      case 'url': counts.urls++; break;
      case 'file': counts.files++; break;
      case 'application': counts.apps++; break;
      case 'note': counts.notes++; break;
    }
  }
  return counts;
}

function generateHeadline(
  workspace: WorkspaceSnapshot,
  counts: { urls: number; files: number; apps: number; notes: number }
): string {
  // Use active task if set
  if (workspace.activeTask) {
    return `Working on ${workspace.activeTask}`;
  }

  // Determine the primary activity
  const total = counts.urls + counts.files + counts.apps + counts.notes;
  if (total === 0) return 'Empty session';

  // Dominant resource type
  if (counts.apps > counts.urls && counts.apps > counts.files) {
    const apps = workspace.resources.filter(r => r.type === 'application');
    const appName = apps[0]?.name || apps[0]?.metadata.appTitle || 'an app';
    return `Using ${appName}`;
  }

  if (counts.urls > counts.files) {
    const urls = workspace.resources.filter(r => r.type === 'url');
    const title = urls[0]?.metadata.title || new URL(urls[0]?.metadata.url || 'https://example.com').hostname;
    return `Researching: ${title}`;
  }

  if (counts.files > 0) {
    const files = workspace.resources.filter(r => r.type === 'file');
    const projectName = extractProjectName(files[0]?.metadata.filePath || '');
    return projectName ? `Working on ${projectName}` : 'Editing files';
  }

  return 'Active session';
}

function generateDescription(
  workspace: WorkspaceSnapshot,
  counts: { urls: number; files: number; apps: number; notes: number },
  durationMinutes: number
): string {
  const parts: string[] = [];

  // Duration
  if (durationMinutes > 0) {
    if (durationMinutes < 60) {
      parts.push(`${durationMinutes} minute session`);
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      parts.push(`${hours}h ${mins}m session`);
    }
  }

  // Resource breakdown
  const breakdown: string[] = [];
  if (counts.urls > 0) breakdown.push(`${counts.urls} URL${counts.urls !== 1 ? 's' : ''}`);
  if (counts.files > 0) breakdown.push(`${counts.files} file${counts.files !== 1 ? 's' : ''}`);
  if (counts.apps > 0) breakdown.push(`${counts.apps} app${counts.apps !== 1 ? 's' : ''}`);
  if (counts.notes > 0) breakdown.push(`${counts.notes} note${counts.notes !== 1 ? 's' : ''}`);

  if (breakdown.length > 0) {
    parts.push(`Including ${breakdown.join(', ')}`);
  }

  return parts.join('. ') || 'No activity recorded';
}

function extractHighlights(resources: WorkspaceResource[]): string[] {
  const highlights: string[] = [];

  // Top accessed resources
  const topAccessed = [...resources]
    .sort((a, b) => b.accessCount - a.accessCount)
    .slice(0, 3);

  for (const r of topAccessed) {
    if (r.type === 'url' && r.metadata.title) {
      highlights.push(r.metadata.title);
    } else if (r.type === 'file' && r.metadata.filePath) {
      const filename = r.metadata.filePath.split('/').pop();
      if (filename) highlights.push(filename);
    } else if (r.type === 'application' && r.metadata.appTitle) {
      highlights.push(r.metadata.appTitle);
    }
  }

  // High relevance resources
  const highRelevance = resources.filter(r => r.relevance === 'high');
  for (const r of highRelevance.slice(0, 2)) {
    const name = r.metadata.title || r.name;
    if (!highlights.includes(name)) {
      highlights.push(name);
    }
  }

  return highlights.slice(0, 5);
}

function extractProjectName(filePath: string): string {
  const parts = filePath.split('/');
  // Common project root indicators
  const projectDirs = ['src', 'lib', 'app', 'pages', 'components', 'packages'];
  for (let i = parts.length - 2; i > 0; i--) {
    const part = parts[i];
    if (part && projectDirs.includes(part)) {
      return parts[i - 1] || '';
    }
  }
  // Fallback: second-to-last directory
  return parts.length >= 2 ? (parts[parts.length - 2] || '') : '';
}
