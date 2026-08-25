/**
 * Continua Event Journal — Cloud Ingest
 *
 * POST /api/journal/ingest
 * Body: { events: JournalEvent[] }  (batch, max 500)
 *
 * Receivers: native daemon and web sensor. Auth via Supabase session or
 * device capability token (same chain as /api/context/save). The authz gate
 * (S1) enforces the personal-graph invariant; the envelope validator is
 * defense-in-depth against malformed capture paths.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildCorsHeaders } from '@/lib/cors';
import { apiInternal, checkRouteRateLimit, requireSession } from '@/lib/api-helpers';
import { createAdminClient, isSupabaseAdminConfigured } from '@/utils/supabase/admin';
import { authorize, PERSONAL_DEFAULT_SCOPES, type Scope } from '@/lib/authz';
import {
  extractTokenFromRequest,
  verifyCapabilityToken,
} from '@/lib/capability-token';
import { isJournalEvent, type JournalEvent } from '@/lib/journal/envelope';

const MAX_BATCH = 500;
const MAX_PAYLOAD_BYTES = 4 * 1024;

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: buildCorsHeaders(request) });
}

async function resolveUserId(
  request: NextRequest
): Promise<{ ok: true; userId: string; scopes: readonly string[] } | { ok: false; status: number }> {
  const auth = await requireSession(request);
  if (auth.ok) return { ok: true, userId: auth.userId, scopes: PERSONAL_DEFAULT_SCOPES };

  const claims = await verifyCapabilityToken(extractTokenFromRequest(request));
  if (!claims) return { ok: false, status: auth.response.status };
  return { ok: true, userId: claims.sub, scopes: claims.scopes ?? PERSONAL_DEFAULT_SCOPES };
}

export async function POST(request: NextRequest) {
  try {
    const rl = checkRouteRateLimit(request, 'JOURNAL_INGEST');
    if (rl) return rl;

    const resolved = await resolveUserId(request);
    if (!resolved.ok) {
      return NextResponse.json(
        { ok: false, error: 'Authentication required' },
        { status: resolved.status, headers: buildCorsHeaders(request) }
      );
    }
    const { userId } = resolved;

    // Authz gate (S1): journal rows are personal to their owner.
    const decision = authorize(
      { userId, ws: 'Continua OS', scopes: resolved.scopes as Scope[] },
      'context.write',
      { type: 'context', owner: userId }
    );
    if (!decision.ok) {
      return NextResponse.json({ ok: false, error: decision.reason }, { status: 403, headers: buildCorsHeaders(request) });
    }

    const body = await request.json().catch(() => null);
    const rawEvents = Array.isArray(body?.events) ? body.events : [];
    if (rawEvents.length === 0) {
      return NextResponse.json({ ok: false, error: 'events array required' }, { status: 400, headers: buildCorsHeaders(request) });
    }
    if (rawEvents.length > MAX_BATCH) {
      return NextResponse.json(
        { ok: false, error: `batch too large (max ${MAX_BATCH})` },
        { status: 413, headers: buildCorsHeaders(request) }
      );
    }

    // Envelope validation + server-side ownership stamping.
    const nowIso = new Date().toISOString();
    const rows: Record<string, unknown>[] = [];
    let rejected = 0;
    for (const ev of rawEvents) {
      if (!isJournalEvent(ev)) {
        rejected++;
        continue;
      }
      const payloadStr = JSON.stringify(ev.payload ?? {});
      if (payloadStr.length > MAX_PAYLOAD_BYTES) {
        rejected++;
        continue;
      }
      rows.push({
        id: ev.id,
        user_id: userId, // never trust a client-supplied owner
        device: ev.device,
        event_kind: ev.kind,
        importance: ev.importance,
        project_tag: ev.projectTag ?? null,
        ts: new Date(ev.ts).toISOString(),
        payload: ev.payload ?? {},
      });
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'no valid events in batch', rejected },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    if (!isSupabaseAdminConfigured()) {
      // Local/dev without Supabase: accept-and-drop keeps capture loops honest
      // without failing devices that are mid-migration.
      return NextResponse.json(
        { ok: true, accepted: rows.length, rejected, persisted: false },
        { headers: buildCorsHeaders(request) }
      );
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('journal_events')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });

    if (error) {
      console.error('[api/journal/ingest] insert failed:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Failed to persist events' },
        { status: 500, headers: buildCorsHeaders(request) }
      );
    }

    return NextResponse.json(
      { ok: true, accepted: rows.length, rejected, persisted: true, serverTime: nowIso },
      { headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    console.error('[api/journal/ingest] Error:', error);
    return apiInternal();
  }
}
