/**
 * Continua Browser profiles — Chrome-style separation for Work vs Personal.
 *
 * Scope: desktop-electron host only (ADR-008). Each profile gets:
 *   - isolated cookies/cache/DOM-storage via its own Electron partition
 *     (persist:continua-profile-<id>)
 *   - isolated tabs/history/bookmarks/workspaces/groups via a sharded store
 *     (continua-store-<id>.json / continua-<id>.db, `personal` reuses legacy files)
 *   - isolated extensions via <userData>/profiles/<id>/extensions
 *
 * profiles.json shape: { activeId, profiles: [{id,name,color}] }
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PROFILE_COLORS = ["#0071e3", "#7c5cff", "#188038", "#e8710a", "#d92d20", "#0090a3", "#7928ca"];

const sanitizeId = (name) =>
  (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || `profile-${crypto.randomBytes(3).toString("hex")}`;

function profilesFile(userDataPath) {
  return path.join(userDataPath, "profiles.json");
}

function defaultSet() {
  return {
    activeId: "personal",
    profiles: [
      { id: "personal", name: "Personal", color: "#0071e3" },
      { id: "work", name: "Work", color: "#188038" },
    ],
  };
}

function loadProfiles(userDataPath) {
  const file = profilesFile(userDataPath);
  try {
    if (fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, "utf8"));
      if (Array.isArray(raw.profiles) && raw.profiles.length) {
        const profiles = raw.profiles
          .filter((p) => p && p.id)
          .map((p, i) => ({
            id: String(p.id).slice(0, 32),
            name: String(p.name || "Untitled").slice(0, 32),
            color: p.color || PROFILE_COLORS[i % PROFILE_COLORS.length],
          }));
        const activeId = profiles.find((p) => p.id === raw.activeId)?.id || profiles[0].id;
        return { activeId, profiles };
      }
    }
  } catch {}
  // First run: seed Personal (inherits legacy store files) + empty Work.
  const seeded = defaultSet();
  try {
    fs.mkdirSync(userDataPath, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(seeded));
  } catch {}
  return seeded;
}

function saveProfiles(userDataPath, data) {
  try {
    fs.writeFileSync(profilesFile(userDataPath), JSON.stringify(data));
  } catch {}
}

function createProfile(userDataPath, data, name) {
  const clean = (name || "").trim().slice(0, 32) || "Untitled";
  let id = sanitizeId(clean);
  const have = new Set(data.profiles.map((p) => p.id));
  if (have.has(id)) id = `${id}-${crypto.randomBytes(2).toString("hex")}`;
  const p = { id, name: clean, color: PROFILE_COLORS[data.profiles.length % PROFILE_COLORS.length] };
  data.profiles.push(p);
  saveProfiles(userDataPath, data);
  return p;
}

function renameProfile(userDataPath, data, id, name) {
  const p = data.profiles.find((x) => x.id === id);
  if (!p) return null;
  const clean = (name || "").trim().slice(0, 32);
  if (clean) p.name = clean;
  saveProfiles(userDataPath, data);
  return p;
}

function deleteProfile(userDataPath, data, id) {
  if (data.profiles.length <= 1) return { error: "last-profile" };
  const idx = data.profiles.findIndex((x) => x.id === id);
  if (idx < 0) return { error: "not-found" };
  data.profiles.splice(idx, 1);
  if (data.activeId === id) data.activeId = data.profiles[0].id;
  saveProfiles(userDataPath, data);
  // Best-effort wipe of the profile's sharded data (cookies die with the partition on next use).
  for (const f of [`continua-store-${id}.json`, `continua-${id}.db`, `continua-${id}.db-wal`, `continua-${id}.db-shm`]) {
    try { fs.rmSync(path.join(userDataPath, f), { force: true }); } catch {}
  }
  try { fs.rmSync(path.join(userDataPath, "profiles", id), { recursive: true, force: true }); } catch {}
  return { ok: true, activeId: data.activeId };
}

/** `personal` reuses legacy filenames so existing sessions migrate untouched. */
const isLegacy = (id) => id === "personal" || id === "default";
const partitionFor = (id) => `persist:continua-profile-${id}`;
const profileDir = (userDataPath, id) => path.join(userDataPath, "profiles", id);
const storeFileFor = (userDataPath, id) =>
  isLegacy(id) ? path.join(userDataPath, "continua-store.json") : path.join(userDataPath, `continua-store-${id}.json`);
const dbFileFor = (userDataPath, id) =>
  isLegacy(id) ? path.join(userDataPath, "continua.db") : path.join(userDataPath, `continua-${id}.db`);

module.exports = {
  PROFILE_COLORS,
  loadProfiles,
  saveProfiles,
  createProfile,
  renameProfile,
  deleteProfile,
  partitionFor,
  profileDir,
  storeFileFor,
  dbFileFor,
  isLegacy,
};
