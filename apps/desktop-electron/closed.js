/**
 * Recently-closed ring (medium: "closed-list") — pure logic, unit-tested.
 *
 * The host keeps one ring per profile (max 25, newest first). This module
 * owns the pure operations so the full list (not just "reopen last") can be
 * surfaced in the History panel and palette.
 */

const MAX_CLOSED = 25;

/** Is an entry worth remembering? (real pages only, no interstitials.) */
function keepable(entry) {
  if (!entry || typeof entry !== "object") return false;
  const url = entry.url;
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) return false;
  return true;
}

/** Push an entry to the front (pure: returns a new ring). */
function pushClosed(ring, entry) {
  const list = Array.isArray(ring) ? ring.slice() : [];
  if (!keepable(entry)) return list;
  list.unshift({
    url: entry.url,
    title: typeof entry.title === "string" && entry.title ? entry.title.slice(0, 200) : entry.url,
    container: typeof entry.container === "string" ? entry.container : null,
    at: typeof entry.at === "number" ? entry.at : Date.now(),
  });
  return list.slice(0, MAX_CLOSED);
}

/** Take the newest entry (pure: returns {ring, entry|null}). */
function shiftClosed(ring) {
  const list = Array.isArray(ring) ? ring.slice() : [];
  const entry = list.shift() || null;
  return { ring: list, entry };
}

/** Reopen by index (pure: returns {ring, entry|null}). */
function reopenAt(ring, index) {
  const list = Array.isArray(ring) ? ring.slice() : [];
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= list.length) return { ring: list, entry: null };
  const [entry] = list.splice(i, 1);
  return { ring: list, entry };
}

/** Drop entries from one origin (used by Forget-this-site). */
function dropOrigin(ring, origin) {
  const list = Array.isArray(ring) ? ring.slice() : [];
  if (!origin) return list;
  return list.filter((e) => {
    try { return new URL(e.url).origin !== origin; } catch { return true; }
  });
}

/** Public rows for IPC (no internal labels). */
function publicRows(ring) {
  return (Array.isArray(ring) ? ring : []).slice(0, MAX_CLOSED).map((e, i) => ({
    index: i, url: e.url, title: e.title || e.url, container: e.container || null, at: e.at || 0,
  }));
}

module.exports = { MAX_CLOSED, keepable, pushClosed, shiftClosed, reopenAt, dropOrigin, publicRows };
