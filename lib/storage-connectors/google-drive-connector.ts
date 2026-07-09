/**
 * Google Drive Storage Connector
 *
 * Connects user's Google Drive to Anichisom OS via OAuth2.
 * Files appear in the Files app — browse, read, download.
 * Privacy-first: OAuth tokens stored server-side only.
 */

import crypto from 'crypto';
import { IStorageConnector, CloudFile, CloudFileContent, ConnectResult, CallbackResult, StorageCapabilities } from './storage-connector';
import { TokenStore } from './token-store';

const GOOGLE_DRIVE_CAPABILITIES: StorageCapabilities = {
  listFiles: true,
  readFile: true,
  writeFile: true,
  deleteFile: true,
  createFolder: true,
  searchFiles: true,
  shareFiles: true,
  maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB for Google Drive
  supportedMimeTypes: ['*'], // Google Drive supports all types
};

export class GoogleDriveConnector implements IStorageConnector {
  id = 'google-drive';
  name = 'Google Drive';
  icon = 'cloud';
  private clientId: string;
  private clientSecret: string;
  private scopes: string;

  constructor() {
    this.clientId = process.env.GOOGLE_DRIVE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || '';
    this.scopes = 'https://www.googleapis.com/auth/drive';
  }

  isConfigured(): boolean {
    return this.clientId.length > 0 && this.clientSecret.length > 0;
  }

  getCapabilities(): StorageCapabilities {
    return GOOGLE_DRIVE_CAPABILITIES;
  }

