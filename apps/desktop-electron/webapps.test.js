const { test } = require("node:test");
const assert = require("node:assert/strict");
const W = require("./webapps");

test("installApp upserts by URL", () => {
  const r1 = W.installApp([], "https://mail.google.com/", "Gmail", "a1b2c3d4");
  assert.equal(r1.app.id, "app-a1b2c3d4");
  assert.equal(r1.app.name, "Gmail");
  const r2 = W.installApp(r1.apps, "https://mail.google.com/", "Mail", "ffff0000");
  assert.equal(r2.apps.length, 1);
  assert.equal(r2.app.name, "Mail");
});

test("installApp rejects non-web URLs and names default to host", () => {
  assert.equal(W.installApp([], "file:///x", "").error, "bad-url");
  const r = W.installApp([], "https://linear.app/", "", "abcd1234");
  assert.equal(r.app.name, "linear.app");
});

test("removeApp deletes by id", () => {
  const r1 = W.installApp([], "https://a.com/", "", "11111111");
  const r2 = W.installApp(r1.apps, "https://b.com/", "", "22222222");
  const del = W.removeApp(r2.apps, r1.app.id);
  assert.equal(del.removed, true);
  assert.equal(del.apps.length, 1);
  assert.equal(W.removeApp(del.apps, "app-missing").removed, false);
});

test("sanitizeApps drops junk and dupes", () => {
  const out = W.sanitizeApps([
    { id: "x", url: "https://a.com/", name: "A" },
    { id: "y", url: "https://a.com/", name: "dupe" },
    { id: "z", url: "ftp://b.com/" },
    null,
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, "A");
});

test("pickIconHref prefers touch icons, then largest, absolutized", () => {
  const html = `<html><head>
    <link rel="icon" href="/f16.png" sizes="16x16">
    <link rel="icon" href="/f192.png" sizes="192x192">
    <link rel="apple-touch-icon" href="/touch.png">
    </head></html>`;
  assert.equal(W.pickIconHref(html, "https://a.com/page"), "https://a.com/touch.png");
  const noTouch = `<link rel="icon" href="/f16.png" sizes="16x16"><link rel="icon" href="https://cdn.x/f192.png" sizes="192x192">`;
  assert.equal(W.pickIconHref(noTouch, "https://a.com/"), "https://cdn.x/f192.png");
  assert.equal(W.pickIconHref("<html></html>", "https://a.com/"), null);
  assert.equal(W.pickIconHref(html, "file:///x"), null);
  assert.equal(W.pickIconHref(`<link rel="icon" href="javascript:alert(1)">`, "https://a.com/"), null);
});

test("faviconFallback guesses origin/favicon.ico", () => {
  assert.equal(W.faviconFallback("https://a.com/x?y=1"), "https://a.com/favicon.ico");
  assert.equal(W.faviconFallback("notaurl"), null);
});

test("installApp stores icons, fills favicon guess, preserves on sanitize", () => {
  const r = W.installApp([], "https://a.com/app", "A", "11111111", "https://a.com/touch.png");
  assert.equal(r.app.icon, "https://a.com/touch.png");
  const guess = W.installApp([], "https://b.com/", "B", "22222222");
  assert.equal(guess.app.icon, "https://b.com/favicon.ico");
  const kept = W.sanitizeApps(guess.apps);
  assert.equal(kept[0].icon, "https://b.com/favicon.ico");
  const scrubbed = W.sanitizeApps([{ id: "x", url: "https://c.com/", name: "C", icon: "javascript:evil" }]);
  assert.equal(scrubbed[0].icon, null);
});
