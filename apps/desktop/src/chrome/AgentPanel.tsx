import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "../lib/tauri-bridge";
import type {
  AgentApproval,
  AgentAuditEntry,
  AgentAuditSummary,
  AuditChainState,
} from "../lib/tauri-bridge";
import { useChromeModal } from "../lib/chrome-modal";
import { toast } from "../lib/toast";
import {
  IconVault,
  IconCheck,
  IconClose,
  IconClock,
  IconBot,
  IconSpark,
  IconStack,
  IconUser,
} from "../components/icons";

type AgentTab = "approvals" | "activity" | "chat" | "permissions";

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
}

/**
 * The boundary rules are fixed, not settings. This is the honest surface: it
 * states what an agent may do and shows what it actually did, rather than a row
 * of switches that imply a permission the policy engine does not grant. Every
 * number here is read from the live audit chain (`agent_stats`), so it is the
 * same evidence an auditor sees, not a mock.
 */
interface BoundaryRule {
  id: string;
  name: string;
  description: string;
  /** "free" = no gate · "grant" = single-use user grant · "user" = user-only */
  gate: "free" | "grant" | "user";
  stat: (s: AgentAuditSummary | null) => string;
}

function hostOf(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function AgentPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<AgentTab>("approvals");
  const [approvals, setApprovals] = useState<AgentApproval[]>([]);
  const [approvalsBooted, setApprovalsBooted] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [entries, setEntries] = useState<AgentAuditEntry[]>([]);
  const [chain, setChain] = useState<AuditChainState | null>(null);
  const [summary, setSummary] = useState<AgentAuditSummary | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activityBooted, setActivityBooted] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      role: "agent",
      content:
        "I can read any tab, but every change I make needs a one-time approval from you. Ask me something, or watch the Approval tab.",
      timestamp: Date.now() - 120000,
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useChromeModal("agent-panel", open);

  const pendingCount = approvals.length;

  // Live approvals for the active profile. The host drops expired ones, so a
  // request that timed out between polls disappears on the next refresh.
  const loadApprovals = useCallback(() => {
    void api
      .agentPendingApprovals()
      .then((rows) => {
        setApprovals(rows ?? []);
        setApprovalsBooted(true);
      })
      .catch(() => setApprovalsBooted(true));
  }, []);

  // The audit chain is the source of truth for the Activity and Permissions
  // tabs. Same call the "Managers → Agent audit" surface uses.
  const loadAudit = useCallback(() => {
    void api
      .auditLogQuery(200)
      .then((res) => {
        const r = res as {
          entries?: AgentAuditEntry[];
          chain?: AuditChainState;
          summary?: AgentAuditSummary;
          error?: string;
        };
        if (r.error) {
          setActivityError(r.error);
          setActivityBooted(true);
          return;
        }
        setEntries(r.entries ?? []);
        setChain(r.chain ?? null);
        setSummary(r.summary ?? null);
        setActivityError(null);
        setActivityBooted(true);
      });
  }, []);

  useEffect(() => {
    if (!open) return;
    loadApprovals();
    loadAudit();
  }, [open, loadApprovals, loadAudit]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, activeTab]);

  const handleApprove = useCallback(
    (id: string, describe: string) => {
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      void api
        .agentApprove(id)
        .then((r: { ok?: boolean; error?: string }) => {
          if (r?.ok) toast(`Allowed once — “${describe}”`);
          else if (r?.error) toast(`Failed: ${r.error}`, "danger");
          loadAudit();
        })
        .catch(() => {});
    },
    [loadAudit]
  );

  const handleDeny = useCallback(
    (id: string, describe: string) => {
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      void api
        .agentDeny(id)
        .then((r: { ok?: boolean; error?: string }) => {
          if (r?.ok) toast(`Denied — the agent was told no to “${describe}”`);
          else if (r?.error) toast(`Failed: ${r.error}`, "danger");
          loadAudit();
        })
        .catch(() => {});
    },
    [loadAudit]
  );

  const handleSendMessage = useCallback(() => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: chatInput.trim(),
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");

    setTimeout(() => {
      const agentMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "agent",
        content:
          "Chat is not wired to a model here yet — the boundary is. I can see your tabs and the audit trail; anything that changes a page will queue for your approval.",
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, agentMsg]);
    }, 700);
  }, [chatInput]);

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatCountdown = (expiresAt: number | undefined) => {
    if (!expiresAt) return "";
    const left = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    if (left === 0) return "expired";
    return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  };

  const RULES: BoundaryRule[] = [
    {
      id: "read",
      name: "Read any tab",
      description:
        "Reading page text, tabs, history and screenshots is free and always allowed. Reads never touch a grant.",
      gate: "free",
      stat: (s) => (s ? `${s.reads} reads logged` : "—"),
    },
    {
      id: "write",
      name: "Change a page",
      description:
        "Clicks, typing, navigation and form fills each need a one-time grant bound to that exact action. Page content can never approve itself.",
      gate: "grant",
      stat: (s) =>
        s
          ? `${s.granted} granted · ${s.denied} denied${
              s.approvalRate == null ? "" : ` · ${s.approvalRate}% approved`
            }`
          : "—",
    },
    {
      id: "user",
      name: "Credentials & the log itself",
      description:
        "Sync keys and the audit chain (approve, deny, export, verify) can only be touched from this UI. No agent path exists, by design.",
      gate: "user",
      stat: (s) => (s ? `${s.forbidden} attempts refused` : "—"),
    },
  ];

  const activity = [...entries].reverse();

  const tabs: { id: AgentTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "approvals", label: "Approvals", icon: <IconVault size={13} />, badge: pendingCount },
    { id: "activity", label: "Activity", icon: <IconStack size={13} /> },
    { id: "chat", label: "Chat", icon: <IconSpark size={13} /> },
    { id: "permissions", label: "Boundary", icon: <IconVault size={13} /> },
  ];

  if (!open) return null;

  return (
    <div className="agent-panel">
      <div className="agent-panel-header">
        <div className="agent-panel-title">
          <IconBot size={15} />
          <span>Agent</span>
          {chain && (
            <span
              className="agent-chain-pill"
              title={
                chain.ok
                  ? `Hash chain verified across ${chain.checked} entries`
                  : `Chain broken at #${chain.brokenAt}`
              }
              style={{ color: chain.ok ? "var(--text-dim)" : "var(--danger, #e5534b)" }}
            >
              {chain.ok ? "chain ok" : `broken #${chain.brokenAt}`}
            </span>
          )}
        </div>
        <button className="agent-panel-close" onClick={onClose} title="Close agent panel">
          <IconClose size={14} />
        </button>
      </div>

      <div className="agent-panel-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`agent-tab${activeTab === tab.id ? " is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge && tab.badge > 0 && <span className="agent-tab-badge">{tab.badge}</span>}
          </button>
        ))}
      </div>

      <div className="agent-panel-content">
        {activeTab === "approvals" && (
          <div className="agent-section">
            {!approvalsBooted ? (
              <p className="agent-note">Checking for requests…</p>
            ) : approvals.length === 0 ? (
              <div className="agent-empty">
                <IconCheck size={28} />
                <p>No pending approvals</p>
                <span className="agent-note">
                  When an agent tries to change a page, the request lands here with the exact
                  action it is bound to.
                </span>
              </div>
            ) : (
              approvals.map((approval) => {
                const isOpen = expanded === approval.id;
                return (
                  <div
                    key={approval.id}
                    className={`agent-approval agent-approval--pending${
                      isOpen ? " is-expanded" : ""
                    }`}
                  >
                    <div className="agent-approval-info">
                      <button
                        className="agent-approval-title agent-approval-toggle"
                        onClick={() => setExpanded(isOpen ? null : approval.id)}
                        title="Show what this grant is bound to"
                      >
                        <IconClock size={11} />
                        <span>{approval.describe || approval.op}</span>
                      </button>
                      {approval.url && (
                        <div className="agent-approval-url">{hostOf(approval.url)}</div>
                      )}
                      <div className="agent-approval-time">
                        {formatTime(approval.ts)}
                        {approval.expiresAt && (
                          <span className="agent-approval-countdown">
                            {formatCountdown(approval.expiresAt)}
                          </span>
                        )}
                      </div>

                      {isOpen && (
                        <div className="agent-approval-detail">
                          <div className="agent-detail-row">
                            <span className="agent-detail-key">op</span>
                            <span className="agent-detail-val">{approval.op}</span>
                          </div>
                          {approval.detail && (
                            <div className="agent-detail-row">
                              <span className="agent-detail-key">action</span>
                              <span className="agent-detail-val">{approval.detail}</span>
                            </div>
                          )}
                          {approval.tab && (
                            <div className="agent-detail-row">
                              <span className="agent-detail-key">tab</span>
                              <span className="agent-detail-val">{approval.tab}</span>
                            </div>
                          )}
                          {approval.url && (
                            <div className="agent-detail-row">
                              <span className="agent-detail-key">target</span>
                              <span className="agent-detail-val">{approval.url}</span>
                            </div>
                          )}
                          <div className="agent-detail-row">
                            <span className="agent-detail-key">fingerprint</span>
                            <span
                              className="agent-detail-val agent-detail-fp"
                              title={approval.fingerprint}
                            >
                              {approval.fingerprint}
                            </span>
                          </div>
                          <p className="agent-detail-note">
                            The grant is bound to this fingerprint. If the page changes before
                            you approve, the fingerprint no longer matches and the agent must ask
                            again — approval cannot be replayed onto a different action.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="agent-approval-actions">
                      <button
                        className="agent-btn agent-btn--deny"
                        onClick={() => handleDeny(approval.id, approval.describe || approval.op)}
                        title="Deny"
                      >
                        <IconClose size={12} />
                      </button>
                      <button
                        className="agent-btn agent-btn--approve"
                        onClick={() => handleApprove(approval.id, approval.describe || approval.op)}
                        title="Approve once"
                      >
                        <IconCheck size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "activity" && (
          <div className="agent-section">
            <div className="agent-section-head">
              <span className="agent-note">
                {summary
                  ? `${summary.total} decisions · ${summary.reads} reads · ${summary.writes} writes · ${summary.denied} denied`
                  : "Reading the chain…"}
              </span>
              <button className="agent-refresh" onClick={loadAudit} title="Refresh">
                <IconStack size={12} />
              </button>
            </div>
            {activityError ? (
              <p className="agent-note is-danger">{activityError}</p>
            ) : !activityBooted ? (
              <p className="agent-note">Reading the chain…</p>
            ) : activity.length === 0 ? (
              <div className="agent-empty">
                <IconStack size={28} />
                <p>Nothing logged yet</p>
                <span className="agent-note">
                  Every decision — allowed or denied — is appended here as it happens.
                </span>
              </div>
            ) : (
              activity.slice(0, 120).map((entry) => (
                <div key={entry.seq} className="agent-activity-entry">
                  <div
                    className={`agent-activity-icon agent-activity-icon--${
                      entry.allowed ? "ok" : "denied"
                    }`}
                  >
                    {entry.allowed ? <IconCheck size={11} /> : <IconClose size={11} />}
                  </div>
                  <div className="agent-activity-body">
                    <div className="agent-activity-desc">
                      {entry.summary || entry.op}
                      {entry.target && (
                        <span className="agent-activity-host">{hostOf(entry.target)}</span>
                      )}
                    </div>
                    <div className="agent-activity-time">
                      #{entry.seq} · {formatTime(entry.ts)} ·{" "}
                      {entry.allowed
                        ? entry.tier === "write"
                          ? "allowed"
                          : "read"
                        : entry.reason || "denied"}{" "}
                      · {entry.actor === "user" ? "you" : entry.actor === "page" ? "page" : "ai"}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "chat" && (
          <div className="agent-chat">
            <div className="agent-chat-messages">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`agent-chat-msg agent-chat-msg--${msg.role}`}>
                  {msg.role === "agent" && (
                    <div className="agent-chat-msg-label">
                      <IconBot size={10} />
                      <span>Agent</span>
                    </div>
                  )}
                  <div className="agent-chat-msg-bubble">{msg.content}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="agent-chat-input">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Message agent…"
              />
              <button onClick={handleSendMessage} className="agent-chat-send">
                <IconSpark size={13} />
              </button>
            </div>
          </div>
        )}

        {activeTab === "permissions" && (
          <div className="agent-section">
            <p className="agent-note">
              These are the boundary's rules, not toggles. Continua grants an agent no standing
              authority — the numbers are read live from the audit chain.
            </p>
            {RULES.map((rule) => (
              <div key={rule.id} className="agent-permission">
                <div className="agent-permission-icon">
                  {rule.gate === "free" ? (
                    <IconCheck size={13} />
                  ) : rule.gate === "grant" ? (
                    <IconVault size={13} />
                  ) : (
                    <IconUser size={13} />
                  )}
                </div>
                <div className="agent-permission-body">
                  <div className="agent-permission-header">
                    <span className="agent-permission-name">{rule.name}</span>
                    <span className="agent-permission-scope">
                      {rule.gate === "free" ? "free" : rule.gate === "grant" ? "grant" : "user-only"}
                    </span>
                  </div>
                  <div className="agent-permission-desc">{rule.description}</div>
                  <div className="agent-permission-stat">{rule.stat(summary)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
