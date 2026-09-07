import { useEffect, useState } from "react";
import { api, displayTitle } from "../lib/tauri-bridge";
import type { DeviceInfo, SessionSummary, TabRecord } from "../lib/tauri-bridge";
import { Favicon } from "../components/Favicon";

interface NewTabProps {
  onResume: (id?: string) => Promise<void>;
  onOpen: (url: string) => Promise<void>;
}

function formatStamp(secs: number): string {
  const d = new Date(secs * 1000);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Today ${time}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + ` ${time}`;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function NewTab({ onResume, onOpen }: NewTabProps) {
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [lastSession, setLastSession] = useState<TabRecord[] | null>(null);
  const [memory, setMemory] = useState<SessionSummary[]>([]);
  const [continuaUrl, setContinuaUrl] = useState("…");

  useEffect(() => {
    void api.deviceInfo().then(setDevice);
    void api.loadSession().then(setLastSession);
    void api.browseSessions().then(setMemory);
    void api.getContinuaUrl().then(setContinuaUrl);
  }, []);

  const quickLinks = [
    { label: "Desktop", url: "https://continuaos.cc/os/shell" },
    { label: "Dashboard", url: "https://continuaos.cc" },
    { label: "Workspace", url: "https://continuaos.cc/workspace" },
    { label: "Vault", url: "https://continuaos.cc/vault" },
  ];

  const memories = memory.filter((m) => m.tabs.length > 0).slice(0, 6);

  return (
    <div className="start-page">
      <div className="start-hero">
        <div className="brand-mark start-mark">◈</div>
        <h1 className="start-title">Your workspace follows you.</h1>
        <p className="start-sub">
          One workspace in your pocket — open a page here, resume it on
          another machine.
        </p>
        <div className="start-hero-foot">
          <span className="hero-chip">Continua Browser</span>
          <span className="hero-chip">{continuaUrl}</span>
          <span className="hero-chip">
            {device ? `${device.os} · ${device.arch}` : "detecting device…"}
          </span>
        </div>
      </div>

      <div className="start-grid">
        <section className="start-card" aria-label="Resume">
          <div className="start-card-title">
            <span>Resume</span>
            {lastSession && lastSession.length > 0 && (
              <span className="start-card-count">{lastSession.length} tabs</span>
            )}
          </div>
          {lastSession && lastSession.length > 0 ? (
            <>
              <ul className="resume-list">
                {lastSession.slice(-5).reverse().map((tab, i) => (
                  <li key={`${tab.url}-${i}`}>
                    <Favicon url={tab.url} />
                    <button className="resume-link" onClick={() => void onOpen(tab.url)}>
                      {tab.title || displayTitle(tab.url)}
                    </button>
                  </li>
                ))}
              </ul>
              <button className="start-cta" onClick={() => void onResume()}>
                Restore session
              </button>
            </>
          ) : (
            <p className="start-empty">
              No saved session yet — press the ⟲ button in the chrome once you have
              tabs open.
            </p>
          )}
        </section>

        <section className="start-card" aria-label="Memory">
          <div className="start-card-title">
            <span>Memory</span>
            {memories.length > 0 && (
              <span className="start-card-count">{memories.length} checkpoints</span>
            )}
          </div>
          {memories.length > 0 ? (
            <ul className="memory-list">
              {memories.map((m) => (
                <li key={m.id}>
                  <button className="memory-row" onClick={() => void onResume(m.id)}>
                    <span className="memory-time">{formatStamp(m.saved_at)}</span>
                    <span className="memory-hosts">
                      {[...new Set(m.tabs.map((t) => hostOf(t.url)))]
                        .slice(0, 3)
                        .join(" · ")}
                    </span>
                    <span className="memory-tabs">{m.tabs.length} tabs</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="start-empty">
              Each saved session becomes a checkpoint you can reopen, even after
              restarts.
            </p>
          )}
        </section>

        <section className="start-card" aria-label="Quick links">
          <div className="start-card-title">
            <span>Quick access</span>
          </div>
          <ul className="resume-list">
            {quickLinks.map((q) => (
              <li key={q.url}>
                <span className="tab-favicon">⌁</span>
                <button className="resume-link" onClick={() => void onOpen(q.url)}>
                  {q.label}
                </button>
              </li>
            ))}
            </ul>
            <div className="start-card-sub">
              {continuaUrl} · {device ? `${device.os}/${device.arch}` : "detecting…"}
            </div>
        </section>
      </div>
    </div>
  );
}