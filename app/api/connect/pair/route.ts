/**
 * Continua Ephemeral Pairing API (Universal Cross-Device Bridge)
 *
 * GET /api/connect/pair?pin=7X9K21 - Check pairing status (long-polling or polling)
 * POST /api/connect/pair - Phone approves pairing with capability token
 */

import { NextRequest, NextResponse } from 'next/server';

interface PairingSession {
  pin: string;
  createdAt: number;
  status: 'waiting' | 'approved' | 'expired';
  workspace?: string;
  capabilityToken?: string;
  userId?: string;
  clientInfo?: string;
}

// In-memory pairing sessions map (active for 5 minutes per PIN)
const pairingSessions = new Map<string, PairingSession>();

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [pin, session] of pairingSessions.entries()) {
    if (now - session.createdAt > 5 * 60 * 1000) {
      pairingSessions.delete(pin);
    }
  }
}, 60_000);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pin = searchParams.get('pin')?.toUpperCase();

  if (!pin) {
    return NextResponse.json({ ok: false, error: 'PIN parameter required' }, { status: 400, headers: corsHeaders });
  }

  let session = pairingSessions.get(pin);
  if (!session) {
    // Create new waiting session if requested for the first time by guest PC
    session = {
      pin,
      createdAt: Date.now(),
      status: 'waiting',
    };
    pairingSessions.set(pin, session);
  }

  return NextResponse.json(
    {
      ok: true,
      status: session.status,
      data: session.status === 'approved' ? {
        workspace: session.workspace,
        capabilityToken: session.capabilityToken,
        userId: session.userId,
        clientInfo: session.clientInfo,
      } : null,
    },
    { headers: corsHeaders }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { pin, workspace, capabilityToken, userId, clientInfo } = body;

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json({ ok: false, error: 'Valid PIN required' }, { status: 400, headers: corsHeaders });
    }

    const cleanPin = pin.trim().toUpperCase();
    const session: PairingSession = {
      pin: cleanPin,
      createdAt: Date.now(),
      status: 'approved',
      workspace: workspace || 'Continua OS',
      capabilityToken: capabilityToken || `cap_${crypto.randomUUID().slice(0, 12)}`,
      userId: userId || 'user_continua_josephan',
      clientInfo: clientInfo || 'Samsung Galaxy (Mobile Key)',
    };

    pairingSessions.set(cleanPin, session);

    return NextResponse.json(
      {
        ok: true,
        message: 'Pairing approved successfully',
        session: {
          pin: cleanPin,
          workspace: session.workspace,
          clientInfo: session.clientInfo,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Internal error' }, { status: 500, headers: corsHeaders });
  }
}
