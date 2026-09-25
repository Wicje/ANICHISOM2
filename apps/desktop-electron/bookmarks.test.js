const { test } = require("node:test");
const assert = require("node:assert/strict");
const B = require("./bookmarks");

const SAMPLE = [
  { label: "GitHub", url: "https://github.com/", added_at: 1 },
  { label: "MDN Array", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array", added_at: 2 },
  { label: "News", url: "https://news.example.com/today", added_at: 3 },
];

test("searchBookmarks ranks title > host > url", () => {
  assert.equal(B.searchBookmarks(SAMPLE, "mdn")[0].url.includes("mozilla"), true);
  assert.equal(B.searchBookmarks(SAMPLE, "github")[0].label, "GitHub");
  assert.equal(B.searchBookmarks(SAMPLE, "") .length, 3);
  assert.deepEqual(B.searchBookmarks(SAMPLE, "nope"), []);
});

test("renameBookmark renames or errors", () => {
  const ok = B.renameBookmark(SAMPLE, "https://github.com/", "GH");
  assert.equal(ok.renamed.label, "GH");
  assert.equal(SAMPLE[0].label, "GitHub"); // input untouched
  assert.equal(B.renameBookmark(SAMPLE, "https://missing/", "x").error, "not-found");
  assert.equal(B.renameBookmark(SAMPLE, "https://github.com/", "  ").error, "bad-title");
});

test("mergeImported dedupes by URL", () => {
  const { bookmarks, added } = B.mergeImported(SAMPLE, [
    { url: "https://github.com/", title: "dupe" },
    { url: "https://fresh.example.com/", title: "Fresh" },
    { url: "ftp://bad.example.com/", title: "bad" },
  ]);
  assert.equal(added, 1);
  assert.equal(bookmarks.length, 4);
});
