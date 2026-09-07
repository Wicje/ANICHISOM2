import { useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { api, displayTitle, isTauri } from "../lib/tauri-bridge";

interface PaletteTab {
  label: string;
  url: string;
  title: string;
}

interface CommandPaletteProps {
  tabs: PaletteTab[];
  onOpen: (url: string) => Promise<void>;
  onActivate: (label: string) => void;
  onRestore: (replace?: boolean) => Promise<void>;
  onReopen: () => Promise<void>;
}

interface Item {
  key: string;
  group: string;
  label: string;
  hint?: string;
  run: () => void;
}

const QUICK = [
  { label: "Desktop", url: "https://continuaos.cc/os/shell" },
  { label: "Dashboard", url: "https://continuaos.cc" },
  { label: "Workspace", url: "https://continuaos.cc/workspace" },
  { label: "Vault", url: "https://continuaos.cc/vault" },
];

const isUrl = (q: string) => /^[\w-]+(\.[\w-]+)+([/:].*)?$/.test(q) || q.startsWith("http");

export function CommandPalette({
  tabs,
  onOpen,
  onActivate,
  onRestore,
  onReopen,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const q = query.trim();

  const pickImportFile = () => {
    window.setTimeout(() => fileRef.current?.click(), 0);
  };

  useEffect(() => {
    if (!isTauri()) return;
    let un: (() => void) | undefined;
    listen("palette:toggle", () => {
      setOpen((v) => {
        const next = !v;
        if (next) {
          setQuery("");
        } else {
          setQuery("");
        }
        return next;
      });
    }).then((fn) => {
      un = fn;
    });
    return () => un?.();
  }, []);

  useEffect(() => {
    if (open) {
      setActive(0);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const list: Item[] = [];

    if (q) {
      if (isUrl(q)) {
        list.push({
          key: "open",
          group: "Open",
          label: `Open ${q}`,
          hint: "new tab",
          run: () => void onOpen(q),
        });
      }
      for (const tab of tabs) {
        const label = tab.title || displayTitle(tab.url);
        if (
          label.toLowerCase().includes(q.toLowerCase()) ||
          tab.url.toLowerCase().includes(q.toLowerCase())
        ) {
          list.push({
            key: `tab-${tab.label}`,
            group: "Tabs",
            label,
            hint: tab.url,
            run: () => onActivate(tab.label),
          });
        }
      }
    } else {
      for (const tab of tabs) {
        list.push({
          key: `tab-${tab.label}`,
          group: "Tabs",
          label: tab.title || displayTitle(tab.url),
          hint: tab.url,
          run: () => onActivate(tab.label),
        });
      }
    }

    const match = (kw: string) => !q || kw.includes(q.toLowerCase()) || q.toLowerCase().includes(kw);
    if (match("restore")) {
      list.push({
        key: "restore",
        group: "Actions",
        label: "Restore last session",
        hint: "reopen your workspace",
        run: () => void onRestore(false),
      });
    }
    if (match("export")) {
      list.push({
        key: "export",
        group: "Actions",
        label: "Export session",
        hint: "save a portable checkpoint",
        run: () => void api.exportSession(),
      });
    }
    if (match("import")) {
      list.push({
        key: "import",
        group: "Actions",
        label: "Import session",
        hint: "adopt a portable checkpoint",
        run: pickImportFile,
      });
    }
    if (match("reopen") || match("closed")) {
      list.push({
        key: "reopen",
        group: "Actions",
        label: "Reopen closed tab",
        hint: "undestroy your last close",
        run: () => void onReopen(),
      });
    }
    if (match("focus") || match("clean") || match("screen") || match("hide")) {
      list.push({
        key: "immersive",
        group: "Actions",
        label: "Toggle clean/focus mode",
        hint: "hide the chrome for recording (global)",
        run: () => void api.setImmersive(),
      });
    }
    for (const quick of QUICK) {
      if (match(quick.label.toLowerCase())) {
        list.push({
          key: `quick-${quick.url}`,
          group: "Quick access",
          label: quick.label,
          hint: quick.url,
          run: () => void onOpen(quick.url),
        });
      }
    }

    return list.slice(0, 12);
  }, [q, tabs, onOpen, onActivate, onRestore, onReopen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const dir = e.key === "ArrowDown" ? 1 : -1;
        setActive((a) => (a + dir + items.length) % items.length);
        if (items.length === 0) setActive(0);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = items[Math.min(active, items.length - 1)];
        if (item) {
          setOpen(false);
          item.run();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, active]);

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    const raw = await file.text();
    const n = await api.importSessionJson(raw);
    setOpen(false);
    if (n > 0) await onRestore(true);
  };

  if (!open) return null;

  return (
    <div className="palette-overlay" onMouseDown={() => setOpen(false)}>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="palette-file"
        onChange={(e) => void onImportFile(e.target.files?.[0])}
      />
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          placeholder="Open a URL, switch tab, or run a command…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          spellCheck={false}
        />
        {items.length === 0 ? (
          <p className="palette-empty">No matches — type a URL to open it.</p>
        ) : (
          <ul className="palette-list">
            {(() => {
              let lastGroup = "";
              return items.map((item, i) => {
                const rows = [];
                if (item.group !== lastGroup) {
                  rows.push(
                    <li key={`g-${item.group}`} className="palette-group">
                      {item.group}
                    </li>
                  );
                  lastGroup = item.group;
                }
                rows.push(
                  <li key={item.key}>
                    <button
                      className={`palette-item${i === active ? " is-active" : ""}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => {
                        setOpen(false);
                        item.run();
                      }}
                    >
                      <span className="palette-label">{item.label}</span>
                      {item.hint && <span className="palette-hint">{item.hint}</span>}
                    </button>
                  </li>
                );
                return rows;
              });
            })()}
          </ul>
        )}
      </div>
    </div>
  );
}