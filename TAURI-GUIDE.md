# Ziklag OS: Phase 3 (The Tauri Pivot)

To transform this web OS into a **native executable desktop application**, you will leverage Tauri. We have already prepared the codebase with the `@tauri-apps/api` bindings and created an abstract proxy layer (`/lib/fs.ts`) that will seamlessly switch context to Tauri's Native API for local file system access when it detects it is running within the Tauri WebView.

Follow these steps once you export the codebase to your local machine:

### 1. Prerequisites
Ensure you have the Rust and Node toolchains installed. Follow the [Tauri Prerequisites Guide](https://tauri.app/v1/guides/getting-started/prerequisites/).

### 2. Prepare Next.js for Static Export
Tauri relies on a statically exported web portal as its UI layer. 
Update your `next.config.ts`:
```ts
const nextConfig: NextConfig = {
    output: 'export', // Change from 'standalone' to 'export'
    // Ensure you disable any Server Actions/API Routes that can't run on the client
};
```

Update your `package.json` scripts:
```json
"scripts": {
  "tauri": "tauri"
}
```

### 3. Initialize Tauri
Run the initialization command in the root folder of this project:
```bash
npx tauri init
```
Press enter for all defaults, but configure the build settings as follows:
- **What is your build command?**: `npm run build`
- **What is your dev command?**: `npm run dev`
- **Where are your web assets located?**: `out`

### 4. Enable Native FS in Tauri
By default, Tauri blocks filesystem access for security. Open `src-tauri/tauri.conf.json`, and set your filesystem scopes so `lib/fs.ts` can read/write to your machine.
```json
"tauri": {
  "allowlist": {
    "fs": {
      "all": true,
      "scope": ["$HOME/**", "$DOWNLOAD/**"]
    }
  }
}
```

### 5. Build the Native Desktop OS!
Run the desktop window in developer mode:
```bash
npm run tauri dev
```
To bundle into an executable (`.dmg`, `.app`, or `.exe`):
```bash
npm run tauri build
```

The underlying code in `File Manager` (via `lib/fs.ts`) will now bypass indexedDB/Cloud and interact directly with your physical SSD!
