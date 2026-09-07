/**
 * Device Heartbeat API — POST /api/devices/heartbeat
 *
 * Updates last_seen_at for the current device.
 */

import { NextRequest } from 'next/server';
import { checkRouteRateLimit, apiOk, apiInternal, requireSession } from '@/lib/api-helpers';
import { createServerClient } from '@supabase/ssr';
import { authorize, PERSONAL_DEFAULT_SCOPES } from '@/lib/authz';
import {
  extractTokenFromRequest,
  verifyCapabilityToken,
} from '@/lib/capability-token';

type Resolved = { ok: true; userId: string } | { ok: false };

/** Session cookie (web user) or capability token (paired desktop daemon). */
async function resolveUserId(request: NextRequest): Promise<Resolved> {
  const auth = await requireSession(request);
  if (auth.ok) return { ok: true, userId: auth.userId };
  const claims = await verifyCapabilityToken(extractTokenFromRequest(request));
  return claims ? { ok: true, userId: claims.sub } : { ok: false };
}

export async function POST(request: NextRequest) {
  try {
    const rl = checkRouteRateLimit(request, 'DEVICE_HEARTBEAT');
    if (rl) return rl;

    const resolved = await resolveUserId(request);
    if (!resolved.ok) return apiInternal('Unauthorized');

    const decision = authorize(
      { userId: resolved.userId, ws: 'Continua OS', scopes: PERSONAL_DEFAULT_SCOPES },
      'context.write',
      { type: 'device', owner: resolved.userId }
    );
    if (!decision.ok) return apiOk({ updated: false });

    const body = await request.json();
    const { fingerprint } = body;

    if (!fingerprint) {
      return apiOk({ updated: false });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll() {},
        },
      },
    );

    const { error } = await supabase
      .from('devices')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('user_id', resolved.userId)
      .eq('fingerprint', fingerprint);

    if (error) {
      console.error('[device/heartbeat] Error:', error);
      return apiInternal('Failed to update heartbeat');
    }

    return apiOk({ updated: true });
  } catch (error) {
    console.error('[device/heartbeat] Unexpected error:', error);
    return apiInternal();
  }
}
