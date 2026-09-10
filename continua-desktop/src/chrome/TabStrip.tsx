import { memo, useState } from "react";
import { displayTitle } from "../lib/tauri-bridge";
import type { TabRecord } from "../lib/tauri-bridge";
import { Favicon } from "../components/Favicon";

export interface OpenTab extends TabRecord {
  label: string;
  /** Present when the tab's URL/title live only inside the OS keyring. */
  vault_id?: string | null;
  /** Chrome-side pin: favicon-only tab (not persisted into the session). */
  pinned?: boolean;
}

interface TabStripProps {
  tabs: OpenTab[];
  activeLabel: string | null;
  onActivate: (label: string) => Promise<void>;
  onClose: (label: string) => Promise<void>;
  onNew: () => void;
  onReorder?: (from: string, to: string, after?: boolean) => void;
  onTogglePin?: (label: string) => void;
}

interface DragState {
  label: string;
  over?: string;
  after?: boolean;
}

export const TabStrip = memo(function TabStrip({
  tabs,
  activeLabel,
  onActivate,
  onClose,
  onNew,
  onReorder,
  onTogglePin,
}: TabStripProps) {
  const [drag, setDrag] = useState<DragState | null>(null);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, maxWidth: "55%", overflowX: "auto", minWidth: 0 }}>
      {tabs.map((tab) => {
        const active = tab.label === activeLabel;
        const vaulted = Boolean(tab.vault_id);
        const pinned = Boolean(tab.pinned);
        const dropping = drag?.over === tab.label;

        const dropClass = dropping ? (drag?.after ? " tab-drop-after" : " tab-drop-before") : "";

        return (
          <div
            key={tab.label}
            draggable
            onClick={() => void onActivate(tab.label)}
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                void onClose(tab.label);
              }
            }}
            onDoubleClick={() => {
              if (onTogglePin) onTogglePin(tab.label);
            }}
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", tab.label);
              e.dataTransfer.effectAllowed = "move";
              setDrag({ label: tab.label });
            }}
            onDragOver={(e) => {
              if (!drag || drag.label === tab.label) return;
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              const before = e.clientX < rect.left + rect.width / 2;
              setDrag((d) =>
                d && d.over === tab.label && d.after === !before
                  ? d
                  : { label: d?.label ?? tab.label, over: tab.label, after: !before },
              );
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (drag && drag.over && drag.over !== drag.label && onReorder) {
                onReorder(drag.label, drag.over, drag.after);
              }
              setDrag(null);
            }}
            onDragEnd={() => setDrag(null)}
            className={`tab ${active ? "tab-active" : ""}${vaulted ? " tab-vault" : ""}${pinned ? " tab-pinned" : ""}${drag?.label === tab.label ? " tab-dragging" : ""}${dropClass}`}
            title={
              (pinned
                ? `${displayTitle(tab.url)} (pinned — double-click to unpin) · `
                : "") +
              (vaulted ? `Vault tab — encrypted at rest (${tab.url}) · ` : tab.url) +
              (pinned ? "double-click to unpin" : "double-click to pin")
            }
          >
            <Favicon url={tab.url} />
            <span className="tab-title">{tab.title || displayTitle(tab.url)}</span>
            {vaulted && <span className="tab-vault-badge" title="Encrypted at rest">◈</span>}
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                void onClose(tab.label);
              }}
            >
              ×
            </button>
          </div>
        );
      })}
      <button className="tab-new" onClick={onNew} title="New tab">
        +
      </button>
    </div>
  );
});