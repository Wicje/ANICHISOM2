/**
 * Socket.IO Auth Token Endpoint
 *
 * GET /api/auth/socket-token
 *
 * Returns a short-lived token for WebSocket authentication.
 * The httpOnly session cookie is used to authenticate this request,
 * then a separate short-lived token is issued for the WS connection.
 */

import { NextRequest } from 'next/server';
import {
  requireAuth,
  apiOk,
  apiInternal,
} from '@/lib/api-helpers';
import { createSession } from '@/lib/session-store';

const SOCKET_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes — short-lived for WS auth

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'AUTH_SESSION');
    if (!authResult.ok) return authResult.response;

    const userId = authResult.userId;
    const userRole = authResult.userRole;

    // Generate a short-lived token specifically for Socket.IO auth
    const crypto = await import('crypto');
    const socketToken = 'ws-' + crypto.randomBytes(24).toString('hex');

    createSession(socketToken, userId, userId, userRole, SOCKET_TOKEN_TTL_MS);

    return apiOk({ token: socketToken });
  } catch (error) {
    console.error('[auth/socket-token] Error:', error);
    return apiInternal();
  }
}
