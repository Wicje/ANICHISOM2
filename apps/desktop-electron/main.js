#!/usr/bin/env node
/**
 * Continua Browser — Electron Chromium product host (ADR-008).
 *
 * WebContentsView pool K=6 live, rest discarded to metadata. Local-first
 * continuity via store.js, delta sync to Supabase (TLS, no E2E).
 * Privacy tax removed: no vault, no fingerprint gate, plain partitions.
 */
const { app, BrowserWindow, WebContentsView, ipcMain, session, shell, Menu } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { Store } = require("./store");
const { pickVictims } = require("./pool");
const { buildSavePayload, mergeRemoteTabs } = require("./sync");

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
let CHROME_H = 96;
// Matches .tab-rail width in styles.css exactly — any drift shows as a
// black window-bg gap with the page shifted right (seen in screenshots).
let TAB_RAIL_W = 0;
const TAB_RAIL_WIDTH_PX = 44;
// While a React-chrome overlay is open (settings/history/palette/...), hide
// content views: native WebContentsViews always paint above the window's own
// HTML, so dropdowns would otherwise render underneath the website.
let modalHidden = false;

let chrome = null;
let store = null;
let tabs = new Map(); // label -> meta
let order = [];       // creation order for LRU display
let focused = null;
let pendingFocus = null; // swap-on-ready target (discarded-tab rehydrate)
let closedRing = [];
let downloads = new Map(); // id -> {id, filename, path, url, state, received, total, startedAt}
let dlSeq = 0;
let seq = 0;
const label = (p) => `${p}-${Date.now()}-${(seq++).toString(36)}`;

