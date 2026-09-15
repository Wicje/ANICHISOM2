/**
 * Continua Electron spike — preload.
 *
 * Implements CONTINUA's seam contract: exposes `window.continuaBridge`, the
 * same object the React chrome imports from tauri-bridge.ts, but backed by
 * Electron IPC (contextBridge -> ipcRenderer.invoke) instead of Tauri invoke.
 *
 * The package.json name is "continua-desktop" so the rust-free chrome boots
 * identically. isTauri() will be false (no __TAURI_INTERNALS__), so the
 * chrome's browser-mode fallback path is what actually runs — proving the
 * engine-agnostic seam is real, not just a figment of the Tauri build.
 */
const { contextBridge, ipcRenderer } = require("electron");

// ── the contract: same member set the React chrome imports ──
const api = {
  openTab: (url) => ipcRenderer.invoke("open-tab", { url }),
  openIncognitoTab: (url) => ipcRenderer.invoke("open-incognito-tab", { url }),
  closeTab: (label) => ipcRenderer.invoke("close-tab", { label }),
  activateTab: (label) => ipcRenderer.invoke("activate-tab", { label }),
  navigateTab: (label, url) => ipcRenderer.invoke("navigate-tab", { label, url }),
  reloadTab: (label) => ipcRenderer.invoke("reload-tab", { label }),
  backTab: (label) => ipcRenderer.invoke("back-tab", { label }),
  forwardTab: (label) => ipcRenderer.invoke("forward-tab", { label }),
  pinTab: (label) => ipcRenderer.invoke("pin-tab", { label }),
  findInTab: (label, text) => ipcRenderer.invoke("find-in-tab", { label, text }),
  stopFind: (label) => ipcRenderer.invoke("stop-find", { label }),
  setZoom: (label, zoom) => ipcRenderer.invoke("set-zoom", { label, zoom }),
  applyZoom: (dir) => ipcRenderer.invoke("apply-zoom", { dir }),
  readerToggle: (label) => ipcRenderer.invoke("reader-toggle", { label }),
  setSearchEngine: (engine) => ipcRenderer.invoke("set-search-engine", { engine }),
  getSession: () => ipcRenderer.invoke("get-session"),
  saveSession: () => ipcRenderer.invoke("save-session"),
  restoreSession: (json) => ipcRenderer.invoke("restore-session", { json }),
  deviceInfo: () => ipcRenderer.invoke("device-info"),
  markVault: (label, shielded) => ipcRenderer.invoke("mark-vault", { label, shielded }),
  relayout: (chromeH, tabRail) => ipcRenderer.invoke("relayout", { chromeH, tabRail }),
  setImmersive: (on, label) => ipcRenderer.invoke("set-immersive", { on, label }),
  historyAfter: (t) => ipcRenderer.invoke("history-after", { t }),
  clearHistory: () => ipcRenderer.invoke("clear-history"),
  getBookmarks: () => ipcRenderer.invoke("get-bookmarks"),
  bookmark: () => ipcRenderer.invoke("bookmark"),
  addBookmark: (url, title) => ipcRenderer.invoke("add-bookmark", { url, title }),
  newTabUrl: () => ipcRenderer.invoke("new-tab-url"),
  typeAhead: (term) => ipcRenderer.invoke("type-ahead", { term }),
  poolState: () => ipcRenderer.invoke("pool-state"),
};

// selftest battery seam — same shape as arm_selftest on the Tauri side
const selftest = {
  battery: (opts) => ipcRenderer.invoke("selftest:battery", opts),
};

contextBridge.exposeInMainWorld("continuaBridge", {
  isTauri: () => false, // ENGINE SEAM: chrome must keep working without it
  api,
  selftest,
});

// RSS + startup capture, called from the battery harness
process.on("message", (m) => {
  if (m?.selftest) {
    const rss = process.memoryUsage?.().rss ?? 0;
    process.send({ selftest: { rss, heapUsed: process.memoryUsage?.().heapUsed ?? 0, now: Date.now() } });
  }
});
