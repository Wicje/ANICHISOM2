/**
 * Remappable keyboard shortcuts — action ids are stable, combos are
 * per-profile config (`shortcuts` map, "ctrl+shift+t" style). Unmapped
 * actions fall back to their defaults below.
 */

export interface ShortcutAction {
  id: string;
  label: string;
  defaultCombo: string;
}

export const SHORTCUT_ACTIONS: ShortcutAction[] = [
  { id: "new-tab", label: "New tab", defaultCombo: "ctrl+t" },
  { id: "close-tab", label: "Close tab", defaultCombo: "ctrl+w" },
  { id: "reopen-tab", label: "Reopen closed tab", defaultCombo: "ctrl+shift+t" },
  { id: "incognito", label: "New private tab", defaultCombo: "ctrl+shift+n" },
  { id: "history", label: "History", defaultCombo: "ctrl+h" },
  { id: "downloads", label: "Downloads", defaultCombo: "ctrl+j" },
  { id: "find", label: "Find in page", defaultCombo: "ctrl+f" },
  { id: "address", label: "Focus address bar", defaultCombo: "ctrl+l" },
  { id: "settings", label: "Settings", defaultCombo: "ctrl+," },
  { id: "cycle-profile", label: "Next profile", defaultCombo: "ctrl+shift+m" },
  { id: "screenshot", label: "Screenshot", defaultCombo: "ctrl+shift+s" },
  { id: "studio", label: "Studio mode", defaultCombo: "ctrl+shift+f" },
  { id: "mru-next", label: "Next recent tab", defaultCombo: "ctrl+tab" },
  { id: "mru-prev", label: "Previous recent tab", defaultCombo: "ctrl+shift+tab" },
];

/** Normalize a key event to "ctrl+shift+t" style. Returns null for bare modifiers. */
export function comboOf(e: { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }): string | null {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
  if (["control", "shift", "alt", "meta"].includes(k)) return null;
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("ctrl");
  if (e.altKey) parts.push("alt");
  if (e.shiftKey) parts.push("shift");
  parts.push(k);
  return parts.join("+");
}

export function comboFor(actionId: string, map: Record<string, string> = {}): string {
  const custom = map[actionId];
  if (typeof custom === "string" && custom) return custom;
  return SHORTCUT_ACTIONS.find((a) => a.id === actionId)?.defaultCombo ?? "";
}

/** True when the event fires the action (custom combo wins, match is exact). */
export function fires(actionId: string, e: { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }, map: Record<string, string> = {}): boolean {
  const combo = comboOf(e);
  if (!combo) return false;
  return combo === comboFor(actionId, map);
}

/** Human label: "ctrl+shift+t" -> "Ctrl+Shift+T". */
export function prettyCombo(combo: string): string {
  return combo.split("+").map((p) => (p === "ctrl" ? "Ctrl" : p.length <= 1 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1))).join("+");
}