const rss = () => process.memoryUsage?.().rss ?? 0;
const mainPartition = "persist:continua-main";

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
  const live = [...tabs.entries()].filter(([, m]) => !m.incognito).map(([lab, m]) => ({ label: lab, url: m.url, title: m.title, pinned: !!m.pinned }));
  store.saveSession(live, focused);
  live.forEach(t => store.enqueue({ op: "upsert_tab", ...t }));
}
setInterval(() => { if (store && tabs.size) store.snapshot([...tabs.entries()].filter(([, m]) => !m.incognito).map(([lab, m]) => ({ label: lab, url: m.url, title: m.title })), focused); }, 5 * 60 * 1000);

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
    const payload = buildSavePayload(tabs, focused, store.cfg.device_id, syncVersion);
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
    const res = await fetch(`${url}/api/context/pull?domains=browser`, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    const body = await res.json();
    const records = body?.data?.records || body?.data || [];
    const rec = Array.isArray(records) ? records.find(r => r.domain === "browser") || records[0] : records;
    const remote = rec?.data?.tabs || rec?.tabs || [];
    if (!Array.isArray(remote)) return [];
    try { if (rec?.version && rec.version >= syncVersion) syncVersion = rec.version + 1; } catch {}
    const out = [];
    for (const t of mergeRemoteTabs(tabs, remote)) {
      const lab = openTab(t.url);
      out.push({ label: lab, url: t.url, title: t.title });
    }
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
function layoutViews() {
  if (!chrome) return;
  const { width, height } = chrome.getContentBounds();
  // Per-view guard: one destroyed webContents throwing must never abort the
  // loop — that left two views painted side-by-side (the mystery stripe).
  for (const [lab, m] of tabs) {
    try {
      if (!m.view || m.discarded) continue;
      if (m.view.webContents.isDestroyed()) { m.view = null; m.discarded = true; continue; }
      const vis = !modalHidden && lab === focused;
      m.view.setVisible(vis);
      if (vis) m.view.setBounds({ x: TAB_RAIL_W, y: CHROME_H, width: Math.max(200, width - TAB_RAIL_W), height: Math.max(200, height - CHROME_H) });
    } catch (e) {
      console.error(`[continua] layout failed for ${lab}: ${e?.message || e}`);
      try { m.view = null; m.discarded = true; } catch {}
    }
  }
  const sig = `${width}x${height} rail=${TAB_RAIL_W} chromeH=${CHROME_H} focused=${focused} live=${[...tabs.values()].filter(t => !t.discarded && t.view).length}`;
  if (sig !== lastLayoutSig) { lastLayoutSig = sig; console.error(`[continua] layout ${sig}`); }
}

function makeView(meta) {
  const partition = meta.incognito ? `incognito-${meta.label}` : mainPartition;
  const view = new WebContentsView({ webPreferences: {
    partition, contextIsolation: true, sandbox: true, nodeIntegration: false,
    backgroundThrottling: true,
  }});
  view.webContents.setZoomFactor((meta.zoom || 100) / 100);
  // Renderer death (OOM-killed on small boxes after heavy sessions like
  // Pinterest) paints a black canvas. Background tabs are discarded to
  // metadata (no point reloading what the OOM killer will take again);
  // the focused tab reloads twice, then lands on a crash page with retry.
  // Events from pruned/closed views are ignored (no phantom reloads).
  let crashReloads = 0;
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
    meta.title = view.webContents.getTitle() || meta.title;
    if (meta.pendingScroll) { view.webContents.executeJavaScript(`window.scrollTo(0, ${meta.pendingScroll});`).catch(() => {}); meta.pendingScroll = null; }
    if (!meta.incognito && isWeb(meta.url)) store?.appendHistory(meta.url, meta.title);
    scheduleSave();
    // Swap-on-ready: a discarded tab becomes visible only once its page has
    // actually painted (stale pendingFocus from a superseded click is ignored).
    if (pendingFocus === meta.label) {
      pendingFocus = null;
      focused = meta.label;
      meta.lastActive = Date.now();
      prunePool(); layoutViews();
    }
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
  view.webContents.on("did-navigate", (_e, url) => { meta.url = url === START_URL ? "continua://start" : url; scheduleSave(); });
  view.webContents.on("page-title-updated", (_e, title) => { meta.title = title; });
  chrome.contentView.addChildView(view);
  return view;
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

function openTab(url, incognito = false) {
  const target = resolveUrl(url);
  const startish = target === START_URL;
  const lab = label(incognito ? "tab-incog" : "tab");
  const meta = { label: lab, url: startish ? "continua://start" : target, title: startish ? "New Tab" : target, history: [target], idx: 0, scrollY: 0, pinned: false, incognito, zoom: 100, discarded: false, lastActive: Date.now(), view: null };
  // enforce pool budget before adding
  if ([...tabs.values()].filter(m => !m.discarded).length >= POOL_K) prunePool();
  meta.view = makeView(meta);
  tabs.set(lab, meta); order.push(lab);
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
  else closedRing.unshift({ label: lab, url: m.url, title: m.title }); // vault-free: plain ring
  if (closedRing.length > 25) closedRing.length = 25;
  tabs.delete(lab); order = order.filter(x => x !== lab);
  store?.enqueue({ op: "close_tab", label: lab });
  if (focused === lab) { focused = order[order.length - 1] || null; if (focused) activate(focused); }
  scheduleSave();
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
    case "list_tabs": return [...tabs.entries()].map(([lab, t]) => ({ label: lab, url: t.url, title: t.title, pinned: !!t.pinned, incognito: !!t.incognito }));
    case "open_incognito_tab": return openTab(args.url || START_URL, true);
    case "close_tab": closeTab(args.label); return;
    case "activate_tab": activate(args.label); return;
    case "navigate_tab": { const t = tabs.get(args.label); if (t) { const target = resolveUrl(args.url); t.url = target === START_URL ? "continua://start" : target; t.history = t.history.slice(0, t.idx + 1).concat(target); t.idx++; ensureLive(args.label).view.webContents.loadURL(target).catch(() => {}); } return; }
    case "reload_tab": m?.view?.webContents.reload(); return;
    case "back_tab": case "forward_tab": { // history-aware within pooled view
      const t = tabs.get(args.label); if (!t) return;
      const ni = op === "back_tab" ? t.idx - 1 : t.idx + 1;
      if (ni >= 0 && ni < t.history.length) { t.idx = ni; t.url = t.history[ni]; ensureLive(args.label).view.webContents.loadURL(t.url).catch(() => {}); }
      else { const wc = t.view?.webContents; if (wc) op === "back_tab" ? wc.goBack() : wc.goForward(); }
      return; }
    case "nav_state": { const t = tabs.get(args.label); return { back: (t?.idx ?? 0) > 0, forward: (t ? t.idx < t.history.length - 1 : false) }; }
    case "set_tab_pinned": { const t = tabs.get(args.label); if (t) t.pinned = !!args.pinned; scheduleSave(); return; }
    case "find_in_tab": case "find_next": { m?.view?.webContents.findInPage(args.query || args.text || ""); return { count: 0, idx: -1 }; }
    case "find_prev": { m?.view?.webContents.findInPage(args.query || "", { forward: false }); return { count: 0, idx: -1 }; }
    case "stop_find": m?.view?.webContents.stopFindInPage("clearSelection"); return;
    case "zoom_tab": { const t = tabs.get(args.label); if (t) { t.zoom = Math.min(200, Math.max(50, (t.zoom || 100) + (args.step || 0))); t.view?.webContents.setZoomFactor(t.zoom / 100); return t.zoom; } return 100; }
    case "reader_toggle": case "dark_toggle": return; // v1 no-op (reader ships Phase 3)
    case "set_search_engine": return store.patchConfig({ search_engine: args.engine });
    case "get_browser_config": case "getBrowserConfig": return store.getConfig();
    case "update_config": return store.patchConfig(args.patch || {});
    case "set_link_preview": return store.patchConfig({ link_preview: !!args.enabled });
    case "set_immersive": case "update_tab_layout": layoutViews(); return;
    case "set_chrome_height": CHROME_H = args.height || args.chromeH || 96; layoutViews(); return;
    case "set_tab_rail": TAB_RAIL_W = args.enabled ? TAB_RAIL_WIDTH_PX : 0; layoutViews(); return;
    case "chrome_modal": modalHidden = !!args.open; layoutViews(); return;
    case "save_session": return store.saveSession(args.tabs || [...tabs.values()].map(t => ({ label: t.label, url: t.url, title: t.title })), args.active ?? focused);
    case "load_session": return store.loadSession();
    case "restore_session": { // merge, never destructive replace
      const ids = store.restoreSession(args.id) || [];
      const out = [];
      for (const t of ids) { if ([...tabs.values()].find(x => x.url === t.url)) continue; const lab = openTab(t.url); out.push({ label: lab, url: t.url, title: t.title || t.url }); }
      return out; }
    case "reopen_last_closed": { const t = closedRing.shift(); if (!t) return null; const lab = openTab(t.url); return { label: lab, url: t.url, title: t.title }; }
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
    case "pool_state": return { live: [...tabs.values()].filter(t => !t.discarded).length, discarded: [...tabs.values()].filter(t => t.discarded).length, rssMb: (rss() / 1048576).toFixed(1), budgetMb: (RSS_BUDGET / 1048576).toFixed(0), active: focused, k: POOL_K };
    case "list_downloads": return [...downloads.values()].reverse().slice(0, 50);
    case "open_download": { const d = downloads.get(args.id); if (d?.path) shell.openPath(d.path).catch(() => {}); return; }
    case "reveal_download": { const d = downloads.get(args.id); if (d?.path) shell.showItemInFolder(d.path); return; }
    case "cancel_download": { const d = downloads.get(args.id); try { d?.item?.cancel(); } catch {} return; }
    case "clear_downloads": { for (const [id, d] of downloads) if (d.state === "completed" || d.state === "cancelled" || d.state === "failed") downloads.delete(id); return [...downloads.values()].reverse(); }
    case "set_tab_muted": { const t = tabs.get(args.label); if (t?.view) t.view.webContents.setAudioMuted(!!args.muted); if (t) t.muted = !!args.muted; return !!args.muted; }
    case "tab_audio_state": {
      const out = {};
      for (const [lab, t] of tabs) {
        try { out[lab] = { audible: !!t.view?.webContents?.isCurrentlyAudible(), muted: !!t.view?.webContents?.isAudioMuted() || !!t.muted }; }
        catch { out[lab] = { audible: false, muted: !!t.muted }; }
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
    case "list_extensions": return listExtensions();
    case "load_extension": return await loadExtension(args.path);
    case "remove_extension": return removeExtension(args.id);
    case "set_extension_enabled": {
      store.cfg.extension_state = store.cfg.extension_state || {};
      store.cfg.extension_state[args.id] = !!args.enabled;
      store._saveCfg();
      const ses = session.fromPartition(mainPartition);
      if (args.enabled) {
        const e = (store.cfg.extensions || []).find(x => x.id === args.id);
        if (e?.path) return await loadExtension(e.path);
        return { error: "no-path" };
      }
      try { ses.removeExtension(args.id); } catch {}
      return true;
    }
    case "extensions_dir": return extDir();
    case "window_control": if (args.action === "minimize") chrome.minimize(); else if (args.action === "toggleMaximize") chrome.isMaximized() ? chrome.unmaximize() : chrome.maximize(); else if (args.action === "close") chrome.close(); else if (args.action === "isMaximized") return chrome.isMaximized(); return;
    default: return null;
  }
});

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

// ---------- extensions (Chromium loadExtension + autoload dir) ----------
// Drop unpacked extensions (e.g. Bitwarden) into
//   <userData>/extensions/<name>/manifest.json
// and they load automatically on every boot. Per-extension on/off switches
// persist in cfg.extension_state.
function extDir() { return path.join(app.getPath("userData"), "extensions"); }
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
  try { return store?.cfg?.extension_state?.[id] !== false; } catch { return true; }
}
function listExtensions() {
  try {
    const cfg = store?.cfg?.extensions || [];
    return cfg.map(e => ({ id: e.id, name: e.name || e.id, path: e.path, enabled: isExtEnabled(e.id) }));
  } catch { return []; }
}
async function loadExtension(p) {
  try {
    const ses = session.fromPartition(mainPartition);
    const ext = await ses.loadExtension(p, { allowFileAccess: true });
    const list = store.cfg.extensions || [];
    if (!list.find(e => e.id === ext.id)) list.push({ id: ext.id, name: ext.name, path: p });
    store.cfg.extensions = list; store._saveCfg();
    return { id: ext.id, name: ext.name };
  } catch (e) { return { error: String(e?.message || e) }; }
}
async function autoloadExtensions() {
  // Merge order: scanned dirs first (drop-in wins), then persisted leftovers.
  const seen = new Set();
  const candidates = [
    ...scanExtensionDirs(),
    ...(store.cfg.extensions || []).map(e => e?.path).filter(Boolean),
  ];
  const ses = session.fromPartition(mainPartition);
  for (const p of candidates) {
    if (seen.has(p)) continue;
    seen.add(p);
    try {
      if (!fs.existsSync(path.join(p, "manifest.json"))) continue;
      const ext = await ses.loadExtension(p, { allowFileAccess: true });
      if (!isExtEnabled(ext.id)) { try { ses.removeExtension(ext.id); } catch {} continue; }
      const list = store.cfg.extensions || [];
      if (!list.find(e => e.id === ext.id)) list.push({ id: ext.id, name: ext.name, path: p });
      store.cfg.extensions = list;
    } catch (e) { console.error(`[continua] extension autoload failed for ${p}: ${e?.message || e}`); }
  }
  try { store._saveCfg(); } catch {}
}
function removeExtension(id) {
  try {
    const ses = session.fromPartition(mainPartition);
    try { ses.removeExtension(id); } catch {}
    store.cfg.extensions = (store.cfg.extensions || []).filter(e => e.id !== id);
    store._saveCfg();
    return true;
  } catch { return false; }
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

app.whenReady().then(async () => {  // No native File/Edit/View menu — the React chrome owns all controls.
  try { Menu.setApplicationMenu(null); } catch {}
  // SQLite FTS5 store, JSON fallback when better-sqlite3 is not installed.
  try {
    store = require("./store-sqlite").createStore(app.getPath("userData"));
  } catch {
    store = new Store(app.getPath("userData"));
  }
  try { syncVersion = (store.cfg.last_version || 0) + 1; } catch {}
  try { session.fromPartition(mainPartition).setSpellCheckerEnabled(true); } catch {}
  try { session.fromPartition(mainPartition).setSpellCheckerLanguages(["en-US"]); } catch {}
  wireDownloads(session.fromPartition(mainPartition));
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
  // zero-loss restore: only active tab goes live, rest rehydrate on click (fast startup)
  const saved = store.loadSession();
  if (saved?.length) {
    saved.forEach((t, i) => {
      const target = resolveUrl(t.url);
      const startish = target === START_URL;
      const lab = `tab-restore-${Date.now()}-${i}`;
      tabs.set(lab, { label: lab, url: startish ? "continua://start" : target, title: startish ? "New Tab" : (t.title || target), history: [target], idx: 0, scrollY: 0, pinned: !!t.pinned, incognito: false, zoom: 100, discarded: true, lastActive: 0, view: null });
      order.push(lab);
    });
    const activeIdx = Math.max(0, saved.findIndex(t => t.label === store.state.active));
    activate(order[activeIdx] || order[0]);
  } else openTab(START_URL);
  layoutViews();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createChrome(); });
});
app.on("window-all-closed", () => { persistNow(); app.quit(); });
