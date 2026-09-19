#!/usr/bin/env node
/**
 * Continua Browser — Electron Chromium product host (ADR-008).
 *
 * WebContentsView pool K=6 live, rest discarded to metadata. Local-first
 * continuity via store.js, delta sync to Supabase (TLS, no E2E).
 * Privacy tax removed: no vault, no fingerprint gate, plain partitions.
 */
const { app, BrowserWindow, WebContentsView, ipcMain, session, shell, Menu, globalShortcut, safeStorage } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { Store } = require("./store");
const profiles = require("./profiles");
const { pickVictims } = require("./pool");
const { buildSavePayload, mergeRemoteTabs, mergeRemoteWorkspaces } = require("./sync");

// Boxes without a usable GPU (broken libva/iHD, headless Wayland) get a
// dying GPU process and black canvases in fresh renderers. Opt out of
// hardware acceleration there via CONTINUA_SOFTWARE_GL=1 (set by the
// launcher on such boxes). Untouched everywhere else.
if (process.env.CONTINUA_SOFTWARE_GL === "1") {
  try {
    app.disableHardwareAcceleration();
    console.error("[continua] software GL forced (CONTINUA_SOFTWARE_GL=1)");
  } catch {}
}

// Single instance: links opened via drun/xdg-open (the .desktop Exec gets
// %u) land here as argv URLs. A second launch forwards its URL into a tab
// of the running window instead of spawning another browser.
const argvUrl = (argv) => (argv || []).find((a) => /^https?:\/\//i.test(a || ""));
const launchUrl = argvUrl(process.argv.slice(1));
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (_e, argv) => {
    try {
      const u = argvUrl(argv);
      if (u && chrome && !chrome.isDestroyed()) {
        chrome.focus();
        openTab(u);
      } else if (chrome && !chrome.isDestroyed()) {
        chrome.focus();
      }
    } catch {}
  });
}

const POOL_K = parseInt(process.env.CONTINUA_POOL_K || (os.totalmem() < 5 * 1024 * 1024 * 1024 ? "3" : "6"), 10);
const RSS_BUDGET = 1.0 * 1024 * 1024 * 1024;
const DISCARD_AFTER_MS = 30 * 1000;
// Local offline-first start page (works with no network). Remote search stays
// in the omnibox/start-page search box — new tabs never white-screen.
const START_PAGE_FILE = path.join(__dirname, "start-page.html");
const OFFLINE_FILE = path.join(__dirname, "offline.html");
const CRASH_FILE = path.join(__dirname, "crash.html");
const START_URL = "file://" + START_PAGE_FILE;
const OFFLINE_URL = "file://" + OFFLINE_FILE;
const CRASH_URL = "file://" + CRASH_FILE;
const isWeb = (u) => !!u && /^https?:\/\//i.test(u);
const isStartUrl = (u) => u === "continua://start" || u === "continua://home" || !u;
const resolveUrl = (u) => (isStartUrl(u) ? START_URL : u);
let CHROME_H = 56;
// Matches .tab-rail width in styles.css exactly — any drift shows as a
// black window-bg gap with the page shifted right (seen in screenshots).
let TAB_RAIL_W = 0;
const TAB_RAIL_WIDTH_PX = 44;
// While a React-chrome overlay is open (settings/history/palette/...), hide
// content views: native WebContentsViews always paint above the window's own
// HTML, so dropdowns would otherwise render underneath the website.
let modalHidden = false;
let modalTimer = null;
const MODAL_HIDE_DELAY_MS = 120;

let chrome = null;
let store = null;
let userDataPath = null;
let profileState = null; // { activeId, profiles: [{id,name,color}] }
let activeProfileId = "personal";
let tabs = new Map(); // label -> meta
let order = [];       // creation order for LRU display
let focused = null;
let pendingFocus = null; // swap-on-ready target (discarded-tab rehydrate)
let closedRings = new Map(); // profileId -> recently-closed ring (never cross profiles)
let downloads = new Map(); // id -> {id, filename, path, url, state, received, total, startedAt}
let dlSeq = 0;
let seq = 0;
const label = (p) => `${p}-${Date.now()}-${(seq++).toString(36)}`;

const rss = () => process.memoryUsage?.().rss ?? 0;
// Chrome-style profile isolation: one Electron partition per profile, so
// cookies / storage / service workers never cross Work ↔ Personal.
const activePartition = () => profiles.partitionFor(activeProfileId);
const closedRing = () => {
  if (!closedRings.has(activeProfileId)) closedRings.set(activeProfileId, []);
  return closedRings.get(activeProfileId);
};

// ---------- store / sync (real endpoints: /api/context/save+pull, /api/devices/*) ----------
let saveTimer = null;
let syncVersion = 1;
let lastSyncAt = 0;
let lastSyncError = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persistNow, 2000);
}
function persistNow() {
  if (!store) return;
  const live = [...tabs.entries()].filter(([, m]) => !m.incognito).map(([lab, m]) => ({ label: lab, url: m.url, title: m.title, pinned: !!m.pinned, group: m.group || null }));
  store.saveSession(live, focused);
  // Live tabs carry their profile so Work and Personal never merge server-side.
  live.forEach(t => store.enqueue({ op: "upsert_tab", profileId: activeProfileId, ...t }));
}
setInterval(() => { if (store && tabs.size) store.snapshot([...tabs.entries()].filter(([, m]) => !m.incognito).map(([lab, m]) => ({ label: lab, url: m.url, title: m.title })), focused); }, 5 * 60 * 1000);
// Auto-sleep: discard tabs idle longer than the user's threshold (0 = off).
// The pool already discards under pressure; this sleeps by time so quiet
// tabs rest even when memory is fine. Wake = click (rehydrates on ready).
setInterval(() => {
  if (!store || !chrome) return;
  let mins = 30;
  try { mins = Number(store.getConfig?.().sleep_after_min ?? 30); } catch {}
  if (!mins || mins <= 0) return;
  const cutoff = Date.now() - mins * 60 * 1000;
  let slept = 0;
  for (const [lab, m] of tabs) {
    if (!m.view || m.discarded || lab === focused || lab === pendingFocus) continue;
    if ((m.lastActive || 0) > cutoff) continue;
    try { chrome.contentView.removeChildView(m.view); m.view.webContents.close(); } catch {}
    m.view = null; m.discarded = true; slept++;
  }
  if (slept) { scheduleSave(); layoutViews(); console.error(`[continua] auto-sleep ${slept} tabs (>${mins}m idle)`); }
}, 60 * 1000);

const apiBase = () => (store.cfg.continua_url || "").replace(/\/$/, "");
const authHeaders = () => ({ "content-type": "application/json", authorization: `Bearer ${store.cfg.capability_token || ""}` });

async function flushSync() {
  if (!store) return { ok: false, reason: "no-store" };
  const ops = store.pendingOps();
  const url = apiBase(), token = store.cfg.capability_token;
  if (!url || !token) return { ok: false, reason: "unpaired", pending: ops.length };
  if (!ops.length) { lastSyncAt = Date.now(); return { ok: true, pending: 0 }; }
  try {
    // Collapse queue to current tab graph → single domain save (server merges via vector clocks).
    let workspaces = null;
    try {
      const ws = store.listWorkspaces ? store.listWorkspaces() : [];
      workspaces = ws.map(w => ({ name: w.id, tabs: w.tabs }));
    } catch {}
    const payload = buildSavePayload(tabs, focused, store.cfg.device_id, syncVersion, workspaces, getGroups(), activeProfileId, store.getConfig ? store.getConfig().theme_id : undefined);
    const res = await fetch(`${url}/api/context/save`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`save-${res.status}`);
    const depth = store.queueDepth ? store.queueDepth() : ops.length;
    store.clearFlushed(Math.min(ops.length, 100));
    syncVersion++;
    try { store.cfg.last_version = syncVersion; store._saveCfg(); } catch {}
    lastSyncAt = Date.now(); lastSyncError = null;
    return { ok: true, pending: Math.max(0, depth - 100) };
  } catch (e) { lastSyncError = String(e?.message || e); return { ok: false, reason: "offline", pending: ops.length }; }
}
setInterval(() => void flushSync(), 15000);

