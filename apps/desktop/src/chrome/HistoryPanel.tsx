import { useEffect, useMemo, useRef, useState } from "react";
import { api, displayTitle, isTauri } from "../lib/tauri-bridge";
import type { HistoryItem } from "../lib/tauri-bridge";
import { Favicon } from "../components/Favicon";

interface HistoryPanelProps {
  open: boolean;
  activeLabel: string | null;
  onClose: () => void;
  onNavigate: (url: string) => void;
}

/** Compact relative timestamp ("just now", "5m", "3h", "Tue", "12 Sep"). */
export function formatWhen(at: number): string {
  if (!at) return "";
  const then = new Date(at * 1000);
  const now = Date.now();
  const secs = Math.max(0, (now - at * 1000) / 1000);
  if (secs < 45) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  if (secs < 3 * 86400)
    return then.toLocaleDateString([], { weekday: "short" });
  return then.toLocaleDateString([], { month: "short", day: "numeric" });
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function HistoryPanel({
  open,
  activeLabel,
  onClose,
  onNavigate,
}: HistoryPanelProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const itemsRef = useRef(items);

  // Refetch fresh history each time the panel opens (visits land live).
  useEffect(() => {
    if (!open) return;
    void api.getHistory().then((h) => {
      itemsRef.current = h;
      setItems(h);
    });
    setQuery("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.url.toLowerCase().includes(q),
    );
  }, [items, query]);

  const clearAll = () => {
    void api.clearHistory().then(() => {
      itemsRef.current = [];
      setItems([]);
    });
  };

  if (!open) return null;

  const go = (url: string) => {
    onNavigate(url);
    onClose();
  };

  return (
    <div className="history-overlay" onMouseDown={onClose}>
      <div className="history-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="history-head">
          <span className="history-title">History</span>
          <input
            ref={inputRef}
            className="history-search"
            placeholder="Search history…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
          />
          <button
            className="history-clear"
            onClick={clearAll}
            disabled={items.length === 0}
            title="Clear all browsing history"
          >
            Clear
          </button>
        </div>

        {visible.length === 0 ? (
          <p className="history-empty">
            {query.trim()
              ? "No matching visits."
              : "No recorded visits yet — pages you open will show here."}
          </p>
        ) : (
          <ul className="history-list">
            {visible.slice(0, 200).map((h, i) => (
              <li key={`${h.url}-${h.at}-${i}`}>
                <button className="history-row" onClick={() => go(h.url)}>
                  <Favicon url={h.url} />
                  <span className="history-main">
                    <span className="history-label">
                      {h.title || displayTitle(h.url)}
                    </span>
                    <span className="history-sub">{hostOf(h.url)}</span>
                  </span>
                  <span className="history-when">{formatWhen(h.at)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {items.length > 0 && (
          <div className="history-foot">
            {visible.length} of {items.length} visits{isTauri() ? "" : " (preview)"}
          </div>
        )}
      </div>
    </div>
  );
}