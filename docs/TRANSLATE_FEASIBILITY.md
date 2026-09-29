# H8 — On-Device Translation: Feasibility Verdict

Status: **Spike complete — no on-device engine ships.** What ships is honest
detection + an opt-in endpoint client + explicit user-gated actions.

## Why there is no built-in page translation

- Electron/Chromium ships **no page-translate API**. Chrome Translate exists
  only inside Google Chrome proper and needs Google API keys.
- Firefox Translations is a real on-device engine, but it ships as a separate
  WASM download (~30–50 MB *per language pair*) — the browser only downloads
  a pair when you first translate into it.

So "translate this page" cannot be one line of Chromium code the way it is in
Chrome. Any honest implementation is a **choice between three costs**:

| Option | Privacy | Cost to ship | Verdict |
|---|---|---|---|
| Bergamot WASM (Firefox's engine) | 100% on-device | ~30–50 MB/pair, model host, Web Worker pipeline, per-language UI | Long-term recommended path, behind explicit per-language download |
| LibreTranslate-compatible endpoint (self-hosted / LAN) | Text leaves the device, stays on your infra | Low — HTTP POST, JSON in/out | Shipped now, **opt-in, default OFF** |
| Link-out (translate.google.com / DeepL URL) | Worst — text to a third party | Trivial (open URL) | Only as explicit user action, never automatic |

## What shipped

Implemented in `apps/desktop-electron/translate.js` (pure, unit-tested):

- **`detectLanguage(text)`** — script-range heuristics (Jpan/Hans/Kore/Cyrl/
  Arab/Deva/Thai/Grek/Latn) + Latin stopword signals. Deliberately
  conservative: returns `"unknown"` rather than guessing confidently.
- **`shouldOffer(pageLang, uiLocale, chars)`** — only offer translation when
  the detected language is *known*, differs from the UI locale, and the page
  has ≥200 characters.
- **`validEndpoint(url)` / `buildTranslateRequest(...)`** — validate a
  user-configured `http(s)` endpoint and shape a LibreTranslate-compatible
  request (`POST {base}/translate`, `{ q, source: "auto", target, format }`).
  Never called automatically.
- `translate_text` IPC enforces: **no endpoint → no call**, returns the
  feasibility verdict + a configuration hint instead of pretending.

## Privacy posture (this is the point)

- **Nothing is sent without an explicit user action.** No auto-translate on
  page load, ever. The palette's "Translate this page" and Settings → Translate
  → "Test on this page" are the only paths.
- **No third-party service is ever contacted by default.** The endpoint is
  empty unless the user configures one.
- The text being translated *is* the payload — the privacy story is "your
  endpoint, your LAN", told honestly in the Settings UI.

## Chrome surface (apps/desktop)

- Settings → **Translate**: endpoint field (http(s) URL), "Test on this page"
  against the live active tab (`read_page_text` + `translate_text`), Remove.
- Command palette → **"Translate this page"** / **"Detect page language"**:
  results (or the honest "no endpoint" hint) printed inline in the palette.
- `read_page_text` IPC doubles as the agent-track "see/read" primitive.

## Future path (if we ship on-device)

1. Ship Bergamot WASM + workers behind a per-language download UI.
2. Replace `translate_text`'s endpoint branch with the local engine — the
   chrome contract (`{ text }` / `{ error, hint }`) does not change.
3. Auto-offer bar (à la Chrome) only *after* the engine is downloaded for that
   language pair — never before.