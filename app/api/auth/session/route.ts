/**
 * Authentication Session Endpoint
 * 
 * GET /api/auth/session
 * 
 * Security:
 * - Session token validation
 * - Rate limiting to prevent abuse
 */

import { NextRequest } from 'next/server';
import {
  checkRouteRateLimit,
  apiOk,
  apiUnauthorized,
  apiInternal,
} from '@/lib/api-helpers';
import { getAuthProvider } from '@/lib/auth-providers/provider-factory';
import { resolveSession } from '@/lib/session-store';

export async function GET(request: NextRequest) {
  try {
    const rl = checkRouteRateLimit(request, 'AUTH_SESSION');
    if (rl) return rl;

    const sessionCookie = request.cookies.get('anichisom_session');
    if (!sessionCookie || !sessionCookie.value) {
      return apiUnauthorized('No active session');
    }

    const sessionData = resolveSession(sessionCookie.value);
    if (sessionData) {
      return apiOk({
        user: {
          id: sessionData.userId,
          uniqueId: sessionData.uniqueId,
          role: sessionData.role,
        }
      });
    }

    // For external auth providers (Supabase/Firebase), delegate to getCurrentUser
    const providerName = process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'custom';
    if (providerName.toLowerCase() !== 'custom') {
      const authProvider = await getAuthProvider();
      const user = await authProvider.getCurrentUser();
      if (!user) {
        return apiUnauthorized('Session expired or invalid');
      }

      return apiOk({
        user: {
          id: user.id,
          uniqueId: user.name,
          role: user.role || 'user',
        }
      });
    }

    return apiUnauthorized('Session expired or invalid');
  } catch (error) {
    console.error('[auth/session] Unexpected error:', error);
    return apiInternal();
  }
}
