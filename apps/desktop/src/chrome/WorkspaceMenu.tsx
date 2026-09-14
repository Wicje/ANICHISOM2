import { useState } from "react";
import type { SessionSummary } from "../lib/tauri-bridge";
import { IconClose, IconStack } from "../components/icons";

interface WorkspaceMenuProps {
  workspaces: SessionSummary[];
  active: string;
  onCreate: (name: string) => void;
  onSwitch: (name: string) => void;
  onDelete: (name: string) => void;
}

function formatWhen(secs: number): string {
  const d = new Date(secs * 1000);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export function WorkspaceMenu({
  workspaces,
  active,
  onCreate,
  onSwitch,
  onDelete,
}: WorkspaceMenuProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const label = active.length > 16 ? `${active.slice(0, 15)}…` : active;

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName("");
  };

  return (
    <div className="workspace-wrap">
      <button
        className={`chrome-btn workspace-btn${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title="Workspaces — named tab sets with their own session checkpoint"
      >
        <IconStack size={15} /> {label}
      </button>
      {open && (
        <div
          className="workspace-pop"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="workspace-new">
            <input
              className="workspace-input"
              value={name}
              placeholder="New workspace name…"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") setOpen(false);
              }}
              spellCheck={false}
            />
            <button className="workspace-save" onClick={submit}>
              Save
            </button>
          </div>
          <div className="workspace-sep" />
          {workspaces.length === 0 ? (
            <div className="workspace-empty">
              No saved workspaces yet — name one above to checkpoint your tabs.
            </div>
          ) : (
            workspaces.map((ws) => {
              const firstHost = ws.tabs[0] ? hostOf(ws.tabs[0].url) : "";
              const more = ws.tabs.length > 1 ? ` +${ws.tabs.length - 1}` : "";
              return (
                <button
                  key={ws.id}
                  className={`workspace-row${ws.id === active ? " is-active" : ""}`}
                  onClick={() => {
                    setOpen(false);
                    onSwitch(ws.id);
                  }}
                >
                  <span className="workspace-row-main">
                    <span className="workspace-row-name">{ws.id}</span>
                    <span className="workspace-row-sub">
                      {formatWhen(ws.saved_at)} · {firstHost}
                      {more}
                    </span>
                  </span>
                  <span
                    className="workspace-row-del"
                    role="button"
                    tabIndex={0}
                    title="Delete workspace"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(ws.id);
                    }}
                  >
                    <IconClose size={13} />
                  </span>
                </button>
              );
            })
          )}
          <div className="workspace-sep" />
          <div className="workspace-foot">
            Switching replaces the current tab set (it's still saved).
          </div>
        </div>
      )}
    </div>
  );
}