/**
 * Passkey Registration API — generates challenge for WebAuthn registration.
 *
 * POST /api/auth/passkey/register
 * Body: { username: string, displayName: string }
 * Returns: { challenge, rpId, user }
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CHALLENGE_TTL = 60_000; // 60 seconds
const challenges = new Map<string, { challenge: string; expiresAt: number }>();

// Cleanup expired challenges periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of challenges) {
    if (value.expiresAt < now) challenges.delete(key);
  }
}, 30_000);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, displayName } = body;

    if (!username || !displayName) {
      return NextResponse.json(
        { error: 'username and displayName are required' },
        { status: 400 },
      );
    }

    // Generate challenge
    const challenge = crypto.randomBytes(32).toString('base64url');
    const challengeId = crypto.randomUUID();

    // Store challenge with TTL
    challenges.set(challengeId, {
      challenge,
      expiresAt: Date.now() + CHALLENGE_TTL,
    });

    const rpId = process.env.NEXT_PUBLIC_RP_ID || 'localhost';

    return NextResponse.json({
      challengeId,
      challenge,
      rp: {
        id: rpId,
        name: 'ANICHISOM OS',
      },
      user: {
        id: username,
        name: username,
        displayName,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60_000,
      attestation: 'none',
    });
  } catch (error) {
    console.error('[Passkey Register] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate registration challenge' },
      { status: 500 },
    );
  }
}

export { challenges as challengeStore };
