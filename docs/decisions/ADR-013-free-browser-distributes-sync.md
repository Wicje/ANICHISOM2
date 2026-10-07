# ADR-013 — The browser is free forever; it distributes the sync cloud

- Status: accepted
- Date: 2026-10-07
- Decider: Wicje (Option B over Option A)
- Supersedes: the open question in `docs/STRATEGY.md` ("B2B seat licensing, or
  a permanently free browser that exists to distribute something else").

## Context

STRATEGY.md deliberately left monetisation undecided, with the warning that
half of each is the worst answer. The choice was forced: seat licensing needs
a sales motion, SOC posture, and admin surface that do not exist; meanwhile
every browser-side paywall (premium tiers, ads, paid default placement) would
directly betray the positioning — "none of Google's surveillance" cannot
survive an ads line or a search-default deal. So the browser cannot be the
thing that earns. It must be the thing that grows.

## Decision

1. **The browser is permanently free.** No premium tier, no feature paywall, no
   ads, no paid search-default or placement deals, ever. Any future proposal
   to charge for browser functionality must overturn this ADR explicitly.
2. **What it distributes is the Continua sync cloud** (the `apps/shell`
   backend: pairing, delta sync, devices). Local-first browsing — tabs,
   history, profiles, agent boundary — is free forever with no account. The
   paid surface, when it exists, is cloud scale and teams: storage/retention
   beyond the free tier, device count, family/team workspaces. Nothing in the
   browser's daily-driver loop may depend on paying.
3. **Enterprise gets the audit, not a fork.** If a company wants the trust
   boundary story, the answer is the same free browser plus (later) managed
   sync tenancy — never a separate "enterprise browser" SKU that splits the
   codebase.

## Consequences

**Gained**

- Positioning stays pure: every growth story ("no surveillance", "open
  policy engine") is compatible with the revenue story instead of fighting it.
- The engineering order becomes obvious: sync end-to-end (currently the top
  blocker, never observed against a live backend) is now the company's most
  important feature, ahead of any browser medium.
- Metrics simplify: free installs are reach; **sync-attached users** are the
  business. `sessions_restored_per_day` stays the product metric; add
  sync-attached share when the backend is live.

**Costs, accepted**

- The cloud costs money per user before any user pays. Free-tier abuse controls
  (device caps, retention caps, rate caps) are not optional polish — they are
  the business model working. Sync ships with caps from day one.
- No near-term revenue. The browser earns trust first and money later; runway
  must cover that gap. If runway cannot, revisit this ADR rather than
  smuggling a paywall into the chrome.
- Support load grows with free installs while revenue lags it. Docs, crash
  reporting, and the dogfood loop must carry quality before headcount does.

**Rejected**

- B2B seat licensing as the primary motion (no sales motion exists; building
  one now would starve the product).
- Browser premium tiers, ads, or paid defaults (positioning suicide).
- A separate enterprise browser SKU (codebase split for one customer type).

## What this makes true that was not

- `docs/STRATEGY.md` "consumer monetisation" refusal is now a positive:
  free is the strategy, not the absence of one.
- Sync E2E moves above all browser feature work in `ROADMAP.md` priority
  (it is the thing being distributed; an undistributed distributor is a hobby).
- No chrome UI may gate a daily-driver feature on payment. Review any
  `isPro`/`isPremium`/`paywall` pattern as a strategy violation, not a
  feature.
