const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const profiles = require("./profiles");

const fresh = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ct-prof-"));
  return { dir, state: profiles.loadProfiles(dir) };
};

test("seeds Personal + Work with theme ids", () => {
  const { state } = fresh();
  assert.equal(state.activeId, "personal");
  const ids = Object.fromEntries(state.profiles.map((p) => [p.id, p.themeId]));
  assert.equal(ids.personal, "midnight");
  assert.equal(ids.work, "forest");
});

test("partitions isolate profiles", () => {
  assert.equal(profiles.partitionFor("work"), "persist:continua-profile-work");
  assert.notEqual(profiles.partitionFor("work"), profiles.partitionFor("personal"));
});

test("setProfileTheme persists and sanitizes", () => {
  const { dir, state } = fresh();
  const p = profiles.setProfileTheme(dir, state, "work", "ocean");
  assert.equal(p.themeId, "ocean");
  const reloaded = profiles.loadProfiles(dir);
  assert.equal(reloaded.profiles.find((x) => x.id === "work").themeId, "ocean");
  assert.equal(profiles.setProfileTheme(dir, state, "nope", "ocean"), null);
});

test("deleteProfile keeps store consistent", () => {
  const { state } = fresh();
  const r = profiles.deleteProfile("d", state, "work");
  assert.equal(r.ok, true);
  assert.equal(state.activeId, "personal");
  assert.deepEqual(profiles.deleteProfile("d", state, "personal"), { error: "last-profile" });
  // Deleting the active profile falls back to the first remaining one.
  const s2 = fresh().state;
  profiles.deleteProfile("d", s2, "personal");
  assert.equal(s2.activeId, "work");
});
