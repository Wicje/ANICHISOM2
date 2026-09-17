import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  api,
  displayTitle,
  isTauri,
  isTauriNative,
  newTabUrl,
  START_TAB_URL,
  type Bookmark,
} from "../lib/tauri-bridge";
import { attachCadence } from "../lib/cadence";
import { useChromeModal } from "../lib/chrome-modal";
import {
  IconBrand,
  IconCamera,
  IconCheck,
  IconClock,
  IconClose,
  IconFocus,
  IconIncognito,
  IconPrinter,
  IconSettings,
  IconSpark,
  IconStack,
  IconStar,
} from "../components/icons";
import type { IconProps } from "../components/icons";

interface PaletteTab {
  label: string;
  url: string;
  title: string;
  vault_id?: string | null;
  incognito?: boolean;
  pinned?: boolean;
}

interface CommandPaletteProps {
  tabs: PaletteTab[];
  activeLabel: string | null;
  onOpen: (url: string) => Promise<void>;
  onOpenIncognito: (url: string) => Promise<void>;
  onActivate: (label: string) => void;
  onRestore: (replace?: boolean) => Promise<void>;
  onReopen: () => Promise<void>;
  onToggleVault: (label: string) => Promise<void>;
  onPullRemote: () => Promise<unknown>;
  onSync: () => Promise<unknown>;
}

interface RawItem {
  key: string;
  group: string;
  label: string;
  hint?: string;
  icon: ComponentType<IconProps>;
  run: () => void;
}

interface Item extends RawItem {
  score: number;
}

const isUrl = (q: string) =>
  /^[\w-]+(\.[\w-]+)+([/:].*)?$/.test(q) || q.startsWith("http");

/** Subsequence fuzzy score: prefix + consecutive runs rank higher. */
function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const s = text.toLowerCase();
  if (!q) return 1;
  let score = 0;
  let consec = 0;
  let prev = -1;
  let matches = 0;
  let t = 0;
  for (let i = 0; i < q.length; i++) {
    const ch = q[i];
    while (t < s.length && s[t] !== ch) t++;
    if (t >= s.length) return 0;
    matches++;
    if (prev >= 0 && t === prev + 1) consec++;
    else consec = 0;
    score += 1 + consec + t * 0.02;
    prev = t;
    t++;
  }
  if (prev === -1) return 0;
  // Prefix match bonus (score meaningful when all chars matched).
  score += s.indexOf(q) === 0 ? 5 : 0;
  void matches;
  return score;
}

const hostOf = (u: string): string => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

