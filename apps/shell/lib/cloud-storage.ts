/**
 * Cloud Storage & OAuth Integrations Manager
 * Handles connection, authentication tokens, and virtual directory syncing
 * for Google Drive, Dropbox, OneDrive, Figma, and GitHub.
 */

export interface CloudAccount {
  id: string;
  provider: 'google-drive' | 'dropbox' | 'onedrive' | 'figma' | 'github';
  name: string;
  email?: string;
  connected: boolean;
  usedBytes?: number;
  totalBytes?: number;
  accessToken?: string;
}

class CloudStorageService {
  private accounts: Map<string, CloudAccount> = new Map([
    [
      'google-drive',
      {
        id: 'google-drive',
        provider: 'google-drive',
        name: 'Google Drive',
        email: 'user@gmail.com',
        connected: false,
        usedBytes: 1542000000,
        totalBytes: 15000000000,
      },
    ],
    [
      'dropbox',
      {
        id: 'dropbox',
        provider: 'dropbox',
        name: 'Dropbox Personal',
        email: 'user@dropbox.com',
        connected: false,
        usedBytes: 840000000,
        totalBytes: 2000000000,
      },
    ],
    [
      'onedrive',
      {
        id: 'onedrive',
        provider: 'onedrive',
        name: 'OneDrive Work',
        email: 'user@outlook.com',
        connected: false,
        usedBytes: 5200000000,
        totalBytes: 100000000000,
      },
    ],
    [
      'figma',
      {
        id: 'figma',
        provider: 'figma',
        name: 'Figma Cloud Workspace',
        connected: true,
      },
    ],
    [
      'github',
      {
        id: 'github',
        provider: 'github',
        name: 'GitHub Repositories',
        connected: true,
      },
    ],
  ]);

  private listeners: Set<() => void> = new Set();

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public getAccounts(): CloudAccount[] {
    return Array.from(this.accounts.values());
  }

  public async connectProvider(providerId: string): Promise<boolean> {
    const acc = this.accounts.get(providerId);
    if (!acc) return false;

    // Simulate OAuth pop-up workflow
    acc.connected = true;
    acc.accessToken = `mock_oauth_token_${providerId}_${Date.now()}`;
    this.notify();

    window.dispatchEvent(
      new CustomEvent('os:notify', {
        detail: {
          title: 'Cloud Storage Linked',
          description: `Connected ${acc.name} to Virtual OS`,
          type: 'success',
        },
      })
    );

    return true;
  }

  public async disconnectProvider(providerId: string): Promise<boolean> {
    const acc = this.accounts.get(providerId);
    if (!acc) return false;

    acc.connected = false;
    acc.accessToken = undefined;
    this.notify();

    window.dispatchEvent(
      new CustomEvent('os:notify', {
        detail: {
          title: 'Cloud Provider Unlinked',
          description: `Disconnected ${acc.name}`,
          type: 'info',
        },
      })
    );

    return true;
  }
}

export const cloudStorageManager = new CloudStorageService();
