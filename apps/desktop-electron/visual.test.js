const test = require("node:test");
const assert = require("node:assert");
const V = require("./visual");

test("fitWithin never upscales", () => {
  const f = V.fitWithin(400, 300);
  assert.equal(f.width, 400);
  assert.equal(f.height, 300);
  assert.equal(f.scaled, false);
});

test("fitWithin caps width and preserves aspect ratio", () => {
  const f = V.fitWithin(3840, 2160);
  assert.equal(f.width, 1280);
  assert.equal(f.height, 720);
  assert.equal(f.scaled, true);
});

test("fitWithin caps height for tall viewports", () => {
  const f = V.fitWithin(1000, 6000);
  assert.ok(f.height <= 1600, `height=${f.height}`);
  assert.equal(f.width, Math.round(1000 * (f.height / 6000)));
});

test("junk dimensions fall back instead of producing a 0px capture", () => {
  for (const bad of [undefined, null, 0, -5, NaN, "wide"]) {
    const f = V.fitWithin(bad, bad);
    assert.ok(f.width >= 1 && f.height >= 1, `${bad} -> ${f.width}x${f.height}`);
  }
});

test("planCapture is bounded and jpeg by default", () => {
  const p = V.planCapture({ viewportWidth: 2560, viewportHeight: 1440 });
  assert.equal(p.format, "jpeg");
  assert.equal(p.width, 1280);
  assert.ok(p.maxBytes <= 1_500_000);
  assert.ok(p.quality > 0 && p.quality <= 100);
});

test("planCapture accepts explicit caps", () => {
  const p = V.planCapture({ viewportWidth: 800, viewportHeight: 600, opts: { maxWidth: 400, maxBytes: 50_000, quality: 40 } });
  assert.equal(p.width, 400);
  assert.equal(p.maxBytes, 50_000);
  assert.equal(p.quality, 40);
});

test("planCapture never asks for png by accident", () => {
  assert.equal(V.planCapture({ opts: { format: "gif" } }).format, "jpeg");
  assert.equal(V.planCapture({ opts: { format: "png" } }).format, "png");
});

test("checkBudget flags an oversized capture", () => {
  assert.equal(V.checkBudget(1000).ok, true);
  assert.equal(V.checkBudget(0).ok, false);
  assert.equal(V.checkBudget(2_000_000).ok, false);
  assert.equal(V.checkBudget(2_000_000).tooBig, true);
});

test("normalizePoint accepts in-viewport points and rounds", () => {
  assert.deepEqual(V.normalizePoint({ x: 10.6, y: 20.2, viewportWidth: 100, viewportHeight: 50 }), { x: 11, y: 20 });
  assert.deepEqual(V.normalizePoint({ x: 0, y: 0, viewportWidth: 100, viewportHeight: 50 }), { x: 0, y: 0 });
  assert.deepEqual(V.normalizePoint({ x: 100, y: 50, viewportWidth: 100, viewportHeight: 50 }), { x: 100, y: 50 });
});

test("normalizePoint refuses rather than clamps", () => {
  // Clamping would silently aim somewhere the caller never asked for.
  for (const p of [
    { x: -1, y: 5, viewportWidth: 100, viewportHeight: 50 },
    { x: 5, y: -1, viewportWidth: 100, viewportHeight: 50 },
    { x: 101, y: 5, viewportWidth: 100, viewportHeight: 50 },
    { x: 5, y: 51, viewportWidth: 100, viewportHeight: 50 },
    { x: NaN, y: 5, viewportWidth: 100, viewportHeight: 50 },
    { x: 5, y: 5, viewportWidth: 0, viewportHeight: 50 },
    { x: 5, y: 5 },
  ]) {
    assert.equal(V.normalizePoint(p), null, JSON.stringify(p));
  }
});