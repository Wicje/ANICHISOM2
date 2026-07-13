/**
 * Authentication Logout Endpoint
 * 
 * POST /api/auth/logout
 * 
 * Security:
 * - Session clearing
 * - Rate limiting to prevent abuse
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthProvider } from '@/lib/auth-providers/provider-factory';
import {
  checkRouteRateLimit,
  apiForbidden,
  apiOk,
  apiInternal,
} from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    // CSRF Protection: Validate Origin/Host headers
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (origin && host) {
      const parsedOrigin = new URL(origin);
      if (parsedOrigin.host !== host) {
        return apiForbidden('Forbidden: CSRF check failed');
      }
    }

    const rl = checkRouteRateLimit(request, 'AUTH_LOGIN');
    if (rl) return rl;

    const authProvider = await getAuthProvider();
    await authProvider.logout();

    const response = apiOk({ message: 'Logged out successfully' });

    // Clear session cookie
    response.cookies.delete('anichisom_session');

    return response;
  } catch (error) {
    console.error('[auth/logout] Unexpected error:', error);
    return apiInternal();
  }
}
