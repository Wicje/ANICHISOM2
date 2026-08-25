/**
 * Device Register API — POST /api/devices/register
 *
 * Registers a new device for the current user.
 * If device already exists (same fingerprint), updates last_seen_at.
 */

import { NextRequest } from 'next/server';
import { checkRouteRateLimit, apiOk, apiError, apiInternal, requireSession } from '@/lib/api-helpers';
import { createServerClient } from '@supabase/ssr';
import { authorize, PERSONAL_DEFAULT_SCOPES, type Scope } from '@/lib/authz';

export async function POST(request: NextRequest) {
  try {
    const rl = checkRouteRateLimit(request, 'DEVICE_REGISTER');
    if (rl) return rl;

    const session = await requireSession(request);
    if (!session.ok) return session.response;

    const decision = authorize(
      { userId: session.userId, ws: 'Continua OS', scopes: PERSONAL_DEFAULT_SCOPES },
      'context.write',
      { type: 'device', owner: session.userId }
    );
    if (!decision.ok) return apiError('Forbidden', 403);

    const body = await request.json();
    const { deviceName, fingerprint, platform, browser, capabilities } = body;

    if (!fingerprint || !deviceName) {
      return apiError('fingerprint and deviceName are required');
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

    // Check if device already exists
    const { data: existing } = await supabase
      .from('devices')
      .select('id, trust_level')
      .eq('user_id', session.userId)
      .eq('fingerprint', fingerprint)
      .single();

    if (existing) {
      // Update existing device
      const { error } = await supabase
        .from('devices')
        .update({
          device_name: deviceName,
          platform: platform || null,
          browser: browser || null,
          capabilities: capabilities || {},
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        console.error('[device/register] Update error:', error);
        return apiInternal('Failed to update device');
      }

      return apiOk({
        deviceId: existing.id,
        trustLevel: existing.trust_level,
        isNew: false,
      });
    }

    // Insert new device
    const { data, error } = await supabase
      .from('devices')
      .insert({
        user_id: session.userId,
        device_name: deviceName,
        trust_level: 'temporary',
        platform: platform || null,
        browser: browser || null,
        fingerprint,
        capabilities: capabilities || {},
      })
      .select('id, trust_level')
      .single();

    if (error) {
      console.error('[device/register] Insert error:', error);
      return apiInternal('Failed to register device');
    }

    return apiOk({
      deviceId: data.id,
      trustLevel: data.trust_level,
      isNew: true,
    });
  } catch (error) {
    console.error('[device/register] Unexpected error:', error);
    return apiInternal();
  }
}

// GET /api/devices — list all devices for current user
export async function GET(request: NextRequest) {
  try {
    const rl = checkRouteRateLimit(request, 'DEVICE_LIST');
    if (rl) return rl;

    const session = await requireSession(request);
    if (!session.ok) return session.response;

    const decision = authorize(
      { userId: session.userId, ws: 'Continua OS', scopes: PERSONAL_DEFAULT_SCOPES },
      'context.read',
      { type: 'device', owner: session.userId }
    );
    if (!decision.ok) return apiError('Forbidden', 403);

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

    const { data, error } = await supabase
      .from('devices')
      .select('id, user_id, device_name, trust_level, platform, browser, last_seen_at, created_at, revoked_at')
      .eq('user_id', session.userId)
      .order('last_seen_at', { ascending: false });

    if (error) {
      console.error('[device/list] Error:', error);
      return apiInternal('Failed to list devices');
    }

    return apiOk(data || []);
  } catch (error) {
    console.error('[device/list] Unexpected error:', error);
    return apiInternal();
  }
}
