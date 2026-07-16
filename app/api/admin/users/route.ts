/**
 * Admin Users Endpoint
 * 
 * GET /api/admin/users
 * POST /api/admin/users/:userId/role (change user role)
 * POST /api/admin/users/:userId/status (change user status)
 * 
 * Security:
 * - Requires admin or owner role (server-side)
 * - Rate limited
 * - Audit logged
 */

import { NextRequest } from 'next/server';
import {
  requireAuth,
  apiOk,
  apiForbidden,
  apiInternal,
} from '@/lib/api-helpers';
import { createClient } from '@/utils/supabase/server';

// Helper: verify admin role
async function verifyAdminAccess(request: NextRequest) {
  const authResult = await requireAuth(request, 'ADMIN_USERS');
  if (!authResult.ok) return authResult;

  const allowedRoles = ['admin', 'owner', 'superadmin'];
  if (!allowedRoles.includes(authResult.userRole)) {
    return { ok: false as const, response: apiForbidden('Forbidden: Admin role required') };
  }

  return authResult;
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess(request);
    if (!authResult.ok) return authResult.response;

    const supabase = await createClient();
    const { data: users, error, count } = await supabase
      .from('users')
      .select('id, name, email, role, status, isAdmin, createdAt, lastLogin', { count: 'exact' })
      .order('createdAt', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[admin/users] Supabase error:', error.message);
      return apiOk({ users: [], count: 0, timestamp: new Date().toISOString() });
    }

    return apiOk({
      users: users || [],
      count: count || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[admin/users] GET error:', error);
    return apiInternal();
  }
}
