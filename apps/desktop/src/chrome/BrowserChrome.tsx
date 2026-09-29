import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { listen } from "@tauri-apps/api/event";
import { api, displayTitle, newTabUrl, START_TAB_URL, windowControls } from "../lib/tauri-bridge";
import { engineBadge, searchUrlFor } from "../lib/tauri-bridge";
import type {
  Bookmark,
  BrowserConfigItem,
  ConfigPatch,
  HistoryItem,
  SessionSummary,
} from "../lib/tauri-bridge";
import { attachCadence } from "../lib/cadence";
import { fires } from "../lib/shortcuts";
import { subscribeModal } from "../lib/chrome-modal";
import { applyTheme, reapplyStoredTheme, resolveTheme, type Theme } from "../lib/themes";
import { useChromeModal } from "../lib/chrome-modal";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { TabStrip } from "./TabStrip";
import { HistoryPanel } from "./HistoryPanel";
import { DownloadsPanel } from "./DownloadsPanel";
import { ReadingPanel } from "./ReadingPanel";
import { QrPanel } from "./QrPanel";
import { FindBar } from "./FindBar";
import { SettingsPanel } from "./SettingsPanel";
import { WorkspaceMenu } from "./WorkspaceMenu";
import { ProfileMenu } from "./ProfileMenu";
import { BookmarksBar } from "./BookmarksBar";
import { TabRail } from "./TabRail";
import { ManagersPanel } from "./ManagersPanel";
import { parseBookmarkHtml } from "./BookmarksBar";
import { Favicon } from "../components/Favicon";
import { ENGINES } from "./engine-list";
import type { OpenTab } from "./TabStrip";
import { quickAnswer } from "../lib/quick-answer";
import { toast } from "../lib/toast";
import {
  IconBrand,
  IconDots,
  IconDownload,
  IconStack,
  IconRestore,
  IconSave,
  IconClock,
  IconSettings,
  IconFocus,
  IconSun,
  IconMoon,
  IconMinimize,
  IconMaximize,
  IconRestoreWin,
  IconClose,
  IconBack,
  IconForward,
  IconReload,
  IconReader,
  IconDark,
  IconStar,
  IconStarFilled,
  IconVault,
  IconEquals,
  IconSpark,
} from "../components/icons";

interface BrowserChromeProps {
  tabs: OpenTab[];
  activeLabel: string | null;
  onOpen: (url: string, focus?: boolean) => Promise<void>;
  onOpenIncognito: (url: string, focus?: boolean) => Promise<void>;
  onClose: (label: string) => Promise<void>;
  onActivate: (label: string) => Promise<void>;
  onReorder?: (from: string, to: string, after?: boolean) => void;
  onTogglePin?: (label: string) => void;
  onSetGroup?: (label: string, group: string | null) => void;
  onSetContainer?: (label: string, container: string | null) => void;
  onCloseOthers?: (label: string) => Promise<void>;
  onRestore: () => Promise<void>;
  onSave: () => Promise<void>;
  onReopen: () => Promise<void>;
  onSwitchWorkspace?: (session: OpenTab[]) => void;
  runtime: "tauri" | "electron" | "browser";
}

type Suggestion =
  | { kind: "tab"; label: string; title: string; sub: string }
  | { kind: "history"; url: string; title: string; sub: string }
  | { kind: "answer"; title: string; sub: string }
  | { kind: "suggest"; title: string; sub: string }
  | { kind: "visit"; title: string; sub: string }
  | { kind: "search"; title: string; sub: string };

/** Bare hostname for suggestion rows (matching the New Tab page). */
const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** Base chrome height (single row + padding); the bookmarks row adds more. */
const CHROME_BASE = 56;

/** True when the query already looks like a URL worth visiting directly. */
const looksLikeUrl = (q: string): boolean =>
  /^https?:\/\//i.test(q) || (/\S+\.\S{2,}/.test(q) && !/\s/.test(q));

