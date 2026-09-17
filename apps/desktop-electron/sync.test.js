const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildSavePayload, mergeRemoteTabs } = require("./sync");

test("save payload excludes incognito tabs", () => {
  const tabs = new Map([
    ["a", { url: "https://a.com", title: "A", pinned: false }],
    ["p", { url: "https://private.com", title: "P", incognito: true }],
  ]);
  const p = buildSavePayload(tabs, "a", "dev-1", 7);
  assert.equal(p.domain, "browser");
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
  assert.deepEqual(mergeRemoteTabs(local, remote), [{ url: "https://b.com", title: "B" }]);
});

test("merge dedupes within the remote batch", () => {
  const out = mergeRemoteTabs(new Map(), [
    { url: "https://b.com" },
    { url: "https://b.com" },
  ]);
  assert.equal(out.length, 1);
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
