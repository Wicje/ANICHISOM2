import { useState } from "react";
import { api, TabRecord, isTauri } from "./lib/tauri-bridge";
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

  const openTab = async (url: string, focus = true) => {
    const label = await api.openTab(url);
    setTabs((prev) => [...prev, { label, url, title: url }]);
    if (focus) setActiveLabel(label);
    api.syncContext(url, url);
  };

  const closeTab = async (label: string) => {
    await api.closeTab(label);
    setTabs((prev) => prev.filter((t) => t.label !== label));
    setActiveLabel((cur) => (cur === label ? null : cur));
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
        runtime={isTauri() ? "tauri" : "browser"}
      />
      {tabs.length === 0 && (
        <NewTab onResume={restoreLastSession} onOpen={openTab} />
      )}
    </>
  );
}