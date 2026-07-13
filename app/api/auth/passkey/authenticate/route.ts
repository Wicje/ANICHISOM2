/**
 * Passkey Authentication API — generates challenge for WebAuthn authentication.
 *
 * POST /api/auth/passkey/authenticate
 * Body: { credentialIds: string[] }
 * Returns: { challenge, rpId, allowCredentials }
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
    const { credentialIds } = body;

    if (!credentialIds || !Array.isArray(credentialIds) || credentialIds.length === 0) {
      return apiError('credentialIds array is required');
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
    return apiInternal('Failed to generate authentication challenge');
  }
}
