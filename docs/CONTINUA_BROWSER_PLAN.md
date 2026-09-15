# Continua Desktop — The Continuity Browser

**Vision**: A browser that never forgets. Session memory, login persistence, native workspace capture, and a cloud OS shell so any machine becomes interchangeable.

**Status**: Plan v1 — zero budget, 4GB dev machine, solo executor.

---

## 1. Why Tauri (not Chromium)

- Chromium fork = 16GB RAM / 100GB disk build, perpetual upstream merges. Impossible on this hardware.
- Tauri uses the **OS-native webview** (WebKitGTK on Linux, WebView2 on Windows, WKWebView on macOS).
- Rust core gives native OS access: window titles, active apps, file watchers, system keyring → the "daemon" we killed is resurrected as the browser's back-end.
- Built on `wry` → native webviews, not iframe hacks. Tabs render in a
  `wry` view hosted inside the chrome window (see §2).
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
│  Content view (wry) — ONE tab webview in a gtk::Fixed      │
│  overlay under the chrome strip; switching tabs navigates  │
│  it (WebKit shares one web process — one window).          │
├────────────────────────────────────────────────────────────┤
│  Rust Core (contributes ~60-70% of product)                │
│  ├── WebViewManager      — tabs, navigation, overlay       │
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
3. Get wry tab content rendering inside React chrome (single-window overlay)
4. Commit + push to `git@github.com:ANICHISOM/Continua.git`

---

## 10. Implementation Status

**Shipped (this repo, `apps/desktop/`):**

- Single-window tabbed browser — the React chrome (tauri `main` webview) is
  reparented into a `gtk::Fixed` overlay spanning the window; tab pages load
  in ONE `wry` content webview (`tabview.rs`). Switching tabs navigates that
  view; geometry is driven from Rust (`chrome_height`, rail inset), scaled to
  physical px. No per-tab OS windows: on Wayland they scattered/reshuffled
  other tiled apps.
- Worker→main marshalling — worker/command threads hop to the GTK main thread
  via a captured glib `MainContext` (`run_on_main`); blocking reads use
  `eval_sync` (channel + timeout, never on the main thread). The wry `WebView`
  is `!Send` on Linux, so it lives in `thread_local!` storage.
- Immersive/clean mode — runtime chrome height, global shortcuts
  (`ctrl+shift+f`, `escape`), `set_immersive`. Immersive hides the chrome and
  covers the window with the page (single-window: the chrome stays mounted).
- Workspace resurrection — rich `TabRecord` (history/index/scroll), session
  snapshots with active tab + immersive state, auto-restore on launch.
- Context-memory new tab — checkpoint timeline of saved sessions, restore
  any point by id.
- Command palette (Ctrl+K) — open URL, switch tab, restore/export/import
  session, toggle focus mode, quick links.
- Shareable sessions (local-first) — export a portable checkpoint to the
  user's file manager; import any `.json` with full tab adoption.
- Vault tabs (encrypted pinned) — a tab's URL/title/history/scroll live only
  in the OS keyring manifest; the plaintext session file stores an opaque
  `vault_id`. Closing a vault tab wipes the manifest; autosave re-encrypts
  scroll each cycle.
- Layout source-of-truth lives in Rust: frontend only triggers relayout on
  resize; Rust derives tab geometry from the main window rect.

Roadmap for what comes next: see `docs/CONTINUA_ROADMAP.md` (server session
sync via the context kernel + capability tokens, moat device-auth, icon /
branding, tests + HiDPI, input-fingerprinting research).

**Scaffolded earlier (superseded by the above):**

- `src-tauri/` (browser engine) — `tab_engine.rs` first used per-tab
  `WebviewWindow`s positioned below the chrome strip; replaced by the
  single-window wry overlay (above). `session.rs` (JSON snapshots in app
  config dir), `vault.rs` (OS keyring + vault manifests), `trust.rs`
  (device fingerprint), `capture.rs` (native captures, xdotool on X11),
  `sync.rs` (context pushes to `/api/context/save`).
- OS shell living as a tab: `app/os/shell` (dock, launchpad, window manager)
  — "Desktop" quick link in the Tauri New Tab. On-thesis demo: your OS is a
  tab, the machine is arbitrary.

**Deferred (by operator):**

- Per-tab OS windows: the tauri child-webview positioning safeties did not
  land upstream (tauri#10420 / wry#1745), and Wayland makes window
  positioning a no-op, so tabs run in the in-app overlay. Revisit only for
  pop-out-at-will tabs (needs upstream multi-webview position fixes).
- Server-side session sync, moat device-auth, branded icon, HiDPI audit,
  Rust unit tests, input-fingerprint factor — all tracked in the roadmap.