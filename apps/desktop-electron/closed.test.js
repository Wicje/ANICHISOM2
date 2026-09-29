const { test } = require("node:test");
const assert = require("node:assert/strict");
const R = require("./closed");

test("pushClosed keeps newest-first, caps at 25, skips junk", () => {
  let ring = [];
  ring = R.pushClosed(ring, { url: "https://a.com/", title: "A" });
  ring = R.pushClosed(ring, { url: "continua://start", title: "New" });
  ring = R.pushClosed(ring, { url: "https://b.com/", title: "B", container: "ctr-1" });
  assert.equal(ring.length, 2);
  assert.equal(ring[0].url, "https://b.com/");
  assert.equal(ring[0].container, "ctr-1");
  for (let i = 0; i < 40; i++) ring = R.pushClosed(ring, { url: `https://x${i}.com/` });
  assert.equal(ring.length, 25);
  assert.equal(ring[0].url, "https://x39.com/");
});

test("shiftClosed and reopenAt consume entries", () => {
  let ring = [];
  ring = R.pushClosed(ring, { url: "https://a.com/" });
  ring = R.pushClosed(ring, { url: "https://b.com/" });
  const s = R.shiftClosed(ring);
  assert.equal(s.entry.url, "https://b.com/");
  assert.equal(s.ring.length, 1);
  const r = R.reopenAt(s.ring, 0);
  assert.equal(r.entry.url, "https://a.com/");
  assert.equal(r.ring.length, 0);
  assert.equal(R.reopenAt([], 0).entry, null);
  assert.equal(R.reopenAt(s.ring, 9).entry, null);
});

test("dropOrigin removes one origin only", () => {
  let ring = [];
  ring = R.pushClosed(ring, { url: "https://a.com/1" });
  ring = R.pushClosed(ring, { url: "https://b.com/1" });
  const kept = R.dropOrigin(ring, "https://b.com");
  assert.equal(kept.length, 1);
  assert.equal(kept[0].url, "https://a.com/1");
});

test("publicRows exposes indexed rows", () => {
  const ring = R.pushClosed([], { url: "https://a.com/", title: "A" });
  assert.deepEqual(R.publicRows(ring), [{ index: 0, url: "https://a.com/", title: "A", container: null, at: ring[0].at }]);
});
