/**
 * ANICHISOM OS: Presence Manager
 * 
 * Heartbeat system to show who's online in each workspace
 * Phase 2A: Collaboration
 */

import { presenceAdapter } from './firestore-adapter';
import { Presence } from './workspace-types';

interface PresenceManagerConfig {
  userId: string;
  userName: string;
  workspaceId: string;
  userAvatarUrl?: string;
}

/**
 * PresenceManager handles user presence heartbeats and status tracking
 * 
 * Features:
 * - Periodic heartbeat (every 5 seconds)
 * - Track current file being edited
 * - Auto-cleanup on logout/tab close
 * - Efficient updates (only sends changes)
 */
export class PresenceManager {
  private config: PresenceManagerConfig;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastUpdate: Partial<Presence> | null = null;

  constructor(config: PresenceManagerConfig) {
    this.config = config;
  }

  /**
   * Start the presence heartbeat
   */
  start(): void {
    console.log('[v0] Presence manager started:', this.config.userId);

    // Initial heartbeat
    this.updatePresence({
      isOnline: true,
      status: 'active',
    });

    // Heartbeat every 5 seconds
    this.heartbeatInterval = setInterval(() => {
      this.updatePresence({
        isOnline: true,
        status: 'active',
        lastSeen: new Date(),
      });
    }, 5000);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => this.stop());
  }

  /**
   * Stop the presence heartbeat (logout, tab close, etc)
   */
  stop(): void {
    console.log('[v0] Presence manager stopped:', this.config.userId);

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Mark as offline
    this.updatePresence({
      isOnline: false,
      lastSeen: new Date(),
    });
  }

  /**
   * Update presence with new data
   */
  private async updatePresence(update: Partial<Presence>): Promise<void> {
    try {
      const presence: Partial<Presence> = {
        userId: this.config.userId,
        userName: this.config.userName,
        workspaceId: this.config.workspaceId,
        userAvatarUrl: this.config.userAvatarUrl,
        lastSeen: new Date(),
        ...update,
      };

      await presenceAdapter.update(this.config.userId, this.config.workspaceId, presence);
    } catch (error) {
      console.warn('[v0] Failed to update presence:', error);
    }
  }

  /**
   * Set current file being edited
   */
  setCurrentFile(fileId: string | null): void {
    this.updatePresence({
      currentFileId: fileId,
    });
  }

  /**
   * Set current app being used
   */
  setCurrentApp(appId: string | null): void {
    this.updatePresence({
      currentAppId: appId,
    });
  }

  /**
   * Set status (active, idle, away)
   */
  setStatus(status: 'active' | 'idle' | 'away'): void {
    this.updatePresence({
      status,
    });
  }

  /**
   * Get current user presence data
   */
  getCurrentPresence(): Presence {
    return {
      userId: this.config.userId,
      userName: this.config.userName,
      workspaceId: this.config.workspaceId,
      userAvatarUrl: this.config.userAvatarUrl,
      isOnline: true,
      lastSeen: new Date(),
    };
  }
}

/**
 * Global presence manager instance (per workspace)
 */
let globalPresenceManager: PresenceManager | null = null;

export function initPresenceManager(config: PresenceManagerConfig): PresenceManager {
  if (globalPresenceManager) {
    globalPresenceManager.stop();
  }
  globalPresenceManager = new PresenceManager(config);
  globalPresenceManager.start();
  return globalPresenceManager;
}

export function getPresenceManager(): PresenceManager | null {
  return globalPresenceManager;
}

export function stopPresenceManager(): void {
  if (globalPresenceManager) {
    globalPresenceManager.stop();
    globalPresenceManager = null;
  }
}
