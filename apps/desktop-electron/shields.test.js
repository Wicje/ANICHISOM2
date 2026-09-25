const { test } = require("node:test");
const assert = require("node:assert/strict");
const { stripTrackingParams, httpsUpgradeable } = require("./shields");

test("strips the utm zoo and click ids, keeps the rest", () => {
  const r = stripTrackingParams(
    "https://example.com/p?utm_source=news&utm_medium=email&fbclid=ABC&id=42#sec",
  );
  assert.deepEqual(r, {
    url: "https://example.com/p?id=42#sec",
    removed: ["utm_source", "utm_medium", "fbclid"],
  });
});

test("matches keys case-insensitively", () => {
  const r = stripTrackingParams("https://example.com/?UTM_Campaign=x&GCLID=y&q=z");
  assert.equal(r.url, "https://example.com/?q=z");
  assert.deepEqual(r.removed, ["UTM_Campaign", "GCLID"]);
});

test("leaves functional params alone", () => {
  assert.equal(stripTrackingParams("https://a.com/?ref=bestsellers&page=2&q=x"), null);
  assert.equal(stripTrackingParams("https://a.com/"), null);
});

test("rejects non-web URLs and garbage", () => {
  assert.equal(stripTrackingParams("file:///x.html?utm_source=y"), null);
  assert.equal(stripTrackingParams("not a url"), null);
  assert.equal(stripTrackingParams(""), null);
});

test("upgrades plain http, drops :80", () => {
  assert.equal(httpsUpgradeable("http://example.com/a?x=1"), "https://example.com/a?x=1");
  assert.equal(httpsUpgradeable("http://example.com:80/a"), "https://example.com/a");
});

test("refuses upgrades that would break", () => {
  assert.equal(httpsUpgradeable("https://example.com/"), null);
  assert.equal(httpsUpgradeable("http://localhost:3000/"), null);
  assert.equal(httpsUpgradeable("http://127.0.0.1/"), null);
  assert.equal(httpsUpgradeable("http://192.168.1.5/"), null);
  assert.equal(httpsUpgradeable("http://printer.local/"), null);
  assert.equal(httpsUpgradeable("http://site.onion/"), null);
  assert.equal(httpsUpgradeable("http://[::1]:8080/"), null);
  assert.equal(httpsUpgradeable("file:///x"), null);
});

test("keeps explicit non-80 ports", () => {
  assert.equal(httpsUpgradeable("http://example.com:8080/a"), "https://example.com:8080/a");
});
