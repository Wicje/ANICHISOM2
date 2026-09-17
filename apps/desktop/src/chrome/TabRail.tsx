import { memo } from "react";
import { displayTitle } from "../lib/tauri-bridge";
import { Favicon } from "../components/Favicon";
import { IconClose, IconIncognito, IconPlus } from "../components/icons";
import type { OpenTab } from "./TabStrip";

interface TabRailProps {
  tabs: OpenTab[];
  activeLabel: string | null;
  height: number;
  onActivate: (label: string) => Promise<void>;
  onClose: (label: string) => Promise<void>;
  onNew: () => void;
}

export const TabRail = memo(function TabRail({
  tabs,
  activeLabel,
  height,
  onActivate,
  onClose,
  onNew,
}: TabRailProps) {
  return (
    <div className="tab-rail" style={{ top: height }} data-tauri-drag-region>
      {tabs.map((tab) => {
        const active = tab.label === activeLabel;
        return (
          <div
            key={tab.label}
            className={`rail-item${active ? " is-active" : ""}`}
            title={`${tab.title || displayTitle(tab.url)} — click to switch, middle-click to close`}
            onClick={() => void onActivate(tab.label)}
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                void onClose(tab.label);
              }
            }}
          >
            {tab.incognito ? (
              <span className="rail-badge rail-inc">
                <IconIncognito size={12} />
              </span>
            ) : (
              <div className="rail-fav">
                <Favicon url={tab.url} />
              </div>
            )}
            <span
              className="rail-close"
              role="button"
              aria-label="Close tab"
              title="Close tab"
              onClick={(e) => {
                e.stopPropagation();
                void onClose(tab.label);
              }}
            >
              <IconClose size={10} />
            </span>
          </div>
        );
      })}
      <button className="rail-item rail-new" onClick={onNew} title="New tab (Ctrl+T)">
        <IconPlus size={15} />
      </button>
    </div>
  );
});