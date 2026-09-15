# ADR-005: The daily-driver bar

**Status:** Accepted (2026-09-15)

## Context

"Daily driver" is the acceptance bar for `apps/desktop`. Without explicit
criteria, "works on my machine" creeps in and the browser stays a demo.

## Decision

Continua Desktop is not called a daily driver until **all six** are true:

1. **Background tabs stay alive** — audio, SPA state, in-progress editors,
   sessions survive switching (ADR-003 pool).
2. **Incognito is actually ephemeral** — separate non-persistent
   `WebContext`; nothing written to the shared `webdata` profile
   (today: `tabview.rs` shares one persistent context — the "no trace"
   claim currently overstates).
3. **Pairing survives restart** — capability token persisted in the keyring
   (today: memory-only, re-pair every launch); **pull merges** instead of
   destructively replacing the local tab graph (the server's vector-clock
   kernel already supports this).
4. **No leaks** — self-hosted/cached favicons (today: every visited hostname
   is sent to Google's s2 service), a real CSP (today: `csp: null`), a
   crypto-random fingerprint secret (today: SystemTime+PID through FNV-1a).
5. **Zero context loss** — crash/quit-safe snapshots, session archive
   pruning (today: archives accumulate forever), homepage setting honored.
6. **Honest chrome** — no `window.prompt` UX for pairing/server URL;
   dead code removed (`capture.rs`, `inpage::zoom`, `search_url`).

## Consequences

- Items 1–3 are Phase 1; 4–6 are Phase 0 hygiene.
- The bar gates all shell-surface work (ADR-002): surfaces on a browser
  nobody can live in are theater — the exact mistake the web OS made.
