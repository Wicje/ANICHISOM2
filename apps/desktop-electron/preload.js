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
  // Captive portal login pages pushed by the host's own detector.
  onPortal: (cb) => {
    const h = (_evt, info) => { try { cb(info); } catch {} };
    ipcRenderer.on("portal-detected", h);
    return () => ipcRenderer.removeListener("portal-detected", h);
  },
  // legacy per-method shape (old spike) — all routed through the same channel
  openTab: (url) => ipcRenderer.invoke("continua", "open_tab", { url }),
  openIncognitoTab: (url) => ipcRenderer.invoke("continua", "open_incognito_tab", { url }),
  closeTab: (label) => ipcRenderer.invoke("continua", "close_tab", { label }),
  activateTab: (label) => ipcRenderer.invoke("continua", "activate_tab", { label }),
  navigateTab: (label, url) => ipcRenderer.invoke("continua", "navigate_tab", { label, url }),
  reloadTab: (label) => ipcRenderer.invoke("continua", "reload_tab", { label }),
});
