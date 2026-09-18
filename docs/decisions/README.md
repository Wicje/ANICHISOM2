# Decision Log

Architecture Decision Records (ADRs) for Continua. Each record is immutable
once accepted: to change a decision, write a new ADR that supersedes it and
mark the old one `Superseded by ADR-XXX`.

Format per record: **Status / Context / Decision / Consequences**.

Standing rule: when an ADR invalidates an older plan document, that document
gets a `SUPERSEDED` banner at the top pointing here. No doc drift — the docs
must never contradict the code or each other.

| # | Decision | Status |
|---|----------|--------|
| [001](ADR-001-desktop-first.md) | Desktop-first: the Tauri browser is the product | Accepted |
| [002](ADR-002-browser-as-shell-host.md) | The OS shell lives inside the browser — one Tauri app | Accepted |
| [003](ADR-003-content-webview-pool.md) | Multi-live-webview pool replaces single-live-page | Accepted (Phase 1) |
| [004](ADR-004-web-shell-experiment.md) | `apps/shell` is a frozen experiment + cloud backend | Accepted |
| [005](ADR-005-daily-driver-bar.md) | The daily-driver bar: six criteria, all mandatory | Accepted |
| [006](ADR-006-security-hygiene.md) | Security & hygiene debt register (Phase 0) | Downgraded to best-effort by ADR-008 |
| [007](ADR-007-engine-sealed.md) | WebKitGTK sealed | Superseded by ADR-008 (Tauri = legacy-lite) |
| [008](ADR-008-chromium-dailydriver.md) | Chromium daily-driver + continuity, privacy tax removed | Accepted |
| [010](ADR-010-local-tab-intelligence.md) | Local-only tab intelligence, no cloud AI | Accepted |