async function pullMerge() {
  const url = apiBase(), token = store.cfg.capability_token;
  if (!url || !token) return [];
  try {
    const domain = `browser-profile-${activeProfileId}`;
    const res = await fetch(`${url}/api/context/pull?domains=${domain},browser`, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    const body = await res.json();
    const records = body?.data?.records || body?.data || [];
    const rec = Array.isArray(records) ? records.find(r => r.domain === domain) || records.find(r => r.domain === "browser") || records[0] : records;
    const remote = rec?.data?.tabs || rec?.tabs || [];
    if (!Array.isArray(remote)) return [];
    try { if (rec?.version && rec.version >= syncVersion) syncVersion = rec.version + 1; } catch {}
    const out = [];
    for (const t of mergeRemoteTabs(tabs, remote)) {
      const lab = openTab(t.url);
      if (t.group) { const m = tabs.get(lab); if (m) m.group = t.group; }
      out.push({ label: lab, url: t.url, title: t.title });
    }
    // Adopt unknown remote workspaces (phone/PWA saves land here).
    try {
      const localNames = store.listWorkspaces ? store.listWorkspaces().map(w => w.id) : [];
      for (const w of mergeRemoteWorkspaces(localNames, rec?.data?.workspaces)) {
        try { store.saveWorkspace(w.name, w.tabs); } catch {}
        out.push({ workspace: w.name, tabs: w.tabs.length });
      }
    } catch {}
    // Adopt unknown remote groups (ids + names + colors merge by id).
    try {
      const local = getGroups();
      const have = new Set(local.map(g => g.id));
      let changed = false;
      for (const g of rec?.data?.groups || []) {
        if (!g?.id || have.has(g.id)) continue;
        have.add(g.id);
        local.push({ id: g.id, name: (g.name || "Untitled").slice(0, 32), color: g.color || "#0071e3" });
        changed = true;
      }
      if (changed) saveGroups(local);
    } catch {}
    lastSyncAt = Date.now();
    return out;
  } catch { return []; }
}

async function heartbeat() {
  const url = apiBase(), token = store.cfg.capability_token;
  if (!url || !token) return;
  try {
    await fetch(`${url}/api/devices/heartbeat`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ deviceId: store.cfg.device_id }) });
  } catch {}
}
setInterval(heartbeat, 60000);

// ---------- pool ----------
let lastLayoutSig = "";
// Studio mode (clean recording): chrome UI hides itself and content views
// expand to the full window. A floating pill offers Exit; the global
// shortcut toggles back even with the chrome hidden.
let studio = false;
let studioPill = null;
function layoutViews() {
  if (!chrome) return;
  const { width, height } = chrome.getContentBounds();
  const ch = studio ? 0 : CHROME_H;
  const rw = studio ? 0 : TAB_RAIL_W;
  // Per-view guard: one destroyed webContents throwing must never abort the
  // loop — that left two views painted side-by-side (the mystery stripe).
  for (const [lab, m] of tabs) {
    try {
      if (!m.view || m.discarded) continue;
      if (m.view.webContents.isDestroyed()) { m.view = null; m.discarded = true; continue; }
      const vis = !modalHidden && lab === focused;
      m.view.setVisible(vis);
      if (vis) sizeView(m.view);
      // Focused view runs full-speed (rAF/video/shaders); background views
      // stay throttled so 6 live tabs don't burn the GPU. The pending
      // (swap-on-ready) view is exempt — throttling it is what stalled first
      // paint on animation-heavy pages.
      try { m.view.webContents.setBackgroundThrottling(!vis && lab !== pendingFocus); } catch {}
    } catch (e) {
      console.error(`[continua] layout failed for ${lab}: ${e?.message || e}`);
      try { m.view = null; m.discarded = true; } catch {}
    }
  }
  const sig = `${width}x${height} rail=${rw} chromeH=${ch} studio=${studio} focused=${focused} live=${[...tabs.values()].filter(t => !t.discarded && t.view).length}`;
  if (sig !== lastLayoutSig) { lastLayoutSig = sig; console.error(`[continua] layout ${sig}`); }
}

function makeView(meta) {
  const partition = meta.incognito ? `incognito-${meta.label}` : activePartition();
  const view = new WebContentsView({ webPreferences: {
    partition, contextIsolation: true, sandbox: true, nodeIntegration: false,
    // NOTE: throttling is managed per-view in layoutViews (focused = full
    // speed). Leaving it true here starves hidden loading views of rAF/
    // timers, so animation-heavy pages compile shaders with no frames flowing
    // and first paint takes forever (the black-canvas report).
    backgroundThrottling: false,
  }});
  view.webContents.setZoomFactor((meta.zoom || 100) / 100);
  // Renderer death (OOM-killed on small boxes after heavy sessions like
  // Pinterest) paints a black canvas. Background tabs are discarded to
  // metadata (no point reloading what the OOM killer will take again);
  // the focused tab reloads twice, then lands on a crash page with retry.
  // Events from pruned/closed views are ignored (no phantom reloads).
  let crashReloads = 0;
  let loadArmed = false; // paint-probe armed once per view (see did-finish-load)
  const gone = (_e, details) => {
    if (m.discarded || !m.view) return; // pruned or closed — not a crash
    console.error(`[continua] renderer gone for ${meta.label} (${meta.url}): ${details?.reason || "unknown"}`);
    if (meta.label !== focused) {
      try { chrome.contentView.removeChildView(m.view); } catch {}
      m.view = null; m.discarded = true;
      scheduleSave();
      return;
    }
    if (crashReloads < 2) {
      crashReloads++;
      try { view.webContents.reload(); } catch {}
    } else {
      view.webContents.loadURL(`${CRASH_URL}?u=${encodeURIComponent(meta.history[meta.idx] || meta.url || "")}`).catch(() => {});
    }
  };
  view.webContents.on("render-process-gone", gone);
  view.webContents.on("unresponsive", () => console.error(`[continua] unresponsive: ${meta.label} (${meta.url})`));
  view.webContents.on("responsive", () => console.error(`[continua] responsive again: ${meta.label}`));
  view.webContents.on("did-finish-load", () => {
    if (tabs.get(meta.label)?.view !== view || view.webContents.isDestroyed()) return;
    meta.title = view.webContents.getTitle() || meta.title;
    if (meta.pendingScroll) { view.webContents.executeJavaScript(`window.scrollTo(0, ${meta.pendingScroll});`).catch(() => {}); meta.pendingScroll = null; }
    if (!meta.incognito && isWeb(meta.url)) store?.appendHistory(meta.url, meta.title);
    scheduleSave();
    // Paint-aware swap: did-finish-load fires before first paint on
    // shader-heavy pages (WebGL/canvas/video), so swapping immediately shows
    // a black canvas while the compositor catches up. Wait for frames to
    // actually flow instead — double-rAF resolves only when unthrottled
    // frames are produced. Capped so slow pages still resolve; the 4s
    // safety timeout in activate() remains the absolute fallback.
    if (pendingFocus !== meta.label || loadArmed) return;
    loadArmed = true;
    const probe = `new Promise((res) => { let n = 0; const tick = () => { if (++n >= 2) res(1); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); setTimeout(() => res(0), ${FRAME_WAIT_MS}); })`;
    view.webContents.executeJavaScript(probe, true).then(
      () => swapIfPending(meta.label),
      () => swapIfPending(meta.label),
    );
  });
  // Offline / DNS failures render a friendly local page with retry — never white.
  view.webContents.on("did-fail-load", (_e, code, desc, url, isMain) => {
    if (!isMain || code === -3 /* aborted */) return;
    if (url.startsWith("file://")) {
      console.error(`[continua] content file load failed ${code} ${desc} ${url}`);
      return;
    }
    console.error(`[continua] content load failed ${code} ${desc} ${url}`);
    view.webContents.loadURL(`${OFFLINE_URL}?u=${encodeURIComponent(url)}`).catch(() => {});
  });
  // In-page link clicks (and SPA pushState/hash navs) must grow the same
  // history stack the back/forward buttons read — previously only the
  // address bar grew it, so back stayed disabled after any click. Programmatic
  // loads set meta.expectNav first and are consumed, not double-pushed.
  const recordNav = (url, inPage) => {
    if (!url || url === START_URL) return;
    if (meta.expectNav) {
      if (meta.expectNav === url || inPage) { meta.expectNav = null; meta.history[meta.idx] = url; }
      else { meta.expectNav = null; }
    } else if (meta.history[meta.idx] !== url) {
      meta.history = meta.history.slice(0, meta.idx + 1).concat(url);
      meta.idx++;
    }
    meta.url = url;
    pushTabUpdated(meta.label);
    scheduleSave();
  };
  view.webContents.on("did-navigate", (_e, url) => recordNav(url === START_URL ? "continua://start" : url, false));
  view.webContents.on("did-navigate-in-page", (_e, url) => recordNav(url, true));
  view.webContents.on("page-title-updated", (_e, title) => { meta.title = title; pushTabUpdated(meta.label); });
  chrome.contentView.addChildView(view);
  // Paint while loading: a view with no bounds may never composite a frame
  // until shown, which reads as "black canvas that takes forever" on heavy
  // sites. Size it now (still hidden); layoutViews() owns visibility.
  sizeView(view);
  try { view.setVisible(false); } catch {}
  try { view.webContents.setBackgroundThrottling(false); } catch {}
  return view;
}

