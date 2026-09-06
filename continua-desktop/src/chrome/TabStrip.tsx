import { displayTitle } from "../lib/tauri-bridge";
import type { TabRecord } from "../lib/tauri-bridge";
import { Favicon } from "../components/Favicon";

export interface OpenTab extends TabRecord {
  label: string;
}

interface TabStripProps {
  tabs: OpenTab[];
  activeLabel: string | null;
  onActivate: (label: string) => Promise<void>;
  onClose: (label: string) => Promise<void>;
  onNew: () => void;
}

export function TabStrip({ tabs, activeLabel, onActivate, onClose, onNew }: TabStripProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, maxWidth: "55%", overflowX: "auto" }}>
      {tabs.map((tab) => {
        const active = tab.label === activeLabel;
        return (
          <div
            key={tab.label}
            onClick={() => void onActivate(tab.label)}
            className={`tab ${active ? "tab-active" : ""}`}
            title={tab.url}
          >
            <Favicon url={tab.url} />
            <span className="tab-title">{tab.title || displayTitle(tab.url)}</span>
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
}