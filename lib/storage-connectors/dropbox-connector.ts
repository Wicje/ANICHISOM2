/**
 * Dropbox Storage Connector
 *
 * Connects user's Dropbox to Anichisom OS via OAuth2.
 * Privacy-first: tokens stored server-side only, never sent to client.
 */

import { IStorageConnector, CloudFile, CloudFileContent, ConnectResult, CallbackResult, StorageCapabilities } from './storage-connector';
import { TokenStore } from './token-store';

const DROPBOX_CAPABILITIES: StorageCapabilities = {
  listFiles: true,
  readFile: true,
  writeFile: true,
  deleteFile: true,
  createFolder: true,
  searchFiles: true,
  shareFiles: true,
  maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB for Dropbox
  supportedMimeTypes: ['*'],
};

export class DropboxConnector implements IStorageConnector {
  id = 'dropbox';
  name = 'Dropbox';
  icon = 'box';
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = process.env.DROPBOX_CLIENT_ID || '';
    this.clientSecret = process.env.DROPBOX_CLIENT_SECRET || '';
  }

  isConfigured(): boolean {
    return this.clientId.length > 0 && this.clientSecret.length > 0;
  }

  getCapabilities(): StorageCapabilities {
    return DROPBOX_CAPABILITIES;
  }

  async connect(userId: string, redirectUrl: string): Promise<ConnectResult> {
    const state = Math.random().toString(36).substring(2);
    const authUrl = `https://www.dropbox.com/oauth2/authorize?` +
      `client_id=${this.clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(redirectUrl)}&` +
      `state=${state}&` +
      `token_access_type=offline`;

    return { authUrl, state };
  }

  async handleCallback(userId: string, code: string, state?: string): Promise<CallbackResult> {
    const redirectUrl = process.env.DROPBOX_REDIRECT_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/storage/callback/dropbox`;

    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
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
      throw new Error(`Dropbox OAuth error: ${response.status} — ${error}`);
    }

    const data = await response.json();

    // Get account info
    let accountName = 'Dropbox';
    try {
      const accountRes = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(null),
      });
      if (accountRes.ok) {
        const account = await accountRes.json();
        accountName = account.email || account.name?.display_name || 'Dropbox';
      }
    } catch { /* ignore */ }

    TokenStore.store(userId, this.id, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || '',
      expiresIn: data.expires_in,
      scope: data.scope || '',
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
    const accessToken = this.getValidToken(userId);
    const folderPath = path || '';

    const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: folderPath || '',
        limit: 50,
      }),
    });

    if (!response.ok) {
      throw new Error(`Dropbox list error: ${response.status}`);
    }

    const data = await response.json();

    const files: CloudFile[] = (data.entries || []).map((entry: any) => ({
      id: entry.id,
      name: entry.name,
      path: entry.path_lower || '',
      size: entry.size,
      mimeType: this.inferMimeType(entry.name, entry['.tag']),
      modifiedTime: entry.server_modified,
      isFolder: entry['.tag'] === 'folder',
      parentId: folderPath,
      webUrl: entry.path_display,
    }));

    return {
      files,
      nextPageToken: data.has_more ? data.cursor : undefined,
    };
  }

  async readFile(userId: string, fileId: string): Promise<CloudFileContent> {
    const accessToken = this.getValidToken(userId);

    // Get file metadata
    const metaRes = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: fileId }),
    });

    if (!metaRes.ok) throw new Error(`Dropbox metadata error: ${metaRes.status}`);
    const meta = await metaRes.json();

    // Download file content
    const contentRes = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path: fileId }),
      },
    });

    if (!contentRes.ok) throw new Error(`Dropbox download error: ${contentRes.status}`);
    const data = await contentRes.arrayBuffer();

    return {
      id: meta.id,
      name: meta.name,
      mimeType: this.inferMimeType(meta.name, meta['.tag']),
      data,
      size: data.byteLength,
    };
  }

  getDownloadUrl(userId: string, fileId: string): string {
    return `/api/storage/download/${this.id}/${encodeURIComponent(fileId)}`;
  }

  async uploadFile(userId: string, path: string, content: Buffer, mimeType?: string): Promise<CloudFile> {
    throw new Error('Upload not yet implemented for Dropbox connector');
  }

  async createFolder(userId: string, path: string): Promise<CloudFile> {
    throw new Error('Create folder not yet implemented for Dropbox connector');
  }

  async deleteFile(userId: string, fileId: string): Promise<void> {
    const accessToken = this.getValidToken(userId);
    const response = await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: fileId }),
    });
    if (!response.ok) throw new Error(`Dropbox delete error: ${response.status}`);
  }

  async searchFiles(userId: string, query: string): Promise<CloudFile[]> {
    const accessToken = this.getValidToken(userId);
    const response = await fetch('https://api.dropboxapi.com/2/files/search_v2', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        options: { max_results: 20 },
      }),
    });

    if (!response.ok) throw new Error(`Dropbox search error: ${response.status}`);
    const data = await response.json();

    return (data.matches || []).map((match: any) => ({
      id: match.metadata?.metadata?.id || '',
      name: match.metadata?.metadata?.name || '',
      path: match.metadata?.metadata?.path_lower || '',
      size: match.metadata?.metadata?.size,
      mimeType: this.inferMimeType(match.metadata?.metadata?.name || '', match.metadata?.metadata?.['.tag']),
      modifiedTime: match.metadata?.metadata?.server_modified,
      isFolder: match.metadata?.metadata?.['.tag'] === 'folder',
    }));
  }

  private getValidToken(userId: string): string {
    const token = TokenStore.getAccessToken(userId, this.id);
    if (!token) throw new Error(`Dropbox not connected for user ${userId}. Please connect first.`);
    if (TokenStore.isTokenExpired(userId, this.id)) {
      throw new Error('Dropbox token expired. Please reconnect.');
    }
    return token;
  }

  private inferMimeType(filename: string, tag: string): string {
    if (tag === 'folder') return 'application/vnd.google-apps.folder';
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
      mp4: 'video/mp4', mov: 'video/quicktime',
      mp3: 'audio/mpeg', wav: 'audio/wav',
      txt: 'text/plain', md: 'text/markdown',
      doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
      zip: 'application/zip',
    };
    return mimeMap[ext] || 'application/octet-stream';
  }
}
