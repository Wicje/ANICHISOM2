/**
 * Authentication Login Endpoint
 * 
 * POST /api/auth/login
 * 
 * Body: { email: string, password: string, name?: string }
 * 
 * Delegates to Supabase Auth for email/password authentication.
 */

import { NextRequest } from 'next/server';
import {
  checkRouteRateLimit,
  apiOk,
  apiError,
  apiUnauthorized,
  apiInternal,
} from '@/lib/api-helpers';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
  try {
    const rl = checkRouteRateLimit(request, 'AUTH_LOGIN');
    if (rl) return rl;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON in request body');
    }

    if (typeof body !== 'object' || body === null) {
      return apiError('Request body must be a JSON object');
    }

    const bodyObj = body as Record<string, unknown>;
    const { email, password, name } = bodyObj;

    if (!email || !password) {
      return apiError('Missing required fields: email, password');
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return apiError('email and password must be strings');
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // We can't set cookies here in a route handler,
            // but Supabase SSR handles this via middleware
          },
        },
      },
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return apiUnauthorized(error.message);
    }

    if (!data.user) {
      return apiInternal('Login failed');
    }

    return apiOk({
      user: {
        id: data.user.id,
        email: data.user.email,
        role: (data.user.user_metadata as any)?.role || 'filmmaker',
        name: (data.user.user_metadata as any)?.name || email.split('@')[0],
      },
    });
  } catch (error) {
    console.error('[auth/login] Unexpected error:', error);
    return apiInternal();
  }
}
