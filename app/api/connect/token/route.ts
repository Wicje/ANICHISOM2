/**
 * Capability Token Issuance for Authenticated Clients
 *
 * POST /api/connect/token
 *
 * Any client with a valid Supabase session (e.g. the mobile control center)
 * can obtain a short-lived, workspace-scoped capability token. Doubles as
 * the refresh path: call again any time before expiry.
 */

import { NextRequest } from 'next/server';
import { requireSession, checkRouteRateLimit, apiOk, apiInternal } from '@/lib/api-helpers';
import { signCapabilityToken } from '@/lib/capability-token';

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

    const { token, expiresAt } = await signCapabilityToken({
      sub: session.userId,
      ws: workspace,
    });

    return apiOk({ token, workspace, expiresAt });
  } catch (error) {
    console.error('[api/connect/token] Error:', error);
    return apiInternal();
  }
}
