import { useEffect, useState } from "react";
import {
  api,
  displayTitle,
  type Bookmark,
  type Container,
  type CookieRow,
  type HistoryItem,
  type InstalledApp,
  type OpenTab,
  type SnapshotRow,
  type TaskManagerInfo,
} from "../lib/tauri-bridge";
import { useChromeModal } from "../lib/chrome-modal";
import { formatWhen } from "./HistoryPanel";
import { Favicon } from "../components/Favicon";
import { toast } from "../lib/toast";

/**
 * Managers drawer: container identities (H6), installed web apps, per-site
 * cookies, named session snapshots, the Chromium task manager, and bookmark
 * / history management. Opened from the toolbar or the command palette
 * (`continua:open-managers`). Each tab is a self-contained fetch-on-open
 * section keyed by the same enum below.
 */

type Section =
  | "containers"
  | "apps"
  | "cookies"
  | "snapshots"
  | "task"
  | "bookmarks"
  | "history";

interface ManagersPanelProps {
  open: boolean;
  onClose: () => void;
  tabs: OpenTab[];
  activeLabel: string | null;
  onOpen: (url: string) => void;
  onActivate: (label: string) => void;
  onSetContainer: (label: string, container: string | null) => void;
  /** Preselect a section when opened via `continua:open-managers` detail. */
  focusSection?: string | null;
}

const SECTIONS: { id: Section; label: string }[] = [
  { id: "containers", label: "Containers" },
  { id: "apps", label: "Apps" },
  { id: "cookies", label: "Cookies" },
  { id: "snapshots", label: "Snapshots" },
  { id: "task", label: "Tab manager" },
  { id: "bookmarks", label: "Bookmarks" },
  { id: "history", label: "History" },
];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function originOf(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.origin : null;
  } catch {
    return null;
  }
}

/** One container identity row: color dot, actions, inline rename. */
function ContainersSection({
  activeLabel,
  onSetContainer,
}: {
  activeLabel: string | null;
  onSetContainer: (label: string, container: string | null) => void;
}) {
  const [rows, setRows] = useState<Container[]>([]);
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const refresh = () => void api.listContainers().then(setRows);
  useEffect(refresh, []);

  const add = async () => {
    const r = await api.createContainer(name);
    if ("error" in r) return toast(`Container failed: ${(r as { error: string }).error}`, "danger");
    refresh();
    setRows((prev) => [...prev, r as Container]);
    setName("");
    toast(`Container “${(r as Container).name}” created`);
  };
  const saveRename = async (id: string) => {
    const r = await api.renameContainer(id, draft);
    if ("error" in r) return toast("Rename failed", "danger");
    refresh();
    setRenaming(null);
  };
  const remove = async (id: string) => {
    const next = await api.deleteContainer(id);
    setRows(next);
  };
  const openIn = async (id: string) => {
    const r = await api.openContainerTab(id);
    if (typeof r === "string") toast(`Opened in container`);
    else toast("Could not open container tab", "danger");
  };

  return (
    <div className="settings-body">
      <div className="settings-row">
        <input
          className="settings-input"
          style={{ flex: 1 }}
          placeholder="New container name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="settings-btn is-primary" onClick={add} disabled={!name.trim()}>
          Add
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="settings-hint" style={{ padding: 8 }}>
          No container identities yet — each one keeps its own cookies and storage (
          <em>work</em>, <em>personal</em>, <em>shopping</em>…).
        </p>
      ) : (
        rows.map((c) => (
          <div className="settings-row" key={c.id}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: c.color,
                flex: "none",
              }}
            />
            {renaming === c.id ? (
              <>
                <input
                  className="settings-input"
                  style={{ flex: 1 }}
                  value={draft}
                  autoFocus
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveRename(c.id);
                    if (e.key === "Escape") setRenaming(null);
                  }}
                />
                <button className="settings-btn is-primary" onClick={() => void saveRename(c.id)}>
                  Save
                </button>
              </>
            ) : (
              <span className="settings-label" style={{ flex: 1, fontWeight: 600 }}>
                {c.name}
              </span>
            )}
            {activeLabel && (
              <button
                className="settings-btn"
                title="Move the active tab into this container"
                onClick={() => {
                  onSetContainer(activeLabel, c.id);
                  toast(`Active tab → ${c.name}`);
                }}
              >
                Use
              </button>
            )}
            <button className="settings-btn" onClick={() => void openIn(c.id)}>
              Open
            </button>
            <button
              className="settings-btn"
              onClick={() => {
                setRenaming(c.id);
                setDraft(c.name);
              }}
            >
              Rename
            </button>
            <button className="settings-btn settings-danger" onClick={() => void remove(c.id)}>
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  );
}

