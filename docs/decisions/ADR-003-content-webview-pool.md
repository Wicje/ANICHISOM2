# ADR-003: Multi-live-webview pool replaces single-live-page

**Status:** Accepted (2026-09-15) — build in Phase 1

## Context

`apps/desktop` runs ONE shared content webview (`tabview.rs`): switching tabs
navigates it. This was the right call for a 4GB dev machine and made the
single-window overlay possible. But only one page is ever live — background
tabs lose audio, SPA state, in-progress editors, and web-app sessions on every
switch. A browser that destroys your Google Docs draft when you peek at Slack
is a context viewer, not a daily driver. The env-gated selftest battery
hanging (`rc=124`) is the same class of problem: blocking evals against a
contended main thread.

Key enabling fact: WebKitGTK webviews sharing one `WebContext` share a single
web process, so N views in the same `gtk::Fixed` is the *efficient* shape on
this stack — each view is a widget, not a process. `tabview.rs` already has
every primitive: `CONTENT_WIDGET` thread-local, `run_on_main` marshalling,
`layout()` geometry, `WebContext` management.

## Decision

Replace the single content webview with a **pool of N live content webviews
(start K=4)**, LRU-evicted down to metadata when exceeded:

- Most-recent tabs keep a live webview (audio, SPA state, logins persist).
- Evicted tabs degrade to exactly today's behavior (URL + history + scroll in
  the engine; switching re-hydrates).
- Incognito tabs get a **separate ephemeral, non-persistent WebContext**.
- Find/zoom/reader state becomes per-tab (today they implicitly target
  whatever is on screen and vanish on switch).

## Consequences

- This is the daily-driver gate (ADR-005 #1) and the largest single
  engineering lift in the roadmap.
- Zoom stays a per-webview set (engine still owns the persisted factor).
- The eval/deadlock discipline documented in `lib.rs` gets re-audited against
  N views (one eval channel per view, timeouts unchanged).
- Memory ceiling is the knob: K is configurable, default 4, tuned on the
  4GB target machine.
