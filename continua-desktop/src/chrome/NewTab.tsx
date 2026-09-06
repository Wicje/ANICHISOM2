import { useEffect, useState } from "react";
import { api } from "../lib/tauri-bridge";
import type { DeviceInfo, TabRecord } from "../lib/tauri-bridge";

interface NewTabProps {
  onResume: () => Promise<void>;
  onOpen: (url: string) => Promise<void>;
}

export function NewTab({ onResume, onOpen }: NewTabProps) {
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [lastSession, setLastSession] = useState<TabRecord[] | null>(null);
  const [continuaUrl, setContinuaUrl] = useState("…");

  useEffect(() => {
    void api.deviceInfo().then(setDevice);
    void api.loadSession().then(setLastSession);
    void api.getContinuaUrl().then(setContinuaUrl);
  }, []);

  const quickLinks = [
    { label: "Desktop", url: "https://continuaos.cc/os/shell" },
    { label: "Dashboard", url: "https://continuaos.cc" },
    { label: "Workspace", url: "https://continuaos.cc/workspace" },
    { label: "Vault", url: "https://continuaos.cc/vault" },
  ];

  return (
    <div className="start-page">
      <div className="start-hero">
        <div className="brand-mark start-mark">C</div>
        <h1 className="start-title">Your workspace follows you.</h1>
        <p className="start-sub">
          Open a page or resume where you left off on another machine.
        </p>
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
                      {titleFor(tab.url)}
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

function titleFor(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Favicon({ url }: { url: string }) {
  try {
    const u = new URL(url);
    return (
      <img
        className="tab-favicon"
        src={`${u.protocol}//${u.host}/favicon.ico`}
        alt=""
        onError={(e) => {
          e.currentTarget.style.visibility = "hidden";
        }}
      />
    );
  } catch {
    return <span className="tab-favicon">🌐</span>;
  }
}