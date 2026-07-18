/**
 * API Key Encryption Service — encrypts API keys before IndexedDB storage.
 *
 * Uses the session encryption key (from session-encryption.service.ts)
 * to encrypt/decrypt AI provider keys, OAuth tokens, etc.
 *
 * Keys are never stored in plaintext in IndexedDB.
 */
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { encryptAndStore, retrieveAndDecrypt, removeEncrypted } from '@/lib/services/session-encryption.service';

const API_KEY_PREFIX = 'apikey:';
const OAUTH_TOKEN_PREFIX = 'oauth:';

// ─── Types ────────────────────────────────────────────────────────────────

export interface StoredApiKey {
  provider: string;
  keyId: string;       // encrypted key reference
  label: string;       // user-friendly name
  createdAt: number;
  lastUsed?: number;
}

// ─── API Key Management ───────────────────────────────────────────────────

/**
 * Store an API key encrypted in IndexedDB.
 */
export async function storeApiKey(
  provider: string,
  key: string,
  label?: string,
): Promise<StoredApiKey> {
  const keyId = `${API_KEY_PREFIX}${provider}_${Date.now()}`;
  await encryptAndStore(keyId, key);

  // Store metadata (unencrypted) for listing
  const meta = await getApiKeyMetadata();
  const entry: StoredApiKey = {
    provider,
    keyId,
    label: label || `${provider} API Key`,
    createdAt: Date.now(),
  };
  meta.push(entry);
  await idbSet('continuaos-api-key-meta', meta);

  return entry;
}

/**
 * Retrieve a decrypted API key.
 */
export async function getApiKey(keyId: string): Promise<string | null> {
  const key = await retrieveAndDecrypt(keyId);
  if (key) {
    // Update lastUsed
    const meta = await getApiKeyMetadata();
    const entry = meta.find((m) => m.keyId === keyId);
    if (entry) {
      entry.lastUsed = Date.now();
      await idbSet('continuaos-api-key-meta', meta);
    }
  }
  return key;
}

/**
 * Get API key metadata (unencrypted) for listing.
 */
export async function getApiKeyMetadata(): Promise<StoredApiKey[]> {
  return (await idbGet<StoredApiKey[]>('continuaos-api-key-meta')) || [];
}

/**
 * Delete an API key.
 */
export async function deleteApiKey(keyId: string): Promise<void> {
  await removeEncrypted(keyId);
  const meta = await getApiKeyMetadata();
  const filtered = meta.filter((m) => m.keyId !== keyId);
  await idbSet('continuaos-api-key-meta', filtered);
}

/**
 * Check if any API key exists for a provider.
 */
export async function hasApiKey(provider: string): Promise<boolean> {
  const meta = await getApiKeyMetadata();
  return meta.some((m) => m.provider === provider);
}

// ─── OAuth Token Management ───────────────────────────────────────────────

/**
 * Store an OAuth token encrypted.
 */
export async function storeOAuthToken(
  provider: string,
  accessToken: string,
  refreshToken?: string,
): Promise<void> {
  const keyId = `${OAUTH_TOKEN_PREFIX}${provider}`;
  const tokenData = JSON.stringify({ accessToken, refreshToken, provider });
  await encryptAndStore(keyId, tokenData);
}

/**
 * Retrieve a decrypted OAuth token.
 */
export async function getOAuthToken(
  provider: string,
): Promise<{ accessToken: string; refreshToken?: string } | null> {
  const keyId = `${OAUTH_TOKEN_PREFIX}${provider}`;
  const raw = await retrieveAndDecrypt(keyId);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Delete an OAuth token.
 */
export async function deleteOAuthToken(provider: string): Promise<void> {
  await removeEncrypted(`${OAUTH_TOKEN_PREFIX}${provider}`);
}

/**
 * Check if an OAuth token exists for a provider.
 */
export async function hasOAuthToken(provider: string): Promise<boolean> {
  const token = await getOAuthToken(provider);
  return token !== null;
}
