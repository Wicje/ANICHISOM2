import { useEffect, useRef, useState } from "react";
import { api, type BrowserProfile } from "../lib/tauri-bridge";
import { BUILTIN_THEMES, applyTheme, resolveTheme, type Theme } from "../lib/themes";
import { useChromeModal } from "../lib/chrome-modal";
import { IconCaretDown, IconCheck, IconClose } from "../components/icons";
import { toast } from "../lib/toast";
import type { OpenTab } from "./TabStrip";

interface ProfileMenuProps {
  onSwitchTabs: (session: OpenTab[], themeId?: string | null) => void;
  onProfilesChanged?: () => void;
}

/**
 * Chrome-style profile switcher (Work ↔ Personal).
 * Profiles isolate cookies, history, bookmarks, workspaces and extensions
 * host-side; the chrome only swaps the avatar + adopts the returned tabs.
 */
export function ProfileMenu({ onSwitchTabs, onProfilesChanged }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [activeId, setActiveId] = useState("personal");
  const [name, setName] = useState("");
  const [switching, setSwitching] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useChromeModal("profiles", open);

  const refresh = () => {
    void api.listProfiles().then((s) => {
      if (s.profiles.length) {
        setProfiles(s.profiles);
        setActiveId(s.activeId);
      }
    });
  };

  useEffect(refresh, []);
  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open ]);

  const active = profiles.find((p) => p.id === activeId) ?? profiles[0];
  const initial = (active?.name || "P").trim().charAt(0).toUpperCase() || "P";

  const doSwitch = (id: string) => {
    if (id === activeId || switching) return;
    setSwitching(true);
    setOpen(false);
    void api.switchProfile(id).then((s) => {
      setSwitching(false);
      if (s.error) {
        toast(`Profile switch failed: ${s.error}`, "danger");
        return;
      }
      setProfiles(s.profiles);
      setActiveId(s.activeId);
      const next = s.profiles.find((p) => p.id === s.activeId);
      if ("tabs" in s && s.tabs) onSwitchTabs(s.tabs as OpenTab[], next?.themeId ?? null);
      onProfilesChanged?.();
      toast(`Switched to ${next?.name ?? s.activeId} — history, tabs & extensions are separate`, "success");
      refresh();
    });
  };

  const doCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    void api.createProfile(trimmed).then((s) => {
      if (s.error) {
        toast(`Could not create profile: ${s.error}`, "danger");
        return;
      }
      setProfiles(s.profiles);
      setName("");
      setOpen(false);
      toast(`Profile “${trimmed}” created — switch to it to start fresh`, "success");
    });
  };

  const doDelete = (id: string) => {
    if (id === activeId) {
      toast("Switch away before deleting this profile", "danger");
      return;
    }
    void api.deleteProfile(id).then((s) => {
      if (s.error) {
        toast(`Could not delete profile: ${s.error}`, "danger");
        return;
      }
      setProfiles(s.profiles);
      toast("Profile deleted with its tabs & history");
    });
  };

  if (!profiles.length) return null;

  return (
    <div className="workspace-wrap">
      <button
        className={`workspace-btn profile-btn${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title="Profiles — Work / Personal stay entirely separate (history, tabs, extensions)"
      >
        <span
          className="profile-avatar"
          style={{ background: active?.color ?? "#0071e3" }}
          aria-hidden="true"
        >
          {initial}
        </span>
        <span className="workspace-btn-name">{switching ? "Switching…" : (active?.name ?? "Profile")}</span>
        <IconCaretDown size={12} />
      </button>
      {open && (
        <div className="workspace-pop" onMouseLeave={() => setOpen(false)}>
          <div className="workspace-head">Profiles — separate everything</div>
          {profiles.map((p) => {
            const isActive = p.id === activeId;
            return (
              <button
                key={p.id}
                className={`workspace-row${isActive ? " is-active" : ""}`}
                onClick={() => { if (!isActive) doSwitch(p.id); }}
                title={isActive ? "Current profile" : `Switch to ${p.name}`}
              >
                <span className="profile-avatar" style={{ background: p.color }}>
                  {(p.name.trim().charAt(0) || "P").toUpperCase()}
                </span>
                <span className="workspace-row-main">
                  <span className="workspace-row-name">{p.name}</span>
                  <span className="workspace-row-sub">
                    {isActive ? "Current — tabs, history & extensions" : "Separate tabs, history & extensions"}
                  </span>
                </span>
                <span className="workspace-row-check">{isActive && <IconCheck size={13} />}</span>
                {profiles.length > 1 && !isActive && (
                  <span
                    className="workspace-row-del"
                    role="button"
                    tabIndex={0}
                    title={`Delete ${p.name}`}
                    onClick={(e) => { e.stopPropagation(); doDelete(p.id); }}
                    onKeyDown={(e) => { if (e.key === "Enter") doDelete(p.id); }}
                  >
                    <IconClose size={13} />
                  </span>
                )}
              </button>
            );
          })}
          <div className="workspace-sep" />
          <div className="workspace-head">Theme for {active?.name ?? "profile"}</div>
          <div className="theme-swatches">
            {BUILTIN_THEMES.map((t) => (
              <button
                key={t.id}
                className={`theme-swatch${(active?.themeId ?? "midnight") === t.id ? " is-active" : ""}`}
                title={t.name}
                onClick={() => {
                  if (!active) return;
                  void api.setProfileTheme(active.id, t.id).then((s) => {
                    if (!s.error) {
                      setProfiles(s.profiles);
                      setActiveId(s.activeId);
                      void api.getBrowserConfig().then((c) => {
                        applyTheme(resolveTheme(t.id, (c?.custom_themes ?? []) as Theme[]));
                      });
                    }
                  });
                }}
              >
                <span className="theme-dot" style={{ background: t.accent }} />
                <span className="theme-name">{t.name}</span>
              </button>
            ))}
          </div>
          <div className="workspace-sep" />
          <div className="workspace-new">
            <input
              ref={inputRef}
              className="workspace-input"
              value={name}
              placeholder="New profile name… (e.g. Client X)"
              maxLength={32}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") doCreate();
                if (e.key === "Escape") setOpen(false);
              }}
              spellCheck={false}
            />
            <button className="workspace-save" onClick={doCreate} disabled={!name.trim()}>
              Add
            </button>
          </div>
          <div className="workspace-foot">
            Switching closes this profile's views and opens the other's — cookies never cross.
          </div>
        </div>
      )}
    </div>
  );
}
