/**
 * Continua Authorization Gate (architecture S1)
 *
 * The single, pure decision function every cross-boundary request passes
 * through. Normative layer per docs/CONTINUA_CORE_ARCHITECTURE.md §"Layered
 * enforcement": RLS is defense-in-depth, this module is the law.
 *
 * Pure and synchronous by design — DB-backed facts (e.g. org role) are
 * resolved by callers (lib/org-service.ts) and passed in via `ctx`.
 */

export const SCOPES = [
  'context.read',
  'context.write',
  'proxy.invoke',
  'org.admin',
] as const;

export type Scope = (typeof SCOPES)[number];

/**
 * Capabilities every v1 token implicitly carried. Minted explicitly from
 * token v2 onward; kept as defaults so existing guests/daemons never break.
 */
export const PERSONAL_DEFAULT_SCOPES: Scope[] = [
  'context.read',
  'context.write',
  'proxy.invoke',
];

export type OrgRole = 'owner' | 'admin' | 'member';

const ROLE_RANK: Record<OrgRole, number> = { member: 1, admin: 2, owner: 3 };

/** True when `role` meets or exceeds `min`. Unknown roles rank below member. */
export function roleAtLeast(role: string | null | undefined, min: OrgRole): boolean {
  if (!role || !(role in ROLE_RANK)) return false;
  return ROLE_RANK[role as OrgRole] >= ROLE_RANK[min];
}

export interface Principal {
  userId: string;
  ws: string;
  orgId?: string;
  scopes: Scope[];
}

export type AuthzResource =
  | { type: 'context'; owner: string; domain?: string }
  | { type: 'proxy' }
  | { type: 'org'; orgId: string };

/**
 * Actions mirror scopes for capability-gated resources, plus seat-gated
 * org verbs that are never mintable into tokens.
 */
export const AUTHZ_ACTIONS = [...SCOPES, 'org.read'] as const;
export type AuthzAction = (typeof AUTHZ_ACTIONS)[number];

export interface AuthzContext {
  /** Membership role of principal.userId in resource org, resolved by caller */
  orgRole?: string | null;
}

export type AuthzResult = { ok: true } | { ok: false; reason: string };

export function isScope(v: unknown): v is Scope {
  return typeof v === 'string' && (SCOPES as readonly string[]).includes(v);
}

/** Build a Principal from capability-token claims, applying v1 defaults. */
export function principalFromClaims(claims: {
  sub: string;
  ws: string;
  org?: string;
  scopes?: string[];
}): Principal {
  return {
    userId: claims.sub,
    ws: claims.ws,
    orgId: claims.org,
    // v1 tokens carry no scopes claim → implicit personal defaults.
    // v2 tokens carry explicit scopes → intersect with known set (deny-by-default
    // for anything unrecognized, even if a future version adds more).
    scopes: claims.scopes
      ? (claims.scopes.filter(isScope) as Scope[])
      : [...PERSONAL_DEFAULT_SCOPES],
  };
}

/**
 * THE authorization decision. Returns ok or a reason; routes translate
 * reasons into 401/403 as they see fit (403 unless authentication itself
 * failed). Org verbs ('org.read'/'org.admin') are seat-gated, never
 * token-gated — see the 'org' case below.
 */
export function authorize(
  principal: Principal,
  action: AuthzAction,
  resource: AuthzResource,
  ctx?: AuthzContext
): AuthzResult {
  switch (resource.type) {
    case 'context': {
      // Invariant 2: nobody writes into another person's graph. Cross-user
      // visibility is served by dedicated scoped-read surfaces, not here.
      if (!principal.scopes.includes(action as Scope)) {
        return { ok: false, reason: `missing scope: ${action}` };
      }
      if (resource.owner !== principal.userId) {
        return { ok: false, reason: 'context is personal to its owner' };
      }
      return { ok: true };
    }

    case 'proxy': {
      if (!principal.scopes.includes(action as Scope)) {
        return { ok: false, reason: `missing scope: ${action}` };
      }
      return { ok: true };
    }

    case 'org': {
      // Org authority rests on SEATS, not token scopes: membership roles are
      // DB-resolved facts passed via ctx, so a stolen/guest token gains
      // nothing by claiming scopes here. ('org.admin' remains a defined scope
      // for future token-minted delegation, but is never *required*.)
      if (action === 'org.read') {
        return ctx?.orgRole ? { ok: true } : { ok: false, reason: 'not an org member' };
      }
      if (!roleAtLeast(ctx?.orgRole, 'admin')) {
        return { ok: false, reason: 'org admin or owner role required' };
      }
      return { ok: true };
    }

    default: {
      const exhaustive: never = resource;
      void exhaustive;
      return { ok: false, reason: 'unknown resource type' };
    }
  }
}
