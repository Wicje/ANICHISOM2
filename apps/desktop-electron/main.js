#!/usr/bin/env node
/**
 * Continua Browser — Electron Chromium product host (ADR-008).
 *
 * WebContentsView pool K=6 live, rest discarded to metadata. Local-first
 * continuity via store.js, delta sync to Supabase (TLS, no E2E).
 * Privacy tax removed: no vault, no fingerprint gate, plain partitions.
 */
const { app, BrowserWindow, WebContentsView, ipcMain, session, shell, Menu, clipboard, Notification, globalShortcut, safeStorage } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { Store } = require("./store");
const profiles = require("./profiles");
const { pickVictims, applyNavEntry } = require("./pool");
const { normalizeOrigin, validCandidate, forOrigin: forOriginLogins, findUserLogin } = require("./logins");
const { stripTrackingParams, httpsUpgradeable } = require("./shields");
const Containers = require("./containers");
const VaultSync = require("./vault-sync");
const Translate = require("./translate");
const Keywords = require("./keywords");
const WebApps = require("./webapps");
const Speech = require("./speech");
const ClosedRing = require("./closed");
const BookmarkMgr = require("./bookmarks");
const CookieMgr = require("./cookies");
const Snapshots = require("./snapshots");
const { buildSavePayload, mergeRemoteTabs, mergeRemoteWorkspaces, mergeTabdrops } = require("./sync");
const AxTree = require("./ax-tree");
const AgentAct = require("./agent-act");
const Debrief = require("./debrief");

// Boxes without a usable GPU (broken libva/iHD, headless Wayland) get a
// dying GPU process and black canvases in fresh renderers. Opt out of
// hardware acceleration there via CONTINUA_SOFTWARE_GL=1 (set by the
// launcher on such boxes). Untouched everywhere else.
// Software WebGL (SwiftShader) is gated behind --enable-unsafe-swiftshader
// in modern Chromium — without it, disabling HW acceleration turns every
// WebGL page into "Error creating WebGL context". Always allow the fallback;
// it only activates when no real GPU is available.
try {
  app.commandLine.appendSwitch("enable-unsafe-swiftshader");
} catch {}
if (process.env.CONTINUA_SOFTWARE_GL === "1") {
  try {
    app.disableHardwareAcceleration();
    console.error("[continua] software GL forced (CONTINUA_SOFTWARE_GL=1)");
  } catch {}
}

// Widevine (Netflix/Spotify/Prime): stock Electron bundles the CDM on
// Win/mac but NOT on Linux. There, borrow it from an installed Chrome if
// present — without this DRM pages fail with no useful error.
if (process.platform === "linux") {
  try {
    const cands = [
      "/opt/google/chrome/WidevineCdm",
      "/usr/lib/chromium/WidevineCdm",
      path.join(os.homedir(), ".config", "google-chrome", "WidevineCdm"),
    ];
    for (const base of cands) {
      try {
        const manifest = JSON.parse(fs.readFileSync(path.join(base, "manifest.json"), "utf8"));
        const lib = path.join(base, "_platform_specific", `linux_${os.arch()}`, "libwidevinecdm.so");
        if (manifest?.version && fs.existsSync(lib)) {
          app.commandLine.appendSwitch("widevine-cdm-path", lib);
          app.commandLine.appendSwitch("widevine-cdm-version", manifest.version);
          console.error(`[continua] widevine ${manifest.version} borrowed from ${base}`);
          break;
        }
      } catch {}
    }
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
const START_PAGE_TEMPLATE_URL = "file://" + START_PAGE_FILE;
let START_URL = START_PAGE_TEMPLATE_URL;
// Generated per-profile start page (installed apps + icons baked in, no IPC
// needed from the file:// page); falls back to the shipped template.
const isStartPageUrl = (u) => u === START_URL || u === START_PAGE_TEMPLATE_URL;
function generatedStartPageFile() {
  try {
    if (userDataPath) return path.join(profiles.profileDir(userDataPath, activeProfileId), "start-page.html");
  } catch {}
  return null;
}
function renderStartPage() {
  let apps = [];
  try {
    const cfg = store?.getConfig ? store.getConfig() : store?.state?.config;
    apps = WebApps.sanitizeApps(cfg?.installed_apps).map((a) => ({ name: a.name, url: a.url, icon: a.icon || null }));
  } catch {}
  try {
    const tpl = fs.readFileSync(START_PAGE_FILE, "utf8");
    // Escape < so baked strings can never break out of the <script> block.
    const baked = JSON.stringify(apps).slice(0, 65536).replace(/</g, "\\u003c");
    const dest = generatedStartPageFile();
    if (dest) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, tpl.replace("/*__CONTINUA_APPS__*/[]", baked));
      START_URL = "file://" + dest;
      return;
    }
  } catch {}
  START_URL = START_PAGE_TEMPLATE_URL;
}
const OFFLINE_URL = "file://" + OFFLINE_FILE;
const CRASH_URL = "file://" + CRASH_FILE;
const isWeb = (u) => !!u && /^https?:\/\//i.test(u);
const isStartUrl = (u) => u === "continua://start" || u === "continua://home" || !u;
// Offline/crash interstitials carry the failed URL as ?u= — match the file
// itself with or without the query (strict === misses every real interstitial,
// which poisoned history stacks and broke retry detection).
const isInterstitialUrl = (u) => !!u && (
  u === OFFLINE_URL || u === CRASH_URL ||
  u.startsWith(OFFLINE_URL + "?") || u.startsWith(CRASH_URL + "?")
);
// macOS overlay scrollbars injected into every web page (mirrors the chrome
// styling in styles.css — thin floating thumbs, no layout shift).
const SCROLLBAR_CSS = `::-webkit-scrollbar{width:8px!important;height:8px!important}::-webkit-scrollbar-track{background:transparent!important}::-webkit-scrollbar-thumb{background:rgba(134,134,139,.0)!important;border-radius:4px!important;border:2px solid transparent!important;background-clip:content-box!important}*:hover::-webkit-scrollbar-thumb{background:rgba(134,134,139,.55)!important;background-clip:content-box!important}::-webkit-scrollbar-thumb:hover{background:rgba(134,134,139,.8)!important;background-clip:content-box!important}::-webkit-scrollbar-corner{background:transparent!important}::-webkit-scrollbar-button{display:none!important;width:0!important;height:0!important}`;
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
// Agent-track session timeline (debrief input): visit/interact/write/download.
let agentTimeline = []; // [{type, url, ts, ...}]
const agentNow = () => new Date().toISOString();
function agentLog(e) { agentTimeline.push({ ts: agentNow(), ...e }); if (agentTimeline.length > 4000) agentTimeline = agentTimeline.slice(-3000); }
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
  const live = [...tabs.entries()].filter(([, m]) => !m.incognito).map(([lab, m]) => ({
    label: lab, url: m.url, title: m.title, pinned: !!m.pinned, group: m.group || null,
    container: m.container || null,
    history: (m.history || [m.url]).slice(-30), histIdx: Math.min(m.idx || 0, 29),
    scrollY: m.scrollY || 0, zoom: m.zoom || 100,
  }));
  store.saveSession(live, focused);
  try { store.saveClosedRing?.(closedRing().slice(0, 25)); } catch {}
  live.forEach(t => store.enqueue({ op: "upsert_tab", ...t }));
}
setInterval(() => { if (store && tabs.size) store.snapshot([...tabs.entries()].filter(([, m]) => !m.incognito).map(([lab, m]) => ({ label: lab, url: m.url, title: m.title, container: m.container || null, history: (m.history || [m.url]).slice(-30), histIdx: Math.min(m.idx || 0, 29), scrollY: m.scrollY || 0, zoom: m.zoom || 100 })), focused); }, 5 * 60 * 1000);
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
// Scroll keep-fresh: scrollY is otherwise captured only when switching away,
// so the focused tab at quit would resurrect at the top. Cheap poll keeps
// session restore honest (background tabs are captured on sleep/prune).
setInterval(() => {
  try {
    const m = focused && tabs.get(focused);
    if (!m?.view || m.discarded || m.view.webContents.isDestroyed()) return;
    m.view.webContents.executeJavaScript("window.scrollY").then((y) => {
      if (typeof y === "number" && Number.isFinite(y)) m.scrollY = y;
    }).catch(() => {});
  } catch {}
}, 15000);

const apiBase = () => (store.cfg.continua_url || "").replace(/\/$/, "");
const authHeaders = () => ({ "content-type": "application/json", authorization: `Bearer ${store.cfg.capability_token || ""}` });

