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
import { checkRateLimit } from '@/lib/auth-validation';
import { getAuthProvider } from '@/lib/auth-providers/provider-factory';

export async function POST(request: NextRequest) {
  try {
    // CSRF Protection: Validate Origin/Host headers
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (origin && host) {
      const parsedOrigin = new URL(origin);
      if (parsedOrigin.host !== host) {
        return NextResponse.json(
          { error: 'Forbidden: CSRF check failed' },
          { status: 403 }
        );
      }
    }
    // Rate limiting: 20 requests per 5 minutes per IP
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-client-ip') || 
                     'unknown';
    const rateLimitKey = `logout:${clientIp}`;
    const rateLimitCheck = checkRateLimit(rateLimitKey, 20, 5 * 60 * 1000);

    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const authProvider = await getAuthProvider();
    await authProvider.logout();

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

    // Clear session cookie
    response.cookies.delete('anichisom_session');

    return response;
  } catch (error) {
    console.error('[auth/logout] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
