/**
 * Passkey Authentication API — generates challenge for WebAuthn authentication.
 *
 * POST /api/auth/passkey/authenticate
 * Body: { credentialIds: string[] }
 * Returns: { challenge, rpId, allowCredentials }
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Reuse challenge store from registration route
const CHALLENGE_TTL = 60_000;
const challenges = new Map<string, { challenge: string; expiresAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of challenges) {
    if (value.expiresAt < now) challenges.delete(key);
  }
}, 30_000);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credentialIds } = body;

    if (!credentialIds || !Array.isArray(credentialIds) || credentialIds.length === 0) {
      return NextResponse.json(
        { error: 'credentialIds array is required' },
        { status: 400 },
      );
    }

    // Generate challenge
    const challenge = crypto.randomBytes(32).toString('base64url');
    const challengeId = crypto.randomUUID();

    challenges.set(challengeId, {
      challenge,
      expiresAt: Date.now() + CHALLENGE_TTL,
    });

    const rpId = process.env.NEXT_PUBLIC_RP_ID || 'localhost';

    return NextResponse.json({
      challengeId,
      challenge,
      rpId,
      timeout: 60_000,
      userVerification: 'required',
      allowCredentials: credentialIds.map((id: string) => ({
        id,
        type: 'public-key',
        transports: ['internal', 'hybrid'],
      })),
    });
  } catch (error) {
    console.error('[Passkey Auth] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate authentication challenge' },
      { status: 500 },
    );
  }
}

export { challenges as challengeStore };
