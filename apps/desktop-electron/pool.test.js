const { test } = require("node:test");
const assert = require("node:assert/strict");
const { pickVictims, applyNavEntry } = require("./pool");

const live = (lastActive) => ({ discarded: false, view: {}, lastActive });

test("never victimizes focused tab", () => {
  const now = 1_000_000;
  const entries = [
    ["a", live(now - 100_000)],
    ["b", live(now - 200_000)],
  ];
  assert.deepEqual(pickVictims(entries, "a", { poolK: 1, now }), ["b"]);
});

test("discards oldest-idle first when over K", () => {
  const now = 1_000_000;
  const entries = [
    ["focus", live(now)],
    ["old", live(now - 300_000)],
    ["mid", live(now - 200_000)],
    ["new", live(now - 100_000)],
  ];
  assert.deepEqual(pickVictims(entries, "focus", { poolK: 2, now }), ["old", "mid"]);
});

test("ignores fresh tabs within discard window", () => {
  const now = 1_000_000;
  const entries = [["focus", live(now)], ["fresh", live(now - 1_000)]];
  assert.deepEqual(pickVictims(entries, "focus", { poolK: 1, now }), []);
});

test("discards everything idle under RSS pressure", () => {
  const now = 1_000_000;
  const entries = [["focus", live(now)], ["x", live(now - 60_000)], ["y", live(now - 90_000)]];
  assert.deepEqual(
    pickVictims(entries, "focus", { poolK: 6, rss: 2e9, rssBudget: 1e9, now }).sort(),
    ["x", "y"],
  );
});

test("skips already-discarded and viewless entries", () => {
  const now = 1_000_000;
  const entries = [
    ["focus", live(now)],
    ["gone", { discarded: true, view: null, lastActive: 0 }],
    ["noview", { discarded: false, view: null, lastActive: 0 }],
  ];
  assert.deepEqual(pickVictims(entries, "focus", { poolK: 1, now }), []);
});

// --- applyNavEntry: committed navigations are ground truth --------------

test("programmatic target overwrites current entry", () => {
  const r = applyNavEntry(["a", "b"], 1, "b2", { expectNav: "b2" });
  assert.deepEqual(r, { history: ["a", "b2"], idx: 1, mode: "match" });
});

test("redirect landing overwrites current entry (no back-bounce)", () => {
  const r = applyNavEntry(["s", "track"], 1, "article", { expectNav: "track", redirected: true });
  assert.deepEqual(r, { history: ["s", "article"], idx: 1, mode: "redirect" });
});

test("unexpected commit appends instead of dropping (stale pending flag)", () => {
  // Fresh start tab whose birth commit was never recorded: the first link
  // lands in-tab with a stale expectNav. Dropping it desyncs meta.url from
  // history, so a later discard+rehydrate resurrects the start page.
  const r = applyNavEntry(["file://start"], 0, "https://example.com/tile", { expectNav: "file://start" });
  assert.deepEqual(r, {
    history: ["file://start", "https://example.com/tile"],
    idx: 1,
    mode: "append",
  });
});

test("in-page commit with pending target overwrites (no dup entries)", () => {
  const r = applyNavEntry(["p"], 0, "p#sec", { expectNav: "p", inPage: true });
  assert.deepEqual(r, { history: ["p#sec"], idx: 0, mode: "inpage" });
});

test("plain commit appends, identical commit is a no-op", () => {
  assert.deepEqual(applyNavEntry(["a"], 0, "b", {}), { history: ["a", "b"], idx: 1, mode: "append" });
  assert.deepEqual(applyNavEntry(["a", "b"], 1, "b", {}), { history: ["a", "b"], idx: 1, mode: "same" });
});

test("never mutates inputs", () => {
  const hist = ["a"];
  const r = applyNavEntry(hist, 0, "b", { expectNav: "stale" });
  assert.deepEqual(hist, ["a"]);
  assert.equal(r.idx, 1);
});
