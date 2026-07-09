/**
 * Socket.IO Auth Token Endpoint
 *
 * GET /api/auth/socket-token
 *
 * Returns a short-lived token for WebSocket authentication.
 * The httpOnly session cookie is used to authenticate this request,
 * then a separate short-lived token is issued for the WS connection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/auth-validation';
import { resolveSession, createSession } from '@/lib/session-store';

const SOCKET_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes — short-lived for WS auth

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-client-ip') ||
                     'unknown';
    const rateCheck = checkRateLimit(`socket-token:${clientIp}`, 30, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const sessionCookie = request.cookies.get('anichisom_session');
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ error: 'No active session' }, { status: 401 });
    }

    // Resolve the httpOnly session cookie against the session store
    const sessionData = resolveSession(sessionCookie.value);
    if (!sessionData) {
      return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
    }

    // Generate a short-lived token specifically for Socket.IO auth
    const crypto = await import('crypto');
    const socketToken = 'ws-' + crypto.randomBytes(24).toString('hex');

    createSession(socketToken, sessionData.userId, sessionData.uniqueId, sessionData.role, SOCKET_TOKEN_TTL_MS);

    return NextResponse.json({ token: socketToken });
  } catch (error) {
    console.error('[auth/socket-token] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
