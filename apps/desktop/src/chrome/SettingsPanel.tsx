import { useEffect, useState } from "react";
import { api } from "../lib/tauri-bridge";
import { useChromeModal } from "../lib/chrome-modal";
import type { BrowserConfigItem, ConfigPatch } from "../lib/tauri-bridge";
import { BUILTIN_THEMES, applyTheme, decodeShare, encodeShare, resolveTheme, type Theme } from "../lib/themes";
import { sanitizeEngine } from "../lib/tauri-bridge";
import { SHORTCUT_ACTIONS, comboFor, comboOf, prettyCombo } from "../lib/shortcuts";
import { ENGINES } from "./engine-list";
import { IconClose } from "../components/icons";

interface SettingsPanelProps {
  open: boolean;
  config: BrowserConfigItem | null;
  onPatch: (patch: ConfigPatch) => void;
  onClearHistory: () => void;
  onClose: () => void;
  /** Host of the active tab (for "remember this site"). */
  activeOrigin?: string;
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
  activeOrigin,
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
  const [themeLink, setThemeLink] = useState("");
  const [engName, setEngName] = useState("");
  const [engUrl, setEngUrl] = useState("");
  const [capturing, setCapturing] = useState<string | null>(null);
  const [siteOrigin, setSiteOrigin] = useState("");
  const [siteZoom, setSiteZoom] = useState("100");
  useChromeModal("settings", open);

