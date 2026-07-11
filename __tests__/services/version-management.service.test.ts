/**
 * Tests for Version Management Service — semver comparison, update tracking,
 * auto-update preferences, and OS compatibility.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VersionManagementService } from '@/lib/services/version-management.service';

// Mock localStorage
const localStorageMock: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => localStorageMock[key] || null),
  setItem: vi.fn((key: string, val: string) => { localStorageMock[key] = val; }),
  removeItem: vi.fn((key: string) => { delete localStorageMock[key]; }),
  clear: vi.fn(() => { Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]); }),
});

beforeEach(() => {
  Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]);
  vi.restoreAllMocks();
});

describe('VersionManagementService', () => {
  describe('compareSemver', () => {
    it('should return 0 for equal versions', () => {
      expect(VersionManagementService.compareSemver('1.0.0', '1.0.0')).toBe(0);
    });

    it('should return 1 when a > b by major', () => {
      expect(VersionManagementService.compareSemver('2.0.0', '1.9.9')).toBe(1);
    });

    it('should return -1 when a < b by major', () => {
      expect(VersionManagementService.compareSemver('1.0.0', '2.0.0')).toBe(-1);
    });

    it('should return 1 when a > b by minor', () => {
      expect(VersionManagementService.compareSemver('1.2.0', '1.1.9')).toBe(1);
    });

    it('should return 1 when a > b by patch', () => {
      expect(VersionManagementService.compareSemver('1.0.2', '1.0.1')).toBe(1);
    });

    it('should handle v prefix', () => {
      expect(VersionManagementService.compareSemver('v1.5.0', '1.4.0')).toBe(1);
    });
  });

  describe('checkForUpdate', () => {
    it('should detect update available', () => {
      const result = VersionManagementService.checkForUpdate('plugin-a', '1.0.0', '2.0.0');
      expect(result.updateAvailable).toBe(true);
      expect(result.pluginId).toBe('plugin-a');
      expect(result.currentVersion).toBe('1.0.0');
      expect(result.latestVersion).toBe('2.0.0');
    });

    it('should detect no update when versions match', () => {
      const result = VersionManagementService.checkForUpdate('plugin-a', '1.0.0', '1.0.0');
      expect(result.updateAvailable).toBe(false);
    });

    it('should include minOSVersion in result', () => {
      const result = VersionManagementService.checkForUpdate('plugin-a', '1.0.0', '1.1.0', '10.15');
      expect(result.minOSVersion).toBe('10.15');
    });
  });

  describe('isOSCompatible', () => {
    it('should return true for compatible OS', () => {
      vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Mac OS X 13_0) AppleWebKit/537.36' });
      expect(VersionManagementService.isOSCompatible('12.0')).toBe(true);
    });

    it('should return false for incompatible OS', () => {
      vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Mac OS X 11_0) AppleWebKit/537.36' });
      expect(VersionManagementService.isOSCompatible('12.0')).toBe(false);
    });
  });

  describe('recordUpdate and getUpdateHistory', () => {
    it('should record an update and retrieve it', () => {
      VersionManagementService.recordUpdate('plugin-a', '1.0.0', '2.0.0', true);
      const history = VersionManagementService.getUpdateHistory();
      expect(history).toHaveLength(1);
      expect(history[0].pluginId).toBe('plugin-a');
      expect(history[0].fromVersion).toBe('1.0.0');
      expect(history[0].toVersion).toBe('2.0.0');
      expect(history[0].success).toBe(true);
    });

    it('should filter history by pluginId', () => {
      VersionManagementService.recordUpdate('plugin-a', '1.0.0', '2.0.0', true);
      VersionManagementService.recordUpdate('plugin-b', '3.0.0', '3.1.0', true);

      const aHistory = VersionManagementService.getUpdateHistory('plugin-a');
      expect(aHistory).toHaveLength(1);
      expect(aHistory[0].pluginId).toBe('plugin-a');
    });

    it('should return empty array when no history', () => {
      expect(VersionManagementService.getUpdateHistory()).toEqual([]);
    });

    it('should record failed updates', () => {
      VersionManagementService.recordUpdate('plugin-a', '1.0.0', '2.0.0', false);
      const history = VersionManagementService.getUpdateHistory();
      expect(history[0].success).toBe(false);
    });
  });

  describe('getAvailableUpdates', () => {
    it('should return plugins with updates available', () => {
      VersionManagementService.recordUpdate('plugin-a', '1.0.0', '2.0.0', true);
      VersionManagementService.recordUpdate('plugin-b', '1.0.0', '1.0.0', true);

      const updates = VersionManagementService.getAvailableUpdates();
      expect(updates).toHaveLength(1);
      expect(updates[0].pluginId).toBe('plugin-a');
    });
  });

  describe('auto-update preferences', () => {
    it('should default to false', () => {
      expect(VersionManagementService.shouldAutoUpdate('plugin-a')).toBe(false);
    });

    it('should set and get auto-update preference', () => {
      VersionManagementService.setAutoUpdate('plugin-a', true);
      expect(VersionManagementService.shouldAutoUpdate('plugin-a')).toBe(true);
    });

    it('should toggle auto-update preference', () => {
      VersionManagementService.setAutoUpdate('plugin-a', true);
      VersionManagementService.setAutoUpdate('plugin-a', false);
      expect(VersionManagementService.shouldAutoUpdate('plugin-a')).toBe(false);
    });
  });
});
