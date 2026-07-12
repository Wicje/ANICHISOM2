/**
 * Storage Connector Interface — universal bridge for ANY storage source
 *
 * Mirrors IAiProvider pattern: one interface, many implementations.
 * Users connect their Google Drive, Dropbox, or any storage — Files app is the bridge.
 *
 * Connectors handle:
 *   - OAuth2 connection flow (auth URL → callback → token storage)
 *   - Listing files and folders from cloud storage
 *   - Reading/downloading file content through server-side proxy
 *   - Uploading files to cloud storage
 */

export interface CloudFile {
  id: string;
  name: string;
  path: string;
  size?: number;
  mimeType?: string;
  modifiedTime?: string;
  isFolder: boolean;
  parentId?: string;
  thumbnailUrl?: string;
  webUrl?: string;
}

export interface CloudFileContent {
  id: string;
  name: string;
  mimeType: string;
  data: ArrayBuffer | string;
  size: number;
}

export interface ConnectResult {
  authUrl: string;
  state?: string;
}

export interface CallbackResult {
  connected: boolean;
  providerId: string;
  accountName?: string;
}

export interface StorageCapabilities {
  listFiles: boolean;
  readFile: boolean;
  writeFile: boolean;
  deleteFile: boolean;
  createFolder: boolean;
  searchFiles: boolean;
  shareFiles: boolean;
  maxFileSize: number;
  supportedMimeTypes: string[];
}

export interface IStorageConnector {
  /** Connector identifier — e.g. 'google-drive', 'dropbox' */
  id: string;

  /** Human-readable name */
  name: string;

  /** Icon name for UI rendering */
  icon: string;

  /** Check if this connector is configured (has API credentials) */
  isConfigured(): boolean;

  /** Get capabilities of this connector */
  getCapabilities(): StorageCapabilities;

  /** Generate OAuth2 authorization URL for user connection */
  connect(userId: string, redirectUrl: string): Promise<ConnectResult>;

  /** Handle OAuth2 callback — exchange code for tokens */
  handleCallback(userId: string, code: string, state?: string): Promise<CallbackResult>;

  /** Check if user has connected this storage provider */
  isConnected(userId: string): Promise<boolean>;

  /** Disconnect user's account (remove stored tokens) */
  disconnect(userId: string): Promise<void>;

  /** List files and folders at a given path */
  listFiles(userId: string, path?: string, pageToken?: string): Promise<{ files: CloudFile[]; nextPageToken?: string }>;

  /** Read/download a file's content */
  readFile(userId: string, fileId: string): Promise<CloudFileContent>;

  /** Get a proxy download URL for a file */
  getDownloadUrl(userId: string, fileId: string): string;

  /** Upload a file to cloud storage */
  uploadFile(userId: string, path: string, content: Buffer, mimeType?: string): Promise<CloudFile>;

  /** Create a folder */
  createFolder(userId: string, path: string): Promise<CloudFile>;

  /** Delete a file or folder */
  deleteFile(userId: string, fileId: string): Promise<void>;

  /** Search files by name */
  searchFiles(userId: string, query: string): Promise<CloudFile[]>;

  /** Get storage quota (total and used bytes) for a user */
  getQuota?(userId: string): Promise<{ total: number; used: number }>;
}

// ─── Shared Utilities ────────────────────────────────────────

const SYNC_PROMPT_THRESHOLD = 5 * 1024 * 1024; // 5 MB

export function shouldPromptSync(fileSize: number): boolean {
  return fileSize > SYNC_PROMPT_THRESHOLD;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
