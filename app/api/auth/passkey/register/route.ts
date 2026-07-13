/**
 * Passkey Registration API — generates challenge for WebAuthn registration.
 *
 * POST /api/auth/passkey/register
 * Body: { username: string, displayName: string }
 * Returns: { challenge, rpId, user }
 */
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { apiError, apiInternal, apiOk } from '@/lib/api-helpers';

const CHALLENGE_TTL = 60_000;
const challenges = new Map<string, { challenge: string; expiresAt: number }>();

function cleanupExpired() {
  const now = Date.now();
  for (const [key, value] of challenges) {
    if (value.expiresAt < now) challenges.delete(key);
  }
}

export async function POST(request: NextRequest) {
  try {
    cleanupExpired();

    const body = await request.json();
    const { username, displayName } = body;

    if (!username || !displayName) {
      return apiError('username and displayName are required');
    }

    const challenge = crypto.randomBytes(32).toString('base64url');
    const challengeId = crypto.randomUUID();

    challenges.set(challengeId, {
      challenge,
      expiresAt: Date.now() + CHALLENGE_TTL,
    });

    const rpId = process.env.NEXT_PUBLIC_RP_ID || 'localhost';

    return apiOk({
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
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' },
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
    return apiInternal('Failed to generate registration challenge');
  }
}
