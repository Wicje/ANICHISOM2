/**
 * Continua Org Service (architecture S5)
 *
 * Server-side membership operations. Composes through the authz gate:
 * DB lookups resolve facts (roles), authorize() makes decisions.
 *
 * Unlike the pairing store there is deliberately NO in-memory fallback —
 * team data must live in Postgres or not at all. Callers surface a 503
 * when Supabase admin credentials are unconfigured.
 */
import { createAdminClient, isSupabaseAdminConfigured } from '@/utils/supabase/admin';
import {
  authorize,
  roleAtLeast,
  type OrgRole,
  type Principal,
} from '@/lib/authz';
import {
  defaultManifestFor,
  isValidRoleSlug,
  validateRoleManifest,
  type RoleManifest,
} from '@/lib/org-manifest';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
}

export interface OrgMember {
  userId: string;
  role: OrgRole;
  createdAt: string;
}

export class OrgServiceError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'OrgServiceError';
  }
}

function requireAdminClient() {
  if (!isSupabaseAdminConfigured()) {
    throw new OrgServiceError('Supabase admin credentials not configured', 503);
  }
  return createAdminClient();
}

// ─── Slug generation ─────────────────────────────────────────────────────

function slugify(name: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'org';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

// ─── Reads ───────────────────────────────────────────────────────────────

export async function listOrganizationsForUser(userId: string): Promise<
  Array<{ org: Organization; role: OrgRole }>
> {
  const supabase = requireAdminClient();
  const { data, error } = await supabase
    .from('org_members')
    .select('role, created_at, organizations(id, name, slug, owner_id, created_at)')
    .eq('user_id', userId);

  if (error) throw new OrgServiceError('Failed to load organizations', 500);

  return (data ?? []).map((row: any) => ({
    org: {
      id: row.organizations.id,
      name: row.organizations.name,
      slug: row.organizations.slug,
      ownerId: row.organizations.owner_id,
      createdAt: row.organizations.created_at,
    },
    role: (row.role as OrgRole) ?? 'member',
  }));
}

export async function getRole(orgId: string, userId: string): Promise<OrgRole | null> {
  return (await getSeat(orgId, userId))?.role ?? null;
}

/** Full seat: permission rank plus optional manifest pointer. */
export async function getSeat(
  orgId: string,
  userId: string
): Promise<{ role: OrgRole; manifestRole: string | null } | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('org_members')
    .select('role, manifest_role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();
  const role = (data?.role as OrgRole) ?? null;
  if (!role || !['owner', 'admin', 'member'].includes(role)) return null;
  const manifestRole =
    typeof data?.manifest_role === 'string' && isValidRoleSlug(data.manifest_role)
      ? data.manifest_role
      : null;
  return { role, manifestRole };
}

export async function getOrganization(orgId: string): Promise<Organization | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    ownerId: data.owner_id,
    createdAt: data.created_at,
  };
}

export async function listMembers(actor: Principal, orgId: string): Promise<OrgMember[]> {
  const role = await getRole(orgId, actor.userId);
  const decision = authorize(actor, 'org.read', { type: 'org', orgId }, { orgRole: role });
  if (!decision.ok) throw new OrgServiceError(decision.reason, 403);

  const supabase = requireAdminClient();
  const { data, error } = await supabase
    .from('org_members')
    .select('user_id, role, created_at')
    .eq('org_id', orgId);
  if (error) throw new OrgServiceError('Failed to load members', 500);

  return (data ?? []).map((row: any) => ({
    userId: row.user_id,
    role: (row.role as OrgRole) ?? 'member',
    createdAt: row.created_at,
  }));
}

// ─── Writes ──────────────────────────────────────────────────────────────

