import { useEffect, useState } from "react";
import { api } from "../lib/tauri-bridge";
import { useChromeModal } from "../lib/chrome-modal";
import type { BrowserConfigItem, ConfigPatch } from "../lib/tauri-bridge";
import { ENGINES } from "./engine-list";
import { IconClose } from "../components/icons";

interface SettingsPanelProps {
  open: boolean;
  config: BrowserConfigItem | null;
  onPatch: (patch: ConfigPatch) => void;
  onClearHistory: () => void;
  onClose: () => void;
}

const AUTOSAVE_OPTIONS: Array<[number, string]> = [
  [0, "Off"],
  [5, "Every 5 seconds"],
  [10, "Every 10 seconds"],
  [30, "Every 30 seconds"],
  [60, "Every minute"],
  [300, "Every 5 minutes"],
];

const READER_FONTS: Array<[string, string]> = [
  ["serif", "Serif"],
  ["sans", "Sans-serif"],
  ["mono", "Monospace"],
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="settings-row">
      <span className="settings-label">{label}</span>
      <div className="settings-field">{children}</div>
    </div>
  );
}

export function SettingsPanel({
  open,
  config,
  onPatch,
  onClearHistory,
  onClose,
}: SettingsPanelProps) {
  const [draft, setDraft] = useState("");
  const [pin, setPin] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [sync, setSync] = useState<{ paired: boolean; deviceId: string; lastVersion: number; pending?: number; lastSyncAt?: number; lastSyncError?: string | null } | null>(null);
  const [devices, setDevices] = useState<Array<{ id: string; device_name: string; trust_level: string; platform: string; last_seen_at: string }>>([]);
  const [extPath, setExtPath] = useState("");
  const [extensions, setExtensions] = useState<Array<{ id: string; name: string; path: string; enabled?: boolean }>>([]);
  const [extDir, setExtDir] = useState("");
  const [loginsAvail, setLoginsAvail] = useState(false);
  const [logins, setLogins] = useState<Array<{ id: string; origin: string; username: string; addedAt: number }>>([]);
  const [lgUrl, setLgUrl] = useState("");
  const [lgUser, setLgUser] = useState("");
  const [lgPass, setLgPass] = useState("");
  useChromeModal("settings", open);

  const refreshSync = () => {
    void api.syncStatus().then((s) => setSync({ paired: s.paired, deviceId: s.deviceId, lastVersion: s.lastVersion, pending: (s as { pending?: number }).pending, lastSyncAt: (s as { lastSyncAt?: number }).lastSyncAt, lastSyncError: (s as { lastSyncError?: string }).lastSyncError }));
    void api.listDevices().then(setDevices);
    void api.listExtensions().then(setExtensions);
    void api.extensionsDir().then(setExtDir);
    void api.loginStatus().then((s) => setLoginsAvail(!!s.available));
    void api.listLogins().then(setLogins);
  };

  useEffect(() => {
    if (open) {
      setDraft(config?.homepage ?? "");
      setSyncMsg(null);
      void api.getContinuaUrl().then(setServerUrl);
      refreshSync();
      // Live pairing state: approval may arrive from another device.
      const t = window.setInterval(refreshSync, 10000);
      return () => window.clearInterval(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, config]);

  const doPair = async () => {
    const p = pin.trim();
    if (!p) { setSyncMsg("Enter the 6-character PIN from your other device."); return; }
    setSyncMsg("Waiting for approval… (up to 20s)");
    const status = await api.pairDevice(p);
    setSyncMsg(status === "ok" || status === "approved" ? "Paired — cloud sync enabled." : status === "pending" ? "Still pending — approve on your other device, then Pair again." : `Pair: ${status}`);
    refreshSync();
    setPin("");
  };

  const doSaveUrl = async () => {
    const u = serverUrl.trim();
    if (!u) return;
    await api.setContinuaUrl(u);
    setSyncMsg(`Sync server set to ${u}`);
  };

  if (!open) return null;

  const commitHomepage = () => {
    if ((draft ?? "") !== (config?.homepage ?? "")) onPatch({ homepage: draft.trim() });
  };

  return (
    <div className="settings-overlay" onMouseDown={onClose}>
      <div
        className="settings-panel"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Settings"
      >
        <div className="settings-head">
          <span className="settings-title">Settings</span>
<button className="settings-close" onClick={onClose} title="Close (Ctrl+,)">
            <IconClose size={14} />
          </button>
        </div>

        <div className="settings-body">
          <Row label="Search engine">
            <select
              className="settings-select"
              value={config?.search_engine ?? "google"}
              onChange={(e) => onPatch({ search_engine: e.target.value })}
            >
              {ENGINES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </Row>

          <Row label="Theme">
            <div className="settings-seg">
              <button
                className={config?.theme === "dark" ? "is-active" : ""}
                onClick={() => onPatch({ theme: "dark" })}
              >
                Dark
              </button>
              <button
                className={config?.theme === "light" ? "is-active" : ""}
                onClick={() => onPatch({ theme: "light" })}
              >
                Light
              </button>
            </div>
          </Row>

          <Row label="Homepage">
            <input
              className="settings-input"
              value={draft}
              placeholder="empty = built-in new tab"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitHomepage}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                  commitHomepage();
                }
              }}
              spellCheck={false}
            />
          </Row>

          <Row label="Auto-save session">
            <select
              className="settings-select"
              value={config?.autosave_interval ?? 10}
              onChange={(e) => onPatch({ autosave_interval: Number(e.target.value) })}
            >
              {AUTOSAVE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Row>

          <Row label="Reader typeface">
            <select
              className="settings-select"
              value={config?.reader_font ?? "serif"}
              onChange={(e) => onPatch({ reader_font: e.target.value })}
            >
              {READER_FONTS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Row>

          <Row label="Reader width">
            <div className="settings-range">
              <input
                type="range"
                min={400}
                max={1000}
                step={20}
                value={config?.reader_width ?? 720}
                onChange={(e) => onPatch({ reader_width: Number(e.target.value) })}
              />
              <span className="settings-range-val">{config?.reader_width ?? 720}px</span>
            </div>
          </Row>

          <Row label="Link previews in page">
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={Boolean(config?.link_preview)}
                onChange={(e) => onPatch({ link_preview: e.target.checked })}
              />
              <span>Show URL under hovered links</span>
            </label>
          </Row>

          <Row label="Vertical tabs">
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={Boolean(config?.vertical_tabs)}
                onChange={(e) => onPatch({ vertical_tabs: e.target.checked })}
              />
              <span>Pin the tab rail on</span>
            </label>
          </Row>

          <Row label="Browsing data">
            <button className="settings-danger" onClick={onClearHistory}>
              Clear history
            </button>
          </Row>

          <Row label="Sync server">
            <input
              className="settings-input"
              value={serverUrl}
              placeholder="https://your-sync-host"
              onChange={(e) => setServerUrl(e.target.value)}
              onBlur={() => void doSaveUrl()}
              onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); void doSaveUrl(); } }}
              spellCheck={false}
            />
          </Row>

          <Row label="Pair device">
            <div className="settings-sync">
              <input
                className="settings-input"
                value={pin}
                placeholder="6-char PIN"
                maxLength={16}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void doPair(); }}
                spellCheck={false}
              />
              <button className="settings-btn" onClick={() => void doPair()}>Pair</button>
            </div>
          </Row>

          <Row label="Continuity">
            <div className="settings-sync">
              <span className="settings-status">{sync ? (sync.paired ? `Paired · ${sync.deviceId}` : "Not paired — local only") : "…"}</span>
              {sync?.deviceId && (
                <button className="settings-btn" title="Copy this device's ID" onClick={() => {
                  void navigator.clipboard?.writeText(sync.deviceId).catch(() => undefined);
                  setSyncMsg("Device ID copied.");
                }}>Copy ID</button>
              )}
              <button className="settings-btn" onClick={() => { void api.syncSession().then((r) => { setSyncMsg(`Sync ${ (r as { ok?: boolean })?.ok === false ? "queued offline" : "pushed"}.`); refreshSync(); }); }}>Sync now</button>
              <button className="settings-btn" onClick={() => { void api.pullSession().then(() => { setSyncMsg("Pull requested — remote tabs merge in."); refreshSync(); }); }}>Pull</button>
            </div>
            {sync && (
              <p className="settings-status">
                queue {sync.pending ?? 0} · v{sync.lastVersion}
                {sync.lastSyncAt ? ` · last sync ${new Date(sync.lastSyncAt).toLocaleTimeString()}` : ""}
                {sync.lastSyncError ? ` · error: ${sync.lastSyncError}` : ""}
              </p>
            )}
            {devices.length > 0 && (
              <ul className="settings-devices">
                {devices.map((d) => (
                  <li key={d.id}>{d.device_name} · {d.trust_level}{d.platform ? ` · ${d.platform}` : ""}</li>
                ))}
              </ul>
            )}
            {syncMsg && <p className="settings-notice">{syncMsg}</p>}
          </Row>

          <Row label="Logins">
            {!loginsAvail ? (
              <span className="settings-status">OS keyring unavailable — logins disabled on this machine.</span>
            ) : (
              <div className="settings-stack">
                <div className="settings-sync">
                  <input className="settings-input" value={lgUrl} placeholder="https://site.com" onChange={(e) => setLgUrl(e.target.value)} spellCheck={false} />
                  <input className="settings-input" value={lgUser} placeholder="Username" onChange={(e) => setLgUser(e.target.value)} spellCheck={false} autoComplete="off" />
                  <input className="settings-input" type="password" value={lgPass} placeholder="Password" onChange={(e) => setLgPass(e.target.value)} autoComplete="new-password" />
                  <button className="settings-btn" onClick={() => {
                    if (!lgUrl.trim() || !lgUser.trim() || !lgPass) { setSyncMsg("Fill site, username and password."); return; }
                    void api.addLogin(lgUrl.trim(), lgUser.trim(), lgPass).then((r) => {
                      const res = r as { id?: string; error?: string };
                      if (res?.id) { setLgUrl(""); setLgUser(""); setLgPass(""); setSyncMsg("Login saved (OS-keyring encrypted)."); refreshSync(); }
                      else setSyncMsg(`Save failed: ${res?.error || "unknown"}`);
                    });
                  }}>Save</button>
                </div>
                <span className="settings-status">Encrypted with the OS keyring — never stored in plain text. Fill from the palette: “Fill login”.</span>
                {logins.length > 0 && (
                  <ul className="settings-devices">
                    {logins.map((l) => (
                      <li key={l.id}>{l.username} · {l.origin}
                        <button className="settings-link" onClick={() => void api.removeLogin(l.id).then(() => refreshSync())}>remove</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Row>

          <Row label="Extensions">
            <div className="settings-sync">
              <input
                className="settings-input"
                value={extPath}
                placeholder="/path/to/unpacked-extension"
                onChange={(e) => setExtPath(e.target.value)}
                spellCheck={false}
              />
              <button className="settings-btn" onClick={() => {
                const p = extPath.trim();
                if (!p) return;
                void api.loadExtension(p).then((r) => {
                  const res = r as { error?: string; name?: string; id?: string };
                  setSyncMsg(res?.error ? `Extension: ${res.error}` : `Loaded ${res?.name || res?.id}`);
                  setExtPath("");
                  refreshSync();
                });
              }}>Load</button>
            </div>
            <p className="settings-status">
              Autoload folder{extDir ? `: ${extDir}` : ""} — drop an unpacked extension
              (e.g. Bitwarden) in as its own subfolder and restart. Toggles apply instantly.
            </p>
            {extensions.length > 0 && (
              <ul className="settings-devices">
                {extensions.map((e) => (
                  <li key={e.id}>
                    <label className="settings-toggle">
                      <input
                        type="checkbox"
                        checked={e.enabled !== false}
                        onChange={() => void api.setExtensionEnabled(e.id, e.enabled === false).then(() => refreshSync())}
                      />
                      <span>{e.name || e.id}</span>
                    </label>
                    <button className="settings-link" onClick={() => void api.removeExtension(e.id).then(() => refreshSync())}>remove</button>
                  </li>
                ))}
              </ul>
            )}
          </Row>
        </div>

        <div className="settings-foot">
          Settings persist across restarts in the app config directory.
        </div>
      </div>
    </div>
  );
}