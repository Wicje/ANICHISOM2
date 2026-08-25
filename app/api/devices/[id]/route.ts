/**
 * Device Management API — PATCH/DELETE /api/devices/[id]
 *
 * PATCH: Update trust level
 * DELETE: Revoke device
 */

import { NextRequest } from 'next/server';
import { checkRouteRateLimit, apiOk, apiError, apiInternal, requireSession } from '@/lib/api-helpers';
import { createServerClient } from '@supabase/ssr';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = checkRouteRateLimit(request, 'DEVICE_UPDATE');
    if (rl) return rl;

    const session = await requireSession(request);
    if (!session.ok) return session.response;

    const { id } = await params;
    const body = await request.json();
    const { trustLevel } = body;

    if (!trustLevel || !['trusted', 'temporary', 'revoked'].includes(trustLevel)) {
      return apiError('trustLevel must be trusted, temporary, or revoked');
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

    const updateData: Record<string, any> = { trust_level: trustLevel };
    if (trustLevel === 'revoked') {
      updateData.revoked_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('devices')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', session.userId);

    if (error) {
      console.error('[device/update] Error:', error);
      return apiInternal('Failed to update device');
    }

    return apiOk({ updated: true, trustLevel });
  } catch (error) {
    console.error('[device/update] Unexpected error:', error);
    return apiInternal();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = checkRouteRateLimit(request, 'DEVICE_DELETE');
    if (rl) return rl;

    const session = await requireSession(request);
    if (!session.ok) return session.response;

    const { id } = await params;

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

    // Soft-delete: set trust_level = revoked
    const { error } = await supabase
      .from('devices')
      .update({
        trust_level: 'revoked',
        revoked_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', session.userId);

    if (error) {
      console.error('[device/delete] Error:', error);
      return apiInternal('Failed to revoke device');
    }

    return apiOk({ revoked: true });
  } catch (error) {
    console.error('[device/delete] Unexpected error:', error);
    return apiInternal();
  }
}
