# Continua Desktop — The Continuity Browser

**Vision**: A browser that never forgets. Session memory, login persistence, native workspace capture, and a cloud OS shell so any machine becomes interchangeable.

**Status**: Plan v1 — zero budget, 4GB dev machine, solo executor.

---

## 1. Why Tauri (not Chromium)

- Chromium fork = 16GB RAM / 100GB disk build, perpetual upstream merges. Impossible on this hardware.
- Tauri uses the **OS-native webview** (WebKitGTK on Linux, WebView2 on Windows, WKWebView on macOS).
- Rust core gives native OS access: window titles, active apps, file watchers, system keyring → the "daemon" we killed is resurrected as the browser's back-end.
- Built on `wry` → real multi-webview tabs, not iframe hacks.
- Result: ~8MB binary, low RAM, compiles on a 4GB laptop.
- Blockers: `webkit2gtk`, `libayatana-appindicator` — one `pacman -S` call each. (This is what blocked Tauri before.)

---

## 2. Architecture

```
┌────────────────────────────────────────────────────────────┐
│  React UI — browser chrome                                 │
│  [Tab strip] [Address bar] [Workspace switcher]            │
│  Reuses existing: workspace-switcher, restore panel,       │
│  continuity store, team store                              │
├────────────────────────────────────────────────────────────┤
│  WebViews (wry) × N — each tab is a native webview         │
├────────────────────────────────────────────────────────────┤
│  Rust Core (contributes ~60-70% of product)                │
│  ├── WebViewManager      — tabs, windows, navigation       │
│  ├── CaptureEngine       — window titles, active app,      │
│  │                         file watchers → context         │
│  ├── SessionManager      — tab graph save/restore,         │
│  │                         "resume where you stopped"      │
│  ├── VaultEngine         — encrypted login repository      │
│  ├── TrustEngine         — device fingerprint + capability │
│  └── SyncClient          — Supabase push/pull + offline    │
│                            queue (SQLite)                  │
└────────────────────────────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────────────────────┐
│  Cloud (already built, unchanged)                          │
│  Supabase: auth (OAuth+passkeys), workspaces, context,     │
│  device trust, orgs                                         │
│  Next.js dashboard at continuaos.cc (/os)                   │
│  Extension (wedge) stays — data + users while browser      │
│  ships                                                      │
└────────────────────────────────────────────────────────────┘
```

### The three layers = one company

| Layer | Today | Tomorrow | Pitch role |
|---|---|---|---|
| Wedge | Extension + dashboard | (stays) | Data, users, retention |
| Moat | — | Tauri browser + cloud shell | Distribution, native capture, sessions |
| Standard | — | Continuity protocol/SDK | Any browser/OS can adopt |

The browser is not the company. **The continuity layer is.** The browser is its distribution face.

---

## 3. The Security Core — the defensible moat

**Cross-device "login persistence" that is honest and secure** (1Password model, not magic):

- Logins are stored in a **VaultEngine**, encrypted at rest with a random vault key.
- The vault key is **wrapped by an account key** derived from the user's passkey/biometric identity.
- Cloud stores only the *wrapped* vault → it can recover the vault for the account owner, but never read it.
- New machine: user authenticates with same identity (passkey) → unwrap vault → sessions restored.
- No plaintext sessions ever touch the cloud. Compromise of Supabase = attackers get encrypted blobs only the account key unlocks.

This is the piece VCs lean in on: *"you've made logins a user property instead of a device property."*

---

## 4. Roadmap — zero budget, 4-6 weeks to demo

### Phase 0 — Foundation (Week 1)
| Deliverable | Detail |
|---|---|
| Install Tauri deps | `webkit2gtk`, `libayatana-appindicator` |
| Scaffold | `create-tauri-app` (React + TS), project `src-tauri` |
| Multi-webview tabs | wry WebViewBuilder stack, tab switching, close/open |
| Rust → React bridge | `emit`/`listen` for tab lifecycle events |

**Exit**: Browser window with working multi-tab webviews, controlled from React chrome.

### Phase 1 — Browser basics (Weeks 2-3)
| Deliverable | Detail |
|---|---|
| Chrome UI | Tab strip, address bar, back/forward, history, downloads sidebar |
| Navigation core | URL bar → webview.respond, new tab, favicon, title |
| SessionManager | Save tab graph on exit; restore on launch ("remembers where you stopped") |
| SyncClient | Wire existing `/api/context/save` + `/api/workspaces/*` from Rust |

**Exit**: Real usable browser. Close it, reopen it → tabs come back.

