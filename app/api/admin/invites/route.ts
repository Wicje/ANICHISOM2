/**
 * Admin Invite Codes
 *
 * GET  /api/admin/invites   — List all invite codes
 * POST /api/admin/invites   — Generate new invite codes
 *
 * Security: admin role required
 */

import { NextRequest } from 'next/server';
import { requireAuth, apiOk, apiForbidden, apiInternal, apiError } from '@/lib/api-helpers';
import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

async function verifyAdminAccess(request: NextRequest) {
  const authResult = await requireAuth(request, 'ADMIN_INVITES');
  if (!authResult.ok) return authResult;
  const allowedRoles = ['admin', 'owner', 'superadmin'];
  if (!allowedRoles.includes(authResult.userRole)) {
    return { ok: false as const, response: apiForbidden('Forbidden: Admin role required') };
  }
  return authResult;
}

function generateCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess(request);
    if (!authResult.ok) return authResult.response;

    const supabase = await createClient();
    const { data: invites, error } = await supabase
      .from('invites')
      .select('id, code, email, role, created_by, used_by, used_at, expires_at, max_uses, use_count, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('[admin/invites] Supabase error:', error.message);
      return apiOk({ invites: [] });
    }

    return apiOk({ invites: invites || [] });
  } catch (error) {
    console.error('[admin/invites] GET error:', error);
    return apiInternal();
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess(request);
    if (!authResult.ok) return authResult.response;

    const body = await request.json();
    const { count = 1, role = 'filmmaker', email, expiresInDays } = body;

    if (count < 1 || count > 50) {
      return apiError('Count must be between 1 and 50');
    }

    const supabase = await createClient();
    const codes: { code: string; email: string | null; role: string }[] = [];

    for (let i = 0; i < count; i++) {
      const code = generateCode();
      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
        : null;

      const { error } = await supabase.from('invites').insert({
        code,
        email: email || null,
        role,
        created_by: authResult.userId,
        expires_at: expiresAt,
        max_uses: 1,
      });

      if (error) {
        console.error('[admin/invites] Insert error:', error.message);
        continue;
      }

      codes.push({ code, email: email || null, role });
    }

    return apiOk({
      created: codes.length,
      codes,
    });
  } catch (error) {
    console.error('[admin/invites] POST error:', error);
    return apiInternal();
  }
}
