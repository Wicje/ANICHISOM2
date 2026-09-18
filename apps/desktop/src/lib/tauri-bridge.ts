/**
 * Native bridge — Tauri IPC with Electron Chromium fallback (ADR-008).
 *
 * Product engine is Electron (`window.continuaBridge.invoke`), Tauri is
 * legacy-lite. Every call tries Electron first, then Tauri, then mock, so
 * the React chrome is byte-identical on both hosts with zero component edits.
 */
import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

declare global {
  interface Window {
    continuaBridge?: {
      invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
      onStudio?: (cb: (on: boolean) => void) => () => void;
      onTabUpdated?: (cb: (info: { label: string; url: string; title: string }) => void) => () => void;
    };
  }
}

export const isElectron = (): boolean =>
  typeof window !== "undefined" && typeof window.continuaBridge?.invoke === "function";

export const isTauriNative = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** True on any native host (Electron product or Tauri legacy). Keeps all
 * existing `if (!isTauri()) return` guards working on Electron. */
export const isTauri = (): boolean => isTauriNative() || isElectron();

const electronInvoke = <T>(cmd: string, args?: Record<string, unknown>): Promise<T> | null =>
  isElectron() ? (window.continuaBridge!.invoke(cmd, args) as Promise<T>) : null;

/** Unified invoke: Electron product first, Tauri legacy second. All existing
 * `invoke(cmd, args).catch(...)` call sites route here with no further edits. */
const invoke = <T>(cmd: string, args?: Record<string, unknown>): Promise<T> =>
  electronInvoke<T>(cmd, args) ?? (isTauriNative() ? tauriInvoke<T>(cmd, args) : Promise.reject(new Error("no-native-host")));

/**
 * What a freshly opened tab loads. The Continua OS backend is not deployed
 * yet, so new tabs point at a reachable search page instead of a dead domain.
 */
export const DEFAULT_NEW_TAB_URL = "https://duckduckgo.com";

/**
 * Sentinel for "open the local start page". The native host maps it to its
 * bundled offline start page — new tabs are instant and never depend on the
 * network (previously: DDG-or-blank lottery on slow/offline connections).
 */
export const START_TAB_URL = "continua://start";
const LEGACY_HOME_URL = "continua://home";

/**
 * Where a new tab should land: the configured homepage when it is a valid
 * http(s) URL, otherwise the local start page (ADR-008). Incognito tabs
 * deliberately skip the homepage — it may identify the user.
 */
export const newTabUrl = (cfg?: { homepage?: string }): string => {
  const hp = cfg?.homepage?.trim();
  return hp && /^https?:\/\//i.test(hp) ? hp : START_TAB_URL;
};

