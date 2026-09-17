const { test } = require("node:test");
const assert = require("node:assert/strict");
const { pickVictims } = require("./pool");

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
