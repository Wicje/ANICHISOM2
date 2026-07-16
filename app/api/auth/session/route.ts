/**
 * Authentication Session Endpoint
 * 
 * GET /api/auth/session
 * 
 * Validates Supabase session and returns user info.
 */

import { NextRequest } from 'next/server';
import {
  checkRouteRateLimit,
  apiOk,
  apiUnauthorized,
  apiInternal,
} from '@/lib/api-helpers';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  try {
    const rl = checkRouteRateLimit(request, 'AUTH_SESSION');
    if (rl) return rl;

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // Read-only in API routes
          },
        },
      },
    );

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return apiUnauthorized('No active session');
    }

    return apiOk({
      user: {
        id: user.id,
        email: user.email,
        role: (user.user_metadata as any)?.role || 'filmmaker',
        name: (user.user_metadata as any)?.name || user.email?.split('@')[0] || 'User',
      }
    });
  } catch (error) {
    console.error('[auth/session] Unexpected error:', error);
    return apiInternal();
  }
}
