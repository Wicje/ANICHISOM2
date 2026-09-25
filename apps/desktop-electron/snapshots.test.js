const { test } = require("node:test");
const assert = require("node:assert/strict");
const S = require("./snapshots");

test("cleanTabs keeps web URLs and start page, drops junk", () => {
  const out = S.cleanTabs([
    { url: "https://a.com/", title: "A" },
    { url: "continua://start", title: "New Tab" },
    { url: "file:///x" },
    { url: "data:text/html,hi" },
    null,
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].container, null);
});

test("buildSnapshot stamps id/name/time", () => {
  const s = S.buildSnapshot([{ url: "https://a.com/" }], "lab-1", "  Week checkpoint  ", 1234567890);
  assert.equal(s.id, "snap-1234567890");
  assert.equal(s.name, "Week checkpoint");
  assert.equal(s.saved_at, 1234567890);
  assert.equal(s.active, "lab-1");
});

test("publicRows sorts newest-first with names", () => {
  const rows = S.publicRows([
    { id: "a", saved_at: 1, tabs: [], name: "old" },
    { id: "b", saved_at: 3, tabs: [{ url: "https://x/" }] },
    { id: "c", saved_at: 2, tabs: [] },
  ]);
  assert.deepEqual(rows.map((r) => r.id), ["b", "c", "a"]);
  assert.equal(rows[0].name, null);
  assert.equal(rows[2].name, "old");
});

test("cleanName falls back and caps", () => {
  assert.equal(S.cleanName("", "FB"), "FB");
  assert.equal(S.cleanName("x".repeat(100)).length, 60);
});
