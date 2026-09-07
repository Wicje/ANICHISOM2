/**
 * Tauri bridge — typed wrappers over IPC commands.
 *
 * Every call degrades gracefully when not running inside Tauri
 * (plain `vite dev` in a browser), so the chrome UI is previewable
 * without the native shell.
 */
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export const isTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Short human label from a URL (hostname minus www). */
export const displayTitle = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** Cross-origin favicon via Google's service (works for nearly every site). */
export const faviconUrl = (url: string): string => {
  try {
    const host = new URL(url).host;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return "🌐";
  }
};

export interface TabRecord {
  url: string;
  title: string;
}

/** A tab reopened by `restore_session`, with its native Rust label. */
export interface RestoredTab {
  label: string;
  url: string;
  title: string;
  /** Present when the tab is vaulted (URL/title live in the keyring). */
  vault_id?: string | null;
}

/** A tab as live in the chrome: same shape as a restored tab. */
export type OpenTab = RestoredTab;

/** A saved workspace checkpoint for the memory timeline. */
export interface SessionSummary {
  id: string;
  saved_at: number;
  tabs: TabRecord[];
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

  reloadTab: (label: string) =>
    invoke<void>("reload_tab", { label }).catch(() => undefined),

  backTab: (label: string) =>
    invoke<void>("back_tab", { label }).catch(() => undefined),

  forwardTab: (label: string) =>
    invoke<void>("forward_tab", { label }).catch(() => undefined),

  navigateTab: (label: string, url: string) =>
    invoke<void>("navigate_tab", { label, url }).catch(() => undefined),

  navState: (label: string) =>
    invoke<{ back: boolean; forward: boolean }>("nav_state", { label }).catch(() => ({
      back: false,
      forward: false,
    })),

  setImmersive: (enabled?: boolean) =>
    invoke<void>("set_immersive", { enabled: enabled ?? null }).catch(
      () => undefined
    ),

  closeAllTabs: () =>
    invoke<void>("close_all_tabs").catch(() => undefined),

  relayout: () =>
    invoke<void>("update_tab_layout").catch(() => undefined),

  saveSession: (tabs: TabRecord[], active: string | null) =>
    invoke<string>("save_session", { tabs, active }).catch(() => "local"),

  loadSession: () =>
    invoke<TabRecord[] | null>("load_session").catch(() => null),

  restoreSession: (id?: string, replace?: boolean) =>
    invoke<RestoredTab[] | null>("restore_session", {
      id: id ?? null,
      replace: replace ?? false,
    }).catch(() => null),

  exportSession: (id?: string) =>
    invoke<string | null>("export_session", { id: id ?? null }).catch(
      () => null
    ),

  importSessionJson: (raw: string) =>
    invoke<number>("import_session_json", { raw }).catch(() => 0),

  browseSessions: () =>
    invoke<SessionSummary[]>("browse_sessions").catch(() => []),

  deviceInfo: () =>
    invoke<DeviceInfo>("get_device_info").catch(() => null),

  vaultGet: (key: string) =>
    invoke<string | null>("vault_get", { key }).catch(() => null),

  vaultStore: (key: string, value: string) =>
    invoke<void>("vault_store", { key, value }).catch(() => undefined),

  markVault: (label: string) =>
    invoke<RestoredTab | null>("mark_vault", { label }).catch(() => null),

  unmarkVault: (label: string) =>
    invoke<RestoredTab | null>("unmark_vault", { label }).catch(() => null),

  pairDevice: (pin: string) =>
    invoke<string>("pair_device", { pin }).catch(() => "expired"),

  syncSession: () =>
    invoke<unknown>("sync_session").catch(() => null),

  pullSession: () =>
    invoke<RestoredTab[] | null>("pull_session").catch(() => null),

  syncStatus: () =>
    invoke<{ paired: boolean; deviceId: string; lastVersion: number }>(
      "sync_status"
    ).catch(() => ({ paired: false, deviceId: "", lastVersion: 0 })),

  setContinuaUrl: (url: string) =>
    invoke<void>("set_continua_url", { url }).catch(() => undefined),

  getContinuaUrl: () =>
    isTauri() ? invoke<string>("get_continua_url").catch(() => "continuaos.cc") : Promise.resolve("continuaos.cc"),
};

/** OS window controls for the borderless main window. */
export const windowControls = {
  minimize: () => getCurrentWindow().minimize().catch(() => undefined),
  toggleMaximize: () => getCurrentWindow().toggleMaximize().catch(() => undefined),
  isMaximized: () => getCurrentWindow().isMaximized().catch(() => false),
  close: () => getCurrentWindow().close().catch(() => undefined),
};