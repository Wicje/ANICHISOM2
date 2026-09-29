const { test } = require("node:test");
const assert = require("node:assert/strict");
const K = require("./cookies");

test("originOf keeps web origins only", () => {
  assert.equal(K.originOf("https://a.com/x"), "https://a.com");
  assert.equal(K.originOf("http://a.com:3000/"), "http://a.com:3000");
  assert.equal(K.originOf("file:///x"), null);
  assert.equal(K.originOf("nope"), null);
});

test("domainCovers matches exact and subdomains, never siblings", () => {
  assert.equal(K.domainCovers("example.com", "example.com"), true);
  assert.equal(K.domainCovers(".example.com", "sub.example.com"), true);
  assert.equal(K.domainCovers("example.com", "sub.example.com"), true);
  assert.equal(K.domainCovers("example.com", "evilexample.com"), false);
  assert.equal(K.domainCovers("sub.example.com", "example.com"), false);
  assert.equal(K.domainCovers("", "example.com"), false);
});

test("removalPlan targets covering cookies with the origin scheme", () => {
  const cookies = [
    { name: "a", domain: "example.com", path: "/" },
    { name: "b", domain: ".example.com", path: "/x" },
    { name: "c", domain: "other.com", path: "/" },
  ];
  const plan = K.removalPlan("https://sub.example.com", cookies);
  assert.equal(plan.length, 2);
  assert.ok(plan.every((p) => p.url.startsWith("https://")));
  assert.equal(K.removalPlan("not-an-origin", cookies).length, 0);
});

test("publicRows shapes and sorts", () => {
  const rows = K.publicRows([
    { name: "z", domain: "b.com", value: "1" },
    { name: "a", domain: "a.com", value: "x".repeat(500), secure: true },
    null,
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].domain, "a.com");
  assert.equal(rows[0].value.length, 200);
  assert.equal(rows[0].secure, true);
});
