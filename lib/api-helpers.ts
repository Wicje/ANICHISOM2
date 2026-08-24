/**
 * Shared API helpers — session validation, error responses, rate limiting.
 * Eliminates duplication across 18+ route files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { checkRateLimit } from '@/lib/auth-validation';
import { RATE_LIMITS } from '@/lib/config';

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

// ─── Session Validation (Supabase) ────────────────────────────────────────

export type SessionResult =
  | { ok: true; userId: string; userRole: string }
  | { ok: false; response: NextResponse };

/**
 * Create a Supabase server client from request cookies.
 */
function createSupabaseFromRequest(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // Read-only in API routes — session refresh handled by middleware
        },
      },
    },
  );
}

/**
 * Validate session from Supabase cookies. Returns user info or error response.
 * Use in API routes: `const result = await requireSession(request); if (!result.ok) return result.response;`
 */
export async function requireSession(request: NextRequest): Promise<SessionResult> {
  const supabase = createSupabaseFromRequest(request);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, response: apiUnauthorized('Session expired or invalid') };
  }

  return {
    ok: true,
    userId: user.id,
    userRole: (user.user_metadata as any)?.role || 'user',
  };
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
  // Opt-in bypass for local dev / e2e so test runs don't exhaust buckets.
  // Never honored in production builds.
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.RATE_LIMIT_DISABLED === '1'
  ) {
    return null;
  }
  const config = RATE_LIMITS[limitKey];
  // Prioritize trusted Vercel headers x-vercel-forwarded-for / x-real-ip
  const vercelIp = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-real-ip');
  const forwardedFor = request.headers.get('x-forwarded-for');
  const clientIp = vercelIp || (forwardedFor
    ? forwardedFor.split(',')[0]?.trim() || 'unknown'
    : request.headers.get('x-client-ip') || 'unknown');
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
export async function requireAuth(
  request: NextRequest,
  limitKey?: keyof typeof RATE_LIMITS
): Promise<SessionResult> {
  const sessionResult = await requireSession(request);
  if (!sessionResult.ok) return sessionResult;

  if (limitKey) {
    const rl = checkRouteRateLimit(request, limitKey, sessionResult.userId);
    if (rl) return { ok: false, response: rl };
  }

  return sessionResult;
}
