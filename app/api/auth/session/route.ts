/**
 * Authentication Session Endpoint
 * 
 * GET /api/auth/session
 * 
 * Security:
 * - Session token validation
 * - Rate limiting to prevent abuse
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
} from '@/lib/auth-validation';
import { getAuthProvider } from '@/lib/auth-providers/provider-factory';
import { resolveSession } from '@/lib/session-store';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting: 100 requests per 5 minutes per IP
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-client-ip') ||
                     'unknown';
    const rateLimitKey = `session:${clientIp}`;
    const rateLimitCheck = checkRateLimit(rateLimitKey, 100, 5 * 60 * 1000);

    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitCheck.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const sessionCookie = request.cookies.get('anichisom_session');
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }

    const tokenValue = sessionCookie.value;

    // Resolve crypto-random token against session store (S-06)
    // Tokens are never userIds — the store is the only way to map token → user
    const sessionData = resolveSession(tokenValue);
    if (sessionData) {
      return NextResponse.json({
        success: true,
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
        return NextResponse.json(
          { error: 'Session expired or invalid' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          uniqueId: user.name,
          role: user.role || 'user',
        }
      });
    }

    // Token not found in store and no external provider — session is invalid
    return NextResponse.json(
      { error: 'Session expired or invalid' },
      { status: 401 }
    );
  } catch (error) {
    console.error('[auth/session] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
