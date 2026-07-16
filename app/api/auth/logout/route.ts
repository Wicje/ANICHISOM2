/**
 * Authentication Logout Endpoint
 * 
 * POST /api/auth/logout
 * 
 * Signs out from Supabase and clears session cookies.
 */

import { NextRequest } from 'next/server';
import {
  checkRouteRateLimit,
  apiOk,
  apiInternal,
} from '@/lib/api-helpers';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
  try {
    const rl = checkRouteRateLimit(request, 'AUTH_LOGIN');
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

    await supabase.auth.signOut();

    return apiOk({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('[auth/logout] Unexpected error:', error);
    return apiInternal();
  }
}
