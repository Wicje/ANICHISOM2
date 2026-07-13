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

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request, 'ADMIN_DASHBOARD');
    if (!authResult.ok) return authResult.response;

    const sessionData = authResult.session;

    // Enforce role check: only 'admin' and 'owner' roles
    const allowedRoles = ['admin', 'owner', 'superadmin'];
    if (!allowedRoles.includes(sessionData.role)) {
      return apiForbidden('Forbidden: Admin role required');
    }

    // Return admin dashboard data (stub for now)
    return apiOk({
      admin: {
        userId: sessionData.userId,
        uniqueId: sessionData.uniqueId,
        role: sessionData.role,
      },
      dashboard: {
        totalUsers: 0,
        totalApps: 0,
        systemHealth: 'nominal',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[admin/dashboard] Unexpected error:', error);
    return apiInternal();
  }
}
