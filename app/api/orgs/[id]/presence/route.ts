/**
 * Continua Org Presence API (Phase J v1)
 *
 * POST /api/orgs/[id]/presence — boot/interval heartbeat (seat-gated).
 * GET  /api/orgs/[id]/presence — who's online (members only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiInternal, requireSession } from '@/lib/api-helpers';
import {
  heartbeatPresence,
  listPresence,
  OrgServiceError,
} from '@/lib/org-service';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireSession(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  let device: string | undefined;
  try {
    const body = await request.json();
    if (body && typeof body.device === 'string') device = body.device.slice(0, 120);
  } catch {}

  try {
    await heartbeatPresence(auth.userId, id, device);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof OrgServiceError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error('[api/orgs/presence] POST error:', error);
    return apiInternal();
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireSession(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const entries = await listPresence(id, auth.userId);
    return NextResponse.json({ ok: true, data: entries });
  } catch (error) {
    if (error instanceof OrgServiceError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error('[api/orgs/presence] GET error:', error);
    return apiInternal();
  }
}
