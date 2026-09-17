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
import { useChromeModal } from "../lib/chrome-modal";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { TabStrip } from "./TabStrip";
import { HistoryPanel } from "./HistoryPanel";
import { DownloadsPanel } from "./DownloadsPanel";
import { FindBar } from "./FindBar";
import { SettingsPanel } from "./SettingsPanel";
import { WorkspaceMenu } from "./WorkspaceMenu";
import { BookmarksBar } from "./BookmarksBar";
import { TabRail } from "./TabRail";
import { Favicon } from "../components/Favicon";
import { ENGINES } from "./engine-list";
import type { OpenTab } from "./TabStrip";
import { quickAnswer } from "../lib/quick-answer";
import { toast } from "../lib/toast";
import {
  IconBrand,
  IconCaretDown,
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

/** Base chrome height (two rows + padding); the bookmarks row adds more. */
const CHROME_BASE = 96;

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
  // History panel (Ctrl+H) and the ring that feeds omnibox suggestions.
  const [historyOpen, setHistoryOpen] = useState(false);
  const [recent, setRecent] = useState<HistoryItem[]>([]);
  const [downloadsOpen, setDownloadsOpen] = useState(false);
  const [audio, setAudio] = useState<Record<string, { audible: boolean; muted: boolean }>>({});
  // Address-bar bookmark star.
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  // Find bar (Ctrl+F) + page tools + search engine.
  const [findOpen, setFindOpen] = useState(false);
  const [engine, setEngine] = useState<string>("google");
  const [engineMenu, setEngineMenu] = useState(false);
  // Live search-engine suggestions for the omnibox.
  const [suggestRows, setSuggestRows] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [config, setConfig] = useState<BrowserConfigItem | null>(null);
  const [workspaces, setWorkspaces] = useState<SessionSummary[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState("default");
  // Palette (Ctrl+K) asks for Settings → Sync without window.prompt (ADR-008).
  useEffect(() => {
    const open = () => setSettingsOpen(true);
    window.addEventListener("continua:open-settings", open);
    return () => window.removeEventListener("continua:open-settings", open);
  }, []);
  /** True on any native host (Tauri legacy or Electron product). Tauri-only
   * window/event APIs keep `runtime === "tauri"` guards; shared IPC uses this. */
  const isNative = runtime === "tauri" || runtime === "electron";
  // Native content views paint above HTML overlays: hide them while the
  // omnibox popover or menus are open (panels handle themselves).
  useChromeModal("suggestions", suggestOpen);
  useChromeModal("engine-menu", engineMenu);
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

  const startNav = () => {
    if (loadT.current !== null) window.clearInterval(loadT.current);
    if (loadResetT.current !== null) {
      window.clearTimeout(loadResetT.current);
      loadResetT.current = null;
    }
    const st = { label: activeLabel, pct: 6 };
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
  useEffect(() => {
    if (tabs.length === 0) return;
    let stop = false;
    const poll = () => void api.tabAudioState().then((s) => { if (!stop) setAudio(s); });
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

  // Pick up the persisted search engine + preferences + workspaces.
  useEffect(() => {
    void api.getBrowserConfig().then((c) => {
      if (!c) return;
      setEngine(c.search_engine);
      setConfig(c);
      setActiveWorkspace(c.active_workspace ?? "default");
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

  const applyPatch = (patch: ConfigPatch) => {
    void api.updateConfig(patch).then((c) => {
      if (!c) return;
      setConfig(c);
      if (patch.search_engine) setEngine(c.search_engine);
      // Live theme switch needs the local state too (it drives <html>).
      if (patch.theme) setTheme(patch.theme as "dark" | "light");
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

  // Keyboard shortcuts: Ctrl+T/W/L/R/H/F, Ctrl+Shift+T/N, Ctrl+=/-/0, F5.
  useEffect(() => {
    const reload = () => {
      if (activeLabel) void api.reloadTab(activeLabel);
    };
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
      if (k === ",") {
        e.preventDefault();
        setSettingsOpen((v) => !v);
        return;
      }

      if (k === "f5" || (k === "r" && mod)) {
        e.preventDefault();
        startNav();
        reload();
        return;
      }
      if (e.shiftKey && k === "t") {
        e.preventDefault();
        void onReopen().then(() => toast("Reopened the last closed tab", "success"));
        return;
      }
      if (e.shiftKey && k === "n") {
        e.preventDefault();
        void onOpenIncognito(START_TAB_URL);
        return;
      }
      if (e.shiftKey && k === "s") {
        e.preventDefault();
        void api.screenshotTab(activeLabel ?? undefined).then((r) => {
          toast(r?.path ? `Screenshot saved to ${r.path}` : "Screenshot failed", r?.path ? "success" : "danger");
        });
        return;
      }
      switch (k) {
        case "t":
          e.preventDefault();
          void onOpen(newTabUrl(config ?? undefined));
          break;
        case "w":
          e.preventDefault();
          if (activeLabel) void onClose(activeLabel);
          break;
        case "l":
          e.preventDefault();
          addressRef.current?.focus();
          addressRef.current?.select();
          break;
        case "h":
          e.preventDefault();
          setHistoryOpen((v) => !v);
          break;
        case "j":
          e.preventDefault();
          setDownloadsOpen((v) => !v);
          break;
        case "f":
          e.preventDefault();
          setFindOpen((v) => !v);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeLabel, onClose, onOpen, onOpenIncognito, onReopen]);

  // ── Omnibox suggestions (tabs + history + visit/search fallback) ─────
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
          sub: `Suggest · ${engineBadge(engine) || engine}`,
        });
      }
      if (rows.length < 7) {
        rows.push({ kind: "search", title: `Search for “${q}”`, sub: engineBadge(engine) || engine });
      }
    }
    return rows.slice(0, 7);
  }, [address, tabs, recent, engine, suggestRows]);

  const closeSuggestions = () => {
    setSuggestOpen(false);
    setSuggestIdx(-1);
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
      const url = searchUrlFor(engine, s.title);
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
        : searchUrlFor(engine, q);
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
        background: "var(--chrome-bg)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "10px 12px",
        userSelect: "none",
        zIndex: 9999,
      }}
    >
      {/* Row 1: brand + actions (drag region on the empty stretch) */}
      <div className="tool-row">
        <div className="brand-mark">
          <IconBrand size={15} />
        </div>
        <span className="brand-name">Continua</span>
        <span className="runtime-badge">{runtime === "browser" ? "preview" : "native"}</span>
        <div style={{ flex: 1, alignSelf: "stretch" }} data-tauri-drag-region />
        <WorkspaceMenu
          workspaces={workspaces}
          active={activeWorkspace}
          currentCount={tabs.length}
          onCreate={createWorkspace}
          onSwitch={switchWorkspace}
          onDelete={deleteWorkspace}
        />
        <button
          className="chrome-btn"
          onClick={() => void onRestore().then(() => toast("Session restored"))}
          title="Restore last session"
        >
          <IconRestore size={15} />
        </button>
        <button
          className="chrome-btn"
          onClick={() => void onSave().then(() => toast("Session saved — autosave is on too", "success"))}
          title="Save session now"
        >
          <IconSave size={15} />
        </button>
        <button
          className="chrome-btn"
          onClick={() => setHistoryOpen((v) => !v)}
          title="History (Ctrl+H)"
        >
          <IconClock size={15} />
        </button>
        <button
          className="chrome-btn"
          onClick={() => setDownloadsOpen((v) => !v)}
          title="Downloads (Ctrl+J)"
        >
          <IconDownload size={15} />
        </button>
        <button
          className={`chrome-btn${config?.vertical_tabs ? " is-active" : ""}`}
          onClick={toggleVerticalTabs}
          title="Vertical tabs (pin rail on/off)"
        >
          <IconStack size={15} />
        </button>
        <button
          className="chrome-btn"
          onClick={() => setSettingsOpen((v) => !v)}
          title="Settings (Ctrl+,)"
        >
          <IconSettings size={15} />
        </button>
        <button
          className="chrome-btn"
          onClick={() => void api.setImmersive(true)}
          title="Clean mode — hide all chrome (Ctrl+Shift+F to return)"
        >
          <IconFocus size={15} />
        </button>
        <button
          className="chrome-btn"
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          onClick={() => {
            const next = theme === "dark" ? "light" : "dark";
            applyPatch({ theme: next });
          }}
        >
          {theme === "dark" ? <IconSun size={15} /> : <IconMoon size={15} />}
        </button>
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

      {/* Row 2: nav controls + tab strip + address bar */}
      <div className="address-row">
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
          <button
            className="nav-btn nav-reader"
            title="Reader mode"
            onClick={() => {
              if (activeLabel) void api.readerToggle(activeLabel);
              toast("Reader mode toggled");
            }}
          >
            <IconReader size={16} />
          </button>
          <button
            className="nav-btn nav-dark"
            title="Flip page to dark (invert)"
            onClick={() => {
              if (activeLabel) void api.darkToggle(activeLabel);
            }}
          >
            <IconDark size={16} />
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
          onOverflowChange={handleOverflow}
          rail={railVisible}
        />
        <form className="bar-form" onSubmit={navigate}>
          <div className="omni-wrap" style={{ flex: 1, position: "relative" }}>
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
          <div className="engine-wrap" style={{ position: "relative" }}>
            <button
              type="button"
              className={`engine-btn${engineMenu ? " is-open" : ""}`}
              onClick={() => setEngineMenu((v) => !v)}
              title={`Search engine: ${engine} — click to change`}
            >
              <span className="engine-badge">{engineBadge(engine) || "G"}</span>
              <span className="engine-name">{engine}</span>
              <IconCaretDown size={12} />
            </button>
            {engineMenu && (
              <div className="engine-pop" onMouseLeave={() => setEngineMenu(false)}>
                {ENGINES.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className={`engine-opt${e === engine ? " is-active" : ""}`}
                    onClick={() => {
                      setEngineMenu(false);
                      setEngine(e);
                      void api.setSearchEngine(e);
                    }}
                  >
                    <Favicon url={searchUrlFor(e, "")} />
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
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
        </form>
      </div>

      {/* Row 3: bookmarks quick bar (with HTML import when empty). */}
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

      {/* Slim page-load progress along the chrome's bottom edge. */}
      <div
        className="load-line"
        style={{
          width: `${load?.pct ?? 0}%`,
          opacity: load ? 1 : 0,
        }}
        aria-hidden="true"
      />

      {/* Vertical tab rail: pinned on in settings, or auto on overflow. */}
      {railVisible && (
        <TabRail
          tabs={tabs}
          activeLabel={activeLabel}
          height={chromeH}
          onActivate={onActivate}
          onClose={(label) => onClose(label).then(() => toast("Tab closed"))}
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
      <SettingsPanel
        open={settingsOpen}
        config={config}
        onPatch={applyPatch}
        onClearHistory={() => {
          void api.clearHistory();
          setRecent([]);
          toast("History cleared");
        }}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}