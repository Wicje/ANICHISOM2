/**
 * Continua Org Manifest API (Phase H)
 *
 * GET /api/orgs/[id]/manifest?role=developer   — read (any member seat)
 * PUT  /api/orgs/[id]/manifest                 — upsert (admin/owner)
 *      body: RoleManifest (role/version normalized server-side)
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiInternal, requireSession } from '@/lib/api-helpers';
import { getManifest, OrgServiceError, setManifest } from '@/lib/org-service';
import { isValidRoleSlug } from '@/lib/org-manifest';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireSession(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const role = new URL(request.url).searchParams.get('role') || '';

  try {
    if (!isValidRoleSlug(role)) {
      return NextResponse.json({ ok: false, error: 'valid role required' }, { status: 400 });
    }
    const manifest = await getManifest(id, role);
    if (!manifest) {
      return NextResponse.json({ ok: false, error: `No manifest for role "${role}"` }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: manifest });
  } catch (error) {
    if (error instanceof OrgServiceError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error('[api/orgs/manifest] GET error:', error);
    return apiInternal();
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await requireSession(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const body = await request.json().catch(() => null);
    const role = typeof body?.role === 'string' ? body.role : '';
    if (!isValidRoleSlug(role)) {
      return NextResponse.json({ ok: false, error: 'valid role required' }, { status: 400 });
    }

    const manifest = await setManifest(
      { userId: auth.userId, ws: 'Continua OS', scopes: ['org.admin'] },
      id,
      role,
      body
    );
    return NextResponse.json({ ok: true, data: manifest });
  } catch (error) {
    if (error instanceof OrgServiceError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error('[api/orgs/manifest] PUT error:', error);
    return apiInternal();
  }
}