// First-frames signal for the paint-aware swap (see did-finish-load).
const FRAME_WAIT_MS = 1200;
// Push navigation/title updates to the React chrome (the Electron
// equivalent of Tauri's tab:navigated / tab:title-changed events). Without
// this the strip, address bar and back/forward buttons go stale the moment
// a page is clicked instead of typed.
function pushTabUpdated(lab) {
  try {
    const m = tabs.get(lab);
    if (!m || !chrome || chrome.isDestroyed()) return;
    chrome.webContents.send("tab-updated", { label: lab, url: m.url, title: m.title });
  } catch {}
}
function swapIfPending(lab) {
  if (pendingFocus !== lab) return; // superseded click — stay on current page
  const m = tabs.get(lab);
  if (!m || !m.view || m.discarded) { pendingFocus = null; return; }
  try {
    if (m.view.webContents.isDestroyed()) { m.view = null; m.discarded = true; pendingFocus = null; return; }
  } catch { pendingFocus = null; return; }
  pendingFocus = null;
  focused = lab;
  m.lastActive = Date.now();
  prunePool(); layoutViews();
}

// Content-area geometry shared by layoutViews (visible views) and makeView
// (hidden loading views need bounds too, or they never paint).
// CONTENT_GAP leaves a breathing strip of window background between the
// chrome and the page, so content never feels glued to the navbar.
const CONTENT_GAP = 6;
function sizeView(view) {
  if (!chrome || !view) return;
  try {
    const { width, height } = chrome.getContentBounds();
    const ch = studio ? 0 : CHROME_H;
    const rw = studio ? 0 : TAB_RAIL_W;
    const y = ch + (studio ? 0 : CONTENT_GAP);
    view.setBounds({ x: rw, y, width: Math.max(200, width - rw), height: Math.max(200, height - y) });
  } catch {}
}

function prunePool() {
  const victims = pickVictims([...tabs.entries()], focused, {
    poolK: POOL_K, rss: rss(), rssBudget: RSS_BUDGET, discardAfterMs: DISCARD_AFTER_MS,
  });
  for (const lab of victims) {
    const m = tabs.get(lab);
    if (!m?.view) continue;
    try { m.view.webContents.executeJavaScript("window.scrollY").then(y => { m.scrollY = y; }).catch(() => {}); } catch {}
    chrome.contentView.removeChildView(m.view);
    m.view.webContents.close();
    m.view = null; m.discarded = true;
  }
}

function ensureLive(lab) {
  const m = tabs.get(lab);
  if (!m) return null;
  if (!m.view || m.discarded) {
    m.view = makeView(m);
    m.discarded = false;
    if (m.scrollY) m.pendingScroll = m.scrollY;
    m.view.webContents.loadURL(resolveUrl(m.history[m.idx] || m.url)).catch(() => {});
  }
  return m;
}

// Opt-in same-site auto-group (default off — suggestions stay suggest-only).
function maybeAutoGroup(meta) {
  if (!meta || meta.incognito || !/^https?:\/\//i.test(meta.url || "")) return;
  let on = false;
  try { on = !!store.getConfig?.().auto_group_site; } catch {}
  if (!on) return;
  let d = "";
  try { d = new URL(meta.url).hostname.replace(/^www\./, ""); } catch { return; }
  if (!d) return;
  const same = (u) => { try { return new URL(u).hostname.replace(/^www\./, "") === d; } catch { return false; } };
  const sibs = [...tabs.values()].filter((t) => !t.incognito && t.label !== meta.label && same(t.url));
  if (!sibs.length) return;
  let gid = sibs.find((t) => t.group)?.group || null;
  if (!gid) {
    try {
      const known = getGroups().find((g) => g.name === d);
      gid = known ? known.id : createGroup(d).id;
    } catch { return; }
  }
  meta.group = gid;
  scheduleSave();
}

function openTab(url, incognito = false) {
  const target = resolveUrl(url);
  const startish = target === START_URL;
  const lab = label(incognito ? "tab-incog" : "tab");
  const meta = { label: lab, url: startish ? "continua://start" : target, title: startish ? "New Tab" : target, history: [target], idx: 0, scrollY: 0, pinned: false, group: null, incognito, zoom: 100, discarded: false, lastActive: Date.now(), view: null };
  // enforce pool budget before adding
  if ([...tabs.values()].filter(m => !m.discarded).length >= POOL_K) prunePool();
  meta.view = makeView(meta);
  tabs.set(lab, meta); order.push(lab);
  maybeAutoGroup(meta); // opt-in same-site grouping (default off)
  meta.view.webContents.loadURL(target).catch(() => {});
  activate(lab);
  if (!incognito) { store?.enqueue({ op: "upsert_tab", label: lab, url: meta.url, title: meta.title }); scheduleSave(); }
  return lab;
}

function activate(lab) {
  const m = tabs.get(lab);
  if (!m) return;
  // capture outgoing scroll best-effort
  const cur = focused && tabs.get(focused);
  if (cur?.view && !cur.discarded) cur.view.webContents.executeJavaScript("window.scrollY").then(y => { cur.scrollY = y; }).catch(() => {});
  m.lastActive = Date.now();
  if (m.view && !m.discarded) {
    // Live tab: instant swap, no flash possible.
    pendingFocus = null;
    focused = lab;
    prunePool(); layoutViews();
    return;
  }
  // Discarded tab: keep the old page visible until the new view finishes
  // loading (swap-on-ready). White flash eliminated; safety timeout forces
  // the swap even if load events misbehave.
  ensureLive(lab);
  pendingFocus = lab;
  setTimeout(() => {
    if (pendingFocus === lab) { pendingFocus = null; focused = lab; prunePool(); layoutViews(); }
  }, 4000);
}

function closeTab(lab) {
  const m = tabs.get(lab);
  if (!m) return;
  if (m.view) { try { chrome.contentView.removeChildView(m.view); m.view.webContents.close(); } catch {} }
  if (m.incognito) { try { session.fromPartition(`incognito-${lab}`).clearStorageData(); } catch {} }
  else {
    const ring = closedRing();
    ring.unshift({ label: lab, url: m.url, title: m.title }); // vault-free: plain ring, per-profile
    if (ring.length > 25) ring.length = 25;
  }
  tabs.delete(lab); order = order.filter(x => x !== lab);
  store?.enqueue({ op: "close_tab", label: lab });
  if (focused === lab) { focused = order[order.length - 1] || null; if (focused) activate(focused); }
  scheduleSave();
}

// ---------- studio mode (clean recording) ----------
function setStudio(on, source) {
  studio = !!on;
  try {
    if (studioPill && !studioPill.isDestroyed()) studioPill.close();
    studioPill = null;
    if (studio) {
      studioPill = new BrowserWindow({
        width: 230, height: 44, frame: false, transparent: true,
        alwaysOnTop: true, skipTaskbar: true, resizable: false,
        webPreferences: { preload: path.join(__dirname, "studio-preload.js"), contextIsolation: true, sandbox: true },
      });
      studioPill.loadFile(path.join(__dirname, "studio-pill.html")).catch(() => {});
      studioPill.on("closed", () => { studioPill = null; });
    }
  } catch (e) { console.error(`[continua] studio pill: ${e?.message || e}`); }
  try { chrome?.webContents.send("studio", studio); } catch {}
  layoutViews();
  console.error(`[continua] studio ${studio ? "on" : "off"} (via ${source})`);
}

// ---------- chrome window ----------
function createChrome() {
  chrome = new BrowserWindow({ width: 1280, height: 800, backgroundColor: "#0a0a0a", title: "Continua",
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, sandbox: true } });
  const dist = path.join(__dirname, "..", "desktop", "dist");
  const indexHtml = path.join(dist, "index.html");
  console.error(`[continua] loading chrome from ${indexHtml} (exists=${fs.existsSync(indexHtml)})`);
  chrome.webContents.on("did-fail-load", (_e, code, desc, url) => console.error(`[continua] chrome did-fail-load ${code} ${desc} ${url}`));
  chrome.webContents.on("did-finish-load", () => console.error("[continua] chrome did-finish-load"));
  chrome.webContents.on("console-message", (_e, _lvl, msg) => console.error(`[continua] chrome console: ${(msg || "").slice(0, 300)}`));
  chrome.webContents.on("preload-error", (_e, _preload, err) => console.error(`[continua] preload-error: ${err}`));
  chrome.loadFile(indexHtml).catch((e) => {
    // Never load a website into the chrome window — that would destroy the UI.
    console.error("chrome load failed:", e?.message || e);
  });
  chrome.on("resize", layoutViews);
  chrome.on("move", layoutViews);
  chrome.on("closed", () => { persistNow(); tabs.forEach(m => { try { m.view?.webContents?.close(); } catch {} }); });
}

