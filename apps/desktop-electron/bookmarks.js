/**
 * Bookmark manager helpers (medium) — pure logic, unit-tested.
 *
 * The store keeps bookmarks as [{label, url, added_at}]. This module adds
 * the manager operations the chrome needs: ranked search, rename, and
 * duplicate-safe import merging.
 */

/** Ranked substring search (title matches first, then URL, then host). */
function searchBookmarks(bookmarks, query, limit = 50) {
  const list = Array.isArray(bookmarks) ? bookmarks : [];
  const q = String(query || "").trim().toLowerCase();
  if (!q) return list.slice(0, limit);
  const scored = [];
  for (const b of list) {
    if (!b || typeof b.url !== "string") continue;
    const t = String(b.label || "").toLowerCase();
    const u = b.url.toLowerCase();
    let s = -1;
    if (t.includes(q)) s = 100 - Math.min(99, t.indexOf(q));
    else if (u.includes(q)) s = 50 - Math.min(49, u.indexOf(q));
    else {
      try { if (new URL(b.url).hostname.toLowerCase().includes(q)) s = 60; } catch { /* no */ }
    }
    if (s >= 0) scored.push({ b, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((r) => r.b);
}

/** Rename a bookmark (pure: returns {bookmarks, renamed} or {bookmarks, error}). */
function renameBookmark(bookmarks, url, title) {
  const list = Array.isArray(bookmarks) ? bookmarks.map((b) => ({ ...b })) : [];
  const b = list.find((x) => x.url === url);
  if (!b) return { bookmarks: list, error: "not-found" };
  const t = String(title || "").trim().slice(0, 200);
  if (!t) return { bookmarks: list, error: "bad-title" };
  b.label = t;
  return { bookmarks: list, renamed: b };
}

/**
 * Merge imported bookmarks (pure): dedupes by URL, caps at 2000, returns
 * {bookmarks, added}.
 */
function mergeImported(bookmarks, imported, cap = 2000) {
  const list = Array.isArray(bookmarks) ? bookmarks.slice() : [];
  const have = new Set(list.map((b) => b && b.url));
  let added = 0;
  for (const b of Array.isArray(imported) ? imported : []) {
    if (!b || typeof b.url !== "string" || !/^https?:\/\//i.test(b.url)) continue;
    if (have.has(b.url)) continue;
    have.add(b.url);
    list.push({ label: String(b.title || b.label || b.url).slice(0, 200), url: b.url, added_at: Date.now() });
    added++;
    if (list.length >= cap) break;
  }
  return { bookmarks: list, added };
}

module.exports = { searchBookmarks, renameBookmark, mergeImported };
