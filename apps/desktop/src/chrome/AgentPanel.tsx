import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "../lib/tauri-bridge";
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
} from "../components/icons";

type AgentTab = "approvals" | "activity" | "chat" | "permissions";

interface ApprovalRequest {
  id: string;
  action: string;
  url: string;
  timestamp: number;
  expiresAt: number;
  status: "pending" | "approved" | "denied";
}

interface ActivityEntry {
  id: string;
  type: "navigate" | "click" | "input" | "agent_action";
  description: string;
  timestamp: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  granted: boolean;
  scope: "global" | "per-action";
}

const INITIAL_APPROVALS: ApprovalRequest[] = [
  {
    id: "apr-1",
    action: "Fill login form",
    url: "https://github.com/login",
    timestamp: Date.now() - 120000,
    expiresAt: Date.now() + 180000,
    status: "pending",
  },
  {
    id: "apr-2",
    action: "Click 'Submit' button",
    url: "https://example.com/form",
    timestamp: Date.now() - 60000,
    expiresAt: Date.now() + 240000,
    status: "pending",
  },
];

const INITIAL_ACTIVITY: ActivityEntry[] = [
  { id: "act-1", type: "navigate", description: "Navigated to github.com", timestamp: Date.now() - 300000 },
  { id: "act-2", type: "click", description: "Clicked 'Sign in' button", timestamp: Date.now() - 240000 },
  { id: "act-3", type: "input", description: "Typed in username field", timestamp: Date.now() - 180000 },
  { id: "act-4", type: "agent_action", description: "Agent requested form fill permission", timestamp: Date.now() - 120000 },
  { id: "act-5", type: "navigate", description: "Navigated to example.com", timestamp: Date.now() - 60000 },
];

const INITIAL_PERMISSIONS: Permission[] = [
  { id: "perm-1", name: "Read page content", description: "Allow agent to read and analyze page content", granted: true, scope: "global" },
  { id: "perm-2", name: "Fill forms", description: "Allow agent to fill and submit forms", granted: false, scope: "per-action" },
  { id: "perm-3", name: "Click elements", description: "Allow agent to click buttons and links", granted: false, scope: "per-action" },
  { id: "perm-4", name: "Access bookmarks", description: "Allow agent to read bookmarks", granted: true, scope: "global" },
  { id: "perm-5", name: "Manage downloads", description: "Allow agent to initiate downloads", granted: false, scope: "per-action" },
];

