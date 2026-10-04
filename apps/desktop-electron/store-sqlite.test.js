const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createStore } = require("./store-sqlite");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "continua-store-"));
// Resolving the module is not the same as being able to open a database: a
// present-but-unloadable native binding must not be mistaken for availability.
const sqliteAvailable = (() => {
  try {
    const D = require("better-sqlite3");
    const probe = new D(":memory:");
    probe.close();
    return true;
  } catch {
    return false;
  }
})();

const TABS = [
  { label: "tab-1", url: "https://a.test/", title: "A", pinned: false, container: "ctr-work", scrollY: 120, zoom: 90 },
  { label: "tab-2", url: "https://b.test/", title: "B", pinned: true, container: null, scrollY: 0, zoom: 100 },
];

test("the tabs table carries a container column and a migration for it", () => {
  // Guards the exact regression: `container` was passed to saveSession but never
  // persisted, so every container tab silently reopened in the default
  // partition after a restart. better-sqlite3 is an optionalDependency, so this
  // source-level assertion is the check that always runs.
  const src = fs.readFileSync(path.join(__dirname, "store-sqlite.js"), "utf8");
  assert.match(src, /ALTER TABLE tabs ADD COLUMN container TEXT/);
  assert.match(src, /INSERT INTO tabs\([^)]*container/);
  assert.match(src, /SELECT label,url,title,pinned,grp,hist,scrolly,zoom,container FROM tabs/);
});

test("container survives a saveSession/loadSession round trip", (t) => {
  if (!sqliteAvailable) return t.skip("better-sqlite3 not installed — covered by the source guard above");
  const dir = tmp();
  const store = createStore(dir, "personal");
  store.saveSession(TABS, "tab-1");
  const back = store.loadSession();
  assert.equal(back.length, 2);
  assert.equal(back[0].container, "ctr-work", "a container tab must come back in its container");
  assert.equal(back[1].container, null, "an uncontained tab must stay on the profile default");
  assert.equal(back[0].scrollY, 120);
  assert.equal(back[0].zoom, 90);
  assert.equal(back[1].pinned, true);
});

test("reopening the store keeps containers across a process restart", (t) => {
  if (!sqliteAvailable) return t.skip("better-sqlite3 not installed");
  const dir = tmp();
  createStore(dir, "personal").saveSession(TABS, "tab-1");
  const again = createStore(dir, "personal");
  const back = again.loadSession();
  assert.equal(back[0].container, "ctr-work");
});

test("profiles keep separate container assignments", (t) => {
  if (!sqliteAvailable) return t.skip("better-sqlite3 not installed");
  const dir = tmp();
  createStore(dir, "personal").saveSession([TABS[0]], "tab-1");
  createStore(dir, "work").saveSession([{ ...TABS[0], container: "ctr-work-2" }], "tab-1");
  assert.equal(createStore(dir, "personal").loadSession()[0].container, "ctr-work");
  assert.equal(createStore(dir, "work").loadSession()[0].container, "ctr-work-2");
});

test("the JSON fallback keeps containers too", () => {
  const dir = tmp();
  const store = createStore(dir, "personal"); // no usable better-sqlite3 in the test env
  if (store.backend !== "json-fallback") return; // sqlite path is covered above
  store.saveSession(TABS, "tab-1");
  const back = store.loadSession();
  assert.equal(back[0].container, "ctr-work");
  assert.equal(back[1].container, null);
});

test("an unloadable better-sqlite3 falls back instead of throwing", () => {
  const dir = tmp();
  const store = createStore(dir, "personal");
  // Whatever the backend, create() must return a usable store. Before this was
  // fixed, a present-but-unloadable native binding took the browser down at boot.
  assert.ok(["sqlite-fts5", "json-fallback"].includes(store.backend), `unexpected backend ${store.backend}`);
  store.saveSession([TABS[0]], "tab-1");
  assert.equal(store.loadSession()[0].container, "ctr-work");
});

test("a save with no container field does not invent one", (t) => {
  if (!sqliteAvailable) return t.skip("better-sqlite3 not installed");
  const dir = tmp();
  const store = createStore(dir, "personal");
  store.saveSession([{ label: "tab-x", url: "https://c.test/", title: "C" }], "tab-x");
  assert.equal(store.loadSession()[0].container, null);
});
