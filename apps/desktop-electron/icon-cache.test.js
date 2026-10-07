const { test } = require("node:test");
const assert = require("node:assert/strict");
const IC = require("./icon-cache");

test("cacheKey stable per host+href", () => {
  const a = IC.cacheKey("https://a.com/x", "https://a.com/i.png");
  const b = IC.cacheKey("https://a.com/y", "https://a.com/i.png");
  assert.equal(a, b);
  assert.notEqual(a, IC.cacheKey("https://b.com/x", "https://a.com/i.png"));
  assert.match(a, /^[0-9a-f]{16}$/);
});

test("extFor prefers content-type, falls back to suffix", () => {
  assert.equal(IC.extFor("image/png", "https://a.com/i"), "png");
  assert.equal(IC.extFor("image/svg+xml; charset=utf-8", "https://a.com/i"), "svg");
  assert.equal(IC.extFor("", "https://a.com/i.webp"), "webp");
  assert.equal(IC.extFor("text/html", "https://a.com/page"), null);
});

test("verifyIconUrl rejects non-image and oversize", async () => {
  const html = async () => ({ ok: true, status: 200, headers: { get: () => "text/html" }, arrayBuffer: async () => Buffer.from("x") });
  assert.equal((await IC.verifyIconUrl("https://a.com/i.png", html)).ok, false);
  assert.equal((await IC.verifyIconUrl("ftp://a.com/i.png", html)).ok, false);
  const big = async () => ({ ok: true, status: 200, headers: { get: () => "image/png" }, arrayBuffer: async () => Buffer.alloc(IC.MAX_ICON_BYTES + 1) });
  assert.equal((await IC.verifyIconUrl("https://a.com/i.png", big)).reason, "bad-size");
});

test("resolveAppIcon takes first verifying candidate", async () => {
  const calls = [];
  const fetchImpl = async (u) => {
    calls.push(u);
    if (u.includes("dead")) return { ok: false, status: 404, headers: { get: () => "" }, arrayBuffer: async () => Buffer.alloc(0) };
    return { ok: true, status: 200, headers: { get: () => "image/png" }, arrayBuffer: async () => Buffer.from([1, 2, 3]) };
  };
  const r = await IC.resolveAppIcon("https://a.com/", ["https://a.com/dead.ico", "https://a.com/live.png"], fetchImpl);
  assert.equal(r.href, "https://a.com/live.png");
  assert.deepEqual(calls, ["https://a.com/dead.ico", "https://a.com/live.png"]);
  assert.equal(await IC.resolveAppIcon("https://a.com/", ["https://a.com/dead.ico"], fetchImpl), null);
});
