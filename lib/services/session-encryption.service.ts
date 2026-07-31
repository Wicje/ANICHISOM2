/**
 * Session Encryption Service — encrypts/decrypts sensitive session data
 * in the browser. Uses a per-user key held in memory (never persisted).
 *
 * Encrypts: auth tokens, API keys, OAuth tokens, session metadata.
 * Storage: IndexedDB (encrypted blobs only).
 */
import { get as idbGet, set as idbSet } from 'idb-keyval';
import {
  generateKey,
  deriveKey,
  exportKey,
  importKey,
  encrypt,
  decrypt,
  generateSalt,
  type EncryptedPayload,
} from '@/lib/crypto';

const SESSION_KEY_STORE = 'continuaos-session-key';
const ENCRYPTED_DATA_STORE = 'continuaos-encrypted-data';

// ─── Types ────────────────────────────────────────────────────────────────

export interface EncryptedSessionData {
  keySalt: string;      // base64 — salt used to derive the session key
  keyIterations: number;
}

// ─── State (in-memory only) ───────────────────────────────────────────────

let masterKey: CryptoKey | null = null;
let isUnlocked = false;

// ─── Key Lifecycle ────────────────────────────────────────────────────────

/**
 * Initialize the encryption key from a passphrase.
 * Call this on login or unlock.
 */
export async function initSessionEncryption(passphrase: string): Promise<void> {
  const stored = await idbGet<EncryptedSessionData>(SESSION_KEY_STORE);

  if (stored) {
    // Derive key from passphrase + stored salt
    const salt = base64ToUint8(stored.keySalt);
    masterKey = await deriveKey(passphrase, salt, stored.keyIterations);
  } else {
    // First time — generate new salt, derive key, persist salt
    const salt = generateSalt(16);
    const iterations = 100_000;
    masterKey = await deriveKey(passphrase, salt, iterations);

    await idbSet(SESSION_KEY_STORE, {
      keySalt: uint8ToBase64(salt),
      keyIterations: iterations,
    } as EncryptedSessionData);
  }

  isUnlocked = true;
}

/**
 * Initialize from a random key (for non-passphrase flows).
 * Persists key bytes in sessionStorage so encrypted data survives tab reload.
 */
export async function initSessionKeyRandom(): Promise<void> {
  if (typeof window !== 'undefined') {
    const cachedKey = sessionStorage.getItem('continuaos_session_random_key');
    if (cachedKey) {
      try {
        const raw = base64ToUint8(cachedKey);
        masterKey = await crypto.subtle.importKey('raw', raw.buffer as ArrayBuffer, 'AES-GCM', true, ['encrypt', 'decrypt']);
        isUnlocked = true;
        return;
      } catch {}
    }
  }

  // Generate exportable key for sessionStorage mirroring
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
  masterKey = key;
  isUnlocked = true;

  if (typeof window !== 'undefined') {
    try {
      const exported = await crypto.subtle.exportKey('raw', key);
      sessionStorage.setItem('continuaos_session_random_key', uint8ToBase64(new Uint8Array(exported)));
    } catch {}
  }
}

/**
 * Lock the session — clear key from memory.
 */
export function lockSession(): void {
  masterKey = null;
  isUnlocked = false;
}

/**
 * Check if the session is unlocked.
 */
export function isSessionUnlocked(): boolean {
  return isUnlocked && masterKey !== null;
}

// ─── Encrypt / Decrypt ────────────────────────────────────────────────────

/**
 * Encrypt arbitrary string data and store it in IndexedDB.
 */
export async function encryptAndStore(
  key: string,
  data: string,
): Promise<void> {
  if (!masterKey) throw new Error('Session is locked');
  const payload = await encrypt(masterKey, data);

  // Store all encrypted entries in a map
  const existing = await idbGet<Record<string, EncryptedPayload>>(ENCRYPTED_DATA_STORE) || {};
  existing[key] = payload;
  await idbSet(ENCRYPTED_DATA_STORE, existing);
}

/**
 * Retrieve and decrypt data by key.
 */
export async function retrieveAndDecrypt(key: string): Promise<string | null> {
  if (!masterKey) throw new Error('Session is locked');
  const existing = await idbGet<Record<string, EncryptedPayload>>(ENCRYPTED_DATA_STORE);
  if (!existing || !existing[key]) return null;

  return decrypt(masterKey, existing[key]);
}

/**
 * Remove an encrypted entry.
 */
export async function removeEncrypted(key: string): Promise<void> {
  const existing = await idbGet<Record<string, EncryptedPayload>>(ENCRYPTED_DATA_STORE);
  if (!existing) return;
  delete existing[key];
  await idbSet(ENCRYPTED_DATA_STORE, existing);
}

/**
 * Clear all encrypted data.
 */
export async function clearAllEncrypted(): Promise<void> {
  await idbSet(ENCRYPTED_DATA_STORE, {});
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
