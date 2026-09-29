/**
 * Search keywords (medium) — `d cats`, `w Electron`, `gh issues`.
 *
 * Pure logic, unit-tested (no Electron). A keyword is a short prefix typed in
 * the omnibox that routes the query to a specific engine instead of the
 * default. Builtins cover the default engines; user keywords (stored in
 * config.search_keywords) can point at any http(s) URL template with {q}.
 */

const BUILTIN_KEYWORDS = {
  g: "google",
  d: "duckduckgo",
  ddg: "duckduckgo",
  b: "bing",
  br: "brave",
  brave: "brave",
};

/** Engine search URL shared with the host's searchUrlForMain. */
function engineSearchUrl(engine, query, customs) {
  const q = encodeURIComponent(String(query || "").trim());
  try {
    const c = (customs || []).find((e) => e && e.id === engine);
    if (c && typeof c.url === "string" && c.url.includes("{q}")) {
      const u = new URL(c.url.replace("{q}", q));
      if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
    }
  } catch { /* fall through */ }
  if (engine === "duckduckgo") return `https://duckduckgo.com/?q=${q}`;
  if (engine === "bing") return `https://www.bing.com/search?q=${q}`;
  if (engine === "brave") return `https://search.brave.com/search?q=${q}`;
  return `https://www.google.com/search?q=${q}`;
}

/** Validate a user keyword row {key, name?, url|engine}. */
function sanitizeKeyword(row) {
  if (!row || typeof row !== "object") return null;
  const key = String(row.key || "").trim().toLowerCase();
  if (!/^[a-z0-9]{1,12}$/.test(key)) return null;
  if (BUILTIN_KEYWORDS[key]) return null; // builtins win, never shadowed
  let target = null;
  if (typeof row.url === "string" && row.url.includes("{q}")) {
    try {
      const u = new URL(row.url.replace("{q}", "test"));
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
      target = { url: row.url };
    } catch { return null; }
  } else if (typeof row.engine === "string" && row.engine) {
    target = { engine: row.engine.slice(0, 40) };
  } else {
    return null;
  }
  return { key, name: String(row.name || key).slice(0, 24) || key, ...target };
}

/** Validate a keyword registry (array). Later dupes lose. */
function sanitizeKeywords(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set(Object.keys(BUILTIN_KEYWORDS));
  for (const row of list) {
    const k = sanitizeKeyword(row);
    if (!k || seen.has(k.key)) continue;
    seen.add(k.key);
    out.push(k);
    if (out.length >= 50) break;
  }
  return out;
}

/**
 * Parse an omnibox input for `keyword rest`. Returns
 * {key, query} when the first token is a known keyword (builtin or user)
 * with a non-empty rest, else null.
 */
function parseKeywordInput(input, userKeywords) {
  const m = String(input || "").match(/^\s*([A-Za-z0-9]{1,12})\s+(.+?)\s*$/);
  if (!m) return null;
  const key = m[1].toLowerCase();
  const query = m[2].trim();
  if (!query) return null;
  if (BUILTIN_KEYWORDS[key]) return { key, query, engine: BUILTIN_KEYWORDS[key] };
  const user = sanitizeKeywords(userKeywords).find((k) => k.key === key);
  if (user) return { key, query, engine: user.engine || null, url: user.url || null };
  return null;
}

/** Resolve a parsed keyword to a search URL. Returns null when unresolvable. */
function resolveKeyword(parsed, customs) {
  if (!parsed) return null;
  if (parsed.url) {
    try {
      const u = new URL(parsed.url.replace("{q}", encodeURIComponent(parsed.query)));
      if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
    } catch { return null; }
  }
  if (parsed.engine) return engineSearchUrl(parsed.engine, parsed.query, customs);
  return null;
}

module.exports = {
  BUILTIN_KEYWORDS, engineSearchUrl, sanitizeKeyword, sanitizeKeywords,
  parseKeywordInput, resolveKeyword,
};
