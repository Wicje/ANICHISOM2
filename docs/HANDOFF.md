# HANDOFF — where work stopped (2026-10-04, battery dying)

Read this first on the next machine. Everything below is committed and pushed;
nothing described here lives only on the old laptop.

## What just shipped (in this push)

**Chrome-like in-tab navigation** — the "redirecting behaviour is not like
Chrome" complaint. Two mechanisms were forking EVERY plain link click into a
new tab, so nothing ever navigated in place and Back never worked across
clicked links:
- `main.js#will-navigate`: deleted the `preventDefault() + forkTab()` branch.
  Plain clicks, JS location changes and meta refreshes now navigate the same
  tab. Guards kept (internal schemes, mailto:, POST forms, non-http).
- `content-preload.js`: deleted the capture-phase click interceptor that
  rewrote plain clicks to `window.open(url, "_blank")`. SPA pushState/hash
  navs are covered by `did-navigate-in-page → recordNav`, which grows the same
  back/forward stack. Real new-tab gestures (Ctrl/Cmd+click, middle-click,
  target=_blank, window.open, save-to-disk) still open tabs via
  `setWindowOpenHandler` — verified by reading every disposition branch.

**Status: implemented + statically verified, NOT live-verified.** It needs an
app restart (main.js + preload load at boot) and a click-through test. The
user was actively browsing; no restart was forced.

## Verify next (in this order, on the next machine)

1. `npm run test:browser` → expect 199 tests / 195 pass / 0 fail / 4 skipped
   (better-sqlite3 native probe).
2. `npm -w apps/desktop exec tsc -- --noEmit` → clean.
3. `npm -w apps/desktop run build` → clean.
4. `node scripts/check-build-files.cjs` → 27 modules packaged, 26 test files wired.
5. Restart the browser, click a Google/DDG result → must navigate IN the same
   tab; Back must return; Ctrl+click must still open a new tab; an OAuth-style
   multi-step flow must not spray tabs.
6. Re-run the vision check: `node <tmp>/look.cjs both` against the live bridge.

## Queued (user asked, not started)

1. **Start-page tiles show letter glyphs, not real favicons.** `webapps.js`
   `pickIconHref` (declared icons → /favicon.ico) fails silently at install
   time; tiles fall back to letter glyphs. Fix at install: fetch + cache the
   icon bytes into the profile dir, fall back gracefully. Files:
   `apps/desktop-electron/webapps.js`, `main.js#renderStartPage`.
2. **Google is not the default search engine.** Find where the default engine
   is seeded (`custom_engines` / `search_engine` defaults) and make Google
   default. Check `apps/desktop/src/chrome/engine-list.ts` +
   `apps/desktop-electron/keywords.js` + store defaults.
3. **Theme customization story.** A theme gallery exists; what's missing is the
   user-authored side: a documented theme format + import/export in Settings.
   See `apps/desktop/src/lib/themes.ts`, SettingsPanel theme section,
   `docs/STRATEGY.md` ("what we refuse" does NOT cover this — it's wanted).
4. **Packaged installer smoke test.** `npm -w apps/desktop-electron run
   dist:win` then launch the unpacked app. Never done since the build.files
   fix; the crash it prevents was only ever proven by the guard script.
5. **Docs overhaul** (user asked, partially done): root README positioning is
   written; still missing: `docs/AGENT_TRUST_SPEC.md` (open policy-engine +
   log-format spec — the credibility half of the wedge), per-workspace READMEs
   (`apps/desktop-electron/README.md` doesn't exist), and recording the
   `see_visual`/`see_chrome`/`click_at`/`type_at`/`layout_state` ops in
   `docs/AGENT_TRACK.md` (code is ahead of docs here).

## Known live issues (seen with own eyes via see_chrome)

- Tab strip went empty (`tab-strip is-rail`, all `.tab` visibility:hidden)
  when overflow auto-rail triggered with ~11 tab elements and no visible rail.
  Needs repro + fix; do NOT "fix" by hiding the rail — find why TabRail
  didn't render.
- `--chrome-h` measured 876px (whole window) in one session; host log showed
  `chromeH=727`. Suspect: full-height `.onboard-overlay` mounted inside
  `.chrome` inflating the measurement. Unconfirmed.
- Onboarding overlay renders behind native content views when they aren't
  hidden (invisible onboarding, stray badges peeking at bottom-left).
- `chrome_modal` hide path was reworked (immediate hide, always re-assert,
  snapshot_tab reveals-then-restores, duplicate agent-approval modal id
  removed) — all UNVERIFIED live. Re-test the palette-over-page case first.
- Window launched minimized (0x0) and stayed broken-sized (159x27 sliver)
  until manually resized via OS calls; content views painted black until a
  fresh launch. `sizeView` floors at 200px but nothing re-lays-out on
  restore/unminimize. Product fix wanted: skip sizing on 0x0 windows +
  `layoutViews()` on window restore/show/focus.

## Machine-specific notes (borrowed laptop)

- Repo clone lives at `C:\Users\Vathos\AppData\Local\Temp\opencode\ANICHISOM2`
  (temp dir — re-clone on a new machine; nothing unpushed).
- Dev harness scripts (`look.cjs`, `probe.cjs`, `use-visual.cjs`,
  `ui-dom-check.cjs`, `boundary-check.cjs`, `grant-check.cjs`,
  `ui-playwright.cjs`, `inspect.cjs`, `ctrlk.cjs`, `diag-palette.cjs`,
  `palette-look.cjs`, `modal-probe.cjs`, `audit-completeness.cjs`,
  `ui-smoke.cjs`, `ui-harness-entry.tsx`, `commit-msg*.txt`,
  `shots/`, `uidom/`) live in `C:\Users\Vathos\AppData\Local\Temp\opencode\`
  and are NOT in the repo. Copy them over if the visual loop is still needed.
- `%APPDATA%\continua-browser` holds the live profile — never delete it again.
  (It was wiped several times during testing; current session state is real.)
- Electron binary was installed via `node node_modules/electron/install.js`
  (postinstall was skipped by `--ignore-scripts`). `node_modules` is complete
  in the clone but also lives in temp.
- SSH to GitHub fails on this machine (host key verification); push over
  HTTPS worked. If SSH fails on the next machine too, use HTTPS.
- The user drives the browser in **Chrome** side-by-side and compares
  behaviour directly — fastest verification loop is "do what Chrome does".
- User's words for open threads: "ctrl k is not working well", "we dont have
  official icons and favicons on homepage", "google search is not default",
  "people can build custom theme and looks and feel", "redirecting behaviour
  is not like chrome" (fixed in code, restart pending).
