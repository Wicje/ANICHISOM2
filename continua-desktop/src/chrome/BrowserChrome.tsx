import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, windowControls } from "../lib/tauri-bridge";
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
  runtime,
}: BrowserChromeProps) {
  const [address, setAddress] = useState("");
  const [restored, setRestored] = useState(false);
  const [maximized, setMaximized] = useState(false);

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

  const navigate = async (e: FormEvent) => {
    e.preventDefault();
    let url = address.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    setAddress("");
    await onOpen(url);
  };

  return (
    <div
      className="chrome"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 96,
        background: "var(--chrome-bg)",
        borderBottom: "1px solid var(--border)",
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
        <div className="brand-mark">C</div>
        <span className="brand-name">Continua</span>
        <span className="runtime-badge">{runtime === "tauri" ? "native" : "preview"}</span>
        <div style={{ flex: 1, alignSelf: "stretch" }} data-tauri-drag-region />
        <button className="chrome-btn" onClick={() => void onRestore()} title="Restore last session">
          ⟲
        </button>
        <button className="chrome-btn" onClick={() => void onSave()} title="Save session now">
          ●
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

      {/* Row 2: tab strip + address bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Search or enter address…"
            spellCheck={false}
          />
        </form>
      </div>
    </div>
  );
}