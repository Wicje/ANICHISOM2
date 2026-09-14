import { useEffect, useRef, useState } from "react";
import type { ToastKind, ToastMsg } from "../lib/toast";

const LIFETIME = 2600;
const MAX = 4;

const KIND_TAG: Record<ToastKind, string> = {
  info: "",
  success: "✓",
  danger: "⨯",
};

export function Toasts() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  const timers = useRef<Record<number, number>>({});

  useEffect(() => {
    const onToast = (e: Event) => {
      const msg = (e as CustomEvent<ToastMsg>).detail;
      setItems((prev) => [...prev.slice(-(MAX - 1)), msg]);
      timers.current[msg.id] = window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== msg.id));
        delete timers.current[msg.id];
      }, LIFETIME);
    };
    window.addEventListener("continua:toast", onToast);
    return () => {
      window.removeEventListener("continua:toast", onToast);
      for (const t of Object.values(timers.current)) window.clearTimeout(t);
      timers.current = {};
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          {KIND_TAG[t.kind] && <span className="toast-tag">{KIND_TAG[t.kind]}</span>}
          <span className="toast-text">{t.text}</span>
        </div>
      ))}
    </div>
  );
}