// ---------- IPC: snake_case (matches tauri-bridge), kebab aliases via preload ----------
ipcMain.handle("continua", async (_evt, op, args = {}) => {
  const m = args.label ? tabs.get(args.label) : focused ? tabs.get(focused) : null;
  switch (op) {
    case "open_tab": return openTab(args.url || START_URL, false);
    case "list_tabs": return [...tabs.entries()].map(([lab, t]) => ({ label: lab, url: t.url, title: t.title, pinned: !!t.pinned, group: t.group || null, incognito: !!t.incognito, discarded: !!t.discarded }));
    case "set_tab_group": {
      const t = tabs.get(args.label);
      if (t) { t.group = typeof args.group === "string" && args.group ? args.group : null; scheduleSave(); }
      return t?.group || null;
    }
    case "list_groups": return listGroups();
    case "create_group": return createGroup(args.name);
    case "open_incognito_tab": return openTab(args.url || START_URL, true);
    case "close_tab": closeTab(args.label); return;
    case "activate_tab": activate(args.label); return;
    case "navigate_tab": { const t = tabs.get(args.label); if (t) { const target = resolveUrl(args.url); t.url = target === START_URL ? "continua://start" : target; t.history = t.history.slice(0, t.idx + 1).concat(target); t.idx++; t.expectNav = target; ensureLive(args.label).view.webContents.loadURL(target).catch(() => {}); pushTabUpdated(args.label); } return; }
    case "reload_tab": {
      const t = args.label ? tabs.get(args.label) : focused ? tabs.get(focused) : null;
      if (!t) return;
      // Sleeping (discarded) tabs have no view to reload — wake them with a
      // fresh load of the current entry instead of silently doing nothing.
      if (t.view && !t.discarded) {
        try { t.view.webContents.reload(); } catch {}
      } else {
        // Background wake: preload hidden (no focus steal — swap-on-ready
        // only engages when reloading the focused tab).
        try {
          const live = ensureLive(t.label);
          live.view.webContents.loadURL(resolveUrl(live.history[live.idx] || live.url)).catch(() => {});
          if (t.label === focused) pendingFocus = t.label;
        } catch {}
      }
      return;
    }
    case "back_tab": case "forward_tab": { // history-aware within pooled view
      const t = tabs.get(args.label); if (!t) return;
      const ni = op === "back_tab" ? t.idx - 1 : t.idx + 1;
      if (ni >= 0 && ni < t.history.length) { t.idx = ni; t.url = t.history[ni]; t.expectNav = t.url; ensureLive(args.label).view.webContents.loadURL(t.url).catch(() => {}); pushTabUpdated(args.label); }
      else { const wc = t.view?.webContents; if (wc) op === "back_tab" ? wc.goBack() : wc.goForward(); }
      return; }
    case "nav_state": { const t = tabs.get(args.label); return { back: (t?.idx ?? 0) > 0, forward: (t ? t.idx < t.history.length - 1 : false) }; }
    case "set_tab_pinned": { const t = tabs.get(args.label); if (t) t.pinned = !!args.pinned; scheduleSave(); return; }
    case "find_in_tab": case "find_next": { m?.view?.webContents.findInPage(args.query || args.text || ""); return { count: 0, idx: -1 }; }
    case "find_prev": { m?.view?.webContents.findInPage(args.query || "", { forward: false }); return { count: 0, idx: -1 }; }
    case "stop_find": m?.view?.webContents.stopFindInPage("clearSelection"); return;
    case "zoom_tab": { const t = tabs.get(args.label); if (t) { t.zoom = typeof args.value === "number" ? Math.min(200, Math.max(50, args.value)) : Math.min(200, Math.max(50, (t.zoom || 100) + (args.step || 0))); t.view?.webContents.setZoomFactor(t.zoom / 100); return t.zoom; } return 100; }
    case "reader_toggle": case "dark_toggle": return; // v1 no-op (reader ships Phase 3)
    case "set_search_engine": {
      const customs = (store.getConfig ? store.getConfig().custom_engines : []) || [];
      if (!["google", "duckduckgo", "bing", "brave"].includes(args.engine) && !customs.find(e => e.id === args.engine)) return { error: "unknown engine" };
      return store.patchConfig({ search_engine: args.engine });
    }
    case "get_browser_config": case "getBrowserConfig": return store.getConfig();
    case "update_config": return store.patchConfig(args.patch || {});
    case "set_link_preview": return store.patchConfig({ link_preview: !!args.enabled });
    case "set_immersive": setStudio(typeof args.enabled === "boolean" ? args.enabled : !studio, "ipc"); return;
    case "update_tab_layout": layoutViews(); return;
    case "toggle_devtools": {
      const t = args.label ? tabs.get(args.label) : focused ? tabs.get(focused) : null;
      try {
        if (t?.view) {
          if (t.view.webContents.isDevToolsOpened()) t.view.webContents.closeDevTools();
          else t.view.webContents.openDevTools({ mode: "detach" });
        } else chrome?.webContents.toggleDevTools();
      } catch {}
      return;
    }
    case "set_chrome_height": CHROME_H = args.height || args.chromeH || 96; layoutViews(); return;
    case "set_tab_rail": TAB_RAIL_W = args.enabled ? TAB_RAIL_WIDTH_PX : 0; layoutViews(); return;
    case "chrome_modal": {
      // Snapshot cover support: delay the hide briefly so a cover snapshot
      // requested alongside the open captures the VISIBLE page, not black.
      clearTimeout(modalTimer);
      if (args.open) {
        modalTimer = setTimeout(() => { modalHidden = true; layoutViews(); }, MODAL_HIDE_DELAY_MS);
      } else {
        modalHidden = false; layoutViews();
      }
      return;
    }
    case "snapshot_tab": {
      const t = args.label ? tabs.get(args.label) : focused ? tabs.get(focused) : null;
      if (!t?.view) return { error: "no-tab" };
      try {
        const img = await t.view.webContents.capturePage();
        return { dataUrl: img.toDataURL() };
      } catch (e) { return { error: String(e?.message || e) }; }
    }
    case "save_session": return store.saveSession(args.tabs || [...tabs.values()].map(t => ({ label: t.label, url: t.url, title: t.title, group: t.group || null })), args.active ?? focused);
    case "load_session": return store.loadSession();
    case "restore_session": { // merge, never destructive replace
      const ids = store.restoreSession(args.id) || [];
      const out = [];
      for (const t of ids) { if ([...tabs.values()].find(x => x.url === t.url)) continue; const lab = openTab(t.url); out.push({ label: lab, url: t.url, title: t.title || t.url }); }
      return out; }
    case "reopen_last_closed": { const t = closedRing().shift(); if (!t) return null; const lab = openTab(t.url); return { label: lab, url: t.url, title: t.title }; }
    case "export_session": return JSON.stringify({ tabs: [...tabs.values()].map(t => ({ url: t.url, title: t.title })), active: focused });
    case "import_session_json": { try { const d = JSON.parse(args.raw); (d.tabs || []).forEach(t => openTab(t.url)); return (d.tabs || []).length; } catch { return 0; } }
    case "browse_sessions": return store.browseSessions();
    case "list_workspaces": return store.listWorkspaces();
    case "save_workspace": return store.saveWorkspace(args.name, [...tabs.values()].filter(t => !t.incognito).map(t => ({ url: t.url, title: t.title })));
    case "open_workspace": { const ws = store.openWorkspace(args.name); if (!ws) return null; [...tabs.keys()].forEach(closeTab); return ws.map(t => ({ label: openTab(t.url), url: t.url, title: t.title })); }
    case "delete_workspace": return store.deleteWorkspace(args.name);
    case "get_device_info": return { os: os.platform(), arch: os.arch(), hostname: os.hostname(), display_resolution: "unknown", capabilities: { chromium: true, pool_k: POOL_K } };
    case "register_device": {
      const url = apiBase(), token = store.cfg.capability_token;
      if (url && token) {
        try {
          const res = await fetch(`${url}/api/devices/register`, { method: "POST", headers: authHeaders(),
            body: JSON.stringify({ deviceName: os.hostname(), fingerprint: store.cfg.device_id, platform: `${os.platform()}-${os.arch()}`, browser: "continua", capabilities: { chromium: true } }) });
          if (res.ok) { const b = await res.json(); return { deviceId: b?.data?.deviceId || store.cfg.device_id, trustLevel: b?.data?.trustLevel || "known", isNew: !!b?.data?.isNew }; }
        } catch {}
      }
      return { deviceId: store.cfg.device_id, trustLevel: "local", isNew: false };
    }
    case "list_devices": {
      const url = apiBase(), token = store.cfg.capability_token;
      if (!url || !token) return [];
      try {
        const res = await fetch(`${url}/api/devices`, { headers: { authorization: `Bearer ${token}` } });
        if (!res.ok) return [];
        const b = await res.json();
        return b?.data || [];
      } catch { return []; }
    }
    case "pair_device": {
      const pin = (args.pin || "").trim().toUpperCase();
      const url = apiBase();
      if (!pin) return "expired";
      if (!url) { // offline dev fallback (no server configured)
        store.cfg.capability_token = `dev-${pin}-${store.cfg.device_id}`; store._saveCfg(); return "ok";
      }
      try {
        // Poll up to ~20s for phone approval (GET returns pending/approved + capabilityToken).
        for (let i = 0; i < 10; i++) {
          const res = await fetch(`${url}/api/connect/pair?pin=${encodeURIComponent(pin)}`);
          if (!res.ok) return "expired";
          const b = await res.json();
          if (b?.status === "approved" && b?.data?.capabilityToken) {
            store.cfg.capability_token = b.data.capabilityToken; store._saveCfg();
            void heartbeat();
            return "ok";
          }
          if (b?.status === "expired") return "expired";
          await new Promise(r => setTimeout(r, 2000));
        }
        return "pending";
      } catch { return "offline"; }
    }
    case "set_continua_url": store.cfg.continua_url = args.url; store._saveCfg(); return;
    case "get_continua_url": return store.cfg.continua_url || "continuaos.cc";
    case "sync_session": persistNow(); return await flushSync();
    case "pull_session": return await pullMerge();
    case "sync_status": return { paired: !!store.cfg.capability_token, deviceId: store.cfg.device_id, serverDeviceId: "", trustLevel: store.cfg.capability_token ? "known" : "local", lastVersion: syncVersion, pending: store.queueDepth ? store.queueDepth() : store.pendingOps().length, lastSyncAt, lastSyncError };
    case "get_history": return store.getHistory();
    case "clear_history": store.clearHistory(); return;
    case "search_suggestions": return store.searchHistory(args.query || args.term || "").map(h => h.url);
    case "get_bookmarks": return store.getBookmarks();
    case "add_bookmark": return store.addBookmark(args.url, args.title);
    case "remove_bookmark": return store.removeBookmark(args.url);
    case "mark_vault": case "unmark_vault": return null; // vault removed (ADR-008)
    case "open_app_window": { const w = new BrowserWindow({ width: 1000, height: 700 }); w.loadURL(args.url); return; }
    case "new_tab_url": return store.getConfig().homepage || START_URL;
    case "get_active_url": return m?.url || START_URL;
    case "pool_state": return { live: [...tabs.values()].filter(t => !t.discarded).length, discarded: [...tabs.values()].filter(t => t.discarded).length, rssMb: (rss() / 1048576).toFixed(1), budgetMb: (RSS_BUDGET / 1048576).toFixed(0), active: focused, k: POOL_K, gpu: gpuStatus(), pendingFocus };
    case "list_downloads": return [...downloads.values()].reverse().slice(0, 50);
    case "open_download": { const d = downloads.get(args.id); if (d?.path) shell.openPath(d.path).catch(() => {}); return; }
    case "reveal_download": { const d = downloads.get(args.id); if (d?.path) shell.showItemInFolder(d.path); return; }
    case "cancel_download": { const d = downloads.get(args.id); try { d?.item?.cancel(); } catch {} return; }
    case "clear_downloads": { for (const [id, d] of downloads) if (d.state === "completed" || d.state === "cancelled" || d.state === "failed") downloads.delete(id); return [...downloads.values()].reverse(); }
    case "set_tab_muted": { const t = tabs.get(args.label); if (t?.view) t.view.webContents.setAudioMuted(!!args.muted); if (t) t.muted = !!args.muted; return !!args.muted; }
    case "tab_audio_state": {
      const out = {};
      for (const [lab, t] of tabs) {
        try { out[lab] = { audible: !!t.view?.webContents?.isCurrentlyAudible(), muted: !!t.view?.webContents?.isAudioMuted() || !!t.muted, discarded: !!t.discarded }; }
        catch { out[lab] = { audible: false, muted: !!t.muted, discarded: !!t.discarded }; }
      }
      return out;
    }
    // Local tab intelligence (ADR-010): on-device grouping + sleeping tabs.
    case "suggest_groups": {
      const { suggestGroups, findDuplicates } = require("./groups");
      const live = [...tabs.entries()].map(([lab, t]) => ({ label: lab, url: t.url, title: t.title, incognito: !!t.incognito }));
      return { groups: suggestGroups(live), duplicates: findDuplicates(live) };
    }
    case "apply_group": {
      const labels = Array.isArray(args.labels) ? args.labels.filter((l) => tabs.has(l)) : [];
      if (!labels.length) return { error: "no-tabs" };
      let groupId = args.group || null;
      if (args.name && !groupId) {
        const g = createGroup(args.name);
        groupId = g.id;
      }
      for (const lab of labels) { const t = tabs.get(lab); if (t) t.group = groupId; }
      scheduleSave();
      return { group: groupId, applied: labels.length };
    }
    case "sleep_tab": {
      // Discard one view to metadata now (wake = click/activate rehydrates).
      const t = tabs.get(args.label);
      if (!t || !t.view || t.label === focused) return { error: "not-sleepable" };
      try { t.view.webContents.executeJavaScript("window.scrollY").then((y) => { t.scrollY = y; }).catch(() => {}); } catch {}
      try { chrome.contentView.removeChildView(t.view); t.view.webContents.close(); } catch {}
      t.view = null; t.discarded = true;
      scheduleSave(); layoutViews();
      return { ok: true };
    }
    case "tab_metrics": {
      // Per-tab memory via Chromium process metrics (powers the Tabs panel).
      let metrics = [];
      try { metrics = app.getAppMetrics() || []; } catch {}
      const byPid = new Map(metrics.map((x) => [x.pid, x]));
      const out = {};
      for (const [lab, t] of tabs) {
        let mb = null;
        try {
          const pid = t.view?.webContents?.getOSProcessId?.();
          const mx = pid && byPid.get(pid);
          const bytes = mx?.memory?.privateBytes ?? mx?.memory?.workingSetSize ?? null;
          mb = typeof bytes === "number" ? Math.round(bytes / 1048576) : null;
        } catch { /* gone */ }
        out[lab] = { mb, discarded: !!t.discarded };
      }
      return out;
    }
    case "screenshot_tab": {
      const t = args.label ? tabs.get(args.label) : focused ? tabs.get(focused) : null;
      if (!t?.view) return { error: "no-tab" };
      try {
        const img = await t.view.webContents.capturePage();
        const dir = app.getPath("pictures");
        try { fs.mkdirSync(dir, { recursive: true }); } catch {}
        const p = uniqueDownloadPath(dir, `continua-${Date.now()}.png`);
        fs.writeFileSync(p, img.toPNG());
        return { path: p };
      } catch (e) { return { error: String(e?.message || e) }; }
    }
    case "print_tab": {
      const t = args.label ? tabs.get(args.label) : focused ? tabs.get(focused) : null;
      if (t?.view) t.view.webContents.print({ silent: false, printBackground: true });
      return;
    }
    case "reader_toggle": return await toggleReader(args.label);
    case "login_status": return { available: loginsAvailable() };
    case "list_logins": return getLogins().map(l => ({ id: l.id, origin: l.origin, username: l.username, addedAt: l.addedAt }));
    case "add_login": {
      if (!loginsAvailable()) return { error: "unavailable" };
      const origin = originOf(args.origin || "");
      if (!origin || !args.username || !args.password) return { error: "bad-args" };
      const crypto = require("crypto");
      const id = "lg-" + crypto.randomBytes(6).toString("hex");
      const list = getLogins().filter(l => !(l.origin === origin && l.username === args.username));
      list.push({ id, origin, username: args.username, passwordEnc: safeStorage.encryptString(args.password).toString("base64"), addedAt: Date.now() });
      store.cfg.logins = list; store._saveCfg();
      return { id };
    }
    case "remove_login": {
      store.cfg.logins = getLogins().filter(l => l.id !== args.id);
      store._saveCfg();
      return true;
    }
    case "fill_login": {
      // User-triggered only. Matches the active tab's origin exactly.
      const t = args.label ? tabs.get(args.label) : focused ? tabs.get(focused) : null;
      const origin = t ? originOf(t.url) : null;
      if (!origin) return { error: "no-origin" };
      const login = getLogins().find(l => l.id === args.id && l.origin === origin) || getLogins().find(l => l.origin === origin);
      if (!login) return { error: "no-login" };
      if (!loginsAvailable()) return { error: "unavailable" };
      let pass = "";
      try { pass = safeStorage.decryptString(Buffer.from(login.passwordEnc, "base64")); } catch { return { error: "decrypt" }; }
      try {
        const r = await t.view.webContents.executeJavaScript(FILL_JS(login.username, pass));
        return { ok: r === "filled", detail: r };
      } catch { return { error: "fill" }; }
    }
    case "list_extensions": return listExtensions();
    case "load_extension": return await loadExtension(args.path);
    case "remove_extension": return removeExtension(args.id);
    case "set_extension_enabled": {
      store.cfg.extension_state = store.cfg.extension_state || {};
      store.cfg.extension_state[`${activeProfileId}:${args.id}`] = !!args.enabled;
      store._saveCfg();
      const ses = session.fromPartition(activePartition());
      if (args.enabled) {
        const e = getExtList().find(x => x.id === args.id);
        if (e?.path) return await loadExtension(e.path);
        return { error: "no-path" };
      }
      try { ses.removeExtension(args.id); } catch {}
      return true;
    }
    case "extensions_dir": return extDir();
    case "list_profiles": return { activeId: activeProfileId, profiles: profileState.profiles };
    case "create_profile": {
      const p = profiles.createProfile(userDataPath, profileState, args.name || "Untitled");
      return { activeId: activeProfileId, profiles: profileState.profiles, created: p };
    }
    case "rename_profile": {
      const p = profiles.renameProfile(userDataPath, profileState, args.id, args.name);
      return p ? { activeId: activeProfileId, profiles: profileState.profiles } : { error: "not-found" };
    }
    case "delete_profile": {
      if (args.id === activeProfileId) return { error: "active" };
      const r = profiles.deleteProfile(userDataPath, profileState, args.id);
      if (r.error) return r;
      return { activeId: activeProfileId, profiles: profileState.profiles };
    }
    case "switch_profile": return await switchProfile(args.id);
    case "set_profile_theme": {
      const p = profiles.setProfileTheme(userDataPath, profileState, args.id, args.themeId);
      return p ? { activeId: activeProfileId, profiles: profileState.profiles } : { error: "not-found" };
    }
    case "window_control": if (args.action === "minimize") chrome.minimize(); else if (args.action === "toggleMaximize") chrome.isMaximized() ? chrome.unmaximize() : chrome.maximize(); else if (args.action === "close") chrome.close(); else if (args.action === "isMaximized") return chrome.isMaximized(); return;
    default: return null;
  }
});

