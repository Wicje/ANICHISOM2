import { useEffect, useState } from "react";
import { api } from "../lib/tauri-bridge";
import { useChromeModal } from "../lib/chrome-modal";
import type { DownloadItem } from "../lib/tauri-bridge";
import { IconClose } from "../components/icons";

interface DownloadsPanelProps {
  open: boolean;
  onClose: () => void;
}

function fmtBytes(n: number): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

export function DownloadsPanel({ open, onClose }: DownloadsPanelProps) {
  const [items, setItems] = useState<DownloadItem[]>([]);
  useChromeModal("downloads", open);

  useEffect(() => {
    if (!open) return;
    let stop = false;
    const poll = () => void api.listDownloads().then((d) => { if (!stop) setItems(d); });
    poll();
    const t = window.setInterval(poll, 1000);
    return () => { stop = true; window.clearInterval(t); };
  }, [open ]);

  if (!open) return null;

  return (
    <div className="downloads-overlay" onMouseDown={onClose}>
      <div className="downloads-panel" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Downloads">
        <div className="downloads-head">
          <span className="downloads-title">Downloads</span>
          <button className="downloads-clear" disabled={items.length === 0}
            onClick={() => void api.clearDownloads().then(setItems)} title="Clear finished">
            Clear finished
          </button>
          <button className="downloads-close" onClick={onClose} title="Close"><IconClose size={14} /></button>
        </div>
        {items.length === 0 ? (
          <p className="downloads-empty">No downloads yet — files you save land in your OS Downloads folder.</p>
        ) : (
          <ul className="downloads-list">
            {items.map((d) => {
              const pct = d.total > 0 ? Math.min(100, Math.round((d.received / d.total) * 100)) : null;
              return (
                <li key={d.id} className="download-row">
                  <span className="download-main">
                    <span className="download-name" title={d.path}>{d.filename}</span>
                    <span className="download-sub">
                      {d.state === "progressing" || d.state === "paused" ? (pct !== null ? `${pct}% · ${fmtBytes(d.received)} of ${fmtBytes(d.total)}` : `${fmtBytes(d.received)}…`) : d.state}
                    </span>
                    {(d.state === "progressing" || d.state === "paused") && (
                      <span className="download-bar"><span className="download-fill" style={{ width: `${pct ?? 10}%` }} /></span>
                    )}
                  </span>
                  <span className="download-actions">
                    {d.state === "progressing" && <button onClick={() => void api.pauseDownload(d.id)}>Pause</button>}
                    {d.state === "paused" && <button onClick={() => void api.resumeDownload(d.id)}>Resume</button>}
                    {(d.state === "progressing" || d.state === "paused") && <button onClick={() => void api.cancelDownload(d.id)}>Cancel</button>}
                    {d.state === "completed" && (
                      <>
                        <button onClick={() => void api.openDownload(d.id)}>Open</button>
                        <button onClick={() => void api.revealDownload(d.id)}>Show in folder</button>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
