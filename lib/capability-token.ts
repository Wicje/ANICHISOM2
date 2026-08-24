/**
 * Continua Capability Tokens — short-lived, scoped session JWTs.
 *
 * Minted server-side when a mobile key approves a guest pairing (or when an
 * authenticated client requests one). Presented to scoped endpoints such as
 * /api/agent/proxy. Raw API keys are never exposed to holders.
 *
 * Claims (v1):
 *   sub  — approving/owning user id
 *   ws   — workspace scope
 *   typ  — 'capability'
 *   exp  — now + TTL (60 min)
 *
 * Claims (v2, all optional — absence means v1 semantics with personal defaults):
 *   org    — org tenant the holder operates within (must be a real membership,
 *            verified by the minting route via lib/org-service)
 *   scopes — explicit capability list; unknown scopes are dropped at mint and
 *            at principal construction. See lib/authz.ts.
 */
import { SignJWT, jwtVerify } from 'jose';
import { isScope, type Scope } from '@/lib/authz';

export const CAPABILITY_TTL_SECONDS = 60 * 60; // 60 minutes

const ISSUER = 'continua:capability';
const AUDIENCE = 'continua:scoped-api';

let cachedKey: CryptoKey | null = null;

async function getSigningKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const secret =
    process.env.CAPABILITY_JWT_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  let keyMaterial: string;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CAPABILITY_JWT_SECRET is required in production');
    }
    console.warn(
      '[capability-token] CAPABILITY_JWT_SECRET not set — using insecure dev secret.'
    );
    keyMaterial = 'dev-insecure-capability-secret';
  } else {
    // Derive a purpose-specific material so the same secret isn't reused raw across contexts
    keyMaterial = `cap:${secret}`;
  }

  cachedKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(keyMaterial),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  return cachedKey;
}

export interface CapabilityClaims {
  sub: string;
  ws: string;
  /** Org tenant (v2). Absent = personal scope. */
  org?: string;
  /** Explicit capabilities (v2). Absent = v1 personal defaults. */
  scopes?: Scope[];
}

/** Mint a signed capability token for the given user + workspace scope. */
export async function signCapabilityToken(
  claims: CapabilityClaims,
  options?: { ttlSeconds?: number }
): Promise<{ token: string; expiresAt: string }> {
  const ttl = options?.ttlSeconds ?? CAPABILITY_TTL_SECONDS;
  const expires = Math.floor(Date.now() / 1000) + ttl;

  // Deny-by-default: only recognized scopes ever reach the JWT.
  const scopes = claims.scopes?.filter(isScope);
  const payload: Record<string, unknown> = {
    typ: 'capability',
    ws: claims.ws,
    ...(claims.org ? { org: claims.org } : {}),
    ...(scopes && scopes.length > 0 ? { scopes } : {}),
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(await getSigningKey());

  return { token, expiresAt: new Date(expires * 1000).toISOString() };
}

/** Verify a capability token. Returns claims or null when invalid/expired. */
export async function verifyCapabilityToken(
  token: string | undefined | null
): Promise<CapabilityClaims | null> {
  if (!token || typeof token !== 'string') return null;
  try {
    const { payload } = await jwtVerify(token, await getSigningKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    });
    if (payload.typ !== 'capability' || !payload.sub) return null;
    return {
      sub: payload.sub,
      ws: (payload.ws as string) || 'Continua OS',
      ...(typeof payload.org === 'string' && payload.org ? { org: payload.org } : {}),
      ...(Array.isArray(payload.scopes)
        ? { scopes: payload.scopes.filter(isScope) }
        : {}),
    };
  } catch {
    return null;
  }
}

export function extractTokenFromRequest(request: Request): string | null {
  const header = request.headers.get('x-capability-token');
  if (header) return header;
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}
