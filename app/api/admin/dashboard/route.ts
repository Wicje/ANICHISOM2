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

import { NextRequest, NextResponse } from 'next/server';
import { resolveSession } from '@/lib/session-store';
import { checkRateLimit } from '@/lib/auth-validation';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting: 30 requests per 5 minutes per IP
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-client-ip') ||
                     'unknown';
    const rateLimitKey = `admin:dashboard:${clientIp}`;
    const rateLimitCheck = checkRateLimit(rateLimitKey, 30, 5 * 60 * 1000);

    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitCheck.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    // S-13: Server-side role enforcement — extract session from cookie
    const sessionCookie = request.cookies.get('anichisom_session');
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const sessionData = resolveSession(sessionCookie.value);
    if (!sessionData) {
      return NextResponse.json(
        { error: 'Session expired or invalid' },
        { status: 401 }
      );
    }

    // Enforce role check: only 'admin' and 'owner' roles
    const allowedRoles = ['admin', 'owner', 'superadmin'];
    if (!allowedRoles.includes(sessionData.role)) {
      return NextResponse.json(
        {
          error: 'Forbidden: Admin role required',
          userRole: sessionData.role,
        },
        { status: 403 }
      );
    }

    // Return admin dashboard data (stub for now)
    return NextResponse.json({
      success: true,
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