export function AgentPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<AgentTab>("approvals");
  const [approvals, setApprovals] = useState(INITIAL_APPROVALS);
  const [activity] = useState(INITIAL_ACTIVITY);
  const [permissions, setPermissions] = useState(INITIAL_PERMISSIONS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      role: "agent",
      content: "I'm ready to help. I can see your browsing activity and assist with tasks. What would you like me to do?",
      timestamp: Date.now() - 120000,
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useChromeModal("agent-panel", open);

  const pendingCount = approvals.filter((a) => a.status === "pending").length;

  useEffect(() => {
    if (open) {
      void api.agentPendingApprovals?.().then((rows) => {
        if (rows && rows.length > 0) {
          setApprovals(rows as unknown as ApprovalRequest[]);
        }
      }).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleApprove = useCallback((id: string) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "approved" as const } : a))
    );
    void api.agentApprove?.(id).then((r: { ok?: boolean; error?: string }) => {
      if (r?.ok) toast("Allowed once — the agent can do this one thing");
      else if (r?.error) toast(`Failed: ${r.error}`, "danger");
    }).catch(() => {});
  }, []);

  const handleDeny = useCallback((id: string) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "denied" as const } : a))
    );
    void api.agentDeny?.(id).then((r: { ok?: boolean; error?: string }) => {
      if (r?.ok) toast("Denied — the agent was told no");
      else if (r?.error) toast(`Failed: ${r.error}`, "danger");
    }).catch(() => {});
  }, []);

  const handleTogglePermission = useCallback((id: string) => {
    setPermissions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, granted: !p.granted } : p))
    );
  }, []);

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
        content: "I understand. I'll help you with that. Let me know if you need me to take any specific action on this page.",
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, agentMsg]);
    }, 800);
  }, [chatInput]);

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatCountdown = (expiresAt: number) => {
    const left = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    if (left === 0) return "expired";
    return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  };

  const tabs: { id: AgentTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "approvals", label: "Approvals", icon: <IconVault size={13} />, badge: pendingCount },
    { id: "activity", label: "Activity", icon: <IconStack size={13} /> },
    { id: "chat", label: "Chat", icon: <IconSpark size={13} /> },
    { id: "permissions", label: "Permissions", icon: <IconVault size={13} /> },
  ];

  if (!open) return null;

  return (
    <div className="agent-panel">
      <div className="agent-panel-header">
        <div className="agent-panel-title">
          <IconBot size={15} />
          <span>Agent</span>
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
            {tab.badge && tab.badge > 0 && (
              <span className="agent-tab-badge">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      <div className="agent-panel-content">
        {activeTab === "approvals" && (
          <div className="agent-section">
            {approvals.length === 0 && (
              <div className="agent-empty">
                <IconCheck size={28} />
                <p>No pending approvals</p>
              </div>
            )}
            {approvals.map((approval) => (
              <div
                key={approval.id}
                className={`agent-approval agent-approval--${approval.status}`}
              >
                <div className="agent-approval-info">
                  <div className="agent-approval-title">
                    {approval.status === "pending" && <IconClock size={11} />}
                    {approval.status === "approved" && <IconCheck size={11} />}
                    {approval.status === "denied" && <IconClose size={11} />}
                    <span>{approval.action}</span>
                  </div>
                  <div className="agent-approval-url">{approval.url}</div>
                  <div className="agent-approval-time">
                    {formatTime(approval.timestamp)}
                    {approval.status === "pending" && (
                      <span className="agent-approval-countdown">
                        {formatCountdown(approval.expiresAt)}
                      </span>
                    )}
                  </div>
                </div>
                {approval.status === "pending" && (
                  <div className="agent-approval-actions">
                    <button
                      className="agent-btn agent-btn--deny"
                      onClick={() => handleDeny(approval.id)}
                    >
                      <IconClose size={12} />
                    </button>
                    <button
                      className="agent-btn agent-btn--approve"
                      onClick={() => handleApprove(approval.id)}
                    >
                      <IconCheck size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "activity" && (
          <div className="agent-section">
            {activity.map((entry) => (
              <div key={entry.id} className="agent-activity-entry">
                <div className={`agent-activity-icon agent-activity-icon--${entry.type}`}>
                  {entry.type === "agent_action" ? <IconBot size={11} /> : <IconStack size={11} />}
                </div>
                <div className="agent-activity-body">
                  <div className="agent-activity-desc">{entry.description}</div>
                  <div className="agent-activity-time">{formatTime(entry.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "chat" && (
          <div className="agent-chat">
            <div className="agent-chat-messages">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`agent-chat-msg agent-chat-msg--${msg.role}`}
                >
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
                placeholder="Message agent..."
              />
              <button onClick={handleSendMessage} className="agent-chat-send">
                <IconSpark size={13} />
              </button>
            </div>
          </div>
        )}

        {activeTab === "permissions" && (
          <div className="agent-section">
            {permissions.map((perm) => (
              <div key={perm.id} className="agent-permission">
                <div className="agent-permission-icon">
                  {perm.granted ? <IconCheck size={13} /> : <IconClose size={13} />}
                </div>
                <div className="agent-permission-body">
                  <div className="agent-permission-header">
                    <span className="agent-permission-name">{perm.name}</span>
                    <span className="agent-permission-scope">{perm.scope}</span>
                  </div>
                  <div className="agent-permission-desc">{perm.description}</div>
                </div>
                <button
                  className={`agent-toggle${perm.granted ? " is-on" : ""}`}
                  onClick={() => handleTogglePermission(perm.id)}
                >
                  <span className="agent-toggle-knob" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
