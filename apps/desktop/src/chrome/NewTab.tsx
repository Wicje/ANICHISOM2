import { useEffect, useMemo, useState } from "react";
import { api, displayTitle } from "../lib/tauri-bridge";
import type {
  DeviceInfo,
  HistoryItem,
  SessionSummary,
  TabRecord,
} from "../lib/tauri-bridge";
import { Favicon } from "../components/Favicon";
import { IconStar, IconStarFilled } from "../components/icons";

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

interface TopSite {
  url: string;
  host: string;
  pinned: boolean;
}

export function NewTab({ onResume, onOpen }: NewTabProps) {
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [lastSession, setLastSession] = useState<TabRecord[] | null>(null);
  const [memory, setMemory] = useState<SessionSummary[]>([]);
  const [continuaUrl, setContinuaUrl] = useState("…");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [speedDial, setSpeedDial] = useState<string[]>([]);

  useEffect(() => {
    void api.deviceInfo().then(setDevice);
    void api.loadSession().then(setLastSession);
    void api.browseSessions().then(setMemory);
    void api.getContinuaUrl().then(setContinuaUrl);
    void api.getHistory().then(setHistory);
    void api.getBrowserConfig().then((c) => setSpeedDial(c?.speed_dial ?? []));
  }, []);

  // Pinned speed-dial tiles first, then the hosts visited most from history.
  const topSites = useMemo<TopSite[]>(() => {
    const pins = speedDial.map((url) => ({
      url,
      host: hostOf(url),
      pinned: true,
    }));
    const pinnedHosts = new Set(pins.map((p) => p.host));
    const counts = new Map<string, { n: number; url: string }>();
    for (const h of history) {
      if (!/^https?:\/\//i.test(h.url)) continue;
      const host = hostOf(h.url);
      const cur = counts.get(host);
      if (cur) cur.n++;
      else counts.set(host, { n: 1, url: h.url });
    }
    const visited = [...counts.entries()]
      .filter(([host]) => !pinnedHosts.has(host))
      .sort((a, b) => b[1].n - a[1].n)
      .slice(0, Math.max(0, 8 - pins.length))
      .map(([host, { url }]) => ({ url, host, pinned: false }));
    return [...pins, ...visited].slice(0, 8);
  }, [history, speedDial]);

  const toggleSpeedDial = (url: string, pinned: boolean) => {
    const next = pinned
      ? speedDial.filter((u) => u !== url)
      : [...speedDial, url].slice(0, 12);
    setSpeedDial(next);
    void api.updateConfig({ speed_dial: next });
  };

  const memories = memory.filter((m) => m.tabs.length > 0).slice(0, 6);

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Up late?" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="start-page">
      <div className="start-hero">
        <h1 className="start-title">{greeting} — where to next?</h1>
        <p className="start-sub">
          Resume a session, jump to the top of your day, or just start typing.
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

        <section className="start-card" aria-label="Top sites">
          <div className="start-card-title">
            <span>Top sites</span>
            {topSites.length > 0 && (
              <span className="start-card-count">{topSites.length} tiles</span>
            )}
          </div>
          {topSites.length > 0 ? (
            <div className="topsites-grid">
              {topSites.map((s) => (
                <div className={`topsite${s.pinned ? " is-pinned" : ""}`} key={s.url}>
                  <button
                    className="topsite-open"
                    onClick={() => void onOpen(s.url)}
                    title={s.url}
                  >
                    <span className="topsite-glyph">
                      {s.host[0]?.toUpperCase() ?? "•"}
                    </span>
                    <span className="topsite-host">{s.host}</span>
                  </button>
                  <button
                    className="topsite-pin"
                    title={s.pinned ? "Unpin from speed dial" : "Pin to speed dial"}
                    onClick={() => toggleSpeedDial(s.url, s.pinned)}
                  >
                    {s.pinned ? <IconStarFilled size={12} /> : <IconStar size={12} />}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="start-card-empty">
              Sites you visit often will appear here — pin any tile with ★ to keep it.
            </p>
          )}
          <div className="start-card-sub">
            {continuaUrl} · {device ? `${device.os}/${device.arch}` : "detecting…"}
          </div>
        </section>
      </div>
    </div>
  );
}