#!/usr/bin/env node
/**
 * Guard: every module `main.js` requires must be listed in electron-builder's
 * `build.files`.
 *
 * `main.js` requires its host modules at module scope, so a missing entry
 * produces MODULE_NOT_FOUND on the first line of a packaged launch — the app
 * is dead on arrival, and no unit test can catch it because the tests require
 * the modules directly from source. This script is the only thing standing
 * between a missing line and a broken installer, so it runs in CI.
 *
 * Exits 1 and names every missing module. `npm run check:package`.
 */
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "apps", "desktop-electron");
const host = fs.readFileSync(path.join(dir, "main.js"), "utf8");
const required = [
  ...new Set([...host.matchAll(/require\("\.\/([a-z0-9-]+)/g)].map((m) => m[1])),
].sort();

const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
const files = new Set(pkg.build.files || []);

const missing = required.filter((name) => !files.has(`${name}.js`));
if (missing.length) {
  console.error(`build.files is missing ${missing.length} required module(s):`);
  for (const m of missing) console.error(`  - ${m}.js`);
  console.error("A packaged build would crash on startup. Add each to build.files.");
  process.exit(1);
}

// The inverse also matters: a listed file that nothing requires is dead weight
// in every installer, and usually a rename that was only half-finished.
const orphans = [...files].filter((f) => {
  if (!f.endsWith(".js") || f.includes("/") || f.includes("*")) return false;
  return !required.includes(f.replace(/\.js$/, ""));
});

console.log(`ok — ${required.length} required host modules, all packaged`);
if (orphans.length) console.warn(`note: listed but not required by main.js: ${orphans.join(", ")}`);