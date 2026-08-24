import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MANIFESTS,
  defaultManifestFor,
  isValidRoleSlug,
  validateRoleManifest,
} from '@/lib/org-manifest';

const base = {
  version: 1,
  role: 'developer',
  apps: ['code-editor'],
  links: [{ title: 'GitHub', url: 'https://github.com' }],
  aiContext: { summary: 'Assist with code.', tags: ['eng'] },
};

describe('role slugs', () => {
  it('accepts slug-ish ids and rejects junk', () => {
    expect(isValidRoleSlug('developer')).toBe(true);
    expect(isValidRoleSlug('senior-dev-2')).toBe(true);
    expect(isValidRoleSlug('Developer')).toBe(false);
    expect(isValidRoleSlug('x'.repeat(33))).toBe(false);
    expect(isValidRoleSlug('')).toBe(false);
    expect(isValidRoleSlug(42)).toBe(false);
  });
});

describe('validateRoleManifest', () => {
  it('accepts a valid manifest', () => {
    expect(validateRoleManifest(base).ok).toBe(true);
  });

  it('accepts an empty-but-valid manifest', () => {
    expect(validateRoleManifest({ version: 1, role: 'member' }).ok).toBe(true);
  });

  it.each([
    ['wrong version', { ...base, version: 2 }],
    ['missing version', { role: 'dev' }],
    ['bad role', { ...base, role: 'Dev!' }],
    ['too many apps', { ...base, apps: Array.from({ length: 33 }, (_, i) => `app-${i}`) }],
    ['malformed app id', { ...base, apps: ['Code Editor'] }],
    ['non-string app', { ...base, apps: [7] }],
    ['too many links', { ...base, links: Array.from({ length: 21 }, () => ({ title: 'x', url: 'https://a.b' })) }],
    ['javascript url', { ...base, links: [{ title: 'x', url: 'javascript:alert(1)' }] }],
    ['link missing title', { ...base, links: [{ url: 'https://a.b' }] }],
    ['oversized summary', { ...base, aiContext: { summary: 's'.repeat(501) } }],
    ['too many tags', { ...base, aiContext: { summary: 's', tags: Array.from({ length: 17 }, (_, i) => `${i}`) } }],
    ['array input', [base]],
    ['null input', null],
  ])('rejects %s', (_label, bad) => {
    const result = validateRoleManifest(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('defaults', () => {
  it('ships developer, designer and member manifests that all validate', () => {
    for (const m of Object.values(DEFAULT_MANIFESTS)) {
      expect(validateRoleManifest(m).ok, `default "${m.role}" must validate`).toBe(true);
    }
    expect(Object.keys(DEFAULT_MANIFESTS).sort()).toEqual(['designer', 'developer', 'member']);
  });

  it('returns null for unknown roles', () => {
    expect(defaultManifestFor('astronaut')).toBeNull();
    expect(defaultManifestFor('developer')).toMatchObject({ role: 'developer' });
  });
});
