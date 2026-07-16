/**
 * Invite API — Redeem invite code (mark as used after successful signup)
 *
 * POST /api/auth/invite/redeem
 */

import { NextRequest } from 'next/server';
import { apiOk, apiError, apiInternal } from '@/lib/api-helpers';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`invite-redeem:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      return apiError(`Too many attempts. Try again in ${rl.retryAfter}s`, 429);
    }

    const body = await request.json();
    const { code, userId } = body;

    if (!code || !userId) {
      return apiError('Invite code and user ID are required');
    }

    const supabase = await createClient();

    // Atomically increment useCount and set usedBy
    const { data, error } = await supabase
      .from('invites')
      .update({
        usedBy: userId,
        usedAt: new Date().toISOString(),
        useCount: 1,
      })
      .eq('code', code.trim().toUpperCase())
      .lt('useCount', 1)  // Only redeem if not yet used
      .select('id')
      .single();

    if (error || !data) {
      return apiError('Invite code already used or invalid', 409);
    }

    return apiOk({ redeemed: true });
  } catch (error) {
    console.error('[invite/redeem] Error:', error);
    return apiInternal();
  }
}
