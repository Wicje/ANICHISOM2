import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { listen } from "@tauri-apps/api/event";
import { api, OpenTab, displayTitle, isElectron, isTauri, isTauriNative } from "./lib/tauri-bridge";
import { BrowserChrome } from "./chrome/BrowserChrome";
import { NewTab } from "./chrome/NewTab";
import { Onboarding } from "./chrome/Onboarding";
import { CommandPalette } from "./chrome/CommandPalette";
import { Toasts } from "./components/Toasts";
import { toast } from "./lib/toast";

/**
 * Rust pushes `tab:title-changed` / `tab:navigated` per webview event. Buffer
 * them and flush once per animation frame instead of letting each page-title
 * churn re-render the whole chrome.
 */
function useTabMirror(): [
  OpenTab[],
  Dispatch<SetStateAction<OpenTab[]>>,
  (label: string, p: Partial<OpenTab>) => void,
] {
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const pending = useRef<Map<string, Partial<OpenTab>> | null>(null);
  const raf = useRef<number | null>(null);

  const flush = useCallback(() => {
    raf.current = null;
    const buf = pending.current;
    pending.current = null;
    if (!buf || buf.size === 0) return;
    setTabs((prev) => {
      let changed = false;
      const next = prev.map((t) => {
        const p = buf.get(t.label);
        if (!p) return t;
        const merged = { ...t, ...p };
        if (merged.title !== t.title || merged.url !== t.url) changed = true;
        return merged;
      });
      return changed ? next : prev;
    });
  }, []);

  const patch = useCallback(
    (label: string, p: Partial<OpenTab>) => {
      if (!pending.current) pending.current = new Map();
      pending.current.set(label, { ...pending.current.get(label), ...p });
      if (raf.current === null) raf.current = requestAnimationFrame(flush);
    },
    [flush],
  );

  useEffect(
    () => () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    },
    [],
  );

  return [tabs, setTabs, patch];
}

