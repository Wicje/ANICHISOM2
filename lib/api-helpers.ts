/**
 * Shared API helpers — session validation, error responses, rate limiting.
 * Eliminates duplication across 18+ route files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveSession, SessionData } from '@/lib/session-store';
import { checkRateLimit } from '@/lib/auth-validation';
import { SESSION, RATE_LIMITS } from '@/lib/config';

// ─── Standardized API Responses ───────────────────────────────────────────

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export function apiOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data } satisfies ApiResponse<T>, { status });
}

export function apiError(error: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, error } satisfies ApiResponse, { status });
}

export function apiUnauthorized(error = 'Authentication required'): NextResponse {
  return apiError(error, 401);
}

export function apiForbidden(error = 'Insufficient permissions'): NextResponse {
  return apiError(error, 403);
}

export function apiNotFound(error = 'Not found'): NextResponse {
  return apiError(error, 404);
}

export function apiRateLimited(retryAfterMs: number): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Rate limit exceeded' } satisfies ApiResponse,
    {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
    }
  );
}

export function apiInternal(error = 'Internal server error'): NextResponse {
  return apiError(error, 500);
}

// ─── Session Validation ───────────────────────────────────────────────────

export type SessionResult =
  | { ok: true; session: SessionData }
  | { ok: false; response: NextResponse };

/**
 * Validate session from request cookies. Returns session data or error response.
 * Use in API routes: `const result = await requireSession(request); if (!result.ok) return result.response;`
 */
export function requireSession(request: NextRequest): SessionResult {
  const cookie = request.cookies.get(SESSION.COOKIE_NAME);
  if (!cookie?.value) {
    return { ok: false, response: apiUnauthorized() };
  }

  const session = resolveSession(cookie.value);
  if (!session) {
    return { ok: false, response: apiUnauthorized('Session expired') };
  }

  return { ok: true, session };
}

// ─── Rate Limiting ────────────────────────────────────────────────────────

export type RateLimitConfig = {
  max: number;
  windowMs: number;
};

/**
 * Check rate limit for a route. Returns null if allowed, or error response.
 * Use in API routes: `const rl = checkRouteRateLimit(request, 'AI_CHAT'); if (rl) return rl;`
 */
export function checkRouteRateLimit(
  request: NextRequest,
  limitKey: keyof typeof RATE_LIMITS,
  userId?: string
): NextResponse | null {
  const config = RATE_LIMITS[limitKey];
  const clientIp = request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-client-ip') ||
                   'unknown';
  const key = userId ? `${limitKey}:${userId}` : `${limitKey}:${clientIp}`;
  const result = checkRateLimit(key, config.max, config.windowMs);

  if (!result.allowed) {
    return apiRateLimited(result.resetAt - Date.now());
  }
  return null;
}

/**
 * Combined auth + rate limit check. Returns session or error response.
 * Use in API routes: `const result = await requireAuth(request, 'AI_CHAT'); if (!result.ok) return result.response;`
 */
export function requireAuth(
  request: NextRequest,
  limitKey?: keyof typeof RATE_LIMITS
): SessionResult {
  const sessionResult = requireSession(request);
  if (!sessionResult.ok) return sessionResult;

  if (limitKey) {
    const rl = checkRouteRateLimit(request, limitKey, sessionResult.session.userId);
    if (rl) return { ok: false, response: rl };
  }

  return sessionResult;
}
