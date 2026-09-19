# ADR-011 — Shields default-on + store installs without accounts

- **Status:** ACCEPTED (2026-09-19)
- **Related:** ADR-008 (privacy tax removed), ADR-010 (local-only intelligence)

## Context

P1 gaps for daily use: no content blocking, no one-click extension installs.
Both touch the same nerve as ADR-010 — features that normally phone home
(filter-list telemetry, store sign-in). Continua can do both fully locally.

## Decision

1. Tracker/ad blocking ships ON by default from an on-device host set
   (~70 entries, main frames never touched). No list telemetry, no remote
   config. Breakage escape hatch: per-site off in Site prefs + global toggle.
2. Chrome Web Store installs fetch the CRX from Google's update endpoint and
   extract locally (unzip/tar fallback chain). No Google account, no store
   session. Failures surface as plain errors, never silent.
3. better-sqlite3 stays optional: packaged builds without it run the JSON
   store (same data, substring history search). No native rebuild may block
   any release (this bit us on Windows CI).

## Consequences

- `SHIELD_HOSTS` + `wireShields` in main.js; `shields`/`download_ask` config.
- `installStoreExtension` in main.js; Settings gets the URL box.
- Release workflow passes `--config.npmRebuild=false` on Windows.