// "Send to device" outbox (per profile via cfg, 24h TTL). Rides the normal
// domain save so no new server endpoint is needed; receivers dedupe by id.
const TABDROP_TTL_MS = 24 * 60 * 60 * 1000;
function getTabdropOutbox() {
  try {
    const box = Array.isArray(store?.cfg?.tabdrop_outbox) ? store.cfg.tabdrop_outbox : [];
    const fresh = box.filter(d => d && typeof d.id === "string" && typeof d.url === "string" && typeof d.at === "number" && Date.now() - d.at < TABDROP_TTL_MS);
    if (fresh.length !== box.length && store) { store.cfg.tabdrop_outbox = fresh; try { store._saveCfg(); } catch {} }
    return fresh;
  } catch { return []; }
}
function getTabdropSeen() {
  try { return Array.isArray(store?.cfg?.tabdrop_seen) ? store.cfg.tabdrop_seen : []; } catch { return []; }
}
// Queue one tab for paired devices (sync outbox) + kick a sync now.
// Shared by the send_tab IPC and the page menu.
function queueTabdrop(label) {
  const t = label ? tabs.get(label) : focused ? tabs.get(focused) : null;
  if (!t || !isWeb(t.url)) return { error: "no-tab" };
  if (!store?.cfg?.capability_token) return { error: "unpaired" };
  const crypto = require("crypto");
  const drop = { id: "td-" + crypto.randomBytes(6).toString("hex"), url: t.url, title: t.title || t.url, from: store.cfg.device_id, at: Date.now() };
  const box = getTabdropOutbox();
  const dup = box.find(d => d.url === drop.url && Date.now() - d.at < 60000);
  if (!dup) {
    box.push(drop);
    if (box.length > 20) box.splice(0, box.length - 20);
    try { store.cfg.tabdrop_outbox = box; store._saveCfg(); } catch {}
    try { store.enqueue({ op: "tabdrop", id: drop.id }); } catch {}
  }
  void flushSync();
  return { ok: true, id: (dup || drop).id };
}

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
    const payload = buildSavePayload(tabs, focused, store.cfg.device_id, syncVersion, workspaces, getGroups(), activeProfileId, store.getConfig ? store.getConfig().theme_id : undefined, {
      tabdrops: getTabdropOutbox(),
      tabdropSeen: getTabdropSeen(),
      containers: getContainers(),
      loginsEnc: buildLoginsEnc(),
    });
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
      const lab = openTab(t.url, false, true, t.container || null);
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
    // Adopt unknown remote containers (ids + names + colors merge by id).
    try {
      const local = getContainers();
      const have = new Set(local.map((c) => c.id));
      let changed = false;
      for (const c of Containers.sanitizeRegistry(rec?.data?.containers)) {
        if (have.has(c.id)) continue;
        have.add(c.id);
        local.push(c);
        changed = true;
      }
      if (changed) saveContainers(local);
    } catch {}
    // Adopt E2E-encrypted logins (ciphertext only on the wire; the sync key
    // never leaves the OS keyrings). Unknown origin+username pairs are
    // sealed locally; nothing local is overwritten or removed.
    try {
      const adopted = adoptLoginsEnc(rec?.data?.loginsEnc);
      if (adopted > 0) out.push({ loginsAdopted: adopted });
    } catch {}
    // Adopt "send to device" drops as background tabs (each opens once —
    // seen ids persist in cfg). Toasts surface via the chrome event below.
    try {
      const seen = getTabdropSeen();
      for (const d of mergeTabdrops(seen, rec?.data?.tabdrops)) {
        seen.push(d.id);
        const lab = openTab(d.url, false, false);
        out.push({ label: lab, url: d.url, title: d.title, tabdrop: true });
        try { chrome?.webContents.send("tabdrop-received", { label: lab, url: d.url, title: d.title, from: d.from }); } catch {}
      }
      if (seen.length > 200) seen.splice(0, seen.length - 200);
      try { store.cfg.tabdrop_seen = seen; store._saveCfg(); } catch {}
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
  // Partition: throwaway per incognito tab, container partition per
  // container tab, profile partition otherwise. Storage never mingles.
  const partition = meta.incognito ? `incognito-${meta.label}`
    : meta.container ? containerPartition(meta.container)
    : activePartition();
  if (meta.container && !meta.incognito) ensureContainerWired(meta.container);
  const view = new WebContentsView({ webPreferences: {
    partition, contextIsolation: true, sandbox: true, nodeIntegration: false,
    // Link-fork interceptor + login-capture submit listener (isolated world).
    // Plain left-clicks on http(s) anchors go through window.open →
    // setWindowOpenHandler → new tab (covers SPA pushState links, which never
    // fire will-navigate). Hash jumps, downloads and modified clicks are left
    // alone (see content-preload.js).
    preload: path.join(__dirname, "content-preload.js"),
    // NOTE: throttling is managed per-view in layoutViews (focused = full
    // speed). Leaving it true here starves hidden loading views of rAF/
    // timers, so animation-heavy pages compile shaders with no frames flowing
    // and first paint takes forever (the black-canvas report).
    backgroundThrottling: false,
  }});
  view.webContents.setZoomFactor((meta.zoom || 100) / 100);
  // Incognito tabs each own a throwaway partition (profile/default sessions
  // are wired once at boot/switch) — without this their downloads fall back
  // to Electron defaults with no event, record, or toast.
  if (meta.incognito) {
    try { wireDownloads(session.fromPartition(partition), partition); } catch {}
    try { wirePermissions(session.fromPartition(partition), partition); } catch {}
  }
  // Renderer death (OOM-killed on small boxes after heavy sessions like
  // Pinterest) paints a black canvas. Background tabs are discarded to
  // metadata (no point reloading what the OOM killer will take again);
  // the focused tab reloads twice, then lands on a crash page with retry.
  // Events from pruned/closed views are ignored (no phantom reloads).
  let crashReloads = 0;
  let loadArmed = false; // paint-probe armed once per view (see did-finish-load)
  const gone = (_e, details) => {
    if (meta.discarded || !meta.view || meta.view !== view) return; // pruned or closed — not a crash
    console.error(`[continua] renderer gone for ${meta.label} (${meta.url}): ${details?.reason || "unknown"}`);
    if (meta.label !== focused) {
      try { chrome.contentView.removeChildView(meta.view); } catch {}
      meta.view = null; meta.discarded = true;
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
  // Loading state drives the chrome progress line. did-start/stop-loading
  // covers every load (link forks, rehydrates, reloads, redirects) — the
  // chrome never has to guess from its own button clicks. Stale views
  // (pruned/closed) stay silent so a dead renderer can't wag the bar.
  view.webContents.on("did-start-loading", () => {
    if (tabs.get(meta.label)?.view !== view || view.webContents.isDestroyed()) return;
    try { chrome?.webContents.send("load-started", { label: meta.label }); } catch {}
  });
  view.webContents.on("did-stop-loading", () => {
    if (tabs.get(meta.label)?.view !== view || view.webContents.isDestroyed()) return;
    try { chrome?.webContents.send("load-stopped", { label: meta.label }); } catch {}
  });
  view.webContents.on("did-finish-load", () => {
    if (tabs.get(meta.label)?.view !== view || view.webContents.isDestroyed()) return;
    // Load-finished drives the chrome progress line (reload/back have no
    // other completion signal on this host).
    try { chrome?.webContents.send("load-finished", { label: meta.label }); } catch {}
    meta.programmatic = false;
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
    // The failed load will never commit: drop its pending expectation now.
    // Otherwise the flag stays stuck and later link clicks skip the fork
    // while their commits are dropped (tab resurrects stale entries).
    meta.expectNav = null; meta.programmatic = false;
    view.webContents.loadURL(`${OFFLINE_URL}?u=${encodeURIComponent(url)}`).catch(() => {});
  });
  // "Every link opens a new tab": user-initiated top-level navigations
  // (link clicks, form submits, JS location changes) fork into a fresh
  // focused tab instead of replacing the current page. Programmatic loads
  // (address bar, back/forward, restore, rehydrate, fresh-tab initial load)
  // set meta.programmatic/meta.expectNav first and are allowed through,
  // including their server redirect chain (will-redirect never forks).
  view.webContents.on("will-navigate", (e, url) => {
    try {
      if (meta.programmatic || meta.expectNav) return; // address-bar / history / restore / reader / view-source + redirect chains
      // Renderer-scoped/blob exports and interstitials always stay in-tab
      // (a blob: URL is meaningless outside its own renderer).
      if (!url || url.startsWith("file://") || url.startsWith("continua://") || url.startsWith("about:") || url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("filesystem:") || url === START_URL || url === OFFLINE_URL || url === CRASH_URL) return;
      // External protocols hand off to the OS instead of dying silently.
      if (/^(mailto|tel|sms|callto):/i.test(url || "")) { e.preventDefault(); shell.openExternal(url).catch(() => {}); return; }
      // Form submits (tracked POSTs above) land in-tab — forking would drop the body.
      const posted = recentPosts.get(url);
      if (posted && Date.now() - posted < 15000) { recentPosts.delete(url); return; }
      if (!/^https?:\/\//i.test(url || "")) { e.preventDefault(); return; }
      e.preventDefault();
      forkTab(url, meta.incognito, true, meta.url, meta.container);
    } catch {}
  });
  // Continua page menu (link/image/search/screenshot/source/inspect) instead
  // of the stock Chromium menu.
  view.webContents.on("context-menu", (_e, params) => {
    try { buildPageMenu(meta, view, params || {}).popup(); } catch {}
  });
  // Browser accelerators while focus is in the page (the React chrome never
  // sees these keystrokes). Only our own list is intercepted — typing and
  // site shortcuts pass through untouched.
  view.webContents.on("before-input-event", (e, input) => {
    try {
      if (input.type !== "keyDown" || input.isAutoRepeat) return;
      const mod = input.control || input.meta;
      const k = (input.key || "").toLowerCase();
      const cmd = (c) => { try { chrome?.webContents.send("chrome-command", { cmd: c }); } catch {} };
      const home = () => resolveUrl(store?.getConfig?.().homepage || START_URL);
      if (mod && !input.alt) {
        if (k === "tab") { e.preventDefault(); cmd(input.shift ? "mru-prev" : "mru-next"); return; }
        if (input.shift && k === "t") { e.preventDefault(); const cur = closedRing(); const s = ClosedRing.shiftClosed(cur); closedRings.set(activeProfileId, s.ring); if (s.entry) openTab(s.entry.url, false, true, s.entry.container || null); return; }
        if (input.shift && k === "n") { e.preventDefault(); openTab(START_URL, true); return; }
        switch (k) {
          case "t": e.preventDefault(); openTab(home()); return;
          case "w": e.preventDefault(); closeTab(meta.label); return;
          case "l": e.preventDefault(); cmd("focus-address"); return;
          case "r": e.preventDefault(); reloadTab(meta.label, input.shift); return;
          case "f": e.preventDefault(); cmd("open-find"); return;
          case "h": e.preventDefault(); cmd("toggle-history"); return;
          case "j": e.preventDefault(); cmd("toggle-downloads"); return;
          case "k": e.preventDefault(); cmd("open-palette"); return;
          case "=": case "+": e.preventDefault(); zoomApply(meta, (meta.zoom || 100) + 20); return;
          case "-": e.preventDefault(); zoomApply(meta, (meta.zoom || 100) - 20); return;
          case "0": e.preventDefault(); zoomApply(meta, 100); return;
        }
        return;
      }
      if (k === "f5") { e.preventDefault(); reloadTab(meta.label, input.shift); return; }
      if (input.alt && !mod && (input.key === "ArrowLeft" || input.key === "ArrowRight")) {
        e.preventDefault();
        historyStep(meta.label, input.key === "ArrowLeft" ? -1 : 1);
      }
    } catch {}
  });
  // Find match counts resolve the find IPC promises below.
  view.webContents.on("found-in-page", (_e, res) => {
    try {
      if (!res?.finalUpdate) return;
      const count = res.matches ?? 0;
      const idx = Math.max(0, (res.activeMatchOrdinal ?? 1) - 1);
      const w = findWaiters.get(meta.label);
      if (w) { findWaiters.delete(meta.label); w({ count, idx: count ? idx : -1 }); }
    } catch {}
  });
  // In-page link clicks (and SPA pushState/hash navs) must grow the same
  // history stack the back/forward buttons read — previously only the
  // address bar grew it, so back stayed disabled after any click. Programmatic
  // loads set meta.expectNav first and are consumed, not double-pushed.
  // NOTE: hash-only / pushState navs stay in-tab (no will-navigate fires).
  // Server redirects never fire will-navigate — only will-redirect — so a
  // programmatic load that lands elsewhere would otherwise leave a stale
  // pre-redirect URL in the stack and Back would bounce forward again.
  view.webContents.on("will-redirect", () => { meta.redirecting = Date.now(); });
  const recordNav = (url, inPage) => {
    // A committed navigation settles any pending programmatic expectation —
    // even one we don't record (start page, interstitials, internals). The
    // fresh-tab start-page commit never matched expectNav, so without this
    // the flag stayed stuck forever: every later link click skipped the fork
    // (treated as "programmatic") and every commit was dropped below.
    if (!url || isStartPageUrl(url)) { meta.expectNav = null; meta.programmatic = false; return; }
    // Reader-mode data: pages, crash/offline interstitials and internal
    // URLs never enter the back/forward stack.
    if (url.startsWith("data:") || url.startsWith("about:") || url.startsWith("continua://") || url.startsWith("view-source:") || isInterstitialUrl(url)) {
      meta.expectNav = null; meta.programmatic = false; return;
    }
    meta.programmatic = false;
    // A forked link tab that commits a real page is a keeper, not a download stub.
    if (!inPage) meta.fork = false;
    // Server redirects never fire will-navigate — only will-redirect — so a
    // programmatic load that lands elsewhere would otherwise leave a stale
    // pre-redirect URL in the stack and Back would bounce forward again.
    const redirected = !inPage && !!meta.redirecting && Date.now() - meta.redirecting < 10000;
    const r = applyNavEntry(meta.history, meta.idx, url, { expectNav: meta.expectNav, inPage: !!inPage, redirected });
    meta.history = r.history; meta.idx = r.idx;
    meta.expectNav = null; meta.redirecting = 0;
    meta.url = url;
    pushTabUpdated(meta.label);
    scheduleSave();
    try { noteCommittedLogin(meta.label, url); } catch {}
  };
  view.webContents.on("did-navigate", (_e, url) => recordNav(isStartPageUrl(url) ? "continua://start" : url, false));
  view.webContents.on("did-navigate-in-page", (_e, url) => recordNav(url, true));
  view.webContents.on("page-title-updated", (_e, title) => { meta.title = title; pushTabUpdated(meta.label); });
  // Links that want a new window (target=_blank, Ctrl+click, window.open):
  // tabs for tab dispositions, app windows for real popups (OAuth, checkout
  // flows). Incognito parents stay incognito — never leak into a normal
  // session. Non-http(s) is denied (no file/js smuggling).
  view.webContents.setWindowOpenHandler(({ url, disposition }) => {
    if (/^(mailto|tel|sms|callto):/i.test(url || "")) { shell.openExternal(url).catch(() => {}); return { action: "deny" }; }
    if (!/^https?:\/\//i.test(url || "")) return { action: "deny" };
    try {
      if (disposition === "background-tab") { openTab(url, meta.incognito, false, meta.container); return { action: "deny" }; }
      if (disposition === "save-to-disk") { forkTab(url, meta.incognito, false, null, meta.container); return { action: "deny" }; }
      if (disposition === "foreground-tab" || disposition === "default" || disposition === "other") {
        openTab(url, meta.incognito, true, meta.container);
        return { action: "deny" };
      }
      if (meta.incognito) { openTab(url, true); return { action: "deny" }; }
      // Real popups (OAuth, checkout flows) stay inside the active profile's
      // partition with the same sandbox as content views — never the default
      // session, so Work ↔ Personal storage never mingles through a popup.
      const w = new BrowserWindow({
        width: 1000, height: 700, autoHideMenuBar: true,
        webPreferences: { partition: activePartition(), contextIsolation: true, sandbox: true, nodeIntegration: false },
      });
      w.loadURL(url);
    } catch {}
    return { action: "deny" };
  });
  view.webContents.on("dom-ready", () => {
    if (meta.cssInjected) return;
    meta.cssInjected = true;
    try { view.webContents.insertCSS(SCROLLBAR_CSS); } catch {}
  });
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
// Host-initiated tab births (link fork, window.open popup, portal, launch URL)
// happen outside any chrome IPC call, so the React strip would never learn
// about them: the page visibly switches while the strip still highlights the
// old tab. Push explicit births/deaths; the chrome dedupes by label.
function pushTabCreated(lab) {
  try {
    const m = tabs.get(lab);
    if (!m || !chrome || chrome.isDestroyed()) return;
    chrome.webContents.send("tab-created", {
      label: lab, url: m.url, title: m.title,
      incognito: !!m.incognito, pinned: !!m.pinned, group: m.group || null,
      container: m.container || null,
      active: lab === focused,
    });
  } catch {}
}
function pushTabClosed(lab) {
  try {
    if (!chrome || chrome.isDestroyed()) return;
    chrome.webContents.send("tab-closed", { label: lab, active: focused });
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
    const target = resolveUrl(m.history[m.idx] || m.url);
    m.expectNav = target;
    m.programmatic = true;
    m.view.webContents.loadURL(target).catch(() => {});
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

function openTab(url, incognito = false, focus = true, container = null) {
  const target = resolveUrl(url);
  const startish = isStartPageUrl(target);
  const lab = label(incognito ? "tab-incog" : "tab");
  const meta = { label: lab, url: startish ? "continua://start" : target, title: startish ? "New Tab" : target, history: [target], idx: 0, scrollY: 0, pinned: false, group: null, container: container || null, incognito, zoom: 100, discarded: false, lastActive: Date.now(), view: null, expectNav: target, programmatic: true };
  // enforce pool budget before adding
  if ([...tabs.values()].filter(m => !m.discarded).length >= POOL_K) prunePool();
  meta.view = makeView(meta);
  tabs.set(lab, meta); order.push(lab);
  maybeAutoGroup(meta); // opt-in same-site grouping (default off)
  meta.view.webContents.loadURL(target).catch(() => {});
  if (focus) activate(lab);
  else layoutViews();
  pushTabCreated(lab);
  if (!incognito) { store?.enqueue({ op: "upsert_tab", label: lab, url: meta.url, title: meta.title }); scheduleSave(); }
  return lab;
}

// A forked link tab: if its URL turns out to be a download (attachment, no
// page ever commits), the tab closes itself once the download starts instead
// of lingering as a junk tab. Any real commit clears the flag (recordNav).
// The fork inherits the source page as its back entry — otherwise Back in a
// forked tab would always be dead (single-entry history by construction).
function forkTab(url, incognito = false, focus = true, fromUrl = null, container = null) {
  const lab = openTab(url, incognito, focus, container);
  const m = tabs.get(lab);
  if (m) {
    m.fork = true;
    if (fromUrl && isWeb(fromUrl) && fromUrl !== m.history[0]) {
      m.history = [fromUrl, m.history[0]];
      m.idx = 1;
      pushTabUpdated(lab);
    }
  }
  return lab;
}

function activate(lab) {
  const m = tabs.get(lab);
  if (!m) return;
  agentLog({ type: "activate", url: m.url, label: lab });
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

function closeTab(lab, opts = {}) {
  const m = tabs.get(lab);
  if (!m) return;
  try { readerCache.delete(lab); } catch {}
  try { findWaiters.delete(lab); } catch {}
  try { pendingCandidates.delete(lab); } catch {}
  try { pendingAddr.delete(lab); } catch {}
  if (m.view) { try { chrome.contentView.removeChildView(m.view); m.view.webContents.close(); } catch {} }
  if (m.incognito) { try { session.fromPartition(`incognito-${lab}`).clearStorageData(); } catch {} }
  else {
    const ring = closedRing();
    const next = ClosedRing.pushClosed(ring, { url: m.url, title: m.title, container: m.container || null, at: Date.now() });
    closedRings.set(activeProfileId, next); // vault-free: plain ring, per-profile
  }
  tabs.delete(lab); order = order.filter(x => x !== lab);
  store?.enqueue({ op: "close_tab", label: lab });
  if (focused === lab) { focused = order[order.length - 1] || null; if (focused) activate(focused); }
  // UI-driven closes already update the strip + drive focus themselves
  // (positional neighbor + activate); emitting here would yank focus back to
  // the host's last-order pick. Host-driven closes (download stubs,
  // workspace teardown) still notify so the strip drops the ghost.
  if (!opts.silent) pushTabClosed(lab);
  scheduleSave();
}

// Zoom shared by the zoom IPC and in-page Ctrl+=/-/0.
function zoomApply(t, value) {
  t.zoom = Math.min(200, Math.max(50, value));
  try { t.view?.webContents.setZoomFactor(t.zoom / 100); } catch {}
  try { scheduleSave(); } catch {}
  return t.zoom;
}

// Reload shared by toolbar/F5/menu/in-page. Interstitials (offline/crash)
// retry the failed page instead of pointlessly reloading the local file.
function reloadTab(lab, force = false) {
  const t = tabs.get(lab); if (!t) return;
  const wc = t.view?.webContents;
  let current = "";
  try { current = wc && !wc.isDestroyed() ? wc.getURL() : ""; } catch {}
  if (isInterstitialUrl(current)) {
    const target = resolveUrl(t.history[t.idx] || t.url);
    t.expectNav = target; t.programmatic = true;
    ensureLive(lab)?.view?.webContents.loadURL(target).catch(() => {});
    return;
  }
  if (t.view && !t.discarded && wc && !wc.isDestroyed()) {
    try { force ? wc.reloadIgnoringCache() : wc.reload(); } catch {}
  } else {
    // Sleeping (discarded) tabs have no view to reload — wake them with a
    // fresh load of the current entry instead of silently doing nothing.
    // ensureLive loads when it recreates the view, so no second loadURL here
    // (it would just abort the first request and double-hit the server).
    try {
      ensureLive(lab);
      if (lab === focused) pendingFocus = lab;
    } catch {}
  }
}

// History-aware step shared by the back/forward IPC and the page menu.
function historyStep(lab, dir) {
  const t = tabs.get(lab); if (!t) return;
  const ni = t.idx + dir;
  if (ni >= 0 && ni < t.history.length) {
    t.idx = ni; t.url = t.history[ni]; t.expectNav = t.url; t.programmatic = true;
    // ensureLive loads on recreate — only load explicitly for a live view.
    const fresh = !t.view || t.discarded;
    const live = ensureLive(lab);
    if (!fresh) live?.view?.webContents.loadURL(t.url).catch(() => {});
    pushTabUpdated(lab);
  } else {
    const wc = t.view?.webContents;
    if (wc && !wc.isDestroyed()) { t.programmatic = true; dir < 0 ? wc.goBack() : wc.goForward(); }
  }
}

// Screenshot shared by the screenshot IPC and the page menu.
async function saveScreenshot(lab) {
  const t = lab ? tabs.get(lab) : focused ? tabs.get(focused) : null;
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
// Full-page screenshot: measures the document, temporarily grows the view
// to the full content height, captures, then restores bounds. Falls back to
// a viewport capture when measurement fails (canvas/WebGL pages, huge docs).
async function saveFullScreenshot(lab) {
  const t = lab ? tabs.get(lab) : focused ? tabs.get(focused) : null;
  if (!t?.view || t.discarded) return { error: "no-tab" };
  const dir = app.getPath("pictures");
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  const save = (img) => {
    const p = uniqueDownloadPath(dir, `continua-full-${Date.now()}.png`);
    fs.writeFileSync(p, img.toPNG());
    return { path: p };
  };
  try {
    const dims = await t.view.webContents.executeJavaScript(
      "({ w: Math.min(4000, document.documentElement.scrollWidth || window.innerWidth), h: Math.min(16000, document.documentElement.scrollHeight || window.innerHeight) })",
    ).catch(() => null);
    if (!dims || !dims.h || dims.h <= 0) {
      const img = await t.view.webContents.capturePage();
      return save(img);
    }
    // Grow the view tall (keep it hidden-state as-is), capture, restore.
    const prev = (() => { try { return t.view.getBounds(); } catch { return null; } })();
    try {
      const { width } = chrome.getContentBounds();
      const rw = studio ? 0 : TAB_RAIL_W;
      t.view.setBounds({ x: rw, y: 0, width: Math.max(200, width - rw), height: Math.max(200, dims.h) });
      await new Promise((r) => setTimeout(r, 350)); // let layout settle
      const img = await t.view.webContents.capturePage();
      try { sizeView(t.view); } catch {}
      void prev;
      return save(img);
    } catch (e) {
      try { sizeView(t.view); } catch {}
      throw e;
    }
  } catch (e) { return { error: String(e?.message || e) }; }
}

// Read-aloud: speaks the tab's article text via speechSynthesis in the
// content view (OS voices, offline-capable). Chunked so Stop lands quickly;
// "stop" cancels immediately. Rate is clamped to the safe range.
async function readAloud(lab, action = "speak", rate) {
  const t = lab ? tabs.get(lab) : focused ? tabs.get(focused) : null;
  if (!t?.view || t.discarded) return { error: "no-tab" };
  const wc = t.view.webContents;
  if (action === "stop" || action === "cancel") return await readAloudStop(t);
  if (action === "pause") {
    try { await wc.executeJavaScript("window.speechSynthesis.pause()"); return { state: "paused" }; }
    catch (e) { return { error: String(e?.message || e) }; }
  }
  if (action === "resume") {
    try { await wc.executeJavaScript("window.speechSynthesis.resume()"); return { state: "speaking" }; }
    catch (e) { return { error: String(e?.message || e) }; }
  }
  try {
    const raw = await wc.executeJavaScript(
      "(document.querySelector('article')?.innerText || document.body?.innerText || '').slice(0, 60000)",
    ).catch(() => "");
    const chunks = Speech.chunkText(raw || "");
    if (!chunks.length) return { error: "no-text" };
    const r = Speech.clampRate(rate);
    // Cancel any in-flight speech, then queue chunks (cap 60 ≈ 12k chars).
    await wc.executeJavaScript("window.speechSynthesis.cancel()").catch(() => {});
    const queued = chunks.slice(0, 60);
    const speakJs = (list, rateVal) => `
      (() => {
        const chunks = ${JSON.stringify(list)};
        const rate = ${JSON.stringify(rateVal)};
        const synth = window.speechSynthesis;
        for (const c of chunks) {
          const u = new SpeechSynthesisUtterance(c);
          u.rate = rate;
          synth.speak(u);
        }
        return chunks.length;
      })()`;
    const n = await wc.executeJavaScript(speakJs(queued, r)).catch(() => 0);
    return { state: "speaking", chunks: n || queued.length, truncated: chunks.length > queued.length };
  } catch (e) { return { error: String(e?.message || e) }; }
}

async function readAloudStop(t) {
  const tab = t || (focused ? tabs.get(focused) : null);
  if (!tab?.view) return { state: "stopped" };
  try { await tab.view.webContents.executeJavaScript("window.speechSynthesis.cancel()").catch(() => {}); } catch {}
  return { state: "stopped" };
}

// ---------- H7 helpers: E2E sync-key envelope ----------
// Raw sync key, decrypted from cfg only in memory (never logged, never IPC'd
// except through the explicit show/create/import calls above).
function getSyncKeyRaw() {
  try {
    if (!store?.cfg?.sync_key_enc || !loginsAvailable()) return null;
    const raw = safeStorage.decryptString(Buffer.from(store.cfg.sync_key_enc, "base64"));
    return VaultSync.validSyncKey(raw) ? raw : null;
  } catch { return null; }
}
// Build the ciphertext envelope for this push (null when no key/logins).
function buildLoginsEnc() {
  const key = getSyncKeyRaw();
  if (!key) return null;
  const rows = [];
  for (const l of getLogins()) {
    try {
      const pass = safeStorage.decryptString(Buffer.from(l.passwordEnc, "base64"));
      rows.push({ origin: l.origin, username: l.username, password: pass });
    } catch { /* skip undecryptable rows */ }
  }
  if (!rows.length) return null;
  const env = VaultSync.encryptLogins(key, VaultSync.toPlainRows(rows));
  return env.error ? null : env;
}
// Adopt an incoming envelope: decrypt, merge unknown pairs, seal locally.
function adoptLoginsEnc(env) {
  const key = getSyncKeyRaw();
  if (!key || !env || typeof env !== "object") return 0;
  const dec = VaultSync.decryptLogins(key, env);
  if (dec.error || !Array.isArray(dec.rows)) return 0;
  const adopt = VaultSync.mergeIncomingLogins(getLogins(), dec.rows);
  let n = 0;
  for (const r of adopt) {
    try {
      const res = saveLoginInternal(r.origin, r.username, r.password);
      if (res && res.id) n++;
    } catch { /* keep going */ }
  }
  return n;
}

// Live omnibox suggestions from the engine's suggest API (900ms cap, history
// fallback in the IPC). Same query you'd send by searching — nothing extra.
async function fetchSuggestions(engine, query) {
  const q = (query || "").trim();
  if (q.length < 2) return [];
  const eq = encodeURIComponent(q);
  const url = engine === "duckduckgo" ? `https://duckduckgo.com/ac/?q=${eq}&type=list`
    : engine === "bing" ? `https://api.bing.com/osjson.aspx?query=${eq}`
    : engine === "brave" ? `https://search.brave.com/api/suggest?q=${eq}`
    : `https://suggestqueries.google.com/complete/search?client=firefox&q=${eq}`;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 900);
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36" },
    });
    clearTimeout(t);
    if (!res.ok) return [];
    const body = await res.json().catch(() => null);
    const list = Array.isArray(body) ? body[1] : body?.suggestions || body?.results;
    const out = [];
    if (Array.isArray(list)) {
      for (const s of list) {
        const text = typeof s === "string" ? s : s?.phrase || s?.text || s?.value;
        if (typeof text === "string" && text.trim() && text.trim() !== q) out.push(text.trim());
        if (out.length >= 4) break;
      }
    }
    return out;
  } catch { return []; }
}

// Search URL builder mirroring the frontend (default engines + {q} customs).
function searchUrlForMain(engine, query) {
  const q = encodeURIComponent((query || "").trim());
  try {
    const customs = store?.getConfig?.().custom_engines || [];
    const c = customs.find(e => e.id === engine);
    if (c && c.url.includes("{q}")) {
      const u = new URL(c.url.replace("{q}", q));
      if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
    }
  } catch {}
  if (engine === "duckduckgo") return `https://duckduckgo.com/?q=${q}`;
  if (engine === "bing") return `https://www.bing.com/search?q=${q}`;
  if (engine === "brave") return `https://search.brave.com/search?q=${q}`;
  return `https://www.google.com/search?q=${q}`;
}

// Continua page menu: link/image tools, search, screenshot, source, inspect.
// Replaces the stock Chromium menu (which exposes no browser actions).
function buildPageMenu(meta, view, p) {
  const wc = view.webContents;
  const flags = p.editFlags || {};
  const link = p.linkURL && /^https?:\/\//i.test(p.linkURL) ? p.linkURL : null;
  const src = p.srcURL && /^https?:\/\//i.test(p.srcURL) ? p.srcURL : null;
  const sel = (p.selectionText || "").trim();
  const items = [];
  if (link) {
    items.push({ label: "Open link in new tab", click: () => openTab(link, meta.incognito, false) });
    items.push({ label: "Copy link address", click: () => clipboard.writeText(p.linkURL) });
    items.push({ type: "separator" });
  }
  if (src && p.mediaType === "image") {
    items.push({ label: "Open image in new tab", click: () => openTab(src, meta.incognito, false) });
    items.push({ label: "Copy image address", click: () => clipboard.writeText(p.srcURL) });
    items.push({ label: "Save image as…", click: () => { try { wc.downloadURL(p.srcURL); } catch {} } });
    items.push({ type: "separator" });
  } else if (src && !link) {
    items.push({ label: "Open media in new tab", click: () => openTab(src, meta.incognito, false) });
    items.push({ label: "Copy media address", click: () => clipboard.writeText(p.srcURL) });
    items.push({ type: "separator" });
  }
  if (p.misspelledWord && Array.isArray(p.dictionarySuggestions) && p.dictionarySuggestions.length) {
    for (const s of p.dictionarySuggestions.slice(0, 3)) {
      items.push({ label: s, click: () => { try { wc.replaceMisspelling(s); } catch {} } });
    }
    items.push({ type: "separator" });
  }
  if (p.isEditable) {
    if (flags.canUndo) items.push({ label: "Undo", role: "undo" });
    if (flags.canRedo) items.push({ label: "Redo", role: "redo" });
    if (flags.canCut) items.push({ label: "Cut", role: "cut" });
    if (flags.canCopy) items.push({ label: "Copy", role: "copy" });
    if (flags.canPaste) items.push({ label: "Paste", role: "paste" });
    items.push({ label: "Select all", role: "selectAll" });
    items.push({ type: "separator" });
  } else if (sel) {
    items.push({ label: "Copy", role: "copy" });
    let engine = "google";
    try { engine = store?.getConfig?.().search_engine || "google"; } catch {}
    items.push({ label: `Search for “${sel.slice(0, 40)}${sel.length > 40 ? "…" : ""}”`, click: () => openTab(searchUrlForMain(engine, sel), meta.incognito) });
    items.push({ type: "separator" });
  }
  items.push({ label: "Back", enabled: meta.idx > 0, click: () => historyStep(meta.label, -1) });
  items.push({ label: "Forward", enabled: meta.idx + 1 < meta.history.length, click: () => historyStep(meta.label, 1) });
  items.push({ label: "Reload", click: () => reloadTab(meta.label) });
  items.push({ label: "Duplicate tab", click: () => openTab(meta.url, meta.incognito, false) });
  if (isWeb(meta.url)) {
    items.push({ label: "Save to reading list", click: () => {
      try { store.addReading && store.addReading(meta.url, meta.title); } catch {}
    }});
    items.push({ label: "Fill address", click: () => {
      // Same user-triggered fill as the palette (no autosubmit, ever).
      void (async () => {
        try {
          const r = await fillAddressFor(meta.label);
          if (!r?.ok) {
            try { new Notification({ title: r?.error === "no-address" ? "No saved address — add one in Settings → Addresses" : "Address fill found no empty fields", silent: true }).show(); } catch {}
          }
        } catch {}
      })();
    }});
    items.push({ label: "Send to paired devices", click: () => {
      const r = queueTabdrop(meta.label);
      try {
        if (r?.ok) new Notification({ title: "Tab sent to paired devices", body: meta.title || meta.url, silent: true }).show();
        else if (r?.error === "unpaired") new Notification({ title: "Pair a device first", body: "Settings → Sync", silent: true }).show();
      } catch {}
    }});
    items.push({ label: "Show QR code…", click: () => {
      try { chrome?.webContents.send("chrome-command", { cmd: "open-qr" }); } catch {}
    }});
  }
  const muted = (() => { try { return wc.isAudioMuted(); } catch { return !!meta.muted; } })();
  items.push({ label: muted ? "Unmute tab" : "Mute tab", click: () => {
    try { if (!wc.isDestroyed()) wc.setAudioMuted(!muted); } catch {}
    meta.muted = !muted;
  }});
  if (isWeb(meta.url)) {
    let fhost = "";
    try { fhost = new URL(meta.url).hostname.replace(/^www\./, ""); } catch {}
    if (fhost) items.push({ label: `Forget this site…`, click: () => { void forgetSiteFor(meta.label); } });
  }
  items.push({ type: "separator" });
  items.push({ label: "Save screenshot…", click: async () => {
    const r = await saveScreenshot(meta.label);
    if (r?.path) {
      try {
        const n = new Notification({ title: "Screenshot saved", body: r.path });
        n.on("click", () => { try { shell.showItemInFolder(r.path); } catch {} });
        n.show();
      } catch {}
    }
  }});
  items.push({ label: "Print…", click: () => { try { if (!wc.isDestroyed()) wc.print({ silent: false, printBackground: true }); } catch {} } });
  if (isWeb(meta.url)) {
    items.push({ label: "View page source", click: () => openTab(`view-source:${meta.url}`, meta.incognito, false) });
  }
  items.push({ type: "separator" });
  items.push({ label: "Inspect element", click: () => { try { if (!wc.isDestroyed()) wc.inspectElement(p.x, p.y); } catch {} } });
  return Menu.buildFromTemplate(items);
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
// Agent "see" collector: reduced, semantic tree over the live DOM. Node ids
// are index-paths; the host re-walks with the same ordering in act_tab.
const COLLECT_AGENT_TREE = `(() => {
  const cap = 600, out = [];
  const role = (el) => {
    if (el.getAttribute && el.getAttribute('role')) return el.getAttribute('role');
    const tag = el.tagName ? el.tagName.toLowerCase() : '';
    const t = el.getAttribute && el.getAttribute('type');
    if (tag === 'a') return 'link';
    if (tag === 'button') return 'button';
    if (tag === 'input') { if (t === 'checkbox') return 'checkbox'; if (t === 'radio') return 'radio'; if (t === 'search') return 'searchbox'; return 'textbox'; }
    if (tag === 'textarea') return 'textarea';
    if (tag === 'select') return 'combobox';
    if (tag === 'img') return 'image';
    if (['nav','header','footer','main','aside'].includes(tag)) return tag;
    if (/^h[1-6]$/.test(tag)) return 'heading';
    return 'generic';
  };
  const name = (el) => {
    const a = el.getAttribute && el.getAttribute('aria-label');
    if (a && a.trim()) return a.trim().slice(0,120);
    if (el.labels && el.labels[0]) { const tx = el.labels[0].innerText; if (tx && tx.trim()) return tx.trim().slice(0,120); }
    const p = el.getAttribute && el.getAttribute('placeholder');
    if (p) return p.slice(0,120);
    if (el.getAttribute && el.getAttribute('title')) return el.getAttribute('title').slice(0,120);
    if (el.children && el.children.length === 0) { const tx = (el.innerText || '').trim(); if (tx) return tx.slice(0,120); }
    if (el.tagName === 'A') return (el.innerText || el.href || '').trim().slice(0,120);
    return '';
  };
  const walk = (el, path) => {
    if (out.length >= cap) return null;
    const r = role(el), nm = name(el);
    const node = { id: path, role: r, name: nm, children: [] };
    if (r === 'textbox' || r === 'searchbox' || r === 'combobox' || r === 'textarea') node.value = String(el.value || '').slice(0,120);
    if (r === 'checkbox' || r === 'radio') node.checked = el.checked === true;
    if (el.disabled) node.disabled = true;
    if (r === 'link' && el.href) node.href = el.href.slice(0,2000);
    const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    if (!rect || rect.width < 1 || rect.height < 1) node.hidden = true;
    for (let i = 0; i < el.children.length; i++) { const cn = walk(el.children[i], path ? path + '.' + i : String(i)); if (cn) node.children.push(cn); }
    out.push(node);
    return node;
  };
  walk(document.body, '0');
  return out.slice(0, cap);
})()`;

ipcMain.handle("continua", async (_evt, op, args = {}) => {
  const m = args.label ? tabs.get(args.label) : focused ? tabs.get(focused) : null;
  switch (op) {
    case "open_tab": return openTab(args.url || START_URL, false, true, validContainerArg(args.container));
    case "list_tabs": return [...tabs.entries()].map(([lab, t]) => ({ label: lab, url: t.url, title: t.title, pinned: !!t.pinned, group: t.group || null, container: t.container || null, incognito: !!t.incognito, discarded: !!t.discarded }));
    case "set_tab_group": {
      const t = tabs.get(args.label);
      if (t) { t.group = typeof args.group === "string" && args.group ? args.group : null; scheduleSave(); }
      return t?.group || null;
    }
    case "list_groups": return listGroups();
    case "create_group": return createGroup(args.name);
    case "open_incognito_tab": return openTab(args.url || START_URL, true);
    case "close_tab": closeTab(args.label, { silent: true }); return;
    case "activate_tab": activate(args.label); return;
    case "navigate_tab": { const t = tabs.get(args.label); if (t) { const target = resolveUrl(args.url); t.url = isStartPageUrl(target) ? "continua://start" : target; t.history = t.history.slice(0, t.idx + 1).concat(target); t.idx++; t.expectNav = target; t.programmatic = true; const fresh = !t.view || t.discarded; const live = ensureLive(args.label); if (!fresh) live?.view?.webContents.loadURL(target).catch(() => {}); pushTabUpdated(args.label); } return; }
    case "reload_tab": reloadTab(args.label || focused, !!args.force); return;
    case "back_tab": case "forward_tab": historyStep(args.label, op === "back_tab" ? -1 : 1); return;
    case "nav_state": { const t = tabs.get(args.label); return { back: (t?.idx ?? 0) > 0, forward: (t ? t.idx < t.history.length - 1 : false) }; }
    case "set_tab_pinned": { const t = tabs.get(args.label); if (t) t.pinned = !!args.pinned; scheduleSave(); return; }
    case "find_in_tab": case "find_next": case "find_prev": {
      const t = args.label ? tabs.get(args.label) : focused ? tabs.get(focused) : null;
      if (!t?.view) return { count: 0, idx: -1 };
      const q = args.query || args.text || "";
      const key = args.label || t.label;
      if (!q) { try { t.view.webContents.stopFindInPage("clearSelection"); } catch {} return { count: 0, idx: -1 }; }
      const out = new Promise((res) => {
        findWaiters.set(key, res);
        setTimeout(() => { if (findWaiters.get(key) === res) { findWaiters.delete(key); res({ count: 0, idx: -1 }); } }, 2500);
      });
      try { op === "find_prev" ? t.view.webContents.findInPage(q, { forward: false }) : t.view.webContents.findInPage(q); }
      catch { findWaiters.delete(key); return { count: 0, idx: -1 }; }
      return out;
    }
    case "stop_find": { const t = args.label ? tabs.get(args.label) : focused ? tabs.get(focused) : null; try { t?.view?.webContents.stopFindInPage("clearSelection"); } catch {} return; }
    case "zoom_tab": { const t = tabs.get(args.label); if (t) return zoomApply(t, typeof args.value === "number" ? args.value : (t.zoom || 100) + (args.step || 0)); return 100; }
    case "dark_toggle": return await toggleDark(args.label);
    case "set_search_engine": {
      const customs = (store.getConfig ? store.getConfig().custom_engines : []) || [];
      if (!["google", "duckduckgo", "bing", "brave"].includes(args.engine) && !customs.find(e => e.id === args.engine)) return { error: "unknown engine" };
      return store.patchConfig({ search_engine: args.engine });
    }
    case "get_browser_config": case "getBrowserConfig": return store.getConfig();
    case "update_config": { const c = store.patchConfig(args.patch || {}); refreshShields(); return c; }
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
    case "save_session": return store.saveSession(args.tabs || [...tabs.values()].map(t => ({ label: t.label, url: t.url, title: t.title, group: t.group || null, container: t.container || null })), args.active ?? focused);
    case "load_session": return store.loadSession();
    case "restore_session": { // merge, never destructive replace
      const ids = store.restoreSession(args.id) || [];
      const out = [];
      for (const t of ids) { if ([...tabs.values()].find(x => x.url === t.url)) continue; const lab = openTab(t.url, false, true, validContainerArg(t.container)); out.push({ label: lab, url: t.url, title: t.title || t.url }); }
      return out; }
    case "reopen_last_closed": { const cur = closedRing(); const s = ClosedRing.shiftClosed(cur); closedRings.set(activeProfileId, s.ring); if (!s.entry) return null; const lab = openTab(s.entry.url, false, true, s.entry.container || null); try { scheduleSave(); } catch {} return { label: lab, url: s.entry.url, title: s.entry.title }; }
    case "list_closed": return ClosedRing.publicRows(closedRing());
    case "reopen_closed": {
      const { ring, entry } = ClosedRing.reopenAt(closedRing(), args.index);
      closedRings.set(activeProfileId, ring);
      if (!entry) return null;
      try { scheduleSave(); } catch {}
      const lab = openTab(entry.url, false, true, entry.container || null);
      return { label: lab, url: entry.url, title: entry.title };
    }
    case "clear_closed": closedRings.set(activeProfileId, []); try { store.saveClosedRing?.([]); } catch {} return [];
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
    case "send_tab": return queueTabdrop(args.label);
    case "sync_status": return { paired: !!store.cfg.capability_token, deviceId: store.cfg.device_id, serverDeviceId: "", trustLevel: store.cfg.capability_token ? "known" : "local", lastVersion: syncVersion, pending: store.queueDepth ? store.queueDepth() : store.pendingOps().length, lastSyncAt, lastSyncError };
    case "get_history": return store.getHistory();
    case "clear_history": store.clearHistory(); return;
    case "list_reading": return store.getReading ? store.getReading() : [];
    case "add_reading": return store.addReading ? store.addReading(args.url, args.title) : [];
    case "remove_reading": return store.removeReading ? store.removeReading(args.url) : [];
    case "mark_reading": return store.markReading ? store.markReading(args.url, !!args.read) : [];
    case "clear_cache": {
      // Drop cached blobs (CacheStorage, GPU/shader cache) for this profile.
      // Cookies, logins, history and DOM storage are untouched.
      try {
        await session.fromPartition(activePartition()).clearCache();
        return { ok: true };
      } catch (e) { return { error: String(e?.message || e) }; }
    }
    case "search_suggestions": {
      const live = await fetchSuggestions(args.engine || "google", args.query || args.term || "");
      if (live.length) return live;
      return store.searchHistory(args.query || args.term || "").map(h => h.url);
    }
    case "get_bookmarks": return store.getBookmarks();
    case "add_bookmark": return store.addBookmark(args.url, args.title);
    case "remove_bookmark": return store.removeBookmark(args.url);
    case "mark_vault": case "unmark_vault": return null; // vault removed (ADR-008)
    case "open_app_window": {
      if (!/^https?:\/\//i.test(args.url || "")) return { error: "bad-url" };
      const w = new BrowserWindow({
        width: 1000, height: 700, autoHideMenuBar: true,
        webPreferences: { partition: activePartition(), contextIsolation: true, sandbox: true, nodeIntegration: false },
      });
      w.loadURL(args.url);
      return;
    }
    case "new_tab_url": return store.getConfig().homepage || START_URL;
    case "get_active_url": return m?.url || START_URL;
    case "pool_state": return { live: [...tabs.values()].filter(t => !t.discarded).length, discarded: [...tabs.values()].filter(t => t.discarded).length, rssMb: (rss() / 1048576).toFixed(1), budgetMb: (RSS_BUDGET / 1048576).toFixed(0), active: focused, k: POOL_K, gpu: gpuStatus(), pendingFocus, trackersCleaned };
    case "list_downloads": return [...downloads.values()].reverse().slice(0, 50).map(dlPublic);
    case "open_download": { const d = downloads.get(args.id); if (d?.path) shell.openPath(d.path).catch(() => {}); return; }
    case "reveal_download": { const d = downloads.get(args.id); if (d?.path) shell.showItemInFolder(d.path); return; }
    case "cancel_download": { const d = downloads.get(args.id); try { d?.item?.cancel(); } catch {} return; }
    case "pause_download": { const d = downloads.get(args.id); try { d?.item?.pause(); if (d) d.state = "paused"; } catch {} return; }
    case "resume_download": { const d = downloads.get(args.id); try { d?.item?.resume(); if (d) d.state = "progressing"; } catch {} return; }
    case "clear_downloads": { for (const [id, d] of downloads) if (d.state === "completed" || d.state === "cancelled" || d.state === "failed") downloads.delete(id); return [...downloads.values()].reverse().map(dlPublic); }
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
    case "screenshot_tab": return await saveScreenshot(args.label);
    case "quit_and_install": { try { require("electron-updater").autoUpdater.quitAndInstall(); } catch {} return; }
    case "check_updates": {
      try { await require("electron-updater").autoUpdater.checkForUpdates(); return { ok: true }; }
      catch { return { ok: false }; }
    }
    case "clear_browsing_data": {
      const which = args.which || {};
      const out = {};
      try {
        if (which.history) { store.clearHistory(); out.history = true; }
        const ses = session.fromPartition(activePartition());
        if (which.cache) { await ses.clearCache().catch(() => {}); out.cache = true; }
        if (which.cookies) { await ses.clearStorageData({ storages: ["cookies"] }).catch(() => {}); out.cookies = true; }
        if (which.storage) { await ses.clearStorageData({ storages: ["localstorage", "indexeddb", "websql", "serviceworkers", "cachestorage"] }).catch(() => {}); out.storage = true; }
      } catch (e) { out.error = String(e?.message || e); }
      return out;
    }
    case "print_tab": {
      const t = args.label ? tabs.get(args.label) : focused ? tabs.get(focused) : null;
      if (t?.view) t.view.webContents.print({ silent: false, printBackground: true });
      return;
    }
    case "forget_site": return await forgetSiteFor(args.label);
    case "reader_toggle": return await toggleReader(args.label);
    case "login_status": return { available: loginsAvailable() };
    case "list_logins": return getLogins().map(l => ({ id: l.id, origin: l.origin, username: l.username, addedAt: l.addedAt }));
    case "add_login": return saveLoginInternal(args.origin || "", args.username, args.password);
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
    case "save_login_decision": {
      // Chrome answered the save prompt (or it timed out client-side).
      // Secrets stay main-side: the renderer only ever sees origin+username.
      const cand = args.label ? pendingCandidates.get(args.label) : null;
      const t = args.label ? tabs.get(args.label) : null;
      if (args.decision === "never" && cand) {
        const cur = getNeverList();
        if (!cur.includes(cand.origin)) {
          store.cfg.login_never = cur.concat(cand.origin);
          try { store._saveCfg(); } catch {}
        }
        pendingCandidates.delete(args.label);
        return { ok: true, decision: "never" };
      }
      if (args.decision === "save" && cand && t && !t.incognito) {
        const r = saveLoginInternal(cand.origin, cand.username, cand.password);
        pendingCandidates.delete(args.label);
        if (r.error) return r;
        try {
          const have = forOriginLogins(getLogins(), cand.origin);
          if (have.length) chrome?.webContents.send("login-available", { label: args.label, origin: cand.origin, count: have.length });
        } catch {}
        return { ok: true, saved: true, id: r.id };
      }
      if (args.label) pendingCandidates.delete(args.label);
      return { ok: true, decision: "dismiss" };
    }
    case "login_never_list": return getNeverList();
    case "save_address_decision": {
      const cand = args.label ? pendingAddr.get(args.label) : null;
      const t = args.label ? tabs.get(args.label) : null;
      if (args.decision === "never" && cand) {
        try {
          const cur = Array.isArray(store?.cfg?.autofill_never) ? store.cfg.autofill_never : [];
          if (!cur.includes(cand.origin)) {
            store.cfg.autofill_never = cur.concat(cand.origin);
            store._saveCfg();
          }
        } catch {}
        pendingAddr.delete(args.label);
        return { ok: true, decision: "never" };
      }
      if (args.decision === "save" && cand && t && !t.incognito) {
        const r = saveAddressInternal(cand.fields);
        pendingAddr.delete(args.label);
        return r.error ? r : { ok: true, saved: true, id: r.id };
      }
      if (args.label) pendingAddr.delete(args.label);
      return { ok: true, decision: "dismiss" };
    }
    case "list_addresses": {
      if (!loginsAvailable()) return { error: "unavailable" };
      try { return getAddresses().map(decryptAddress); }
      catch { return { error: "decrypt" }; }
    }
    case "add_address": return saveAddressInternal(args.fields || {});
    case "remove_address": {
      store.cfg.addresses = getAddresses().filter(a => a.id !== args.id);
      try { store._saveCfg(); } catch {}
      return true;
    }
    case "fill_address": return await fillAddressFor(args.label, args.id);
    case "login_never_remove": {
      store.cfg.login_never = getNeverList().filter((o) => o !== args.origin);
      try { store._saveCfg(); } catch {}
      return getNeverList();
    }
    case "login_count": {
      const t = args.label ? tabs.get(args.label) : focused ? tabs.get(focused) : null;
      const origin = t ? originOf(t.url) : null;
      if (!origin) return { origin: null, count: 0 };
      return { origin, count: forOriginLogins(getLogins(), origin).length };
    }
    case "list_extensions": return listExtensions();
    case "load_extension": return await loadExtension(args.path);
    case "install_store_extension": return await installStoreExtension(args.url || args.id || "");
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
    case "reveal_path": {
      // Open a folder in the system file manager (extensions autoload dir…).
      const dir = args.dir === "extensions" ? extDir() : null;
      if (dir) {
        try { fs.mkdirSync(dir, { recursive: true }); } catch {}
        try { shell.showItemInFolder(dir); }
        catch { void shell.openPath(dir).catch(() => {}); }
      }
      return dir;
    }
    case "list_profiles": return { activeId: activeProfileId, profiles: profileState.profiles };
    case "chrome_profile_status": return chromeProfileStatus();
    case "import_chrome_history": return await importChromeHistory();
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
    // ---------- H6: container tabs (contextual identities) ----------
    case "list_containers": return getContainers();
    case "create_container": return createContainer(args.name);
    case "rename_container": return renameContainer(args.id, args.name);
    case "delete_container": deleteContainer(args.id); return getContainers();
    case "open_container_tab": {
      const cid = validContainerArg(args.container);
      if (!cid) return { error: "unknown-container" };
      return openTab(args.url || START_URL, false, true, cid);
    }
    case "set_tab_container": {
      const t = tabs.get(args.label);
      if (!t) return { error: "no-tab" };
      if (t.incognito) return { error: "incognito" };
      const cid = args.container ? validContainerArg(args.container) : null;
      if (args.container && !cid) return { error: "unknown-container" };
      // Moving partitions requires a fresh view: discard and rehydrate.
      t.container = cid;
      if (t.view && !t.discarded) {
        try { chrome.contentView.removeChildView(t.view); t.view.webContents.close(); } catch {}
        t.view = null; t.discarded = true;
        if (args.label === focused) { ensureLive(args.label); pendingFocus = args.label; }
      }
      scheduleSave(); layoutViews();
      return { container: cid };
    }
    // ---------- medium: tab search (substring over live tabs) ----------
    case "search_tabs": {
      const q = String(args.query || "").trim().toLowerCase();
      const rows = [...tabs.entries()].map(([lab, t]) => ({ label: lab, url: t.url, title: t.title, pinned: !!t.pinned, group: t.group || null, container: t.container || null, incognito: !!t.incognito, discarded: !!t.discarded }));
      if (!q) return rows;
      return rows.filter((t) => (t.title || "").toLowerCase().includes(q) || t.url.toLowerCase().includes(q)).slice(0, 50);
    }
    // ---------- medium: search keywords (`d cats`) ----------
    case "list_keywords": return Keywords.sanitizeKeywords(store?.getConfig ? store.getConfig().search_keywords : store?.state?.config?.search_keywords);
    case "add_keyword": {
      const clean = Keywords.sanitizeKeyword({ key: args.key, name: args.name, url: args.url, engine: args.engine });
      if (!clean) return { error: "bad-keyword" };
      const list = Keywords.sanitizeKeywords(store?.getConfig ? store.getConfig().search_keywords : store?.state?.config?.search_keywords).filter((k) => k.key !== clean.key);
      list.push(clean);
      try { store.patchConfig ? store.patchConfig({ search_keywords: list }) : null; } catch {}
      try { if (store.state?.config && !store.patchConfig) { store.state.config.search_keywords = list; store._saveSoon ? store._saveSoon() : store._save(); } } catch {}
      return list;
    }
    case "remove_keyword": {
      const list = Keywords.sanitizeKeywords(store?.getConfig ? store.getConfig().search_keywords : store?.state?.config?.search_keywords).filter((k) => k.key !== String(args.key || "").toLowerCase());
      try { store.patchConfig ? store.patchConfig({ search_keywords: list }) : null; } catch {}
      try { if (store.state?.config && !store.patchConfig) { store.state.config.search_keywords = list; store._saveSoon ? store._saveSoon() : store._save(); } } catch {}
      return list;
    }
    case "resolve_keyword": {
      const customs = store?.getConfig ? store.getConfig().custom_engines : [];
      const userKeywords = store?.getConfig ? store.getConfig().search_keywords : store?.state?.config?.search_keywords;
      const parsed = Keywords.parseKeywordInput(args.input || "", userKeywords);
      if (!parsed) return null;
      return { url: Keywords.resolveKeyword(parsed, customs), key: parsed.key, query: parsed.query };
    }
    // ---------- medium: cookies UI (per-site viewer) ----------
    case "list_cookies": {
      const origin = CookieMgr.originOf(args.origin || (m ? m.url : "") || "");
      if (!origin) return { error: "no-origin" };
      try {
        const ses = session.fromPartition(activePartition());
        const all = await ses.cookies.get({});
        const host = CookieMgr.hostOfOrigin(origin);
        const bare = host.replace(/^www\./, "");
        const mine = all.filter((c) => {
          const dom = String(c.domain || "").replace(/^\./, "").toLowerCase();
          return dom && (host === dom || host.endsWith(`.${dom}`) || bare === dom || bare.endsWith(`.${dom}`));
        });
        return { origin, cookies: CookieMgr.publicRows(mine) };
      } catch (e) { return { error: String(e?.message || e) }; }
    }
    case "remove_cookie": {
      const origin = CookieMgr.originOf(args.origin || "");
      if (!origin || !args.name) return { error: "bad-args" };
      try {
        const ses = session.fromPartition(activePartition());
        const all = await ses.cookies.get({ name: args.name });
        const plan = CookieMgr.removalPlan(origin, all);
        let n = 0;
        for (const p of plan) { try { await ses.cookies.remove(p.url, p.name); n++; } catch {} }
        return { removed: n };
      } catch (e) { return { error: String(e?.message || e) }; }
    }
    case "clear_cookies": {
      const origin = CookieMgr.originOf(args.origin || "");
      if (!origin) return { error: "bad-args" };
      try {
        const ses = session.fromPartition(activePartition());
        try { await ses.clearStorageData({ origin, storages: ["cookies"] }); } catch {}
        const all = await ses.cookies.get({});
        const plan = CookieMgr.removalPlan(origin, all);
        let n = 0;
        for (const p of plan) { try { await ses.cookies.remove(p.url, p.name); n++; } catch {} }
        return { origin, removed: n };
      } catch (e) { return { error: String(e?.message || e) }; }
    }
    // ---------- medium: installed web apps ----------
    case "list_apps": {
      try {
        const a = store?.getConfig ? store.getConfig().installed_apps : store?.state?.config?.installed_apps;
        return WebApps.sanitizeApps(a);
      } catch { return []; }
    }
    case "install_app": {
      const url = args.url || (m ? m.url : "");
      if (!/^https?:\/\//i.test(url || "")) return { error: "bad-url" };
      const save = (apps) => {
        try { store.patchConfig ? store.patchConfig({ installed_apps: apps }) : null; } catch {}
        try { if (store.state?.config && !store.patchConfig) { store.state.config.installed_apps = apps; store._saveSoon ? store._saveSoon() : store._save(); } } catch {}
      };
      let current = [];
      try { current = store?.getConfig ? store.getConfig().installed_apps : store?.state?.config?.installed_apps; } catch {}
      // Icon for the home screen: explicit wins; else the page's declared
      // icon links (user-initiated install, 10s cap); else favicon.ico guess.
      const have = WebApps.sanitizeApps(current).find((a) => a.url === url);
      let discovered = WebApps.cleanIcon(args.icon) || have?.icon || null;
      if (!discovered) {
        try {
          const ctl = new AbortController();
          const timer = setTimeout(() => ctl.abort(), 10000);
          const res = await fetch(url, { signal: ctl.signal, headers: { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36" } });
          clearTimeout(timer);
          if (res.ok) {
            const html = (await res.text()).slice(0, 262144);
            discovered = WebApps.pickIconHref(html, res.url || url) || null;
          }
        } catch { /* offline or hostile page — favicon fallback below */ }
      }
      const { apps, app: installed, error } = WebApps.installApp(current, url, args.name, undefined, discovered || WebApps.faviconFallback(url));
      if (error) return { error };
      save(apps);
      try { renderStartPage(); } catch {}
      return installed;
    }
    case "open_app": {
      let current = [];
      try { current = store?.getConfig ? store.getConfig().installed_apps : store?.state?.config?.installed_apps; } catch {}
      const found = WebApps.sanitizeApps(current).find((a) => a.id === args.id);
      if (!found) return { error: "not-found" };
      const w = new BrowserWindow({
        width: 1100, height: 750, autoHideMenuBar: true,
        webPreferences: { partition: activePartition(), contextIsolation: true, sandbox: true, nodeIntegration: false },
      });
      w.loadURL(found.url);
      return { ok: true };
    }
    case "remove_app": {
      let current = [];
      try { current = store?.getConfig ? store.getConfig().installed_apps : store?.state?.config?.installed_apps; } catch {}
      const { apps, removed } = WebApps.removeApp(current, args.id);
      try { store.patchConfig ? store.patchConfig({ installed_apps: apps }) : null; } catch {}
      try { if (store.state?.config && !store.patchConfig) { store.state.config.installed_apps = apps; store._saveSoon ? store._saveSoon() : store._save(); } } catch {}
      try { if (removed) renderStartPage(); } catch {}
      return { removed, apps };
    }
    // ---------- medium: full-page screenshot ----------
    case "screenshot_full": return await saveFullScreenshot(args.label);
    // ---------- medium: read-aloud (TTS via speechSynthesis) ----------
    case "read_aloud": return await readAloud(args.label, args.action || "speak", args.rate);
    case "read_aloud_stop": return await readAloudStop();
    // Page text for the palette's translate action (also feeds agent "read").
    case "read_page_text": {
      const t = args.label ? tabs.get(args.label) : focused ? tabs.get(focused) : null;
      if (!t?.view || t.discarded) return { error: "no-tab" };
      try {
        const max = Math.min(20000, Math.max(1, Number(args.max) || 20000));
        const raw = await t.view.webContents.executeJavaScript(
          "(document.querySelector('article')?.innerText || document.body?.innerText || '').slice(0, 200000)",
        ).catch(() => "");
        return { text: String(raw || "").slice(0, max).trim(), url: t.url, lang: Translate.detectLanguage(String(raw || "").slice(0, 8000)) };
      } catch (e) { return { error: String(e?.message || e) }; }
    }
    case "detect_language": {
      const t = args.label ? tabs.get(args.label) : focused ? tabs.get(focused) : null;
      if (!t?.view) return { error: "no-tab" };
      try {
        const raw = await t.view.webContents.executeJavaScript("document.body ? document.body.innerText.slice(0, 8000) : ''").catch(() => "");
        const lang = Translate.detectLanguage(raw || "");
        return { lang, offer: Translate.shouldOffer(lang, args.uiLocale || "en", (raw || "").length) };
      } catch (e) { return { error: String(e?.message || e) }; }
    }
    case "translate_text": {
      // H8: no on-device engine ships yet (see docs/TRANSLATE_FEASIBILITY.md).
      // With a user-configured endpoint, proxy one explicit request; without
      // it, return the feasibility verdict instead of pretending.
      const endpoint = (store?.getConfig ? store.getConfig().translate_endpoint : store?.state?.config?.translate_endpoint) || "";
      const req = Translate.buildTranslateRequest(endpoint, args.text || "", args.source, args.target);
      if (req.error) return { error: req.error, hint: Translate.SUPPORTED_ENDPOINT_HINT };
      try {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 20000);
        const res = await fetch(req.url, { method: "POST", signal: ctl.signal, headers: { "content-type": "application/json" }, body: JSON.stringify(req.body) });
        clearTimeout(timer);
        if (!res.ok) return { error: `endpoint-${res.status}` };
        const body = await res.json().catch(() => null);
        const text = body?.translatedText || body?.translation || body?.result || null;
        if (!text) return { error: "bad-response" };
        return { text };
      } catch (e) { return { error: String(e?.message || e) }; }
    }
    // ---------- agent track: see / work / live ----------
    case "observe_tab": {
      // Agent "see": a reduced, injection-safe accessibility snapshot of the
      // active tab. Node ids are index-paths into the DOM element tree, so the
      // host (not the page) resolves targets for act_tab.
      const t = args.label ? tabs.get(args.label) : focused ? tabs.get(focused) : null;
      if (!t?.view || t.discarded) return { error: "no-tab" };
      try {
        const raw = await t.view.webContents.executeJavaScript(COLLECT_AGENT_TREE, true).catch(() => null);
        const snap = AxTree.buildSnapshot(Array.isArray(raw) ? raw : []);
        agentLog({ type: "visit", url: t.url, label: t.label });
        return {
          tab: { label: t.label, url: t.url, title: t.title },
          summary: AxTree.summarize(snap.tree),
          index: AxTree.index(snap.tree),
          truncated: snap.truncated,
        };
      } catch (e) { return { error: String(e?.message || e) }; }
    }
    case "agent_act": {
      // Agent "work": classify the action, gate writes behind a user approval
      // flag that only the UI can set (page content can never auto-approve).
      const t = args.label ? tabs.get(args.label) : focused ? tabs.get(focused) : null;
      if (!t?.view || t.discarded) return { error: "no-tab" };
      const c = AgentAct.classify({ verb: args.verb, id: args.id, value: args.value }, { approved: !!args.approved, auto: !!args.auto });
      if (!c.ok) return { error: c.reason || "invalid-action" };
      const path = String(args.id || "0").split(".").map(Number);
      let js = null;
      if (args.verb === "click") js = AgentAct.clickJs(path);
      if (args.verb === "type") js = AgentAct.typeJs(path, args.value);
      if (c.tier === "write" && c.needsApproval) {
        return { needsApproval: true, reason: c.reason, verb: args.verb, id: args.id };
      }
      if (!js) { agentLog({ type: "interact", url: t.url, verb: args.verb, id: args.id }); return { ok: true, verb: args.verb, id: args.id, tier: c.tier }; }
      try {
        const res = await t.view.webContents.executeJavaScript(js, true).catch(() => null);
        if (args.verb === "type" || args.verb === "click") agentLog({ type: "write", url: t.url, id: args.id, verb: args.verb, approved: c.approved });
        return { ok: true, verb: args.verb, id: args.id, approved: c.approved, result: res };
      } catch (e) { return { error: String(e?.message || e) }; }
    }
    case "debrief_session": {
      // Agent "live": deterministic summary + action items from the session
      // timeline (no LLM — the agent rephrases these however it likes).
      const sum = Debrief.summarize(agentTimeline);
      const items = Debrief.actionItems(agentTimeline, { mode: args.mode || "long" });
      return { headline: Debrief.headline(sum), summary: sum, actionItems: items, since: agentTimeline[0]?.ts || null };
    }
    case "agent_timeline_clear": { agentTimeline = []; return { ok: true }; }
    // ---------- medium: task manager (Chromium process metrics) ----------
    case "task_manager": {
      let metrics = [];
      try { metrics = app.getAppMetrics() || []; } catch {}
      const byPid = new Map(metrics.map((x) => [x.pid, x]));
      const rows = [];
      for (const [lab, t] of tabs) {
        let mb = null, cpu = null, pid = null;
        try {
          pid = t.view?.webContents?.getOSProcessId?.() || null;
          const mx = pid && byPid.get(pid);
          const bytes = mx?.memory?.privateBytes ?? mx?.memory?.workingSetSize ?? null;
          mb = typeof bytes === "number" ? Math.round(bytes / 1048576) : null;
          cpu = typeof mx?.cpu?.percentCPUUsage === "number" ? Math.round(mx.cpu.percentCPUUsage * 10) / 10 : null;
        } catch { /* gone */ }
        rows.push({ label: lab, url: t.url, title: t.title, discarded: !!t.discarded, audible: (() => { try { return !!t.view?.webContents?.isCurrentlyAudible(); } catch { return false; } })(), pid, mb, cpu });
      }
      rows.sort((a, b) => (b.mb || 0) - (a.mb || 0));
      return { tabs: rows, rssMb: Math.round(rss() / 1048576), gpu: gpuStatus() };
    }
    // ---------- medium: named snapshots ----------
    case "save_snapshot": {
      const live = [...tabs.entries()].filter(([, t]) => !t.incognito).map(([lab, t]) => ({
        label: lab, url: t.url, title: t.title, pinned: !!t.pinned, group: t.group || null, container: t.container || null,
        history: (t.history || [t.url]).slice(-30), histIdx: Math.min(t.idx || 0, 29), scrollY: t.scrollY || 0, zoom: t.zoom || 100,
      }));
      const cleaned = Snapshots.cleanTabs(live.map((t) => ({ ...t })));
      const rec = Snapshots.buildSnapshot(cleaned, focused, args.name, undefined);
      try {
        if (store.saveNamedSnapshot) store.saveNamedSnapshot(rec);
        else store.snapshot(cleaned, focused);
      } catch {}
      return { id: rec.id, name: rec.name };
    }
    case "list_snapshots": {
      try {
        const rows = store.listNamedSnapshots ? store.listNamedSnapshots() : store.browseSessions();
        return Snapshots.publicRows(rows);
      } catch { return []; }
    }
    case "restore_snapshot": {
      const recs = (() => { try { return store.listNamedSnapshots ? store.listNamedSnapshots() : store.browseSessions(); } catch { return []; } })();
      const rec = recs.find((s) => s.id === args.id);
      if (!rec) return { error: "not-found" };
      const out = [];
      for (const t of rec.tabs || []) {
        if (!t?.url) continue;
        if (!args.replace && [...tabs.values()].find((x) => x.url === t.url)) continue;
        const lab = openTab(t.url, false, false, validContainerArg(t.container));
        const meta = tabs.get(lab);
        if (meta) {
          if (t.group) meta.group = t.group;
          if (t.pinned) meta.pinned = true;
          if (Array.isArray(t.history) && t.history.length) { meta.history = t.history.slice(-30); meta.idx = Math.min(Math.max(0, t.histIdx || 0), meta.history.length - 1); meta.url = meta.history[meta.idx] || t.url; }
          if (t.scrollY) { meta.scrollY = t.scrollY; meta.pendingScroll = t.scrollY; }
          if (t.zoom) meta.zoom = t.zoom;
        }
        out.push({ label: lab, url: t.url });
      }
      return out;
    }
    case "delete_snapshot": {
      try {
        if (store.deleteNamedSnapshot) store.deleteNamedSnapshot(args.id);
        return store.listNamedSnapshots ? Snapshots.publicRows(store.listNamedSnapshots()) : [];
      } catch (e) { return { error: String(e?.message || e) }; }
    }
    // ---------- medium: bookmark manager ----------
    case "search_bookmarks": {
      try { return BookmarkMgr.searchBookmarks(store.getBookmarks(), args.query || "", Math.min(100, Math.max(1, args.limit || 50))); }
      catch { return []; }
    }
    case "rename_bookmark": {
      const cur = (() => { try { return store.getBookmarks(); } catch { return []; } })();
      const { bookmarks, renamed, error } = BookmarkMgr.renameBookmark(cur, args.url, args.title);
      if (error) return { error };
      // Persist the rename through the store's own write path.
      try {
        if (store.updateBookmark) store.updateBookmark(args.url, renamed.label);
        else { store.removeBookmark(args.url); store.addBookmark(args.url, renamed.label); }
      } catch {}
      return bookmarks;
    }
    // ---------- medium: history manager ----------
    case "search_history": {
      try { return (store.searchHistory ? store.searchHistory(args.query || "") : store.getHistory()).slice(0, Math.min(100, Math.max(1, args.limit || 50))); }
      catch { return []; }
    }
    case "delete_history_url": {
      try {
        if (store.deleteHistoryUrl) return { removed: store.deleteHistoryUrl(args.url) };
        const before = store.getHistory().length;
        store.state.history = store.getHistory().filter((h) => h.url !== args.url);
        try { store._saveSoon(); } catch {}
        return { removed: before - store.getHistory().length };
      } catch (e) { return { error: String(e?.message || e) }; }
    }
    // ---------- H7: E2E-encrypted password sync ----------
    case "sync_key_status": {
      const has = !!store?.cfg?.sync_key_enc;
      return { configured: has, available: loginsAvailable() };
    }
    case "sync_key_create": {
      if (!loginsAvailable()) return { error: "unavailable" };
      const raw = VaultSync.generateSyncKey();
      try {
        store.cfg.sync_key_enc = safeStorage.encryptString(raw).toString("base64");
        store._saveCfg();
      } catch { return { error: "unavailable" }; }
      return { ok: true, key: raw };
    }
    case "sync_key_show": {
      if (!store?.cfg?.sync_key_enc) return { error: "not-configured" };
      if (!loginsAvailable()) return { error: "unavailable" };
      try {
        const raw = safeStorage.decryptString(Buffer.from(store.cfg.sync_key_enc, "base64"));
        return { key: raw };
      } catch { return { error: "decrypt" }; }
    }
    case "sync_key_import": {
      if (!loginsAvailable()) return { error: "unavailable" };
      const raw = String(args.key || "").trim();
      if (!VaultSync.validSyncKey(raw)) return { error: "bad-key" };
      try {
        store.cfg.sync_key_enc = safeStorage.encryptString(raw).toString("base64");
        store._saveCfg();
      } catch { return { error: "unavailable" }; }
      return { ok: true };
    }
    case "window_control": if (args.action === "minimize") chrome.minimize(); else if (args.action === "toggleMaximize") chrome.isMaximized() ? chrome.unmaximize() : chrome.maximize(); else if (args.action === "close") chrome.close(); else if (args.action === "isMaximized") return chrome.isMaximized(); return;
    default: return null;
  }
});

// ---------- forget-this-site (Firefox-style composite wipe) ----------
// Closes every tab on the origin, drops its cookies/storage, history
// visits, site prefs/permissions and never-ask entries. Logins are kept
// (like Firefox — passwords live in their own manager).
async function forgetSiteFor(label) {
  const t = label ? tabs.get(label) : focused ? tabs.get(focused) : null;
  const origin = t ? originOf(t.url) : null;
  if (!origin) return { error: "no-origin" };
  let host = "";
  try { host = new URL(origin).hostname; } catch { return { error: "bad-origin" }; }
  if (chrome && !chrome.isDestroyed()) {
    try {
      const { dialog } = require("electron");
      const r = await dialog.showMessageBox(chrome, {
        type: "warning", title: "Forget this site",
        message: `Forget ${host}?`,
        detail: "Closes its tabs and clears its cookies, storage, history, and site settings. Saved passwords are kept.",
        buttons: ["Forget", "Cancel"], defaultId: 1, cancelId: 1,
      });
      if (r.response !== 0) return { dismissed: true };
    } catch {}
  }
  const out = { origin, closed: 0, history: 0, cookies: 0 };
  for (const [lab, m] of [...tabs]) {
    try {
      if (!m.incognito && originOf(m.url) === origin) { closeTab(lab); out.closed++; }
    } catch {}
  }
  try {
    const ses = session.fromPartition(activePartition());
    try {
      await ses.clearStorageData({
        origin,
        storages: ["cookies", "localstorage", "indexeddb", "websql", "serviceworkers", "cachestorage", "filesystem"],
      });
    } catch {}
    try {
      const all = await ses.cookies.get({});
      const scheme = origin.startsWith("https:") ? "https" : "http";
      for (const c of all) {
        const dom = String(c.domain || "").replace(/^\./, "").toLowerCase();
        if (!dom || (host !== dom && !host.endsWith("." + dom))) continue;
        try { await ses.cookies.remove(`${scheme}://${dom}${c.path || "/"}`, c.name); out.cookies++; } catch {}
      }
    } catch {}
  } catch {}
  try { out.history = store.removeOriginHistory ? store.removeOriginHistory(origin) : 0; } catch {}
  try {
    const bare = host.replace(/^www\./, "");
    const cfg = store.getConfig ? store.getConfig() : {};
    if (cfg.site_prefs && cfg.site_prefs[bare]) {
      const sp = { ...cfg.site_prefs };
      delete sp[bare];
      try { store.patchConfig({ site_prefs: sp }); } catch {}
    }
    const raw = store.cfg || {};
    if (raw.site_permissions && raw.site_permissions[origin]) {
      delete raw.site_permissions[origin];
      try { store._saveCfg(); } catch {}
    }
    if (Array.isArray(raw.login_never) && raw.login_never.includes(origin)) {
      raw.login_never = raw.login_never.filter((o) => o !== origin);
      try { store._saveCfg(); } catch {}
    }
  } catch {}
  try {
    const ring = closedRing();
    const kept = ClosedRing.dropOrigin(ring, origin);
    if (kept.length !== ring.length) { closedRings.set(activeProfileId, kept); scheduleSave(); }
  } catch {}
  return out;
}

// ---------- address book (form autofill, same keyring envelope as logins) ----------
// PII at rest is sealed with safeStorage; only ciphertext touches disk
// (store.cfg.addresses). Captures come from the content preload's submit
// listener; card/payment fields are never captured (see content-preload.js).
const ADDRESS_KEYS = ["name", "email", "tel", "street", "city", "region", "zip", "country", "org"];
function getAddresses() {
  try { return Array.isArray(store?.cfg?.addresses) ? store.cfg.addresses : []; } catch { return []; }
}
function sanitizeAddressFields(f) {
  const out = {};
  if (!f || typeof f !== "object") return out;
  for (const k of ADDRESS_KEYS) {
    if (typeof f[k] === "string" && f[k].trim()) out[k] = f[k].trim().slice(0, 100);
  }
  return out;
}
function validAddressCandidate(c) {
  if (!c || typeof c !== "object") return false;
  try {
    const x = new URL(c.origin);
    if ((x.protocol !== "http:" && x.protocol !== "https:") || x.origin !== c.origin) return false;
  } catch { return false; }
  return Object.keys(sanitizeAddressFields(c.fields)).length >= 2;
}
function saveAddressInternal(fields) {
  if (!loginsAvailable()) return { error: "unavailable" };
  const clean = sanitizeAddressFields(fields);
  if (Object.keys(clean).length < 1) return { error: "bad-args" };
  const crypto = require("crypto");
  const id = "ad-" + crypto.randomBytes(6).toString("hex");
  // Upsert by email when present (same person, new details), else append.
  const list = getAddresses().filter(a => !(clean.email && a.email === clean.email));
  const enc = {};
  for (const [k, v] of Object.entries(clean)) {
    try { enc[k] = safeStorage.encryptString(v).toString("base64"); } catch { return { error: "unavailable" }; }
  }
  list.unshift({ id, ...enc, addedAt: Date.now(), usedAt: 0 });
  if (list.length > 10) list.length = 10;
  store.cfg.addresses = list;
  try { store._saveCfg(); } catch {}
  return { id };
}
function decryptAddress(a) {
  const out = { id: a.id, addedAt: a.addedAt, usedAt: a.usedAt || 0 };
  for (const k of ADDRESS_KEYS) {
    try { out[k] = a[k] ? safeStorage.decryptString(Buffer.from(a[k], "base64")) : ""; }
    catch { out[k] = ""; }
  }
  return out;
}
// User-triggered address fill shared by the fill_address IPC and the page
// menu. Fills the requested (or last-used) profile into empty fields only —
// never overwrites user input, never submits.
async function fillAddressFor(label, id) {
  const t = label ? tabs.get(label) : focused ? tabs.get(focused) : null;
  if (!t?.view || t.discarded) return { error: "no-tab" };
  if (!loginsAvailable()) return { error: "unavailable" };
  const list = getAddresses();
  const picked = (id && list.find(a => a.id === id)) ||
    [...list].sort((a, b) => (b.usedAt || 0) - (a.usedAt || 0))[0];
  if (!picked) return { error: "no-address" };
  let profile = null;
  try { profile = decryptAddress(picked); } catch { return { error: "decrypt" }; }
  try {
    const n = await t.view.webContents.executeJavaScript(AUTOFILL_JS(profile));
    if (typeof n === "number" && n > 0) {
      picked.usedAt = Date.now();
      try { store._saveCfg(); } catch {}
    }
    return { ok: typeof n === "number" && n > 0, filled: typeof n === "number" ? n : 0 };
  } catch { return { error: "fill" }; }
}
const AUTOFILL_JS = (profile) => `
(() => {
  const P = ${JSON.stringify(profile)};
  const byAc = { name: ["name", "given-name", "family-name"], email: ["email"], tel: ["tel", "tel-national"], street: ["street-address", "address-line1", "address-line2"], city: ["address-level2"], region: ["address-level1", "address-level3"], zip: ["postal-code"], country: ["country", "country-name"], org: ["organization"] };
  const els = [...document.querySelectorAll("input,select,textarea")];
  const set = (el, v) => {
    try {
      el.focus();
      el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } catch { return false; }
  };
  let n = 0;
  for (const el of els) {
    try {
      if (el.offsetParent === null || el.disabled || el.readOnly) continue;
      const it = (el.type || "").toLowerCase();
      if (["password", "hidden", "submit", "button", "checkbox", "radio", "file"].includes(it)) continue;
      if (el.value) continue; // never overwrite what the user typed
      const ac = ((el.getAttribute && el.getAttribute("autocomplete")) || "").toLowerCase().trim().split(/\\s+/).pop() || "";
      let key = null;
      for (const [k, toks] of Object.entries(byAc)) {
        if (ac && toks.includes(ac) && P[k]) { key = k; break; }
      }
      if (!key) {
        const hay = ((el.name || "") + " " + (el.id || "")).toLowerCase();
        for (const k of Object.keys(byAc)) {
          if (!P[k]) continue;
          const pats = { name: /name/, email: /e-?mail/, tel: /tel|phone|mobile/, street: /street|address|addr/, city: /city|town/, region: /state|province|region|county/, zip: /zip|postal|postcode|pincode/, country: /country/, org: /company|org/ };
          if ((pats[k] || /$^/).test(hay)) { key = k; break; }
        }
      }
      if (key && P[key] && set(el, P[key])) n++;
    } catch {}
  }
  return n;
})()`;

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
// Origins the user muted with "Never for this site" (per profile, plain
// origins only — no secrets here).
function getNeverList() {
  try { return Array.isArray(store?.cfg?.login_never) ? store.cfg.login_never : []; } catch { return []; }
}
// Shared by manual add (Settings) and the save-prompt decision: upserts one
// origin+username pair, sealed with the OS keyring. Returns {id}|{error}.
function saveLoginInternal(origin, username, password) {
  if (!loginsAvailable()) return { error: "unavailable" };
  const o = originOf(origin || "");
  if (!o || !username || !password) return { error: "bad-args" };
  const crypto = require("crypto");
  const id = "lg-" + crypto.randomBytes(6).toString("hex");
  const list = getLogins().filter(l => !(l.origin === o && l.username === username));
  list.push({ id, origin: o, username, passwordEnc: safeStorage.encryptString(password).toString("base64"), addedAt: Date.now() });
  store.cfg.logins = list;
  try { store._saveCfg(); } catch {}
  return { id };
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
      t.expectNav = t.url; t.programmatic = true; // restore in place — not a link fork
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

// ---------- dark flip (site-wide invert + hue-rotate, media compensated) ----------
const DARK_SCRIPT = `(function(){
  var html=document.documentElement;
  var K='__contDarkStyle';
  var existing=document.getElementById(K);
  if(existing){existing.remove();html.removeAttribute('data-cont-dark');return 'off';}
  var s=document.createElement('style');s.id=K;
  s.textContent='html{filter:invert(0.9) hue-rotate(180deg) !important;background:#0b0b0b !important}img,video,canvas,iframe,[style*="background-image"]{filter:invert(1) hue-rotate(180deg) !important}';
  document.head.appendChild(s);
  html.setAttribute('data-cont-dark','1');
  return 'on';
})()`;
async function toggleDark(lab) {
  const t = lab ? tabs.get(lab) : focused ? tabs.get(focused) : null;
  if (!t?.view) return { error: "no-tab" };
  try {
    const r = await t.view.webContents.executeJavaScript(DARK_SCRIPT).catch(() => null);
    return { state: r || "unknown" };
  } catch (e) { return { error: String(e?.message || e) }; }
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

// One-click installs from the Chrome Web Store: paste the store URL (or the
// 32-char extension id), the host fetches the CRX from Google's update
// endpoint, extracts it into this profile's autoload dir and loads it.
// No Google account, no store UI needed.
async function installStoreExtension(input) {
  const m = String(input || "").match(/([a-z]{32})/);
  if (!m) return { error: "no-id" };
  const id = m[1];
  if (getExtList().find((e) => e.id === id)) return { error: "already-installed" };
  const url = `https://clients2.google.com/service/update2/crx?response=redirect&acceptformat=crx2,crx3&prodversion=131.0&x=id%3D${id}%26installsource%3Dondemand%26uc`;
  let buf;
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36" } });
    if (!res.ok) return { error: `store-${res.status}` };
    buf = Buffer.from(await res.arrayBuffer());
  } catch (e) { return { error: "download-failed" }; }
  if (buf.length < 1024 || buf.subarray(0, 4).toString() !== "Cr24") return { error: "bad-crx" };
  const dest = path.join(extDir(), id);
  const tmpCrx = path.join(os.tmpdir(), `continua-ext-${id}.crx`);
  try {
    fs.mkdirSync(extDir(), { recursive: true });
    try { fs.rmSync(dest, { recursive: true, force: true }); } catch {}
    fs.mkdirSync(dest, { recursive: true });
    // CRX3 = zip payload after the header: strip to the zip start ("PK").
    const pk = buf.indexOf("PK\x03\x04");
    if (pk < 0) return { error: "bad-crx" };
    fs.writeFileSync(tmpCrx, buf.subarray(pk));
    const { spawnSync } = require("child_process");
    let ok = false;
    const uz = spawnSync("unzip", ["-q", tmpCrx, "-d", dest], { timeout: 30000 });
    if (uz.status === 0) ok = true;
    else {
      const tr = spawnSync("tar", ["-xf", tmpCrx, "-C", dest], { timeout: 30000 });
      if (tr.status === 0) ok = true;
    }
    if (!ok) return { error: "no-extractor" };
    if (!fs.existsSync(path.join(dest, "manifest.json"))) {
      // Some zips nest one level deep — adopt the single subfolder.
      try {
        const sub = fs.readdirSync(dest, { withFileTypes: true }).filter((d) => d.isDirectory());
        if (sub.length === 1 && fs.existsSync(path.join(dest, sub[0].name, "manifest.json"))) {
          const inner = path.join(dest, sub[0].name);
          fs.renameSync(inner, dest + "-inner");
          fs.rmSync(dest, { recursive: true, force: true });
          fs.renameSync(dest + "-inner", dest);
        }
      } catch {}
    }
    if (!fs.existsSync(path.join(dest, "manifest.json"))) return { error: "bad-package" };
    return await loadExtension(dest);
  } catch (e) {
    return { error: String(e?.message || e) };
  } finally {
    try { fs.rmSync(tmpCrx, { force: true }); } catch {}
  }
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
function listGroups() { return getGroups(); }function createGroup(name) {
  const clean = (name || "").trim().slice(0, 32) || "Untitled";
  const groups = getGroups();
  const crypto = require("crypto");
  const g = { id: "grp-" + crypto.randomBytes(4).toString("hex"), name: clean, color: GROUP_COLORS[groups.length % GROUP_COLORS.length] };
  groups.push(g);
  saveGroups(groups);
  return g;
}

// ---------- containers (Firefox-style contextual identities, lighter than profiles) ----------
// Each container owns one persistent Electron partition, so cookies, storage
// and service workers never cross Work-login ↔ Personal-login in one window.
// Registry lives in config.containers (per profile); tabs carry containerId.
// Pure registry ops live in containers.js (unit-tested); this file owns the
// Electron wiring (sessions, views) and persistence.
function getContainers() {
  try {
    const c = store?.getConfig ? store.getConfig().containers : store?.state?.config?.containers;
    return Containers.sanitizeRegistry(c);
  } catch { return []; }
}
function saveContainers(containers) {
  const clean = Containers.sanitizeRegistry(containers);
  try {
    if (store.patchConfig) store.patchConfig({ containers: clean });
    else if (store.state?.config) { store.state.config.containers = clean; store._saveSoon ? store._saveSoon() : store._save(); }
  } catch {}
}
function containerPartition(cid) {
  return Containers.partitionFor(cid);
}
const containerWired = new Set();
function ensureContainerWired(cid) {
  const part = containerPartition(cid);
  if (containerWired.has(part)) return;
  containerWired.add(part);
  try {
    const ses = session.fromPartition(part);
    try { ses.setSpellCheckerEnabled(true); } catch {}
    wireDownloads(ses, part);
    wireMedia(part);
    wirePermissions(ses, part);
    wireShields(ses, part);
  } catch (e) { console.error(`[continua] container wire failed for ${part}: ${e?.message || e}`); }
}
function createContainer(name) {
  const { registry, created, error } = Containers.createContainer(getContainers(), name);
  if (error) return { error };
  saveContainers(registry);
  return created;
}
function renameContainer(id, name) {
  const { registry, renamed, error } = Containers.renameContainer(getContainers(), id, name);
  if (error) return { error };
  saveContainers(registry);
  return renamed;
}
function deleteContainer(id) {
  const { registry } = Containers.deleteContainer(getContainers(), id);
  saveContainers(registry);
  Containers.clearTabsOf([...tabs.values()], id);
  scheduleSave();
}
/** Validate an IPC container argument: known id or null (never trust input). */
function validContainerArg(cid) {
  if (typeof cid !== "string" || !cid) return null;
  return Containers.findContainer(getContainers(), cid) ? cid : null;
}

function uniqueDownloadPath(dir, filename) {  const safe = (filename || "download").replace(/[\\/:*?"<>|]/g, "_").slice(0, 180) || "download";
  let p = path.join(dir, safe);
  if (!fs.existsSync(p)) return p;
  const ext = path.extname(safe), base = path.basename(safe, ext);
  for (let i = 1; i < 100; i++) { const q = path.join(dir, `${base} (${i})${ext}`); if (!fs.existsSync(q)) return q; }
  return path.join(dir, `${base}-${Date.now()}${ext}`);
}

const wiredSessions = new Set(); // partition keys already wired (ses.on accumulates)
const findWaiters = new Map(); // label -> resolve({count, idx}) for the find IPC
const recentPosts = new Map(); // url -> timestamp of main-frame POSTs (form submits stay in-tab)
// Submit-time credential candidates awaiting a save decision — memory only,
// never logged, never sent to the renderer (it only sees origin+username).
const pendingCandidates = new Map(); // label -> {origin, username, password, at, prompted}
// Address-form candidates (same lifecycle, separate channel).
// Secrets stay main-side: the chrome only sees origin + name/email preview.
const pendingAddr = new Map(); // label -> {origin, fields, at, prompted}
function maybePromptAddress(lab) {
  const cand = pendingAddr.get(lab);
  const m = tabs.get(lab);
  if (!cand || !m || m.incognito) return;
  if (!loginsAvailable()) { pendingAddr.delete(lab); return; }
  try {
    const never = Array.isArray(store?.cfg?.autofill_never) ? store.cfg.autofill_never : [];
    if (never.includes(cand.origin)) { pendingAddr.delete(lab); return; }
  } catch {}
  cand.prompted = true;
  try {
    chrome?.webContents.send("address-prompt", {
      label: lab, origin: cand.origin,
      name: cand.fields.name || "", email: cand.fields.email || "",
    });
  } catch {}
}
// Save-prompt offers for a tab whose form was submitted: prompt once the
// login presumably completed (commit on the same origin), or shortly after
// submit for no-navigation (fetch/XHR) logins.
function maybePromptLogin(lab) {
  const cand = pendingCandidates.get(lab);
  const m = tabs.get(lab);
  if (!cand || !m || m.incognito) return;
  if (!loginsAvailable()) { pendingCandidates.delete(lab); return; }
  if (getNeverList().includes(cand.origin)) { pendingCandidates.delete(lab); return; }
  const existing = findUserLogin(getLogins(), cand.origin, cand.username);
  let update = false;
  if (existing) {
    try {
      const cur = safeStorage.decryptString(Buffer.from(existing.passwordEnc, "base64"));
      if (cur === cand.password) { pendingCandidates.delete(lab); return; } // already known
      update = true;
    } catch { update = true; }
  }
  cand.prompted = true;
  try {
    chrome?.webContents.send("login-prompt", { label: lab, origin: cand.origin, username: cand.username, update });
  } catch {}
}
// Post-commit hook: resolve pending candidates + advertise one-click fill.
function noteCommittedLogin(lab, url) {
  const origin = originOf(url);
  if (!origin) return;
  const cand = pendingCandidates.get(lab);
  if (cand && !cand.prompted) {
    if (cand.origin === origin) maybePromptLogin(lab);
    else pendingCandidates.delete(lab); // navigated away undecided — stale
  }
  const addr = pendingAddr.get(lab);
  if (addr && !addr.prompted) {
    if (addr.origin === origin) maybePromptAddress(lab);
    else pendingAddr.delete(lab);
  }
  try {
    const have = forOriginLogins(getLogins(), origin);
    if (chrome && !chrome.isDestroyed()) {
      chrome.webContents.send("login-available", { label: lab, origin, count: have.length });
    }
  } catch {}
}
// Credentials captured by the content preload's submit listener (isolated
// world → ipcRenderer). Registered once: per-view registration would stack.
ipcMain.on("continua-login-candidate", (evt, data) => {
  try {
    const sender = evt && evt.sender;
    let owner = null;
    for (const [, m] of tabs) {
      try {
        if (m.view && !m.discarded && m.view.webContents === sender) { owner = m; break; }
      } catch {}
    }
    if (!owner || owner.incognito) return;
    const cand = { origin: data && data.origin, username: data && data.username, password: data && data.password };
    if (!validCandidate(cand)) return;
    // Anti-spoof: the claimed origin must be the tab's own committed origin.
    if (originOf(owner.url) !== cand.origin) return;
    const entry = { ...cand, at: Date.now(), prompted: false };
    pendingCandidates.set(owner.label, entry);
    // No-navigation logins (fetch/XHR) never commit: prompt on a short delay.
    setTimeout(() => {
      try {
        if (pendingCandidates.get(owner.label) === entry && !entry.prompted) maybePromptLogin(owner.label);
      } catch {}
    }, 1500);
  } catch {}
});
// Address-form captures (no password): same validation, separate lifecycle.
ipcMain.on("continua-autofill-candidate", (evt, data) => {
  try {
    const sender = evt && evt.sender;
    let owner = null;
    for (const [, m] of tabs) {
      try {
        if (m.view && !m.discarded && m.view.webContents === sender) { owner = m; break; }
      } catch {}
    }
    if (!owner || owner.incognito) return;
    const cand = { origin: data && data.origin, fields: sanitizeAddressFields(data && data.fields) };
    if (!validAddressCandidate({ origin: cand.origin, fields: cand.fields })) return;
    if (originOf(owner.url) !== cand.origin) return; // anti-spoof, as above
    const entry = { ...cand, at: Date.now(), prompted: false };
    pendingAddr.set(owner.label, entry);
    setTimeout(() => {
      try {
        if (pendingAddr.get(owner.label) === entry && !entry.prompted) maybePromptAddress(owner.label);
      } catch {}
    }, 1500);
  } catch {}
});
function wireDownloads(ses, key) {
  const k = key || "default";
  if (wiredSessions.has(k)) return; // profile switches re-hit the same session
  wiredSessions.add(k);
  ses.on("will-download", (_e, item, wc) => {
    const id = `dl-${Date.now()}-${(dlSeq++).toString(36)}`;
    const filename = item.getFilename() || "download";
    // A forked link tab that turns out to be a download closes itself once
    // the transfer is safely underway (the DownloadItem outlives the view).
    // closeTab returns focus to the source tab via creation order.
    try {
      const owner = wc && [...tabs.values()].find(t => t.view && !t.discarded && t.view.webContents === wc);
      if (owner?.fork) {
        setTimeout(() => {
          try { if (tabs.get(owner.label)?.fork) closeTab(owner.label); } catch {}
        }, 1500);
      }
    } catch {}
    // Ask-mode: Save-As dialog first, auto-save on cancel/off.
    const begin = (chosen) => {
      const savePath = chosen || uniqueDownloadPath(app.getPath("downloads"), filename);
      try { item.savePath(savePath); } catch {}
      const rec = { id, filename: chosen ? path.basename(savePath) : filename, path: savePath, url: item.getURL(), state: "progressing", received: 0, total: item.getTotalBytes() || 0, startedAt: Date.now() };
      rec.item = item;
      downloads.set(id, rec);
      // Cap the ring: history beyond the newest 100 is disk records only.
      if (downloads.size > 100) {
        const keys = [...downloads.keys()];
        for (const k of keys.slice(0, downloads.size - 100)) {
          const old = downloads.get(k);
          try { old?.item?.cancel?.(); } catch {}
          downloads.delete(k);
        }
      }
      try { chrome?.webContents.send("download-event", { id, filename: rec.filename, state: "started" }); } catch {}
      // Persistent OS banner (the toast + taskbar bar are easy to miss).
      try { new Notification({ title: `Downloading ${rec.filename}`, body: "Continua Browser", silent: true }).show(); } catch {}
      item.on("updated", (_ev, state) => {
        rec.received = item.getReceivedBytes();
        if (item.getTotalBytes()) rec.total = item.getTotalBytes();
        if (state === "interrupted") rec.state = "failed";
        else if (state === "progressing" && chrome && !chrome.isDestroyed()) chrome.setProgressBar(rec.total ? rec.received / rec.total : 2);
      });
      item.once("done", (_ev, state) => {
        rec.state = state === "completed" ? "completed" : state === "cancelled" ? "cancelled" : "failed";
        rec.received = item.getReceivedBytes();
        if (rec.state === "completed") agentLog({ type: "download", url: rec.url, name: rec.filename });
        if (chrome && !chrome.isDestroyed()) chrome.setProgressBar(-1);
        delete rec.item;
        try { chrome?.webContents.send("download-event", { id, filename: rec.filename, state: rec.state, path: rec.path }); } catch {}
        try {
          if (rec.state === "completed") {
            const n = new Notification({ title: `Saved ${rec.filename}`, body: rec.path, silent: true });
            n.on("click", () => { try { shell.showItemInFolder(rec.path); } catch {} });
            n.show();
            let reveal = false;
            try { reveal = !!store.getConfig?.().download_reveal; } catch {}
            if (reveal) { try { shell.showItemInFolder(rec.path); } catch {} }
          } else {
            new Notification({ title: `Download ${rec.state}: ${rec.filename}`, body: "Continua Browser", silent: true }).show();
          }
        } catch {}
      });
    };
    let ask = false;
    try { ask = !!store.getConfig?.().download_ask; } catch {}
    if (ask && chrome && !chrome.isDestroyed()) {
      const { dialog } = require("electron");
      dialog.showSaveDialog(chrome, { defaultPath: path.join(app.getPath("downloads"), filename) })
        .then((r) => begin(r.canceled ? null : r.filePath))
        .catch(() => begin(null));
    } else {
      begin(null);
    }
  });
  // audio badge forwarding: media started/stopped + mute state per view polled by chrome via tab_audio_state
}

// Download records carry a live native item while progressing — strip it
// before IPC (structured clone chokes on it and the panel reads empty).
const dlPublic = (d) => ({ id: d.id, filename: d.filename, path: d.path, url: d.url, state: d.state, received: d.received, total: d.total, startedAt: d.startedAt });

// Screenshare picker (Meet/Zoom/Teams): grant the request with loopback
// audio so "share tab + audio" works instead of dying silently. Per profile
// partition, rewired on profile switch like downloads.
function wireMedia(partition) {
  try {
    const ses = session.fromPartition(partition);
    ses.setDisplayMediaRequestHandler((request, callback) => {
      try {
        callback({ video: request.video, audio: request.audio === "loopback" || request.audio === "loopbackWithMute" ? "loopback" : undefined });
      } catch {
        try { callback({}); } catch {}
      }
    });
  } catch (e) { console.error(`[continua] display-media wire failed: ${e?.message || e}`); }
}

// ---------- permissions (per-site allow/block with memory) ----------
// No handler means Meet/mic/camera/location/notifications stall silently.
// Harmless modes auto-grant; everything sensitive asks once per site.
const wiredPerms = new Set();
const PERM_LABELS = {
  media: "use your camera and microphone", camera: "use your camera",
  microphone: "use your microphone", geolocation: "know your location",
  notifications: "send you notifications", "clipboard-read": "read your clipboard",
  midi: "access MIDI devices", midiSysex: "access MIDI devices",
  windowPlacement: "manage windows on your displays",
  idleDetection: "know when you're idle", "storage-access": "use third-party storage",
};
function wirePermissions(ses, key) {
  const k = key || "default";
  if (wiredPerms.has(k)) return;
  wiredPerms.add(k);
  ses.setPermissionRequestHandler((wc, permission, callback, details) => {
    (async () => {
      try {
        if (permission === "fullscreen" || permission === "pointerLock" || permission === "keyboardLock") return callback(true);
        let origin = "";
        try { origin = new URL(details?.requestingUrl || wc.getURL() || "").origin; } catch { return callback(false); }
        if (!/^https?:/i.test(origin)) return callback(false);
        let remembered = null;
        try { remembered = store?.getConfig?.().site_permissions?.[origin]?.[permission]; } catch {}
        if (typeof remembered === "boolean") return callback(remembered);
        if (!chrome || chrome.isDestroyed()) return callback(false);
        const { dialog } = require("electron");
        let host = origin;
        try { host = new URL(origin).hostname; } catch {}
        const r = await dialog.showMessageBox(chrome, {
          type: "question", title: "Site permission",
          message: `${host} wants to ${PERM_LABELS[permission] || `access "${permission}"`}`,
          buttons: ["Allow", "Block"], defaultId: 1, cancelId: 1,
          checkboxLabel: "Remember for this site",
        });
        const allow = r.response === 0;
        if (r.checkboxChecked) {
          try {
            const cur = store?.getConfig?.().site_permissions || {};
            cur[origin] = { ...(cur[origin] || {}), [permission]: allow };
            store?.patchConfig?.({ site_permissions: cur });
          } catch {}
        }
        callback(allow);
      } catch { try { callback(false); } catch {} }
    })();
  });
}

// ---------- shields (tracker/ad blocking, on-device lists) ----------
// No filter-engine dependency: a curated host set covers the worst
// offenders; per-site off lives in site_prefs. Default ON, one toggle.
const SHIELD_HOSTS = new Set([
  "doubleclick.net", "googlesyndication.com", "googleadservices.com", "adservice.google.com",
  "amazon-adsystem.com", "criteo.com", "criteo.net", "rubiconproject.com", "pubmatic.com",
  "openx.net", "openx.com", "appnexus.com", "adsrvr.org", "mathtag.com", "simpli.fi",
  "tapad.com", "demdex.net", "omtrdc.net", "2o7.net", "everesttech.net",
  "scorecardresearch.com", "quantserve.com", "quantcast.com", "hotjar.com", "fullstory.com",
  "mouseflow.com", "crazyegg.com", "luckyorange.com", "inspectlet.com",
  "facebook.net", "fbcdn.net", "fbsbx.com",
  "tiktokv.com", "tiktokcdn.com",
  "analytics.twitter.com", "static.ads-twitter.com",
  "ads.linkedin.com", "px.ads.linkedin.com",
  "ads.pinterest.com", "analytics.pinterest.com",
  "bat.bing.com", "c.bing.com",
  "google-analytics.com", "googletagmanager.com", "googletagservices.com",
  "mixpanel.com", "segment.com", "segment.io", "amplitude.com", "heap.io",
  "newrelic.com", "nr-data.net", "bugsnag.com", "sentry.io",
  "intercom.io", "intercomcdn.com", "drift.com", "hubspot.com", "hsforms.com",
  "marketo.net", "marketo.com", "pardot.com", "eloqua.com",
  "taboola.com", "outbrain.com", "revcontent.com", "mgid.com", "adnxs.com",
  "moatads.com", "iasds01.com", "doubleverify.com", "adsafeprotected.com",
  "crashlytics.com", "appsflyer.com", "adjust.com", "branch.io",
  "onesignal.com", "pushwoosh.com", "urbanairship.com",
  "cookiebot.com", "onetrust.com", "trustarc.com", "quantcast.mgr.consensu.org",
  "fundingchoicesmessages.google.com",
]);
let shieldsEnabled = true;
let httpsOnlyEnabled = false;
let trackersCleaned = 0; // attribution params stripped this session
function refreshShields() {
  try {
    const cfg = store.getConfig ? store.getConfig() : {};
    shieldsEnabled = cfg.shields !== false;
    httpsOnlyEnabled = cfg.https_only === true;
  } catch {}
}
function shielded(host) {
  if (!host) return false;
  const h = host.toLowerCase();
  if (SHIELD_HOSTS.has(h)) return true;
  for (const d of SHIELD_HOSTS) { if (h.endsWith("." + d)) return true; }
  return false;
}
function wireShields(ses, key) {
  // One listener per session: re-wiring on profile switches would stack
  // duplicate before-request handlers on the same session object.
  const k = key || "default";
  if (wiredSessions.has(`shields:${k}`)) return;
  wiredSessions.add(`shields:${k}`);
  try {
    ses.webRequest.onBeforeRequest({ urls: ["<all_urls>"] }, (details, cb) => {
      try {
        if (details.resourceType === "mainFrame") {
          // Remember form POSTs so the link fork below lets the submit land
          // in-tab (a forked re-GET would lose the body).
          if (details.method === "POST" && /^https?:/i.test(details.url || "")) {
            recentPosts.set(details.url, Date.now());
            if (recentPosts.size > 200) {
              const cutoff = Date.now() - 30000;
              for (const [u, t] of recentPosts) if (t < cutoff) recentPosts.delete(u);
            }
          }
          // Tracker-query stripping + HTTPS-Only (GET only — redirects drop
          // POST bodies, so form submits pass through untouched).
          if ((details.method || "GET").toUpperCase() === "GET" && /^https?:/i.test(details.url || "")) {
            try {
              // Per-site off switch (Settings → Site prefs) covers these too.
              let siteOff = false;
              try {
                const ref = details.referrer || details.documentUrl || details.url || "";
                const origin = new URL(ref).hostname.replace(/^www\./, "");
                const pref = store.getConfig?.().site_prefs?.[origin];
                siteOff = !!(pref && pref.shields === false);
              } catch {}
              if (!siteOff) {
                if (httpsOnlyEnabled) {
                  const up = httpsUpgradeable(details.url);
                  if (up) return cb({ redirectURL: up });
                }
                if (shieldsEnabled) {
                  const clean = stripTrackingParams(details.url);
                  if (clean) { trackersCleaned++; return cb({ redirectURL: clean.url }); }
                }
              }
            } catch {}
          }
          return cb({});
        }
        if (!shieldsEnabled) return cb({});
        let host = "";
        try { host = new URL(details.url).hostname; } catch { return cb({}); }
        if (!shielded(host)) return cb({});
        // Per-site off switch (Settings → Site prefs).
        try {
          const ref = details.referrer || details.documentUrl || "";
          const origin = new URL(ref || details.url).hostname.replace(/^www\./, "");
          const pref = store.getConfig?.().site_prefs?.[origin];
          if (pref && pref.shields === false) return cb({});
        } catch {}
        cb({ cancel: true });
      } catch { cb({}); }
    });
  } catch (e) { console.error(`[continua] shields wire failed: ${e?.message || e}`); }
}

// ---------- Chrome import (Google-comfortable switchers) ----------
// Reads the local Chrome profile's History SQLite (copied first — Chrome
// locks it while running). better-sqlite3 when present, node:sqlite
// otherwise, unavailable if neither loads. Passwords travel via Chrome's own
// CSV export (Login Data is OS-encrypted); the chrome parses and re-seals
// each row through add_login.
function chromeHistoryPaths() {
  const home = os.homedir();
  const cands = [
    path.join(home, ".config", "google-chrome", "Default", "History"),
    path.join(home, ".config", "chromium", "Default", "History"),
  ];
  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    cands.unshift(path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "User Data", "Default", "History"));
  }
  if (process.platform === "darwin") {
    cands.unshift(path.join(home, "Library", "Application Support", "Google", "Chrome", "Default", "History"));
  }
  return cands;
}

function chromeProfileStatus() {
  for (const p of chromeHistoryPaths()) {
    try {
      if (p && fs.existsSync(p)) return { found: true, path: p };
    } catch {}
  }
  return { found: false };
}

function openReadonlyDb(file) {
  try {
    const Better = require("better-sqlite3");
    return { db: new Better(file, { readonly: true }), close: (h) => { try { h.db.close(); } catch {} } };
  } catch {}
  try {
    const { DatabaseSync } = require("node:sqlite");
    const db = new DatabaseSync(file, { readOnly: true });
    return { db, close: (h) => { try { h.db.close(); } catch {} }, sync: true };
  } catch {}
  return null;
}

async function importChromeHistory() {
  const status = chromeProfileStatus();
  if (!status.found) return { error: "no-chrome-profile" };
  const tmp = path.join(os.tmpdir(), `continua-chrome-hist-${Date.now()}`);
  try { fs.copyFileSync(status.path, tmp); } catch (e) { return { error: "locked" }; }
  const handle = openReadonlyDb(tmp);
  if (!handle) { try { fs.rmSync(tmp, { force: true }); } catch {} return { error: "no-sqlite" }; }
  let rows = [];
  try {
    if (handle.sync) rows = handle.db.prepare("SELECT url, title, last_visit_time FROM urls ORDER BY last_visit_time DESC LIMIT 2000").all();
    else rows = handle.db.prepare("SELECT url, title, last_visit_time FROM urls ORDER BY last_visit_time DESC LIMIT 2000").all();
  } catch (e) { try { handle.close(handle); } catch {} try { fs.rmSync(tmp, { force: true }); } catch {} return { error: "read-failed" }; }
  try { handle.close(handle); } catch {}
  try { fs.rmSync(tmp, { force: true }); } catch {}
  let imported = 0;
  const seen = new Set((store.getHistory ? store.getHistory() : []).map((h) => h.url));
  // Rows arrive newest-first but appendHistory unshifts — walk backwards so
  // the merged ring stays newest-first.
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (!r?.url || !/^https?:\/\//i.test(r.url) || seen.has(r.url)) continue;
    seen.add(r.url);
    try { store.appendHistory(r.url, r.title || r.url); imported++; } catch {}
  }
  return { ok: true, imported, scanned: rows.length };
}

// ---------- captive portal detection (Firefox-style) ----------
// Chromium on Linux leaves portal detection to the OS, which often does
// nothing — Firefox pops the login page itself. We probe lightweight
// canary URLs: offline (DNS/route failure) vs portal (redirect/wrong body).
// On portal, open its login page once (deduped) and let the chrome toast.
let lastPortalAt = 0;
let portalCheckRunning = false;
async function checkCaptivePortal() {
  if (portalCheckRunning || !chrome || chrome.isDestroyed()) return;
  portalCheckRunning = true;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    let res;
    try {
      res = await fetch("http://connectivitycheck.gstatic.com/generate_204", {
        method: "GET", redirect: "manual", signal: ctrl.signal,
        headers: { "user-agent": "Continua Portal Check" },
      });
    } finally { clearTimeout(timer); }
    // 204 with no location = clear internet. Anything else over plain HTTP
    // on this canary = middlebox/portal answering instead.
    if (res && res.status === 204 && !res.headers.get("location")) return;
    let portalUrl = res?.headers?.get?.("location") || null;
    if (portalUrl && !/^https?:\/\//i.test(portalUrl)) portalUrl = null;
    // Fallback canary with a known body when the first is inconclusive.
    if (!portalUrl) {
      try {
        const c2 = new AbortController();
        const t2 = setTimeout(() => c2.abort(), 8000);
        const r2 = await fetch("http://detectportal.firefox.com/canonical.html", {
          redirect: "follow", signal: c2.signal,
          headers: { "user-agent": "Continua Portal Check" },
        }).finally(() => clearTimeout(t2));
        const body = ((await r2.text()) || "").trim();
        if (r2.ok && body === "success") return; // clear
        portalUrl = r2.url && /^https?:\/\//i.test(r2.url) ? r2.url : null;
      } catch {}
    }
    if (!portalUrl) return;
    // Dedupe: one portal tab per 10 minutes, never duplicate an open one.
    if (Date.now() - lastPortalAt < 10 * 60 * 1000) return;
    try {
      const host = new URL(portalUrl).hostname;
      for (const [, m] of tabs) {
        try { if (new URL(m.url).hostname === host) return; } catch {}
      }
    } catch { return; }
    lastPortalAt = Date.now();
    try { chrome.webContents.send("portal-detected", { url: portalUrl }); } catch {}
    console.error(`[continua] captive portal detected: ${portalUrl}`);
  } catch {
    // Offline (DNS/route failure) — not a portal, stay quiet.
  } finally { portalCheckRunning = false; }
}
setInterval(checkCaptivePortal, 45000);
// Also probe shortly after boot (hotel/airport joins happen then).
setTimeout(checkCaptivePortal, 20000);
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
      const startish = isStartPageUrl(target);
      const lab = `tab-restore-${Date.now()}-${i}`;
      // Full resurrection: back-history, scroll offset and zoom survive
      // restarts (saved by persistNow); fall back to single-entry for legacy.
      const hist = Array.isArray(t.history) && t.history.length ? t.history.slice(-30) : [target];
      const idx = Math.min(Math.max(0, t.histIdx || 0), hist.length - 1);
      const atIdx = hist[idx] || target;
      tabs.set(lab, { label: lab, url: startish ? "continua://start" : atIdx, title: startish ? "New Tab" : (t.title || atIdx), history: startish ? [target] : hist, idx: startish ? 0 : idx, scrollY: t.scrollY || 0, pendingScroll: t.scrollY || null, pinned: !!t.pinned, group: t.group || null, container: typeof t.container === "string" ? t.container : null, incognito: false, zoom: t.zoom || 100, discarded: true, lastActive: 0, view: null });
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
    return { activeId: activeProfileId, profiles: profileState.profiles, tabs: [...tabs.entries()].map(([lab, t]) => ({ label: lab, url: t.url, title: t.title, pinned: !!t.pinned, group: t.group || null, container: t.container || null, incognito: !!t.incognito })) };
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
  try { closedRings.set(activeProfileId, store.loadClosedRing ? store.loadClosedRing() : []); } catch {}
  try { syncVersion = (store.cfg.last_version || 0) + 1; } catch {}
  try { session.fromPartition(activePartition()).setSpellCheckerEnabled(true); } catch {}
  wireDownloads(session.fromPartition(activePartition()), activePartition());
  wireMedia(activePartition());
  wirePermissions(session.fromPartition(activePartition()), activePartition());
  wireShields(session.fromPartition(activePartition()), activePartition());
  refreshShields();
  try { await autoloadExtensions(); } catch (e) { console.error(`[continua] autoloadExtensions: ${e?.message || e}`); }
  try { renderStartPage(); } catch {}
  restoreTabsIntoMemory(store.loadSession());
  try { chrome?.webContents.send("profiles-changed", { activeId: activeProfileId, profiles: profileState.profiles }); } catch {}
  return { activeId: activeProfileId, profiles: profileState.profiles, tabs: [...tabs.entries()].map(([lab, t]) => ({ label: lab, url: t.url, title: t.title, pinned: !!t.pinned, group: t.group || null, container: t.container || null, incognito: !!t.incognito })) };
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

// ---------- agent bridge: loopback HTTP RPC for the agent/MCP track ----------
let agentBridge = null;
async function dispatchAgentRpc(payload, res) {
  const { id, method, params = {} } = payload;
  const send = (result, err) => res.end(JSON.stringify({ id, result, error: err ? { message: err } : undefined }));
  try {
    const t = params.label ? tabs.get(params.label) : focused ? tabs.get(focused) : null;
    switch (method) {
      case "list_tabs": return send([...tabs.entries()].map(([lab, x]) => ({ label: lab, url: x.url, title: x.title, container: x.container || null })));
      case "observe_tab": {
        if (!t?.view || t.discarded) return send(null, "no-tab");
        const raw = await t.view.webContents.executeJavaScript(COLLECT_AGENT_TREE, true).catch(() => null);
        const snap = AxTree.buildSnapshot(Array.isArray(raw) ? raw : []);
        agentLog({ type: "visit", url: t.url, label: t.label });
        return send({ tab: { label: t.label, url: t.url, title: t.title }, summary: AxTree.summarize(snap.tree), index: AxTree.index(snap.tree), truncated: snap.truncated });
      }
      case "act_tab": {
        if (!t?.view || t.discarded) return send(null, "no-tab");
        const c = AgentAct.classify({ verb: params.verb, id: params.id, value: params.value }, { approved: !!params.approved, auto: !!params.auto });
        if (!c.ok) return send(null, c.reason || "invalid-action");
        if (c.tier === "write" && c.needsApproval) return send({ needsApproval: true, reason: c.reason, verb: params.verb, id: params.id });
        const path = String(params.id || "0").split(".").map(Number);
        let js = null;
        if (params.verb === "click") js = AgentAct.clickJs(path);
        if (params.verb === "type") js = AgentAct.typeJs(path, params.value);
        if (!js) { agentLog({ type: "interact", url: t.url, verb: params.verb, id: params.id }); return send({ ok: true, verb: params.verb, tier: c.tier }); }
        const done = await t.view.webContents.executeJavaScript(js, true).catch(() => null);
        if (params.verb === "type" || params.verb === "click") agentLog({ type: "write", url: t.url, id: params.id, verb: params.verb, approved: c.approved });
        return send({ ok: true, verb: params.verb, id: params.id, approved: c.approved, result: done });
      }
      case "debrief_session": {
        const sum = Debrief.summarize(agentTimeline);
        return send({ headline: Debrief.headline(sum), summary: sum, actionItems: Debrief.actionItems(agentTimeline, { mode: params.mode || "long" }) });
      }
      case "agent_timeline_clear": { agentTimeline = []; return send({ ok: true }); }
      default: return send(null, `unknown-method:${method}`);
    }
  } catch (e) { return send(null, String(e?.message || e)); }
}
function startAgentBridge() {
  try {
    const http = require("http");
    const crypto = require("crypto");
    const token = crypto.randomBytes(24).toString("hex");
    const server = http.createServer((req, res) => {
      res.setHeader("content-type", "application/json");
      if (req.method !== "POST" || req.url !== "/rpc") { res.writeHead(405); res.end(JSON.stringify({ error: "method-not-allowed" })); return; }
      let body = "";
      req.on("data", (ch) => { if (body.length < 2e6) body += ch; });
      req.on("end", () => {
        const auth = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
        if (!auth || auth !== token) { res.writeHead(401); res.end(JSON.stringify({ error: "unauthorized" })); return; }
        let payload = {};
        try { payload = JSON.parse(body || "{}"); } catch { res.writeHead(400); res.end(JSON.stringify({ error: "bad-json" })); return; }
        dispatchAgentRpc(payload, res).catch(() => res.end(JSON.stringify({ id: payload.id, error: { message: "dispatch-failed" } })));
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const info = { port: server.address().port, token, pid: process.pid, wrote: new Date().toISOString() };
      for (const p of [path.join(userDataPath, "agent-bridge.json"), path.join(os.homedir(), ".continua", "agent-bridge.json")]) {
        try { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(info)); } catch { /* non-fatal */ }
      }
      console.error(`[continua] agent bridge on 127.0.0.1:${info.port} (token in agent-bridge.json)`);
    });
    agentBridge = server;
    app.on("will-quit", () => { try { agentBridge?.close(); } catch {} });
  } catch (e) { console.error("[continua] agent bridge failed", e); }
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
  startAgentBridge();
  // SQLite FTS5 store per profile, JSON fallback when better-sqlite3 is not installed.
  store = createStoreFor(activeProfileId);
  try { closedRings.set(activeProfileId, store.loadClosedRing ? store.loadClosedRing() : []); } catch {}
  try { syncVersion = (store.cfg.last_version || 0) + 1; } catch {}
  try { session.fromPartition(activePartition()).setSpellCheckerEnabled(true); } catch {}
  try { session.fromPartition(activePartition()).setSpellCheckerLanguages(["en-US"]); } catch {}
  wireDownloads(session.fromPartition(activePartition()), activePartition());
  wireMedia(activePartition());
  wirePermissions(session.fromPartition(activePartition()), activePartition());
  wireShields(session.fromPartition(activePartition()), activePartition());
  refreshShields();
  wireDownloads(session.defaultSession, "default");
  wirePermissions(session.defaultSession, "default");
  // restore persisted + drop-in extensions (Chromium loadExtension)
  try { await autoloadExtensions(); } catch (e) { console.error(`[continua] autoloadExtensions: ${e?.message || e}`); }
  // Bake installed apps + icons into this profile's start page.
  try { renderStartPage(); } catch (e) { console.error(`[continua] renderStartPage: ${e?.message || e}`); }
  // auto-update (optional dep): check on boot, download in the background,
  // chrome offers restart-to-apply. Silent no-op when nothing is published.
  try {
    const { autoUpdater } = require("electron-updater");
    autoUpdater.autoDownload = true;
    autoUpdater.on("update-available", (info) => {
      console.error(`[continua] update available ${info?.version || ""}`);
      try { chrome?.webContents.send("update-event", { state: "available", version: info?.version || "" }); } catch {}
    });
    autoUpdater.on("update-downloaded", (info) => {
      console.error(`[continua] update ready ${info?.version || ""}`);
      try { chrome?.webContents.send("update-event", { state: "ready", version: info?.version || "" }); } catch {}
    });
    autoUpdater.on("error", (e) => console.error(`[continua] updater: ${e?.message || e}`));
    autoUpdater.checkForUpdates().catch((e) => console.error(`[continua] updater check: ${e?.message || e}`));
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
