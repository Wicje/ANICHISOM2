/**
 * Login helpers — pure logic, unit-tested (no Electron imports).
 *
 * Shapes the save-password flow: validating submit-time candidates captured
 * in content views, and looking them up against the sealed login list.
 * Ciphertext is opaque here (compared/decrypted only by the main process
 * via safeStorage) — plain-text secrets never leave the caller's memory.
 */

const MAX_USERNAME_LEN = 320;
const MAX_PASSWORD_LEN = 1024;

/** Canonical http(s) origin for a URL, or null for anything else. */
function normalizeOrigin(u) {
  try {
    const x = new URL(u);
    if (x.protocol !== "http:" && x.protocol !== "https:") return null;
    return x.origin;
  } catch {
    return null;
  }
}

/**
 * Is a captured submit-time candidate worth prompting for?
 * Rejects honeypot-shaped junk (empty values, absurd lengths) so background
 * forms can't spam save prompts.
 */
function validCandidate(c) {
  if (!c || typeof c !== "object") return false;
  const { origin, username, password } = c;
  if (typeof origin !== "string" || !origin) return false;
  try {
    const x = new URL(origin);
    if (x.protocol !== "http:" && x.protocol !== "https:") return false;
    if (x.origin !== origin) return false; // must already be canonical
  } catch {
    return false;
  }
  if (typeof username !== "string" || typeof password !== "string") return false;
  if (!username.trim() || !password) return false;
  if (username.length > MAX_USERNAME_LEN || password.length > MAX_PASSWORD_LEN) return false;
  return true;
}

/** Saved logins for an origin (exact origin match — never across origins). */
function forOrigin(logins, origin) {
  if (!Array.isArray(logins) || !origin) return [];
  return logins.filter((l) => l && l.origin === origin);
}

/** Saved login for an exact origin + username pair, or null. */
function findUserLogin(logins, origin, username) {
  if (!origin || !username) return null;
  return forOrigin(logins, origin).find((l) => l.username === username) || null;
}

module.exports = { normalizeOrigin, validCandidate, forOrigin, findUserLogin };
