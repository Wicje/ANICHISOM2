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
  const [closedStack, setClosedStack] = useState<{ url: string }[]>([]);

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

  const openTab = async (url: string, focus = true) => {
    const label = await api.openTab(url);
    setTabs((prev) => [...prev, { label, url, title: displayTitle(url) }]);
    if (focus) setActiveLabel(label);
  };

  const closeTab = async (label: string) => {
    const prev = tabs;
    const idx = prev.findIndex((t) => t.label === label);
    const closing = prev[idx];
    if (closing) setClosedStack((s) => [closing, ...s].slice(0, 10));

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
    const next = closedStack[0];
    if (!next) return;
    setClosedStack((s) => s.slice(1));
    await openTab(next.url);
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

  // Chrome-side pin: favicon-only tab, not persisted into the session.
  const togglePin = (label: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.label === label
          ? { ...t, pinned: !Boolean((t as { pinned?: boolean }).pinned) }
          : t,
      ),
    );
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

  return (
    <>
      <BrowserChrome
        tabs={tabs}
        activeLabel={activeLabel}
        onOpen={openTab}
        onClose={closeTab}
        onActivate={api.activateTab}
        onReorder={reorderTabs}
        onTogglePin={togglePin}
        onRestore={restoreLastSession}
        onSave={saveNow}
        onReopen={reopenLastClosed}
        runtime={isTauri() ? "tauri" : "browser"}
      />
      {tabs.length === 0 && (
        <NewTab onResume={restoreLastSession} onOpen={openTab} />
      )}
      <CommandPalette
        tabs={tabs}
        activeLabel={activeLabel}
        onOpen={openTab}
        onActivate={(label) => void api.activateTab(label)}
        onRestore={() => restoreLastSession()}
        onReopen={reopenLastClosed}
        onToggleVault={toggleVault}
        onPullRemote={pullRemote}
        onSync={() => api.syncSession()}
      />
    </>
  );
}