  // Shortcut capture: press any combo while an action is armed.
  useEffect(() => {
    if (!capturing) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const combo = comboOf(e);
      if (!combo) return;
      onPatch({ shortcuts: { ...(config?.shortcuts ?? {}), [capturing]: combo } });
      setCapturing(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [capturing, config?.shortcuts, onPatch]);

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
    const p = pin.trim().toUpperCase();
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

          <Row label="Gallery">
            <div className="settings-stack">
              <div className="theme-swatches">
                {[...BUILTIN_THEMES, ...((config?.custom_themes ?? []) as Theme[])].map((t) => (
                  <button
                    key={t.id}
                    className={`theme-swatch${(config?.theme_id ?? "midnight") === t.id ? " is-active" : ""}`}
                    title={t.name}
                    onClick={() => {
                      applyTheme(resolveTheme(t.id, (config?.custom_themes ?? []) as Theme[]));
                      onPatch({ theme_id: t.id });
                    }}
                  >
                    <span className="theme-dot" style={{ background: t.accent }} />
                    <span className="theme-name">{t.name}</span>
                  </button>
                ))}
              </div>
              <div className="settings-sync">
                <input
                  className="settings-input"
                  value={themeLink}
                  placeholder="Paste a continua://theme/ link to import"
                  onChange={(e) => setThemeLink(e.target.value)}
                  spellCheck={false}
                />
                <button className="settings-btn" onClick={() => {
                  const t = decodeShare(themeLink.trim());
                  if (!t) { setSyncMsg("That theme link did not parse."); return; }
                  const customs = [...((config?.custom_themes ?? []) as Theme[]).filter((x) => x.id !== t.id), t];
                  applyTheme(t);
                  onPatch({ custom_themes: customs, theme_id: t.id });
                  setThemeLink("");
                  setSyncMsg(`Theme “${t.name}” imported.`);
                }}>Import</button>
                <button className="settings-btn" onClick={() => {
                  const t = resolveTheme(config?.theme_id ?? "midnight", (config?.custom_themes ?? []) as Theme[]);
                  void navigator.clipboard?.writeText(encodeShare(t)).catch(() => undefined);
                  setSyncMsg("Theme link copied — share it anywhere.");
                }}>Share</button>
              </div>
            </div>
          </Row>

          <Row label="Density">
            <div className="settings-seg">
              <button
                className={(config?.density ?? "comfortable") === "comfortable" ? "is-active" : ""}
                onClick={() => onPatch({ density: "comfortable" })}
              >
                Comfortable
              </button>
              <button
                className={config?.density === "compact" ? "is-active" : ""}
                onClick={() => onPatch({ density: "compact" })}
              >
                Compact
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

          <Row label="Search engines">
            <div className="settings-stack">
              <div className="settings-sync">
                <input className="settings-input" value={engName} placeholder="Name (e.g. GitHub)" maxLength={24} onChange={(e) => setEngName(e.target.value)} spellCheck={false} />
                <input className="settings-input" value={engUrl} placeholder="https://github.com/search?q={q}" onChange={(e) => setEngUrl(e.target.value)} spellCheck={false} />
                <button className="settings-btn" onClick={() => {
                  const e = sanitizeEngine({ name: engName, url: engUrl.trim() });
                  if (!e) { setSyncMsg("Engine needs a name and an https URL containing {q}."); return; }
                  onPatch({ custom_engines: [...(config?.custom_engines ?? []), e] });
                  setEngName(""); setEngUrl("");
                  setSyncMsg(`Engine “${e.name}” added — pick it from the omnibox pill.`);
                }}>Add</button>
              </div>
              {(config?.custom_engines ?? []).length > 0 && (
                <ul className="settings-devices">
                  {(config?.custom_engines ?? []).map((e) => (
                    <li key={e.id}>{e.name} · {e.url}
                      <button className="settings-link" onClick={() => onPatch({ custom_engines: (config?.custom_engines ?? []).filter((x) => x.id !== e.id) })}>remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Row>

          <Row label="Toolbar">
            <div className="settings-stack">
              {(["restore", "save", "history", "downloads", "rail", "reader", "dark", "settings", "studio", "theme"] as const).map((id) => (
                <label key={id} className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={!(config?.toolbar_hidden ?? []).includes(id)}
                    onChange={() => {
                      const hidden = (config?.toolbar_hidden ?? []).includes(id)
                        ? (config?.toolbar_hidden ?? []).filter((x) => x !== id)
                        : [...(config?.toolbar_hidden ?? []), id];
                      onPatch({ toolbar_hidden: hidden });
                    }}
                  />
                  <span style={{ textTransform: "capitalize" }}>{id === "rail" ? "Vertical tabs" : id}</span>
                </label>
              ))}
            </div>
          </Row>

          <Row label="Shortcuts">
            <div className="settings-stack">
              {SHORTCUT_ACTIONS.map((a) => (
                <div key={a.id} className="settings-sync" style={{ justifyContent: "space-between" }}>
                  <span className="settings-status">{a.label}</span>
                  <button
                    className="settings-btn"
                    onClick={() => setCapturing(capturing === a.id ? null : a.id)}
                  >
                    {capturing === a.id ? "Press keys…" : prettyCombo(comboFor(a.id, config?.shortcuts ?? {}))}
                  </button>
                </div>
              ))}
              <span className="settings-status">Click a combo, press new keys. Esc re-arms nothing — press Escape twice to cancel.</span>
            </div>
          </Row>

          <Row label="Site prefs">
            <div className="settings-stack">
              <div className="settings-sync">
                <input className="settings-input" value={siteOrigin} placeholder="example.com" onChange={(e) => setSiteOrigin(e.target.value)} spellCheck={false} />
                <input className="settings-input" value={siteZoom} placeholder="100" inputMode="numeric" onChange={(e) => setSiteZoom(e.target.value)} spellCheck={false} style={{ maxWidth: 76 }} />
                <button className="settings-btn" onClick={() => {
                  const origin = siteOrigin.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
                  const zoom = Math.min(200, Math.max(50, Number(siteZoom) || 100));
                  if (!origin || !origin.includes(".")) { setSyncMsg("Enter a host like example.com."); return; }
                  onPatch({ site_prefs: { ...(config?.site_prefs ?? {}), [origin]: { ...(config?.site_prefs ?? {})[origin], zoom } } });
                  setSiteOrigin(""); setSiteZoom("100");
                }}>Save zoom</button>
                {activeOrigin && (
                  <button className="settings-btn" onClick={() => setSiteOrigin(activeOrigin)}>This site</button>
                )}
              </div>
              {Object.entries(config?.site_prefs ?? {}).length > 0 && (
                <ul className="settings-devices">
                  {Object.entries(config?.site_prefs ?? {}).map(([origin, p]) => (
                    <li key={origin}>{origin} · {p.zoom ?? 100}%{p.muted ? " · muted" : ""}
                      <button className="settings-link" onClick={() => onPatch({ site_prefs: { ...(config?.site_prefs ?? {}), [origin]: { ...p, muted: !p.muted } } })}>{p.muted ? "unmute" : "mute"}</button>
                      <button className="settings-link" onClick={() => {
                        const next = { ...(config?.site_prefs ?? {}) };
                        delete next[origin];
                        onPatch({ site_prefs: next });
                      }}>remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Row>

          <Row label="Sleeping tabs">
            <div className="settings-stack">
              <select
                className="settings-select"
                value={config?.sleep_after_min ?? 30}
                onChange={(e) => onPatch({ sleep_after_min: Number(e.target.value) })}
              >
                {[[0, "Off"], [5, "After 5 minutes idle"], [15, "After 15 minutes idle"], [30, "After 30 minutes idle"], [60, "After 1 hour idle"]].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <span className="settings-status">Sleeping tabs keep their place, drop memory to ~zero, and wake on click. Nothing leaves this machine.</span>
            </div>
          </Row>

          <Row label="Auto-grouping">
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={Boolean(config?.auto_group_site)}
                onChange={(e) => onPatch({ auto_group_site: e.target.checked })}
              />
              <span>Group same-site tabs on open (suggestions stay opt-in)</span>
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
            <div className="settings-stack">
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
              <button className="settings-btn" onClick={() => void api.revealPath("extensions")}>Open folder</button>
            </div>
            <p className="settings-status">
              Autoload folder{extDir ? `: ${extDir}` : ""} — drop an unpacked extension
              in as its own subfolder and restart. Toggles apply instantly.
            </p>
            <p className="settings-status">
              Password-manager story: install Bitwarden from bitwarden.com/download,
              unzip it into the folder above (or paste its path and Load) — it fills
              logins per profile from then on. No Bitwarden? The built-in Logins row
              above covers you instead.
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
            </div>
          </Row>
        </div>

        <div className="settings-foot">
          Settings persist across restarts in the app config directory.
        </div>
      </div>
    </div>
  );
}