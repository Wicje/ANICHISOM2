# ContinuaOS — The Creative Operating System

ContinuaOS is a browser-based and native local-first operating system designed to eliminate machine-switching and context-switching friction. Built for creators, founders, developers, and operators running multiple ventures, ContinuaOS lets you open your workspace on any device, close it, and reopen it on another—restoring windows, apps, files, and sessions exactly where you left off.

It replaces 5-10 separate productivity, design, and development tools with one unified, state-of-the-art desktop workspace.

---

## ✨ Key Architectural Features

* **🧠 Context Kernel Protocol (Layer 1)**:
  * **Lamport Vector Clocks**: True causal ordering and deterministic conflict resolution for distributed, offline multi-device editing.
  * **Granular Delta Synchronization**: Recursive diffing & patching engine to sync incremental object/array changes rather than full domain snapshots.
  * **Pluggable Storage Drivers**: Decoupled repository layer with `MemoryContextRepository` (for zero-cloud offline/local execution) and `SupabaseContextRepository` (for cloud sync).
  * **Tombstone Preservation**: Soft-deletion with causal tracking preventing deleted domain items from resurrecting on sync.
* **🖥️ Dual-Target Architecture (Web & Native Desktop)**:
  * Run anywhere in the browser as an installable PWA or compile as a native **Tauri** desktop executable for macOS, Windows, and Linux.
  * Native IPC bridge (`lib/services/native-bridge.service.ts`) providing direct local filesystem IO and host system telemetry.
* **🛍️ Plugin SDK & Developer Platform (Layer 3)**:
  * Official `@/lib/plugin-sdk` providing `context`, `storage`, `ui`, and `audio` APIs.
  * Capability-based permission sandbox host intercepting `postMessage` calls with fine-grained access control.
  * CLI template generator (`node scripts/continua-plugin-cli.mjs init <name>`) for community developers.
* **🖥️ Multi-Monitor & Satellite Display Sync**: Spawn satellite windows (`window.open('?display=2')`) and route applications across displays with real-time `BroadcastChannel` window synchronization.
* **🐚 WebAssembly Linux Terminal Engine**: Run real Linux commands (`neofetch`, `htop`, `python`, `node`, `curl`, `ping`, `uname`, `uptime`, `env`) powered by WebAssembly.
* **🤖 Offline WebGPU Local AI Engine**: 100% offline, zero-latency local LLM text generation using `navigator.gpu` without external API keys.
* **🎵 MacBook NotchNook & Action Center**: Physical notch anchored to `top-0` with expandable Spotify mini-player, AirDrop P2P discovery, Wi-Fi, Bluetooth, Night Shift blue-light filter, and display/sound sliders.

---

## 🚀 Cloud Deployment

The fastest way to deploy ContinuaOS for open access in the cloud is with **Vercel** and **Supabase**.

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
   * Ensure the **Build Command** is `next build` and the **Install Command** is `npm install --legacy-peer-deps`.
   * Click **Deploy**. Your OS will be live at `https://your-domain.vercel.app`.

---

## 🖥️ Desktop Installation (Tauri App)

For power users who need native access, frame-busting bypass (e.g., using Figma, Notion, or Miro inside the OS without iframe blocks), and direct host filesystem access.

### Local Development & Native Build

1. **Install Prerequisites**:
   Ensure you have Rust and Cargo installed. (Follow [Tauri's guide](https://tauri.app/start/prerequisites/)).
   On Linux:
   ```bash
   sudo apt update && sudo apt install -y libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
   ```

2. **Run Desktop Dev Mode**:
   ```bash
   npm run desktop:dev
   ```

3. **Build the Desktop Native Binary**:
   ```bash
   npm run desktop:build
   ```
   * **Linux output:** `src-tauri/target/release/bundle/appimage/continua-os_0.1.0_amd64.AppImage`
   * **macOS output:** `src-tauri/target/release/bundle/dmg/continua-os_0.1.0_x64.dmg`
   * **Windows output:** `src-tauri/target/release/bundle/msi/continua-os_0.1.0_x64_en-US.msi`

---

## 🔌 Plugin Developer Platform (Layer 3)

Create third-party applications and workspace plugins that interface with Continua's Context Layer:

### 1. Scaffold a New Plugin
```bash
node scripts/continua-plugin-cli.mjs init my-plugin --category=productivity --author="Your Name"
```

### 2. Plugin SDK Integration
```typescript
import { initContinuaSDK } from '@/lib/plugin-sdk';

const sdk = initContinuaSDK('my-plugin');

// Access persistent context
const theme = await sdk.ui.getTheme();
const data = await sdk.context.get('my-domain');

// Write state or send OS notifications
await sdk.context.set('my-domain', { active: true });
await sdk.ui.notify('Task Complete', 'Export finished successfully', 'success');
```

---

## ⚙️ Core Technical Setup

### Running Locally with Real-Time Collaboration

```bash
# Starts Next.js frontend + local Express/Socket.io WebSocket server on port 1234
npm run dev:local
```

### Self-Hosting Stack (Docker Compose)
A production-ready stack is available for self-hosting with local file storage (MinIO) and session caching (Redis):

```bash
cp .env.example .env.local
docker-compose -f docker-compose.self-hosted.yml up --build -d
```

---

## 🛡️ Architecture & Security Model

```
╔═══════════════════════════════════════════════════════════╗
║  LAYER 3 — ECOSYSTEM & PLUGIN DEVELOPER PLATFORM          ║
║  Continua Plugin SDK ↔ Capability Sandbox Host            ║
╠═══════════════════════════════════════════════════════════╣
║  LAYER 2 — CORE APPS & HARDWARE (Built-in Workspace)      ║
║  [Multi-Monitor]  [Hardware Drivers]  [WASM Terminal]     ║
╠═══════════════════════════════════════════════════════════╣
║  LAYER 1 — CONTEXT KERNEL PROTOCOL (State & Sync)         ║
║  Vector Clocks ↔ Delta Sync ↔ Pluggable Storage Drivers   ║
║  Local IndexedDB / OPFS ↔ Tauri IPC Native Bridge         ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 🧪 Testing & Verification

```bash
# Run unit & integration test suite (45 test suites, 649 tests passing)
npm test

# Type checking
npx tsc --noEmit

# Run End-to-End (E2E) UI Tests with Playwright
npx playwright test
```

---

## 📝 Documentation

| File | Purpose |
|---|---|
| [VISION.md](file:///home/zk3/workstation/experiments/ANICHISOM2/VISION.md) | Product vision, multi-tier roadmap, and business plan |
| [ARCHITECTURE.md](file:///home/zk3/workstation/experiments/ANICHISOM2/ARCHITECTURE.md) | Technical specification, Context Kernel schema, and IPC protocols |
| [SETUP.md](file:///home/zk3/workstation/experiments/ANICHISOM2/SETUP.md) | In-depth credential configuration (Supabase, Sentry, Resend, OAuth) |
| [AUDIT_JULY2026.md](file:///home/zk3/workstation/experiments/ANICHISOM2/AUDIT_JULY2026.md) | Architectural audit and quality assurance report |
| [supabase-schema.sql](file:///home/zk3/workstation/experiments/ANICHISOM2/supabase-schema.sql) | SQL setup queries for database tables, triggers & policies |
