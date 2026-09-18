/**
 * Continua theme gallery — Theme = JSON (ADR: personalization Phase 1).
 *
 * A theme is a small serializable accent pack applied as CSS variables on
 * <html>, so switching is <16ms with no extra native views. Builtins ship
 * here; user customs ride in config `custom_themes` and sync per profile
 * via `theme_id` (see sync.js). Incognito styling is CSS-class based and
 * always wins — no theme may disguise private mode.
 */

export interface Theme {
  id: string;
  name: string;
  /** Main action color (buttons, active states). */
  accent: string;
  /** Small-text / hover accent. */
  accentHi: string;
  /** Start-page glow tints. */
  glowA: string;
  glowB: string;
  custom?: boolean;
}

export const BUILTIN_THEMES: Theme[] = [
  { id: "midnight", name: "Midnight", accent: "#0071e3", accentHi: "#2997ff", glowA: "rgba(0,113,227,0.14)", glowB: "rgba(0,113,227,0.08)" },
  { id: "forest", name: "Forest", accent: "#188038", accentHi: "#34a853", glowA: "rgba(24,128,56,0.16)", glowB: "rgba(52,168,83,0.08)" },
  { id: "ocean", name: "Ocean", accent: "#0090a3", accentHi: "#12a5b8", glowA: "rgba(0,144,163,0.16)", glowB: "rgba(18,165,184,0.08)" },
  { id: "sunset", name: "Sunset", accent: "#e8710a", accentHi: "#f59e0c", glowA: "rgba(232,113,10,0.16)", glowB: "rgba(245,158,12,0.10)" },
  { id: "grape", name: "Grape", accent: "#7928ca", accentHi: "#8a63d2", glowA: "rgba(121,40,202,0.16)", glowB: "rgba(138,99,210,0.10)" },
  { id: "mono", name: "Mono", accent: "#6e6e73", accentHi: "#aeaeb2", glowA: "rgba(110,110,115,0.14)", glowB: "rgba(174,174,178,0.08)" },
];

const HEX = /^#(?:[0-9a-f]{6}|[0-9a-f]{3})$/i;

export function sanitizeTheme(t: unknown): Theme | null {
  if (!t || typeof t !== "object") return null;
  const o = t as Record<string, unknown>;
  if (typeof o.accent !== "string" || !HEX.test(o.accent)) return null;
  if (typeof o.accentHi !== "string" || !HEX.test(o.accentHi)) return null;
  const name = typeof o.name === "string" ? o.name.trim().slice(0, 24) || "Custom" : "Custom";
  const id = typeof o.id === "string" && /^[a-z0-9-]{1,48}$/.test(o.id) ? o.id : `custom-${Math.random().toString(36).slice(2, 8)}`;
  const glow = (v: unknown, fb: string) => (typeof v === "string" && v.length < 64 ? v : fb);
  return {
    id, name,
    accent: o.accent, accentHi: o.accentHi,
    glowA: glow(o.glowA, "rgba(128,128,128,0.12)"),
    glowB: glow(o.glowB, "rgba(128,128,128,0.06)"),
    custom: true,
  };
}

export function resolveTheme(id: string | undefined | null, customs: Theme[] = []): Theme {
  if (id) {
    const custom = customs.find((t) => t.id === id);
    if (custom) return custom;
    const builtin = BUILTIN_THEMES.find((t) => t.id === id);
    if (builtin) return builtin;
  }
  return BUILTIN_THEMES[0];
}

/** Apply a theme as CSS vars (instant, compositor-safe). */
export function applyTheme(t: Theme): void {
  const root = document.documentElement;
  root.style.setProperty("--accent", t.accent);
  root.style.setProperty("--accent-hi", t.accentHi);
  root.style.setProperty("--accent-deep", t.accent);
  root.style.setProperty("--glow-a", t.glowA);
  root.style.setProperty("--glow-b", t.glowB);
  root.style.setProperty("--guide", t.accent + "8c");
  try { localStorage.setItem("continua-theme-id", t.id); } catch { /* private mode */ }
}

/** Re-apply the last theme before config loads (no flash on boot). */
export function reapplyStoredTheme(customs: Theme[] = []): void {
  try {
    const id = localStorage.getItem("continua-theme-id");
    if (id) applyTheme(resolveTheme(id, customs));
  } catch { /* ignore */ }
}

/** Share link payload: continua://theme/<base64url-json>. */
export function encodeShare(t: Theme): string {
  const raw = JSON.stringify({ name: t.name, accent: t.accent, accentHi: t.accentHi, glowA: t.glowA, glowB: t.glowB });
  return "continua://theme/" + btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShare(link: string): Theme | null {
  const m = link.trim().match(/continua:\/\/theme\/([A-Za-z0-9\-_]+)/);
  if (!m) return null;
  try {
    const b64 = m[1].replace(/-/g, "+").replace(/_/g, "/");
    return sanitizeTheme(JSON.parse(atob(b64)));
  } catch {
    return null;
  }
}
