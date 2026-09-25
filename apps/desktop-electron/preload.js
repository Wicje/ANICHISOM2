/**
 * Continua Electron preload — unified `continua` IPC seam (ADR-008).
 *
 * Contract: window.continuaBridge.invoke(cmd, args) -> ipcRenderer.invoke('continua', cmd, args)
 * where cmd is snake_case matching tauri-bridge.ts (open_tab, navigate_tab, ...).
 * Kebab-case aliases (open-tab, ...) kept for backward compat with old spike code.
 */
const { contextBridge, ipcRenderer } = require("electron");

const KEBAB_TO_SNAKE = {
  "open-tab": "open_tab",
  "open-incognito-tab": "open_incognito_tab",
  "close-tab": "close_tab",
  "activate-tab": "activate_tab",
  "navigate-tab": "navigate_tab",
  "reload-tab": "reload_tab",
  "back-tab": "back_tab",
  "forward-tab": "forward_tab",
  "pin-tab": "set_tab_pinned",
  "find-in-tab": "find_in_tab",
  "stop-find": "stop_find",
  "set-zoom": "zoom_tab",
  "apply-zoom": "zoom_tab",
  "reader-toggle": "reader_toggle",
  "set-search-engine": "set_search_engine",
  "get-session": "load_session",
  "save-session": "save_session",
  "restore-session": "restore_session",
  "device-info": "get_device_info",
  "mark-vault": "mark_vault",
  "history-after": "get_history",
  "clear-history": "clear_history",
  "get-bookmarks": "get_bookmarks",
  "add-bookmark": "add_bookmark",
  "new-tab-url": "new_tab_url",
  "type-ahead": "search_suggestions",
  "pool-state": "pool_state",
};

function normalize(cmd) {
  if (!cmd) return cmd;
  return KEBAB_TO_SNAKE[cmd] || cmd;
}

contextBridge.exposeInMainWorld("continuaBridge", {
  invoke: (cmd, args) => ipcRenderer.invoke("continua", normalize(cmd), args || {}),
  // Host-pushed events (studio mode). Returns an unsubscribe function.
  onStudio: (cb) => {
    const h = (_evt, on) => { try { cb(!!on); } catch {} };
    ipcRenderer.on("studio", h);
    return () => ipcRenderer.removeListener("studio", h);
  },
  // Navigation/title updates pushed per webview event (back/forward +
  // address bar stay live as pages are clicked, not just typed).
  onTabUpdated: (cb) => {
    const h = (_evt, info) => { try { cb(info); } catch {} };
    ipcRenderer.on("tab-updated", h);
    return () => ipcRenderer.removeListener("tab-updated", h);
  },
  // Host-initiated tab births/deaths (link fork, window.open popup) pushed
  // outside any chrome IPC call. Returns an unsubscribe function.
  onTabCreated: (cb) => {
    const h = (_evt, info) => { try { cb(info); } catch {} };
    ipcRenderer.on("tab-created", h);
    return () => ipcRenderer.removeListener("tab-created", h);
  },
  onTabClosed: (cb) => {
    const h = (_evt, info) => { try { cb(info); } catch {} };
    ipcRenderer.on("tab-closed", h);
    return () => ipcRenderer.removeListener("tab-closed", h);
  },
  // Save-password prompt + fill availability, pushed by the host's login
  // flow. Secrets never cross this seam: prompts carry origin+username only.
  onLoginPrompt: (cb) => {
    const h = (_evt, info) => { try { cb(info); } catch {} };
    ipcRenderer.on("login-prompt", h);
    return () => ipcRenderer.removeListener("login-prompt", h);
  },
  onLoginAvailable: (cb) => {
    const h = (_evt, info) => { try { cb(info); } catch {} };
    ipcRenderer.on("login-available", h);
    return () => ipcRenderer.removeListener("login-available", h);
  },
  // Tabs pushed by paired devices ("send to device").
  onTabdropReceived: (cb) => {
    const h = (_evt, info) => { try { cb(info); } catch {} };
    ipcRenderer.on("tabdrop-received", h);
    return () => ipcRenderer.removeListener("tabdrop-received", h);
  },
  // Address save-prompt (origin + name/email preview only, never values).
  onAddressPrompt: (cb) => {
    const h = (_evt, info) => { try { cb(info); } catch {} };
    ipcRenderer.on("address-prompt", h);
    return () => ipcRenderer.removeListener("address-prompt", h);
  },
  // Captive portal login pages pushed by the host's own detector.
  onPortal: (cb) => {
    const h = (_evt, info) => { try { cb(info); } catch {} };
    ipcRenderer.on("portal-detected", h);
    return () => ipcRenderer.removeListener("portal-detected", h);
  },
  // Download start/finish pushes (panel only polls while open).
  onDownload: (cb) => {
    const h = (_evt, info) => { try { cb(info); } catch {} };
    ipcRenderer.on("download-event", h);
    return () => ipcRenderer.removeListener("download-event", h);
  },
  // Browser-accelerator commands from in-page keystrokes (focus-address,
  // open-find, toggle-history, toggle-downloads, open-palette).
  onChromeCommand: (cb) => {
    const h = (_evt, info) => { try { cb(info?.cmd); } catch {} };
    ipcRenderer.on("chrome-command", h);
    return () => ipcRenderer.removeListener("chrome-command", h);
  },
  // App-update lifecycle (available → downloading → ready to restart).
  onUpdate: (cb) => {
    const h = (_evt, info) => { try { cb(info); } catch {} };
    ipcRenderer.on("update-event", h);
    return () => ipcRenderer.removeListener("update-event", h);
  },
  // Main-frame load completion per tab (completes the progress line).
  onLoadFinished: (cb) => {
    const h = (_evt, info) => { try { cb(info); } catch {} };
    ipcRenderer.on("load-finished", h);
    return () => ipcRenderer.removeListener("load-finished", h);
  },
  // Loading state per tab (starts/completes the progress line for every
  // load — link forks, rehydrates and reloads included).
  onLoadStarted: (cb) => {
    const h = (_evt, info) => { try { cb(info); } catch {} };
    ipcRenderer.on("load-started", h);
    return () => ipcRenderer.removeListener("load-started", h);
  },
  onLoadStopped: (cb) => {
    const h = (_evt, info) => { try { cb(info); } catch {} };
    ipcRenderer.on("load-stopped", h);
    return () => ipcRenderer.removeListener("load-stopped", h);
  },
  // legacy per-method shape (old spike) — all routed through the same channel
  openTab: (url) => ipcRenderer.invoke("continua", "open_tab", { url }),
  openIncognitoTab: (url) => ipcRenderer.invoke("continua", "open_incognito_tab", { url }),
  closeTab: (label) => ipcRenderer.invoke("continua", "close_tab", { label }),
  activateTab: (label) => ipcRenderer.invoke("continua", "activate_tab", { label }),
  navigateTab: (label, url) => ipcRenderer.invoke("continua", "navigate_tab", { label, url }),
  reloadTab: (label) => ipcRenderer.invoke("continua", "reload_tab", { label }),
});
