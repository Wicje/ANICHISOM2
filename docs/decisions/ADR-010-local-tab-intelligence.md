# ADR-010 — Local-only tab intelligence (no cloud AI)

- **Status:** ACCEPTED (2026-09-18)
- **Related:** ADR-008 (Chromium daily-driver, privacy tax removed)

## Context

Every 2026 AI browser (Comet, Dia, Neon) organizes tabs with cloud AI that
reads browsing data; Atlas already died proving the model fragile. Chrome's
forced auto-grouping actively annoys users (support threads, no off switch).
Meanwhile a vocal segment (Firefox kill-switch, Vivaldi "no AI", the viral
"Just the Browser" stripper) wants intelligence that never leaves the disk.
Continua already owns the primitives: tab-group registry, pool
discard/rehydrate, per-tab process metrics.

## Decision

1. Tab grouping suggestions are computed on-device (`groups.js`: same-site
   clustering + title-keyword overlap, singletons never suggested,
   incognito never clustered). Applying is always explicit — suggestions
   stay suggest-only; the only automation is the opt-in same-site toggle.
2. Sleeping tabs are first-class UI (faded pill + 💤 + wake-on-click),
   backed by the existing pool discard. Auto-sleep is time-based, default
   30 min, 0 = off.
3. Memory figures come from Chromium `app.getAppMetrics()` mapped per tab —
   no estimation theater.
4. No embeddings, no LLM calls, no network in this feature. Ever.

## Consequences

- `groups.js` (+ tests) is the only clustering code; the palette "Tidy tabs"
  section is its sole surface besides the strip badges.
- If cloud-assisted organizing ever ships, it needs a new ADR and explicit
  per-profile opt-in — this ADR forbids silent expansion.
