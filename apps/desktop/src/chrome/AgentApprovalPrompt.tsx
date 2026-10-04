import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/tauri-bridge";
import { useChromeModal } from "../lib/chrome-modal";
import type { AgentApproval } from "../lib/tauri-bridge";
import { toast } from "../lib/toast";
import { IconCheck, IconClose, IconVault } from "../components/icons";

interface AgentApprovalPromptProps {
  open: boolean;
  request: AgentApproval | null;
  /** How many requests are waiting, so the user knows this is a queue. */
  pendingCount?: number;
  onClose: () => void;
}

/** "12 Sep, 14:03:22" — absolute, because an audit decision needs an exact time. */
function stamp(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString([], {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

/** "4:59 left" — a request that vanishes silently is worse than one that counts down. */
function countdown(ms: number): string {
  if (!ms) return "";
  const left = Math.max(0, Math.floor(ms / 1000));
  if (left === 0) return "expired";
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} left`;
}

/**
 * The human half of the trust boundary (ADR-012). An agent asked to write and
 * nothing has happened yet.
 *
 * Flow decisions, deliberately conservative for a consent surface:
 *  - focus starts on **Deny**, so a stray Enter refuses rather than allows;
 *  - Escape denies too (dismissing a consent prompt must not be neutral —
 *    leaving it open would let the grant be granted minutes later);
 *  - the copy says what a grant *is*: one action, once, not blanket consent;
 *  - a countdown, because the request expires server-side;
 *  - queue position, so several requests don't feel like one.
 */
export function AgentApprovalPrompt({ open, request, pendingCount = 1, onClose }: AgentApprovalPromptProps) {
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const denyRef = useRef<HTMLButtonElement | null>(null);

  useChromeModal("agent-approval", open);

  // Focus the safe option whenever a new request arrives.
  useEffect(() => {
    if (!open) return;
    setBusy(false);
    setNow(Date.now());
    const t = window.setTimeout(() => denyRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, request?.id]);

  // Tick only while the dialog is up, and only when a deadline exists.
  useEffect(() => {
    if (!open || !request?.expiresAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [open, request?.expiresAt]);

  const decide = useCallback(
    (approve: boolean) => {
      if (!request || busy) return;
      setBusy(true);
      const call = approve ? api.agentApprove(request.id) : api.agentDeny(request.id);
      void call.then((r) => {
        setBusy(false);
        if ("error" in r && r.error) {
          // "no-such-request" here means it expired or was answered already —
          // say so plainly rather than leaving the user wondering.
          toast(
            r.error === "request-expired"
              ? "That request expired — nothing was changed"
              : r.error === "no-such-request"
                ? "Already answered — nothing was changed"
                : `Approval failed: ${r.error}`,
            "danger",
          );
          onClose();
          return;
        }
        toast(approve ? "Allowed once — the agent can do this one thing" : "Denied — the agent was told no");
        onClose();
      });
    },
    [request, busy, onClose],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); decide(false); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, decide]);

  if (!open || !request) return null;

  const expired = !!request.expiresAt && request.expiresAt <= now;
  const more = Math.max(0, pendingCount - 1);

  return (
    <div className="consent-overlay" onMouseDown={busy ? undefined : () => decide(false)}>
      <div
        className="consent-panel"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-approval-title"
        aria-describedby="agent-approval-body"
      >
        <div className="consent-head">
          <span id="agent-approval-title" className="consent-title">
            <IconVault size={15} />
            An agent wants to act
          </span>
          <button className="settings-close" onClick={() => decide(false)} disabled={busy} title="Deny (Esc)" aria-label="Deny and close">
            <IconClose size={14} />
          </button>
        </div>

        <div id="agent-approval-body" className="consent-body">
          <p className="settings-hint" style={{ padding: 0 }}>
            An automated agent asked to <strong>write</strong> to this page.
            <strong> Nothing has happened yet.</strong> Allowing it permits this one
            action, once — it cannot be reused or widened.
          </p>

          <div className="consent-facts">
            <div className="consent-fact">
              <span>Action</span>
              <span style={{ fontWeight: 600 }}>{request.describe}</span>
            </div>
            {request.url && (
              <div className="consent-fact">
                <span>Page</span>
                <span title={request.url}>{request.url}</span>
              </div>
            )}
            <div className="consent-fact">
              <span>Asked</span>
              <span>
                {stamp(request.ts)}
                {request.expiresAt ? (
                  <span style={{ marginLeft: 8, color: expired ? "var(--danger, #e5534b)" : undefined }}>
                    {countdown(request.expiresAt - now)}
                  </span>
                ) : null}
              </span>
            </div>
          </div>

          <div className="consent-actions">
            {expired ? (
              <>
                <span className="settings-hint" style={{ color: "var(--danger, #e5534b)" }}>
                  This request expired. Nothing was changed.
                </span>
                <button className="settings-btn is-primary" onClick={onClose}>Close</button>
              </>
            ) : (
              <>
                <span className="settings-hint">
                  {more > 0 ? `${more} more waiting in this profile` : "Nothing else waiting"}
                </span>
                <button ref={denyRef} className="settings-btn" disabled={busy} onClick={() => decide(false)}>
                  Deny
                </button>
                <button className="settings-btn is-primary" disabled={busy} onClick={() => decide(true)}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <IconCheck size={13} />
                    Allow once
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}