export function CommandPalette({
  tabs,
  activeLabel,
  onOpen,
  onOpenIncognito,
  onActivate,
  onRestore,
  onReopen,
  onToggleVault,
  onPullRemote,
  onSync,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  /** Configured homepage (ADR-006 #7): "New tab" honors it over the default. */
  const [newTab, setNewTab] = useState(START_TAB_URL);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const q = query.trim();
  useChromeModal("palette", open);

  useEffect(() => {
    if (!isTauri()) return;
    void api.getBrowserConfig().then((c) => setNewTab(newTabUrl(c)));
  }, []);

  const pickImportFile = () => {
    window.setTimeout(() => fileRef.current?.click(), 0);
  };

  const openSettingsSync = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("continua:open-settings"));
    setNotice(null);
  };

  const runPair = async () => {
    // No window.prompt — pairing lives in Settings → Sync (ADR-008).
    openSettingsSync();
  };

  useEffect(() => {
    if (!isTauriNative()) return;
    let un: (() => void) | undefined;
    listen("palette:toggle", () => {
      setOpen((v) => {
        setQuery("");
        setNotice(null);
        return !v;
      });
    }).then((fn) => {
      un = fn;
    });
    return () => un?.();
  }, []);

  useEffect(() => {
    if (open) {
      setActive(0);
      void api.getBookmarks().then(setBookmarks);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const raw: RawItem[] = [];

    // Open a URL in a new tab.
    if (q && isUrl(q)) {
      raw.push({
        key: "open",
        group: "Open",
        label: `Open ${q}`,
        hint: hostOf(/^https?:\/\//i.test(q) ? q : `https://${q}`),
        icon: IconSpark,
        run: () => void onOpen(/^https?:\/\//i.test(q) ? q : `https://${q}`),
      });
    }

    // Currently open tabs.
    for (const tab of tabs) {
      raw.push({
        key: `tab-${tab.label}`,
        group: "Tabs",
        label: tab.title || displayTitle(tab.url),
        hint: hostOf(tab.url),
        icon: IconStack,
        run: () => onActivate(tab.label),
      });
    }

    // Saved bookmarks.
    for (const b of bookmarks) {
      raw.push({
        key: `bm-${b.url}`,
        group: "Bookmarks",
        label: b.label || hostOf(b.url),
        hint: hostOf(b.url),
        icon: IconStar,
        run: () => void onOpen(b.url),
      });
    }

    raw.push({
      key: "newtab",
      group: "Actions",
      label: "New tab",
      hint: "open the start page",
      icon: IconSpark,
      run: () => void onOpen(newTab),
    });
    raw.push({
      key: "restore",
      group: "Actions",
      label: "Restore last session",
      hint: "reopen your workspace",
      icon: IconClock,
      run: () => void onRestore(false),
    });
    raw.push({
      key: "export",
      group: "Actions",
      label: "Export session",
      hint: "save a portable checkpoint",
      icon: IconCheck,
      run: () => void api.exportSession(),
    });
    raw.push({
      key: "import",
      group: "Actions",
      label: "Import session",
      hint: "adopt a portable checkpoint",
      icon: IconCheck,
      run: pickImportFile,
    });
    raw.push({
      key: "reopen",
      group: "Actions",
      label: "Reopen closed tab",
      hint: "undestroy your last close",
      icon: IconClock,
      run: () => void onReopen(),
    });
    raw.push({
      key: "screenshot",
      group: "Actions",
      label: "Screenshot this page",
      hint: "save PNG to Pictures",
      icon: IconCamera,
      run: () => {
        void (async () => {
          const r = await api.screenshotTab(activeLabel ?? undefined);
          setNotice(r?.path ? `Saved to ${r.path}` : "Screenshot failed");
        })();
      },
    });
    raw.push({
      key: "print",
      group: "Actions",
      label: "Print this page",
      hint: "system print dialog / PDF",
      icon: IconPrinter,
      run: () => void api.printTab(activeLabel ?? undefined),
    });
    raw.push({
      key: "fill-login",
      group: "Actions",
      label: "Fill login for this site",
      hint: "OS-keyring vault",
      icon: IconCheck,
      run: () => {
        void (async () => {
          const r = await api.fillLogin(undefined, activeLabel ?? undefined);
          const res = r as { ok?: boolean; error?: string; detail?: string };
          if (res?.ok) setNotice("Login filled.");
          else setNotice(res?.error === "no-login" ? "No saved login for this site — add one in Settings → Logins." : `Fill failed: ${res?.error || res?.detail || "unknown"}`);
        })();
      },
    });
    raw.push({
      key: "private",
      group: "Actions",
      label: "New private tab",
      hint: "incognito — no history, no saved session",
      icon: IconIncognito,
      run: () => void onOpenIncognito(START_TAB_URL),
    });
    raw.push({
      key: "immersive",
      group: "Actions",
      label: "Toggle studio mode",
      hint: "hide all chrome for recording (Ctrl+Shift+F)",
      icon: IconFocus,
      run: () => void api.setImmersive(),
    });
    raw.push({
      key: "devtools",
      group: "Actions",
      label: "Toggle developer tools",
      hint: "inspect the active page (Ctrl+Shift+I)",
      icon: IconSpark,
      run: () => void api.toggleDevTools(),
    });
    const vaulted = tabs.find((t) => t.label === activeLabel)?.vault_id;
    raw.push({
      key: "vault",
      group: "Actions",
      label: vaulted ? "Un-secure vault tab" : "Encrypt tab in vault",
      hint: vaulted
        ? "release the URL back into the session file"
        : "store URL/title only in the OS keyring",
      icon: IconSettings,
      run: () => {
        if (activeLabel) void onToggleVault(activeLabel);
      },
    });
    raw.push({
      key: "pair",
      group: "Sync",
      label: "Pair machine (cloud sync)",
      hint: "opens Settings → Sync",
      icon: IconBrand,
      run: () => void runPair(),
    });
    raw.push({
      key: "sync",
      group: "Sync",
      label: "Sync session to cloud",
      hint: "push this workspace checkpoint",
      icon: IconBrand,
      run: () => void onSync(),
    });
    raw.push({
      key: "register",
      group: "Sync",
      label: "Register this device",
      hint: "moat: bind fingerprint, confirm trust level",
      icon: IconBrand,
      run: () => {
        void api
          .registerDevice()
          .then((r) =>
            setNotice(
              r
                ? `Device registered · trust: ${r.trustLevel}${r.isNew ? " · new" : ""}`
                : "Not paired yet — run Pair machine first"
            )
          );
      },
    });
    raw.push({
      key: "server-url",
      group: "Sync",
      label: "Set Continua server URL",
      hint: "opens Settings → Sync",
      icon: IconSettings,
      run: () => openSettingsSync(),
    });
    raw.push({
      key: "pull",
      group: "Sync",
      label: "Pull remote session",
      hint: "restore the newest saved workspace",
      icon: IconClock,
      run: () => void onPullRemote(),
    });

    // Score + filter, then order by group (stable) then score within group.
    const scored = raw
      .map((r) => ({ ...r, score: fuzzyScore(q, `${r.label} ${r.hint ?? ""}`) }))
      .filter((r) => r.score > 0);
    const groups: string[] = [];
    for (const r of scored) if (!groups.includes(r.group)) groups.push(r.group);
    const result: Item[] = [];
    for (const g of groups) {
      result.push(
        ...scored
          .filter((r) => r.group === g)
          .sort((a, b) => b.score - a.score || 0),
      );
    }
    return result.slice(0, 14);
  }, [q, tabs, activeLabel, bookmarks, newTab, onOpen, onOpenIncognito, onActivate, onRestore, onReopen, onToggleVault, onPullRemote, onSync]);

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
        <div className="palette-bar">
          <span className="palette-kbd-hint">
            <IconSpark size={13} />
          </span>
          <input
            ref={(el) => {
              inputRef.current = el;
              attachCadence(el);
            }}
            className="palette-input"
            placeholder="Fuzzy-search tabs, bookmarks, actions…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            spellCheck={false}
          />
          <button className="palette-x" onClick={() => setOpen(false)} title="Close (Esc)">
            <IconClose size={14} />
          </button>
        </div>
        {notice && <p className="palette-notice">{notice}</p>}
        {items.length === 0 ? (
          <p className="palette-empty">
            No matches — type a URL to open it, or press ↑/↓ …{" "}
            {q && isUrl(q) ? "Enter opens it in a new tab." : ""}
          </p>
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
                      <span className="palette-ico"><item.icon size={14} /></span>
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