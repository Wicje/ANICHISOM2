/**
 * Device Capability Token Issuance — for native daemons and long-lived sensors.
 *
 * POST /api/connect/device-token
 *
 * Authenticated clients (web session on the user's own machine) can mint a
 * 30-day capability token to configure the Continua background daemon
 * (`src-tauri`). The token is scoped, revocable by rotation of
 * CAPABILITY_JWT_SECRET, and carries no raw API keys.
 */

import { NextRequest } from 'next/server';
import { requireSession, checkRouteRateLimit, apiOk, apiInternal } from '@/lib/api-helpers';
import { signCapabilityToken } from '@/lib/capability-token';

const DEVICE_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export async function POST(request: NextRequest) {
  try {
    const rl = checkRouteRateLimit(request, 'CONNECT_PAIR');
    if (rl) return rl;

    const session = await requireSession(request);
    if (!session.ok) return session.response;

    const body = await request.json().catch(() => ({}));
    const workspace =
      typeof body?.workspace === 'string' && body.workspace.trim()
        ? body.workspace.trim()
        : 'Continua OS';
    const deviceId =
      typeof body?.deviceId === 'string' && body.deviceId.trim()
        ? body.deviceId.trim().slice(0, 64)
        : 'native-daemon';

    const { token, expiresAt } = await signCapabilityToken(
      { sub: session.userId, ws: workspace },
      { ttlSeconds: DEVICE_TOKEN_TTL_SECONDS }
    );

    return apiOk({ token, workspace, deviceId, expiresAt, ttlDays: 30 });
  } catch (error) {
    console.error('[api/connect/device-token] Error:', error);
    return apiInternal();
  }
}
