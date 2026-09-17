import { useEffect, useRef, useState } from "react";
import { useChromeModal } from "../lib/chrome-modal";
import type { SessionSummary } from "../lib/tauri-bridge";
import { IconCaretDown, IconCheck, IconClose, IconStack } from "../components/icons";

interface WorkspaceMenuProps {
  workspaces: SessionSummary[];
  active: string;
  /** Live open-tab count, shown on the button and in the save row. */
  currentCount: number;
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
  currentCount,
  onCreate,
  onSwitch,
  onDelete,
}: WorkspaceMenuProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  useChromeModal("workspaces", open);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open ]);

  const label = active.length > 14 ? `${active.slice(0, 13)}…` : active;

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName("");
    setOpen(false);
  };

  return (
    <div className="workspace-wrap">
      <button
        className={`workspace-btn${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title="Workspaces — switch contexts, checkpoint tab sets"
      >
        <IconStack size={14} />
        <span className="workspace-btn-name">{label}</span>
        <span className="workspace-btn-count">{currentCount}</span>
        <IconCaretDown size={12} />
      </button>
      {open && (
        <div
          className="workspace-pop"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="workspace-head">Workspaces</div>
          <div className="workspace-new">
            <input
              ref={inputRef}
              className="workspace-input"
              value={name}
              placeholder={`Save ${currentCount} open tab${currentCount === 1 ? "" : "s"} as…`}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") setOpen(false);
              }}
              spellCheck={false}
            />
            <button className="workspace-save" onClick={submit} disabled={!name.trim()}>
              Save
            </button>
          </div>
          <div className="workspace-sep" />
          {workspaces.length === 0 ? (
            <div className="workspace-empty">
              No workspaces yet — name one above to checkpoint these tabs,
              then switch contexts in one click.
            </div>
          ) : (
            workspaces.map((ws) => {
              const isActive = ws.id === active;
              const hosts = [...new Set(ws.tabs.map((t) => hostOf(t.url)))].slice(0, 3).join(" · ");
              return (
                <button
                  key={ws.id}
                  className={`workspace-row${isActive ? " is-active" : ""}`}
                  onClick={() => {
                    setOpen(false);
                    if (!isActive) onSwitch(ws.id);
                  }}
                >
                  <span className="workspace-row-check">
                    {isActive && <IconCheck size={13} />}
                  </span>
                  <span className="workspace-row-main">
                    <span className="workspace-row-name">{ws.id}</span>
                    <span className="workspace-row-sub">
                      {ws.tabs.length} tab{ws.tabs.length === 1 ? "" : "s"}
                      {hosts ? ` · ${hosts}` : ""} · {formatWhen(ws.saved_at)}
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onDelete(ws.id);
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
            Switching swaps the tab set — the current one stays saved.
          </div>
        </div>
      )}
    </div>
  );
}