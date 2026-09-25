/**
 * E2E-encrypted password sync (H7) — pure logic, unit-tested (no Electron).
 *
 * Model: one random 256-bit sync key per profile. Logins are serialized to a
 * compact JSON array, encrypted with AES-256-GCM (fresh 96-bit IV per push),
 * and the ciphertext rides the normal `/api/context/save` domain record as
 * `data.loginsEnc = {v:1, iv, data}`. The server only ever sees ciphertext
 * (TLS + Supabase RLS still apply underneath). Key exchange is explicit and
 * offline: Settings shows a recovery key (base64) that the user types into
 * the second device — never transmitted automatically.
 *
 * Merge on pull is additive and never destructive: pairs keyed by
 * `origin + "\n" + username`; an incoming pair unknown locally is adopted,
 * a known pair keeps the local ciphertext (both sides hold the same secret,
 * so either copy decrypts).
 */

const crypto = require("crypto");

const ENVELOPE_V = 1;

/** Generate a fresh 32-byte sync key, base64-encoded for display/import. */
function generateSyncKey() {
  return crypto.randomBytes(32).toString("base64");
}

/** Is this a plausible base64 32-byte sync key? */
function validSyncKey(key) {
  if (typeof key !== "string" || !key) return false;
  try {
    const buf = Buffer.from(key.trim(), "base64");
    return buf.length === 32;
  } catch {
    return false;
  }
}

/** Canonical pair key for merge/dedupe. */
function pairKey(origin, username) {
  return `${origin || ""}\n${username || ""}`;
}

/**
 * Serialize logins to the plaintext rows the envelope carries.
 * Accepts sealed rows ({origin, username, password}) — the caller decrypts
 * via safeStorage first; this module never touches the OS keyring.
 */
function toPlainRows(logins) {
  const rows = [];
  const seen = new Set();
  for (const l of Array.isArray(logins) ? logins : []) {
    if (!l || typeof l.origin !== "string" || typeof l.username !== "string" || typeof l.password !== "string") continue;
    if (!/^https?:\/\//.test(l.origin)) continue;
    const k = pairKey(l.origin, l.username);
    if (seen.has(k)) continue;
    seen.add(k);
    rows.push({ origin: l.origin, username: l.username.slice(0, 320), password: l.password.slice(0, 1024) });
    if (rows.length >= 500) break;
  }
  return rows;
}

/**
 * Encrypt rows under a base64 sync key. Returns {v, iv, data} (all base64
 * except v) or {error}.
 */
function encryptLogins(keyB64, rows) {
  if (!validSyncKey(keyB64)) return { error: "bad-key" };
  try {
    const key = Buffer.from(String(keyB64).trim(), "base64");
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const plain = JSON.stringify(Array.isArray(rows) ? rows : []);
    const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { v: ENVELOPE_V, iv: iv.toString("base64"), data: Buffer.concat([enc, tag]).toString("base64") };
  } catch {
    return { error: "encrypt-failed" };
  }
}

/**
 * Decrypt an envelope under a base64 sync key. Returns {rows} or {error}.
 * Wrong key / tampered data fails closed (GCM auth).
 */
function decryptLogins(keyB64, env) {
  if (!validSyncKey(keyB64)) return { error: "bad-key" };
  if (!env || typeof env !== "object" || env.v !== ENVELOPE_V || typeof env.iv !== "string" || typeof env.data !== "string") {
    return { error: "bad-envelope" };
  }
  try {
    const key = Buffer.from(String(keyB64).trim(), "base64");
    const iv = Buffer.from(env.iv, "base64");
    const blob = Buffer.from(env.data, "base64");
    if (iv.length !== 12 || blob.length < 17) return { error: "bad-envelope" };
    const tag = blob.subarray(blob.length - 16);
    const enc = blob.subarray(0, blob.length - 16);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
    const rows = JSON.parse(plain);
    if (!Array.isArray(rows)) return { error: "bad-envelope" };
    return { rows: toPlainRows(rows.map((r) => ({ origin: r?.origin, username: r?.username, password: r?.password }))) };
  } catch {
    return { error: "decrypt-failed" };
  }
}

/**
 * Merge incoming decrypted rows into local sealed-login descriptors.
 * Local rows: [{origin, username}] (no secrets here). Returns the subset of
 * incoming rows to adopt (unknown pairs only) — the caller seals them with
 * safeStorage. Never destructive: nothing local is removed or overwritten.
 */
function mergeIncomingLogins(localLogins, incomingRows) {
  const have = new Set((Array.isArray(localLogins) ? localLogins : []).map((l) => pairKey(l?.origin, l?.username)));
  const adopt = [];
  for (const r of Array.isArray(incomingRows) ? incomingRows : []) {
    if (!r || typeof r.origin !== "string" || typeof r.username !== "string" || typeof r.password !== "string") continue;
    const k = pairKey(r.origin, r.username);
    if (have.has(k)) continue;
    have.add(k);
    adopt.push(r);
    if (adopt.length >= 500) break;
  }
  return adopt;
}

module.exports = {
  ENVELOPE_V, generateSyncKey, validSyncKey, pairKey,
  toPlainRows, encryptLogins, decryptLogins, mergeIncomingLogins,
};