// ---------- logins (Mozilla model: OS-keyring-sealed key + encrypted DB) ----------
// Secrets are encrypted with safeStorage (Keychain/libsecret/DPAPI) — only
// ciphertext touches disk (store.cfg.logins). No background sniffing: fills
// are always user-triggered from the palette or Settings.
function loginsAvailable() {
  try { return safeStorage.isEncryptionAvailable(); } catch { return false; }
}
function getLogins() {
  try { return Array.isArray(store?.cfg?.logins) ? store.cfg.logins : []; } catch { return []; }
}
function originOf(u) {
  try {
    const x = new URL(u);
    return x.protocol === "http:" || x.protocol === "https:" ? x.origin : null;
  } catch { return null; }
}
const FILL_JS = (user, pass) => `
(() => {
  const norm = (s) => (s || "").toLowerCase();
  const inputs = [...document.querySelectorAll('input')];
  const passEl = inputs.find(i => (i.type || "").toLowerCase() === "password" && i.offsetParent !== null) || inputs.find(i => (i.type || "").toLowerCase() === "password");
  if (!passEl) return "no-password-field";
  const form = passEl.form;
  const scope = form ? [...form.querySelectorAll('input')] : inputs;
  const userEl = scope.find(i => i !== passEl && /user|name|email|login|account/i.test((i.name || "") + (i.id || "") + (i.type || "") + (i.getAttribute("autocomplete") || "")))
    || scope.find(i => i !== passEl && ((i.type || "").toLowerCase() === "text" || (i.type || "").toLowerCase() === "email"));
  const set = (el, v) => {
    el.focus();
    el.value = v;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };
  if (userEl) set(userEl, ${JSON.stringify(user)});
  set(passEl, ${JSON.stringify(pass)});
  return "filled";
})()`;

