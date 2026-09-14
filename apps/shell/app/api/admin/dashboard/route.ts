/**
 * Admin Dashboard API Endpoint
 * 
 * GET /api/admin/dashboard
 * 
 * Security:
 * - Requires valid session token
 * - Requires admin or owner role
 * - Rate limited
 * - Server-side role enforcement (S-13)
 */

import { NextRequest } from 'next/server';
import {
  requireAuth,
  apiOk,
  apiForbidden,
  apiInternal,
} from '@/lib/api-helpers';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'ADMIN_DASHBOARD');
    if (!authResult.ok) return authResult.response;

    // Enforce role check: only 'admin' and 'owner' roles
    const allowedRoles = ['admin', 'owner', 'superadmin'];
    if (!allowedRoles.includes(authResult.userRole)) {
      return apiForbidden('Forbidden: Admin role required');
    }

    const supabase = await createClient();

    // Query real counts from Supabase
    const [usersResult, appsResult] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('apps').select('id', { count: 'exact', head: true }),
    ]);

    const totalUsers = usersResult.count || 0;
    const totalApps = appsResult.count || 0;

    return apiOk({
      admin: {
        userId: authResult.userId,
        role: authResult.userRole,
      },
      dashboard: {
        totalUsers,
        totalApps,
        systemHealth: 'nominal',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[admin/dashboard] Unexpected error:', error);
    return apiInternal();
  }
}