  async connect(userId: string, redirectUrl: string): Promise<ConnectResult> {
    const state = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${this.clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUrl)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(this.scopes)}&` +
      `state=${state}&` +
      `access_type=offline&` +
      `prompt=consent`;

    return { authUrl, state };
  }

  async handleCallback(userId: string, code: string, state?: string): Promise<CallbackResult> {
    const redirectUrl = process.env.GOOGLE_DRIVE_REDIRECT_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/storage/callback/google-drive`;

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUrl,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Drive OAuth error: ${response.status} — ${error}`);
    }

    const data = await response.json();

    // Get user info for account name
    let accountName = 'Google Drive';
    try {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json();
        accountName = userInfo.email || userInfo.name || 'Google Drive';
      }
    } catch { /* ignore */ }

    TokenStore.store(userId, this.id, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || '',
      expiresIn: data.expires_in,
      scope: data.scope || this.scopes,
      accountName,
    });

    return { connected: true, providerId: this.id, accountName };
  }

  async isConnected(userId: string): Promise<boolean> {
    return TokenStore.has(userId, this.id);
  }

  async disconnect(userId: string): Promise<void> {
    TokenStore.remove(userId, this.id);
  }

  async listFiles(userId: string, path?: string, pageToken?: string): Promise<{ files: CloudFile[]; nextPageToken?: string }> {
    const accessToken = await this.getValidToken(userId);

    let query = "trashed = false";
    if (path && path !== 'root') {
      query += ` and '${path}' in parents`;
    } else {
      query += " and 'root' in parents";
    }

    const params = new URLSearchParams({
      q: query,
      fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime,parents,webViewLink,thumbnailLink)',
      pageSize: '50',
      orderBy: 'modifiedByMeTime desc',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Google Drive list error: ${response.status}`);
    }

    const data = await response.json();

    const files: CloudFile[] = (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      path: f.parents?.[0] || 'root',
      size: f.size ? parseInt(f.size) : undefined,
      mimeType: f.mimeType,
      modifiedTime: f.modifiedTime,
      isFolder: f.mimeType === 'application/vnd.google-apps.folder',
      parentId: f.parents?.[0],
      thumbnailUrl: f.thumbnailLink,
      webUrl: f.webViewLink,
    }));

    return { files, nextPageToken: data.nextPageToken };
  }

  async readFile(userId: string, fileId: string): Promise<CloudFileContent> {
    const accessToken = await this.getValidToken(userId);

    // Get file metadata first
    const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaRes.ok) throw new Error(`Google Drive read error: ${metaRes.status}`);

    const meta = await metaRes.json();

    // For Google Docs/Sheets/Slides, export as PDF
    let downloadUrl: string;
    if (meta.mimeType === 'application/vnd.google-apps.document') {
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`;
    } else if (meta.mimeType === 'application/vnd.google-apps.spreadsheet') {
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
    } else if (meta.mimeType === 'application/vnd.google-apps.presentation') {
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`;
    } else {
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    }

    const contentRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!contentRes.ok) throw new Error(`Google Drive download error: ${contentRes.status}`);

    const data = await contentRes.arrayBuffer();

    return {
      id: meta.id,
      name: meta.name,
      mimeType: meta.mimeType,
      data,
      size: data.byteLength,
    };
  }

  getDownloadUrl(userId: string, fileId: string): string {
    return `/api/storage/download/${this.id}/${encodeURIComponent(fileId)}`;
  }

  async uploadFile(userId: string, path: string, content: Buffer, mimeType?: string): Promise<CloudFile> {
    const accessToken = await this.getValidToken(userId);
    const normalizedPath = path || 'root';
    const fileName = normalizedPath.includes('/') ? normalizedPath.substring(normalizedPath.lastIndexOf('/') + 1) : normalizedPath;
    const parentId = normalizedPath.includes('/') ? normalizedPath.substring(0, normalizedPath.lastIndexOf('/')) : 'root';
    const effectiveMimeType = mimeType || 'application/octet-stream';

    if (!fileName) {
      throw new Error('Google Drive upload requires a filename in the path');
    }

    const metadata: any = { name: fileName };
    if (parentId && parentId !== 'root') {
      metadata.parents = [parentId];
    }

    const boundary = `----AnichisomDriveUpload${Date.now()}`;
    const delimiter = `--${boundary}\r\n`;
    const closeDelimiter = `--${boundary}--`;
    const body = Buffer.concat([
      Buffer.from(delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n'),
      Buffer.from(JSON.stringify(metadata)),
      Buffer.from(`\r\n${delimiter}` + `Content-Type: ${effectiveMimeType}\r\n\r\n`),
      content,
      Buffer.from(`\r\n${closeDelimiter}`),
    ]);

    const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,parents,webViewLink,thumbnailLink`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Drive upload error: ${response.status} — ${errorText}`);
    }

    const file = await response.json();
    return {
      id: file.id,
      name: file.name,
      path: parentId === 'root' ? 'root' : parentId,
      size: file.size ? parseInt(file.size, 10) : undefined,
      mimeType: file.mimeType,
      modifiedTime: file.modifiedTime,
      isFolder: false,
      parentId: parentId === 'root' ? undefined : parentId,
      webUrl: file.webViewLink,
    };
  }

  async createFolder(userId: string, path: string): Promise<CloudFile> {
    const accessToken = await this.getValidToken(userId);
    const normalizedPath = path || 'root';
    const folderName = normalizedPath.includes('/') ? normalizedPath.substring(normalizedPath.lastIndexOf('/') + 1) : normalizedPath;
    const parentId = normalizedPath.includes('/') ? normalizedPath.substring(0, normalizedPath.lastIndexOf('/')) : 'root';

    if (!folderName) {
      throw new Error('Google Drive createFolder requires a folder name in the path');
    }

    const body: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId && parentId !== 'root') {
      body.parents = [parentId];
    }

    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Drive create folder error: ${response.status} — ${errorText}`);
    }

    const folder = await response.json();
    return {
      id: folder.id,
      name: folder.name,
      path: parentId === 'root' ? 'root' : parentId,
      mimeType: folder.mimeType,
      isFolder: true,
      parentId: parentId === 'root' ? undefined : parentId,
      webUrl: folder.webViewLink,
    };
  }

  async deleteFile(userId: string, fileId: string): Promise<void> {
    const accessToken = await this.getValidToken(userId);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`Google Drive delete error: ${response.status}`);
  }

  async searchFiles(userId: string, query: string): Promise<CloudFile[]> {
    const accessToken = await this.getValidToken(userId);
    const params = new URLSearchParams({
      q: `name contains '${query}' and trashed = false`,
      fields: 'files(id,name,mimeType,size,modifiedTime,parents,webViewLink)',
      pageSize: '20',
    });

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`Google Drive search error: ${response.status}`);

    const data = await response.json();
    return (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      path: f.parents?.[0] || 'root',
      size: f.size ? parseInt(f.size) : undefined,
      mimeType: f.mimeType,
      modifiedTime: f.modifiedTime,
      isFolder: f.mimeType === 'application/vnd.google-apps.folder',
      parentId: f.parents?.[0],
      webUrl: f.webViewLink,
    }));
  }

  private async refreshAccessToken(userId: string): Promise<string> {
    const refreshToken = TokenStore.getRefreshToken(userId, this.id);
    if (!refreshToken) {
      throw new Error('No refresh token available for Google Drive. Please reconnect.');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Drive token refresh error: ${response.status} — ${errorText}`);
    }

    const data = await response.json();
    const updatedRefreshToken = data.refresh_token || refreshToken;

    TokenStore.store(userId, this.id, {
      accessToken: data.access_token,
      refreshToken: updatedRefreshToken,
      expiresIn: data.expires_in,
      scope: data.scope || this.scopes,
      accountName: TokenStore.getAccountName(userId, this.id) || 'Google Drive',
    });

    return data.access_token;
  }

  private async getValidToken(userId: string): Promise<string> {
    const token = TokenStore.getAccessToken(userId, this.id);
    if (token) {
      return token;
    }

    return this.refreshAccessToken(userId);
  }
}
