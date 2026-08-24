/**
 * Context Protocol — Save
 *
 * POST /api/context/save
 * Save a domain's context state.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildCorsHeaders } from '@/lib/cors';
import { apiOk, apiError, apiInternal, requireSession } from '@/lib/api-helpers';
import { getContextRepository } from '@/lib/context-kernel';
import { isValidDomain } from '@/lib/context-kernel';
import {
  extractTokenFromRequest,
  verifyCapabilityToken,
} from '@/lib/capability-token';
import { authorize, PERSONAL_DEFAULT_SCOPES, type Scope } from '@/lib/authz';

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: buildCorsHeaders(request) });
}

async function resolveUserId(request: NextRequest): Promise<
  { ok: true; userId: string; scopes: readonly string[] } | { ok: false; response: NextResponse }
> {
  const auth = await requireSession(request);
  if (auth.ok) return { ok: true, userId: auth.userId, scopes: PERSONAL_DEFAULT_SCOPES };

  // Native daemons and guest sessions authenticate with capability tokens
  const claims = await verifyCapabilityToken(extractTokenFromRequest(request));
  if (!claims) {
    return {
      ok: false,
      response: new NextResponse(auth.response.body, {
        status: auth.response.status,
        headers: buildCorsHeaders(request),
      }),
    };
  }
  return { ok: true, userId: claims.sub, scopes: claims.scopes ?? PERSONAL_DEFAULT_SCOPES };
}

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveUserId(request);
    if (!resolved.ok) return resolved.response;
    const userId = resolved.userId;

    // Authz gate (S1): the graph is personal — writers must own it and hold
    // the scope. v1 tokens carry no scopes claim → personal defaults apply.
    const decision = authorize(
      { userId, ws: 'Continua OS', scopes: resolved.scopes as Scope[] },
      'context.write',
      { type: 'context', owner: userId }
    );
    if (!decision.ok) {
      return NextResponse.json({ ok: false, error: decision.reason }, { status: 403, headers: buildCorsHeaders(request) });
    }

    const body = await request.json();
    const { domain, data, version, deviceId } = body;

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ ok: false, error: 'domain is required' }, { status: 400, headers: buildCorsHeaders(request) });
    }
    if (!isValidDomain(domain)) {
      return NextResponse.json({ ok: false, error: `Invalid domain: ${domain}` }, { status: 400, headers: buildCorsHeaders(request) });
    }
    if (version === undefined || typeof version !== 'number') {
      return NextResponse.json({ ok: false, error: 'version is required (number)' }, { status: 400, headers: buildCorsHeaders(request) });
    }
    if (!deviceId || typeof deviceId !== 'string') {
      return NextResponse.json({ ok: false, error: 'deviceId is required' }, { status: 400, headers: buildCorsHeaders(request) });
    }

    const repo = getContextRepository();
    const result = await repo.save({
      userId,
      domain,
      data,
      version,
      deviceId,
    });

    return NextResponse.json({ ok: true, data: result }, { headers: buildCorsHeaders(request) });
  } catch (error) {
    console.error('[context/save] Error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500, headers: buildCorsHeaders(request) });
  }
}
