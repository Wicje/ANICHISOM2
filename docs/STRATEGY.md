# Strategy — where Continua wins, and what we refuse to build

Written 2026-10-04. This is the decision filter: a feature ships only if it
serves one of the three bets below or holds parity. Anything else is a
distraction, however good it looks in a demo.

## The position

**Chromium-compatible, nobody's surveillance.**

Electron means we inherit Chrome's engine wholesale — extension ecosystem,
Widevine DRM, codecs, autofill, site compatibility, Google-account sign-in —
for free. Firefox, Brave, Zen and Floorp all fight that battle and lose ground.
Our wedge is not "a better browser"; it is *all of Chrome's compatibility with
none of Google's surveillance*, plus an agent trust boundary nobody else has.

We will not beat Chrome or Edge on distribution. Edge ships with every Windows
PC, Safari with every Mac, Chrome with every phone. Any plan that requires
"people switch their default browser" loses in year three.

So: **do not fight for the default slot.** Chrome's own data shows most people
run 2-3 browsers and default to one. The default is defended hard; the second
slot is defended lazily. Own one job completely and let the rest be parity.

## Bet 1 — The agent trust boundary (the wedge)

The 2026 category is the agentic browser, and every entrant has the same flaw:
they hand the model ambient authority over the session. That is the biggest
unsolved problem in the category, and incumbents cannot fix it without
cannibalising the engagement metrics their business runs on.

We already have the answer, enforced and audited (ADR-012): reads are free,
writes need a human-issued single-use grant bound to the exact action, page
content can never approve, credential ops are user-only, and every decision is
in a tamper-evident hash chain a user or auditor can verify offline.

That converts into three compounding assets:

- **Compliance moat.** An enterprise can adopt "every automated page action is
  logged, hash-chained, and required a named human approval". Feature moats get
  copied in a sprint; this cannot be shipped by a competitor that wants
  engagement.
- **Distribution through AI agents.** The only growing browser channel in 2026
  is agents and creators telling people what to use. If MCP clients recommend
  Continua *because* the boundary exists, we get distribution from an ecosystem
  the incumbents do not control.
- **Credibility.** Open-source the policy engine and the log format even if the
  app stays closed. A security story nobody can inspect is not a security story.

## Bet 2 — Continuity is the retention moat

Full session resurrection — history, scroll, zoom, closed ring, containers,
per-profile stores, additive-only sync — landing on another machine intact.
A 200-tab research session that comes back exactly as it was is not something
"synced tab groups" matches. It is the reason users do not leave after arriving.

It is retention, not acquisition. It earns the right to keep a user; it is not
the reason one shows up.

## Bet 3 — Own one workflow, not the default

Pick one wedge and be the best thing in the world at it. Candidates: research
(large multi-tab sessions), work (the agent boundary), a kids'/school laptop
(on-device, shields by default, no account), or banking (isolated containers).
Four is worse than one. Name the one before the next feature lands.

## What we refuse to build

**Parity maintenance only** — the 12 mediums, theme gallery, Tidy tabs,
read-aloud, full-page screenshots, keyword search, task manager. Every one of
them is real work that a funded competitor ships in a sprint, and *nobody
switches a browser for a task manager*. They stay because removing them is
regression risk for existing users. They get zero new development time. The
last feature batch went here; that was a mistake and should not be repeated.

**Consumer monetisation of the browser.** Decided 2026-10-07 (ADR-013): the
browser is permanently free — no premium tier, no ads, no paid defaults — and
exists to distribute the sync cloud (free local-first browsing forever; paid
surface is cloud scale/teams later). Nobody pays for a browser, and we cannot
out-monetise a search default. A separate enterprise browser SKU is likewise
refused: one codebase, managed tenancy later if ever.

**A GPUI/Rust chrome rewrite.** Recorded because it will be asked again.
Chromium + Rust + GPUI in one window is not possible: two toolkits cannot both
own a window's compositing, which is exactly why Zed's webview work fails
(webview always on top, cursor trapped, Wayland impossible). CEF + Rust is
possible and re-implements Electron badly. If Rust is wanted for hot paths, add
it to the host via napi-rs and leave the UI alone. ADR-008 stands.

**Agent "unattended mode" as a default.** It may exist as a loud, per-profile,
chain-logged opt-in. It must never be the default — the boundary is the
product, and the boundary is the constraint.

## The only metrics that count

Feature count is not a signal. These are:

1. **Sessions restored per day.** Does continuity work, on a real machine, for
   a real person? Counted in `metrics.js`, surfaced in `Managers → Agent audit`.
2. **Agent writes and denials per day.** Is the boundary being used, and is the
   agent behaving? A high denial rate is a bad agent, and it should be visible.
3. **Daily humans with a restored session ≥ 50 tabs.** The number that says the
   product is real.

If DAU-with-real-sessions is still zero six months after a release, the
strategy failed regardless of how many features shipped.

## Immediate order of work

1. Ship what breaks trust: packaging boot, container restore, bridge token
   perms. A browser that loses a profile partition or leaks a token has no
   strategy.
2. Dogfood Continua as the only browser for 30 days. Fix what breaks. No new
   features in that window.
3. Get to 50 daily users who each restore a real session.
4. Then, and only then, spend on acquisition: the audit log as the story, an
   open policy engine, an MCP client people can point at their agent.