export async function createOrganization(
  ownerUserId: string,
  name: string
): Promise<Organization> {
  const cleanName = typeof name === 'string' ? name.trim().slice(0, 80) : '';
  if (!cleanName) throw new OrgServiceError('Organization name is required', 400);

  const supabase = requireAdminClient();

  // Retry once on the (unlikely) slug collision; slug carries a random suffix.
  for (let attempt = 0; attempt < 2; attempt++) {
    const slug = slugify(cleanName);
    const { data, error } = await supabase
      .from('organizations')
      .insert({ name: cleanName, slug, owner_id: ownerUserId })
      .select('*')
      .single();

    if (!error && data) {
      const { error: memberError } = await supabase.from('org_members').insert({
        org_id: data.id,
        user_id: ownerUserId,
        role: 'owner',
      });
      if (memberError) {
        await supabase.from('organizations').delete().eq('id', data.id);
        throw new OrgServiceError('Failed to seed owner membership', 500);
      }
      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        ownerId: data.owner_id,
        createdAt: data.created_at,
      };
    }

    const duplicateSlug = error?.code === '23505';
    if (!duplicateSlug || attempt === 1) {
      throw new OrgServiceError('Failed to create organization', 500);
    }
  }
  throw new OrgServiceError('Failed to create organization', 500); // unreachable
}

/**
 * Grant a seat. Only `owner`/`admin` actors may grant, and nobody can grant
 * a role above their own (owner seats are transferred via ownership flow,
 * never minted here).
 */
export async function addMember(
  actor: Principal,
  orgId: string,
  targetUserId: string,
  requestedRole: string,
  manifestRole?: string
): Promise<OrgMember> {
  if (!targetUserId || typeof targetUserId !== 'string') {
    throw new OrgServiceError('userId is required', 400);
  }
  const role: OrgRole = requestedRole === 'admin' ? 'admin' : 'member';
  const cleanManifestRole =
    typeof manifestRole === 'string' && isValidRoleSlug(manifestRole) ? manifestRole : null;

  const actorRole = await getRole(orgId, actor.userId);
  const decision = authorize(
    actor,
    'org.admin',
    { type: 'org', orgId },
    { orgRole: actorRole }
  );
  if (!decision.ok) throw new OrgServiceError(decision.reason, 403);

  if (role === 'admin' && !roleAtLeast(actorRole, 'owner')) {
    throw new OrgServiceError('only an owner may grant admin', 403);
  }
  if (actor.userId === targetUserId) {
    throw new OrgServiceError('already a member of this organization', 409);
  }

  const supabase = requireAdminClient();
  const { error } = await supabase
    .from('org_members')
    .upsert(
      {
        org_id: orgId,
        user_id: targetUserId,
        role,
        ...(cleanManifestRole ? { manifest_role: cleanManifestRole } : {}),
      },
      { onConflict: 'org_id,user_id' }
    );
  if (error) throw new OrgServiceError('Failed to add member', 500);

  return { userId: targetUserId, role, createdAt: new Date().toISOString() };
}

export interface OrgMember {
  userId: string;
  role: OrgRole;
  manifestRole?: string | null;
  createdAt: string;
}

/**
 * Revoke a seat. Actors with org.admin may remove anyone except the sole
 * owner; any member may remove themselves EXCEPT a sole owner (transfer
 * first). Offboarding is exactly this call plus whatever cleanup the
 * caller performs — shared org context remains, per invariant.
 */
export async function removeMember(
  actor: Principal,
  orgId: string,
  targetUserId: string
): Promise<void> {
  const targetRole = await getRole(orgId, targetUserId);
  if (!targetRole) throw new OrgServiceError('Not a member of this organization', 404);

  const selfRemove = actor.userId === targetUserId;

  if (!selfRemove) {
    const actorRole = await getRole(orgId, actor.userId);
    const decision = authorize(
      actor,
      'org.admin',
      { type: 'org', orgId },
      { orgRole: actorRole }
    );
    if (!decision.ok) throw new OrgServiceError(decision.reason, 403);
  }

  if (targetRole === 'owner') {
    const owners = await countRoleHolders(orgId, 'owner');
    if (owners <= 1) {
      throw new OrgServiceError(
        'Cannot remove the sole owner — transfer ownership first',
        409
      );
    }
  }

  const supabase = requireAdminClient();
  const { error } = await supabase
    .from('org_members')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', targetUserId);
  if (error) throw new OrgServiceError('Failed to remove member', 500);
}

