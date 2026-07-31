/**
 * Crypto Service — AES-GCM encryption for session data and API keys.
 *
 * Uses Web Crypto API (SubtleCrypto) for browser-native encryption.
 * Keys are derived via PBKDF2 from user passphrase or generated randomly.
 * Never persists keys — only the encrypted data is stored.
 */

// ─── Key Generation ───────────────────────────────────────────────────────

/**
 * Generate a random AES-GCM 256-bit key.
 */
export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Derive an AES-GCM key from a passphrase + salt via PBKDF2.
 */
export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations = 100_000,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as ArrayBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Export a CryptoKey to raw bytes (for storage/transfer).
 */
export async function exportKey(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey('raw', key);
}

/**
 * Import a raw ArrayBuffer as an AES-GCM CryptoKey.
 */
export async function importKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

// ─── Encryption / Decryption ──────────────────────────────────────────────

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string;         // base64 (12 bytes for AES-GCM)
  salt?: string;      // base64 (only for derived keys)
}

/**
 * Encrypt plaintext with an AES-GCM key.
 * Returns base64-encoded ciphertext + IV.
 */
export async function encrypt(
  key: CryptoKey,
  plaintext: string,
): Promise<EncryptedPayload> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const data = encoder.encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data,
  );

  return {
    ciphertext: bufferToBase64(encrypted),
    iv: bufferToBase64(iv.buffer as ArrayBuffer),
  };
}

/**
 * Decrypt an EncryptedPayload back to plaintext.
 */
export async function decrypt(
  key: CryptoKey,
  payload: EncryptedPayload,
): Promise<string> {
  const ciphertext = base64ToBuffer(payload.ciphertext);
  const iv = base64ToBuffer(payload.iv);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}

// ─── Password Hashing ─────────────────────────────────────────────────────

export interface PasswordHash {
  hash: string;   // base64
  salt: string;   // base64
  iterations: number;
}

/**
 * Hash a password with PBKDF2 for storage.
 */
export async function hashPassword(
  password: string,
  iterations = 600_000,
): Promise<PasswordHash> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as unknown as ArrayBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );

  return {
    hash: bufferToBase64(bits),
    salt: bufferToBase64(salt.buffer as ArrayBuffer),
    iterations,
  };
}

// Constant-time compare function (timing safe)
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}

/**
 * Verify a password against a stored hash.
 */
export async function verifyPassword(
  password: string,
  stored: PasswordHash,
): Promise<boolean> {
  const salt = base64ToBuffer(stored.salt);
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(salt) as unknown as ArrayBuffer,
      iterations: stored.iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );

  const calculated = new Uint8Array(bits);
  const expected = new Uint8Array(base64ToBuffer(stored.hash));
  return timingSafeEqual(calculated, expected);
}

// ─── Utility ──────────────────────────────────────────────────────────────

/**
 * Generate a random salt (Uint8Array).
 */
export function generateSalt(length = 16): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
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
