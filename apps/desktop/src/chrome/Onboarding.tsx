import { useRef, useState } from "react";
import { api } from "../lib/tauri-bridge";
import { useChromeModal } from "../lib/chrome-modal";
import { parseBookmarkHtml } from "./BookmarksBar";
import { BUILTIN_THEMES, applyTheme, resolveTheme } from "../lib/themes";
import { ENGINES } from "./engine-list";

interface OnboardingProps {
  onDone: () => void;
  onOpenSettingsSync: () => void;
}

/** First-run wizard: vibe → engine → bookmarks import → sync. */
export function Onboarding({ onDone, onOpenSettingsSync }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [engine, setEngine] = useState("google");
  const [homepage, setHomepage] = useState("");
  const [themeId, setThemeId] = useState("midnight");
  const [imported, setImported] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  useChromeModal("onboarding", true);

  const finish = async () => {
    await api.updateConfig({ search_engine: engine, homepage: homepage.trim(), theme_id: themeId });
    onDone();
  };

  const doImport = async (file: File | undefined) => {
    if (!file) return;
    const items = parseBookmarkHtml(await file.text());
    for (const it of items.slice(0, 500)) await api.addBookmark(it.url, it.title);
    setImported(items.length);
  };

  return (
    <div className="onboard-overlay" role="dialog" aria-label="Welcome to Continua">
      <div className="onboard-panel">
        <h2 className="onboard-title">Welcome to Continua</h2>
        <p className="onboard-step">Step {step + 1} of 4</p>
        {step === 0 && (
          <>
            <p className="onboard-text">Make it yours first. Pick a vibe — Work and Personal can each have their own later.</p>
            <div className="theme-swatches">
              {BUILTIN_THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`theme-swatch${themeId === t.id ? " is-active" : ""}`}
                  onClick={() => { setThemeId(t.id); applyTheme(resolveTheme(t.id)); }}
                >
                  <span className="theme-dot" style={{ background: t.accent }} />
                  <span className="theme-name">{t.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <p className="onboard-text">Pick your search engine and homepage. Tabs restore automatically — zero loss.</p>
            <label className="onboard-label">Search engine
              <select className="settings-select" value={engine} onChange={(e) => setEngine(e.target.value)}>
                {ENGINES.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </label>
            <label className="onboard-label">Homepage
              <input className="settings-input" value={homepage} placeholder="empty = built-in new tab"
                onChange={(e) => setHomepage(e.target.value)} spellCheck={false} />
            </label>
          </>
        )}
        {step === 2 && (
          <>
            <p className="onboard-text">Bring your bookmarks from Chrome or Firefox (Bookmarks Manager → Export → .html).</p>
            <input ref={fileRef} type="file" accept=".html,text/html" hidden onChange={(e) => void doImport(e.target.files?.[0])} />
            <button className="settings-btn" onClick={() => fileRef.current?.click()}>Choose bookmarks file…</button>
            {imported !== null && <p className="settings-notice">Imported {imported} bookmarks.</p>}
          </>
        )}
        {step === 3 && (
          <>
            <p className="onboard-text">Continuity syncs tabs across your machines (TLS, no vault tax). Pair when ready — or skip and stay local.</p>
            <div className="settings-sync">
              <button className="settings-btn" onClick={onOpenSettingsSync}>Open Sync settings…</button>
            </div>
            <p className="onboard-keys"><kbd>Ctrl+K</kbd> palette · <kbd>Ctrl+H</kbd> history · <kbd>Ctrl+J</kbd> downloads · <kbd>Ctrl+Shift+T</kbd> reopen tab</p>
          </>
        )}
        <div className="onboard-nav">
          {step > 0 && <button className="settings-btn" onClick={() => setStep(step - 1)}>Back</button>}
          {step < 3
            ? <button className="settings-btn is-primary" onClick={() => setStep(step + 1)}>Continue</button>
            : <button className="settings-btn is-primary" onClick={() => void finish()}>Start browsing</button>}
          <button className="onboard-skip" onClick={() => void finish()}>Skip</button>
        </div>
      </div>
    </div>
  );
}
