/**
 * ContinuaOS App SDK
 * 
 * Build plugins for the ContinuaOS platform.
 * 
 * @example
 * ```tsx
 * import { ContinuaOSApp, registerApp } from 'continuaos-sdk';
 * 
 * const manifest = {
 *   id: 'my-plugin',
 *   title: 'My Plugin',
 *   description: 'A custom plugin',
 *   version: '1.0.0',
 *   author: 'Developer',
 *   category: 'utilities',
 *   icon: 'Plug',
 *   roles: ['user', 'admin'],
 * };
 * 
 * function MyApp({ context }: AppProps) {
 *   const user = context.getUser();
 *   return <div>Hello, {user?.name || 'Guest'}!</div>;
 *   }
 * 
 * registerApp(manifest, MyApp);
 * ```
 */

// Re-export all types
export * from './types';

// ─── App Registration ───────────────────────────────────────

import { AppManifest, AppComponent, AppProps } from './types';

/**
 * Register a ContinuaOS app.
 * Call this in your app's entry point to register it with the OS.
 */
export function registerApp(
  manifest: AppManifest,
  component: React.ComponentType<AppProps>
): AppComponent {
  // Validate manifest
  if (!manifest.id) {
    throw new Error('[ContinuaOS SDK] App manifest must have an "id" field');
  }
  if (!manifest.title) {
    throw new Error('[ContinuaOS SDK] App manifest must have a "title" field');
  }
  if (!manifest.version) {
    throw new Error('[ContinuaOS SDK] App manifest must have a "version" field');
  }

  // Validate component
  if (typeof component !== 'function') {
    throw new Error('[ContinuaOS SDK] App component must be a React component');
  }

  // Return the registered app (the OS will collect these)
  return {
    id: manifest.id,
    component,
  };
}

// ─── Context Helpers ────────────────────────────────────────

/**
 * Create a context menu item for your app.
 */
export function createMenuItem(
  label: string,
  onClick: () => void,
  options?: { icon?: string; shortcut?: string; disabled?: boolean }
) {
  return {
    label,
    onClick,
    icon: options?.icon,
    shortcut: options?.shortcut,
    disabled: options?.disabled,
  };
}

/**
 * Create a keyboard shortcut for your app.
 */
export function createShortcut(
  key: string,
  callback: () => void,
  options?: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean }
) {
  return {
    key,
    callback,
    ctrl: options?.ctrl,
    shift: options?.shift,
    alt: options?.alt,
    meta: options?.meta,
  };
}

// ─── Version ────────────────────────────────────────────────

export const SDK_VERSION = '1.0.0';
