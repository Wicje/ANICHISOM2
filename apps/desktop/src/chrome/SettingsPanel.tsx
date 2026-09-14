import { useEffect, useState } from "react";
import type { BrowserConfigItem, ConfigPatch } from "../lib/tauri-bridge";
import { ENGINES } from "./engine-list";
import { IconClose } from "../components/icons";

interface SettingsPanelProps {
  open: boolean;
  config: BrowserConfigItem | null;
  onPatch: (patch: ConfigPatch) => void;
  onClearHistory: () => void;
  onClose: () => void;
}

const AUTOSAVE_OPTIONS: Array<[number, string]> = [
  [0, "Off"],
  [5, "Every 5 seconds"],
  [10, "Every 10 seconds"],
  [30, "Every 30 seconds"],
  [60, "Every minute"],
  [300, "Every 5 minutes"],
];

const READER_FONTS: Array<[string, string]> = [
  ["serif", "Serif"],
  ["sans", "Sans-serif"],
  ["mono", "Monospace"],
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="settings-row">
      <span className="settings-label">{label}</span>
      <div className="settings-field">{children}</div>
    </div>
  );
}

export function SettingsPanel({
  open,
  config,
  onPatch,
  onClearHistory,
  onClose,
}: SettingsPanelProps) {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (open) setDraft(config?.homepage ?? "");
  }, [open, config]);

  if (!open) return null;

  const commitHomepage = () => {
    if ((draft ?? "") !== (config?.homepage ?? "")) onPatch({ homepage: draft.trim() });
  };

  return (
    <div className="settings-overlay" onMouseDown={onClose}>
      <div
        className="settings-panel"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Settings"
      >
        <div className="settings-head">
          <span className="settings-title">Settings</span>
<button className="settings-close" onClick={onClose} title="Close (Ctrl+,)">
            <IconClose size={14} />
          </button>
        </div>

        <div className="settings-body">
          <Row label="Search engine">
            <select
              className="settings-select"
              value={config?.search_engine ?? "google"}
              onChange={(e) => onPatch({ search_engine: e.target.value })}
            >
              {ENGINES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </Row>

          <Row label="Theme">
            <div className="settings-seg">
              <button
                className={config?.theme === "dark" ? "is-active" : ""}
                onClick={() => onPatch({ theme: "dark" })}
              >
                Dark
              </button>
              <button
                className={config?.theme === "light" ? "is-active" : ""}
                onClick={() => onPatch({ theme: "light" })}
              >
                Light
              </button>
            </div>
          </Row>

          <Row label="Homepage">
            <input
              className="settings-input"
              value={draft}
              placeholder="empty = built-in new tab"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitHomepage}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                  commitHomepage();
                }
              }}
              spellCheck={false}
            />
          </Row>

          <Row label="Auto-save session">
            <select
              className="settings-select"
              value={config?.autosave_interval ?? 10}
              onChange={(e) => onPatch({ autosave_interval: Number(e.target.value) })}
            >
              {AUTOSAVE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Row>

          <Row label="Reader typeface">
            <select
              className="settings-select"
              value={config?.reader_font ?? "serif"}
              onChange={(e) => onPatch({ reader_font: e.target.value })}
            >
              {READER_FONTS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Row>

          <Row label="Reader width">
            <div className="settings-range">
              <input
                type="range"
                min={400}
                max={1000}
                step={20}
                value={config?.reader_width ?? 720}
                onChange={(e) => onPatch({ reader_width: Number(e.target.value) })}
              />
              <span className="settings-range-val">{config?.reader_width ?? 720}px</span>
            </div>
          </Row>

          <Row label="Link previews in page">
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={Boolean(config?.link_preview)}
                onChange={(e) => onPatch({ link_preview: e.target.checked })}
              />
              <span>Show URL under hovered links</span>
            </label>
          </Row>

          <Row label="Browsing data">
            <button className="settings-danger" onClick={onClearHistory}>
              Clear history
            </button>
          </Row>
        </div>

        <div className="settings-foot">
          Settings persist across restarts in the app config directory.
        </div>
      </div>
    </div>
  );
}