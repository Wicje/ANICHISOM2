/**
 * Continua Role Manifests (Phase H — Workspace Assembly)
 *
 * A manifest is a declarative workspace definition per (org, role).
 * Joining a project with a role IS the onboarding: at boot the client
 * derives its workspace from its current seat — nothing is materialized
 * at grant time, so offboarding stays "delete one seat row".
 *
 * Built-in manifests ship as code defaults; an org may override any role
 * via the DB-backed API. Validation is strict and bounded: manifests are
 * applied to live OS stores, so garbage must never get through.
 */

export interface ManifestLink {
  title: string;
  url: string;
}

export interface RoleManifest {
  version: 1;
  /** Slug role id this manifest applies to. */
  role: string;
  displayName?: string;
  /** Continua app ids installed on assembly. */
  apps?: string[];
  /** Web resources assembled as custom web apps / bookmarks. */
  links?: ManifestLink[];
  /** AI context seed written to the `ai_context` domain. */
  aiContext?: {
    summary: string;
    tags?: string[];
  };
  /** Journal/checkpoint slice key this role works in. */
  projectTag?: string;
}

const ROLE_RE = /^[a-z0-9-]{1,32}$/;

export function isValidRoleSlug(role: unknown): role is string {
  return typeof role === 'string' && ROLE_RE.test(role);
}

function isValidUrl(v: unknown): v is string {
  if (typeof v !== 'string' || v.length === 0 || v.length > 2048) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Structural validation for wire input (PUT) and DB reads (defense-in-depth
 * against hand-edited rows). Returns reasons instead of throwing so routes
 * can report precise errors.
 */
export function validateRoleManifest(input: unknown): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, errors: ['manifest must be an object'] };
  }
  const m = input as Record<string, unknown>;

  if (!isValidRoleSlug(m.role)) {
    errors.push('role must match [a-z0-9-]{1,32}');
  }
  if (m.version !== 1) {
    errors.push('version must be 1');
  }
  if (m.displayName !== undefined && (typeof m.displayName !== 'string' || m.displayName.length > 80)) {
    errors.push('displayName must be a string ≤80 chars');
  }
  if (m.projectTag !== undefined && (typeof m.projectTag !== 'string' || m.projectTag.length > 256)) {
    errors.push('projectTag must be a string ≤256 chars');
  }

  if (m.apps !== undefined) {
    if (
      !Array.isArray(m.apps) ||
      m.apps.length > 32 ||
      m.apps.some((a) => typeof a !== 'string' || !/^[a-z0-9-]{1,64}$/.test(a))
    ) {
      errors.push('apps must be ≤32 app-id strings matching [a-z0-9-]{1,64}');
    }
  }

  if (m.links !== undefined) {
    if (!Array.isArray(m.links) || m.links.length > 20) {
      errors.push('links must be an array of ≤20 entries');
    } else {
      for (const l of m.links) {
        const lo = l as Record<string, unknown>;
        if (
          typeof lo !== 'object' ||
          lo === null ||
          typeof lo.title !== 'string' ||
          lo.title.length === 0 ||
          lo.title.length > 120 ||
          !isValidUrl(lo.url)
        ) {
          errors.push('each link needs a title (≤120 chars) and http(s) url');
          break;
        }
      }
    }
  }

  if (m.aiContext !== undefined) {
    const ai = m.aiContext as Record<string, unknown>;
    if (typeof ai !== 'object' || ai === null || Array.isArray(ai)) {
      errors.push('aiContext must be an object');
    } else {
      if (typeof ai.summary !== 'string' || ai.summary.length === 0 || ai.summary.length > 500) {
        errors.push('aiContext.summary must be a string ≤500 chars');
      }
      if (
        ai.tags !== undefined &&
        (!Array.isArray(ai.tags) ||
          ai.tags.length > 16 ||
          ai.tags.some((t) => typeof t !== 'string' || t.length === 0 || t.length > 48))
      ) {
        errors.push('aiContext.tags must be ≤16 strings of ≤48 chars');
      }
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

// ─── Built-in defaults (used when an org has no DB override for a role) ──

function manifest(role: string, m: Omit<RoleManifest, 'version' | 'role'>): RoleManifest {
  return { version: 1, role, ...m };
}

export const DEFAULT_MANIFESTS: Record<string, RoleManifest> = {
  developer: manifest('developer', {
    displayName: 'Developer',
    apps: ['code-editor', 'terminal', 'browser'],
    links: [
      { title: 'GitHub', url: 'https://github.com' },
      { title: 'Supabase', url: 'https://supabase.com/dashboard' },
    ],
    aiContext: {
      summary:
        'You are assisting a developer inside Continua. Prefer concise code answers, git commands, and repo-aware context.',
      tags: ['engineering', 'git'],
    },
  }),
  designer: manifest('designer', {
    displayName: 'Designer',
    apps: ['browser', 'moodboard'],
    links: [
      { title: 'Figma', url: 'https://figma.com' },
      { title: 'Dribbble', url: 'https://dribbble.com' },
    ],
    aiContext: {
      summary:
        'You are assisting a designer inside Continua. Focus on visual systems, brand consistency, and asset organization.',
      tags: ['design', 'brand'],
    },
  }),
  member: manifest('member', {
    displayName: 'Member',
    apps: ['browser'],
    links: [{ title: 'Continua Docs', url: 'https://github.com/Wicje/Continua' }],
    aiContext: {
      summary: 'You are assisting a team member inside their Continua workspace.',
      tags: ['general'],
    },
  }),
};

export function defaultManifestFor(role: string): RoleManifest | null {
  return DEFAULT_MANIFESTS[role] ?? null;
}
