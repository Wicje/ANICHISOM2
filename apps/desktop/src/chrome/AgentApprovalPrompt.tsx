import { useEffect, useState } from "react";
import { api } from "../lib/tauri-bridge";
import { useChromeModal } from "../lib/chrome-modal";
import type { AgentApproval } from "../lib/tauri-bridge";
import { toast } from "../lib/toast";
import { IconCheck, IconClose, IconVault } from "../components/icons";

interface AgentApprovalPromptProps {
  open: boolean;
  onClose: () => void;
  request: AgentApproval | null;
}

/** "12 Sep, 14:03:22" — absolute, because an audit decision needs an exact time. */
function stamp(ms: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * The human half of the trust boundary (ADR-012). An agent asked to write;
 * nothing has happened yet. Approving mints a single-use grant bound to this
 * exact action fingerprint — the agent cannot widen it afterwards.
 */
export function AgentApprovalPrompt({ open, onClose, request }: AgentApprovalPromptProps) {
  const [busy, setBusy] = useState(false);
  useChromeModal("agent-approval", open);

  useEffect(() => {
    if (!open) setBusy(false);
  }, [open]);

  if (!open || !request) return null;

  const decide = (approve: boolean) => {
    setBusy(true);
    const call = approve ? api.agentApprove(request.id) : api.agentDeny(request.id);
    void call.then((r) => {
      setBusy(false);
      if ("error" in r && r.error) {
        toast(`Approval failed: ${r.error}`, "danger");
        return;
      }
      toast(approve ? "Approved — one action, once" : "Denied");
      onClose();
    });
  };

  return (
    <div className="downloads-overlay" onMouseDown={busy ? undefined : onClose}>
      <div
        className="downloads-panel"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Agent approval"
        style={{ width: "min(420px, 92vw)" }}
      >
        <div className="downloads-head">
          <span className="downloads-title" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <IconVault size={15} />
            Agent wants to act
          </span>
          <button className="downloads-close" onClick={onClose} disabled={busy} title="Close">
            <IconClose size={14} />
          </button>
        </div>
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <p className="settings-hint" style={{ padding: 0 }}>
            An automated agent asked to <strong>write</strong> to this page. Nothing has
            changed yet. Approving allows this one action, once — it cannot be reused.
          </p>
          <div className="settings-row" style={{ borderBottom: "none", padding: "6px 0" }}>
            <span className="settings-label" style={{ flex: 1 }}>
              Action
            </span>
            <span className="settings-sub" style={{ fontFamily: "ui-monospace, Menlo, monospace", color: "var(--text)" }}>
              {request.describe}
            </span>
          </div>
          {request.url && (
            <div className="settings-row" style={{ borderBottom: "none", padding: "6px 0" }}>
              <span className="settings-label" style={{ flex: 1 }}>
                Page
              </span>
              <span
                className="settings-sub"
                style={{ flex: 1, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                title={request.url}
              >
                {request.url}
              </span>
            </div>
          )}
          <div className="settings-row" style={{ borderBottom: "none", padding: "6px 0" }}>
            <span className="settings-label" style={{ flex: 1 }}>
              Asked
            </span>
            <span className="settings-sub">{stamp(request.ts)}</span>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
            <button className="settings-btn" disabled={busy} onClick={() => decide(false)}>
              Deny
            </button>
            <button className="settings-btn is-primary" disabled={busy} onClick={() => decide(true)}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <IconCheck size={13} />
                Approve once
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}