### Phase 2 — Continuity + Vault (Weeks 4-5)
| Deliverable | Detail |
|---|---|
| VaultEngine | keyring-backed store; wrap/unwrap with passkey-derived key |
| TrustEngine | fingerprint + capability detection (reuse `lib/capabilities.ts` logic in Rust) |
| CaptureEngine | window title / active app → context events → workspace |
| Workspace chrome | Embed existing workspace-switcher + restore-panel in tab chrome |
| Cloud OS shell | `/os` dashboard reachable as a tab ("any-machine recovery") |

**Exit**: Browse, log in, lose the laptop → new machine + passkey → tabs + logins restore.

### Phase 3 — Demo & package (Week 6)
| Deliverable | Detail |
|---|---|
| Production build | `.AppImage` + `.deb` via Tauri bundler |
| Demo video | 60s scripted walkthrough |
| One-pager | Vision / wedge / market / team / ask |
| Extension still live | Chrome Web Store submission continues in parallel |

**Exit**: Installable on any Linux machine + 60s CEO-demo + deck-able one-pager.

---

## 5. The Demo Script (what VCs see)

```
00:00  Machine A — Continua Desktop opens, 6 tabs restore instantly
00:08  "Fitbit for your browser" — green capture dot, resource count climbs
00:15  Sign in to 2 sites (Figma, GitHub) via passkey
00:25  Close the browser. Pick up the café laptop (Machine B).
00:35  Install Continua Desktop (8MB), launch, sign in with passkey
00:45  All 6 tabs reopen. Figma + GitHub already signed in. Workspace restored.
00:55  "The machine is temporary. Your workspace isn't."
```

Closing line for the room: *the browser we just watched restore itself across machines is 8 megabytes and runs on any OS a webview runs on. No server-side session theft — the vault only opens under the owner's key.*

---

## 6. Zero-Budget Infrastructure Map

| Need | Free tier |
|---|---|
| Source/build | GitHub Actions (Tauri build on Linux runners) |
| Rust deps | crates.io |
| Cloud | Supabase free (already using) |
| Hosting | Vercel (already deployed) |
| Distribution | GitHub Releases for AppImage/deb; later Flatpak/AUR |
| Keys/monitoring | System keyring (native), Sentry free tier |
| Extensions store | Chrome Web Store ($5 one-time) |

Everything stays free until users demand more.

---

## 7. Deferred (vision, not code — for now)

- **Protocol/SDK layer** (Layer 3): only after browser ships and someone asks for it.
- **Servo / Ladybird**: not ready for real sites; revisit yearly.
- **Windows/macOS builds**: Tauri cross-compiles later; Linux-first is fine for the demo.
- **Full desktop shell**: dashboard-as-tab now; the heavy shell stays deferred.

---

## 8. The Pitch in One Breath

> "Every browser today treats your machine as the truth. When it dies, or you sit at someone else's keyboard, you start over. Continua is building the browser where your workspace is the truth — sessions, logins, tabs, context all live in a vault under your key and follow you to any machine. Today it's an extension syncing real usage. Next it's this browser. Eventually it's a protocol every browser can adopt."

---

## 9. First Engineering Action (this week)

1. `pacman -S webkit2gtk libayatana-appindicator` — unblocks Tauri
2. `npm create tauri-app@latest continua-desktop -- --template react-ts`
3. Get wry multi-webview tabs rendering inside React chrome
4. Commit + push to `git@github.com:ANICHISOM/Continua.git`

---

## 10. Implementation Status

**Scaffolded (build-first, test-later):**

- OS shell resurrected at `app/os/shell` — the loved web desktop (dock,
  launchpad, window manager, apps) now runs as a tab; "Desktop" quick link
  in the Tauri New Tab. On-thesis demo: your OS is a tab, machine is arbitrary.
- `continua-desktop/` — Vite 6 + React 18 frontend: `app.tsx` session
  restore/save, shorten `tauri-bridge.ts`, `BrowserChrome`/`TabStrip`
  chrome UI, address bar, session auto-save on quit.
- `src-tauri/` — Tauri 2 desktop: `tab_engine.rs` (per-tab `WebviewWindow`
  positioned below the chrome strip, relayout on resize), `session.rs`
  (JSON snapshots in app config dir), `vault.rs` (OS keyring), `trust.rs`
  (device fingerprint), `capture.rs` (native captures, xdotool on X11),
  `sync.rs` (POST to `/api/context/save` via `tauri::http`).
- Layout source-of-truth lives in Rust: frontend only triggers relayout on
  resize; Rust derives tab geometry from the main window rect.

**Deferred (explicitly, by operator):**

- `pacman -S webkit2gtk libayatana-appindicator` — compile blocker.
- `npm install` in `continua-desktop/`; all compile/typecheck/tests.
- Multi-webview verification and switch to single-window wry if v2 APIs
  don't play nicely with per-tab `WebviewWindow`s.