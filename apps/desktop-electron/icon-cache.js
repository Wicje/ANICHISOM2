/**
 * icon-cache.js — verified app-icon fetching + per-profile disk cache.
 *
 * Start-page tiles showed letter glyphs because stored icons were unverified
 * remote URLs (dead favicon.ico guesses, unquoted-href misses). This module
 * verifies a candidate serves image bytes and caches them under the profile's
 * `icons/` dir, so tiles render offline from `file://` URLs.
 *
 * Pure + testable: network and fs go through injected deps; main.js supplies
 * real fetch/fs. Caps: 512 KiB per icon, 8 s timeout, image/* only.
 */

const crypto = require("crypto");

const MAX_ICON_BYTES = 512 * 1024;
const FETCH_TIMEOUT_MS = 8000;

const EXT_BY_TYPE = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

/** Stable cache key: sha1(host + "|" + href), 16 hex chars. */
function cacheKey(pageUrl, href) {
  let host = "";
  try { host = new URL(pageUrl).host.toLowerCase(); } catch { host = "unknown"; }
  return crypto.createHash("sha1").update(`${host}|${String(href || "")}`).digest("hex").slice(0, 16);
}

/** Extension from content-type (preferred) or href suffix. Null when unknown. */
function extFor(contentType, href) {
  const ct = String(contentType || "").split(";")[0].trim().toLowerCase();
  if (EXT_BY_TYPE[ct]) return EXT_BY_TYPE[ct];
  const m = /\.([a-z0-9]{2,4})(?:[?#]|$)/i.exec(String(href || ""));
  if (m && ["png", "jpg", "jpeg", "gif", "webp", "svg", "ico"].includes(m[1].toLowerCase())) {
    return m[1].toLowerCase() === "jpeg" ? "jpg" : m[1].toLowerCase();
  }
  return null;
}

function isImageType(ct) {
  return String(ct || "").split(";")[0].trim().toLowerCase().startsWith("image/");
}

/**
 * Verify a candidate icon URL serves image bytes.
 * Returns {ok, bytes, contentType, ext} or {ok:false, reason}.
 * fetchImpl defaults to global fetch; timeout via AbortController.
 */
async function verifyIconUrl(href, fetchImpl) {
  const fetchFn = fetchImpl || (typeof fetch !== "undefined" ? fetch : null);
  if (!fetchFn) return { ok: false, reason: "no-fetch" };
  if (!/^https?:\/\//i.test(String(href || ""))) return { ok: false, reason: "bad-url" };
  const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => { try { ctl.abort(); } catch {} }, FETCH_TIMEOUT_MS) : null;
  try {
    const res = await fetchFn(href, ctl ? { signal: ctl.signal, headers: { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36" } } : undefined);
    if (!res || !res.ok) return { ok: false, reason: `http-${res ? res.status : "nores"}` };
    const ct = (res.headers && typeof res.headers.get === "function" ? res.headers.get("content-type") : "") || "";
    if (!isImageType(ct)) return { ok: false, reason: "not-image" };
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > MAX_ICON_BYTES) return { ok: false, reason: "bad-size" };
    const ext = extFor(ct, href) || "png";
    return { ok: true, bytes: buf, contentType: ct.split(";")[0].trim(), ext };
  } catch (e) {
    return { ok: false, reason: String(e?.name === "AbortError" ? "timeout" : e?.message || e).slice(0, 80) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Resolve the best verified icon for a page: candidates in order, first that
 * verifies wins. Returns {href, bytes, ext} or null.
 */
async function resolveAppIcon(pageUrl, candidates, fetchImpl) {
  const list = (Array.isArray(candidates) ? candidates : []).filter((u) => /^https?:\/\//i.test(String(u || "")));
  for (const href of list.slice(0, 4)) {
    const v = await verifyIconUrl(href, fetchImpl);
    if (v.ok) return { href: String(href), bytes: v.bytes, ext: v.ext };
  }
  return null;
}

/** Disk filename for a cached icon. */
function cacheFileName(pageUrl, href, ext) {
  return `${cacheKey(pageUrl, href)}.${ext || "png"}`;
}

module.exports = { MAX_ICON_BYTES, FETCH_TIMEOUT_MS, cacheKey, extFor, verifyIconUrl, resolveAppIcon, cacheFileName };
