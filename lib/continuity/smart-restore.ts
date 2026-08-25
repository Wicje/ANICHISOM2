/**
 * Smart Restore — Availability checking and alternative suggestions.
 *
 * Detects whether resources can actually be restored on the current device,
 * suggests alternatives when apps aren't available, and checks file accessibility.
 */
import type { WorkspaceResource, RestoreResult } from './types';
import type { DeviceCapabilities } from '@/lib/capabilities';

// ─── App availability registry ──────────────────────────────

interface AppProfile {
  id: string;
  name: string;
  /** Capability required to use this app */
  requiredCap?: keyof DeviceCapabilities;
  /** Category for alternative matching */
  category: string;
  /** Known alternative app IDs */
  alternatives: string[];
  /** Whether this is a web app (always available) */
  isWebApp: boolean;
}

const APP_REGISTRY: Record<string, AppProfile> = {
  'code-editor': {
    id: 'code-editor', name: 'Code Editor',
    category: 'editor', isWebApp: true,
    alternatives: ['terminal', 'markdown-editor'],
  },
  'terminal': {
    id: 'terminal', name: 'Terminal',
    category: 'editor', isWebApp: true,
    alternatives: ['code-editor'],
  },
  'markdown-editor': {
    id: 'markdown-editor', name: 'Markdown Editor',
    category: 'editor', isWebApp: true,
    alternatives: ['code-editor', 'terminal'],
  },
  'file-manager': {
    id: 'file-manager', name: 'File Manager',
    category: 'files', isWebApp: true,
    alternatives: [],
  },
  'browser': {
    id: 'browser', name: 'Browser',
    category: 'browser', isWebApp: true,
    alternatives: [],
  },
  'calculator': {
    id: 'calculator', name: 'Calculator',
    category: 'utility', isWebApp: true,
    alternatives: [],
  },
  'music-player': {
    id: 'music-player', name: 'Music Player',
    category: 'media', isWebApp: true,
    requiredCap: 'hasMediaDevices',
    alternatives: ['video-player'],
  },
  'video-player': {
    id: 'video-player', name: 'Video Player',
    category: 'media', isWebApp: true,
    requiredCap: 'hasMediaDevices',
    alternatives: ['music-player'],
  },
  'image-viewer': {
    id: 'image-viewer', name: 'Image Viewer',
    category: 'media', isWebApp: true,
    alternatives: [],
  },
  'pdf-reader': {
    id: 'pdf-reader', name: 'PDF Reader',
    category: 'documents', isWebApp: true,
    alternatives: ['markdown-editor'],
  },
  'movie-browser': {
    id: 'movie-browser', name: 'Movie Browser',
    category: 'media', isWebApp: true,
    alternatives: ['video-player'],
  },
  'settings': {
    id: 'settings', name: 'Settings',
    category: 'system', isWebApp: true,
    alternatives: [],
  },
  'chat-ai': {
    id: 'chat-ai', name: 'AI Chat',
    category: 'ai', isWebApp: true,
    alternatives: [],
  },
  'spotify': {
    id: 'spotify', name: 'Spotify',
    category: 'media', isWebApp: true,
    alternatives: ['music-player'],
  },
  'youtube': {
    id: 'youtube', name: 'YouTube',
    category: 'media', isWebApp: true,
    alternatives: ['video-player'],
  },
  'weather': {
    id: 'weather', name: 'Weather',
    category: 'utility', isWebApp: true,
    alternatives: [],
  },
  'todo': {
    id: 'todo', name: 'Todo',
    category: 'productivity', isWebApp: true,
    alternatives: [],
  },
  'notes': {
    id: 'notes', name: 'Notes',
    category: 'productivity', isWebApp: true,
    alternatives: ['markdown-editor'],
  },
  'photos': {
    id: 'photos', name: 'Photos',
    category: 'media', isWebApp: true,
    alternatives: ['image-viewer'],
  },
};

// ─── File type → handler mapping ────────────────────────────

const FILE_TYPE_HANDLERS: Record<string, { category: string; handler: string; alternatives: string[] }> = {
  'text/plain': { category: 'text', handler: 'code-editor', alternatives: ['terminal', 'markdown-editor'] },
  'text/markdown': { category: 'text', handler: 'markdown-editor', alternatives: ['code-editor'] },
  'text/html': { category: 'text', handler: 'code-editor', alternatives: ['browser'] },
  'text/css': { category: 'text', handler: 'code-editor', alternatives: [] },
  'text/javascript': { category: 'text', handler: 'code-editor', alternatives: [] },
  'application/json': { category: 'text', handler: 'code-editor', alternatives: ['terminal'] },
  'application/pdf': { category: 'documents', handler: 'pdf-reader', alternatives: ['browser'] },
  'image/jpeg': { category: 'media', handler: 'image-viewer', alternatives: ['photos'] },
  'image/png': { category: 'media', handler: 'image-viewer', alternatives: ['photos'] },
  'image/gif': { category: 'media', handler: 'image-viewer', alternatives: ['photos'] },
  'image/svg+xml': { category: 'media', handler: 'image-viewer', alternatives: ['code-editor'] },
  'image/webp': { category: 'media', handler: 'image-viewer', alternatives: ['photos'] },
  'video/mp4': { category: 'media', handler: 'video-player', alternatives: ['movie-browser'] },
  'video/webm': { category: 'media', handler: 'video-player', alternatives: [] },
  'audio/mpeg': { category: 'media', handler: 'music-player', alternatives: ['spotify'] },
  'audio/wav': { category: 'media', handler: 'music-player', alternatives: [] },
  'application/zip': { category: 'archive', handler: 'file-manager', alternatives: [] },
  'application/x-tar': { category: 'archive', handler: 'file-manager', alternatives: [] },
  'application/gzip': { category: 'archive', handler: 'file-manager', alternatives: [] },
};

