/**
 * Continua Capability Tokens — short-lived, scoped session JWTs.
 *
 * Minted server-side when a mobile key approves a guest pairing (or when an
 * authenticated client requests one). Presented to scoped endpoints such as
 * /api/agent/proxy. Raw API keys are never exposed to holders.
 *
 * Claims:
 *   sub  — approving/owning user id
 *   ws   — workspace scope
 *   typ  — 'capability'
 *   exp  — now + TTL (60 min)
 */
import { SignJWT, jwtVerify } from 'jose';

export const CAPABILITY_TTL_SECONDS = 60 * 60; // 60 minutes

const ISSUER = 'continua:capability';
const AUDIENCE = 'continua:scoped-api';

let cachedKey: Uint8Array | null = null;

function getSigningKey(): Uint8Array {
  if (cachedKey) return cachedKey;
  const secret =
    process.env.CAPABILITY_JWT_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CAPABILITY_JWT_SECRET is required in production');
    }
    console.warn(
      '[capability-token] CAPABILITY_JWT_SECRET not set — using insecure dev secret.'
    );
    cachedKey = new TextEncoder().encode('dev-insecure-capability-secret');
  } else {
    // Derive a purpose-specific key so the same secret isn't reused raw across contexts
    cachedKey = new TextEncoder().encode(`cap:${secret}`);
  }
  return cachedKey;
}

export interface CapabilityClaims {
  sub: string;
  ws: string;
}

/** Mint a signed capability token for the given user + workspace scope. */
export async function signCapabilityToken(
  claims: CapabilityClaims
): Promise<{ token: string; expiresAt: string }> {
  const expires = Math.floor(Date.now() / 1000) + CAPABILITY_TTL_SECONDS;
  const token = await new SignJWT({ typ: 'capability', ws: claims.ws })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(getSigningKey());

  return { token, expiresAt: new Date(expires * 1000).toISOString() };
}

/** Verify a capability token. Returns claims or null when invalid/expired. */
export async function verifyCapabilityToken(
  token: string | undefined | null
): Promise<CapabilityClaims | null> {
  if (!token || typeof token !== 'string') return null;
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    });
    if (payload.typ !== 'capability' || !payload.sub) return null;
    return {
      sub: payload.sub,
      ws: (payload.ws as string) || 'Continua OS',
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
