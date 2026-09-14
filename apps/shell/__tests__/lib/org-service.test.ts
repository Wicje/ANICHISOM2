/**
 * Org service tests — the admin Supabase client is mocked with a fluent
 * stub whose chains resolve against scripted per-(table, op) responses.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;

let configured = true;

/** FIFO of results per `${table}:${op}`; missing entries = empty success. */
const scripts = new Map<string, any[]>();

function script(key: string, results: any[]) {
  scripts.set(key, results);
}
function next(table: string, op: string) {
  const queue = scripts.get(`${table}:${op}`);
  return queue?.shift() ?? { data: null, error: null };
}

vi.mock('@/utils/supabase/admin', () => ({
  isSupabaseAdminConfigured: () => configured,
  createAdminClient: () => ({
    from(table: string) {
      let op: 'select' | 'insert' | 'upsert' | 'delete' | 'count' = 'select';
      const api: Record<string, unknown> = {
        select(_cols?: string, opts?: { count?: string }) {
          op = opts?.count ? 'count' : 'select';
          return api;
        },
        insert(_payload: Row) {
          op = 'insert';
          return Object.assign(api, {
            single: () => Promise.resolve(next(table, 'insert')),
          });
        },
        upsert(_payload: Row) {
          op = 'upsert';
          return api;
        },
        delete() {
          op = 'delete';
          return api;
        },
        eq(_col: string, _val: unknown) {
          return api;
        },
        maybeSingle: () => Promise.resolve(next(table, 'select')),
        then(
          resolve: (v: unknown) => unknown,
          reject?: (e: unknown) => unknown
        ) {
          return Promise.resolve(next(table, op)).then(resolve, reject);
        },
      };
      return api;
    },
  }),
}));

import {
  addMember,
  assembleForUser,
  createOrganization,
  getManifest,
  listOrganizationsForUser,
  OrgServiceError,
  removeMember,
  setManifest,
} from '@/lib/org-service';

const actorWithAdminScope = () => ({
  userId: 'owner-1',
  ws: 'Continua OS',
  scopes: ['org.admin' as const],
});
const ORG = '44444444-4444-4444-4444-444444444444';

beforeEach(() => {
  scripts.clear();
  configured = true;
});

describe('createOrganization', () => {
  it('inserts org and seeds the owner membership', async () => {
    script('organizations:insert', [
      {
        data: {
          id: ORG,
          name: 'Acme Studio',
          slug: 'acme-studio-abcd1234',
          owner_id: 'owner-1',
          created_at: '2026-01-01T00:00:00Z',
        },
      },
    ]);

    const org = await createOrganization('owner-1', 'Acme Studio');
    expect(org.id).toBe(ORG);
    expect(org.ownerId).toBe('owner-1');
  });

  it('rejects blank names', async () => {
    await expect(createOrganization('owner-1', '   ')).rejects.toMatchObject({ status: 400 });
  });

  it('rolls back the org when seeding membership fails', async () => {
    script('organizations:insert', [
      {
        data: {
          id: ORG,
          name: 'Acme',
          slug: 's',
          owner_id: 'owner-1',
          created_at: '2026-01-01T00:00:00Z',
        },
      },
    ]);
    script('org_members:insert', [{ error: { message: 'fk violation' } }]);

    await expect(createOrganization('owner-1', 'Acme')).rejects.toMatchObject({ status: 500 });
  });

  it('surfaces an error without admin credentials', async () => {
    configured = false;
    await expect(createOrganization('owner-1', 'Acme')).rejects.toBeInstanceOf(OrgServiceError);
  });
});

