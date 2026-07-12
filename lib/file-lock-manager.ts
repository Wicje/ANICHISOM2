/**
 * ANICHISOM OS: File Lock Manager
 * 
 * Simple file locking to prevent simultaneous edits
 * Phase 2A: Collaboration
 */

import { fileAdapter } from './supabase-adapter';
import { ProjectFile, FILE_LOCK_TIMEOUT_MS } from './workspace-types';

interface FileLockState {
  fileId: string;
  userId: string;
  sessionId: string;
  acquiredAt: Date;
  expiresAt: Date;
}

/**
 * FileLockManager handles exclusive edit locks on files
 * 
 * Features:
 * - Simple boolean lock (one user at a time)
 * - Auto-expiry (30 minutes default)
 * - Graceful handoff between sessions
 * - No conflicts—just queue access
 */
export class FileLockManager {
  private locks: Map<string, FileLockState> = new Map();
  private userId: string;
  private sessionId: string;
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(userId: string) {
    this.userId = userId;
    this.sessionId = crypto.randomUUID();
    
    // Cleanup expired locks every minute
    this.cleanupIntervalId = setInterval(() => this.cleanupExpiredLocks(), 60000);
  }

  /**
   * Try to acquire lock on a file
   */
  async acquireLock(fileId: string): Promise<boolean> {
    try {
      const currentLock = this.locks.get(fileId);
      const now = new Date();

      // Check if lock exists and is expired (local check)
      if (currentLock) {
        if (currentLock.expiresAt > now && currentLock.sessionId !== this.sessionId) {
          // Lock is held by someone else
          return false;
        }
      }

      // Read current lock state from Firestore to reduce race window.
      // NOTE: For production use, this should be a Firestore transaction
      // (read + conditional write) to fully eliminate the race condition
      // between multiple clients acquiring the same lock.
      const remoteFile = await fileAdapter.get(fileId);
      if (remoteFile) {
        const remote = remoteFile as any;
        if (remote.editingSessionId && remote.editingSessionId !== this.sessionId) {
          return false;
        }
      }

      // Acquire lock
      const expiresAt = new Date(now.getTime() + FILE_LOCK_TIMEOUT_MS);
      const lock: FileLockState = {
        fileId,
        userId: this.userId,
        sessionId: this.sessionId,
        acquiredAt: now,
        expiresAt,
      };

      this.locks.set(fileId, lock);

      // Update Firestore
      await fileAdapter.update(fileId, {
        editingUserId: this.userId,
        editingSessionId: this.sessionId,
      } as any);

      return true;
    } catch (error) {
      console.error('[v0] Failed to acquire lock:', error);
      return false;
    }
  }

  /**
   * Release lock on a file
   */
  async releaseLock(fileId: string): Promise<void> {
    try {
      const lock = this.locks.get(fileId);

      // Only release if we own it
      if (!lock || lock.sessionId !== this.sessionId) {
        console.warn('[v0] Cannot release lock: not owned by this session');
        return;
      }

      this.locks.delete(fileId);

      // Update Firestore
      await fileAdapter.update(fileId, {
        editingUserId: undefined,
        editingSessionId: undefined,
      } as any);

    } catch (error) {
      console.error('[v0] Failed to release lock:', error);
    }
  }

  /**
   * Check if a file is locked (and by whom)
   */
  isLocked(fileId: string): { locked: boolean; userId?: string; willExpireIn?: number } {
    const lock = this.locks.get(fileId);

    if (!lock) {
      return { locked: false };
    }

    const now = new Date();
    if (lock.expiresAt <= now) {
      // Lock expired
      this.locks.delete(fileId);
      return { locked: false };
    }

    return {
      locked: true,
      userId: lock.userId,
      willExpireIn: lock.expiresAt.getTime() - now.getTime(),
    };
  }

  /**
   * Check if we own the lock
   */
  ownsLock(fileId: string): boolean {
    const lock = this.locks.get(fileId);
    return lock ? lock.sessionId === this.sessionId : false;
  }

  /**
   * Clean up expired locks
   */
  private cleanupExpiredLocks(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [fileId, lock] of this.locks) {
      if (lock.expiresAt <= now) {
        this.locks.delete(fileId);
        cleaned++;
      }
    }
  }

  /**
   * Release all locks (logout, tab close)
   */
  async releaseAllLocks(): Promise<void> {
    const fileIds = Array.from(this.locks.keys());

    for (const fileId of fileIds) {
      await this.releaseLock(fileId);
    }
  }

  /**
   * Destroy this manager: clear the cleanup interval and release all locks.
   * Call this before discarding the instance to prevent interval leaks.
   */
  async destroy(): Promise<void> {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    await this.releaseAllLocks();
  }

  /**
   * Get lock statistics
   */
  getStats(): { total: number; ownedByMe: number; ownedByOthers: number } {
    let ownedByMe = 0;
    let ownedByOthers = 0;

    for (const lock of this.locks.values()) {
      if (lock.sessionId === this.sessionId) {
        ownedByMe++;
      } else {
        ownedByOthers++;
      }
    }

    return {
      total: this.locks.size,
      ownedByMe,
      ownedByOthers,
    };
  }
}

/**
 * Global file lock manager instance
 */
let globalFileLockManager: FileLockManager | null = null;

export function initFileLockManager(userId: string): FileLockManager {
  if (globalFileLockManager) {
    globalFileLockManager.destroy();
  }
  globalFileLockManager = new FileLockManager(userId);
  return globalFileLockManager;
}

export function getFileLockManager(): FileLockManager | null {
  return globalFileLockManager;
}
