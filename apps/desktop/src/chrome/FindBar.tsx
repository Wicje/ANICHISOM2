import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { api } from "../lib/tauri-bridge";
import { IconClose, IconForward, IconBack } from "../components/icons";

interface FindBarProps {
  open: boolean;
  activeLabel: string | null;
  onClose: () => void;
}

export function FindBar({ open, activeLabel, onClose }: FindBarProps) {
  const [query, setQuery] = useState("");
  const [count, setCount] = useState(0);
  const [idx, setIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setCount(0);
      setIdx(-1);
      return;
    }
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (open && activeLabel && query) void run();
    else {
      setCount(0);
      setIdx(-1);
      if (!query && activeLabel) void api.stopFind(activeLabel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLabel, query]);

  const run = async (dir: 0 | 1 | -1 = 0) => {
    if (!activeLabel || !query) {
      setCount(0);
      setIdx(-1);
      return;
    }
    const res =
      dir === 1
        ? await api.findNext(activeLabel, query)
        : dir === -1
          ? await api.findPrev(activeLabel, query)
          : await api.findInTab(activeLabel, query);
    setCount(res.count);
    setIdx(res.idx);
  };

  if (!open) return null;

  const status =
    count > 0
      ? idx >= 0
        ? `${idx + 1}/${count}`
        : `${count} found`
      : query
        ? "No matches"
        : "";

  const close = () => {
    if (activeLabel) void api.stopFind(activeLabel);
    onClose();
  };

  const onKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) void run(-1);
      else void run(1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  return (
    <div className="findbar">
      <input
        ref={inputRef}
        className="findbar-input"
        placeholder="Find in page…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKey}
        spellCheck={false}
      />
      <span className={`findbar-status${count > 0 ? "" : " is-empty"}`}>
        {status}
      </span>
      <div className="findbar-actions">
        <button
          className="findbar-btn"
          title="Previous (Shift+Enter)"
          onClick={() => void run(-1)}
          disabled={!query}
        >
          <IconBack size={14} />
        </button>
        <button
          className="findbar-btn"
          title="Next (Enter)"
          onClick={() => void run(1)}
          disabled={!query}
        >
          <IconForward size={14} />
        </button>
        <button className="findbar-btn findbar-close" title="Close (Esc)" onClick={close}>
          <IconClose size={13} />
        </button>
      </div>
    </div>
  );
}