/** Short human label from a URL (hostname minus www). */
export const displayTitle = (url: string): string => {
  if (url === START_TAB_URL || url === LEGACY_HOME_URL) return "New Tab";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/**
 * Favicon straight from the site's own origin — no third-party favicon
 * service, so the chrome never leaks visited hostnames to anyone
 * (ADR-006 #2). Returns null for non-http(s) URLs; the caller falls back
 * to a generated glyph.
 */
export const faviconUrl = (url: string): string | null => {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:"
      ? `${u.origin}/favicon.ico`
      : null;
  } catch {
    return null;
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
  /** Private (incognito) tab — badge in the strip, never persisted. */
  incognito?: boolean;
  /** Sleeping (discarded to metadata) — faded in the strip, click to wake. */
  discarded?: boolean;
  /** Chrome-side pin (favicon-only tab); restored pin-for-pin from the session. */
  pinned?: boolean;
  /** Tab group id; resolved against the group registry for name/color. */
  group?: string | null;
}

/** A named tab group with its Apple-safe color. */
export interface TabGroup {
  id: string;
  name: string;
  color: string;
}

/** A Chrome-style browsing profile (Work ↔ Personal isolation). */
export interface BrowserProfile {
  id: string;
  name: string;
  color: string;
  themeId?: string | null;
}

export interface ProfileState {
  activeId: string;
  profiles: BrowserProfile[];
  created?: BrowserProfile;
  error?: string;
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

/** One entry in the recent-visits history ring (newest first). */
export interface HistoryItem {
  url: string;
  title: string;
  /** Unix seconds since epoch. */
  at: number;
}

/** A saved bookmark from the config store. */
export interface Bookmark {
  label: string;
  url: string;
  added_at: number;
}

/** The persisted browser config (search engine, theme, preferences). */
export interface BrowserConfigItem {
  search_engine: string;
  theme: string;
  bookmarks?: Bookmark[];
  history?: HistoryItem[];
  homepage?: string;
  /** Seconds between automatic session snapshots. */
  autosave_interval?: number;
  /** Reader-mode typeface: "serif", "sans" or "mono". */
  reader_font?: string;
  /** Reader-mode content width in px. */
  reader_width?: number;
  /** Show URL previews on link hover. */
  link_preview?: boolean;
  /** Pinned start-page tiles (top sites). */
  speed_dial?: string[];
  /** Named workspace currently being edited. */
  active_workspace?: string;
  /** Vertical tab rail pinned on (otherwise auto on overflow). */
  vertical_tabs?: boolean;
  /** Named tab-group registry (synced). */
  tab_groups?: TabGroup[];
  /** Active theme id (gallery builtin or custom). Synced per profile. */
  theme_id?: string;
  /** User theme packs. */
  custom_themes?: Array<{ id: string; name: string; accent: string; accentHi: string; glowA: string; glowB: string; custom?: boolean }>;
  /** User search engines (`{q}` placeholder). */
  custom_engines?: CustomEngine[];
  /** Toolbar button ids hidden by the user. */
  toolbar_hidden?: string[];
  /** Chrome density. */
  density?: "comfortable" | "compact";
  /** Remapped shortcuts. */
  shortcuts?: ShortcutMap;
  /** Per-origin preferences. */
  site_prefs?: Record<string, SitePref>;
  /** Auto-sleep idle tabs after N minutes (0 = off). */
  sleep_after_min?: number;
  /** Opt-in: auto-group same-site tabs on open (suggestions stay suggest-only). */
  auto_group_site?: boolean;
}

/** A user-defined search engine (`{q}` = query placeholder). */
export interface CustomEngine {
  id: string;
  name: string;
  url: string;
  badge?: string;
}

/** Per-origin remembered preferences (zoom %, auto-mute, force-dark). */
export interface SitePref {
  zoom?: number;
  muted?: boolean;
  dark?: boolean;
}

/** Remapped keyboard shortcuts: action id -> "ctrl+shift+m" style combo. */
export type ShortcutMap = Record<string, string>;

/** A sparse settings patch for `updateConfig`; only present keys change. */
export interface ConfigPatch {
  search_engine?: string;
  theme?: string;
  homepage?: string;
  autosave_interval?: number;
  reader_font?: string;
  reader_width?: number;
  link_preview?: boolean;
  speed_dial?: string[];
  active_workspace?: string;
  vertical_tabs?: boolean;
  tab_groups?: TabGroup[];
  theme_id?: string;
  custom_themes?: BrowserConfigItem["custom_themes"];
  custom_engines?: CustomEngine[];
  toolbar_hidden?: string[];
  density?: "comfortable" | "compact";
  shortcuts?: ShortcutMap;
  site_prefs?: Record<string, SitePref>;
  sleep_after_min?: number;
  auto_group_site?: boolean;
}

/** Search URL for a query under the given engine id (customs supported). */
export function searchUrlFor(engine: string, query: string, customs: CustomEngine[] = []): string {
  const q = encodeURIComponent(query.trim());
  const custom = customs.find((e) => e.id === engine);
  if (custom && custom.url.includes("{q}")) {
    try {
      const u = new URL(custom.url.replace("{q}", q));
      if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
    } catch { /* fall through to default */ }
  }
  switch (engine) {
    case "duckduckgo":
      return `https://duckduckgo.com/?q=${q}`;
    case "bing":
      return `https://www.bing.com/search?q=${q}`;
    case "brave":
      return `https://search.brave.com/search?q=${q}`;
    default:
      return `https://www.google.com/search?q=${q}`;
  }
}

/** Validate a user engine template (http(s) URL containing {q}). */
export function sanitizeEngine(e: unknown): CustomEngine | null {
  if (!e || typeof e !== "object") return null;
  const o = e as Record<string, unknown>;
  if (typeof o.url !== "string" || !o.url.includes("{q}")) return null;
  try {
    const u = new URL((o.url as string).replace("{q}", "test"));
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  } catch { return null; }
  const name = typeof o.name === "string" ? o.name.trim().slice(0, 24) || "Custom" : "Custom";
  const id = typeof o.id === "string" && /^[a-z0-9-]{1,32}$/.test(o.id) ? o.id : `custom-${Math.random().toString(36).slice(2, 8)}`;
  const badge = typeof o.badge === "string" ? o.badge.trim().slice(0, 4).toUpperCase() || name.slice(0, 2).toUpperCase() : name.slice(0, 2).toUpperCase();
  return { id, name, url: o.url as string, badge };
}

/** Short badge for an engine ("G", "DDG", "B", "Br", customs) used by the selector. */
export function engineBadge(engine: string, customs: CustomEngine[] = []): string {
  const custom = customs.find((e) => e.id === engine);
  if (custom) return (custom.badge || custom.name.slice(0, 2)).toUpperCase();
  switch (engine) {
    case "duckduckgo":
      return "DDG";
    case "bing":
      return "B";
    case "brave":
      return "Br";
    default:
      return "G";
  }
}

export const api = {
  openTab: (url: string) =>
    isTauri() ? invoke<string>("open_tab", { url }) : Promise.resolve(`tab-mock-${Math.random().toString(36).slice(2)}`),

  /** Ground truth from the host: adopt native tabs React doesn't know (drift repair). */
  listTabs: () =>
    invoke<OpenTab[]>("list_tabs").catch(() => []),

  openIncognitoTab: (url: string) =>
    isTauri()
      ? invoke<string>("open_incognito_tab", { url })
      : Promise.resolve(`tab-mock-private-${Math.random().toString(36).slice(2)}`),

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

  pinTab: (label: string, pinned: boolean) =>
    invoke<void>("set_tab_pinned", { label, pinned }).catch(() => undefined),

  findInTab: (label: string, query: string) =>
    invoke<{ count: number; idx: number }>("find_in_tab", { label, query }).catch(
      () => ({ count: 0, idx: -1 }),
    ),

  findNext: (label: string, query: string) =>
    invoke<{ count: number; idx: number }>("find_next", { label, query }).catch(
      () => ({ count: 0, idx: -1 }),
    ),

  findPrev: (label: string, query: string) =>
    invoke<{ count: number; idx: number }>("find_prev", { label, query }).catch(
      () => ({ count: 0, idx: -1 }),
    ),

  zoomTab: (label: string, step: number, value?: number) =>
    invoke<number>("zoom_tab", { label, step, value: value ?? null }).catch(() => 100),

  readerToggle: (label: string) =>
    invoke<void>("reader_toggle", { label }).catch(() => undefined),

  darkToggle: (label: string) =>
    invoke<void>("dark_toggle", { label }).catch(() => undefined),

  setSearchEngine: (engine: string) =>
    invoke<BrowserConfigItem>("set_search_engine", { engine }).catch(
      () => null,
    ),

  getBrowserConfig: () =>
    invoke<BrowserConfigItem>("get_browser_config").catch((): BrowserConfigItem => ({
      search_engine: "google",
      theme: "dark",
      homepage: "",
      autosave_interval: 10,
      reader_font: "serif",
      reader_width: 720,
      link_preview: false,
      speed_dial: [],
      active_workspace: "default",
      vertical_tabs: false,
    })),

  navState: (label: string) =>
    invoke<{ back: boolean; forward: boolean }>("nav_state", { label }).catch(() => ({
      back: false,
      forward: false,
    })),

  setImmersive: (enabled?: boolean) =>
    invoke<void>("set_immersive", { enabled: enabled ?? null }).catch(
      () => undefined
    ),

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

  reopenLastClosed: () =>
    invoke<RestoredTab | null>("reopen_last_closed").catch(() => null),

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
    invoke<{
      paired: boolean;
      deviceId: string;
      serverDeviceId: string;
      trustLevel: string;
      lastVersion: number;
    }>("sync_status").catch(() => ({
      paired: false,
      deviceId: "",
      serverDeviceId: "",
      trustLevel: "unknown",
      lastVersion: 0,
    })),

  registerDevice: () =>
    invoke<{
      deviceId: string;
      trustLevel: string;
      isNew: boolean;
    } | null>("register_device").catch(() => null),

  setContinuaUrl: (url: string) =>
    invoke<void>("set_continua_url", { url }).catch(() => undefined),

  getContinuaUrl: () =>
    isTauri() ? invoke<string>("get_continua_url").catch(() => "continuaos.cc") : Promise.resolve("continuaos.cc"),

  getHistory: () =>
    invoke<HistoryItem[]>("get_history").catch(() => []),

  clearHistory: () =>
    invoke<void>("clear_history").catch(() => undefined),

  getBookmarks: () =>
    invoke<Bookmark[]>("get_bookmarks").catch(() => []),

  addBookmark: (url: string, title?: string) =>
    invoke<Bookmark[]>("add_bookmark", { url, title: title ?? null }).catch(
      () => [],
    ),

  removeBookmark: (url: string) =>
    invoke<Bookmark[]>("remove_bookmark", { url }).catch(() => []),

  getSearchSuggestions: (engine: string, query: string) =>
    invoke<string[]>("search_suggestions", { engine, query }).catch(() => []),

  setLinkPreview: (enabled: boolean) =>
    invoke<void>("set_link_preview", { enabled }).catch(() => undefined),

  updateConfig: (patch: ConfigPatch) =>
    invoke<BrowserConfigItem | null>("update_config", { patch }).catch(
      () => null,
    ),

  listWorkspaces: () =>
    invoke<SessionSummary[]>("list_workspaces").catch(() => []),

  saveWorkspace: (name: string) =>
    invoke<SessionSummary[]>("save_workspace", { name }).catch(() => []),

  openWorkspace: (name: string) =>
    invoke<RestoredTab[] | null>("open_workspace", { name }).catch(
      () => null,
    ),

  deleteWorkspace: (name: string) =>
    invoke<SessionSummary[]>("delete_workspace", { name }).catch(() => []),

  openAppWindow: (url: string) =>
    invoke<void>("open_app_window", { url }).catch(() => undefined),

  /** Negotiate measured chrome height so native tabs reflow below it. */
  setChromeHeight: (height: number) =>
    invoke<void>("set_chrome_height", { height }).catch(() => undefined),

  /** Toggle the vertical tab rail inset (the host page draws the rail). */
  setTabRail: (enabled: boolean) =>
    invoke<void>("set_tab_rail", { enabled }).catch(() => undefined),

  /** Hide content views while a chrome overlay is open (Electron stacking). */
  setChromeModal: (open: boolean) =>
    invoke<void>("chrome_modal", { open }).catch(() => undefined),

  listDownloads: () =>
    invoke<DownloadItem[]>("list_downloads").catch(() => []),

  openDownload: (id: string) =>
    invoke<void>("open_download", { id }).catch(() => undefined),

  revealDownload: (id: string) =>
    invoke<void>("reveal_download", { id }).catch(() => undefined),

  cancelDownload: (id: string) =>
    invoke<void>("cancel_download", { id }).catch(() => undefined),

  clearDownloads: () =>
    invoke<DownloadItem[]>("clear_downloads").catch(() => []),

  setTabMuted: (label: string, muted: boolean) =>
    invoke<boolean>("set_tab_muted", { label, muted }).catch(() => muted),

  screenshotTab: (label?: string) =>
    invoke<{ path?: string; error?: string }>("screenshot_tab", { label: label ?? null })
      .catch((): { path?: string; error?: string } => ({ error: "unavailable" })),

  printTab: (label?: string) =>
    invoke<void>("print_tab", { label: label ?? null }).catch(() => undefined),

  tabAudioState: () =>
    invoke<Record<string, { audible: boolean; muted: boolean }>>("tab_audio_state").catch(() => ({})),

  /** Sleeping/discarded flags per tab (drives the 💤 strip state). */
  tabStates: () =>
    invoke<Record<string, { discarded?: boolean; audible?: boolean; muted?: boolean }>>("tab_audio_state").catch(() => ({})),

  /** Local tab-intelligence: suggested groups + exact duplicates (on-device only). */
  suggestGroups: () =>
    invoke<{ groups: Array<{ key: string; name: string; labels: string[]; reason: string }>; duplicates: Array<{ url: string; keep: string; close: string }> }>("suggest_groups").catch(() => ({ groups: [], duplicates: [] })),

  applyGroup: (labels: string[], opts?: { group?: string | null; name?: string }) =>
    invoke<{ group?: string | null; applied?: number; error?: string }>("apply_group", { labels, group: opts?.group ?? null, name: opts?.name ?? null }).catch(() => ({ error: "unavailable" })),

  /** Discard one tab's view to metadata (click wakes it). */
  sleepTab: (label: string) =>
    invoke<{ ok?: boolean; error?: string }>("sleep_tab", { label }).catch((): { ok?: boolean; error?: string } => ({ error: "unavailable" })),

  /** Per-tab memory (MB) from Chromium process metrics. */
  tabMetrics: () =>
    invoke<Record<string, { mb?: number | null; discarded?: boolean }>>("tab_metrics").catch(() => ({})),
  /** Studio-mode pushes from the host (global shortcut while chrome hidden). */
  onStudio: (cb: (on: boolean) => void): (() => void) => {
    try {
      const un = window.continuaBridge?.onStudio?.(cb);
      if (typeof un === "function") return un;
    } catch {}
    return () => undefined;
  },

  /** Navigation/title pushes per webview event (Electron host). */
  onTabUpdated: (cb: (info: { label: string; url: string; title: string }) => void): (() => void) => {
    try {
      const un = (window.continuaBridge as unknown as { onTabUpdated?: (cb: (info: { label: string; url: string; title: string }) => void) => () => void })?.onTabUpdated?.(cb);
      if (typeof un === "function") return un;
    } catch {}
    return () => undefined;
  },

  toggleDevTools: () =>
    invoke<void>("toggle_devtools").catch(() => undefined),

  loginStatus: () =>
    invoke<{ available: boolean }>("login_status").catch(() => ({ available: false })),

  listLogins: () =>
    invoke<Array<{ id: string; origin: string; username: string; addedAt: number }>>("list_logins").catch(() => []),

  addLogin: (origin: string, username: string, password: string) =>
    invoke<{ id?: string; error?: string }>("add_login", { origin, username, password }).catch(() => ({ error: "unavailable" })),

  removeLogin: (id: string) =>
    invoke<boolean>("remove_login", { id }).catch(() => false),

  fillLogin: (id?: string, label?: string) =>
    invoke<{ ok?: boolean; error?: string; detail?: string }>("fill_login", { id: id ?? null, label: label ?? null }).catch(() => ({ error: "unavailable" })),

  setTabGroup: (label: string, group: string | null) =>
    invoke<string | null>("set_tab_group", { label, group }).catch(() => null),

  listGroups: () =>
    invoke<TabGroup[]>("list_groups").catch(() => []),

  createGroup: (name: string) =>
    invoke<TabGroup | null>("create_group", { name }).catch(() => null),
  listDevices: () =>
    invoke<Array<{ id: string; device_name: string; trust_level: string; platform: string; last_seen_at: string }>>("list_devices").catch(() => []),

  listExtensions: () =>
    invoke<Array<{ id: string; name: string; path: string; enabled?: boolean }>>("list_extensions").catch(() => []),
  loadExtension: (path: string) =>
    invoke<{ id?: string; name?: string; error?: string }>("load_extension", { path }).catch(() => ({ error: "unavailable" })),

  removeExtension: (id: string) =>
    invoke<boolean>("remove_extension", { id }).catch(() => false),

  setExtensionEnabled: (id: string, enabled: boolean) =>
    invoke<unknown>("set_extension_enabled", { id, enabled }).catch(() => false),

  extensionsDir: () =>
    invoke<string>("extensions_dir").catch(() => ""),

  listProfiles: () =>
    invoke<ProfileState>("list_profiles").catch(() => ({ activeId: "personal", profiles: [] })),

  createProfile: (name: string) =>
    invoke<ProfileState>("create_profile", { name }).catch(() => ({ activeId: "", profiles: [], error: "unavailable" })),

  renameProfile: (id: string, name: string) =>
    invoke<ProfileState>("rename_profile", { id, name }).catch(() => ({ activeId: "", profiles: [], error: "unavailable" })),

  deleteProfile: (id: string) =>
    invoke<ProfileState>("delete_profile", { id }).catch(() => ({ activeId: "", profiles: [], error: "unavailable" })),

  switchProfile: (id: string) =>
    invoke<ProfileState & { tabs?: RestoredTab[] }>("switch_profile", { id }).catch(() => ({ activeId: "", profiles: [], error: "unavailable" })),

  setProfileTheme: (id: string, themeId: string | null) =>
    invoke<ProfileState>("set_profile_theme", { id, themeId: themeId ?? null }).catch(() => ({ activeId: "", profiles: [], error: "unavailable" })),
};

/** One download tracked by the native host. */
export interface DownloadItem {
  id: string;
  filename: string;
  path: string;
  url: string;
  state: "progressing" | "completed" | "cancelled" | "failed";
  received: number;
  total: number;
  startedAt: number;
}

/** OS window controls — Electron via IPC, Tauri via window API. */
export const windowControls = {
  minimize: () =>
    isElectron()
      ? window.continuaBridge!.invoke("window_control", { action: "minimize" }).catch(() => undefined)
      : isTauriNative() ? getCurrentWindow().minimize().catch(() => undefined) : Promise.resolve(undefined),
  toggleMaximize: () =>
    isElectron()
      ? window.continuaBridge!.invoke("window_control", { action: "toggleMaximize" }).catch(() => undefined)
      : isTauriNative() ? getCurrentWindow().toggleMaximize().catch(() => undefined) : Promise.resolve(undefined),
  isMaximized: (): Promise<boolean> =>
    isElectron()
      ? (window.continuaBridge!.invoke("window_control", { action: "isMaximized" }) as Promise<boolean>).catch(() => false)
      : isTauriNative() ? getCurrentWindow().isMaximized().catch(() => false) : Promise.resolve(false),
  close: () =>
    isElectron()
      ? window.continuaBridge!.invoke("window_control", { action: "close" }).catch(() => undefined)
      : isTauriNative() ? getCurrentWindow().close().catch(() => undefined) : Promise.resolve(undefined),
};