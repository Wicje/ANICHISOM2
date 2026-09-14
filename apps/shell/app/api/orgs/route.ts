/**
 * Continua Orgs API (Phase G — Team Foundation)
 *
 * GET  /api/orgs        — organizations the session user belongs to
 * POST /api/orgs        — create an organization (creator becomes owner)
 *
 * Session-authenticated (real Supabase users); capability tokens carry no
 * org-management authority by design.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  apiInternal,
  checkRouteRateLimit,
  requireSession,
} from '@/lib/api-helpers';
import { createOrganization, listOrganizationsForUser, OrgServiceError } from '@/lib/org-service';

export async function GET(request: NextRequest) {
  const rl = checkRouteRateLimit(request, 'ORG_ADMIN');
  if (rl) return rl;

  const auth = await requireSession(request);
  if (!auth.ok) return auth.response;

  try {
    const memberships = await listOrganizationsForUser(auth.userId);
    return NextResponse.json({
      ok: true,
      data: memberships.map(({ org, role }) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        ownerId: org.ownerId,
        createdAt: org.createdAt,
        role,
      })),
    });
  } catch (error) {
    if (error instanceof OrgServiceError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error('[api/orgs] GET error:', error);
    return apiInternal();
  }
}

export async function POST(request: NextRequest) {
  const rl = checkRouteRateLimit(request, 'ORG_ADMIN');
  if (rl) return rl;

  const auth = await requireSession(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const org = await createOrganization(auth.userId, body?.name);
    return NextResponse.json(
      { ok: true, data: { ...org, role: 'owner' as const } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof OrgServiceError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error('[api/orgs] POST error:', error);
    return apiInternal();
  }
}
