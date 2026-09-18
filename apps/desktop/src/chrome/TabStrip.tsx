import { memo, useEffect, useRef, useState } from "react";
import { api, displayTitle } from "../lib/tauri-bridge";
import { useChromeModal } from "../lib/chrome-modal";
import type { TabGroup, TabRecord } from "../lib/tauri-bridge";
import { Favicon } from "../components/Favicon";
import {
  IconAudio,
  IconCaretDown,
  IconClose,
  IconDuplicate,
  IconIncognito,
  IconMuted,
  IconPin,
  IconPlus,
  IconAppWindow,
  IconVault,
} from "../components/icons";

export interface OpenTab extends TabRecord {
  label: string;
  /** Present when the tab's URL/title live only inside the OS keyring. */
  vault_id?: string | null;
  /** Chrome-side pin: favicon-only tab (not persisted into the session). */
  pinned?: boolean;
  /** Private (incognito) tab: badge in the strip, no disk trace. */
  incognito?: boolean;
  /** Tab group id (resolved against the registry for color). */
  group?: string | null;
  /** Sleeping (discarded to metadata) — faded, click to wake. */
  discarded?: boolean;
}

interface TabStripProps {
  tabs: OpenTab[];
  activeLabel: string | null;
  onActivate: (label: string) => Promise<void>;
  onClose: (label: string) => Promise<void>;
  onNew: () => void;
  onNewIncognito?: () => void;
  onDuplicate?: (label: string) => void;
  onOpenAppWindow?: (label: string) => void;
  onCloseOthers?: (label: string) => void;
  onReorder?: (from: string, to: string, after?: boolean) => void;
  onTogglePin?: (label: string) => void;
  onOverflowChange?: (over: boolean) => void;
  /** Live audio state per tab label (polled by chrome, Electron host). */
  audio?: Record<string, { audible: boolean; muted: boolean }>;
  onToggleMute?: (label: string, muted: boolean) => void;
  /** Group registry + assignment (persisted + synced). */
  groups?: TabGroup[];
  onSetGroup?: (label: string, group: string | null) => void;
  onGroupsChanged?: () => void;
  /** Sleeping (discarded) tabs render faded with a wake-on-click hint. */
  sleeping?: Record<string, boolean>;
  onSleepTab?: (label: string) => void;
  /** True when the vertical rail has taken over: hide the top tab pills
   * (visibility, not display, so scrollWidth stays stable and overflow
   * detection doesn't flutter). */
  rail?: boolean;
}

interface DragState {
  label: string;
  over?: string;
  after?: boolean;
}

interface MenuState {
  label: string;
  x: number;
  y: number;
}

