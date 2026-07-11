import {
  IStorageConnector,
  CloudFile,
  CloudFileContent,
  ConnectResult,
  CallbackResult,
  StorageCapabilities,
} from './storage-connector';
import { TokenStore } from './token-store';

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

export class OneDriveConnector implements IStorageConnector {
  readonly id = 'onedrive';
  readonly name = 'OneDrive';
  readonly icon = '☁️';

  isConfigured(): boolean {
    return !!process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID;
  }

  getCapabilities(): StorageCapabilities {
    return {
      listFiles: true,
      readFile: true,
      writeFile: true,
      deleteFile: true,
      createFolder: true,
      searchFiles: true,
      shareFiles: true,
      maxFileSize: 250 * 1024 * 1024,
      supportedMimeTypes: ['*/*'],
    };
  }

  async connect(userId: string, redirectUrl: string): Promise<ConnectResult> {
    const clientId = process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID || '';
    const scopes = 'Files.ReadWrite.All User.Read offline_access';
    const state = Buffer.from(JSON.stringify({ userId, provider: 'onedrive' })).toString('base64url');
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUrl,
      scope: scopes,
      response_mode: 'query',
      state,
    });
    return { authUrl: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`, state };
  }

  async handleCallback(userId: string, code: string, state?: string): Promise<CallbackResult> {
    const clientId = process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID || '';
    const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET || '';
    const redirectUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/storage/callback/onedrive`;

    const resp = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUrl,
        grant_type: 'authorization_code',
      }),
    });

    if (!resp.ok) throw new Error('Failed to exchange OneDrive auth code');
    const data = await resp.json();

    await TokenStore.store(userId, 'onedrive', {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: data.scope || 'Files.ReadWrite.All User.Read offline_access',
    });

    const userResp = await this.graphFetch('/me', data.access_token);
    const user = await userResp.json();

    return {
      connected: true,
      providerId: 'onedrive',
      accountName: user.displayName || user.mail || 'OneDrive User',
    };
  }

  async isConnected(userId: string): Promise<boolean> {
    return TokenStore.has(userId, 'onedrive');
  }

  async disconnect(userId: string): Promise<void> {
    await TokenStore.remove(userId, 'onedrive');
  }

  async listFiles(userId: string, path?: string): Promise<{ files: CloudFile[] }> {
    const token = await this.getToken(userId);
    const endpoint = !path || path === '/'
      ? '/drive/root/children'
      : `/drive/root:/${encodeURIComponent(path)}:/children`;

    const resp = await this.graphFetch(endpoint, token);
    if (!resp.ok) throw new Error(`Failed to list: ${resp.statusText}`);
    const data = await resp.json();

    const files: CloudFile[] = (data.value || []).map((item: Record<string, unknown>) => ({
      id: item.id as string,
      name: item.name as string,
      path: (item.parentReference as Record<string, unknown>)?.path as string || `/${item.name}`,
      mimeType: (item.file as Record<string, unknown>)?.mimeType as string || 'inode/directory',
      size: item.size as number,
      isFolder: !!item.folder,
      modifiedTime: item.lastModifiedDateTime as string,
      webUrl: item.webUrl as string,
    }));

    return { files };
  }

  async readFile(userId: string, fileId: string): Promise<CloudFileContent> {
    const token = await this.getToken(userId);
    const resp = await this.graphFetch(`/drive/items/${fileId}/content`, token);
    if (!resp.ok) throw new Error(`Failed to read: ${resp.statusText}`);

    const contentType = resp.headers.get('content-type') || 'application/octet-stream';
    const data = await resp.arrayBuffer();
    const name = resp.headers.get('x-ms-name') || 'file';

    return { id: fileId, name, mimeType: contentType, data, size: data.byteLength };
  }

  getDownloadUrl(userId: string, fileId: string): string {
    return `/api/storage/download/onedrive/${fileId}?userId=${userId}`;
  }

  async uploadFile(userId: string, path: string, content: Buffer | Blob, mimeType?: string): Promise<CloudFile> {
    const token = await this.getToken(userId);
    const endpoint = `/drive/root:/${encodeURIComponent(path)}:/content`;

    // Convert Buffer to Uint8Array for browser compatibility
    let body: Blob;
    if (content instanceof Blob) {
      body = content;
    } else {
      body = new Blob([new Uint8Array(content)]);
    }

    const resp = await this.graphFetch(endpoint, token, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType || 'application/octet-stream' },
      body,
    });

    if (!resp.ok) throw new Error(`Failed to upload: ${resp.statusText}`);
    const item = await resp.json();

    return {
      id: item.id,
      name: item.name,
      path,
      mimeType: item.file?.mimeType || mimeType || 'application/octet-stream',
      size: item.size,
      isFolder: false,
      modifiedTime: item.lastModifiedDateTime,
    };
  }

  async createFolder(userId: string, path: string): Promise<CloudFile> {
    const token = await this.getToken(userId);
    const parts = path.split('/').filter(Boolean);
    const folderName = parts.pop()!;
    const parentPath = parts.join('/') || '';

    const endpoint = parentPath
      ? `/drive/root:/${encodeURIComponent(parentPath)}:/children`
      : '/drive/root/children';

    const resp = await this.graphFetch(endpoint, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename',
      }),
    });

    if (!resp.ok) throw new Error(`Failed to create folder: ${resp.statusText}`);
    const item = await resp.json();

    return {
      id: item.id,
      name: item.name,
      path,
      mimeType: 'inode/directory',
      size: 0,
      isFolder: true,
    };
  }

  async deleteFile(userId: string, fileId: string): Promise<void> {
    const token = await this.getToken(userId);
    const resp = await this.graphFetch(`/drive/items/${fileId}`, token, { method: 'DELETE' });
    if (!resp.ok) throw new Error(`Failed to delete: ${resp.statusText}`);
  }

  async searchFiles(userId: string, query: string): Promise<CloudFile[]> {
    const token = await this.getToken(userId);
    const resp = await this.graphFetch(
      `/drive/root/search(q='${encodeURIComponent(query)}')`,
      token,
    );
    if (!resp.ok) throw new Error(`Failed to search: ${resp.statusText}`);
    const data = await resp.json();

    return (data.value || []).map((item: Record<string, unknown>) => ({
      id: item.id as string,
      name: item.name as string,
      path: (item.parentReference as Record<string, unknown>)?.path as string || '',
      mimeType: (item.file as Record<string, unknown>)?.mimeType as string || 'inode/directory',
      size: item.size as number,
      isFolder: !!item.folder,
      modifiedTime: item.lastModifiedDateTime as string,
    }));
  }

  private async getToken(userId: string): Promise<string> {
    const accessToken = TokenStore.getAccessToken(userId, 'onedrive');
    if (!accessToken) throw new Error('OneDrive not connected');

    // Check if token is still valid
    if (!TokenStore.isTokenExpired(userId, 'onedrive')) {
      return accessToken;
    }

    // Refresh
    const refreshToken = TokenStore.getRefreshToken(userId, 'onedrive');
    if (!refreshToken) throw new Error('No refresh token');
    const clientId = process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID || '';
    const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET || '';

    const resp = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'Files.ReadWrite.All User.Read offline_access',
      }),
    });

    if (!resp.ok) throw new Error('Failed to refresh OneDrive token');
    const data = await resp.json();

    await TokenStore.updateAccessToken(userId, 'onedrive', data.access_token, data.expires_in);

    return data.access_token;
  }

  private async graphFetch(endpoint: string, token: string, init?: RequestInit): Promise<Response> {
    return fetch(`${GRAPH_API_BASE}${endpoint}`, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  }
}
