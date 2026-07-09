/**
 * Session Store — maps crypto-random session tokens to user data
 *
 * Security (S-06): Session tokens are never userIds.
 * All tokens are crypto-random; the store is the only way to resolve a token to a user.
 *
 * In-memory for development; swap backing store to Redis/PostgreSQL for production.
 */

export interface SessionData {
  userId: string;
  uniqueId: string;
  role: string;
  createdAt: number;
  expiresAt: number;
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (matches cookie maxAge)
const DEV_SESSION_TTL_MS = 24 * 60 * 60 * 1000;   // 24 hours for dev bypass
const MAX_SESSIONS = 5000;

const store = new Map<string, SessionData>();

/**
 * Create a session: store token → user mapping
 */
export function createSession(token: string, userId: string, uniqueId: string, role: string, ttlMs?: number): void {
  const now = Date.now();
  pruneExpiredSessions();

  if (store.size >= MAX_SESSIONS) {
    const oldestToken = store.keys().next().value;
    if (oldestToken) store.delete(oldestToken);
  }

  store.set(token, {
    userId,
    uniqueId,
    role,
    createdAt: now,
    expiresAt: now + (ttlMs ?? SESSION_TTL_MS),
  });
}

/**
 * Create a dev-only master session (shorter TTL)
 */
export function createDevMasterSession(token: string): void {
  createSession(token, 'master-user-id', 'ANICHISOM', 'admin', DEV_SESSION_TTL_MS);
}

/**
 * Resolve a token to session data.
 * Returns null if token not found or expired (expired entries are pruned).
 */
export function resolveSession(token: string): SessionData | null {
  const data = store.get(token);
  if (!data) return null;

  if (Date.now() >= data.expiresAt) {
    store.delete(token);
    return null;
  }

  return data;
}

/**
 * Destroy a session (logout)
 */
export function destroySession(token: string): boolean {
  return store.delete(token);
}

/**
 * Prune all expired sessions
 */
export function pruneExpiredSessions(): number {
  const now = Date.now();
  let pruned = 0;
  for (const [token, data] of store.entries()) {
    if (now >= data.expiresAt) {
      store.delete(token);
      pruned++;
    }
  }
  return pruned;
}

// Auto-prune every 10 minutes
if (typeof setInterval !== 'undefined') {
  const globalForSessionStore = globalThis as any;
  if (!globalForSessionStore.__anichisom_session_prune_interval) {
    const interval = setInterval(pruneExpiredSessions, 10 * 60 * 1000);
    if (typeof interval === 'object' && 'unref' in interval) interval.unref();
    globalForSessionStore.__anichisom_session_prune_interval = interval;
  }
}
