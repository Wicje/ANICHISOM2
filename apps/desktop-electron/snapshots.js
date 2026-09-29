/**
 * Named session snapshots (medium: "snapshots") — pure logic, unit-tested.
 *
 * The store keeps auto snapshots ({id, saved_at, tabs, active}); this module
 * adds the named layer the chrome's snapshot manager needs: naming,
 * validation, and list shaping. Storage stays in the store (JSON + SQLite
 * both gain name support via the snapshot record itself).
 */

const MAX_SNAPSHOTS = 100;
const MAX_NAME_LEN = 60;

/** Clean a snapshot name (trimmed, capped, never empty). */
function cleanName(name, fallback = "Snapshot") {
  return String(name || "").trim().slice(0, MAX_NAME_LEN) || fallback;
}

/** Shape store snapshots into chrome rows (newest first, with names). */
function publicRows(snapshots) {
  const list = Array.isArray(snapshots) ? snapshots.slice() : [];
  list.sort((a, b) => (b.saved_at || 0) - (a.saved_at || 0));
  return list.slice(0, MAX_SNAPSHOTS).map((s) => ({
    id: s.id,
    name: typeof s.name === "string" && s.name ? s.name.slice(0, MAX_NAME_LEN) : null,
    saved_at: s.saved_at || 0,
    tabs: Array.isArray(s.tabs) ? s.tabs : [],
  }));
}

/** Validate tabs for a snapshot (web URLs only, capped). */
function cleanTabs(tabs, cap = 200) {
  const out = [];
  for (const t of Array.isArray(tabs) ? tabs : []) {
    if (!t || typeof t.url !== "string") continue;
    if (!/^https?:\/\//i.test(t.url) && t.url !== "continua://start") continue;
    out.push({
      url: t.url.slice(0, 2000),
      title: String(t.title || t.url).slice(0, 200),
      container: typeof t.container === "string" ? t.container : null,
      history: Array.isArray(t.history) ? t.history.filter((u) => typeof u === "string").slice(-30) : undefined,
      histIdx: typeof t.histIdx === "number" ? t.histIdx : undefined,
      scrollY: typeof t.scrollY === "number" ? t.scrollY : 0,
      zoom: typeof t.zoom === "number" ? t.zoom : 100,
    });
    if (out.length >= cap) break;
  }
  return out;
}

/**
 * Build a named snapshot record (pure). `tabs` are already cleaned by the
 * caller via cleanTabs; this stamps id/name/time.
 */
function buildSnapshot(tabs, active, name, stamp) {
  const at = typeof stamp === "number" ? stamp : Date.now();
  return {
    id: `snap-${at}`,
    name: cleanName(name, new Date(at).toLocaleString()),
    saved_at: at,
    tabs: Array.isArray(tabs) ? tabs : [],
    active: active || null,
  };
}

module.exports = { MAX_SNAPSHOTS, MAX_NAME_LEN, cleanName, publicRows, cleanTabs, buildSnapshot };
