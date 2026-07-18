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
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const rl = checkRouteRateLimit(request, 'AUTH_LOGIN');
    if (rl) return rl;

    const supabase = await createClient();

    await supabase.auth.signOut();

    return apiOk({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('[auth/logout] Unexpected error:', error);
    return apiInternal();
  }
}
