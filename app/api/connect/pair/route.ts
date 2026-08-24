/**
 * Continua Ephemeral Pairing API (Universal Cross-Device Bridge)
 *
 * GET /api/connect/pair?pin=7X9K21 - Guest machine polls pairing status
 * POST /api/connect/pair - Phone (mobile key) approves pairing
 *
 * Sessions are persisted in Supabase so they survive server restarts and
 * work across serverless instances. See lib/pairing-store.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRouteRateLimit } from '@/lib/api-helpers';
import { buildCorsHeaders } from '@/lib/cors';
import {
  approveSession,
  getOrCreateSession,
  isValidPin,
  recordPairingFailure,
} from '@/lib/pairing-store';
import {
  extractTokenFromRequest,
  signCapabilityToken,
  verifyCapabilityToken,
} from '@/lib/capability-token';

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: buildCorsHeaders(request) });
}

export async function GET(request: NextRequest) {
  const rl = checkRouteRateLimit(request, 'CONNECT_PAIR');
  if (rl) return rl;

  const { searchParams } = new URL(request.url);
  const pin = searchParams.get('pin')?.trim().toUpperCase();

  if (!pin) {
    return NextResponse.json(
      { ok: false, error: 'PIN parameter required' },
      { status: 400, headers: buildCorsHeaders(request) }
    );
  }

  if (!isValidPin(pin)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid PIN format' },
      { status: 400, headers: buildCorsHeaders(request) }
    );
  }

  try {
    const session = await getOrCreateSession(pin);
    if (!session) {
      return NextResponse.json(
        { ok: true, status: 'expired', data: null },
        { headers: buildCorsHeaders(request) }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        status: session.status,
        data:
          session.status === 'approved'
            ? {
                workspace: session.workspace,
                capabilityToken: session.capabilityToken,
                userId: session.userId,
                clientInfo: session.clientInfo,
              }
            : null,
      },
      { headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    console.error('[api/connect/pair] GET error:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal error' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}

export async function POST(request: NextRequest) {
  const rl = checkRouteRateLimit(request, 'CONNECT_PAIR');
  if (rl) return rl;

  try {
    const body = await request.json().catch(() => ({}));
    let { pin, workspace, clientInfo, userId } = body;
    const cleanPin = typeof pin === 'string' ? pin.trim().toUpperCase() : '';

    if (!isValidPin(cleanPin)) {
      return NextResponse.json(
        { ok: false, error: 'Valid 6-character PIN required' },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    // If the approving phone presented its own capability token, verify it
    // to attribute the approval to a real user identity.
    const presentedToken = extractTokenFromRequest(request) || body.capabilityToken;
    const verifiedClaims = await verifyCapabilityToken(presentedToken);
    if (verifiedClaims) {
      userId = userId || verifiedClaims.sub;
      workspace = workspace || verifiedClaims.ws;
    }

    workspace = typeof workspace === 'string' ? workspace : 'Continua OS';
    userId = typeof userId === 'string' ? userId : 'mobile-key';

    // Mint the scoped, short-lived capability token the guest machine will use
    const { token, expiresAt } = await signCapabilityToken({
      sub: userId,
      ws: workspace,
    });

    const session = await approveSession(cleanPin, {
      workspace,
      clientInfo: typeof clientInfo === 'string' ? clientInfo : undefined,
      userId,
      capabilityToken: token,
      capabilityTokenHash: await hashToken(token),
    });

    if (!session) {
      recordPairingFailure(cleanPin);
      return NextResponse.json(
        { ok: false, error: 'No active pairing session for this PIN. Refresh the guest screen.' },
        { status: 404, headers: buildCorsHeaders(request) }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: 'Pairing approved successfully',
        session: {
          pin: cleanPin,
          workspace: session.workspace,
          clientInfo: session.clientInfo,
          expiresAt,
        },
        capabilityToken: token,
      },
      { headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    console.error('[api/connect/pair] POST error:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal error' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
