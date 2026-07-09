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

function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) return text; // Dev mode: no encryption
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  if (!ENCRYPTION_KEY) return text;
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(parts[1], 'hex', 'utf8');
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
        connected.push(key.split(':')[1]);
      }
    }
    return connected;
  },
};
