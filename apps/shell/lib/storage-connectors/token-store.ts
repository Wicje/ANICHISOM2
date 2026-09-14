/**
 * OAuth Token Store — stores encrypted OAuth tokens per user per provider
 *
 * In-memory for development; database-backed for production.
 * Tokens are NEVER sent to the client — server-side only for privacy.
 */

import crypto from 'crypto';

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
  accountName?: string;
  encrypted: boolean;
}

// In-memory store (dev) — keyed by `${userId}:${providerId}`
const tokenStore = new Map<string, TokenData>();

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || '';
const TOKEN_TTL_MS = 3600 * 1000; // 1 hour default access token TTL

// Refuse to start in production if key is missing or invalid (Issue 91, 92)
if (process.env.NODE_ENV === 'production') {
  if (!ENCRYPTION_KEY) {
    throw new Error('[SECURITY FATAL] TOKEN_ENCRYPTION_KEY must be configured in production environment');
  }
  const keyBytes = Buffer.from(ENCRYPTION_KEY, 'hex');
  if (keyBytes.length !== 32) {
    throw new Error(`[SECURITY FATAL] TOKEN_ENCRYPTION_KEY must be a 32-byte hex string (64 hex characters), got ${keyBytes.length} bytes`);
  }
}

function getValidatedKey(): Buffer | null {
  if (!ENCRYPTION_KEY) return null;
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  if (key.length !== 32) {
    console.error(`[SECURITY] Invalid ENCRYPTION_KEY length: expected 32 bytes, got ${key.length} bytes`);
    return null;
  }
  return key;
}

function encrypt(text: string): string {
  const key = getValidatedKey();
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[SECURITY] Refusing plaintext token storage in production mode');
    }
    return text; // Dev mode fallback only
  }
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const key = getValidatedKey();
  if (!key) return text;
  const parts = text.split(':');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return text;
  const iv = Buffer.from(parts[0], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(parts[1]!, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export const TokenStore = {
  store(userId: string, providerId: string, data: {
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
    scope: string;
    accountName?: string;
  }): void {
    const expiresAt = Date.now() + (data.expiresIn || 3600) * 1000;
    const encryptedAccess = encrypt(data.accessToken);
    const encryptedRefresh = encrypt(data.refreshToken);

    tokenStore.set(`${userId}:${providerId}`, {
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt,
      scope: data.scope,
      accountName: data.accountName,
      encrypted: !!ENCRYPTION_KEY,
    });
  },

  getAccessToken(userId: string, providerId: string): string | null {
    const entry = tokenStore.get(`${userId}:${providerId}`);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) return null; // Token expired
    return decrypt(entry.accessToken);
  },

  getRefreshToken(userId: string, providerId: string): string | null {
    const entry = tokenStore.get(`${userId}:${providerId}`);
    if (!entry) return null;
    return decrypt(entry.refreshToken);
  },

  getAccountName(userId: string, providerId: string): string | null {
    const entry = tokenStore.get(`${userId}:${providerId}`);
    return entry?.accountName || null;
  },

  isTokenExpired(userId: string, providerId: string): boolean {
    const entry = tokenStore.get(`${userId}:${providerId}`);
    if (!entry) return true;
    return entry.expiresAt < Date.now();
  },

  updateAccessToken(userId: string, providerId: string, accessToken: string, expiresIn?: number): void {
    const entry = tokenStore.get(`${userId}:${providerId}`);
    if (!entry) return;
    entry.accessToken = encrypt(accessToken);
    entry.expiresAt = Date.now() + (expiresIn || 3600) * 1000;
    tokenStore.set(`${userId}:${providerId}`, entry);
  },

  remove(userId: string, providerId: string): void {
    tokenStore.delete(`${userId}:${providerId}`);
  },

  has(userId: string, providerId: string): boolean {
    return tokenStore.has(`${userId}:${providerId}`);
  },

  /** List all connected providers for a user */
  listConnected(userId: string): string[] {
    const connected: string[] = [];
    for (const key of tokenStore.keys()) {
      if (key.startsWith(`${userId}:`)) {
        connected.push(key.split(':')[1]!);
      }
    }
    return connected;
  },
};

// ── OAuth state CSRF protection ──────────────────────────────────────────

const oauthStateStore = new Map<string, { userId: string; providerId: string; createdAt: number }>();
const OAUTH_STATE_TTL = 10 * 60 * 1000; // 10 minutes

export function storeOAuthState(state: string, userId: string, providerId: string): void {
  const now = Date.now();
  for (const [key, val] of oauthStateStore.entries()) {
    if (now - val.createdAt > OAUTH_STATE_TTL) oauthStateStore.delete(key);
  }
  oauthStateStore.set(state, { userId, providerId, createdAt: now });
}

export function validateOAuthState(state: string): { userId: string; providerId: string } | null {
  const entry = oauthStateStore.get(state);
  if (!entry) return null;
  oauthStateStore.delete(state); // One-time use
  if (Date.now() - entry.createdAt > OAUTH_STATE_TTL) return null;
  return { userId: entry.userId, providerId: entry.providerId };
}
