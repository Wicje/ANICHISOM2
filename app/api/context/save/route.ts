/**
 * Context Protocol — Save
 *
 * POST /api/context/save
 * Save a domain's context state.
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiOk, apiError, apiInternal, requireSession } from '@/lib/api-helpers';
import { getContextRepository } from '@/lib/context-kernel';
import { isValidDomain } from '@/lib/context-kernel';
import {
  extractTokenFromRequest,
  verifyCapabilityToken,
} from '@/lib/capability-token';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-capability-token, x-target-cookie, x-client-ip',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

async function resolveUserId(request: NextRequest): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const auth = await requireSession(request);
  if (auth.ok) return { ok: true, userId: auth.userId };

  // Native daemons and guest sessions authenticate with capability tokens
  const claims = await verifyCapabilityToken(extractTokenFromRequest(request));
  if (!claims) {
    return {
      ok: false,
      response: new NextResponse(auth.response.body, {
        status: auth.response.status,
        headers: corsHeaders,
      }),
    };
  }
  return { ok: true, userId: claims.sub };
}

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveUserId(request);
    if (!resolved.ok) return resolved.response;
    const userId = resolved.userId;

    const body = await request.json();
    const { domain, data, version, deviceId } = body;

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ ok: false, error: 'domain is required' }, { status: 400, headers: corsHeaders });
    }
    if (!isValidDomain(domain)) {
      return NextResponse.json({ ok: false, error: `Invalid domain: ${domain}` }, { status: 400, headers: corsHeaders });
    }
    if (version === undefined || typeof version !== 'number') {
      return NextResponse.json({ ok: false, error: 'version is required (number)' }, { status: 400, headers: corsHeaders });
    }
    if (!deviceId || typeof deviceId !== 'string') {
      return NextResponse.json({ ok: false, error: 'deviceId is required' }, { status: 400, headers: corsHeaders });
    }

    const repo = getContextRepository();
    const result = await repo.save({
      userId,
      domain,
      data,
      version,
      deviceId,
    });

    return NextResponse.json({ ok: true, data: result }, { headers: corsHeaders });
  } catch (error) {
    console.error('[context/save] Error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