export default function App() {
  // Tabs live in Rust WebviewWindows; React keeps the canonical metadata.
  const [tabs, setTabs, patch] = useTabMirror();
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  // Mirror page titles pushed from Rust (tab:title-changed), coalesced.
  // Tauri-legacy only: Electron pushes state through IPC responses instead.
  useEffect(() => {
    if (!isTauriNative()) return;
    let unlisten: (() => void) | undefined;
    listen<{ label: string; title: string }>("tab:title-changed", (e) =>
      patch(e.payload.label, { title: e.payload.title }),
    ).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, [patch]);

  // Electron host pushes navigation + title per webview event (link clicks,
  // back/forward, SPA navs). Without this the strip, address bar and nav
  // buttons go stale the moment a page is clicked instead of typed.
  useEffect(() => {
    if (!isElectron()) return;
    return api.onTabUpdated((info) => {
      if (!info?.label) return;
      patch(info.label, {
        ...(info.url ? { url: info.url } : {}),
        ...(info.title ? { title: info.title } : {}),
      });
    });
  }, [patch]);

  // Host-forked tabs (link click → new tab, window.open popup): the host
  // opened these outside any chrome call, so adopt them into the strip and
  // follow focus. Deduped by label — our own openTab responses race this.
  useEffect(() => {
    if (!isElectron()) return;
    const offCreated = api.onTabCreated((info) => {
      if (!info?.label) return;
      setTabs((prev) => {
        if (prev.some((t) => t.label === info.label)) return prev;
        return [...prev, {
          label: info.label,
          url: info.url,
          title: info.title || displayTitle(info.url),
          incognito: info.incognito,
          pinned: info.pinned,
          group: info.group ?? undefined,
          container: info.container ?? undefined,
        }];
      });
      if (info.active) setActiveLabel(info.label);
    });
    const offClosed = api.onTabClosed((info) => {
      if (!info?.label) return;
      // Always drop the dead label (host-driven closes like download-stub
      // auto-close have no chrome-side removal). Only follow the host's
      // successor when it was OUR active tab that died — a background close
      // must never steal focus.
      setTabs((prev) => prev.filter((t) => t.label !== info.label));
      setActiveLabel((cur) => (cur === info.label ? (info.active ?? null) : cur));
    });
    return () => {
      offCreated();
      offClosed();
    };
  }, [setTabs]);
  // Track real in-page navigations from Rust (tab:navigated), coalesced.
  useEffect(() => {
    if (!isTauriNative()) return;
    let unlisten: (() => void) | undefined;
    listen<{ label: string; url: string }>("tab:navigated", (e) =>
      patch(e.payload.label, { url: e.payload.url }),
    ).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, [patch]);

  // Resurrect the last session immediately on launch - no click needed.
  // Backend reopens every tab with history, scroll and immersive state.
  useEffect(() => {
    if (!isTauri()) return;
    void restoreLastSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Download events from the webview: surface toasts as files land in the
  // OS Downloads folder. Tauri-legacy only (Electron polls the manager).
  useEffect(() => {
    if (!isTauriNative()) return;
    let unlisten: (() => void) | undefined;
    listen<{ state: string; filename: string; detail: string }>(
      "download:state",
      (e) => {
        const { state, filename, detail } = e.payload;
        if (state === "finished") {
          toast(`Saved ${filename.split("/").pop()} → Downloads`, "success");
        } else if (state === "failed") {
          toast(`Download failed: ${detail || filename}`, "danger");
        } else if (state === "started") {
          toast(`Downloading ${filename}…`);
        }
      },
    ).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, []);

  const openTab = async (url: string, focus = true) => {
    const label = await api.openTab(url);
    // Dedupe: the host also pushes tab-created for this birth, which may
    // arrive before this invoke resolves (link-fork race).
    setTabs((prev) => (prev.some((t) => t.label === label) ? prev : [...prev, { label, url, title: displayTitle(url) }]));
    if (focus) setActiveLabel(label);
  };

  const openIncognito = async (url: string, focus = true) => {
    const label = await api.openIncognitoTab(url);
    setTabs((prev) => (prev.some((t) => t.label === label)
      ? prev
      : [...prev, { label, url, title: displayTitle(url), incognito: true }]));
    if (focus) setActiveLabel(label);
  };

  // Activating a tab must move React state too — the native view swaps in
  // the host, but the strip highlight, address bar and nav buttons all
  // mirror activeLabel. Fire-and-forget invoke left them stale, so going
  // "back" to a tab looked broken even as the page switched.
  const activateTab = async (label: string) => {
    setActiveLabel(label);
    await api.activateTab(label);
  };

  const closeTab = async (label: string) => {    const prev = tabs;
    const idx = prev.findIndex((t) => t.label === label);
    // Rust records the close into the durable recently-closed ring (except
    // incognito/vault tabs), so Ctrl+Shift+T outlives this process.

    await api.closeTab(label);
    const nextList = prev.filter((t) => t.label !== label);
    setTabs(nextList);
    setActiveLabel((cur) => {
      if (cur !== label) return cur;
      if (nextList.length === 0) return null;
      const neighbor = nextList[Math.min(Math.max(idx, 0), nextList.length - 1)];
      if (neighbor) activateTab(neighbor.label);
      return neighbor?.label ?? null;
    });
  };

  const reopenLastClosed = async () => {
    const restarted = await api.reopenLastClosed();
    if (restarted) {
      setTabs((prev) => (prev.some((t) => t.label === restarted.label) ? prev : [...prev, restarted]));
      setActiveLabel(restarted.label);
    }
  };

  // Close every tab except `label` (pinned tabs survive, like most browsers).
  const closeOthers = async (label: string) => {
    const keep = tabs.filter((t) => t.label === label || t.pinned);
    const others = tabs.filter((t) => t.label !== label && !t.pinned);
    await Promise.all(others.map((t) => api.closeTab(t.label)));
    setTabs(keep);
    setActiveLabel((cur) => (cur === label ? label : cur));
    if (tabs.some((t) => t.label === label)) void api.activateTab(label);
  };

  // Chrome-side tab ordering. Native webviews overlap the same rect, so a
  // drag just reorders the tab strip (and the persisted snapshot, which is
  // built from this array in React order).
  const reorderTabs = (from: string, to: string, after = false) => {
    setTabs((prev) => {
      const fi = prev.findIndex((t) => t.label === from);
      const ti = prev.findIndex((t) => t.label === to);
      if (fi < 0 || ti < 0 || fi === ti) return prev;
      const next = [...prev];
      const [moved] = next.splice(fi, 1);
      const insertAt = ti < fi ? ti : ti - 1;
      next.splice(Math.min(insertAt + (after ? 1 : 0), next.length), 0, moved);
      return next;
    });
  };

  // Chrome-side pin: favicon-only tab. The engine persists the pin into the
  // session snapshot so it survives restarts (set_tab_pinned is durable).
  const togglePin = (label: string) => {
    const tab = tabs.find((t) => t.label === label);
    if (!tab) return;
    const next = !tab.pinned;
    setTabs((prev) =>
      prev.map((t) => (t.label === label ? { ...t, pinned: next } : t)),
    );
    void api.pinTab(label, next);
  };

  // Tab group assignment: mirrored into chrome state instantly, persisted
  // + synced by the host (set_tab_group is durable).
  const setGroup = (label: string, group: string | null) => {
    setTabs((prev) => prev.map((t) => (t.label === label ? { ...t, group: group ?? undefined } : t)));
    void api.setTabGroup(label, group);
  };

  // Container identity (H6): switching partitions rehydrates host-side, so we
  // just mirror the id (or drop it) in chrome state for the tab-strip dot.
  const setContainer = (label: string, container: string | null) => {
    setTabs((prev) => prev.map((t) => (t.label === label ? { ...t, container: container ?? undefined } : t)));
    void api.setTabContainer(label, container);
  };

  // Encrypt (or release) the active tab: the keyring manifest is mirrored
  // straight back into chrome state so the vault badge updates instantly.
  const toggleVault = async (label: string) => {
    const target = tabs.find((t) => t.label === label);
    if (!target) return;
    const updated = target.vault_id
      ? await api.unmarkVault(label)
      : await api.markVault(label);
    if (updated) {
      setTabs((prev) => prev.map((t) => (t.label === label ? updated : t)));
    }
  };

  const restoreLastSession = async (id?: string, replace = false) => {
    const session = await api.restoreSession(id, replace);
    if (session && session.length > 0) {
      // Merge, never blind-replace: a late/empty response must not wipe tabs
      // another restore already placed (the ghost-tab race).
      setTabs((prev) => {
        const seen = new Set(prev.map((t) => t.label));
        const fresh = session.filter((t) => !seen.has(t.label));
        return fresh.length ? [...prev, ...fresh] : prev;
      });
      setActiveLabel((cur) => cur ?? session[session.length - 1].label);
    }
  };

  // Boot reconcile: adopt any native tabs React doesn't know about (drift
  // repair — e.g. tabs restored host-side before the chrome mounted).
  useEffect(() => {
    if (!isTauri()) return;
    void api.listTabs().then((native) => {
      if (!native || native.length === 0) return;
      setTabs((prev) => {
        const seen = new Set(prev.map((t) => t.label));
        const missing = native.filter((t) => !seen.has(t.label));
        return missing.length ? [...prev, ...missing] : prev;
      });
      setActiveLabel((cur) => cur ?? native[native.length - 1].label);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pull a cloud session (paired device) and adopt it as the live workspace.
  const pullRemote = async () => {
    const session = await api.pullSession();
    if (session && session.length > 0) {
      setTabs(session);
      setActiveLabel(session[session.length - 1].label);
    }
    return session;
  };

  const saveNow = async () => {
    await api.saveSession(
      tabs.map(({ url, title }) => ({ url, title })),
      activeLabel,
    );
  };

  // Adopt a tab list returned from the Rust side (workspace switch).
  const adoptTabs = (session: OpenTab[]) => {
    if (session && session.length > 0) {
      setTabs(session);
      setActiveLabel(session[session.length - 1].label);
    }
  };

  const introKey = "continua.intro.dismissed";
  const [firstRun, setFirstRun] = useState(
    () => localStorage.getItem(introKey) !== "1",
  );
  const [onboarded] = useState(() => localStorage.getItem("continua.onboarded") === "1");

  // First-run hint: a quiet chip with the shortcuts, only on the empty start
  // page, auto-dismissing after a few seconds or on click.
  const dismissIntro = useCallback(() => {
    localStorage.setItem(introKey, "1");
    setFirstRun(false);
  }, []);

  // Auto-dismiss the first-run tip after a few seconds.
  useEffect(() => {
    if (!firstRun || tabs.length > 0) return;
    const t = setTimeout(dismissIntro, 12000);
    return () => clearTimeout(t);
  }, [firstRun, tabs.length, dismissIntro]);

  const [showOnboarding, setShowOnboarding] = useState(() => !onboarded);
  const closeOnboarding = useCallback(() => {
    localStorage.setItem("continua.onboarded", "1");
    localStorage.setItem(introKey, "1");
    setFirstRun(false);
    setShowOnboarding(false);
  }, [introKey]);

  return (
    <>
      <BrowserChrome
        tabs={tabs}
        activeLabel={activeLabel}
        onOpen={openTab}
        onOpenIncognito={openIncognito}
        onClose={closeTab}
        onActivate={activateTab}
        onReorder={reorderTabs}
        onTogglePin={togglePin}
        onSetGroup={setGroup}
        onSetContainer={setContainer}
        onCloseOthers={closeOthers}
        onRestore={restoreLastSession}
        onSave={saveNow}
        onReopen={reopenLastClosed}
        onSwitchWorkspace={adoptTabs}
        runtime={isTauriNative() ? "tauri" : isElectron() ? "electron" : "browser"}
      />
      {tabs.length === 0 && (
        <NewTab onResume={restoreLastSession} onOpen={openTab} />
      )}
      {firstRun && tabs.length === 0 && !showOnboarding && (
        <div className="intro-hint" onClick={dismissIntro} role="button" aria-label="Dismiss first-run tip">
          <span className="intro-hint-fn">Continua shortcuts</span>
          <span className="intro-hint-row">
            <kbd>Ctrl+K</kbd> command palette
          </span>
          <span className="intro-hint-row">
            <kbd>Ctrl+Shift+F</kbd> clean / focus mode
          </span>
          <span className="intro-hint-row">
            <kbd>Ctrl+Shift+T</kbd> reopen closed tab
          </span>
          <small>click to dismiss</small>
        </div>
      )}
      <CommandPalette
        tabs={tabs}
        activeLabel={activeLabel}
        onOpen={openTab}
        onOpenIncognito={openIncognito}
        onActivate={activateTab}
        onRestore={() => restoreLastSession()}
        onReopen={reopenLastClosed}
        onToggleVault={toggleVault}
        onPullRemote={pullRemote}
        onSync={() => api.syncSession()}
        onCloseTab={(label) => void closeTab(label)}
      />
      <Toasts />
      {showOnboarding && (
        <Onboarding
          onDone={closeOnboarding}
          onOpenSettingsSync={() => {
            closeOnboarding();
            window.dispatchEvent(new CustomEvent("continua:open-settings"));
          }}
        />
      )}
    </>
  );
}