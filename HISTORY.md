# ANICHISOM OS - Development History

This document tracks all features added, how they work, and how to use them.

## Phase 1: Pure Web UI Enhancements

### 1. Settings App (Appearance Customization)
- **What it is**: A dedicated app to customize the OS visual experience.
- **How to use**: Click the "Settings" icon in the dock or Launchpad. You can pick from preset wallpapers or input a custom image URL. You can also pick accent theme colors which update the CSS variables (`--color-neon-blue`) system-wide.
- **Implementation**: Stored in \`lib/os-context.tsx\`, hydrated from IndexedDB, and dynamically injected via a \`<style>\` block in \`components/desktop.tsx\`.

### 2. Typography Engine
- **What it is**: Allows changing the system font.
- **How to use**: Open the Settings app, go to Typography, and select from preset fonts like Inter, Space Mono, or Playfair.
- **Implementation**: The chosen font is saved to OS context and applied to the root Desktop div via inline styles.

### 3. Screen Shaders & Filters
- **What it is**: Real-time GPU-accelerated visual filters over the entire OS.
- **How to use**: Open the Settings app, go to Screen Shaders, and select effects like CRT Scanlines, Night Shift, High Contrast, or Matrix Green.
- **Implementation**: Rendered as a `pointer-events-none` overlay div in `desktop.tsx` using Tailwind CSS mix-blend modes and filters.

### 4. Native Window Switcher (Ctrl+Tab)
- **What it is**: A fast way to cycle between open windows, similar to macOS `Cmd+Tab`.
- **How to use**: Hold \`Ctrl\` and press \`Tab\`. Keep pressing \`Tab\` to cycle. Release \`Ctrl\` to focus the selected window.
- **Implementation**: A global `keydown` and `keyup` listener in `desktop.tsx` that tracks the `Control` key and active windows on the current workspace.

### 5. Launchpad (App Launcher)
- **What it is**: A full-screen grid view of all installed applications.
- **How to use**: Click the Grid icon in the dock or the Apple () logo in the top menu bar. Click an app to open it.
- **Implementation**: An absolute positioned overlay in `desktop.tsx` that iterates over the `APPS` registry and displays icons based on user roles.

### 6. Mission Control (Workspace Management)
- **What it is**: A zoomed-out view showing all desktops and all open windows.
- **How to use**: Click the Layers icon in the dock. You can click a Desktop to switch to it, or click an open window to focus it.
- **Implementation**: An overlay in `desktop.tsx` that scales down the active windows and provides a bird's eye view of the OS Context state.

### 7. Color Utility App
- **What it is**: A standalone tool for designers to pick, convert, and save colors.
- **How to use**: Open "Color Utility" from the Launchpad. Use the native color picker to find a color, convert it to HEX/RGB, and save it to your palette.

## Phase 2: Advanced Browser APIs

### 8. Web Notifications API
- **What it is**: System-level desktop notifications from OS apps.
- **How to use**: Apps can call `notify(title, options)` from `useOS()`. The OS will handle asking the user for browser notification permissions automatically.
- **Implementation**: Added to `os-context.tsx`. Falls back to an internal event log if blocked by the browser.

### 9. Screen Recorder & Share App
- **What it is**: A native utility to capture your screen and save it as a video.
- **How to use**: Open "Screen Record" from Launchpad. Click "Select Screen" to share a window. Click "Record" to start capturing. When you stop, a `.webm` file is generated, and a notification alerts you that it's ready to download.
- **Implementation**: Uses `navigator.mediaDevices.getDisplayMedia` and the `MediaRecorder` API. The video is converted to a Blob URL for preview and download.

### 10. OS Config Engine
- **What it is**: A dedicated system configuration file that handles lower-level OS behavior and keybinds.
- **How to use**: Open "OS Config" from the Launchpad. You can use the UI to configure Keybinds and Behaviors, or switch to "Raw JSON" to directly edit the config payload.
- **Implementation**: It saves and loads from a simulated native file system path (`.config/anichisom.json`) utilizing the underlying `FS.write` and `FS.read` logic. 

### 11. Keybind Management
- **What it is**: Configurable global keyboard shortcuts mapped to specific OS actions.
- **How to use**: Inside the "OS Config" app, you can map keys like `alt+t` to commands like `open:terminal`. When you save, the OS immediately honors these combinations globally.
- **Implementation**: Keybinds are parsed directly from the OS Config Engine JSON state. 

## Phase 3: The Tauri Native Hardware Bridge

*Note: Phase 3 features assume the Web OS is bundled into a native desktop executable via Tauri. The provided interfaces are pre-built to interact with native layers.*

### 12. Phone Connect
- **What it is**: A utility to sync an external mobile device via Bluetooth/USB.
- **How to use**: Open the "Hardware" app and go to the "Phone Connect" tab. You can initiate a Bluetooth handshake here.
- **Implementation**: A stubbed Tauri UI that prepares for low-level BT/USB polling via Rust.

### 13. Keyboard Layout Management
- **What it is**: Overriding host system input mapping.
- **How to use**: Open the "Hardware" app and go to the "Keyboard Layout" tab to select layouts like Dvorak, Colemak, or AZERTY.
- **Implementation**: Configures the UI preference. In the web version, the browser honors the host OS, but in the Tauri build, this will pipe commands to the Rust backend to intercept keystrokes.

### 14. Wireless Connection
- **What it is**: Built-in Wi-Fi and network scanning.
- **How to use**: Open the "Hardware" app and go to the "Wireless" tab to scan local networks and connect.
- **Implementation**: A mocked UI representing what Tauri network APIs will expose when compiled to desktop.

### 15. HDMI Monitor Connections
- **What it is**: Display detection and primary monitor configuration.
- **How to use**: Open the "Hardware" app and go to the "Displays" tab. Click "Detect Displays" to find plugged-in HDMI/DisplayPort monitors.
- **Implementation**: Prepares the OS display logic to handle multi-monitor state bridging from the Tauri window manager.

## Phase 4: Pro OS Features

### 16. Unified Control Center
- **What it is**: A macOS-style quick settings slide-out panel.
- **How to use**: Click the sliders icon next to the clock in the top right menu bar. You can adjust screen brightness, system volume, and toggle Wi-Fi, Bluetooth, AirDrop, and Do Not Disturb.
- **Implementation**: Lives in `components/control-center.tsx` and dynamically filters the document body to simulate hardware brightness adjustments.

### 17. Custom Right-Click Context Menus
- **What it is**: Overrides the default browser context menu to provide OS-level actions.
- **How to use**: Right-click anywhere on the empty desktop. A sleek, animated menu appears letting you change your wallpaper or spawn widgets.
- **Implementation**: An absolutely positioned overlay in `desktop.tsx` bound to the `onContextMenu` React synthetic event.

### 18. Desktop Widgets & Sticky Notes
- **What it is**: Pin floating utilities directly to your desktop layer.
- **How to use**: Right-click the desktop and choose "Add Sticky Note" or "Add CPU Monitor". You can type directly into the sticky note. Right-click any widget to delete it.
- **Implementation**: State stored in `os-context.tsx`/`desktop.tsx` as an array of widgets rendered beneath the active windows but above the desktop wallpaper.

### 19. Idle Lock Screen
- **What it is**: Automatically secures the OS when you step away.
- **How to use**: If there is no mouse or keyboard movement for 5 minutes, the screen blurs and locks, displaying a beautiful clock and your avatar. Click "Unlock" to resume.
- **Implementation**: Uses a global `setTimeout` that resets on `mousemove` and `keydown` in `desktop.tsx`.

### 20. OS Drag-and-Drop
- **What it is**: Bridge the gap between your physical computer and the Web OS.
- **How to use**: Drag a file (image, pdf, text) from your physical desktop and drop it directly into the browser window. A blue dashed overlay appears to catch it, and it writes directly into the OS's internal Virtual File System (`FS.write`).

## Phase 5: The Ultimate Desktop Experience

### 21. Interactive Desktop Icons
- **What it is**: A true visual desktop that renders files from your virtual file system.
- **How to use**: When you drag and drop files onto the OS, they are now saved to the `/Desktop` folder and rendered as interactive icons on your wallpaper. Double-clicking them opens them in the appropriate app.
- **Implementation**: Fetches directly from `FS.readDir('Desktop')` and renders in an absolute layer on the desktop.

### 22. App Hub (Plugin Store)
- **What it is**: A centralized marketplace to install third-party plugins or apps.
- **How to use**: Open "App Hub" from Launchpad. You can browse curated apps like the Nite Browser or CinePlay and click "Get". Once installed, they appear in your Launchpad.
- **Implementation**: Uses the `installApp` method in `os-context.tsx` to dynamically provision access to components.

### 23. Nite Browser (Arc Mode)
- **What it is**: A fully functional browser living *inside* the web OS, designed with an Arc-style vertical sidebar.
- **How to use**: Install it from the App Hub. You can navigate the web using tabs, pin favorites, and search via DuckDuckGo automatically when URLs aren't fully formed.
- **Implementation**: Built using an iframe engine (`components/apps/browser.tsx`) with dynamic tab state, loading spinners, and an anti-frame-busting UI.

### 24. CinePlay (Media Player)
- **What it is**: A high-fidelity native media player for audio and video, now with a premium glassmorphism interface and integrated file system playlists.
- **How to use**: Double-click an `.mp4` or `.mp3` file that you've dropped onto your desktop. CinePlay will launch automatically, offering playback controls, a scrubber, volume adjustment, and a slide-out playlist of all media found on your OS disk.
- **Implementation**: Uses native `<video>` and `<audio>` tags hooked into a custom React UI state (`components/apps/media-player.tsx`). Scans the `FS` abstraction to build playlists.

### 25. Campaign Lab (Command Center)
- **What it is**: A massive Notion-like document editor for strategy and design.
- **How to use**: Open Campaign Lab. The top bar is extremely clean—all phase management (Discovery, Design, Delivery) and sharing options are tucked inside the three-dot menu. Type `/` in the editor to access dozens of Notion-style blocks including:
  - Text, Headings (H1-H3), Checklists, Bullets, Numbers, Toggles
  - Quotes, Callouts, Dividers
  - Media & Files (Video, Audio, File, Web Bookmark, Code)
  - Database Views (Table, Board, Calendar, List, Gallery, Timeline)
  - AI Generation (`/action-ai`) to summon the System AI directly from your text cursor.
- **Implementation**: Built from scratch (`components/apps/campaign-lab/components/BlockEditor.tsx`) to support contenteditable-style textareas, block dragging, dynamic popup menus, and extensive block type tracking via `yjs`.

### 26. System AI Assistant
- **What it is**: An integrated virtual assistant for controlling the OS.
- **How to use**: Open "System AI" from Launchpad. You can ask it to "Change theme to blue", "Open the terminal", or "Enable CRT shader".
- **Implementation**: A natural language parser built in `components/apps/assistant.tsx` that directly invokes `os-context` hooks.


### 27. UI & Architecture Polish (Phase 2 Continued)
- **Top Bar Interactive Menus**: The OS top bar (File, Edit, View, Synced) now features functional dropdowns and toast notifications. "Save Desktop State" allows you to manually force a sync of the entire OS.
- **Custom Web Apps**: You can now add external web apps via the "Add Custom Web App" button inside the App Hub.
- **Productivity Suite Improvements**: The Office Suite's Save button is now functional and provides visual toast feedback.
- **Multi-Instance Support**: Moodboard and Productivity Suite now properly generate isolated window IDs, allowing you to open multiple distinct instances of them simultaneously without them syncing to the same global scratchpad.
