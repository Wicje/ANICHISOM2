import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/tauri-bridge";
import type {
  AgentAuditEntry,
  AgentAuditSummary,
  AuditChainState,
  ContinuaMetrics,
  SessionSummary,
} from "../lib/tauri-bridge";
import { useChromeModal } from "../lib/chrome-modal";
import { toast } from "../lib/toast";
import {
  IconCheck,
  IconRestore,
  IconStack,
  IconVault,
} from "../components/icons";

/**
 * A "reviewable agent research session" — the one workflow Continua owns
 * (docs/STRATEGY.md, Bet 3). A *run* is the unit: what the agent read, what it
 * proposed to write, who granted each write, and what the session produced.
 * The debrief is the readable half; the audit chain is the half that cannot be
 * quietly rewritten. Same host contracts an auditor would use.
 */

interface DebriefSummary {
  sites?: Record<string, number>;
  top?: Array<{ host: string; ms: number; pct: number }>;
  totalMs?: number;
  interactions?: number;
  downloads?: number;
  writes?: number;
  approvals?: number;
  unapprovedWrites?: number;
}

interface ActionItem {
  kind?: string;
  host?: string;
  name?: string;
  field?: string;
  hosts?: string[];
}

function hostOf(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function minutes(ms: number): string {
  return `${Math.round((ms || 0) / 60000)}m`;
}

function formatWhen(secs: number): string {
  const d = new Date(secs * 1000);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return sameDay ? `Today ${time}` : `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

function describeItem(item: ActionItem): string {
  switch (item.kind) {
    case "file":
      return `File kept — ${item.name || "unknown"}${item.host ? ` from ${item.host}` : ""}`;
    case "unfinished-input":
      return `Unfinished input left in ${item.field || "a field"}`;
    case "resume-order":
      return `Resume order: ${(item.hosts || []).join(" → ") || "—"}`;
    default:
      return item.kind || "item";
  }
}

export function SessionPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [headline, setHeadline] = useState<string | null>(null);
  const [summary, setSummary] = useState<DebriefSummary | null>(null);
  const [items, setItems] = useState<ActionItem[]>([]);
  const [since, setSince] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<ContinuaMetrics | null>(null);
  const [boundary, setBoundary] = useState<AgentAuditSummary | null>(null);
  const [chain, setChain] = useState<AuditChainState | null>(null);

  const [writes, setWrites] = useState<AgentAuditEntry[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useChromeModal("session", open);

  const load = useCallback(() => {
    // Debrief (readable run) and stats (continuity + boundary) are independent
    // sources; load them together and only surface a hard error if the run
    // itself is unreadable.
    Promise.all([api.debriefSession("long"), api.agentStats(30), api.browseSessions()])
      .then(([dRes, sRes, sessionsRes]) => {
        const d = dRes as {
          headline?: string;
          summary?: DebriefSummary;
          actionItems?: ActionItem[];
          since?: string | null;
          error?: string;
        };
        if (d.error) setError(d.error);
        else setError(null);
        setHeadline(d.headline ?? null);
        setSummary(d.summary ?? null);
        setItems(d.actionItems ?? []);
        setSince(d.since ?? null);

        const s = sRes as {
          metrics?: ContinuaMetrics;
          audit?: AgentAuditSummary;
          chain?: AuditChainState;
          error?: string;
        };
        if (!s.error) {
          setMetrics(s.metrics ?? null);
          setBoundary(s.audit ?? null);
          setChain(s.chain ?? null);
        }
        setSessions((sessionsRes ?? []).filter((x) => x.tabs.length > 0).slice(0, 5));
        setBooted(true);
      })
      .catch(() => setBooted(true))
      // The write evidence is the audit chain filtered to this run's writes.
      .then(() => api.auditLogQuery(200))
      .then((res) => {
        const r = res as { entries?: AgentAuditEntry[]; error?: string };
        if (r.error) return;
        setWrites((r.entries ?? []).filter((e) => e.tier === "write").reverse().slice(0, 40));
      });
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const clearRun = useCallback(() => {
    void api.agentTimelineClear().then(() => {
      setConfirmClear(false);
      toast("Run cleared — the next debrief starts fresh. The audit chain is untouched.");
      load();
    });
  }, [load]);

  const exportRun = useCallback(() => {
    void api.auditLogExport().then((res) => {
      const r = res as { bytes?: number; error?: string };
      if (r.error) {
        setError(r.error);
        return;
      }
      toast(`Run evidence copied (${r.bytes ?? 0} bytes) — verifiable offline`);
    });
  }, []);

  if (!open) return null;

  const top = summary?.top ?? [];
  const runWrites = summary?.writes ?? 0;
  const approved = summary?.approvals ?? 0;

  return (
    <div className="settings-overlay" onMouseDown={onClose}>
      <div
        className="settings-panel"
        style={{ width: "min(620px, 96vw)" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="settings-head">
          <span className="settings-title">Session</span>
          <button className="settings-close" onClick={onClose} aria-label="Close session">
            ✕
          </button>
        </div>

        <div className="settings-body">
          {error && <p className="settings-hint" style={{ padding: 8, color: "var(--danger, #e5534b)" }}>{error}</p>}

          {/* --- the run: what the agent read and proposed --- */}
          <div className="session-headline">
            <IconStack size={14} />
            <span>{headline || (booted ? "No significant activity recorded yet." : "Reading the run…")}</span>
          </div>
          {since && (
            <p className="settings-hint" style={{ padding: "0 8px" }}>
              Run started {since}
            </p>
          )}

          {top.length > 0 && (
            <div className="session-topsites">
              {top.map((t) => (
                <div className="session-site" key={t.host}>
                  <span className="session-site-host">{t.host}</span>
                  <span className="session-site-bar">
                    <span className="session-site-fill" style={{ width: `${Math.max(2, t.pct)}%` }} />
                  </span>
                  <span className="session-site-pct">{t.pct}%</span>
                </div>
              ))}
            </div>
          )}

          <div className="settings-row">
            <span className="settings-label" style={{ flex: 1 }}>Time in run</span>
            <span className="settings-sub">{summary ? minutes(summary.totalMs ?? 0) : "—"}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label" style={{ flex: 1 }}>Interactions · downloads</span>
            <span className="settings-sub">
              {summary ? `${summary.interactions ?? 0} · ${summary.downloads ?? 0}` : "—"}
            </span>
          </div>
          <div className="settings-row">
            <span className="settings-label" style={{ flex: 1 }}>Writes proposed</span>
            <span className="settings-sub">
              {summary
                ? `${runWrites} proposed · ${approved} granted${
                    runWrites - approved > 0 ? ` · ${runWrites - approved} unapproved` : ""
                  }`
                : "—"}
            </span>
          </div>

          {items.length > 0 && (
            <>
              <div className="session-divider">Carry forward</div>
              <ul className="session-items">
                {items.map((it, i) => (
                  <li key={`${it.kind}-${i}`}>
                    <IconCheck size={11} />
                    <span>{describeItem(it)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* --- the evidence: the writes, from the chain --- */}
          <div className="session-divider">
            Evidence
            {chain && (
              <span
                className="session-chain"
                style={{ color: chain.ok ? "var(--text-dim)" : "var(--danger, #e5534b)" }}
              >
                {chain.ok ? `chain ok · ${chain.checked}` : `broken #${chain.brokenAt}`}
              </span>
            )}
          </div>
          {!booted ? (
            <p className="settings-hint" style={{ padding: 8 }}>Reading the chain…</p>
          ) : writes.length === 0 ? (
            <p className="settings-hint" style={{ padding: 8 }}>
              No page writes in this run. Reads are free and always allowed — only writes
              need your grant, so only writes appear here.
            </p>
          ) : (
            <ul className="session-evidence">
              {writes.map((w) => (
                <li className="session-write" key={w.seq}>
                  <span className={`session-write-dot${w.allowed ? " is-ok" : " is-denied"}`} />
                  <span className="session-write-op" title={w.fp || ""}>
                    {w.summary || w.op}
                    {w.target && <span className="session-write-host">{hostOf(w.target)}</span>}
                  </span>
                  <span className="session-write-who">
                    {w.allowed ? (w.actor === "user" ? "you granted" : "granted") : w.reason || "denied"}
                  </span>
                  <span className="session-write-fp" title={`hash ${w.hash}`}>
                    {w.hash.slice(0, 8)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* --- continuity: sessions this machine can bring back --- */}
          <div className="session-divider">
            Continuity
            {metrics && (
              <span className="session-chain">
                {metrics.sessionsRestored} restored in {metrics.windowDays}d
              </span>
            )}
          </div>
          {sessions.length === 0 ? (
            <p className="settings-hint" style={{ padding: 8 }}>
              No saved sessions yet — press ⟲ in the chrome to checkpoint the current tabs.
            </p>
          ) : (
            <ul className="session-recent">
              {sessions.map((s) => (
                <li key={s.id}>
                  <IconRestore size={12} />
                  <span className="session-recent-time">{formatWhen(s.saved_at)}</span>
                  <span className="session-recent-hosts">
                    {[...new Set(s.tabs.map((t) => hostOf(t.url)))].slice(0, 3).join(" · ")}
                  </span>
                  <span className="session-recent-tabs">{s.tabs.length} tabs</span>
                </li>
              ))}
            </ul>
          )}

          {boundary && (
            <div className="settings-row">
              <span className="settings-label" style={{ flex: 1 }}>Boundary (all time)</span>
              <span className="settings-sub">
                {boundary.reads} reads · {boundary.writes} writes · {boundary.denied} denied
              </span>
            </div>
          )}
        </div>

        <div className="settings-foot">
          {confirmClear ? (
            <>
              <span className="settings-hint" style={{ flex: 1 }}>
                Clear the run summary? The audit chain is not affected.
              </span>
              <button className="settings-btn" onClick={() => setConfirmClear(false)}>Cancel</button>
              <button className="settings-btn is-primary" onClick={clearRun}>Clear run</button>
            </>
          ) : (
            <>
              <button className="settings-btn" onClick={() => setConfirmClear(true)} title="Start a fresh run">
                Clear run
              </button>
              <span style={{ flex: 1 }} />
              <button className="settings-btn" onClick={load}>Refresh</button>
              <button className="settings-btn is-primary" onClick={exportRun} title="Copy the manifest + chain">
                <IconVault size={12} /> Export evidence
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
