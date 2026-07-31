# ContinuaOS — The Creative Operating System

ContinuaOS is a browser-based, local-first operating system designed to eliminate machine-switching and context-switching friction. Built for creators, founders, developers, and operators running multiple ventures, ContinuaOS lets you open your workspace on any device, close it, and reopen it on another—restoring windows, apps, files, and sessions exactly where you left off.

It replaces 5-10 separate productivity, design, and development tools with one unified, state-of-the-art desktop workspace.

---

## ✨ Key Features & Next-Iteration Architecture

* **🖥️ Multi-Monitor & Satellite Display Sync**: Spawn satellite windows (`window.open('?display=2')`) and route applications across displays with real-time `BroadcastChannel` window synchronization.
* **🔌 Hardware & Peripheral Subsystem**: WebUSB, Web Bluetooth, and File System Access API drivers to mount host C: drives, external hard drives, USB devices, and pair wireless headsets.
* **🛍️ ContinuaOS App Store & PWA Manager**: Discover, install, uninstall, and launch PWAs and web integrations (Figma, GitHub, Notion, Spotify, VS Code Web, Linear, Canva, Slack).
* **🐚 WebAssembly Linux Terminal Engine**: Run real Linux commands (`neofetch`, `htop`, `python`, `node`, `curl`, `ping`, `uname`, `uptime`, `env`) powered by WebAssembly.
* **🤖 Offline WebGPU Local AI Engine**: 100% offline, zero-latency local LLM text generation using `navigator.gpu` without external API keys.
* **🎵 MacBook NotchNook & Action Center**: Physical notch anchored to `top-0` with expandable Spotify mini-player, AirDrop P2P discovery, Wi-Fi, Bluetooth, Night Shift blue-light filter, and display/sound sliders. Toggle notch visibility anytime.
* **📁 Smart "Open With..." Launcher**: Assign custom default applications per extension/MIME pattern with persistent smart route rules.

---

## 🚀 One-Click Deploy (For Web Beta Testers)

The fastest way to get ContinuaOS running in the cloud for up to **70 active beta testers at $0 cost** is deploying to **Vercel** and **Supabase**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FWicje%2FANICHISOM2&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,SUPABASE_SECRET_KEY,SUPABASE_JWTS_URL,NEXT_PUBLIC_APP_URL,NEXT_PUBLIC_AUTH_PROVIDER)

### Step-by-Step Cloud Deployment

