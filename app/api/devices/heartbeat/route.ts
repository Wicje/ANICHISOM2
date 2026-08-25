/**
 * Device Heartbeat API — POST /api/devices/heartbeat
 *
 * Updates last_seen_at for the current device.
 */

import { NextRequest } from 'next/server';
import { checkRouteRateLimit, apiOk, apiInternal, requireSession } from '@/lib/api-helpers';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
  try {
    const rl = checkRouteRateLimit(request, 'DEVICE_HEARTBEAT');
    if (rl) return rl;

    const session = await requireSession(request);
    if (!session.ok) return session.response;

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
      .eq('user_id', session.userId)
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