describe('addMember', () => {
  it('lets an owner grant member seats', async () => {
    // getRole(actor) → 'owner'; duplicate check passes through
    script('org_members:select', [{ data: { role: 'owner' } }, { data: null }]);
    script('org_members:upsert', [{}]);

    const member = await addMember(actorWithAdminScope(), ORG, 'user-9', 'member');
    expect(member).toMatchObject({ userId: 'user-9', role: 'member' });
  });

  it('denies a plain member actor (403)', async () => {
    script('org_members:select', [{ data: { role: 'member' } }]);
    await expect(addMember(actorWithAdminScope(), ORG, 'user-9', 'member')).rejects.toMatchObject({
      status: 403,
    });
  });

  it('denies a stranger with no seat (403)', async () => {
    script('org_members:select', [{ data: null }]);
    await expect(addMember(actorWithAdminScope(), ORG, 'user-9', 'member')).rejects.toMatchObject({
      status: 403,
    });
  });

  it('only an owner may mint admin seats', async () => {
    script('org_members:select', [{ data: { role: 'admin' } }]);
    await expect(addMember(actorWithAdminScope(), ORG, 'user-9', 'admin')).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe('removeMember', () => {
  it('blocks removal of the sole owner (409)', async () => {
    // getRole(target) → 'owner'; getRole(actor) → 'admin'; count owners → 1
    script('org_members:select', [{ data: { role: 'owner' } }, { data: { role: 'admin' } }]);
    script('org_members:count', [{ count: 1 }]);
    await expect(removeMember(actorWithAdminScope(), ORG, 'owner-1')).rejects.toMatchObject({
      status: 409,
    });
  });

  it('allows self-leave for non-owner members without admin gate', async () => {
    script('org_members:select', [{ data: { role: 'member' } }]);
    script('org_members:delete', [{}]);
    await expect(
      removeMember({ userId: 'm1', ws: 'w', scopes: [] }, ORG, 'm1')
    ).resolves.toBeUndefined();
  });

  it('404s when the target holds no seat', async () => {
    script('org_members:select', [{ data: null }]);
    await expect(removeMember(actorWithAdminScope(), ORG, 'ghost')).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('listOrganizationsForUser', () => {
  it('maps joined membership rows', async () => {
    scripts.set('org_members:select', [
      {
        data: [
          {
            role: 'owner',
            created_at: '2026-01-01T00:00:00Z',
            organizations: {
              id: ORG,
              name: 'Acme',
              slug: 'acme',
              owner_id: 'u1',
              created_at: '2026-01-01T00:00:00Z',
            },
          },
        ],
      },
    ]);
    const rows = await listOrganizationsForUser('u1');
    expect(rows[0]).toMatchObject({ role: 'owner', org: { id: ORG, name: 'Acme' } });
  });
});

describe('manifests & assembly (Phase H)', () => {
  it('falls back to the code-shipped default when no DB override exists', async () => {
    script('org_manifests:select', [{ data: null }]);
    const manifest = await getManifest(ORG, 'developer');
    expect(manifest).toMatchObject({ role: 'developer', version: 1 });
  });

  it('returns null for unknown roles without touching the DB', async () => {
    const manifest = await getManifest(ORG, 'Astronaut');
    expect(manifest).toBeNull();
  });

  it('rejects invalid stored manifests and falls back to defaults', async () => {
    script('org_manifests:select', [{ data: { manifest: { version: 99, role: 'x' } } }]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const manifest = await getManifest(ORG, 'designer');
    expect(manifest).toMatchObject({ role: 'designer' }); // default, not the junk
    warn.mockRestore();
  });

  it('denies a plain member actor from writing manifests (403)', async () => {
    // getRole(actor) inside setManifest → member
    script('org_members:select', [{ data: { role: 'member' } }]);
    await expect(
      setManifest(actorWithAdminScope(), ORG, 'developer', { apps: ['terminal'] })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('lets an owner upsert a valid manifest with normalized role/version', async () => {
    script('org_members:select', [{ data: { role: 'owner' } }]);
    script('org_manifests:upsert', [{}]);

    const saved = await setManifest(
      actorWithAdminScope(),
      ORG,
      'developer',
      { role: 'HACKED', version: 99, apps: ['terminal'] }
    );
    expect(saved.role).toBe('developer'); // path wins over body
    expect(saved.version).toBe(1);
  });

  it('400s on structurally invalid payloads after the gate passes', async () => {
    script('org_members:select', [{ data: { role: 'admin' } }]);
    await expect(
      setManifest(actorWithAdminScope(), ORG, 'developer', { links: [{ url: 'javascript:x' }] })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('assembles from the caller’s CURRENT seat — 403 once revoked', async () => {
    // getOrganization → found; getRole(user) → no seat
    script('organizations:select', [
      {
        data: {
          id: ORG,
          name: 'Acme',
          slug: 'acme',
          owner_id: 'o1',
          created_at: '2026-01-01T00:00:00Z',
        },
      },
    ]);
    script('org_members:select', [{ data: null }]);
    await expect(assembleForUser('u9', ORG)).rejects.toMatchObject({ status: 403 });
  });

  it('assembles org + seat + derived manifest for a seated member', async () => {
    script('organizations:select', [
      {
        data: {
          id: ORG,
          name: 'Acme',
          slug: 'acme',
          owner_id: 'o1',
          created_at: '2026-01-01T00:00:00Z',
        },
      },
    ]);
    script('org_members:select', [{ data: { role: 'member', manifest_role: 'designer' } }]);
    script('org_manifests:select', [{ data: null }]); // → default designer manifest

    const assembly = await assembleForUser('u9', ORG);
    expect(assembly.role).toBe('member');           // seat rank
    expect(assembly.manifestRole).toBe('designer'); // manifest pointer
    expect(assembly.manifest.apps).toContain('moodboard');
  });

  it('falls back to the rank default when no manifest_role is set', async () => {
    script('organizations:select', [
      {
        data: {
          id: ORG,
          name: 'Acme',
          slug: 'acme',
          owner_id: 'o1',
          created_at: '2026-01-01T00:00:00Z',
        },
      },
    ]);
    script('org_members:select', [{ data: { role: 'owner', manifest_role: null } }]);
    script('org_manifests:select', [{ data: null }]);

    const assembly = await assembleForUser('u1', ORG);
    expect(assembly.manifestRole).toBe('developer');
  });

  it('grants seats carrying a validated manifest_role', async () => {
    script('org_members:select', [{ data: { role: 'owner' } }, { data: null }]);
    script('org_members:upsert', [{}]);
    const member = await addMember(actorWithAdminScope(), ORG, 'u9', 'member', 'designer');
    expect(member.role).toBe('member');
  });
});
