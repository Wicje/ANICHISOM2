/**
 * Cookies UI helpers (medium) — pure logic, unit-tested (no Electron).
 *
 * Electron's session.cookies API does the real work in main.js; this module
 * owns the pure parts: origin parsing, cookie-row shaping for the chrome,
 * and removal-plan building (which scheme+domain pairs to clear for a host,
 * including dot-domain and subdomain cookies).
 */

/** Canonical http(s) origin or null. */
function originOf(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.origin : null;
  } catch {
    return null;
  }
}

/** Hostname for an origin (bare, no www). */
function hostOfOrigin(origin) {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** Shape raw Electron cookies into chrome rows (sorted by domain). */
function publicRows(cookies) {
  const rows = (Array.isArray(cookies) ? cookies : [])
    .filter((c) => c && typeof c.name === "string" && typeof c.domain === "string")
    .map((c) => ({
      name: c.name,
      value: String(c.value ?? "").slice(0, 200),
      domain: c.domain,
      path: c.path || "/",
      secure: !!c.secure,
      httpOnly: !!c.httpOnly,
      session: !!c.session,
      expirationDate: typeof c.expirationDate === "number" ? c.expirationDate : null,
    }));
  rows.sort((a, b) => a.domain.localeCompare(b.domain) || a.name.localeCompare(b.name));
  return rows;
}

/**
 * Does a cookie domain cover a host? (exact or parent dot-domain, per
 * RFC 6265: cookie domain "example.com" serves "sub.example.com").
 */
function domainCovers(cookieDomain, host) {
  const dom = String(cookieDomain || "").replace(/^\./, "").toLowerCase();
  const h = String(host || "").toLowerCase();
  if (!dom || !h) return false;
  return h === dom || h.endsWith(`.${dom}`);
}

/**
 * Build removal targets for one origin: [{url, name}] using the origin's
 * scheme (cookies must be removed with a matching scheme URL).
 */
function removalPlan(origin, cookies) {
  const host = hostOfOrigin(origin);
  if (!host) return [];
  const scheme = String(origin).startsWith("https:") ? "https" : "http";
  const out = [];
  for (const c of Array.isArray(cookies) ? cookies : []) {
    if (!c || typeof c.name !== "string") continue;
    if (!domainCovers(c.domain, host)) continue;
    const dom = String(c.domain).replace(/^\./, "");
    out.push({ url: `${scheme}://${dom}${c.path || "/"}`, name: c.name });
  }
  return out;
}

module.exports = { originOf, hostOfOrigin, publicRows, domainCovers, removalPlan };
