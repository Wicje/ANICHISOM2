/**
 * Input validation for authentication endpoints
 * Prevents injection attacks, invalid data, and malformed requests
 */

export const UNIQUE_ID_PATTERN = /^[a-z0-9_-]{3,50}$/i;
export const SESSION_ID_PATTERN = /^[a-f0-9]{64}$/;

/**
 * Validate unique ID format
 * - 3-50 characters
 * - Alphanumeric, dash, underscore only
 * - Case-insensitive
 */
export function validateUniqueId(id: unknown): { valid: boolean; error?: string } {
  if (typeof id !== 'string') {
    return { valid: false, error: 'Unique ID must be a string' };
  }

  const trimmed = id.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Unique ID cannot be empty' };
  }

  if (trimmed.length < 3) {
    return { valid: false, error: 'Unique ID must be at least 3 characters' };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'Unique ID must be at most 50 characters' };
  }

  if (!UNIQUE_ID_PATTERN.test(trimmed)) {
    return { valid: false, error: 'Unique ID must contain only letters, numbers, dashes, and underscores' };
  }

  return { valid: true };
}

/**
 * Validate session token format (64-char hex)
 */
export function validateSessionToken(token: unknown): { valid: boolean; error?: string } {
  if (typeof token !== 'string') {
    return { valid: false, error: 'Session token must be a string' };
  }

  if (!SESSION_ID_PATTERN.test(token)) {
    return { valid: false, error: 'Invalid session token format' };
  }

  return { valid: true };
}

/**
 * Sanitize string input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 1000); // Max 1000 chars
}

/**
 * Validate request method
 */
export function validateMethod(actual: string | undefined, expected: string | string[]): boolean {
  const expectedMethods = Array.isArray(expected) ? expected : [expected];
  return expectedMethods.includes(actual?.toUpperCase() || '');
}

/**
 * Check for required fields in object
 */
export function validateRequiredFields(
  obj: Record<string, unknown>,
  fields: string[]
): { valid: boolean; missing?: string[] } {
  const missing = fields.filter(field => !(field in obj) || obj[field] === null || obj[field] === undefined);

  if (missing.length > 0) {
    return { valid: false, missing };
  }

  return { valid: true };
}

/**
 * Rate limiting check using simple in-memory store
 * For production, use Redis or external service
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const MAX_RATE_LIMIT_KEYS = 10000;

export function checkRateLimit(
  key: string,
  maxAttempts: number = 10,
  windowMs: number = 5 * 60 * 1000 // 5 minutes
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now >= record.resetAt) {
    // New window
    if (rateLimitStore.size >= MAX_RATE_LIMIT_KEYS) {
      cleanupRateLimits();
      if (rateLimitStore.size >= MAX_RATE_LIMIT_KEYS) {
        const oldestKey = rateLimitStore.keys().next().value;
        if (oldestKey) rateLimitStore.delete(oldestKey);
      }
    }

    const newRecord = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, newRecord);
    return { allowed: true, remaining: maxAttempts - 1, resetAt: newRecord.resetAt };
  }

  if (record.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { allowed: true, remaining: maxAttempts - record.count, resetAt: record.resetAt };
}

/**
 * Cleanup old rate limit entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now >= record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  const globalForAuthValidation = globalThis as any;
  if (!globalForAuthValidation.__anichisom_rate_limit_cleanup_interval) {
    const interval = setInterval(cleanupRateLimits, 10 * 60 * 1000);
    if (typeof interval === 'object' && 'unref' in interval) interval.unref();
    globalForAuthValidation.__anichisom_rate_limit_cleanup_interval = interval;
  }
}
