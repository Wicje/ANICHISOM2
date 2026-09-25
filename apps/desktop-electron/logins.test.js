const { test } = require("node:test");
const assert = require("node:assert/strict");
const { normalizeOrigin, validCandidate, forOrigin, findUserLogin } = require("./logins");

test("normalizeOrigin keeps http(s) origins, rejects the rest", () => {
  assert.equal(normalizeOrigin("https://example.com/a?x=1"), "https://example.com");
  assert.equal(normalizeOrigin("http://localhost:3000/x"), "http://localhost:3000");
  assert.equal(normalizeOrigin("file:///tmp/x.html"), null);
  assert.equal(normalizeOrigin("data:text/html,hi"), null);
  assert.equal(normalizeOrigin("not a url"), null);
  assert.equal(normalizeOrigin(""), null);
});

test("validCandidate accepts sane captures", () => {
  assert.equal(
    validCandidate({ origin: "https://example.com", username: "amy", password: "s3cret" }),
    true,
  );
});

test("validCandidate rejects junk and non-web origins", () => {
  assert.equal(validCandidate(null), false);
  assert.equal(validCandidate({ origin: "https://example.com", username: "", password: "x" }), false);
  assert.equal(validCandidate({ origin: "https://example.com", username: "a", password: "" }), false);
  assert.equal(validCandidate({ origin: "https://example.com", username: "a" }), false);
  assert.equal(validCandidate({ origin: "file:///x", username: "a", password: "b" }), false);
  assert.equal(
    validCandidate({ origin: "https://example.com/", username: "a", password: "b" }),
    false, // must be canonical already (trailing slash is not an origin)
  );
  assert.equal(
    validCandidate({ origin: "https://example.com", username: "a", password: "x".repeat(2000) }),
    false,
  );
  assert.equal(
    validCandidate({ origin: "https://example.com", username: "x".repeat(500), password: "y" }),
    false,
  );
});

test("forOrigin matches exactly, never across origins", () => {
  const list = [
    { origin: "https://a.com", username: "u" },
    { origin: "https://sub.a.com", username: "u" },
    { origin: "http://a.com", username: "u" },
  ];
  assert.deepEqual(forOrigin(list, "https://a.com"), [list[0]]);
  assert.deepEqual(forOrigin(list, "https://evil.com"), []);
  assert.deepEqual(forOrigin(null, "https://a.com"), []);
});

test("findUserLogin matches origin + username", () => {
  const list = [
    { origin: "https://a.com", username: "amy" },
    { origin: "https://a.com", username: "bob" },
  ];
  assert.deepEqual(findUserLogin(list, "https://a.com", "bob"), list[1]);
  assert.equal(findUserLogin(list, "https://a.com", "zed"), null);
  assert.equal(findUserLogin(list, "https://b.com", "amy"), null);
});
