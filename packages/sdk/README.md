# ContinuaOS App SDK

Build plugins for the ContinuaOS platform.

## Installation

```bash
npm install continuaos-sdk
```

## Quick Start

```tsx
import { registerApp } from 'continuaos-sdk';
import type { AppManifest, AppProps } from 'continuaos-sdk';

const manifest: AppManifest = {
  id: 'my-plugin',
  title: 'My Plugin',
  description: 'A custom plugin for ContinuaOS',
  version: '1.0.0',
  author: 'Developer',
  category: 'utilities',
  icon: 'Plug',
  roles: ['user', 'admin'],
};

function MyApp({ context }: AppProps) {
  const user = context.getUser();
  return <div>Hello, {user?.name || 'Guest'}!</div>;
}

registerApp(manifest, MyApp);
```

## API Reference

### `registerApp(manifest, component)`

Registers an app with ContinuaOS.

### `AppProps`

- `context: PluginContext` — Access to OS services
- `focused: boolean` — Whether the app is currently focused
- `windowId: string` — Unique window ID for this instance

### `PluginContext`

- `getUser()` — Get current user
- `getRole()` — Get user role
- `readDomain(domain)` — Read from Context Layer
- `writeDomain(domain, data)` — Write to Context Layer
- `notify(options)` — Show a notification
- `readFile(path)` — Read a file
- `writeFile(path, data)` — Write a file
- `createFolder(path)` — Create a folder
- `listDirectory(path)` — List directory contents
- `showModal(options)` — Show a modal dialog

### `createMenuItem(label, onClick, options?)`

Create a context menu item.

### `createShortcut(key, callback, options?)`

Create a keyboard shortcut.

## Examples

See `examples/quicknote/` for a complete note-taking app example.

## Development

```bash
cd sdk
npm install
npm run dev
```

## License

MIT
