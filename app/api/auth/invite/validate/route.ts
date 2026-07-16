/**
 * Invite API — Validate and redeem invite codes
 *
 * POST /api/auth/invite/validate — Check if an invite code is valid
 * POST /api/auth/invite/redeem   — Mark an invite code as used (called after signup)
 */

import { NextRequest } from 'next/server';
import { apiOk, apiError, apiInternal } from '@/lib/api-helpers';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 attempts per minute per IP
    const ip = getClientIp(request);
    const rl = checkRateLimit(`invite-validate:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      return apiError(`Too many attempts. Try again in ${rl.retryAfter}s`, 429);
    }

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return apiError('Invite code is required');
    }

    const supabase = await createClient();
    const { data: invite, error } = await supabase
      .from('invites')
      .select('id, code, email, role, maxUses, useCount, expiresAt')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (error || !invite) {
      return apiError('Invalid invite code', 404);
    }

    // Check expiration
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return apiError('This invite code has expired', 410);
    }

    // Check usage limit
    if (invite.useCount >= invite.maxUses) {
      return apiError('This invite code has already been used', 410);
    }

    return apiOk({
      valid: true,
      role: invite.role,
      email: invite.email,
    });
  } catch (error) {
    console.error('[invite/validate] Error:', error);
    return apiInternal();
  }
}
