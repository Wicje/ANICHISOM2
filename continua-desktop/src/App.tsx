import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { api, TabRecord, displayTitle, isTauri } from "./lib/tauri-bridge";
import { BrowserChrome } from "./chrome/BrowserChrome";
import { NewTab } from "./chrome/NewTab";

/** A tab as opened: native Rust label + canonical metadata. */
interface OpenTab extends TabRecord {
  label: string;
}

export default function App() {
  // Tabs live in Rust WebviewWindows; React keeps the canonical metadata.
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [closedStack, setClosedStack] = useState<{ url: string }[]>([]);

  // Mirror page titles pushed from Rust (tab:title-changed).
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    listen<{ label: string; title: string }>("tab:title-changed", (e) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.label === e.payload.label ? { ...t, title: e.payload.title } : t
        )
      );
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, []);

  const openTab = async (url: string, focus = true) => {
    const label = await api.openTab(url);
    setTabs((prev) => [...prev, { label, url, title: displayTitle(url) }]);
    if (focus) setActiveLabel(label);
    api.syncContext(url, url);
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

  const restoreLastSession = async () => {
    const session = await api.loadSession();
    if (session && session.length > 0) {
      const restored: OpenTab[] = [];
      for (const tab of session) {
        const label = await api.openTab(tab.url);
        restored.push({ label, url: tab.url, title: tab.title || tab.url });
      }
      setTabs(restored);
      const last = restored[restored.length - 1];
      if (last) setActiveLabel(last.label);
    }
  };

  const saveNow = async () => {
    await api.saveSession(
      tabs.map(({ url, title }) => ({ url, title }))
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
        onRestore={restoreLastSession}
        onSave={saveNow}
        onReopen={reopenLastClosed}
        runtime={isTauri() ? "tauri" : "browser"}
      />
      {tabs.length === 0 && (
        <NewTab onResume={restoreLastSession} onOpen={openTab} />
      )}
    </>
  );
}