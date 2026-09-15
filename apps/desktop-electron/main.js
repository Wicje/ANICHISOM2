#!/usr/bin/env node
/**
 * Continua Electron spike — WebContentsView pool host.
 *
 * Mirrors the WebKitGTK browser's ContentWidget semantics as the closest
 * Chromium analog: N live WebContentsViews (the live pool), oldest readers
 * discarded to metadata under pressure, timeline-restorable metadata kept
 * in one shared map. This is the Phase-1 pool shape, engine-swapped.
 */

const { app, BrowserWindow, WebContentsView, ipcMain, session, net } = require("electron");
const path = require("path");

const POOL_SIZE = 4; // live content webview pool (ADR-003 K)
const RSS_BUDGET_BYTES = 1.0 * 1024 * 1024 * 1024; // hard RSS budget (measured floor)
const DISCARD_AFTER_MS = 12 * 1000; // oldest active tab considered discardable
const START_URL = "https://duckduckgo.com";

// ── startup battery (CONTINUA_SELFTEST equivalent): prints TWO numbers, exits.
//    Usage: electron . --startup-battery
//    Measures on THIS box, real /proc RSS — the ADR-007 Electron cells get real
//    data, not estimates. Mirrors the WebKitGTK selftest's settle window so the
//    A/B cells compare like-for-like.
const BATTERY = process.argv.includes("--startup-battery");
if (BATTERY) {
  const t0 = process.hrtime.bigint();
  const rss = () => process.memoryUsage?.().rss ?? 0;
  app.whenReady().then(() => {
    createChrome();
    setTimeout(() => {
      const startup_ms = Number(process.hrtime.bigint() - t0) / 1e6;
      const rssMB = (rss() / 1048576).toFixed(1);
      console.log(`CONTINUA_SELFTEST_OK startup=${startup_ms.toFixed(0)}ms rss=${rssMB}MB tabs=${POOL_SIZE}`);
      app.exit(0);
    }, 6000); // settle window: 6s, same as WebKitGTK cadence
  });
}

let pool = new Map(); // label -> { view, url, title, created, lastActive, discarded }
let chrome = null;
let focused = null;

function rssBytes() {
  return process.memoryUsage?.().rss ?? 0;
}

function makeContent(label, url) {
  const view = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      backgroundThrottling: true, // Chromium's native freeze machinery
    },
  });
  view.setBackgroundColor("#00000000");
  pool.set(label, { view, url, title: label, created: Date.now(), lastActive: Date.now(), discarded: false });
  if (chrome) {
    chrome.contentView.addChildView(view);
    const { width, height } = chrome.getContentBounds();
    view.setBounds({ x: 0, y: 0, width, height });
  }
  if (url && !url.startsWith("continua://")) {
    view.webContents.loadURL(url).catch(() => {});
  }
  return label;
}

function activate(label) {
  const entry = pool.get(label);
  if (!entry || !chrome) return;
  chrome.contentView.children.forEach((c) => c.setVisible(c === entry.view));
  entry.lastActive = Date.now();
  if (entry.discarded) {
    entry.discarded = false;
    entry.view.webContents.loadURL(entry.url).catch(() => {});
  }
}

function closeContent(label) {
  const entry = pool.get(label);
  if (!entry) return;
  if (entry.view && chrome) chrome.contentView.removeChildView(entry.view);
  entry.view?.webContents?.close?.();
  pool.delete(label);
}

function rssPressure() {
  return rssBytes() >= RSS_BUDGET_BYTES;
}

function prunePool(forceDiscard = false) {
  // Evict the oldest *inactive* live views first (LRU), keeping the focused one alive.
  const now = Date.now();
  const live = [...pool.entries()].filter(([, e]) => !e.discarded && (forceDiscard || e.lastActive < now - DISCARD_AFTER_MS));
  live.sort(([, a], [, b]) => a.lastActive - b.lastActive);
  for (const [label, entry] of live) {
    if (!rssPressure() && !forceDiscard) break;
    entry.discarded = true;
    entry.view.webContents.close?.(); // discard -> metadata keeps label/url/title
  }
}

function poolStats() {
  const live = [...pool.values()].filter((e) => !e.discarded);
  const discarded = [...pool.values()].filter((e) => e.discarded);
  return {
    live: live.length,
    discarded: discarded.length,
    rssMb: (rssBytes() / 1048576).toFixed(1),
    budgetMb: (RSS_BUDGET_BYTES / 1048576).toFixed(0),
    active: focused,
  };
}

// ── connect the same React chrome (speaks our bridge seam, not Tauri) ──
function createChrome() {
  chrome = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#0a0a0a",
    title: "Continua (Electron spike)",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
    },
  });

  let dist = path.join(__dirname, "..", "desktop", "dist");
  chrome.loadFile(path.join(dist, "index.html")).catch((e) => console.error("chrome load:", e));

  // Bridge seam: every invoke("...", args) from the React chrome arrives here,
  // mapped 1:1 onto the pool.
  ipcMain.handle("continua", async (_evt, op, args) => {
    switch (op) {
      case "open_tab": return makeContent(`tab-${Date.now()}`, args?.url ?? START_URL);
      case "open_incognito_tab": return makeContent(`tab-incog-${Date.now()}`, args?.url ?? START_URL);
      case "close_tab": return closeContent(args?.label);
      case "activate_tab": return activate(args?.label);
      case "navigate_tab": {
        const e = pool.get(args?.label); if (e) { e.url = args.url; e.view.webContents.loadURL(args.url).catch(() => {}); } return;
      }
      case "reload_tab": { const e = pool.get(args?.label); if (e) e.view.webContents.reload(); return; }
      case "get_active_url": { const e = focused && pool.get(focused); return e?.url ?? "continua://home"; }
      case "apply_zoom": { const e = pool.get(args?.label); if (e) e.view.webContents.setZoomLevel((args?.zoom ?? 1) - 1); return true; }
      case "find_in_tab": { const e = pool.get(args?.label); if (e) e.view.webContents.findInPage(args?.text); return; }
      case "pool_state": return poolStats();
      case "get_browser_config": return JSON.stringify({ search_engine: "duckduckgo", homepage: START_URL });
      default: return null;
    }
  });

  chrome.on("closed", () => { pool.forEach((e) => e.view?.webContents?.close?.()); });
}

app.whenReady().then(() => {
  session.defaultSession.setSpellCheckerEnabled(false); // privacy: no spellcheck network calls
  createChrome();

  // ── ADR-007 startup battery (electron/Chromium cell, REAL numbers on this box) ──
  // The org-approved source (`extra/electron` via pacman) landed the binary, so
  // we measure the honest A/B here instead of a blocked-download footnote.
  if (process.argv.includes("--startup-battery")) {
    const t0 = process.hrtime.bigint();
    // Open POOL_SIZE live tabs (the K-pool), then settle, then COLD-RSS via /proc.
    for (let i = 0; i < POOL_SIZE; i++) makeContent(`tab-${i}`, START_URL);
    setTimeout(() => {
      const startupMs = Number(process.hrtime.bigint() - t0) / 1e6;
      const rssMb = (rssBytes() / 1048576).toFixed(1);
      console.log(`CONTINUA_SELFTEST_OK startup=${startupMs.toFixed(0)}ms rss=${rssMb}MB tabs=${POOL_SIZE} engine=electron`);
      app.exit(0);
    }, 6000); // 6s settle: same cadence as the WebKitGTK selftest battery — A/B on equal footing.
  }

  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createChrome(); });
});

app.on("window-all-closed", () => {
  // Spike: quit like a daily driver would ask (no dock lingering).
  app.quit();
});
