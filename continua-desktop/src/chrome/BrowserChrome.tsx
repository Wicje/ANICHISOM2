import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { api, DEFAULT_NEW_TAB_URL, windowControls } from "../lib/tauri-bridge";
import { attachCadence } from "../lib/cadence";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { TabStrip } from "./TabStrip";
import type { OpenTab } from "./TabStrip";

interface BrowserChromeProps {
  tabs: OpenTab[];
  activeLabel: string | null;
  onOpen: (url: string, focus?: boolean) => Promise<void>;
  onClose: (label: string) => Promise<void>;
  onActivate: (label: string) => Promise<void>;
  onReorder?: (from: string, to: string, after?: boolean) => void;
  onTogglePin?: (label: string) => void;
  onRestore: () => Promise<void>;
  onSave: () => Promise<void>;
  onReopen: () => Promise<void>;
  runtime: "tauri" | "browser";
}

type Suggestion =
  | { kind: "tab"; label: string; title: string; sub: string }
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

/** True when the query already looks like a URL worth visiting directly. */
const looksLikeUrl = (q: string): boolean =>
  /^https?:\/\//i.test(q) || (/\S+\.\S{2,}/.test(q) && !/\s/.test(q));

export function BrowserChrome({
  tabs,
  activeLabel,
  onOpen,
  onClose,
  onActivate,
  onReorder,
  onTogglePin,
  onRestore,
  onSave,
  onReopen,
  runtime,
}: BrowserChromeProps) {
  const [address, setAddress] = useState("");
  const [restored, setRestored] = useState(false);
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
  const addressRef = useRef<HTMLInputElement | null>(null);
  const scheduleRelayout = useRef<((force: boolean) => void) | null>(null);

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

  // Restore last session on launch.
  useEffect(() => {
    if (!restored) {
      if (tabs.length === 0) onRestore().finally(() => setRestored(true));
      else setRestored(true);
    }
  }, [restored, onRestore, tabs.length]);

  // Keep native tab webviews filling the area below the chrome. Resize storms
  // are coalesced to one relayout per frame, and no-op resizes are skipped.
  useEffect(() => {
    if (runtime !== "tauri") return;
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
  }, [runtime]);

  // Re-layout after tabs are created/restored in a batch.
  useEffect(() => {
    if (runtime !== "tauri" || !scheduleRelayout.current) return;
    scheduleRelayout.current(true);
  }, [runtime, tabs.length]);

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
    if (runtime !== "tauri" || !activeLabel) {
      setCanBack(false);
      setCanForward(false);
      return;
    }
    void api.navState(activeLabel).then((s) => {
      setCanBack(s.back);
      setCanForward(s.forward);
    });
  }, [runtime, activeLabel, tabs]);

  // Keyboard shortcuts: Ctrl+T/W/L/R, Ctrl+Shift+T, F5.
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

      if (k === "f5" || (k === "r" && mod)) {
        e.preventDefault();
        reload();
        return;
      }
      if (e.shiftKey && k === "t") {
        e.preventDefault();
        void onReopen();
        return;
      }
      switch (k) {
        case "t":
          e.preventDefault();
          void onOpen(DEFAULT_NEW_TAB_URL);
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
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeLabel, onClose, onOpen, onReopen]);

  // ── Omnibox suggestions (tabs + visit/search fallback) ─────────────
  const suggestions = useMemo<Suggestion[]>(() => {
    const q = address.trim();
    if (!q) return [];
    const ql = q.toLowerCase();
    const rows: Suggestion[] = [];

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

    if (looksLikeUrl(q)) {
      const target = /^https?:\/\//i.test(q) ? q : `https://${q}`;
      rows.push({ kind: "visit", title: `Visit ${hostOf(target)}`, sub: target });
    } else {
      rows.push({ kind: "search", title: `Search for “${q}”`, sub: "Google" });
    }
    return rows.slice(0, 7);
  }, [address, tabs]);

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
    const q = address.trim();
    const url =
      s.kind === "visit"
        ? /^https?:\/\//i.test(q)
          ? q
          : `https://${q}`
        : `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    setAddress("");
    if (activeLabel) void api.navigateTab(activeLabel, url);
    else void onOpen(url);
  };

  const navigate = async (e: FormEvent) => {
    e.preventDefault();
    let url = address.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    if (activeLabel) {
      await api.navigateTab(activeLabel, url);
    } else {
      setAddress("");
      await onOpen(url);
    }
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
      if (idx < suggestions.length && suggestions[idx].kind !== "visit") {
        const s = suggestions[idx];
        if (s.kind === "tab" || s.kind === "search") {
          e.preventDefault();
          runSuggestion(s);
          return;
        }
      } else if (idx < suggestions.length) {
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

  return (
    <div
      className={`chrome${focused ? " chrome-focused" : ""}`}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 96,
        background: "var(--chrome-bg)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "8px 10px",
        userSelect: "none",
        zIndex: 9999,
      }}
    >
      {/* Row 1: brand + actions (drag region on the empty stretch) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className="brand-mark">◈</div>
        <span className="brand-name">Continua</span>
        <span className="runtime-badge">{runtime === "tauri" ? "native" : "preview"}</span>
        <div style={{ flex: 1, alignSelf: "stretch" }} data-tauri-drag-region />
        <button className="chrome-btn" onClick={() => void onRestore()} title="Restore last session">
          ⟲
        </button>
        <button className="chrome-btn" onClick={() => void onSave()} title="Save session now">
          ●
        </button>
        <button
          className="chrome-btn"
          onClick={() => void api.setImmersive(true)}
          title="Clean mode — hide all chrome (Ctrl+Shift+F to return)"
        >
          ◱
        </button>
        <button
          className="chrome-btn"
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          style={{ fontFamily: "inherit" }}
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
        {runtime === "tauri" && (
          <div className="window-controls">
            <button
              className="wc-btn"
              title="Minimize"
              onClick={() => void windowControls.minimize()}
            >
              –
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
              {maximized ? "❐" : "□"}
            </button>
            <button
              className="wc-btn wc-close"
              title="Close"
              onClick={() => void windowControls.close()}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Row 2: nav controls + tab strip + address bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className="nav-controls">
          <button
            className="nav-btn"
            disabled={!canBack}
            title="Back (Alt+←)"
            onClick={() => activeLabel && void api.backTab(activeLabel)}
          >
            ‹
          </button>
          <button
            className="nav-btn"
            disabled={!canForward}
            title="Forward (Alt+→)"
            onClick={() => activeLabel && void api.forwardTab(activeLabel)}
          >
            ›
          </button>
          <button
            className="nav-btn"
            title="Reload (F5)"
            onClick={() => activeLabel && void api.reloadTab(activeLabel)}
          >
            ⟳
          </button>
        </div>
        <TabStrip
          tabs={tabs}
          activeLabel={activeLabel}
          onActivate={onActivate}
          onClose={onClose}
          onNew={() => void onOpen(DEFAULT_NEW_TAB_URL)}
          onReorder={onReorder}
          onTogglePin={onTogglePin}
        />
        <form onSubmit={navigate} style={{ display: "flex", flex: 1, gap: 6, position: "relative", minWidth: 0 }}>
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
                    key={`${s.kind}-${s.kind === "tab" ? s.label : s.title}`}
                    type="button"
                    className={`omni-row${i === suggestIdx ? " is-active" : ""}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      runSuggestion(s);
                    }}
                    onMouseEnter={() => setSuggestIdx(i)}
                  >
                    <span className={`omni-ico ${s.kind === "tab" ? "omni-ico-tab" : "omni-ico-go"}`}>
                      {s.kind === "tab" ? "◈" : s.kind === "visit" ? "→" : "⌕"}
                    </span>
                    <span className="omni-main">{s.title}</span>
                    <span className="omni-sub">{s.kind === "tab" ? `Switch · ${s.sub}` : s.sub}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}