async function countRoleHolders(orgId: string, role: OrgRole): Promise<number> {
  const supabase = requireAdminClient();
  const { count, error } = await supabase
    .from('org_members')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('role', role);
  if (error) throw new OrgServiceError('Failed to inspect membership', 500);
  return count ?? 0;
}

// ─── Role manifests & workspace assembly (Phase H) ──────────────────────

/** DB override for a role, falling back to the code-shipped defaults. */
export async function getManifest(orgId: string, role: string): Promise<RoleManifest | null> {
  if (!isValidRoleSlug(role)) return null;

  if (isSupabaseAdminConfigured()) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('org_manifests')
      .select('manifest')
      .eq('org_id', orgId)
      .eq('role', role)
      .maybeSingle();

    if (data?.manifest) {
      // Defense-in-depth: hand-edited rows must still validate.
      const parsed = data.manifest as unknown;
      if (validateRoleManifest(parsed).ok) return parsed as RoleManifest;
      console.warn(`[org-service] invalid stored manifest for ${orgId}/${role} — using default`);
    }
  }

  return defaultManifestFor(role);
}

/**
 * Upsert an org's manifest for `role`. Owner/admin only; the stored payload
 * is normalized (role key from the path, version pinned) before validation.
 */
export async function setManifest(
  actor: Principal,
  orgId: string,
  role: string,
  input: unknown
): Promise<RoleManifest> {
  const actorRole = await getRole(orgId, actor.userId);
  const decision = authorize(actor, 'org.admin', { type: 'org', orgId }, { orgRole: actorRole });
  if (!decision.ok) throw new OrgServiceError(decision.reason, 403);

  const candidate = { ...(input as Record<string, unknown>), role, version: 1 };
  const check = validateRoleManifest(candidate);
  if (!check.ok) {
    throw new OrgServiceError(`invalid manifest: ${check.errors.join('; ')}`, 400);
  }

  const supabase = requireAdminClient();
  const { error } = await supabase.from('org_manifests').upsert(
    {
      org_id: orgId,
      role,
      manifest: candidate,
      updated_by: actor.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id,role' }
  );
  if (error) throw new OrgServiceError('Failed to save manifest', 500);

  return candidate as unknown as RoleManifest;
}

/**
 * THE onboarding primitive. Assembly is derived from the caller's CURRENT
 * seat — no grant-time materialization, so revoking the seat instantly ends
 * future assembly and all org-scoped reads. Personal state already applied
 * by earlier assemblies is intentionally NOT reverted (invariant 2: nobody
 * writes into another person's graph after the fact).
 */
export async function assembleForUser(
  userId: string,
  orgId: string
): Promise<{ org: Organization; role: OrgRole; manifestRole: string; manifest: RoleManifest }> {
  const org = await getOrganization(orgId);
  if (!org) throw new OrgServiceError('Organization not found', 404);

  const seat = await getSeat(orgId, userId);
  if (!seat) throw new OrgServiceError('Not a member of this organization', 403);

  // Seat rank gates permissions; the manifest role names the workspace
  // definition (defaults to the built-in per-rank manifest).
  const manifestRole = seat.manifestRole ?? defaultManifestRoleFor(seat.role);
  const manifest = await getManifest(orgId, manifestRole);
  if (!manifest) throw new OrgServiceError(`No manifest for role "${manifestRole}"`, 404);

  return { org, role: seat.role, manifestRole, manifest };
}

function defaultManifestRoleFor(seat: OrgRole): string {
  return seat === 'owner' || seat === 'admin' ? 'developer' : 'member';
}
