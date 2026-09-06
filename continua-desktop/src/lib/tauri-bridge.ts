/**
 * Tauri bridge — typed wrappers over IPC commands.
 *
 * Every call degrades gracefully when not running inside Tauri
 * (plain `vite dev` in a browser), so the chrome UI is previewable
 * without the native shell.
 */
import { invoke } from "@tauri-apps/api/core";

export const isTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export interface TabRecord {
  url: string;
  title: string;
}

export interface DeviceInfo {
  os: string;
  arch: string;
  hostname: string;
  display_resolution: string;
  capabilities: Record<string, boolean>;
}

export const api = {
  openTab: (url: string) =>
    isTauri() ? invoke<string>("open_tab", { url }) : Promise.resolve(`tab-mock-${Math.random().toString(36).slice(2)}`),

  closeTab: (label: string) =>
    invoke<void>("close_tab", { label }).catch(() => undefined),

  activateTab: (label: string) =>
    invoke<void>("activate_tab", { label }).catch(() => undefined),

  closeAllTabs: () =>
    invoke<void>("close_all_tabs").catch(() => undefined),

  relayout: () =>
    invoke<void>("update_tab_layout").catch(() => undefined),

  saveSession: (tabs: TabRecord[]) =>
    invoke<string>("save_session", { tabs }).catch(() => "local"),

  loadSession: () =>
    invoke<TabRecord[] | null>("load_session").catch(() => null),

  deviceInfo: () =>
    invoke<DeviceInfo>("get_device_info").catch(() => null),

  vaultGet: (key: string) =>
    invoke<string | null>("vault_get", { key }).catch(() => null),

  vaultStore: (key: string, value: string) =>
    invoke<void>("vault_store", { key, value }).catch(() => undefined),

  syncContext: (url: string, title: string) =>
    invoke<void>("sync_context", { url, title }).catch(() => undefined),

  setContinuaUrl: (url: string) =>
    invoke<void>("set_continua_url", { url }).catch(() => undefined),

  getContinuaUrl: () =>
    isTauri() ? invoke<string>("get_continua_url").catch(() => "continuaos.cc") : Promise.resolve("continuaos.cc"),
};