# Theme format — user-authored themes + import/export

A theme is a small JSON accent pack applied as CSS variables on `<html>`
(switch <16ms, no extra native views). Builtins live in
`apps/desktop/src/lib/themes.ts` (`BUILTIN_THEMES`); customs ride in config
`custom_themes` and sync per profile via `theme_id`. Incognito styling is
class-based and always wins — no theme may disguise private mode.

## Format (v1)

```json
{
  "id": "my-theme",
  "name": "My Theme",
  "accent": "#0071e3",
  "accentHi": "#2997ff",
  "glowA": "rgba(0,113,227,0.14)",
  "glowB": "rgba(0,113,227,0.08)"
}
```

- `id`: `[a-z0-9-]{1,48}` (auto-assigned `custom-xxxxxx` when missing/invalid).
- `name`: trimmed, ≤24 chars, defaults to `"Custom"`.
- `accent` / `accentHi`: required `#rgb` or `#rrggbb`.
- `glowA` / `glowB`: optional free-form CSS (<64 chars), default to neutral
  grays when absent.
- Unknown fields are ignored. Anything failing `sanitizeTheme()` is rejected
  with a plain-English message — never applied half-way.

## Share link

`continua://theme/<base64url-json>` carrying `{name, accent, accentHi, glowA,
glowB}` (see `encodeShare`/`decodeShare`). Links are copy/paste-friendly;
JSON files are exact (link payload drops `id`/`custom` by design).

## Import / export (Settings → Gallery)

- Paste a `continua://theme/` link → Import (validates, applies, stores).
- Share button copies the active theme as a link.
- Export JSON downloads the active theme as `<id>.theme.json`.
- Import JSON (file picker, `.json`) validates via the same `sanitizeTheme()`
  gate and applies on success. Malformed files are refused with the reason;
  nothing is written until validation passes.
