/**
 * WebAuthn (Passkey) Client Service — passwordless authentication.
 *
 * Uses the browser's built-in WebAuthn API for:
 * - Registration (create credential)
 * - Authentication (get credential)
 *
 * Server routes handle challenge generation and verification.
 */

const RP_NAME = 'ANICHISOM OS';
const RP_ID = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

// ─── Types ────────────────────────────────────────────────────────────────

export interface PasskeyRegistrationResult {
  credentialId: string;
  publicKey: string;   // base64-encoded public key
  authenticatorType: 'platform' | 'cross-platform';
  label: string;
  createdAt: number;
}

export interface PasskeyAuthResult {
  credentialId: string;
  authenticatorData: string;
  clientDataJSON: string;
  signature: string;
}

// ─── Check Support ────────────────────────────────────────────────────────

export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential;
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// ─── Registration ─────────────────────────────────────────────────────────

/**
 * Generate a registration challenge.
 * In production, this calls the server. Here we generate locally for demo.
 */
function generateChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Register a new passkey.
 * Creates a WebAuthn credential and returns the result for server storage.
 */
export async function registerPasskey(
  userId: string,
  userName: string,
  userDisplayName: string,
): Promise<PasskeyRegistrationResult> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser');
  }

  const challenge = generateChallenge();
  const userIdBytes = new TextEncoder().encode(userId);

  const credential = await navigator.credentials.create({
    publicKey: {
      rp: { name: RP_NAME, id: RP_ID },
      user: {
        id: userIdBytes as unknown as ArrayBuffer,
        name: userName,
        displayName: userDisplayName,
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
      challenge: challenge as unknown as ArrayBuffer,
      attestation: 'none',
    },
  }) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('Passkey registration was cancelled');
  }

  const attestationResponse = credential.response as AuthenticatorAttestationResponse;

  // Detect authenticator type
  const authenticatorType: 'platform' | 'cross-platform' =
    credential.authenticatorAttachment === 'cross-platform'
      ? 'cross-platform'
      : 'platform';

  return {
    credentialId: bufferToBase64(credential.rawId),
    publicKey: bufferToBase64(attestationResponse.getPublicKey() as ArrayBuffer),
    authenticatorType,
    label: `${authenticatorType === 'platform' ? 'Device' : 'Security Key'}`,
    createdAt: Date.now(),
  };
}

// ─── Authentication ───────────────────────────────────────────────────────

/**
 * Authenticate with a passkey.
 * Prompts the user to use their biometric/security key.
 */
export async function authenticateWithPasskey(
  credentialIds: string[],
): Promise<PasskeyAuthResult> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser');
  }

  const challenge = generateChallenge();

  // Convert stored credential IDs to ArrayBuffer
  const allowCredentials = credentialIds.map((id) => ({
    id: base64ToBuffer(id) as unknown as ArrayBuffer,
    type: 'public-key' as const,
    transports: ['internal', 'hybrid'] as AuthenticatorTransport[],
  }));

  const assertion = await navigator.credentials.get({
    publicKey: {
      rpId: RP_ID,
      challenge: challenge as unknown as ArrayBuffer,
      timeout: 60_000,
      userVerification: 'required',
      allowCredentials,
    },
  }) as PublicKeyCredential | null;

  if (!assertion) {
    throw new Error('Passkey authentication was cancelled');
  }

  const authResponse = assertion.response as AuthenticatorAssertionResponse;

  return {
    credentialId: bufferToBase64(assertion.rawId),
    authenticatorData: bufferToBase64(authResponse.authenticatorData),
    clientDataJSON: bufferToBase64(authResponse.clientDataJSON),
    signature: bufferToBase64(authResponse.signature),
  };
}

// ─── Local Storage (passkey metadata) ─────────────────────────────────────

const PASSKEYS_KEY = 'anichisom-passkeys';

/**
 * Save passkey metadata locally (for "which passkeys do I have?" queries).
 */
export async function savePasskeyMetadata(
  meta: PasskeyRegistrationResult,
): Promise<void> {
  const existing = await getPasskeyMetadata();
  existing.push(meta);
  await import('idb-keyval').then(({ set }) => set(PASSKEYS_KEY, existing));
}

/**
 * Get all locally stored passkey metadata.
 */
export async function getPasskeyMetadata(): Promise<PasskeyRegistrationResult[]> {
  const { get } = await import('idb-keyval');
  return (await get<PasskeyRegistrationResult[]>(PASSKEYS_KEY)) || [];
}

/**
 * Remove passkey metadata.
 */
export async function removePasskeyMetadata(credentialId: string): Promise<void> {
  const { get, set } = await import('idb-keyval');
  const existing = await get<PasskeyRegistrationResult[]>(PASSKEYS_KEY);
  if (!existing) return;
  await set(PASSKEYS_KEY, existing.filter((p) => p.credentialId !== credentialId));
}
