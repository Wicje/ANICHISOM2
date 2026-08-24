/**
 * Continua Workspace Assembly API (Phase H — onboarding-as-consequence)
 *
 * GET /api/orgs/[id]/assemble
 *
 * Returns the workspace definition derived from the CALLER'S CURRENT SEAT.
 * The role is resolved server-side from org membership — a client-supplied
 * role is never trusted. After a seat is revoked this endpoint 403s, which
 * is the entire offboarding story: nothing was materialized at grant time.
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiInternal, requireSession } from '@/lib/api-helpers';
import { assembleForUser, OrgServiceError } from '@/lib/org-service';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireSession(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const assembly = await assembleForUser(auth.userId, id);
    return NextResponse.json({
      ok: true,
      data: {
        orgId: assembly.org.id,
        orgName: assembly.org.name,
        role: assembly.role,
        manifestRole: assembly.manifestRole,
        manifest: assembly.manifest,
      },
    });
  } catch (error) {
    if (error instanceof OrgServiceError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error('[api/orgs/assemble] GET error:', error);
    return apiInternal();
  }
}
