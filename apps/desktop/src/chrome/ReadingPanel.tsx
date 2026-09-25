import { useEffect, useState } from "react";
import { api } from "../lib/tauri-bridge";
import { useChromeModal } from "../lib/chrome-modal";
import type { ReadingItem } from "../lib/tauri-bridge";
import { IconClose } from "../components/icons";
import { Favicon } from "../components/Favicon";

interface ReadingPanelProps {
  open: boolean;
  onClose: () => void;
  onOpen: (url: string) => void;
}

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export function ReadingPanel({ open, onClose, onOpen }: ReadingPanelProps) {
  const [items, setItems] = useState<ReadingItem[]>([]);
  useChromeModal("reading", open);

  useEffect(() => {
    if (!open) return;
    void api.listReading().then(setItems);
  }, [open ]);

  if (!open) return null;
  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="downloads-overlay" onMouseDown={onClose}>
      <div className="downloads-panel" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Reading list">
        <div className="downloads-head">
          <span className="downloads-title">Reading list{unread > 0 ? ` · ${unread} unread` : ""}</span>
          <button className="downloads-close" onClick={onClose} title="Close"><IconClose size={14} /></button>
        </div>
        {items.length === 0 ? (
          <p className="downloads-empty">Nothing saved yet — right-click any page → “Save to reading list”, or use the palette.</p>
        ) : (
          <ul className="downloads-list">
            {items.map((it) => (
              <li key={it.url} className="download-row" style={it.read ? { opacity: 0.6 } : undefined}>
                <span className="download-main">
                  <span className="download-name">
                    <Favicon url={it.url} /> {it.title || hostOf(it.url)}
                  </span>
                  <span className="download-sub">{hostOf(it.url)}</span>
                </span>
                <span className="download-actions">
                  <button onClick={() => {
                    void api.markReading(it.url, true).then(setItems);
                    onOpen(it.url);
                    onClose();
                  }}>Open</button>
                  <button onClick={() => void api.markReading(it.url, !it.read).then(setItems)}>
                    {it.read ? "Mark unread" : "Mark read"}
                  </button>
                  <button onClick={() => void api.removeReading(it.url).then(setItems)}>Remove</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
