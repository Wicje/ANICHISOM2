import { describe, it, expect } from 'vitest';
import { shouldPromptSync, formatFileSize } from '@/lib/storage-connectors/storage-connector';

describe('SyncPromptBanner', () => {
  describe('File size threshold', () => {
    it('shouldPromptSync returns true for files > 5MB', () => {
      expect(shouldPromptSync(6 * 1024 * 1024)).toBe(true);
    });

    it('shouldPromptSync returns false for files < 5MB', () => {
      expect(shouldPromptSync(4 * 1024 * 1024)).toBe(false);
    });

    it('shouldPromptSync returns false for exactly 5MB', () => {
      expect(shouldPromptSync(5 * 1024 * 1024)).toBe(false);
    });

    it('shouldPromptSync returns false for 0 bytes', () => {
      expect(shouldPromptSync(0)).toBe(false);
    });

    it('shouldPromptSync returns true for very large files', () => {
      expect(shouldPromptSync(1024 * 1024 * 1024)).toBe(true);
    });
  });

  describe('File size formatting', () => {
    it('formats 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('formats bytes', () => {
      expect(formatFileSize(512)).toBe('512 B');
    });

    it('formats kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
    });

    it('formats megabytes', () => {
      expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
    });

    it('formats gigabytes', () => {
      expect(formatFileSize(1.5 * 1024 * 1024 * 1024)).toBe('1.5 GB');
    });

    it('formats terabytes', () => {
      expect(formatFileSize(2 * 1024 * 1024 * 1024 * 1024)).toBe('2.0 TB');
    });
  });

  describe('Banner visibility logic', () => {
    it('does not render for files under threshold', () => {
      expect(shouldPromptSync(1024)).toBe(false);
      expect(shouldPromptSync(1024 * 1024)).toBe(false);
    });

    it('renders for files over threshold', () => {
      expect(shouldPromptSync(6 * 1024 * 1024)).toBe(true);
      expect(shouldPromptSync(100 * 1024 * 1024)).toBe(true);
    });

    it('threshold is 5MB', () => {
      const FIVE_MB = 5 * 1024 * 1024;
      expect(shouldPromptSync(FIVE_MB)).toBe(false);
      expect(shouldPromptSync(FIVE_MB + 1)).toBe(true);
    });
  });
});
