/**
 * Socket.IO Auth Token Endpoint
 *
 * GET /api/auth/socket-token
 *
 * Returns a short-lived token for WebSocket authentication.
 * Only available when NEXT_PUBLIC_ENABLE_COLLAB=true.
 */

import { NextRequest } from 'next/server';
import {
  requireAuth,
  apiOk,
  apiInternal,
  apiNotFound,
} from '@/lib/api-helpers';
import { createSession } from '@/lib/session-store';

const SOCKET_TOKEN_TTL_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_ENABLE_COLLAB !== 'true') {
    return apiNotFound('Collaboration not enabled');
  }

  try {
    const authResult = await requireAuth(request, 'AUTH_SESSION');
    if (!authResult.ok) return authResult.response;

    const userId = authResult.userId;
    const userRole = authResult.userRole;

    const crypto = await import('crypto');
    const socketToken = 'ws-' + crypto.randomBytes(24).toString('hex');

    createSession(socketToken, userId, userId, userRole, SOCKET_TOKEN_TTL_MS);

    return apiOk({ token: socketToken });
  } catch (error) {
    console.error('[auth/socket-token] Error:', error);
    return apiInternal();
  }
}
