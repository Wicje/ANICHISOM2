import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { listen } from "@tauri-apps/api/event";
import { api, OpenTab, displayTitle, isTauri } from "./lib/tauri-bridge";
import { BrowserChrome } from "./chrome/BrowserChrome";
import { NewTab } from "./chrome/NewTab";
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
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    listen<{ label: string; title: string }>("tab:title-changed", (e) =>
      patch(e.payload.label, { title: e.payload.title }),
    ).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, [patch]);

  // Track real in-page navigations from Rust (tab:navigated), coalesced.
  useEffect(() => {
    if (!isTauri()) return;
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
  // OS Downloads folder.
  useEffect(() => {
    if (!isTauri()) return;
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
    setTabs((prev) => [...prev, { label, url, title: displayTitle(url) }]);
    if (focus) setActiveLabel(label);
  };

  const openIncognito = async (url: string, focus = true) => {
    const label = await api.openIncognitoTab(url);
    setTabs((prev) => [
      ...prev,
      { label, url, title: displayTitle(url), incognito: true },
    ]);
    if (focus) setActiveLabel(label);
  };

  const closeTab = async (label: string) => {
    const prev = tabs;
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
      if (neighbor) void api.activateTab(neighbor.label);
      return neighbor?.label ?? null;
    });
  };

  const reopenLastClosed = async () => {
    const restarted = await api.reopenLastClosed();
    if (restarted) {
      setTabs((prev) => [...prev, restarted]);
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
      setTabs(session);
      setActiveLabel(session[session.length - 1].label);
    }
  };

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

  return (
    <>
      <BrowserChrome
        tabs={tabs}
        activeLabel={activeLabel}
        onOpen={openTab}
        onOpenIncognito={openIncognito}
        onClose={closeTab}
        onActivate={api.activateTab}
        onReorder={reorderTabs}
        onTogglePin={togglePin}
        onCloseOthers={closeOthers}
        onRestore={restoreLastSession}
        onSave={saveNow}
        onReopen={reopenLastClosed}
        onSwitchWorkspace={adoptTabs}
        runtime={isTauri() ? "tauri" : "browser"}
      />
      {tabs.length === 0 && (
        <NewTab onResume={restoreLastSession} onOpen={openTab} />
      )}
      {firstRun && tabs.length === 0 && (
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
        onActivate={(label) => void api.activateTab(label)}
        onRestore={() => restoreLastSession()}
        onReopen={reopenLastClosed}
        onToggleVault={toggleVault}
        onPullRemote={pullRemote}
        onSync={() => api.syncSession()}
      />
      <Toasts />
    </>
  );
}