// ---------- reader mode (readability-lite, per-tab toggle) ----------
const readerCache = new Map(); // label -> original HTML
const READER_EXTRACT = `(() => {
  const pick = document.querySelector('article') ||
    [...document.querySelectorAll('main,div,section')].sort((a,b) =>
      (b.innerText||'').length - (a.innerText||'').length)[0] || document.body;
  const title = (document.querySelector('h1')?.innerText || document.title || '').slice(0,200);
  const text = (pick.innerText || '').trim().slice(0, 60000);
  return JSON.stringify({ title, text });
})()`;
function esc(s) { return (s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
async function toggleReader(lab) {
  const t = tabs.get(lab);
  if (!t?.view) return;
  try {
    if (readerCache.has(lab)) {
      await t.view.webContents.loadURL(t.url).catch(() => {});
      readerCache.delete(lab);
      return;
    }
    const raw = await t.view.webContents.executeJavaScript(READER_EXTRACT).catch(() => null);
    if (!raw) return;
    const { title, text } = JSON.parse(raw);
    if (!text || text.length < 300) return; // not an article — stay put
    const orig = await t.view.webContents.executeJavaScript("document.documentElement.outerHTML").catch(() => null);
    if (orig) readerCache.set(lab, true);
    const html = `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html><html><head><meta charset=utf-8><title>${esc(title)}</title><style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 20px;line-height:1.7;font-size:18px;color:#1a1a1a;background:#faf9f6}h1{line-height:1.3}p{margin:0 0 1em;white-space:pre-wrap}</style></head><body><h1>${esc(title)}</h1><p>${esc(text)}</p></body></html>`)}`;
    await t.view.webContents.loadURL(html);
  } catch {}
}

// ---------- extensions (Chromium loadExtension + autoload dir, per-profile) ----------
// Drop unpacked extensions (e.g. Bitwarden) into
//   <userData>/profiles/<profileId>/extensions/<name>/manifest.json
// and they load automatically on every boot for that profile only.
// Per-profile on/off switches persist in cfg.extension_state as "<profileId>:<extId>".
function extDir() {
  try {
    if (userDataPath) return path.join(profiles.profileDir(userDataPath, activeProfileId), "extensions");
  } catch {}
  return path.join(app.getPath("userData"), "extensions");
}
function extListKey() { return `extensions:${activeProfileId}`; }
function getExtList() {
  try {
    // Migrate legacy global list into Personal once.
    if (Array.isArray(store?.cfg?.extensionsByProfile?.[activeProfileId])) return store.cfg.extensionsByProfile[activeProfileId];
    if (activeProfileId === "personal" && Array.isArray(store?.cfg?.extensions)) return store.cfg.extensions;
    return [];
  } catch { return []; }
}
function setExtList(list) {
  try {
    store.cfg.extensionsByProfile = store.cfg.extensionsByProfile || {};
    store.cfg.extensionsByProfile[activeProfileId] = list;
    store._saveCfg();
  } catch {}
}
function scanExtensionDirs() {
  const dir = extDir();
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  let out = [];
  try {
    out = fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => path.join(dir, d.name))
      .filter(p => { try { return fs.existsSync(path.join(p, "manifest.json")); } catch { return false; } });
  } catch {}
  return out;
}
function isExtEnabled(id) {
  try {
    const namespaced = store?.cfg?.extension_state?.[`${activeProfileId}:${id}`];
    if (typeof namespaced === "boolean") return namespaced;
    return store?.cfg?.extension_state?.[id] !== false;
  } catch { return true; }
}
function listExtensions() {
  try {
    const cfg = getExtList();
    return cfg.map(e => ({ id: e.id, name: e.name || e.id, path: e.path, enabled: isExtEnabled(e.id) }));
  } catch { return []; }
}
async function loadExtension(p) {
  try {
    const ses = session.fromPartition(activePartition());
    const ext = await ses.loadExtension(p, { allowFileAccess: true });
    const list = getExtList();
    if (!list.find(e => e.id === ext.id)) list.push({ id: ext.id, name: ext.name, path: p });
    setExtList(list);
    return { id: ext.id, name: ext.name };
  } catch (e) { return { error: String(e?.message || e) }; }
}
async function autoloadExtensions() {
  // Merge order: scanned dirs first (drop-in wins), then persisted leftovers.
  // Strictly per-profile: Work never sees Personal's extensions.
  const seen = new Set();
  const candidates = [
    ...scanExtensionDirs(),
    ...getExtList().map(e => e?.path).filter(Boolean),
  ];
  const ses = session.fromPartition(activePartition());
  for (const p of candidates) {
    if (seen.has(p)) continue;
    seen.add(p);
    try {
      if (!fs.existsSync(path.join(p, "manifest.json"))) continue;
      const ext = await ses.loadExtension(p, { allowFileAccess: true });
      if (!isExtEnabled(ext.id)) { try { ses.removeExtension(ext.id); } catch {} continue; }
      const list = getExtList();
      if (!list.find(e => e.id === ext.id)) list.push({ id: ext.id, name: ext.name, path: p });
      setExtList(list);
    } catch (e) { console.error(`[continua] extension autoload failed for ${p}: ${e?.message || e}`); }
  }
  try { store._saveCfg(); } catch {}
}
function removeExtension(id) {
  try {
    const ses = session.fromPartition(activePartition());
    try { ses.removeExtension(id); } catch {}
    setExtList(getExtList().filter(e => e.id !== id));
    return true;
  } catch { return false; }
}

// ---------- tab groups (persisted registry + per-tab assignment) ----------
const GROUP_COLORS = ["#0071e3", "#7c5cff", "#188038", "#e8710a", "#d92d20", "#0090a3"];
function getGroups() {
  try {
    const g = store?.getConfig ? store.getConfig().tab_groups : store?.state?.config?.tab_groups;
    return Array.isArray(g) ? g : [];
  } catch { return []; }
}
function saveGroups(groups) {
  try {
    if (store.patchConfig) store.patchConfig({ tab_groups: groups });
    else if (store.state?.config) { store.state.config.tab_groups = groups; store._saveSoon ? store._saveSoon() : store._save(); }
  } catch {}
}
function listGroups() { return getGroups(); }
function createGroup(name) {
  const clean = (name || "").trim().slice(0, 32) || "Untitled";
  const groups = getGroups();
  const crypto = require("crypto");
  const g = { id: "grp-" + crypto.randomBytes(4).toString("hex"), name: clean, color: GROUP_COLORS[groups.length % GROUP_COLORS.length] };
  groups.push(g);
  saveGroups(groups);
  return g;
}

function uniqueDownloadPath(dir, filename) {  const safe = (filename || "download").replace(/[\\/:*?"<>|]/g, "_").slice(0, 180) || "download";
  let p = path.join(dir, safe);
  if (!fs.existsSync(p)) return p;
  const ext = path.extname(safe), base = path.basename(safe, ext);
  for (let i = 1; i < 100; i++) { const q = path.join(dir, `${base} (${i})${ext}`); if (!fs.existsSync(q)) return q; }
  return path.join(dir, `${base}-${Date.now()}${ext}`);
}

function wireDownloads(ses) {
  ses.on("will-download", (_e, item) => {
    const id = `dl-${Date.now()}-${(dlSeq++).toString(36)}`;
    const filename = item.getFilename() || "download";
    const savePath = uniqueDownloadPath(app.getPath("downloads"), filename);
    item.savePath(savePath);
    const rec = { id, filename, path: savePath, url: item.getURL(), state: "progressing", received: 0, total: item.getTotalBytes() || 0, startedAt: Date.now() };
    rec.item = item;
    downloads.set(id, rec);
    item.on("updated", (_ev, state) => {
      rec.received = item.getReceivedBytes();
      if (item.getTotalBytes()) rec.total = item.getTotalBytes();
      if (state === "interrupted") rec.state = "failed";
      else if (state === "progressing" && chrome && !chrome.isDestroyed()) chrome.setProgressBar(rec.total ? rec.received / rec.total : 2);
    });
    item.once("done", (_ev, state) => {
      rec.state = state === "completed" ? "completed" : state === "cancelled" ? "cancelled" : "failed";
      rec.received = item.getReceivedBytes();
      if (chrome && !chrome.isDestroyed()) chrome.setProgressBar(-1);
      delete rec.item;
    });
  });
  // audio badge forwarding: media started/stopped + mute state per view polled by chrome via tab_audio_state
}

// ---------- profiles (Chrome-style Work ↔ Personal separation) ----------
function createStoreFor(profileId) {
  try {
    return require("./store-sqlite").createStore(userDataPath, profileId);
  } catch {
    return new Store(userDataPath, profileId);
  }
}

function restoreTabsIntoMemory(saved) {
  tabs.clear(); order = []; focused = null; pendingFocus = null;
  if (saved?.length) {
    saved.forEach((t, i) => {
      const target = resolveUrl(t.url);
      const startish = target === START_URL;
      const lab = `tab-restore-${Date.now()}-${i}`;
      tabs.set(lab, { label: lab, url: startish ? "continua://start" : target, title: startish ? "New Tab" : (t.title || target), history: [target], idx: 0, scrollY: 0, pinned: !!t.pinned, group: t.group || null, incognito: false, zoom: 100, discarded: true, lastActive: 0, view: null });
      order.push(lab);
    });
    let activeId = null;
    try { activeId = store.state?.active || store.cfg?.active; } catch {}
    const activeIdx = Math.max(0, saved.findIndex(t => t.label === activeId));
    activate(order[activeIdx] || order[0]);
  } else openTab(START_URL);
  layoutViews();
}

async function switchProfile(id) {
  if (!id || !profileState.profiles.find(p => p.id === id)) return { error: "not-found" };
  if (id === activeProfileId) {
    return { activeId: activeProfileId, profiles: profileState.profiles, tabs: [...tabs.entries()].map(([lab, t]) => ({ label: lab, url: t.url, title: t.title, pinned: !!t.pinned, group: t.group || null, incognito: !!t.incognito })) };
  }
  try { persistNow(); } catch {}
  // Tear down live views of the old profile before swapping partitions.
  for (const [, m] of tabs) {
    try { if (m.view) { chrome.contentView.removeChildView(m.view); m.view.webContents.close(); } } catch {}
    m.view = null;
  }
  activeProfileId = id;
  profileState.activeId = id;
  profiles.saveProfiles(userDataPath, profileState);
  store = createStoreFor(activeProfileId);
  try { syncVersion = (store.cfg.last_version || 0) + 1; } catch {}
  try { session.fromPartition(activePartition()).setSpellCheckerEnabled(true); } catch {}
  wireDownloads(session.fromPartition(activePartition()));
  try { await autoloadExtensions(); } catch (e) { console.error(`[continua] autoloadExtensions: ${e?.message || e}`); }
  restoreTabsIntoMemory(store.loadSession());
  try { chrome?.webContents.send("profiles-changed", { activeId: activeProfileId, profiles: profileState.profiles }); } catch {}
  return { activeId: activeProfileId, profiles: profileState.profiles, tabs: [...tabs.entries()].map(([lab, t]) => ({ label: lab, url: t.url, title: t.title, pinned: !!t.pinned, group: t.group || null, incognito: !!t.incognito })) };
}

// ---------- GPU diagnostics (black-canvas triage) ----------
// Animation-heavy pages go black when the GPU process dies or all raster
// falls back to software. This surfaces compositor state in the logs and in
// pool_state so a report can answer "GPU or pool?" without guessing.
let lastGpuCrash = 0;
function gpuStatus() {
  try {
    const s = app.getGPUFeatureStatus?.() || {};
    return {
      webgl: s.webgl || "unknown",
      canvas: s.gpu_compositing || s.canvas || "unknown",
      compositing: s.gpu_compositing || "unknown",
      videoDecode: s.video_decode || "unknown",
      lastCrash: lastGpuCrash || undefined,
    };
  } catch { return { webgl: "unknown" }; }
}

app.whenReady().then(async () => {  // No native File/Edit/View menu — the React chrome owns all controls.
  try { Menu.setApplicationMenu(null); } catch {}
  try { console.error(`[continua] gpu ${JSON.stringify(gpuStatus())}`); } catch {}
  app.on("gpu-process-crashed", (_e, killed) => {
    lastGpuCrash = Date.now();
    console.error(`[continua] GPU process crashed (killed=${!!killed}) — heavy pages may paint black until relaunch`);
  });
  userDataPath = app.getPath("userData");
  profileState = profiles.loadProfiles(userDataPath);
  activeProfileId = profileState.activeId;
  // SQLite FTS5 store per profile, JSON fallback when better-sqlite3 is not installed.
  store = createStoreFor(activeProfileId);
  try { syncVersion = (store.cfg.last_version || 0) + 1; } catch {}
  try { session.fromPartition(activePartition()).setSpellCheckerEnabled(true); } catch {}
  try { session.fromPartition(activePartition()).setSpellCheckerLanguages(["en-US"]); } catch {}
  wireDownloads(session.fromPartition(activePartition()));
  wireDownloads(session.defaultSession);
  // restore persisted + drop-in extensions (Chromium loadExtension)
  try { await autoloadExtensions(); } catch (e) { console.error(`[continua] autoloadExtensions: ${e?.message || e}`); }
  // auto-update (optional dep): silent check, user installs on quit
  try {
    const { autoUpdater } = require("electron-updater");
    autoUpdater.autoDownload = false;
    autoUpdater.checkForUpdates().catch(() => {});
  } catch { /* electron-updater not installed — `npm install` enables it */ }
  createChrome();
  // Global studio toggle: works even with the chrome hidden (recording).
  try {
    globalShortcut.register("CommandOrControl+Shift+F", () => {
      setStudio(!studio, "global-shortcut");
    });
  } catch (e) { console.error(`[continua] globalShortcut: ${e?.message || e}`); }
  // zero-loss restore: only active tab goes live, rest rehydrate on click (fast startup)
  restoreTabsIntoMemory(store.loadSession());
  // Launched with a URL (drun link, xdg-open, %u): open it in a tab too.
  if (launchUrl && isWeb(launchUrl)) {
    try { openTab(launchUrl); } catch (e) { console.error(`[continua] launch-url: ${e?.message || e}`); }
  }
  layoutViews();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createChrome(); });
});
app.on("window-all-closed", () => { try { globalShortcut.unregisterAll(); } catch {} persistNow(); app.quit(); });