export function BrowserChrome({
  tabs,
  activeLabel,
  onOpen,
  onOpenIncognito,
  onClose,
  onActivate,
  onReorder,
  onTogglePin,
  onSetGroup,
  onSetContainer,
  onCloseOthers,
  onRestore,
  onSave,
  onReopen,
  onSwitchWorkspace,
  runtime,
}: BrowserChromeProps) {
  const [address, setAddress] = useState("");
  const [maximized, setMaximized] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    localStorage.getItem("continua-theme") === "light" ? "light" : "dark",
  );
  const [canBack, setCanBack] = useState(false);
  const [canForward, setCanForward] = useState(false);
  const [focused, setFocused] = useState(true);
  // Omnibox popover state.
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestIdx, setSuggestIdx] = useState(-1);
  // Save-password prompt (host captured a form submit) + per-tab sealed
  // login counts (drives the fill key). Secrets never reach the chrome:
  // prompts carry origin+username only.
  const [loginPrompt, setLoginPrompt] = useState<{ label: string; origin: string; username: string; update?: boolean } | null>(null);
  const [addrPrompt, setAddrPrompt] = useState<{ label: string; origin: string; name?: string; email?: string } | null>(null);
  const [loginCounts, setLoginCounts] = useState<Record<string, number>>({});
  useChromeModal("login-prompt", !!(loginPrompt || addrPrompt));
  // History panel (Ctrl+H) and the ring that feeds omnibox suggestions.
  const [historyOpen, setHistoryOpen] = useState(false);
  const [recent, setRecent] = useState<HistoryItem[]>([]);
  const [downloadsOpen, setDownloadsOpen] = useState(false);
  const [audio, setAudio] = useState<Record<string, { audible: boolean; muted: boolean }>>({});
  // Studio mode: the whole chrome hides for clean screen recording (the
  // host expands content to fullscreen; a pill + global shortcut exit).
  const [studioHide, setStudioHide] = useState(false);
  const toggleStudio = () => {
    setStudioHide((v) => {
      const next = !v;
      void api.setImmersive(next);
      toast(next ? "Studio mode — chrome hidden (Ctrl+Shift+F to exit)" : "Chrome restored", next ? "success" : undefined);
      return next;
    });
  };
  useEffect(() => api.onStudio((on) => setStudioHide(on)), []);
  // Captive portal (hotel/airport ethernet): the host detects the login
  // redirect itself and we open it like Firefox does.
  useEffect(() => api.onPortal((info) => {
    if (!info?.url || !/^https?:\/\//i.test(info.url)) return;
    toast("Network login required — opening the portal", "success");
    void onOpen(info.url);
  }), [onOpen]);
  // Downloads surface even with the panel closed (it only polls while open).
  // dlActive drives the toolbar badge so a start is always visible.
  const [dlActive, setDlActive] = useState(0);
  const dlIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    void api.listDownloads().then((d) => {
      dlIds.current = new Set(
        d.filter((x) => x.state === "progressing" || x.state === "paused").map((x) => x.id),
      );
      setDlActive(dlIds.current.size);
    });
    return api.onDownload((info) => {
      if (!info?.filename && !info?.id) return;
      if (info.state === "started") {
        if (info.id) dlIds.current.add(info.id);
        setDlActive(dlIds.current.size);
        if (info.filename) toast(`Downloading ${info.filename}… — Ctrl+J to watch`);
      } else if (info.state === "completed") {
        if (info.id) dlIds.current.delete(info.id);
        setDlActive(dlIds.current.size);
        if (info.filename) toast(`Saved ${info.filename} → Downloads`, "success");
      } else if (info.state === "failed" || info.state === "cancelled") {
        if (info.id) dlIds.current.delete(info.id);
        setDlActive(dlIds.current.size);
        if (info.filename) toast(`Download ${info.state}: ${info.filename}`, "danger");
      }
    });
  }, []);
  // App-update lifecycle (Electron host): toast while downloading, restart
  // button once the update is ready to apply.
  const [updateReady, setUpdateReady] = useState("");
  useEffect(() => api.onUpdate((info) => {
    if (info?.state === "available") {
      setUpdateReady("");
      toast(`Update ${info.version || ""} downloading…`);
    } else if (info?.state === "ready") {
      setUpdateReady(info.version || "new version");
      toast("Update ready — restart to apply", "success");
    }
  }), []);
  // In-page accelerator commands from the host (Ctrl+L/F/J/K/H while the
  // page has focus — the chrome window never sees those keystrokes).
  useEffect(() => api.onChromeCommand((cmd) => {
    if (cmd === "focus-address") {
      addressRef.current?.focus();
      addressRef.current?.select();
      setSuggestOpen(true);
    }
    else if (cmd === "open-find") setFindOpen(true);
    else if (cmd === "toggle-history") setHistoryOpen((v) => !v);
    else if (cmd === "toggle-downloads") setDownloadsOpen((v) => !v);
    else if (cmd === "open-palette") window.dispatchEvent(new CustomEvent("continua:open-palette"));
    else if (cmd === "mru-next") stepMru(1);
    else if (cmd === "mru-prev") stepMru(-1);
    else if (cmd === "open-qr") setQrOpen(true);
  }), []);
  // Address-bar bookmark star.
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  // Find bar (Ctrl+F) + page tools + search engine.
  const [findOpen, setFindOpen] = useState(false);
  const [engine, setEngine] = useState<string>("google");
  const [suggestRows, setSuggestRows] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [config, setConfig] = useState<BrowserConfigItem | null>(null);
  // Managers drawer (containers, apps, cookies, snapshots, tab manager…).
  const [managersOpen, setManagersOpen] = useState(false);
  const [managersFocus, setManagersFocus] = useState<string | null>(null);
  useEffect(() => {
    const open = (e: Event) => {
      const detail = (e as CustomEvent<{ section?: string }>).detail?.section;
      if (detail) setManagersFocus(detail);
      setManagersOpen(true);
    };
    window.addEventListener("continua:open-managers", open);
    return () => window.removeEventListener("continua:open-managers", open);
  }, []);
  const [workspaces, setWorkspaces] = useState<SessionSummary[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState("default");
  // Palette (Ctrl+K) asks for Settings → Sync without window.prompt (ADR-008).
  useEffect(() => {
    const open = () => setSettingsOpen(true);
    const groupsChanged = () => {
      void api.getBrowserConfig().then((c) => { if (c) setConfig(c); });
    };
    window.addEventListener("continua:open-settings", open);
    window.addEventListener("continua:groups-changed", groupsChanged);
    return () => {
      window.removeEventListener("continua:open-settings", open);
      window.removeEventListener("continua:groups-changed", groupsChanged);
    };
  }, []);
  // Palette asks for the reading list the same way (no prop drilling).
  const [readingOpen, setReadingOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [readingCount, setReadingCount] = useState(0);
  useEffect(() => {
    const open = () => setReadingOpen(true);
    window.addEventListener("continua:open-reading", open);
    return () => window.removeEventListener("continua:open-reading", open);
  }, []);
  useEffect(() => {
    const open = () => setQrOpen(true);
    window.addEventListener("continua:open-qr", open);
    return () => window.removeEventListener("continua:open-qr", open);
  }, []);
  useEffect(() => {
    if (!readingOpen) {
      void api.listReading().then((r) => setReadingCount(r.filter((x) => !x.read).length));
    }
  }, [readingOpen, tabs]);
  /** True on any native host (Tauri legacy or Electron product). Tauri-only
   * window/event APIs keep `runtime === "tauri"` guards; shared IPC uses this. */
  const isNative = runtime === "tauri" || runtime === "electron";
  // Native content views paint above HTML overlays: hide them while the
  // omnibox popover or menus are open (panels handle themselves).
  useChromeModal("suggestions", suggestOpen);
  // Save-password flow (Electron host): submit-time captures arrive as
  // login-prompt; sealed-login availability arrives as login-available.
  useEffect(() => {
    if (!isNative) return;
    const offP = api.onLoginPrompt((info) => {
      if (!info?.label || !info?.origin) return;
      setLoginPrompt({ label: info.label, origin: info.origin, username: info.username, update: info.update });
    });
    const offA = api.onLoginAvailable((info) => {
      if (!info?.label) return;
      setLoginCounts((prev) => ({ ...prev, [info.label]: info.count || 0 }));
    });
    const offAddr = api.onAddressPrompt((info) => {
      if (!info?.label || !info?.origin) return;
      setAddrPrompt({ label: info.label, origin: info.origin, name: info.name, email: info.email });
    });
    return () => {
      offP();
      offA();
      offAddr();
    };
  }, [isNative]);
  // Drop prompts/counts for closed tabs so dead labels never linger.
  useEffect(() => {
    const alive = new Set(tabs.map((t) => t.label));
    setLoginCounts((prev) => {
      const next: Record<string, number> = {};
      for (const [k, v] of Object.entries(prev)) if (alive.has(k) && v > 0) next[k] = v;
      return next;
    });
    setLoginPrompt((p) => (p && alive.has(p.label) ? p : null));
    setAddrPrompt((p) => (p && alive.has(p.label) ? p : null));
  }, [tabs]);
  // Seed the fill key when switching to a tab whose commits predate this
  // session's events (e.g. restored tabs that haven't navigated yet).
  useEffect(() => {
    if (!isNative || !activeLabel) return;
    if (loginCounts[activeLabel] !== undefined) return;
    void api.loginCount(activeLabel).then((r) => {
      if (r && r.count > 0) setLoginCounts((prev) => ({ ...prev, [activeLabel]: r.count }));
    });
  }, [isNative, activeLabel, loginCounts]);
  // Tabs pushed by a paired device land as background tabs — toast them.
  useEffect(() => {
    if (!isNative) return;
    return api.onTabdropReceived((info) => {
      if (!info?.url) return;
      toast(`Tab received${info.from ? ` from ${info.from}` : ""} — ${info.title || info.url}`, "success");
    });
  }, [isNative]);  const [moreOpen, setMoreOpen] = useState(false);
  useChromeModal("more-menu", moreOpen);
  const [idOpen, setIdOpen] = useState(false);
  useChromeModal("identity", idOpen);
  // Modal cover: while any overlay hides the native views, show the page's
  // last frame underneath so menus float over content, never black.
  const [cover, setCover] = useState<string | null>(null);
  useEffect(() => subscribeModal((open) => {
    if (!isNative) return;
    if (open) {
      void api.snapshotTab(activeLabel ?? undefined).then((r) => {
        if (r?.dataUrl) setCover(r.dataUrl);
      });
    } else {
      window.setTimeout(() => setCover(null), 180);
    }
  }), [isNative, activeLabel]);
  const importBookmarksFile = useRef<HTMLInputElement | null>(null);
  const suggestSeq = useRef(0);
  const addressRef = useRef<HTMLInputElement | null>(null);
  const scheduleRelayout = useRef<((force: boolean) => void) | null>(null);
  const chromeRef = useRef<HTMLDivElement | null>(null);
  // Measured chrome height (drives Rust layout + rail/load-line placement).
  const [chromeH, setChromeH] = useState(CHROME_BASE);
  const [railOn, setRailOn] = useState(false);
  // Page-load progress line along the bottom edge of the chrome.
  const [load, setLoad] = useState<{ label: string | null; pct: number } | null>(null);
  const loadRef = useRef<{ label: string | null; pct: number } | null>(null);
  const loadT = useRef<number | null>(null);
  const loadResetT = useRef<number | null>(null);
  // Tabs the host reports as loading (did-start without did-stop yet).
  // The bar follows the ACTIVE tab; background tabs load silently.
  const loadingRef = useRef<Set<string>>(new Set());
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeLabel;

  const finishNav = () => {
    if (loadT.current !== null) {
      window.clearInterval(loadT.current);
      loadT.current = null;
    }
    if (!loadRef.current) return;
    setLoad({ label: loadRef.current.label, pct: 100 });
    const marker = loadRef.current;
    loadResetT.current = window.setTimeout(() => {
      if (loadRef.current === marker) {
        setLoad(null);
        loadRef.current = null;
      }
      loadResetT.current = null;
    }, 280);
  };

  const stopLoadBar = () => {
    if (loadT.current !== null) {
      window.clearInterval(loadT.current);
      loadT.current = null;
    }
    if (loadResetT.current !== null) {
      window.clearTimeout(loadResetT.current);
      loadResetT.current = null;
    }
    setLoad(null);
    loadRef.current = null;
  };

  const startNavFor = (label: string | null) => {
    if (loadT.current !== null) window.clearInterval(loadT.current);
    if (loadResetT.current !== null) {
      window.clearTimeout(loadResetT.current);
      loadResetT.current = null;
    }
    const st = { label, pct: 6 };
    setLoad(st);
    loadRef.current = st;
    loadT.current = window.setInterval(() => {
      loadRef.current = loadRef.current
        ? { ...loadRef.current, pct: Math.min(88, loadRef.current.pct + 3) }
        : loadRef.current;
      if (loadRef.current) setLoad({ ...loadRef.current });
    }, 150);
    // Hard stop: never leave a stale bar crawling.
    window.setTimeout(finishNav, 9000);
  };

  const startNav = () => startNavFor(activeLabel);

  // Dim the titlebar border when the native window loses focus.
  useEffect(() => {
    if (runtime !== "tauri") return;
    let unlisten: (() => void) | undefined;
    getCurrentWindow()
      .onFocusChanged(({ payload }) => setFocused(payload))
      .then((fn) => {
        unlisten = fn;
      });
    return () => unlisten?.();
  }, [runtime]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("continua-theme", theme);
  }, [theme]);

  // Session restore is owned by App (single caller). A second restore here
  // raced it: whichever response landed last won, and an empty late
  // response wiped the strip while native tabs stayed live (ghost tabs).

  // Keep native tab webviews filling the area below the chrome. Resize storms
  // are coalesced to one relayout per frame, and no-op resizes are skipped.
  useEffect(() => {
    if (!isNative) return;
    let rafId: number | null = null;
    let lastHeight: number = window.innerHeight;

    const schedule = (force: boolean) => {
      if (!force && window.innerHeight === lastHeight) return;
      lastHeight = window.innerHeight;
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        void api.relayout();
      });
    };
    scheduleRelayout.current = schedule;
    schedule(false);

    const onResize = () => schedule(false);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (rafId !== null) cancelAnimationFrame(rafId);
      scheduleRelayout.current = null;
    };
  }, [isNative]);

  // Re-layout after tabs are created/restored in a batch.
  useEffect(() => {
    if (!isNative || !scheduleRelayout.current) return;
    scheduleRelayout.current(true);
  }, [isNative, tabs.length]);

  // Auto-save session before the app closes.
  useEffect(() => {
    const handler = () => void onSave();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [onSave]);

  // Mirror the active tab's URL into the address bar (unless editing it).
  useEffect(() => {
    if (document.activeElement === addressRef.current) return;
    const active = tabs.find((t) => t.label === activeLabel);
    if (active) setAddress(active.url);
  }, [activeLabel, tabs]);

  // Refresh back/forward button states for the active tab.
  useEffect(() => {
    if (!isNative || !activeLabel) {
      setCanBack(false);
      setCanForward(false);
      return;
    }
    void api.navState(activeLabel).then((s) => {
      setCanBack(s.back);
      setCanForward(s.forward);
    });
  }, [isNative, activeLabel, tabs]);

  // Per-site prefs: remembered zoom + auto-mute apply when a tab lands.
  const appliedSite = useRef<string | null>(null);
  useEffect(() => {
    const active = tabs.find((t) => t.label === activeLabel);
    if (!isNative || !active || !activeLabel) return;
    let origin = "";
    try { origin = new URL(active.url).hostname.replace(/^www\./, ""); } catch { return; }
    const pref = config?.site_prefs?.[origin];
    if (!pref) { appliedSite.current = null; return; }
    const key = `${activeLabel}@${origin}`;
    if (appliedSite.current === key) return;
    appliedSite.current = key;
    if (typeof pref.zoom === "number") void api.zoomTab(activeLabel, 0, pref.zoom);
    if (pref.muted) {
      void api.setTabMuted(activeLabel, true).then(() => {
        setAudio((prev) => ({ ...prev, [activeLabel]: { audible: prev[activeLabel]?.audible ?? false, muted: true } }));
      });
    }
  }, [isNative, activeLabel, tabs, config?.site_prefs]);

  // Keep the omnibox's history suggestions fresh as the user browses.
  // Debounced: getHistory ships hundreds of rows over IPC; navigating
  // rapidly must not stall typing.
  useEffect(() => {
    const t = window.setTimeout(() => void api.getHistory().then(setRecent), 800);
    return () => window.clearTimeout(t);
  }, [activeLabel, tabs]);

  // Load bookmarks once; keep the star in sync across the session.
  useEffect(() => {
    void api.getBookmarks().then(setBookmarks);
  }, []);

  // Poll tab audio state (audible/muted badges, Electron host).
  const [sleeping, setSleeping] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (tabs.length === 0) return;
    let stop = false;
    const poll = () => {
      void api.tabAudioState().then((s) => { if (!stop) setAudio(s); });
      void api.tabStates().then((s) => {
        if (stop) return;
        setSleeping(Object.fromEntries(Object.entries(s).map(([k, v]) => [k, !!v.discarded])));
      });
    };
    poll();
    const t = window.setInterval(poll, 3000);
    return () => { stop = true; window.clearInterval(t); };
  }, [tabs.length]);

  // Keep the measured chrome height in sync with whatever state the layout is
  // in (bookmarks row appearing, responsive wrap at narrow widths, bigger
  // buttons on wide desktops…). A ResizeObserver catches every height change
  // so Rust can reflow the native tabs below the chrome strip.
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    let last = 0;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = Math.round(entry.contentRect.height);
        if (Math.abs(h - last) < 3) continue;
        last = h;
        setChromeH(h);
        // Overlays (findbar, history, start page) pin below the chrome via
        // this var instead of a hardcoded 96px, so the single row + optional
        // bookmarks bar always line up with content.
        document.documentElement.style.setProperty("--chrome-h", `${h}px`);
        if (isNative) void api.setChromeHeight(h);
      }
    });
    const el = chromeRef.current;
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [isNative]);

  // Complete the load progress line when the engine lands a navigation.
  useEffect(() => {
    if (runtime !== "tauri") return;
    let un: (() => void) | undefined;
    listen<{ label: string }>("tab:navigated", (e) => {
      if (loadRef.current && e.payload.label === loadRef.current.label) finishNav();
    }).then((f) => (un = f));
    return () => un?.();
  }, [runtime]);

  // Same, for the Electron host (loading state per tab — every load, not
  // just address-bar ones: link forks, sleeping-tab rehydrates, reloads).
  useEffect(() => {
    if (!isNative) return;
    const offStart = api.onLoadStarted((info) => {
      if (!info?.label) return;
      loadingRef.current.add(info.label);
      if (info.label === activeRef.current) startNavFor(info.label);
    });
    const offStop = api.onLoadStopped((info) => {
      if (!info?.label) return;
      loadingRef.current.delete(info.label);
      if (loadRef.current && info.label === loadRef.current.label) finishNav();
    });
    const offFin = api.onLoadFinished((info) => {
      if (loadRef.current && info?.label === loadRef.current.label) finishNav();
    });
    return () => {
      offStart();
      offStop();
      offFin();
    };
  }, [isNative]);

  // Tab switch mid-load: follow the newly active tab if IT is loading,
  // otherwise park the bar (its tab keeps loading silently behind).
  useEffect(() => {
    if (!isNative) return;
    if (loadRef.current?.label === activeLabel) return;
    if (activeLabel && loadingRef.current.has(activeLabel)) startNavFor(activeLabel);
    else stopLoadBar();
  }, [isNative, activeLabel]);

  // Pick up the persisted search engine + preferences + workspaces.
  useEffect(() => {
    reapplyStoredTheme();
    void api.getBrowserConfig().then((c) => {
      if (!c) return;
      setEngine(c.search_engine);
      setConfig(c);
      setActiveWorkspace(c.active_workspace ?? "default");
      applyTheme(resolveTheme(c.theme_id ?? "midnight", (c.custom_themes ?? []) as Theme[]));
      if (c.density) document.documentElement.dataset.density = c.density;
      if (c.vertical_tabs) void api.setTabRail(true);
    });
    void api.listWorkspaces().then((ws) => {
      setWorkspaces(ws);
    });
  }, []);

  const railVisible = railOn || !!config?.vertical_tabs;

  // Live search-engine suggestions, debounced and race-guarded.
  useEffect(() => {
    const q = address.trim();
    setSuggestRows([]);
    if (looksLikeUrl(q) || q.length < 2) return;
    const seq = ++suggestSeq.current;
    const t = setTimeout(() => {
      void api.getSearchSuggestions(engine, q).then((rows) => {
        if (seq === suggestSeq.current) setSuggestRows(rows.slice(0, 4));
      });
    }, 180);
    return () => clearTimeout(t);
  }, [address, engine]);

  const refreshWorkspaces = () => void api.listWorkspaces().then(setWorkspaces);

  const createWorkspace = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    void api.saveWorkspace(trimmed).then((ws) => {
      setWorkspaces(ws);
      setActiveWorkspace(trimmed);
      toast(`Workspace “${trimmed}” saved`, "success");
    });
  };

  const switchWorkspace = (name: string) => {
    void api.openWorkspace(name).then((session) => {
      if (session && session.length > 0) {
        onSwitchWorkspace?.(session);
        setActiveWorkspace(name);
        toast(`Switched to workspace “${name}”`);
      }
      refreshWorkspaces();
    });
  };

  const deleteWorkspace = (name: string) => {
    void api.deleteWorkspace(name).then((ws) => {
      setWorkspaces(ws);
      if (activeWorkspace === name) setActiveWorkspace("default");
      toast(`Workspace deleted`);
    });
  };

  // Cycle to the next profile (Ctrl+Shift+M): the host swaps partitions and
  // returns that profile's tabs, which replace the strip wholesale.
  const cycleProfile = async () => {
    const s = await api.listProfiles();
    if (!s.profiles.length) return;
    const idx = s.profiles.findIndex((p) => p.id === s.activeId);
    const next = s.profiles[(idx + 1) % s.profiles.length];
    const r = await api.switchProfile(next.id);
    if (r.error) {
      toast(`Profile switch failed: ${r.error}`, "danger");
      return;
    }
    if ("tabs" in r && r.tabs) onSwitchWorkspace?.(r.tabs);
    const themeId = r.profiles.find((p) => p.id === r.activeId)?.themeId ?? "midnight";
    const cfg = await api.getBrowserConfig();
    applyTheme(resolveTheme(themeId, (cfg?.custom_themes ?? []) as Theme[]));
    toast(`Switched to ${r.profiles.find((p) => p.id === r.activeId)?.name ?? r.activeId}`);
  };

  // Toolbar editor: hidden button ids live in config.toolbar_hidden.
  const showTool = (id: string) => !(config?.toolbar_hidden ?? []).includes(id);

  // Bookmark import moved here when the bookmarks bar auto-hides (empty).
  const doImportBookmarks = async (file: File | undefined | null) => {
    if (!file) return;
    try {
      const items = parseBookmarkHtml(await file.text());
      for (const it of items.slice(0, 500)) await api.addBookmark(it.url, it.title);
      const next = await api.getBookmarks();
      if (Array.isArray(next)) setBookmarks(next);
      toast(`Imported ${items.length} bookmarks`, "success");
    } catch {
      toast("Could not read that bookmarks file", "danger");
    }
  };

  // Sleep every background tab at once (the focused one keeps playing).
  const sleepAllBackground = async () => {
    let n = 0;
    for (const t of tabs) {
      if (t.label === activeLabel || t.incognito) continue;
      const r = await api.sleepTab(t.label);
      if (r?.ok) n++;
    }
    if (n) {
      setSleeping((prev) => {
        const next = { ...prev };
        for (const t of tabs) if (t.label !== activeLabel) next[t.label] = true;
        return next;
      });
      toast(`Slept ${n} background tab${n === 1 ? "" : "s"}`, "success");
    } else {
      toast("Nothing to sleep");
    }
  };

  const applyPatch = (patch: ConfigPatch) => {
    void api.updateConfig(patch).then((c) => {
      if (!c) return;
      setConfig(c);
      if (patch.search_engine) setEngine(c.search_engine);
      // Live theme switch needs the local state too (it drives <html>).
      if (patch.theme) setTheme(patch.theme as "dark" | "light");
      if (patch.theme_id) applyTheme(resolveTheme(c.theme_id ?? "midnight", (c.custom_themes ?? []) as Theme[]));
      if (patch.density) document.documentElement.dataset.density = patch.density;
      // Link previews need to gate on live pages immediately.
      if (patch.link_preview !== undefined) void api.setLinkPreview(Boolean(patch.link_preview));
      // Vertical rail pinning reflows native views immediately.
      if (patch.vertical_tabs !== undefined && isNative) void api.setTabRail(Boolean(patch.vertical_tabs) || railOn);
    });
  };

  const toggleVerticalTabs = () => {
    const next = !config?.vertical_tabs;
    applyPatch({ vertical_tabs: next });
    if (isNative) void api.setTabRail(next || railOn);
  };

  // MRU tab order (most-recently-active first) for Ctrl+Tab cycling.
  const mruRef = useRef<string[]>([]);
  useEffect(() => {
    if (!activeLabel) return;
    mruRef.current = [activeLabel, ...mruRef.current.filter((l) => l !== activeLabel)].slice(0, 30);
  }, [activeLabel]);
  const stepMru = (dir: 1 | -1) => {
    const order = mruRef.current.filter((l) => tabs.some((t) => t.label === l));
    if (order.length < 2) return;
    const cur = activeLabel ? order.indexOf(activeLabel) : -1;
    const next = order[(cur + dir + order.length) % order.length];
    if (next) void onActivate(next);
  };

  // Keyboard shortcuts: remappable via Settings (shortcuts map), defaults
  // match the classic set (Ctrl+T/W/L/R/H/F, Ctrl+Shift+T/N, F5, …).
  useEffect(() => {
    const reload = () => {
      if (activeLabel) void api.reloadTab(activeLabel);
    };
    const map = config?.shortcuts ?? {};
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      if (e.altKey && !mod && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        if (activeLabel) {
          void (e.key === "ArrowLeft"
            ? api.backTab(activeLabel)
            : api.forwardTab(activeLabel));
        }
        return;
      }
      if (!mod && k !== "f5") return;

      // Zoom: Ctrl+= / Ctrl+Shift+=, Ctrl+-, Ctrl+0 (only in the chrome).
      if (mod && activeLabel && (k === "=" || k === "+" || k === "-" || k === "0")) {
        e.preventDefault();
        const step = k === "0" ? 0 : k === "-" ? -0.2 : 0.2;
        void api.zoomTab(activeLabel, step);
        return;
      }
      const fire = (id: string) => fires(id, e, map);
      if (fire("settings")) {
        e.preventDefault();
        setSettingsOpen((v) => !v);
        return;
      }

      if (k === "f5" || (k === "r" && mod)) {
        e.preventDefault();
        startNav();
        if (e.shiftKey && activeLabel) void api.reloadTab(activeLabel, true);
        else reload();
        return;
      }
      if (fire("reopen-tab")) {
        e.preventDefault();
        void onReopen().then(() => toast("Reopened the last closed tab", "success"));
        return;
      }
      if (fire("incognito")) {
        e.preventDefault();
        void onOpenIncognito(START_TAB_URL);
        return;
      }
      if (fire("screenshot")) {
        e.preventDefault();
        void api.screenshotTab(activeLabel ?? undefined).then((r) => {
          toast(r?.path ? `Screenshot saved to ${r.path}` : "Screenshot failed", r?.path ? "success" : "danger");
        });
        return;
      }
      if (fire("studio")) {
        // Studio mode: hide the entire chrome for clean screen recording.
        e.preventDefault();
        toggleStudio();
        return;
      }
      if (fire("cycle-profile")) {
        e.preventDefault();
        void cycleProfile();
        return;
      }
      if (fire("mru-next")) {
        e.preventDefault();
        stepMru(1);
        return;
      }
      if (fire("mru-prev")) {
        e.preventDefault();
        stepMru(-1);
        return;
      }
      if (e.shiftKey && k === "i") {
        e.preventDefault();
        void api.toggleDevTools();
        return;
      }
      if (fire("new-tab")) {
        e.preventDefault();
        void onOpen(newTabUrl(config ?? undefined));
        return;
      }
      if (fire("close-tab")) {
        e.preventDefault();
        if (activeLabel) void onClose(activeLabel);
        return;
      }
      if (fire("address")) {
        e.preventDefault();
        addressRef.current?.focus();
        addressRef.current?.select();
        return;
      }
      if (fire("history")) {
        e.preventDefault();
        setHistoryOpen((v) => !v);
        return;
      }
      if (fire("downloads")) {
        e.preventDefault();
        setDownloadsOpen((v) => !v);
        return;
      }
      if (fire("find")) {
        e.preventDefault();
        setFindOpen((v) => !v);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeLabel, tabs, onClose, onOpen, onOpenIncognito, onReopen, config?.shortcuts]);

  // ── Omnibox suggestions (tabs + history + visit/search fallback) ─────
  const customs = config?.custom_engines ?? [];
  const suggestions = useMemo<Suggestion[]>(() => {
    const q = address.trim();
    if (!q) return [];
    const ql = q.toLowerCase();
    const rows: Suggestion[] = [];
    const openUrls = new Set(tabs.map((t) => t.url));

    for (const t of tabs) {
      const host = hostOf(t.url);
      const title = t.title || host;
      if (
        title.toLowerCase().includes(ql) ||
        host.includes(ql) ||
        t.url.toLowerCase().includes(ql)
      ) {
        rows.push({ kind: "tab", label: t.label, title, sub: host });
      }
      if (rows.length >= 5) break;
    }

    // Past visits that match but aren't currently open (scan capped: the
    // full ring is for the History panel, not per-keystroke filtering).
    for (const h of recent.slice(0, 120)) {
      if (openUrls.has(h.url)) continue;
      const host = hostOf(h.url);
      const title = h.title || host;
      if (
        title.toLowerCase().includes(ql) ||
        host.includes(ql) ||
        h.url.toLowerCase().includes(ql)
      ) {
        rows.push({ kind: "history", url: h.url, title, sub: host });
      }
      if (rows.length >= 5) break;
    }

    if (looksLikeUrl(q)) {
      const target = /^https?:\/\//i.test(q) ? q : `https://${q}`;
      rows.push({ kind: "visit", title: `Visit ${hostOf(target)}`, sub: target });
    } else {
      const ans = quickAnswer(q);
      if (ans) rows.push({ kind: "answer", title: ans.text, sub: ans.sub });
      for (const s of suggestRows) {
        if (rows.length >= 7) break;
        rows.push({
          kind: "suggest",
          title: s,
          sub: `Suggest · ${engineBadge(engine, customs) || engine}`,
        });
      }
      if (rows.length < 7) {
        rows.push({ kind: "search", title: `Search for “${q}”`, sub: engineBadge(engine, customs) || engine });
      }
    }
    return rows.slice(0, 7);
  }, [address, tabs, recent, engine, suggestRows]);

  const closeSuggestions = () => {
    setSuggestOpen(false);
    setSuggestIdx(-1);
  };

  // Answer the save-password prompt. The secret never left the host; the
  // decision just seals it into (or keeps it out of) the OS keyring.
  const answerLogin = (decision: "save" | "dismiss" | "never") => {
    const p = loginPrompt;
    setLoginPrompt(null);
    if (!p) return;
    if (decision !== "save") {
      void api.saveLoginDecision(p.label, decision);
      if (decision === "never") toast(`Won't ask for passwords on ${hostOf(p.origin)}`);
      return;
    }
    void api.saveLoginDecision(p.label, "save").then((r: { saved?: boolean; error?: string }) => {
      if (r?.saved) {
        setLoginCounts((prev) => ({ ...prev, [p.label]: (prev[p.label] || 0) + 1 }));
        toast(`Password ${p.update ? "updated" : "saved"} for ${hostOf(p.origin)}`, "success");
      } else {
        toast(`Couldn't save: ${r?.error || "unknown"}`, "danger");
      }
    });
  };

  // One-click fill for the active tab (same sealed store the palette uses).
  const fillActiveLogin = () => {
    if (!activeLabel) return;
    void api.fillLogin(undefined, activeLabel).then((r: { ok?: boolean; error?: string; detail?: string }) => {
      if (r?.ok) toast("Login filled — review and submit", "success");
      else if (r?.error === "no-login") toast("No saved login for this site");
      else toast(`Fill failed: ${r?.error || r?.detail || "unknown"}`, "danger");
    });
  };

  // Answer the address save-prompt (same keyring envelope as passwords).
  const answerAddress = (decision: "save" | "dismiss" | "never") => {
    const p = addrPrompt;
    setAddrPrompt(null);
    if (!p) return;
    if (decision !== "save") {
      void api.saveAddressDecision(p.label, decision);
      if (decision === "never") toast(`Won't ask for address details on ${hostOf(p.origin)}`);
      return;
    }
    void api.saveAddressDecision(p.label, "save").then((r: { saved?: boolean; error?: string }) => {
      if (r?.saved) toast(`Address saved for ${hostOf(p.origin)}`, "success");
      else toast(`Couldn't save: ${r?.error || "unknown"}`, "danger");
    });
  };

  const runSuggestion = (s: Suggestion) => {
    closeSuggestions();
    if (s.kind === "tab") {
      void onActivate(s.label);
      return;
    }
    if (s.kind === "history") {
      setAddress("");
      startNav();
      if (activeLabel) void api.navigateTab(activeLabel, s.url);
      else void onOpen(s.url);
      return;
    }
    if (s.kind === "answer") {
      // Quick answers copy to the clipboard; no navigation.
      void navigator.clipboard?.writeText(s.title).catch(() => undefined);
      toast("Answer copied to clipboard", "success");
      return;
    }
    if (s.kind === "suggest") {
      setAddress("");
      startNav();
      const url = searchUrlFor(engine, s.title, customs);
      if (activeLabel) void api.navigateTab(activeLabel, url);
      else void onOpen(url);
      return;
    }
    const q = address.trim();
    const url =
      s.kind === "visit"
        ? /^https?:\/\//i.test(q)
          ? q
          : `https://${q}`
        : searchUrlFor(engine, q, customs);
    setAddress("");
    startNav();
    if (activeLabel) void api.navigateTab(activeLabel, url);
    else void onOpen(url);
  };

  const navigate = async (e: FormEvent) => {
    e.preventDefault();
    let url = address.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    startNav();
    if (activeLabel) {
      await api.navigateTab(activeLabel, url);
    } else {
      setAddress("");
      await onOpen(url);
    }
  };

  // ── Bookmark star ───────────────────────────────────────
  const activeUrl = tabs.find((t) => t.label === activeLabel)?.url ?? "";
  const isStarred = Boolean(
    activeUrl && bookmarks.some((b) => b.url === activeUrl),
  );

  const toggleBookmark = async () => {
    const active = tabs.find((t) => t.label === activeLabel);
    if (!active || !active.url) return;
    const next = isStarred
      ? await api.removeBookmark(active.url)
      : await api.addBookmark(active.url, active.title || displayTitle(active.url));
    if (Array.isArray(next)) setBookmarks(next);
    toast(isStarred ? "Bookmark removed" : "Bookmarked this page", "success");
  };

  const onAddressKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    const opts = suggestOpen && suggestions.length > 0;
    if (opts && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setSuggestIdx((i) =>
        e.key === "ArrowDown"
          ? (i + 1) % suggestions.length
          : (i - 1 + suggestions.length) % suggestions.length,
      );
      return;
    }
    if (opts && e.key === "Enter" && e.target === e.currentTarget) {
      const idx = suggestIdx >= 0 ? suggestIdx : 0;
      if (idx < suggestions.length) {
        e.preventDefault();
        runSuggestion(suggestions[idx]);
        return;
      }
    }
    if (e.key === "Escape") {
      if (opts) {
        e.preventDefault();
        closeSuggestions();
      } else {
        (e.target as HTMLElement).blur();
      }
      return;
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      // Ctrl+Enter → open in a new tab from the address bar.
      e.preventDefault();
      let url = address.trim();
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      setAddress("");
      void onOpen(url);
    }
  };

  // Stable TabStrip callbacks: TabStrip is memo'd, so fresh inline arrows
  // would re-render every tab on each omnibox keystroke. These keep identity
  // across keystroke renders (only tabs/prop changes invalidate).
  const handleDuplicate = useCallback((label: string) => {
    const t = tabs.find((x) => x.label === label);
    if (t) void onOpen(t.url);
  }, [tabs, onOpen]);
  const handleOpenAppWindow = useCallback((label: string) => {
    const t = tabs.find((x) => x.label === label);
    if (t) void api.openAppWindow(t.url).then(() => toast(`Opened “${t.title || t.url}” in a new window`));
  }, [tabs]);
  const handleTogglePinToast = useCallback((label: string) => {
    onTogglePin?.(label);
    const tab = tabs.find((t) => t.label === label);
    toast(tab?.pinned ? "Tab unpinned" : "Tab pinned");
  }, [tabs, onTogglePin]);
  const handleToggleMute = useCallback((label: string, muted: boolean) => {
    void api.setTabMuted(label, muted).then(() => {
      setAudio((prev) => ({ ...prev, [label]: { audible: prev[label]?.audible ?? false, muted } }));
      toast(muted ? "Tab muted" : "Tab unmuted");
    });
  }, []);
  const handleSleepTab = useCallback((label: string) => {
    void api.sleepTab(label).then((r) => {
      if (r?.ok) {
        setSleeping((prev) => ({ ...prev, [label]: true }));
        toast("Tab sleeping — click to wake", "success");
      } else {
        toast("Couldn't sleep that tab", "danger");
      }
    });
  }, []);
  const handleOverflow = useCallback((over: boolean) => {
    setRailOn(over);
    if (isNative) void api.setTabRail(over || !!config?.vertical_tabs);
  }, [isNative, config?.vertical_tabs]);

  return (
    <div
      ref={chromeRef}
      className={`chrome${focused ? " chrome-focused" : ""}`}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "auto",
        display: studioHide ? "none" : "flex",
        background: "var(--chrome-bg)",
        flexDirection: "column",
        gap: 4,
        padding: "6px 12px",
        userSelect: "none",
        zIndex: 9999,
      }}
    >
      {/* Single row: brand · nav · tabs · address · identity · more · window.
          One row buys ~60px of viewport back vs the old two-row chrome. */}
      <div className="chrome-row">
        <div className="brand-mark" title="Continua">
          <IconBrand size={15} />
        </div>
        <div className="nav-controls">
          <button
            className="nav-btn"
            disabled={!canBack}
            title="Back (Alt+←)"
            onClick={() => {
              startNav();
              if (activeLabel) void api.backTab(activeLabel);
            }}
          >
            <IconBack size={16} />
          </button>
          <button
            className="nav-btn"
            disabled={!canForward}
            title="Forward (Alt+→)"
            onClick={() => {
              startNav();
              if (activeLabel) void api.forwardTab(activeLabel);
            }}
          >
            <IconForward size={16} />
          </button>
          <button
            className="nav-btn"
            title="Reload (F5)"
            onClick={() => {
              startNav();
              if (activeLabel) void api.reloadTab(activeLabel);
            }}
          >
            <IconReload size={16} />
          </button>
        </div>
        <TabStrip
          tabs={tabs}
          activeLabel={activeLabel}
          onActivate={onActivate}
          onClose={onClose}
          onNew={() => void onOpen(newTabUrl(config ?? undefined))}
          onNewIncognito={() => void onOpenIncognito(START_TAB_URL)}
          onDuplicate={handleDuplicate}
          onOpenAppWindow={handleOpenAppWindow}
          onCloseOthers={onCloseOthers}
          onReorder={onReorder}
          onTogglePin={handleTogglePinToast}
          audio={audio}
          onToggleMute={handleToggleMute}
          groups={config?.tab_groups ?? []}
          containers={config?.containers ?? []}
          onSetGroup={onSetGroup}
          sleeping={sleeping}
          onSleepTab={handleSleepTab}
          collapsedGroups={config?.collapsed_groups ?? []}
          onToggleCollapse={(gid) => {
            const cur = config?.collapsed_groups ?? [];
            applyPatch({ collapsed_groups: cur.includes(gid) ? cur.filter((x) => x !== gid) : [...cur, gid] });
          }}
          onGroupsChanged={() => void api.getBrowserConfig().then((c) => { if (c) setConfig(c); })}
          onOverflowChange={handleOverflow}
          rail={railVisible}
        />
        {(loginCounts[activeLabel ?? ""] || 0) > 0 && (
          <button
            type="button"
            className="chrome-btn"
            title="Fill saved login for this site"
            onClick={fillActiveLogin}
          >
            <IconVault size={15} />
          </button>
        )}
        <form className="bar-form" onSubmit={navigate}>
          <div className="omni-wrap" style={{ flex: 1, position: "relative" }}>
            {loginPrompt && (
              <div className="omni-pop" role="dialog" aria-label="Save password">                <div className="omni-row is-active" style={{ cursor: "default" }}>
                  <span className="omni-ico omni-ico-tab">
                    <IconVault size={13} />
                  </span>
                  <span className="omni-main">{loginPrompt.update ? `Update password for ${hostOf(loginPrompt.origin)}?` : `Save password for ${hostOf(loginPrompt.origin)}?`}</span>
                  <span className="omni-sub">{loginPrompt.username}</span>
                </div>
                <div className="omni-row" style={{ gap: 8 }}>
                  <button
                    type="button"
                    className="engine-opt"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      answerLogin("save");
                    }}
                  >
                    {loginPrompt.update ? "Update" : "Save"}
                  </button>
                  <button
                    type="button"
                    className="engine-opt"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      answerLogin("dismiss");
                    }}
                  >
                    Not now
                  </button>
                  <button
                    type="button"
                    className="engine-opt"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      answerLogin("never");
                    }}
                  >
                    Never for this site
                  </button>
                </div>
              </div>
            )}
            {addrPrompt && (
              <div className="omni-pop" role="dialog" aria-label="Save address">
                <div className="omni-row is-active" style={{ cursor: "default" }}>
                  <span className="omni-ico omni-ico-tab">
                    <IconVault size={13} />
                  </span>
                  <span className="omni-main">{`Save address details for ${hostOf(addrPrompt.origin)}?`}</span>
                  <span className="omni-sub">{[addrPrompt.name, addrPrompt.email].filter(Boolean).join(" · ") || "contact form"}</span>
                </div>
                <div className="omni-row" style={{ gap: 8 }}>
                  <button
                    type="button"
                    className="engine-opt"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      answerAddress("save");
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="engine-opt"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      answerAddress("dismiss");
                    }}
                  >
                    Not now
                  </button>
                  <button
                    type="button"
                    className="engine-opt"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      answerAddress("never");
                    }}
                  >
                    Never for this site
                  </button>
                </div>
              </div>
            )}
            <input
              className="address-bar"
              ref={(el) => {
                addressRef.current = el;
                attachCadence(el);
              }}
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setSuggestOpen(true);
                setSuggestIdx(-1);
              }}
              onFocus={() => setSuggestOpen(true)}
              onBlur={() => closeSuggestions()}
              onKeyDown={onAddressKey}
              placeholder="Search or enter address…"
              spellCheck={false}
              autoComplete="off"
            />
            {suggestOpen && suggestions.length > 0 && (
              <div className="omni-pop">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.kind}-${s.kind === "tab" ? s.label : s.kind === "history" ? s.url : s.title}`}
                    type="button"
                    className={`omni-row${i === suggestIdx ? " is-active" : ""}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      runSuggestion(s);
                    }}
                    onMouseEnter={() => setSuggestIdx(i)}
                  >
                    <span className={`omni-ico ${s.kind === "tab" ? "omni-ico-tab" : s.kind === "history" ? "omni-ico-history" : "omni-ico-go"}`}>
                      {s.kind === "tab" ? (
                        <IconBrand size={13} />
                      ) : s.kind === "history" ? (
                        <IconClock size={13} />
                      ) : s.kind === "visit" ? (
                        <IconForward size={13} />
                      ) : s.kind === "answer" ? (
                        <IconEquals size={13} />
                      ) : (
                        <IconSpark size={13} />
                      )}
                    </span>
                    <span className="omni-main">{s.title}</span>
                    <span className="omni-sub">{s.kind === "tab" ? `Switch · ${s.sub}` : s.kind === "history" ? `History · ${s.sub}` : s.sub}</span>
                  </button>
              ))}
              </div>
            )}
          </div>
        </form>
          <div className="identity-stack"
            onMouseEnter={() => { if (window.matchMedia("(max-width: 800px)").matches) setIdOpen(true); }}
            onMouseLeave={() => setIdOpen(false)}
          >
            <button
              className={`chrome-btn id-anchor${idOpen ? " is-active" : ""}`}
              title="Search engine, bookmarks, profiles & workspaces"
              onClick={() => { if (window.matchMedia("(max-width: 800px)").matches) setIdOpen((v) => !v); }}
            >
              <IconStack size={15} />
            </button>
            <div className={`id-extra${idOpen ? " is-open" : ""}`}>
          <button
            type="button"
            className={`star-btn${isStarred ? " is-starred" : ""}`}
            onClick={() => void toggleBookmark()}
            disabled={!activeUrl}
            title={
              isStarred
                ? "Remove bookmark"
                : "Bookmark this page (add to your saved list)"
            }
          >
            <span className="star-icon">
              {isStarred ? <IconStarFilled size={14} /> : <IconStar size={14} />}
            </span>
          </button>
          <ProfileMenu
            onSwitchTabs={(session, themeId) => {
              onSwitchWorkspace?.(session);
              void api.getBrowserConfig().then((c) => {
                applyTheme(resolveTheme(themeId ?? "midnight", (c?.custom_themes ?? []) as Theme[]));
              });
            }}
          />
          <WorkspaceMenu
            workspaces={workspaces}
            active={activeWorkspace}
            currentCount={tabs.length}
            onCreate={createWorkspace}
            onSwitch={switchWorkspace}
            onDelete={deleteWorkspace}
          />
            </div>
          </div>
        <button
          className="chrome-btn"
          title="Managers — containers, apps, cookies, snapshots, tab manager, bookmarks, history"
          onClick={() => setManagersOpen((v) => !v)}
        >
          <IconStack size={15} />
        </button>
        <div style={{ flex: "0 1 16px", minWidth: 4, alignSelf: "stretch" }} data-tauri-drag-region />
        <button
          className={`chrome-btn dl-btn${dlActive > 0 ? " is-active" : ""}`}
          title={dlActive > 0 ? `${dlActive} active download${dlActive === 1 ? "" : "s"} — open Downloads (Ctrl+J)` : "Downloads (Ctrl+J)"}
          onClick={() => setDownloadsOpen((v) => !v)}
        >
          <IconDownload size={15} />
          {dlActive > 0 && <span className="dl-badge">{dlActive > 9 ? "9+" : dlActive}</span>}
        </button>
        {updateReady && (
          <button
            className="chrome-btn dl-btn is-active"
            title={`Restart to apply update ${updateReady}`}
            onClick={() => void api.quitAndInstall()}
          >
            <IconReload size={15} />
            <span className="dl-badge">!</span>
          </button>
        )}
        <div className="more-wrap" style={{ position: "relative" }}>
          <button
            className={`chrome-btn${moreOpen ? " is-active" : ""}`}
            onClick={() => setMoreOpen((v) => !v)}
            title="More actions"
          >
            <IconDots size={15} />
          </button>
          {moreOpen && (
            <div className="engine-pop more-pop" onMouseLeave={() => setMoreOpen(false)}>
              {showTool("restore") && (
                <button type="button" className="engine-opt" onClick={() => { setMoreOpen(false); void onRestore().then(() => toast("Session restored")); }}>
                  <IconRestore size={13} /> Restore session
                </button>
              )}
              {showTool("save") && (
                <button type="button" className="engine-opt" onClick={() => { setMoreOpen(false); void onSave().then(() => toast("Session saved", "success")); }}>
                  <IconSave size={13} /> Save session now
                </button>
              )}
              {showTool("history") && (
                <button type="button" className="engine-opt" onClick={() => { setMoreOpen(false); setHistoryOpen((v) => !v); }}>
                  <IconClock size={13} /> History
                </button>
              )}
              <button type="button" className="engine-opt" onClick={() => { setMoreOpen(false); setManagersOpen(true); }}>
                <IconStack size={13} /> Managers
              </button>
              {showTool("downloads") && (
                <button type="button" className="engine-opt" onClick={() => { setMoreOpen(false); setDownloadsOpen((v) => !v); }}>
                  <IconDownload size={13} /> Downloads
                </button>
              )}
              <button type="button" className="engine-opt" onClick={() => { setMoreOpen(false); setReadingOpen(true); }}>
                <IconReader size={13} /> Reading list{readingCount > 0 ? ` (${readingCount})` : ""}
              </button>
              <button type="button" className="engine-opt" onClick={() => { setMoreOpen(false); setQrOpen(true); }}>
                <IconStack size={13} /> Show QR for this page
              </button>
              {showTool("rail") && (
                <button type="button" className="engine-opt" onClick={() => { setMoreOpen(false); toggleVerticalTabs(); }}>
                  <IconStack size={13} /> {config?.vertical_tabs ? "Hide tab rail" : "Show tab rail"}
                </button>
              )}
              {showTool("reader") && (
                <button type="button" className="engine-opt" onClick={() => { setMoreOpen(false); if (activeLabel) void api.readerToggle(activeLabel); }}>
                  <IconReader size={13} /> Reader mode
                </button>
              )}
              {showTool("dark") && (
                <button type="button" className="engine-opt" onClick={() => { setMoreOpen(false); if (activeLabel) void api.darkToggle(activeLabel); }}>
                  <IconDark size={13} /> Flip page to dark
                </button>
              )}
              <button type="button" className="engine-opt" onClick={() => { setMoreOpen(false); void sleepAllBackground(); }}>
                <span>💤</span> Sleep background tabs
              </button>
              <button type="button" className="engine-opt" onClick={() => { setMoreOpen(false); importBookmarksFile.current?.click(); }}>
                <IconStar size={13} /> Import bookmarks…
              </button>
              {showTool("settings") && (
                <button type="button" className="engine-opt" onClick={() => { setMoreOpen(false); setSettingsOpen((v) => !v); }}>
                  <IconSettings size={13} /> Settings
                </button>
              )}
              <div className="ctx-sep" />
              <div className="ctx-label">Search engine · {customs.find((e) => e.id === engine)?.name ?? engine}</div>
              {ENGINES.map((e) => (
                <button
                  key={e}
                  type="button"
                  className={`engine-opt${e === engine ? " is-active" : ""}`}
                  onClick={() => {
                    setMoreOpen(false);
                    setEngine(e);
                    void api.setSearchEngine(e);
                  }}
                >
                  <Favicon url={searchUrlFor(e, "", customs)} />
                  {e}{e === engine ? " ✓" : ""}
                </button>
              ))}
              {customs.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className={`engine-opt${e.id === engine ? " is-active" : ""}`}
                  onClick={() => {
                    setMoreOpen(false);
                    setEngine(e.id);
                    void api.setSearchEngine(e.id);
                  }}
                >
                  <Favicon url={searchUrlFor(e.id, "", customs)} />
                  {e.name}{e.id === engine ? " ✓" : ""}
                </button>
              ))}
              {showTool("studio") && (
                <button type="button" className="engine-opt" onClick={() => { setMoreOpen(false); toggleStudio(); }}>
                  <IconFocus size={13} /> Studio mode
                </button>
              )}
              {showTool("theme") && (
                <button type="button" className="engine-opt" onClick={() => { setMoreOpen(false); applyPatch({ theme: theme === "dark" ? "light" : "dark" }); }}>
                  {theme === "dark" ? <IconSun size={13} /> : <IconMoon size={13} />} {theme === "dark" ? "Light mode" : "Dark mode"}
                </button>
              )}
            </div>
          )}
        </div>
        <input ref={importBookmarksFile} type="file" accept=".html,text/html" hidden onChange={(e) => void doImportBookmarks(e.target.files?.[0])} />
        {isNative && (
          <div className="window-controls">
            <button
              className="wc-btn"
              title="Minimize"
              onClick={() => void windowControls.minimize()}
            >
              <IconMinimize size={12} />
            </button>
            <button
              className="wc-btn"
              title={maximized ? "Restore" : "Maximize"}
              onClick={() => {
                void (async () => {
                  await windowControls.toggleMaximize();
                  setMaximized(await windowControls.isMaximized());
                })();
              }}
            >
              {maximized ? <IconRestoreWin size={12} /> : <IconMaximize size={12} />}
            </button>
            <button
              className="wc-btn wc-close"
              title="Close"
              onClick={() => void windowControls.close()}
            >
              <IconClose size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Bookmarks bar appears only when there are bookmarks (import lives in ⋯). */}
      {bookmarks.length > 0 && (
      <BookmarksBar
        bookmarks={bookmarks}
        activeUrl={activeUrl}
        onOpen={(url) => {
          if (activeLabel) {
            startNav();
            void api.navigateTab(activeLabel, url);
          } else void onOpen(url);
        }}
        onChanged={setBookmarks}
      />
      )}

      {/* Slim page-load progress along the chrome's bottom edge. */}
      <div
        className="load-line"
        style={{
          width: `${load?.pct ?? 0}%`,
          opacity: load ? 1 : 0,
        }}
        aria-hidden="true"
      />

      {/* Modal cover: last page frame while overlays hide native views. */}
      {cover && (
        <img className="modal-cover" src={cover} alt="" aria-hidden="true" />
      )}

      {/* Vertical tab rail: pinned on in settings, or auto on overflow. */}
      {railVisible && (
        <TabRail
          tabs={tabs}
          activeLabel={activeLabel}
          height={chromeH}
          onActivate={onActivate}
          onClose={(label) => onClose(label).then(() => toast("Tab closed"))}
          onNew={() => void onOpen(newTabUrl(config ?? undefined))}
        />
      )}
      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onNavigate={(url) => {
          if (activeLabel) void api.navigateTab(activeLabel, url);
          else void onOpen(url);
        }}
      />
      <FindBar
        open={findOpen}
        activeLabel={activeLabel}
        onClose={() => setFindOpen(false)}
      />
      <DownloadsPanel open={downloadsOpen} onClose={() => setDownloadsOpen(false)} />
      <QrPanel open={qrOpen} url={activeUrl} onClose={() => setQrOpen(false)} />
      <ReadingPanel
        open={readingOpen}
        onClose={() => setReadingOpen(false)}
        onOpen={(url) => {
          startNav();
          if (activeLabel) void api.navigateTab(activeLabel, url);
          else void onOpen(url);
        }}
      />
      <SettingsPanel
        open={settingsOpen}
        config={config}
        onPatch={applyPatch}
        activeOrigin={hostOf(activeUrl) || undefined}
        onClearHistory={() => {
          void api.clearHistory();
          setRecent([]);
          toast("History cleared");
        }}
        onClose={() => setSettingsOpen(false)}
      />
      <ManagersPanel
        open={managersOpen}
        onClose={() => setManagersOpen(false)}
        tabs={tabs}
        activeLabel={activeLabel}
        onOpen={(url) => void onOpen(url)}
        onActivate={(label) => void onActivate(label)}
        onSetContainer={(label, container) => onSetContainer?.(label, container)}
        focusSection={managersFocus}
      />
    </div>
  );
}