1. **Create a Supabase Project**:
   * Sign up at [supabase.com](https://supabase.com) and create a new project.
   * Go to the **SQL Editor** -> **New Query**, paste the contents of [supabase-schema.sql](file:///home/zk3/workstation/experiments/ANICHISOM2/supabase-schema.sql), and click **Run**.
   * Go to **Database → Replication** and enable replication for: `users`, `context_records`, and `apps`.

2. **Deploy to Vercel**:
   * Import your cloned fork of this repository (`Wicje/ANICHISOM2`) to Vercel.
   * Configure the following environment variables:
     ```bash
     NEXT_PUBLIC_AUTH_PROVIDER=supabase
     NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
     SUPABASE_SECRET_KEY=your-service-role-key
     SUPABASE_JWTS_URL=https://your-project.supabase.co/auth/v1
     NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
     ```
   * Ensure the **Build Command** is set to `next build` and the **Install Command** is `npm install --legacy-peer-deps`.
   * Click **Deploy**. Your OS will be live at `https://your-domain.vercel.app`.

---

## 🖥️ Desktop Installation (Tauri App)

For power users who need native access, frame-busting bypass (e.g., using Figma, Notion, or Miro inside the OS without iframe blocks), and sandboxed system security.

### Local Development & Native Build

1. **Install Prerequisites**:
   Ensure you have Rust and Cargo installed. (Follow [Tauri's guide](https://tauri.app/start/prerequisites/)).
   On Linux:
   ```bash
   sudo apt update && sudo apt install -y libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
   ```

2. **Clone & Configure**:
   ```bash
   git clone https://github.com/Wicje/ANICHISOM2.git
   cd ANICHISOM2
   npm install --legacy-peer-deps
   cp .env.example .env.local
   # Update .env.local with your Supabase keys
   ```

3. **Build the Desktop Native Binary**:
   ```bash
   npm run tauri build
   ```
   * **Linux output:** `src-tauri/target/release/bundle/appimage/continua-os_0.1.0_amd64.AppImage`
   * **macOS output:** `src-tauri/target/release/bundle/dmg/continua-os_0.1.0_x64.dmg`
   * **Windows output:** `src-tauri/target/release/bundle/msi/continua-os_0.1.0_x64_en-US.msi`

---

## 👥 Onboarding & Managing Beta Testers

ContinuaOS is built to make onboarding seamless for your initial users.

### Step 1: User Onboarding Flow
1. Testers navigate to your deployed URL or launch the desktop client.
2. If they are new, they are greeted by the **Onboarding Wizard**. They pick their professional role (e.g., Creative Agency, Developer, Writer) and select which default app packs they want to pre-install.
3. Once completed, they are redirected to the **Signup/Login Screen** to persist their choices.

### Step 2: Restricting Access (Invite-Only Beta)
To run a gated beta:
* Go to **Supabase Dashboard → Authentication → Providers → Email**.
* Turn off **Confirm Email** or **Allow new users to sign up** if you want to explicitly invite users via the Supabase Auth Invite API.
* Alternatively, add an email domain constraint in Supabase or use the Admin panel inside ContinuaOS to approve accounts.

### Step 3: Distributing Tauri Desktop Apps
Compile the release binaries (see [Desktop Installation](#-desktop-installation-tauri-app)) and upload the built `.dmg`, `.msi`, or `.AppImage` to a download portal, Google Drive, or release them via GitHub Releases for your testers to install natively.

---

## ⚙️ Core Technical Setup

For active developers looking to host the full collaboration stack locally or self-host on a VPS.

### Running Locally with Real-Time Collaboration

```bash
# Starts Next.js frontend + local Express/Socket.io WebSocket server on port 1234
npm run dev:local
```

### Self-Hosting Stack (Docker Compose)
A production-ready stack is available for self-hosting with local file storage (MinIO) and session caching (Redis):

```bash
# Set up your environment variables
cp .env.example .env.local
docker-compose -f docker-compose.self-hosted.yml up --build -d
```

---

## 🛡️ Architecture & Security Model

```
╔═══════════════════════════════════════════════════════════╗
║  LAYER 3 — ECOSYSTEM (Venture Packs & App Store Apps)     ║
║  [Figma]  [GitHub]  [Notion]  [Spotify]  [VS Code Web]    ║
╠═══════════════════════════════════════════════════════════╣
║  LAYER 2 — CORE APPS & HARDWARE (Built-in Workspace)      ║
║  [Multi-Monitor]  [Hardware Subsystem]  [WASM Terminal]  ║
╠═══════════════════════════════════════════════════════════╣
║  LAYER 1 — THE ENGINE (State, storage, security, sync)    ║
║  IndexedDB / OPFS ↔ Yjs Docs ↔ WebGPU Local LLM           ║
║  Tauri IPC Sandboxing (Figma & Notion Frame Isolation)   ║
╚═══════════════════════════════════════════════════════════╝
```

* **Local-First Context Layer**: All user assets, system configs, and offline files are managed via a client-side database (IndexedDB/OPFS).
* **Encrypted Secrets**: Custom cloud integration tokens (Google Drive, Dropbox) are encrypted at rest (AES-256-CBC) before syncing to Supabase.
* **Window-Level Sandboxing**: Fatal app crashes are caught by isolated React `<ErrorBoundary>` containers inside `WindowFrame.tsx`, leaving the core OS runtime active and intact.
* **Storage Quota Management**: Prevents browser crashes by querying `navigator.storage.estimate()` before saving massive files offline.

---

## 🧪 Testing

```bash
# Run unit & integration test suite (600+ tests)
npm test

# Run End-to-End (E2E) UI Tests with Playwright
npx playwright test
```

---

## 📝 Documentation & Audit Reports

| File | Purpose |
|---|---|
| [AUDIT.md](file:///home/zk3/workstation/experiments/ANICHISOM2/AUDIT.md) | Full architectural assessment, security model, and next-iteration roadmap |
| [SETUP.md](file:///home/zk3/workstation/experiments/ANICHISOM2/SETUP.md) | In-depth credential configuration (Stripe, Resend, OAuth) |
| [ARCHITECTURE.md](file:///home/zk3/workstation/experiments/ANICHISOM2/ARCHITECTURE.md) | Technical deep dive on layout systems & event state logs |
| [VISION.md](file:///home/zk3/workstation/experiments/ANICHISOM2/VISION.md) | Product vision, business plan, and roadmap |
| [supabase-schema.sql](file:///home/zk3/workstation/experiments/ANICHISOM2/supabase-schema.sql) | SQL setup queries for database tables, triggers & policies |
