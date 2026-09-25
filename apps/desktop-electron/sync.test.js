const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildSavePayload, mergeRemoteTabs, mergeRemoteWorkspaces, mergeTabdrops } = require("./sync");

test("save payload excludes incognito tabs", () => {
  const tabs = new Map([
    ["a", { url: "https://a.com", title: "A", pinned: false }],
    ["p", { url: "https://private.com", title: "P", incognito: true }],
  ]);
  const p = buildSavePayload(tabs, "a", "dev-1", 7);
  assert.equal(p.domain, "browser-profile-personal");
  assert.equal(p.data.profileId, "personal");
  assert.equal(p.version, 7);
  assert.deepEqual(p.data.tabs.map((t) => t.url), ["https://a.com"]);
});

test("merge skips existing urls and malformed records", () => {
  const local = new Map([["a", { url: "https://a.com" }]]);
  const remote = [
    { url: "https://a.com", title: "A dup" },
    { url: "https://b.com", title: "B" },
    { title: "no url" },
    null,
  ];
  assert.deepEqual(mergeRemoteTabs(local, remote), [{ url: "https://b.com", title: "B", group: null, container: null }]);
});

test("merge dedupes within the remote batch", () => {
  const out = mergeRemoteTabs(new Map(), [
    { url: "https://b.com" },
    { url: "https://b.com" },
  ]);
  assert.equal(out.length, 1);
});

test("session persists history, scroll, zoom per tab", () => {
  const { Store } = require("./store");
  const s = new Store(require("os").tmpdir() + "/ct-persist-" + Date.now());
  const tabs = [{ label: "t0", url: "https://a.com/2", title: "A2", pinned: true, group: null,
    history: ["https://a.com/1", "https://a.com/2"], histIdx: 1, scrollY: 420, zoom: 110 }];
  s.saveSession(tabs, "t0");
  const loaded = s.loadSession();
  assert.equal(loaded.length, 1);
  assert.deepEqual(loaded[0].history, ["https://a.com/1", "https://a.com/2"]);
  assert.equal(loaded[0].histIdx, 1);
  assert.equal(loaded[0].scrollY, 420);
  assert.equal(loaded[0].zoom, 110);
});

test("closed ring persists across restarts", () => {
  const fs = require("fs");
  const { Store } = require("./store");
  const dir = require("os").tmpdir() + "/ct-ring-" + Date.now();
  fs.mkdirSync(dir, { recursive: true });
  const s = new Store(dir);
  s.saveSession([], null);
  s.saveClosedRing([{ label: "x", url: "https://gone.com", title: "Gone" }]);
  s.flush();
  const s2 = new Store(dir);
  assert.deepEqual(s2.loadClosedRing(), [{ label: "x", url: "https://gone.com", title: "Gone" }]);
});

test("save payload scopes to the active profile", () => {
  const tabs = new Map([["a", { url: "https://a.com", title: "A" }]]);
  const p = buildSavePayload(tabs, "a", "dev-1", 3, [], [], "work");
  assert.equal(p.domain, "browser-profile-work");
  assert.equal(p.data.profileId, "work");
});

test("save payload carries the theme id when set", () => {
  const tabs = new Map([["a", { url: "https://a.com", title: "A" }]]);
  const withTheme = buildSavePayload(tabs, "a", "dev-1", 3, [], [], "work", "ocean");
  assert.equal(withTheme.data.themeId, "ocean");
  const withoutTheme = buildSavePayload(tabs, "a", "dev-1", 3);
  assert.equal("themeId" in withoutTheme.data, false);
});

test("save payload carries groups + workspaces", () => {
  const tabs = new Map([["a", { url: "https://a.com", title: "A", group: "grp-1" }]]);
  const p = buildSavePayload(tabs, "a", "dev-1", 3,
    [{ name: "Work", tabs: [] }], [{ id: "grp-1", name: "Work", color: "#0071e3" }]);
  assert.equal(p.data.tabs[0].group, "grp-1");
  assert.deepEqual(p.data.workspaces, [{ name: "Work", tabs: [] }]);
  assert.deepEqual(p.data.groups, [{ id: "grp-1", name: "Work", color: "#0071e3" }]);
});

test("merge workspaces unions by name, skips malformed", () => {
  const added = mergeRemoteWorkspaces(["Home"], [
    { name: "Home", tabs: [] },
    { name: "Work", tabs: [{ url: "https://w.com" }] },
    { tabs: [] },
    null,
  ]);
  assert.deepEqual(added, [{ name: "Work", tabs: [{ url: "https://w.com" }] }]);
});

