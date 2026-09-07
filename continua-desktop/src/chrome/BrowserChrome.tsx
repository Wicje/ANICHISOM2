import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { api, windowControls } from "../lib/tauri-bridge";
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
  onRestore: () => Promise<void>;
  onSave: () => Promise<void>;
  onReopen: () => Promise<void>;
  runtime: "tauri" | "browser";
}

export function BrowserChrome({
  tabs,
  activeLabel,
  onOpen,
  onClose,
  onActivate,
  onRestore,
  onSave,
  onReopen,
  runtime,
}: BrowserChromeProps) {
  const [address, setAddress] = useState("");
  const [restored, setRestored] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    localStorage.getItem("continua-theme") === "light" ? "light" : "dark"
  );
  const [canBack, setCanBack] = useState(false);
  const [canForward, setCanForward] = useState(false);
  const [focused, setFocused] = useState(true);
  const addressRef = useRef<HTMLInputElement | null>(null);

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

  // Keep native tab webviews filling the area below the chrome on any resize.
  useEffect(() => {
    if (runtime !== "tauri") return;
    api.relayout();
    const onResize = () => api.relayout();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
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
          void onOpen("https://continuaos.cc");
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
          onNew={() => void onOpen("https://continuaos.cc")}
        />
        <form onSubmit={navigate} style={{ display: "flex", flex: 1, gap: 6 }}>
          <input
            className="address-bar"
            ref={(el) => {
              addressRef.current = el;
              attachCadence(el);
            }}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={onAddressKey}
            placeholder="Search or enter address…"
            spellCheck={false}
          />
        </form>
      </div>
    </div>
  );
}