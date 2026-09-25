/**
 * Container tabs (H6) — Firefox-style contextual identities, lighter than profiles.
 *
 * Pure logic, unit-tested (no Electron imports). Each container owns one
 * persistent Electron partition (`partitionFor`), so cookies / storage /
 * service workers never cross identities in one window. The registry lives in
 * config.containers (per profile); tabs carry `container` (container id).
 */

const CONTAINER_COLORS = [
  "#0071e3", "#7c5cff", "#188038", "#e8710a",
  "#d92d20", "#0090a3", "#9059ff", "#12a5af",
];
const MAX_CONTAINERS = 24;
const MAX_NAME_LEN = 32;

/** Sanitize a container id for use in a partition string. */
function sanitizeId(id) {
  return String(id || "").replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "default";
}

/** Persistent Electron partition for a container id. */
function partitionFor(cid) {
  return `persist:continua-container-${sanitizeId(cid)}`;
}

/** Clean a display name (trimmed, capped, never empty). */
function cleanName(name) {
  return (String(name || "").trim().slice(0, MAX_NAME_LEN)) || "Untitled";
}

/** Validate a registry (from config): well-formed entries only. */
function sanitizeRegistry(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (const c of list) {
    if (!c || typeof c !== "object") continue;
    const id = typeof c.id === "string" ? c.id.slice(0, 64) : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name: cleanName(c.name),
      color: typeof c.color === "string" && /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : CONTAINER_COLORS[out.length % CONTAINER_COLORS.length],
    });
    if (out.length >= MAX_CONTAINERS) break;
  }
  return out;
}

/**
 * Create a container in a registry (pure: returns {registry, created}).
 * `rand` injects id bytes for tests (hex string).
 */
function createContainer(registry, name, rand) {
  const list = sanitizeRegistry(registry);
  if (list.length >= MAX_CONTAINERS) return { registry: list, error: "limit" };
  const suffix = typeof rand === "string" && rand ? rand.slice(0, 8) : require("crypto").randomBytes(4).toString("hex");
  const c = { id: `ctr-${suffix}`, name: cleanName(name), color: CONTAINER_COLORS[list.length % CONTAINER_COLORS.length] };
  list.push(c);
  return { registry: list, created: c };
}

/** Rename a container (pure). Returns {registry, renamed} or {registry, error}. */
function renameContainer(registry, id, name) {
  const list = sanitizeRegistry(registry);
  const c = list.find((x) => x.id === id);
  if (!c) return { registry: list, error: "not-found" };
  c.name = cleanName(name);
  return { registry: list, renamed: c };
}

/**
 * Delete a container (pure). Returns {registry, deleted}.
 * Tabs carrying the id must be cleared by the caller (see clearTabsOf).
 */
function deleteContainer(registry, id) {
  const list = sanitizeRegistry(registry).filter((c) => c.id !== id);
  return { registry: list, deleted: id };
}

/** Strip a deleted container id off tab metas (pure, returns count cleared). */
function clearTabsOf(tabMetas, id) {
  let n = 0;
  for (const m of tabMetas || []) {
    if (m && m.container === id) { m.container = null; n++; }
  }
  return n;
}

/** Look up a container by id (null when unknown). */
function findContainer(registry, id) {
  return sanitizeRegistry(registry).find((c) => c.id === id) || null;
}

module.exports = {
  CONTAINER_COLORS, MAX_CONTAINERS,
  sanitizeId, partitionFor, cleanName, sanitizeRegistry,
  createContainer, renameContainer, deleteContainer, clearTabsOf, findContainer,
};