/** Installed web-app windows (Gmail, Calendar…). */
/** App icon: site-declared art first, origin favicon/glyph fallback after. */
function AppIcon({ app }: { app: InstalledApp }) {
  const [dead, setDead] = useState(false);
  if (!app.icon || dead || !/^https?:\/\//i.test(app.icon)) return <Favicon url={app.url} />;
  return (
    <img
      className="tab-favicon"
      style={{ width: 16, height: 16, borderRadius: 4 }}
      src={app.icon}
      alt=""
      loading="lazy"
      draggable={false}
      referrerPolicy="no-referrer"
      onError={() => setDead(true)}
    />
  );
}

function AppsSection({ activeUrl }: { activeUrl: string }) {  const [rows, setRows] = useState<InstalledApp[]>([]);
  const refresh = () => void api.listApps().then(setRows);
  useEffect(refresh, []);
  const install = async (url: string) => {
    const r = await api.installApp(url);
    if ("error" in r) return toast(`Install failed: ${(r as { error: string }).error}`, "danger");
    toast(`Installed “${(r as InstalledApp).name}”`);
    refresh();
  };
  const remove = async (id: string) => {
    await api.removeApp(id);
    refresh();
  };
  const currentOk = /^https?:\/\//i.test(activeUrl || "");

  return (
    <div className="settings-body">
      {rows.length === 0 ? (
        <p className="settings-hint" style={{ padding: 8 }}>
          No installed apps yet — “Install” a site to open it in its own standalone window.
        </p>
      ) : (
        rows.map((a) => (
          <div className="settings-row" key={a.id}>
            <AppIcon app={a} />
            <span className="settings-label" style={{ flex: 1 }}>
              {a.name}
            </span>
            <span className="settings-sub">{hostOf(a.url)}</span>
            <button className="settings-btn" onClick={() => void api.openApp(a.id)}>
              Open
            </button>
            <button className="settings-btn settings-danger" onClick={() => void remove(a.id)}>
              Remove
            </button>
          </div>
        ))
      )}
      {currentOk && (
        <div className="settings-row">
          <span className="settings-hint" style={{ flex: 1 }}>
            Install the current page as an app: {hostOf(activeUrl)}
          </span>
          <button className="settings-btn is-primary" onClick={() => void install(activeUrl)}>
            Install current
          </button>
        </div>
      )}
    </div>
  );
}

/** Per-site cookie viewer/manager (never lists values across origins). */
function CookiesSection({ activeUrl }: { activeUrl: string }) {
  const [origin, setOrigin] = useState<string>(() => originOf(activeUrl) || "");
  const [rows, setRows] = useState<CookieRow[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const load = async (o: string) => {
    if (!o) return setRows([]);
    const r = await api.listCookies(o);
    if ("error" in r) {
      setStatus((r as { error: string }).error);
      setRows([]);
    } else {
      setStatus(null);
      setRows((r as { cookies: CookieRow[] }).cookies);
    }
  };
  useEffect(() => {
    setOrigin(originOf(activeUrl) || "");
    void load(originOf(activeUrl) || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUrl]);
  useEffect(() => void load(origin), []);

  const removeOne = async (name: string) => {
    const r = await api.removeCookie(origin, name);
    if ("removed" in r && (r as { removed: number }).removed) void load(origin);
  };
  const clearAll = async () => {
    const r = await api.clearCookies(origin);
    if ("removed" in r) {
      toast(`Cleared ${(r as { removed: number }).removed} cookies`);
      void load(origin);
    }
  };

  return (
    <div className="settings-body">
      <div className="settings-row">
        <input
          className="settings-input"
          style={{ flex: 1 }}
          placeholder="https://example.com"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void load(origin)}
        />
        <button className="settings-btn is-primary" onClick={() => void load(origin)}>
          Load
        </button>
      </div>
      {status && <p className="settings-hint" style={{ padding: 8, color: "var(--danger)" }}>{status}</p>}
      {rows.length === 0 ? (
        <p className="settings-hint" style={{ padding: 8 }}>
          {status ? "Enter a site origin to inspect its cookies." : `No cookies stored for “${origin}”.`}
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {rows.map((c) => (
            <li className="settings-row" key={`${c.domain}-${c.path}-${c.name}`}>
              <span className="settings-label" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                {c.name}
              </span>
              <span className="settings-sub">
                {c.httpOnly ? "httpOnly " : ""}
                {c.secure ? "secure" : ""}
                {c.session ? " · session" : ""}
              </span>
              <button className="settings-btn settings-danger" onClick={() => void removeOne(c.name)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {rows.length > 0 && (
        <div className="settings-foot" style={{ justifyContent: "space-between" }}>
          <span className="settings-sub">{rows.length} cookie{rows.length === 1 ? "" : "s"}</span>
          <button className="settings-btn settings-danger" onClick={() => void clearAll()}>
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

/** Named session snapshots: save, list, restore, delete. */
function SnapshotsSection({ onOpen }: { onOpen: (url: string) => void }) {
  const [rows, setRows] = useState<SnapshotRow[]>([]);
  const [name, setName] = useState("");
  const [replace, setReplace] = useState(false);
  const refresh = () => void api.listSnapshots().then(setRows);
  useEffect(refresh, []);
  const save = async () => {
    const r = await api.saveSnapshot(name.trim() || undefined);
    if ("error" in r) return toast("Could not save snapshot", "danger");
    toast(`Saved snapshot${name.trim() ? ` “${(r as { name?: string }).name}”` : ""}`);
    setName("");
    refresh();
  };
  const restore = async (id: string) => {
    const r = await api.restoreSnapshot(id, replace);
    if ("error" in r) return toast("Snapshot not found", "danger");
    const n = (r as { label: string; url: string }[]).length;
    toast(`Restored ${n} tab${n === 1 ? "" : "s"}`);
    onOpen("");
  };
  const remove = async (id: string) => {
    const r = await api.deleteSnapshot(id);
    if ("error" in r) return toast("Could not delete snapshot", "danger");
    setRows(r as SnapshotRow[]);
  };

  return (
    <div className="settings-body">
      <div className="settings-row">
        <input
          className="settings-input"
          style={{ flex: 1 }}
          placeholder="Snapshot name (optional)…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void save()}
        />
        <button className="settings-btn is-primary" onClick={() => void save()}>
          Save
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="settings-hint" style={{ padding: 8 }}>
          No snapshots yet — save the current workspace to pick it up later on any device.
        </p>
      ) : (
        rows.map((s) => (
          <div className="settings-row" key={s.id}>
            <span className="settings-label" style={{ flex: 1 }}>
              {s.name || displayTitle(s.id)}
            </span>
            <span className="settings-sub">
              {s.tabs.length} tab{s.tabs.length === 1 ? "" : "s"} · {formatWhen(s.saved_at)}
            </span>
            <button className="settings-btn" onClick={() => void restore(s.id)}>
              Restore
            </button>
            <button className="settings-btn settings-danger" onClick={() => void remove(s.id)}>
              Delete
            </button>
          </div>
        ))
      )}
      <label className="settings-row" style={{ border: "none" }}>
        <input
          type="checkbox"
          checked={replace}
          onChange={(e) => setReplace(e.target.checked)}
        />
        <span className="settings-label">Replace matching tabs on restore</span>
      </label>
    </div>
  );
}

/** Chromium task manager rows (mb/cpu, badges; click a tab to focus it). */
function TaskSection({
  activeLabel,
  onActivate,
}: {
  activeLabel: string | null;
  onActivate: (label: string) => void;
}) {
  const [info, setInfo] = useState<TaskManagerInfo | null>(null);
  const [booted, setBooted] = useState(false);
  const refresh = () => void api.taskManager().then((i) => { setInfo(i); setBooted(true); });
  useEffect(refresh, []);

  return (
    <div className="settings-body">
      <div className="settings-row">
        <span className="settings-label" style={{ flex: 1 }}>
          {info ? `${info.tabs.length} tabs · ${info.rssMb} MB` : "…"}
        </span>
        <button className="settings-btn is-primary" onClick={refresh}>
          Refresh
        </button>
      </div>
      {!booted ? (
        <p className="settings-hint" style={{ padding: 8 }}>Sampling process metrics…</p>
      ) : (
        (info?.tabs ?? []).map((t) => (
          <div
            className={"settings-row" + (t.label === activeLabel ? " is-active" : "")}
            key={t.label}
            onClick={() => onActivate(t.label)}
            style={{ cursor: "pointer" }}
          >
            <Favicon url={t.url} />
            <span className="settings-label" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
              {t.title || displayTitle(t.url)}
            </span>
            {t.discarded && <span className="settings-sub">sleeping</span>}
            {t.audible && <span className="settings-sub" style={{ color: "var(--accent)" }}>♪</span>}
            <span className="settings-sub" style={{ width: 44, textAlign: "right" }}>
              {t.mb != null ? `${t.mb} MB` : "—"}
            </span>
            <span className="settings-sub" style={{ width: 40, textAlign: "right" }}>
              {t.cpu != null ? `${t.cpu}%` : "—"}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

/** Bookmark manager: search, rename inline, open, remove. */
function BookmarksSection({ onOpen }: { onOpen: (url: string) => void }) {
  const [rows, setRows] = useState<Bookmark[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const load = (q = query) => void api.searchBookmarks(q).then(setRows);
  useEffect(() => void load(""), []);
  useEffect(() => {
    const t = setTimeout(() => void load(), 150);
    return () => clearTimeout(t);
  }, [query]);
  const saveRename = async (url: string) => {
    const r = await api.renameBookmark(url, draft);
    if ("error" in r) return toast("Rename failed", "danger");
    setRows(r as Bookmark[]);
    setEditing(null);
  };
  const remove = async (url: string) => {
    const updated = await api.removeBookmark(url);
    if (updated) setRows(updated);
  };

  return (
    <div className="settings-body">
      <div className="settings-row">
        <input
          className="settings-input"
          style={{ flex: 1 }}
          placeholder="Filter bookmarks…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="settings-sub" style={{ color: "var(--text-dim)", fontSize: 12 }}>
          {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="settings-hint" style={{ padding: 8 }}>
          {query ? "No matching bookmarks." : "No bookmarks yet — star a page from the toolbar."}
        </p>
      ) : (
        rows.slice(0, 200).map((b) => (
          <div className="settings-row" key={b.url}>
            <Favicon url={b.url} />
            {editing === b.url ? (
              <input
                className="settings-input"
                style={{ flex: 1 }}
                value={draft}
                autoFocus
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveRename(b.url);
                  if (e.key === "Escape") setEditing(null);
                }}
              />
            ) : (
              <span
                className="settings-label"
                style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer" }}
                title={b.url}
                onClick={() => { onOpen(b.url); }}
              >
                {b.label || displayTitle(b.url)}
              </span>
            )}
            <button className="settings-btn" onClick={() => { setEditing(b.url); setDraft(b.label || ""); }}>
              Rename
            </button>
            <button className="settings-btn settings-danger" onClick={() => void remove(b.url)}>
              Remove
            </button>
          </div>
        ))
      )}
    </div>
  );
}

/** History manager: search, open, delete single visits. */
function HistorySection({ onOpen }: { onOpen: (url: string) => void }) {
  const [rows, setRows] = useState<HistoryItem[]>([]);
  const [query, setQuery] = useState("");
  const load = () => void api.searchHistory(query).then(setRows);
  useEffect(() => {
    const t = setTimeout(load, 150);
    return () => clearTimeout(t);
  }, [query]);
  const removeUrl = async (url: string) => {
    const r = await api.deleteHistoryUrl(url);
    if ("removed" in r) load();
  };

  return (
    <div className="settings-body">
      <div className="settings-row">
        <input
          className="settings-input"
          style={{ flex: 1 }}
          placeholder="Search history…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="settings-sub" style={{ color: "var(--text-dim)", fontSize: 12 }}>
          {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="settings-hint" style={{ padding: 8 }}>
          {query ? "No matching visits." : "No history to manage yet."}
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {rows.slice(0, 200).map((h) => (
            <li className="settings-row" key={`${h.url}-${h.at}`}>
              <button
                className="settings-btn"
                style={{ border: "none", background: "transparent", padding: 0, textAlign: "left" }}
                onClick={() => { onOpen(h.url); }}
                title={h.title || displayTitle(h.url)}
              >
                <Favicon url={h.url} />
              </button>
              <span className="settings-label" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer" }}
                onClick={() => { onOpen(h.url); }}
                title={h.title || displayTitle(h.url)}>
                {h.title || displayTitle(h.url)}
              </span>
              <span className="settings-sub" style={{ color: "var(--text-dim)", fontSize: 12 }}>
                {formatWhen(h.at)}
              </span>
              <button className="settings-btn settings-danger" onClick={() => void removeUrl(h.url)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ManagersPanel({
  open,
  onClose,
  tabs,
  activeLabel,
  onOpen,
  onActivate,
  onSetContainer,
  focusSection,
}: ManagersPanelProps) {
  const [section, setSection] = useState<Section>("containers");
  const activeTab = tabs.find((t) => t.label === activeLabel);
  const activeUrl = activeTab?.url || "";
  useChromeModal("managers", open);
  useEffect(() => {
    if (open && focusSection && SECTIONS.some((s) => s.id === focusSection)) {
      setSection(focusSection as Section);
    }
  }, [open, focusSection]);
  if (!open) return null;

  const openAny = (url: string) => {
    if (url) onOpen(url);
    onClose();
  };

  return (
    <div className="settings-overlay" onMouseDown={onClose}>
      <div
        className="settings-panel"
        style={{ width: "min(560px, 96vw)" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="settings-head">
          <span className="settings-title">Managers</span>
          <button className="settings-close" onClick={onClose} aria-label="Close managers">
            ✕
          </button>
        </div>
        <div className="settings-seg" style={{ padding: "10px 14px 6px", flexWrap: "wrap" }}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={section === s.id ? "is-active" : ""}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        {section === "containers" && (
          <ContainersSection
            activeLabel={activeLabel}
            onSetContainer={onSetContainer}
          />
        )}
        {section === "apps" && <AppsSection activeUrl={activeUrl} />}
        {section === "cookies" && <CookiesSection activeUrl={activeUrl} />}
        {section === "snapshots" && <SnapshotsSection onOpen={openAny} />}
        {section === "task" && (
          <TaskSection activeLabel={activeLabel} onActivate={onActivate} />
        )}
        {section === "bookmarks" && <BookmarksSection onOpen={openAny} />}
        {section === "history" && <HistorySection onOpen={openAny} />}
      </div>
    </div>
  );
}