const { test } = require("node:test");
const assert = require("node:assert/strict");
const { suggestGroups, findDuplicates, domainOf } = require("./groups");

test("same domain clusters, singletons excluded", () => {
  const out = suggestGroups([
    { label: "a", url: "https://github.com/x", title: "X" },
    { label: "b", url: "https://github.com/y", title: "Y" },
    { label: "c", url: "https://example.com/", title: "Solo" },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].key, "domain:github.com");
  assert.deepEqual(out[0].labels, ["a", "b"]);
});

test("subdomains merge to registrable domain", () => {
  const out = suggestGroups([
    { label: "a", url: "https://docs.example.com/a", title: "Docs A" },
    { label: "b", url: "https://mail.example.com/b", title: "Mail B" },
  ]);
  assert.equal(out.length, 1);
  assert.ok(out[0].key.includes("example.com"));
});

test("incognito never clustered", () => {
  const out = suggestGroups([
    { label: "a", url: "https://github.com/x", title: "X", incognito: true },
    { label: "b", url: "https://github.com/y", title: "Y", incognito: true },
  ]);
  assert.equal(out.length, 0);
});

test("title overlap links cross-domain research", () => {
  const out = suggestGroups([
    { label: "a", url: "https://alpha.com/1", title: "Rust borrow checker deep dive" },
    { label: "b", url: "https://beta.org/2", title: "Understanding the Rust borrow checker" },
    { label: "c", url: "https://gamma.net/3", title: "Best sourdough starter guide" },
  ]);
  const topic = out.find((g) => g.reason.startsWith("shared-topic"));
  assert.ok(topic, "expected a topic cluster");
  assert.deepEqual([...topic.labels].sort(), ["a", "b"]);
});

test("weak overlap stays silent (no nagging)", () => {
  const out = suggestGroups([
    { label: "a", url: "https://alpha.com/1", title: "The quick brown fox" },
    { label: "b", url: "https://beta.org/2", title: "Lazy dog jumps over" },
  ]);
  assert.equal(out.length, 0);
});

test("duplicates found, incognito skipped", () => {
  const dups = findDuplicates([
    { label: "a", url: "https://x.com/p" },
    { label: "b", url: "https://x.com/p/" },
    { label: "c", url: "https://x.com/q", incognito: true },
    { label: "d", url: "https://x.com/q", incognito: true },
  ]);
  assert.equal(dups.length, 1);
  assert.equal(dups[0].keep, "a");
  assert.equal(dups[0].close, "b");
});

test("domainOf handles public suffixes", () => {
  assert.equal(domainOf("https://a.bbc.co.uk/x"), "bbc.co.uk");
  assert.equal(domainOf("https://mail.google.com/"), "google.com");
});
