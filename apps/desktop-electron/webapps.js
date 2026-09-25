/**
 * Installed web apps (medium: "app install") — sites pinned as standalone
 * windows (Gmail, Calendar, Linear…).
 *
 * Pure logic, unit-tested (no Electron). The registry lives in
 * config.installed_apps (per profile); the host opens entries in app windows
 * (own BrowserWindow, profile partition, no tab chrome).
 */

const MAX_APPS = 50;

/** Canonical http(s) origin or null. */
function originOf(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.origin : null;
  } catch {
    return null;
  }
}

/** Keep only sane icon URLs (site-declared https art for the home screen). */
function cleanIcon(icon) {
  const s = String(icon || "").trim().slice(0, 2000);
  return /^https?:\/\/[^\s]+$/i.test(s) ? s : null;
}

/**
 * Pick the best icon href from a page's HTML (pure regex — no DOM).
 * Preference: apple-touch-icon → largest sizes= icon → first icon link,
 * resolved absolute against the page URL. Returns null when nothing usable.
 */
function pickIconHref(html, pageUrl) {
  const src = String(html || "").slice(0, 262144);
  let base = null;
  try { base = new URL(pageUrl); } catch { return null; }
  if (base.protocol !== "http:" && base.protocol !== "https:") return null;
  const links = [...src.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).slice(0, 40);
  const cands = [];
  for (const tag of links) {
    const rel = (/rel\s*=\s*["']?([^"'\s>]+)/i.exec(tag) || [])[1] || "";
    if (!/^(apple-touch-icon|icon|shortcut icon)$/i.test(rel.trim()) && !/icon/i.test(rel)) continue;
    const href = (/href\s*=\s*["']([^"']+)/i.exec(tag) || [])[1];
    if (!href || /^data:/i.test(href)) continue;
    let abs = null;
    try {
      const u = new URL(href, base);
      if (u.protocol === "http:" || u.protocol === "https:") abs = u.toString().slice(0, 2000);
    } catch { /* relative junk */ }
    if (!abs) continue;
    const sizes = (/sizes\s*=\s*["']?(\d+)x\d+/i.exec(tag) || [])[1];
    cands.push({ href: abs, touch: /apple-touch-icon/i.test(rel), size: sizes ? parseInt(sizes, 10) : 0 });
  }
  if (!cands.length) return null;
  cands.sort((a, b) => ((b.touch ? 1 : 0) - (a.touch ? 1 : 0)) || (b.size - a.size));
  return cands[0].href;
}

/** Last-resort icon guess: the origin's favicon.ico (rendered with fallback). */
function faviconFallback(pageUrl) {
  const o = originOf(pageUrl);
  return o ? `${o}/favicon.ico` : null;
}

/** Display name for an app (explicit name, else hostname). */
function displayName(url, name) {
  const n = String(name || "").trim().slice(0, 40);
  if (n) return n;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return String(url || "").slice(0, 40) || "App";
  }
}

/** Validate a registry (from config). */
function sanitizeApps(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (const a of list) {
    if (!a || typeof a !== "object") continue;
    const url = typeof a.url === "string" ? a.url : "";
    if (!/^https?:\/\//i.test(url)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({
      id: typeof a.id === "string" && a.id ? a.id.slice(0, 64) : `app-${out.length}`,
      url,
      name: displayName(url, a.name),
      icon: cleanIcon(a.icon),
      addedAt: typeof a.addedAt === "number" ? a.addedAt : 0,
    });
    if (out.length >= MAX_APPS) break;
  }
  return out;
}

/** Install (upsert) an app. Returns {apps, app} or {apps, error}. */
function installApp(registry, url, name, rand, icon) {
  const list = sanitizeApps(registry);
  if (!/^https?:\/\//i.test(String(url || ""))) return { apps: list, error: "bad-url" };
  const clean = String(url).trim();
  const suffix = typeof rand === "string" && rand ? rand.slice(0, 8) : require("crypto").randomBytes(4).toString("hex");
  const art = cleanIcon(icon) || faviconFallback(clean);
  const existing = list.find((a) => a.url === clean);
  if (existing) {
    if (name) existing.name = displayName(clean, name);
    if (art && !existing.icon) existing.icon = art;
    return { apps: list, app: existing };
  }
  if (list.length >= MAX_APPS) return { apps: list, error: "limit" };
  const app = { id: `app-${suffix}`, url: clean, name: displayName(clean, name), icon: art, addedAt: Date.now() };
  list.unshift(app);
  return { apps: list, app };
}

/** Remove an app by id. Returns {apps, removed:boolean}. */
function removeApp(registry, id) {
  const list = sanitizeApps(registry);
  const next = list.filter((a) => a.id !== id);
  return { apps: next, removed: next.length !== list.length };
}

module.exports = { MAX_APPS, originOf, displayName, cleanIcon, pickIconHref, faviconFallback, sanitizeApps, installApp, removeApp };
