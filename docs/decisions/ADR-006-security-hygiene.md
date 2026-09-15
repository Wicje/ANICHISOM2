# ADR-006: Security & hygiene debt register (Phase 0)

**Status:** Accepted (2026-09-15) — execute before any feature work

## Context

The review found concrete debt that is cheap to fix now and expensive (or
embarrassing) later. This register is the Phase 0 work list; each item is
done-and-checked-off, not tracked forever.

## Register

| # | Item | Where | Action |
|---|------|-------|--------|
| 1 | **Committed CRX signing key** | `chrome-extension/continua-context-bridge.pem` | Revoke/rotate the key, remove from repo + history if feasible, regenerate; never commit key material again |
| 2 | **Favicon privacy leak** | `apps/desktop/src/lib/tauri-bridge.ts` (Google s2) | Local favicon cache with graceful fallback to a generated glyph; no third-party pings from chrome |
| 3 | **CSP is null** | `apps/desktop/src-tauri/tauri.conf.json` | Set a real CSP for the chrome webview |
| 4 | **Predictable fingerprint secret** | `apps/desktop/src-tauri/src/trust.rs:67-79` | SystemTime+PID → OS entropy source (`getrandom`/`/dev/urandom`); document that FNV-1a is hashing, not crypto |
| 5 | **Incognito shares persistent profile** | `tabview.rs:115-136` | Fixed structurally by ADR-003 (ephemeral context); until then, soften the "no trace" claim in UI copy |
| 6 | **Session archives never pruned** | `session.rs` | Cap the archive dir (keep N newest, prune on save) |
| 7 | **Homepage setting ignored** | config vs `tauri-bridge.ts` | Honor it in new-tab/restore paths or remove the setting |
| 8 | **Dead code** | `capture.rs` (100%), `inpage::zoom`+`ZOOM_SCRIPT`, `config.search_url`, unbound commands (`list_tabs`, `close_all_tabs`, `vault_store/get`, `is_bookmarked`) | Delete or wire; dead surface is drift bait |
| 9 | **Selftest battery hangs** | `tabview.rs` battery (rc=124) | Root-cause with the pool rework; keep the harness env-gated until then |
| 10 | **Doc drift** | all plan docs | SUPERSEDED banners per decision-log rule; one true roadmap file |
| 11 | **Vault ids guessable** | `vt-{unix_millis}` | Random ids (entropy fix #4 applies) |

## Consequences

- Phase 0 is days, not weeks, and unblocks honest marketing copy
  ("privacy-first" stops being an overstatement).
- Every fix lands as a small, reviewable commit referencing this ADR.