// ---- perf budgets (fail on regression) ----
test("budget: 20-tab save+restore under 1s", () => {
  const { Store } = require("./store");
  const s = new Store(require("os").tmpdir() + "/ct-budget-" + Date.now());
  const tabs = Array.from({ length: 20 }, (_, i) => ({ label: `t${i}`, url: `https://ex${i}.com`, title: `T${i}` }));
  const t0 = performance.now();
  s.saveSession(tabs, "t0");
  const loaded = s.loadSession();
  const ms = performance.now() - t0;
  assert.equal(loaded.length, 20);
  assert.ok(ms < 1000, `save+restore took ${ms.toFixed(0)}ms`);
});

test("budget: 500 history appends under 2s (async flush)", async () => {
  const { Store } = require("./store");
  const s = new Store(require("os").tmpdir() + "/ct-budget-h-" + Date.now());
  const t0 = performance.now();
  for (let i = 0; i < 500; i++) s.appendHistory(`https://h${i}.com`, `H${i}`);
  const ms = performance.now() - t0;
  assert.ok(ms < 2000, `500 appends took ${ms.toFixed(0)}ms`);
  s.flush();
});

test("removeOriginHistory drops one origin exactly", () => {
  const { Store } = require("./store");
  const s = new Store(require("os").tmpdir() + "/ct-forget-" + Date.now());
  s.appendHistory("https://evil.com/a", "A");
  s.appendHistory("https://evil.com/b?x=1", "B");
  s.appendHistory("https://evil.com.evil.com/", "Spoof");
  s.appendHistory("https://good.com/", "G");
  assert.equal(s.removeOriginHistory("https://evil.com"), 2);
  assert.deepEqual(s.getHistory().map((h) => h.url).sort(), ["https://evil.com.evil.com/", "https://good.com/"]);
  assert.equal(s.removeOriginHistory("https://nothing.com"), 0);
});

test("reading list add/dedupe/mark/remove", () => {
  const { Store } = require("./store");
  const s = new Store(require("os").tmpdir() + "/ct-reading-" + Date.now());
  assert.deepEqual(s.getReading(), []);
  s.addReading("https://example.com/a", "A");
  s.addReading("https://example.com/b", "B");
  s.addReading("https://example.com/a", "A new title");
  let list = s.getReading();
  assert.equal(list.length, 2);
  assert.equal(list[0].url, "https://example.com/a"); // re-add bumps to front
  assert.equal(list[0].read, false);
  s.addReading("file:///x", "Nope");
  assert.equal(s.getReading().length, 2); // non-web rejected
  s.markReading("https://example.com/b", true);
  assert.equal(s.getReading().find((r) => r.url === "https://example.com/b").read, true);
  s.removeReading("https://example.com/a");
  assert.deepEqual(s.getReading().map((r) => r.url), ["https://example.com/b"]);
});

test("mergeTabdrops adopts unseen http drops once, skips junk", () => {
  const now = 1_000_000;
  const seen = ["old-id"];
  const remote = [
    { id: "d1", url: "https://example.com/x", title: "X", from: "dev-2", at: now - 1000 },
    { id: "old-id", url: "https://example.com/again", at: now - 1000 },
    { id: "d2", url: "file:///x", at: now - 1000 },
    { id: "d3", url: "https://example.com/stale", at: now - 25 * 60 * 60 * 1000 },
    { id: "", url: "https://example.com/blank" },
    null,
  ];
  const out = mergeTabdrops(seen, remote, 24 * 60 * 60 * 1000, now);
  assert.deepEqual(out, [{ id: "d1", url: "https://example.com/x", title: "X", from: "dev-2", at: now - 1000 }]);
  // Second pull sees nothing new (d1 now in seen).
  assert.deepEqual(mergeTabdrops([...seen, "d1"], remote, 24 * 60 * 60 * 1000, now), []);
});

test("buildSavePayload carries tabdrops when present", () => {
  const tabs = new Map([["a", { url: "https://a.com", title: "A" }]]);
  const drops = [{ id: "td-1", url: "https://a.com", title: "A", from: "dev-1", at: 42 }];
  const p = buildSavePayload(tabs, "a", "dev-1", 1, null, null, "personal", null, { tabdrops: drops, tabdropSeen: ["x"] });
  assert.deepEqual(p.data.tabdrops, drops);
  assert.deepEqual(p.data.tabdropSeen, ["x"]);
  const q = buildSavePayload(tabs, "a", "dev-1", 1);
  assert.equal(q.data.tabdrops, undefined);
});