export const TabStrip = memo(function TabStrip({
  tabs,
  activeLabel,
  onActivate,
  onClose,
  onNew,
  onNewIncognito,
  onDuplicate,
  onOpenAppWindow,
  onCloseOthers,
  onReorder,
  onTogglePin,
  onOverflowChange,
  audio,
  onToggleMute,
  groups,
  onSetGroup,
  onGroupsChanged,
  sleeping,
  onSleepTab,
  rail,
}: TabStripProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ctx, setCtx] = useState<MenuState | null>(null);
  const [groupName, setGroupName] = useState("");
  useChromeModal("tab-menu", menuOpen || ctx !== null);
  const groupById = new Map((groups ?? []).map((g) => [g.id, g]));
  const rootRef = useRef<HTMLDivElement | null>(null);
  const target = ctx ? tabs.find((t) => t.label === ctx.label) : undefined;

  // Report overflow to the parent (drives the vertical tab rail).
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !onOverflowChange) return;
    const check = () => onOverflowChange(el.scrollWidth > el.clientWidth + 2);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener("resize", check);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [onOverflowChange, tabs.length]);

  const clampMenu = (label: string, x: number, y: number) => ({
    label,
    x: Math.min(Math.max(8, x), window.innerWidth - 190),
    y: Math.min(Math.max(8, y), window.innerHeight - 180),
  });

  const ctxAction = (fn: () => void) => {
    setCtx(null);
    fn();
  };

  const newMenu = onNewIncognito ? (
    <div className="tab-new-menu">
      <button className="tab-new-split" onClick={() => setMenuOpen((v) => !v)} title="New tab or private tab">
        <IconCaretDown size={12} />
      </button>
      {menuOpen && (
        <div className="tab-new-pop" onMouseLeave={() => setMenuOpen(false)}>
          <button
            className="tab-new-opt"
            onClick={() => {
              setMenuOpen(false);
              onNew();
            }}
          >
            <span className="tab-new-ico"><IconPlus size={13} /></span> New tab <kbd>Ctrl+T</kbd>
          </button>
          <button
            className="tab-new-opt"
            onClick={() => {
              setMenuOpen(false);
              onNewIncognito();
            }}
          >
            <span className="tab-new-ico tab-new-ico-inc"><IconIncognito size={13} /></span> New private tab
          </button>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className={`tab-strip${rail ? " is-rail" : ""}`} ref={rootRef}>
      {tabs.map((tab) => {
        const active = tab.label === activeLabel;
        const vaulted = Boolean(tab.vault_id);
        const pinned = Boolean(tab.pinned);
        const incognito = Boolean(tab.incognito);
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
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCtx(clampMenu(tab.label, e.clientX, e.clientY));
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
            className={`tab ${active ? "tab-active" : ""}${vaulted ? " tab-vault" : ""}${pinned ? " tab-pinned" : ""}${incognito ? " tab-incognito" : ""}${(sleeping?.[tab.label] || tab.discarded) && !active ? " tab-sleeping" : ""}${drag?.label === tab.label ? " tab-dragging" : ""}${dropClass}`}
            title={
              (incognito ? "Private tab — no history or session saved · " : "") +
              ((sleeping?.[tab.label] || tab.discarded) && !active ? "Sleeping — click to wake · " : "") +
              (pinned
                ? `${displayTitle(tab.url)} (pinned — double-click to unpin) · `
                : "") +
              (vaulted ? `Vault tab — encrypted at rest (${tab.url}) · ` : tab.url) +
              (pinned ? "double-click to unpin" : "double-click to pin")
            }
          >
            <Favicon url={tab.url} />
            {(sleeping?.[tab.label] || tab.discarded) && !active && (
              <span className="tab-sleep-badge" title="Sleeping tab — click to wake instantly">
                💤
              </span>
            )}
            {tab.group && groupById.get(tab.group) && (
              <span
                className="tab-group-dot"
                style={{ background: groupById.get(tab.group)!.color }}
                title={`Group: ${groupById.get(tab.group)!.name}`}
              />
            )}
            <span className="tab-title">{tab.title || displayTitle(tab.url)}</span>
            {(() => {
              const a = audio?.[tab.label];
              if (!a || (!a.audible && !a.muted)) return null;
              return (
                <button
                  className={`tab-audio${a.muted ? " is-muted" : ""}`}
                  title={a.muted ? "Unmute tab" : "Mute tab"}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleMute) onToggleMute(tab.label, !a.muted);
                    else void api.setTabMuted(tab.label, !a.muted);
                  }}
                >
                  {a.muted ? <IconMuted size={11} /> : <IconAudio size={11} />}
                </button>
              );
            })()}
            {incognito && (
              <span className="tab-incognito-badge" title="Private tab — no history or session saved">
                <IconIncognito size={11} />
              </span>
            )}
            {vaulted && (
              <span className="tab-vault-badge" title="Encrypted at rest">
                <IconVault size={11} />
              </span>
            )}
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                void onClose(tab.label);
              }}
            >
              <IconClose size={10} />
            </button>
          </div>
        );
      })}
      <div className="tab-new-wrap">
        <button className="tab-new" onClick={onNew} title="New tab (Ctrl+T)">
          <IconPlus size={14} />
        </button>
        {newMenu}
      </div>

      {ctx && target && (
        <>
          <div className="ctx-backdrop" onMouseDown={() => setCtx(null)} onContextMenu={(e) => { e.preventDefault(); setCtx(null); }} />
          <div
            className="ctx-menu"
            style={{ left: ctx.x, top: ctx.y }}
            onMouseLeave={() => setCtx(null)}
          >
            <button
              className="ctx-item"
              onClick={() => ctxAction(() => onTogglePin?.(ctx.label))}
            >
              <span className="ctx-ico"><IconPin size={13} /></span>
              {target.pinned ? "Unpin tab" : "Pin tab"}
            </button>
            <button
              className="ctx-item"
              onClick={() => ctxAction(() => {
                const a = audio?.[ctx.label];
                const next = !(a?.muted ?? false);
                if (onToggleMute) onToggleMute(ctx.label, next);
                else void api.setTabMuted(ctx.label, next);
              })}
            >
              <span className="ctx-ico">{audio?.[ctx.label]?.muted ? <IconAudio size={13} /> : <IconMuted size={13} />}</span>
              {audio?.[ctx.label]?.muted ? "Unmute tab" : "Mute tab"}
            </button>
            {onDuplicate && (
              <button
                className="ctx-item"
                onClick={() => ctxAction(() => onDuplicate(ctx.label))}
              >
                <span className="ctx-ico"><IconDuplicate size={13} /></span>
                Duplicate tab
              </button>
            )}
            {onSleepTab && !target.discarded && !(sleeping?.[ctx.label]) && (
              <button
                className="ctx-item"
                onClick={() => ctxAction(() => onSleepTab(ctx.label))}
              >
                <span className="ctx-ico">💤</span>
                Sleep tab
              </button>
            )}
            {onOpenAppWindow && (
              <button
                className="ctx-item"
                onClick={() => ctxAction(() => onOpenAppWindow(ctx.label))}
              >
                <span className="ctx-ico"><IconAppWindow size={13} /></span>
                Open in a new window
              </button>
            )}
            {onSetGroup && (
              <>
                <div className="ctx-sep" />
                <div className="ctx-label">Group</div>
                {(groups ?? []).map((g) => (
                  <button
                    key={g.id}
                    className="ctx-item"
                    onClick={() => ctxAction(() => onSetGroup(ctx.label, target?.group === g.id ? null : g.id))}
                  >
                    <span className="ctx-ico"><span className="tab-group-dot" style={{ background: g.color }} /></span>
                    {g.name}{target?.group === g.id ? " ✓" : ""}
                  </button>
                ))}
                {target?.group && (
                  <button className="ctx-item" onClick={() => ctxAction(() => onSetGroup(ctx.label, null))}>
                    <span className="ctx-ico"><IconClose size={13} /></span>
                    Ungroup tab
                  </button>
                )}
                <div className="ctx-newgroup">
                  <input
                    className="ctx-input"
                    value={groupName}
                    placeholder="New group name…"
                    onChange={(e) => setGroupName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && groupName.trim()) {
                        const nm = groupName.trim();
                        setGroupName("");
                        ctxAction(() => {
                          void api.createGroup(nm).then((g) => {
                            if (g) {
                              onGroupsChanged?.();
                              onSetGroup(ctx.label, g.id);
                            }
                          });
                        });
                      }
                    }}
                    spellCheck={false}
                  />
                </div>
              </>
            )}
            <div className="ctx-sep" />
            {onCloseOthers && (
              <button
                className="ctx-item"
                onClick={() => ctxAction(() => onCloseOthers(ctx.label))}
              >
                <span className="ctx-ico"><IconClose size={13} /></span>
                Close other tabs
              </button>
            )}
            <button className="ctx-item ctx-danger" onClick={() => ctxAction(() => void onClose(ctx.label))}>
              <span className="ctx-ico"><IconClose size={13} /></span>
              Close tab
            </button>
          </div>
        </>
      )}
    </div>
  );
});