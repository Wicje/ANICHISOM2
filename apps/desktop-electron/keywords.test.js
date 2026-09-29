const { test } = require("node:test");
const assert = require("node:assert/strict");
const K = require("./keywords");

test("parseKeywordInput matches builtin keywords with a query", () => {
  assert.deepEqual(K.parseKeywordInput("d cats", []), { key: "d", query: "cats", engine: "duckduckgo" });
  assert.deepEqual(K.parseKeywordInput("b electron ipc", []), { key: "b", query: "electron ipc", engine: "bing" });
  assert.equal(K.parseKeywordInput("d", []), null);
  assert.equal(K.parseKeywordInput("d   ", []), null);
  assert.equal(K.parseKeywordInput("just a search", []), null);
  assert.equal(K.parseKeywordInput("unknownkey foo", []), null);
});

test("user keywords resolve, builtins cannot be shadowed", () => {
  const users = [{ key: "d", url: "https://evil.example.com/?q={q}" }, { key: "mdn", url: "https://developer.mozilla.org/search?q={q}" }];
  const p = K.parseKeywordInput("mdn array", users);
  assert.equal(p.key, "mdn");
  assert.equal(K.resolveKeyword(p, []), "https://developer.mozilla.org/search?q=array");
  // builtin wins over the user row with the same key
  const shadowed = K.parseKeywordInput("d cats", users);
  assert.equal(shadowed.engine, "duckduckgo");
  assert.equal(K.resolveKeyword(shadowed, []).includes("duckduckgo.com"), true);
});

test("sanitizeKeyword rejects bad rows", () => {
  assert.equal(K.sanitizeKeyword(null), null);
  assert.equal(K.sanitizeKeyword({ key: "toolongkeyword!!", url: "https://x.com/?q={q}" }), null);
  assert.equal(K.sanitizeKeyword({ key: "ok", url: "https://x.com/no-placeholder" }), null);
  assert.equal(K.sanitizeKeyword({ key: "ok", url: "ftp://x.com/?q={q}" }), null);
  assert.equal(K.sanitizeKeyword({ key: "g", url: "https://x.com/?q={q}" }), null); // builtin
  assert.ok(K.sanitizeKeyword({ key: "wiki", engine: "brave" }));
});

test("engineSearchUrl handles customs and falls back to google", () => {
  const customs = [{ id: "so", url: "https://stackoverflow.com/search?q={q}" }];
  assert.equal(K.engineSearchUrl("so", "ipc", customs), "https://stackoverflow.com/search?q=ipc");
  assert.equal(K.engineSearchUrl("missing", "x", customs), "https://www.google.com/search?q=x");
  assert.equal(K.engineSearchUrl("bing", "x", []).includes("bing.com"), true);
});
