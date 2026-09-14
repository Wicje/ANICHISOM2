/**
 * ContinuaOS App SDK — Types
 * 
 * Core type definitions for building ContinuaOS plugins.
 */

import { ReactNode } from 'react';

// ─── App Registration ───────────────────────────────────────

export interface AppManifest {
  /** Unique app identifier (e.g., 'my-plugin') */
  id: string;
  /** Display name */
  title: string;
  /** App description */
  description: string;
  /** Version string (semver) */
  version: string;
  /** App author */
  author: string;
  /** App category */
  category: AppCategory;
  /** Icon: Lucide icon name OR image URL */
  icon: string;
  /** Optional image URL for the icon (overrides Lucide) */
  iconImage?: string;
  /** Roles that can access this app */
  roles: UserRole[];
  /** Initial window size */
  size?: { width: number; height: number };
  /** Minimum window size */
  minSize?: { width: number; height: number };
  /** Whether the app can be opened multiple times */
  multiInstance?: boolean;
  /** Tags for searchability */
  tags?: string[];
  /** App permissions required */
  permissions?: AppPermission[];
}

export type AppCategory =
  | 'productivity'
  | 'creative'
  | 'development'
  | 'media'
  | 'system'
  | 'games'
  | 'utilities'
  | 'social'
  | 'finance'
  | 'education';

export type UserRole =
  | 'filmmaker'
  | 'photographer'
  | 'developer'
  | 'designer'
  | 'marketer'
  | 'business'
  | 'student'
  | 'other'
  | 'user'
  | 'admin';

export type AppPermission =
  | 'filesystem:read'
  | 'filesystem:write'
  | 'camera'
  | 'microphone'
  | 'notifications'
  | 'clipboard:read'
  | 'clipboard:write'
  | 'network:fetch'
  | 'storage:local'
  | 'storage:cloud';

// ─── Plugin Context ─────────────────────────────────────────

export interface PluginContext {
  /** Get the current user */
  getUser(): User | null;
  /** Get the user's role */
  getRole(): UserRole;
  /** Read a domain from the Context Layer */
  readDomain(domain: string): Promise<Record<string, unknown> | null>;
  /** Write to a domain in the Context Layer */
  writeDomain(domain: string, data: Record<string, unknown>): Promise<void>;
  /** Show a notification */
  notify(options: NotificationOptions): void;
  /** Open a file picker */
  openFilePicker(options?: FilePickerOptions): Promise<FileHandle | null>;
  /** Read a file from the virtual filesystem */
  readFile(path: string): Promise<ArrayBuffer | null>;
  /** Write a file to the virtual filesystem */
  writeFile(path: string, data: ArrayBuffer | Blob | string): Promise<void>;
  /** Create a folder */
  createFolder(path: string): Promise<void>;
  /** List directory contents */
  listDirectory(path: string): Promise<FileEntry[]>;
  /** Delete a file or folder */
  delete(path: string): Promise<void>;
  /** Show a modal dialog */
  showModal(options: ModalOptions): Promise<ModalResult>;
  /** Get storage quota information */
  getStorageQuota(): Promise<StorageQuota>;
  /** Subscribe to filesystem changes */
  onFsChange(callback: (event: FsChangeEvent) => void): () => void;
  /** Subscribe to notifications */
  onNotification(callback: (notification: NotificationEvent) => void): () => void;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface NotificationOptions {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

export interface FilePickerOptions {
  multiple?: boolean;
  accept?: string[];
  directory?: boolean;
}

export interface FileHandle {
  name: string;
  size: number;
  type: string;
  read(): Promise<ArrayBuffer>;
}

export interface FileEntry {
  name: string;
  path: string;
  isFolder: boolean;
  size?: number;
  mimeType?: string;
  lastModified?: number;
}

export interface ModalOptions {
  title: string;
  content: ReactNode;
  actions?: ModalAction[];
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface ModalAction {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface ModalResult {
  action?: string;
}

export interface StorageQuota {
  used: number;
  quota: number;
  percentage: number;
}

export interface FsChangeEvent {
  type: 'create' | 'update' | 'delete' | 'move' | 'copy';
  path: string;
  newPath?: string;
  timestamp: number;
}

export interface NotificationEvent {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

// ─── Component Types ────────────────────────────────────────

export interface AppComponent {
  /** Unique ID matching the manifest */
  id: string;
  /** The React component to render */
  component: React.ComponentType<AppProps>;
}

export interface AppProps {
  /** The plugin context for accessing OS services */
  context: PluginContext;
  /** Whether the app is currently focused */
  focused: boolean;
  /** Window ID for this instance */
  windowId: string;
}

// ─── SDK Version ────────────────────────────────────────────

export const SDK_VERSION = '1.0.0';