// ─── Availability check ─────────────────────────────────────

export interface RestoreAvailability {
  available: boolean;
  reason?: string;
  /** Suggested alternative app/resource if unavailable */
  suggestedAlternative?: { appId: string; name: string };
  /** Whether this is a web app (always restorable in Continua shell) */
  isWebApp: boolean;
  /** Whether the required capabilities are met */
  capabilitiesMet: boolean;
}

/**
 * Check if a resource can be restored on the current device.
 */
export function checkResourceAvailability(
  resource: WorkspaceResource,
  caps: DeviceCapabilities
): RestoreAvailability {
  switch (resource.type) {
    case 'url':
      return { available: true, isWebApp: true, capabilitiesMet: true };

    case 'application':
      return checkAppAvailability(resource, caps);

    case 'file':
      return checkFileAvailability(resource, caps);

    case 'note':
      return { available: true, isWebApp: true, capabilitiesMet: true };

    default:
      return { available: false, reason: 'Unknown resource type', isWebApp: false, capabilitiesMet: false };
  }
}

function checkAppAvailability(
  resource: WorkspaceResource,
  caps: DeviceCapabilities
): RestoreAvailability {
  const appId = resource.metadata.appId || resource.identifier;
  const profile = APP_REGISTRY[appId];

  // Unknown app — assume available if it's in the Continua shell
  if (!profile) {
    return { available: true, isWebApp: true, capabilitiesMet: true };
  }

  // Web apps are always available in Continua shell
  if (profile.isWebApp) {
    // Check capability requirements
    if (profile.requiredCap && !caps[profile.requiredCap]) {
      // Try to find alternative
      const alt = findAlternative(profile.alternatives, caps);
      if (alt) {
        return {
          available: false,
          reason: `${profile.name} requires ${profile.requiredCap}`,
          suggestedAlternative: alt,
          isWebApp: true,
          capabilitiesMet: false,
        };
      }
      return {
        available: true, // Still open it, just degraded
        isWebApp: true,
        capabilitiesMet: false,
      };
    }

    return { available: true, isWebApp: true, capabilitiesMet: true };
  }

  // Native app — check if it exists on the device
  // For now, assume all Continua shell apps are available
  return { available: true, isWebApp: false, capabilitiesMet: true };
}

function checkFileAvailability(
  resource: WorkspaceResource,
  caps: DeviceCapabilities
): RestoreAvailability {
  const mimeType = resource.metadata.mimeType;

  if (mimeType) {
    const handler = FILE_TYPE_HANDLERS[mimeType];
    if (handler) {
      const alt = findAlternative(handler.alternatives, caps);
      return {
        available: true, // Files can always be "listed" even if no handler
        isWebApp: true,
        capabilitiesMet: true,
        suggestedAlternative: alt ? { appId: alt.appId, name: alt.name } : undefined,
      };
    }
  }

  // Unknown file type — still available
  return { available: true, isWebApp: true, capabilitiesMet: true };
}

function findAlternative(
  alternativeIds: string[],
  caps: DeviceCapabilities
): { appId: string; name: string } | undefined {
  for (const id of alternativeIds) {
    const profile = APP_REGISTRY[id];
    if (!profile) continue;
    if (profile.requiredCap && !caps[profile.requiredCap]) continue;
    return { appId: id, name: profile.name };
  }
  return undefined;
}

/**
 * Build a smart restore plan that checks availability and suggests alternatives.
 */
export function buildSmartRestoreResults(
  resources: WorkspaceResource[],
  caps: DeviceCapabilities,
  selectedIds?: Set<string>
): RestoreResult[] {
  const results: RestoreResult[] = [];

  for (const resource of resources) {
    if (selectedIds && !selectedIds.has(resource.id)) {
      results.push({
        resourceId: resource.id,
        resource,
        status: 'skipped',
        reason: 'Not selected',
      });
      continue;
    }

    const availability = checkResourceAvailability(resource, caps);

    if (availability.available) {
      let restoredUrl: string | undefined;
      if (resource.type === 'url') {
        restoredUrl = resource.metadata.url || resource.identifier;
      } else if (resource.type === 'application') {
        restoredUrl = resource.identifier;
      }

      const reason = availability.suggestedAlternative
        ? `Using alternative: ${availability.suggestedAlternative.name}`
        : undefined;

      results.push({
        resourceId: resource.id,
        resource,
        status: 'restored',
        reason,
        restoredUrl,
      });
    } else {
      results.push({
        resourceId: resource.id,
        resource,
        status: 'unavailable',
        reason: availability.reason || 'Not available on this device',
      });
    }
  }

  return results;
}
