import { memo, useState } from "react";
import { displayTitle } from "../lib/tauri-bridge";
import { Favicon } from "../components/Favicon";
import { IconClose, IconIncognito } from "../components/icons";
import type { OpenTab } from "./TabStrip";

interface TabRailProps {
  tabs: OpenTab[];
  activeLabel: string | null;
  height: number;
  onActivate: (label: string) => Promise<void>;
  onClose: (label: string) => Promise<void>;
}

export const TabRail = memo(function TabRail({
  tabs,
  activeLabel,
  height,
  onActivate,
  onClose,
}: TabRailProps) {
  const [armed, setArmed] = useState<string | null>(null);

  return (
    <div className="tab-rail" style={{ top: height }} data-tauri-drag-region>
      {tabs.map((tab) => {
        const active = tab.label === activeLabel;
        const showClose = armed === tab.label;
        return (
          <button
            key={tab.label}
            className={`rail-item${active ? " is-active" : ""}`}
            title={tab.title || displayTitle(tab.url)}
            onClick={() => void onActivate(tab.label)}
            onMouseEnter={() => setArmed(tab.label)}
            onMouseLeave={() => setArmed((c) => (c === tab.label ? null : c))}
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                void onClose(tab.label);
              }
            }}
          >
            {showClose ? (
              <IconClose size={14} className="rail-close" />
            ) : tab.incognito ? (
              <span className="rail-badge rail-inc">
                <IconIncognito size={12} />
              </span>
            ) : (
              <div className="rail-fav">
                <Favicon url={tab.url} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
});