/**
 * Continua Org Members API (Phase G — Team Foundation)
 *
 * GET    /api/orgs/[id]/members           — list members (any member)
 * POST   /api/orgs/[id]/members           — add member (admin/owner)
 * DELETE /api/orgs/[id]/members?userId=   — remove member (admin/owner, or self-leave)
 *
 * All authorization flows through the org service, which composes
 * lib/authz.ts decisions over DB-resolved roles.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  apiInternal,
  checkRouteRateLimit,
  requireSession,
} from '@/lib/api-helpers';
import { addMember, listMembers, OrgServiceError, removeMember } from '@/lib/org-service';
import type { Principal } from '@/lib/authz';

type RouteContext = { params: Promise<{ id: string }> };

function principalFor(userId: string): Principal {
  return { userId, ws: 'Continua OS', scopes: ['org.admin'] };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const rl = checkRouteRateLimit(request, 'ORG_ADMIN');
  if (rl) return rl;

  const auth = await requireSession(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const members = await listMembers(principalFor(auth.userId), id);
    return NextResponse.json({ ok: true, data: members });
  } catch (error) {
    if (error instanceof OrgServiceError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error('[api/orgs/members] GET error:', error);
    return apiInternal();
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const rl = checkRouteRateLimit(request, 'ORG_ADMIN');
  if (rl) return rl;

  const auth = await requireSession(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const body = await request.json().catch(() => ({}));
    const member = await addMember(
      principalFor(auth.userId),
      id,
      typeof body?.userId === 'string' ? body.userId : '',
      typeof body?.role === 'string' ? body.role : 'member'
    );
    return NextResponse.json({ ok: true, data: member }, { status: 201 });
  } catch (error) {
    if (error instanceof OrgServiceError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error('[api/orgs/members] POST error:', error);
    return apiInternal();
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const rl = checkRouteRateLimit(request, 'ORG_ADMIN');
  if (rl) return rl;

  const auth = await requireSession(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const targetUserId = new URL(request.url).searchParams.get('userId') || '';

  try {
    await removeMember(principalFor(auth.userId), id, targetUserId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof OrgServiceError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error('[api/orgs/members] DELETE error:', error);
    return apiInternal();
  }
}
