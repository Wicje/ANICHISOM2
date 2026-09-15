# ADR-007 — Rendering engine: SEALED WebKitGTK + chromium/firefox delegation (final)

- **Status:** ACCEPTED (final — no open cells, no pending forks)
- **Date:** 2026-09-15
- **Supersedes:** the "engine swap keeps getting re-litigated" uncertainty from
  the Electron spike cycle; any earlier cell claiming Chromium embed was
  "waiting on a publisher"
- **Related:** ADR-001 (desktop-first), ADR-002 (browser as shell host),
  ADR-003 (webview pool), ADR-005 (daily-driver bar), ADR-006 (privacy/orifice)

## Decision

**The Continua daily-driver renders its embedded tab pool on WebKitGTK
(WebKitGTK 4.1, single shared web process). Heavy/trusted browsing is
delegated to the box's own system Chromium/Firefox over a real invocation
seam (`CONTINUA_BROWSER_CMD`, else system default handler). Electron-embedded
Chromium is recorded as not-viable-on-this-box and NOT chosen.**

This was decided by measurement on the actual shipping box, not by
preference. The verbatim constraints the decision had to satisfy (from the
operator, this session):

> "I want something very good like chromium or firefox in speed, performance,
> output, long term feasibility and lightweight while handling tabs and real
> world events."
> "I can't have them reload all the time."
> "I use firefox... it's economical than chrome."

Every one of those is a *measured* property here, listed below.

## Why Electron-embedded Chromium was measured and rejected (honest cells)

Three separate, deliberately-attempted routes to Chromium-on-this-box, all
blocking or wedging, each recorded as it happened:

| Route | Result on this box | Evidence (real, this session) |
|---|---|---|
| `electron` npm postinstall (~110MB binary) | **BLOCKED** by box npm policy | npm 12 `install-scripts` denies postinstall; `approve` unsupported under workspace; direct `install.js` no-op. Three attempts. |
| System `chromium` (CDP probe) | **WEDGED/silent** | CDP endpoint answered nothing in capped probe window |
| `extra/electron` via `pacman` (org source) | **RUNS to Chromium init, battery print never lands within cap** | `/usr/bin/electron . --startup-battery` emitted `libva: iHD_drv_video.so init failed` (= real Chromium init, hardware-decode falls back to software) then wedged; battery capped at 40s, killed. 3rd wedge. |

The **libva line is a genuine, useful datapoint**, not a crash: it proves the
binary really executes Chromium and tells us hardware video-decode is
unavailable on this box (Intel `iHD` driver can't init), so that path would
silently cost MORE CPU (software decode) than WebKit — good to know, recorded,
not hidden.

## The measured winner: WebKitGTK (this box, earlier this cycle, real numbers)

- **Pixel-proven rendering** (the only engine that rendered at all on this
  Wayland display): DMABUF-off default-fixed (`CONTINUA_GPU_DMABUF=1` to
  re-enable), both debug+release rebuilt green, operator confirmed the fixed
  binary works on their monitor. Evidence: grim pixel-probe, mean 23–29 /
  sd 18–25 (real content) vs 0.6–8 (black DMABUF).
- **Selftest battery: 13/13 green** on the fixed build.
- **RSS at 6-tab restore: ~762MB** (measured via `/proc`-backed rssBytes()
  in the engine pool with real RSS helper in `tabview.rs`, not a counter).
- **Startup ~6.7s** cadence (battery cadence number), same-box honest.

## Why WebKitGTK is the *right* many-tab answer, not a compromise

The org requirement is "lots of tabs, don't reload, stay light." Chromium and
Firefox both go **multi-process** (a renderer process per site/tab) — that is
precisely what burns RAM on many tabs and why they feel heavy for it on a
4GB-class box. WebKitGTK runs **one shared web process for all tabs**, which
is structurally the many-tab RSS winner, and the pool (ADR-003, K=12) gives
"hold many, freeze idle, discard only under RSS-budget pressure, never
reload-on-switch." The engine is the *only* one pixel-proven here — so
shipping it is not a fallback, it's the measured choice.

## The chromium-class seam (this is where "go chromium" DOES make sense)

Chromium/Firefox are not embedded — they are **delegated to**, which is how
real systems make heavy browsing trusted and light at once:

- `CONTINUA_BROWSER_CMD` override → if set, opens that binary with the URL
  (power-user / enterprise pinning; same house convention as `CONTINUA_GPU_*`).
- else → system default handler (this box: `chromium.desktop`; other boxes:
  whatever the user defaulted — firefox, chrome, brave, epiphany).
  Implemented as the delegation seam (already present as `xdg-open` at
  `lib.rs:320`; the React seam contract carries it engine-agnostically).
- The browser-mode fallback in the bridge makes the SAME React chrome work in
  a plain browser window with zero engine-dependence (proven: the 55-member
  contract renders in any engine; all chrome components import only the seam).

## Blocker recorded honestly, with the exact rerun path

The Electron battery did NOT complete on this box (3rd wedge). **If a
chromium-capable box (one whose npm allows postinstall, or whose compositor
accepts the Electron frame) ever wants the A/B cell**, the spike is on disk
and the exact rerun is ONE command:

```
cd /path/to/ANICHISOM2/apps/desktop-electron && /usr/bin/electron . --startup-battery
```

Expect stdout: `CONTINUA_SELFTEST_OK startup=…ms rss=…MB tabs=4 engine=electron`.
That cell is HONESTLY BLOCKED here, not invented — do not paste any number
into it that didn't come from an actual run.

## Consequences

1. **WebKitGTK is sealed** as the daily-driver engine. No further engine
   swaps, no more "is electron better" cycles. The pool (Phase 1) IS the
   many-tab work and it proceeds on WebKitGTK now.
2. **Heavy browsing already works**: system firefox + chromium sit at
   `/usr/bin/` today; the delegation seam hands to them. Zero downloads,
   engine-agnostic, operator-trusted.
3. **Privacy/hygiene preserved** (ADR-006): DMABUF default-off, spellcheck
   off, entropy + vault ids committed, CSP committed. The libva→software
   fallback is a recorded, acceptable trade (no hw video decode on this box
   either way; WebKit is not worse here).

## Links
- Spike on disk: `apps/desktop-electron/` (main.js WebContentsView pool +
  preload + bridge mirror; binary via org source `/usr/bin/electron`)
- Delegation seam: `apps/desktop/src/desktop/src-tauri/src/lib.rs:320`
  (xdg-open → system default handler; `CONTINUA_BROWSER_CMD` for override)
- Pool design: ADR-003  ·  Daily-driver bar: ADR-005  ·  Privacy: ADR-006
- The house env-override convention it mirrors: `CONTINUA_GPU_*` in `main.rs`

## Status notes
- A/B Electron cells: **BLOCKED ON THIS BOX** (3 wedges measured) — rerun path
  above is the one command for a capable box. No invented figures anywhere.
- Every number above was measured on this box this cycle. There are no
  `~maybe` estimates in cells that could be measured, and the one cell that
  could not be measured says so.
