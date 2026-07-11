import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePrivacyStore } from '@/lib/stores/privacy.store';

describe('PrivacyStore', () => {
  beforeEach(() => {
    usePrivacyStore.setState({
      appSettings: {},
      workspaceDefaults: { level: 'shared', restrictedUserIds: [] },
    });
  });

  describe('setAppPrivacy', () => {
    it('should set app privacy level', () => {
      usePrivacyStore.getState().setAppPrivacy('browser', 'private');
      const settings = usePrivacyStore.getState().getAppPrivacy('browser');
      expect(settings.level).toBe('private');
      expect(settings.appId).toBe('browser');
    });

    it('should set restricted with allowed users', () => {
      usePrivacyStore.getState().setAppPrivacy('campaign', 'restricted', ['u1', 'u2']);
      const settings = usePrivacyStore.getState().getAppPrivacy('campaign');
      expect(settings.level).toBe('restricted');
      expect(settings.allowedUserIds).toEqual(['u1', 'u2']);
    });
  });

  describe('getAppPrivacy', () => {
    it('should inherit workspace default for unset apps', () => {
      const settings = usePrivacyStore.getState().getAppPrivacy('moodboard');
      expect(settings.level).toBe('shared');
      expect(settings.inheritWorkspace).toBe(true);
    });

    it('should return explicit setting when set', () => {
      usePrivacyStore.getState().setAppPrivacy('moodboard', 'private');
      const settings = usePrivacyStore.getState().getAppPrivacy('moodboard');
      expect(settings.level).toBe('private');
      expect(settings.inheritWorkspace).toBe(false);
    });
  });

  describe('removeAppPrivacy', () => {
    it('should remove app override', () => {
      usePrivacyStore.getState().setAppPrivacy('files', 'private');
      usePrivacyStore.getState().removeAppPrivacy('files');
      const settings = usePrivacyStore.getState().getAppPrivacy('files');
      expect(settings.level).toBe('shared');
      expect(settings.inheritWorkspace).toBe(true);
    });
  });

  describe('isAppPrivate', () => {
    it('should return true for private apps', () => {
      usePrivacyStore.getState().setAppPrivacy('terminal', 'private');
      expect(usePrivacyStore.getState().isAppPrivate('terminal')).toBe(true);
    });

    it('should return false for shared apps', () => {
      usePrivacyStore.getState().setAppPrivacy('terminal', 'shared');
      expect(usePrivacyStore.getState().isAppPrivate('terminal')).toBe(false);
    });
  });

  describe('isAppVisibleToUser', () => {
    it('should always show apps to owner', () => {
      usePrivacyStore.getState().setAppPrivacy('browser', 'private');
      expect(usePrivacyStore.getState().isAppVisibleToUser('browser', 'owner1', 'owner1')).toBe(true);
    });

    it('should hide private apps from non-owners', () => {
      usePrivacyStore.getState().setAppPrivacy('browser', 'private');
      expect(usePrivacyStore.getState().isAppVisibleToUser('browser', 'user2', 'owner1')).toBe(false);
    });

    it('should show shared apps to non-owners', () => {
      usePrivacyStore.getState().setAppPrivacy('campaign', 'shared');
      expect(usePrivacyStore.getState().isAppVisibleToUser('campaign', 'user2', 'owner1')).toBe(true);
    });

    it('should show restricted apps to allowed users', () => {
      usePrivacyStore.getState().setAppPrivacy('campaign', 'restricted', ['u1', 'u2']);
      expect(usePrivacyStore.getState().isAppVisibleToUser('campaign', 'u1', 'owner')).toBe(true);
    });

    it('should hide restricted apps from non-allowed users', () => {
      usePrivacyStore.getState().setAppPrivacy('campaign', 'restricted', ['u1']);
      expect(usePrivacyStore.getState().isAppVisibleToUser('campaign', 'u3', 'owner')).toBe(false);
    });
  });

  describe('workspaceDefaults', () => {
    it('should set workspace default to private', () => {
      usePrivacyStore.getState().setWorkspaceDefault('private');
      expect(usePrivacyStore.getState().workspaceDefaults.level).toBe('private');
    });

    it('should propagate workspace default to unset apps', () => {
      usePrivacyStore.getState().setWorkspaceDefault('private');
      expect(usePrivacyStore.getState().isAppPrivate('any-app')).toBe(true);
    });
  });

  describe('bulk operations', () => {
    it('should get all private apps', () => {
      usePrivacyStore.getState().setAppPrivacy('a', 'private');
      usePrivacyStore.getState().setAppPrivacy('b', 'shared');
      usePrivacyStore.getState().setAppPrivacy('c', 'private');
      const privateApps = usePrivacyStore.getState().getAllPrivateApps();
      expect(privateApps).toHaveLength(2);
      expect(privateApps).toContain('a');
      expect(privateApps).toContain('c');
    });

    it('should get all shared apps', () => {
      usePrivacyStore.getState().setAppPrivacy('a', 'shared');
      usePrivacyStore.getState().setAppPrivacy('b', 'private');
      const sharedApps = usePrivacyStore.getState().getAllSharedApps();
      expect(sharedApps).toEqual(['a']);
    });

    it('should return privacy summary', () => {
      usePrivacyStore.getState().setAppPrivacy('a', 'private');
      usePrivacyStore.getState().setAppPrivacy('b', 'shared');
      usePrivacyStore.getState().setAppPrivacy('c', 'restricted', ['u1']);
      const summary = usePrivacyStore.getState().getPrivacySummary();
      expect(summary).toEqual({ private: 1, shared: 1, restricted: 1 });
    });
  });
});
