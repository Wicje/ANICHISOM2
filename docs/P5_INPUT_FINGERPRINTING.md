# P5 — Input fingerprinting (open-source tech audit + v1 design)

Goal: add "same human behind the keyboard" as a *soft* factor in the trust
score, so session/vault recovery is not purely machine-based. Never a
deterministic device identity. Never transmitted raw.

## Candidate tech

| Candidate | Type | Fit for Continua desktop | Notes |
|---|---|---|---|
| **Keystroke cadence (self-built)** | Behavioural | ★★★ | keydown/keyup deltas + hold times, hashed locally. Zero deps, tiny, portable across the Tauri webview. Recommended v1. |
| `browser-fingerprint` (Valve) | Static device fingerprint | ★★☆ | Rust crate via `spawn`; natural for a Tauri shell. Adds deps + a sandboxed child process (WebKitGTK sandbox conflicts); caller's OS API surface is still fingerprintable. Defer until moat needs hardware entropy. |
| `device-detective` (rust) | Static OS sponge | ★☆☆ | Screen/webcam/power clues. Overkill; live in `trust.rs` already. |
| ThumbmarkJS | Browser (canvas/WebGL/audio) | ★☆☆ | Spoofable, web-only, less relevant in a native webview. |
| `evdev`/`libinput` (HID micro-features) | Behavioural (raw input) | ★☆☆ | Linux-only, requires root/sudo + dedicated thread; captures only hashed micro-features. High complexity, low cross-platform value. |
| `threat-model-huge` crates (TLS timings etc.) | Behavioural | — | Academic; adds latency noise. Skip. |

## Recommendation

Keep P5 a **soft, local, privacy-tight side signal**:

1. **v1: keystroke cadence hasher (no deps).**
   Capture `keydown→keydown` inter-key deltas and `keydown→keyup` hold times
   on the chrome's own inputs (address bar, palette query, NewTab search).
   Feed them through FNV-1a (already implemented in `trust.rs`) into a rolling
   digest window (e.g., last 256 events). Expose only the digest + a
   sample-count to `trust.rs`; never the raw timings, never the keycodes.
2. **v2 (optional): `browser-fingerprint`** once a sandbox story exists
   (needs `tauri-plugin-shell` scope + widget ref.pipe). Adds a second,
   static signal; still gated by the same "soft, weighted" rule.
3. **Trust merge:** `trust_score = w1·uptime + w2·device_staleness +
   w3·cadence_stability`, where cadence raises the score only when the digest
   has been *consistent for N samples on the same device* — a sudden change
   should *lower* trust, not raise it.

## Threat model (why this stays soft)

- Cadence is replayable in theory (someone can type steadily), so it can
  never authenticate alone. It only bumps the score range a trusted device
  can claim, and flags anomalies (e.g., two live instances typing
  identically).
- Hashed locally with a per-device salt from `trust.rs`'s keyring anchor, so
  cross-device correlation is impossible without the anchor.
- No raw timings persist beyond the rolling window; nothing leaves the
  machine in v1.

## Spike (this branch)

`continua-desktop/src/lib/cadence.ts` — dependency-free capture + FNV-1a
digest, wired to the address bar and palette inputs. Digest + sample count
are exposed for inspection via `window.continuaCadence`. Not persisted, not
transmitted.