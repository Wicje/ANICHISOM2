/**
 * Cloud Storage Connector Interface
 *
 * Unified interface for different cloud storage providers
 * (Google Drive, Dropbox, OneDrive, etc.)
 */

export interface CloudFile {
  id: string;
  name: string;
  path: string;
  isFolder: boolean;
  mimeType?: string;
  size?: number;
  modifiedTime?: string;
  webUrl?: string;
  thumbnailUrl?: string;
}

export interface CloudStorageConnection {
  provider: string;
  accountName: string;
  accountEmail?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface ICloudStorageConnector {
  /** Provider ID (google-drive, dropbox, onedrive) */
  id: string;

  /** Check if this provider is configured/available */
  isConfigured(): Promise<boolean>;

  /** Get stored connection info without sensitive tokens */
  getConnection(): Promise<CloudStorageConnection | null>;

  /** Get OAuth authorization URL for user to click */
  getAuthUrl(redirectUri: string): string;

  /** Exchange auth code for access token */
  exchangeAuthCode(code: string): Promise<CloudStorageConnection>;

  /** List files in a folder */
  listFiles(path?: string): Promise<CloudFile[]>;

  /** Get file metadata */
  getFile(fileId: string): Promise<CloudFile | null>;

  /** Download file as blob */
  downloadFile(fileId: string): Promise<Blob>;

  /** Upload file */
  uploadFile(parentPath: string, file: File): Promise<CloudFile>;

  /** Create folder */
  createFolder(parentPath: string, folderName: string): Promise<CloudFile>;

  /** Delete file or folder */
  deleteFile(fileId: string): Promise<void>;

  /** Refresh access token if expired */
  refreshAccessToken(): Promise<boolean>;
}
