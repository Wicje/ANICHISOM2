/**
 * ANICHISOM OS: File Lock Manager
 * 
 * Simple file locking to prevent simultaneous edits
 * Phase 2A: Collaboration
 */

import { fileAdapter } from './firestore-adapter';
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

  constructor(userId: string) {
    this.userId = userId;
    this.sessionId = crypto.randomUUID();
    
    // Cleanup expired locks every minute
    setInterval(() => this.cleanupExpiredLocks(), 60000);
  }

  /**
   * Try to acquire lock on a file
   */
  async acquireLock(fileId: string): Promise<boolean> {
    try {
      const currentLock = this.locks.get(fileId);
      const now = new Date();

      // Check if lock exists and is expired
      if (currentLock) {
        if (currentLock.expiresAt > now && currentLock.sessionId !== this.sessionId) {
          // Lock is held by someone else
          console.log('[v0] File locked by another user:', fileId);
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

      console.log('[v0] File lock acquired:', fileId);
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

      console.log('[v0] File lock released:', fileId);
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

    if (cleaned > 0) {
      console.log('[v0] Cleaned up', cleaned, 'expired locks');
    }
  }

  /**
   * Release all locks (logout, tab close)
   */
  async releaseAllLocks(): Promise<void> {
    console.log('[v0] Releasing all locks...');
    const fileIds = Array.from(this.locks.keys());

    for (const fileId of fileIds) {
      await this.releaseLock(fileId);
    }
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
    globalFileLockManager.releaseAllLocks();
  }
  globalFileLockManager = new FileLockManager(userId);
  return globalFileLockManager;
}

export function getFileLockManager(): FileLockManager | null {
  return globalFileLockManager;
}
