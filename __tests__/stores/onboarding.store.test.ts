import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useOnboardingStore, AVAILABLE_ROLES } from '@/lib/stores/onboarding.store';

describe('OnboardingStore', () => {
  beforeEach(() => {
    useOnboardingStore.setState({
      onboarding: {
        completed: false,
        selectedRole: null,
        selectedApps: [],
        customApps: [],
      },
    });
    vi.clearAllTimers();
  });

  describe('default state', () => {
    it('should not be completed by default', () => {
      expect(useOnboardingStore.getState().onboarding.completed).toBe(false);
    });

    it('should have no role selected by default', () => {
      expect(useOnboardingStore.getState().onboarding.selectedRole).toBeNull();
    });

    it('should have no apps selected by default', () => {
      expect(useOnboardingStore.getState().onboarding.selectedApps).toEqual([]);
    });

    it('should have no custom apps by default', () => {
      expect(useOnboardingStore.getState().onboarding.customApps).toEqual([]);
    });

    it('should have no skippedAt by default', () => {
      expect(useOnboardingStore.getState().onboarding.skippedAt).toBeUndefined();
    });

    it('should have no completedAt by default', () => {
      expect(useOnboardingStore.getState().onboarding.completedAt).toBeUndefined();
    });
  });

  describe('setRole', () => {
    it('should set the selected role', () => {
      useOnboardingStore.getState().setRole('developer');
      expect(useOnboardingStore.getState().onboarding.selectedRole).toBe('developer');
    });

    it('should overwrite a previously selected role', () => {
      useOnboardingStore.getState().setRole('filmmaker');
      useOnboardingStore.getState().setRole('designer');
      expect(useOnboardingStore.getState().onboarding.selectedRole).toBe('designer');
    });
  });

  describe('toggleApp', () => {
    it('should add an app if not already selected', () => {
      useOnboardingStore.getState().toggleApp('terminal');
      expect(useOnboardingStore.getState().onboarding.selectedApps).toContain('terminal');
    });

    it('should remove an app if already selected', () => {
      useOnboardingStore.getState().toggleApp('terminal');
      useOnboardingStore.getState().toggleApp('terminal');
      expect(useOnboardingStore.getState().onboarding.selectedApps).not.toContain('terminal');
    });

    it('should handle multiple apps', () => {
      useOnboardingStore.getState().toggleApp('files');
      useOnboardingStore.getState().toggleApp('browser');
      useOnboardingStore.getState().toggleApp('code');
      const apps = useOnboardingStore.getState().onboarding.selectedApps;
      expect(apps).toHaveLength(3);
      expect(apps).toContain('files');
      expect(apps).toContain('browser');
      expect(apps).toContain('code');
    });
  });

  describe('selectApps', () => {
    it('should replace selected apps with the given array', () => {
      useOnboardingStore.getState().toggleApp('old-app');
      useOnboardingStore.getState().selectApps(['a', 'b', 'c']);
      expect(useOnboardingStore.getState().onboarding.selectedApps).toEqual(['a', 'b', 'c']);
    });

    it('should clear apps with empty array', () => {
      useOnboardingStore.getState().toggleApp('x');
      useOnboardingStore.getState().selectApps([]);
      expect(useOnboardingStore.getState().onboarding.selectedApps).toEqual([]);
    });
  });

  describe('completeOnboarding', () => {
    it('should mark onboarding as completed', () => {
      useOnboardingStore.getState().completeOnboarding();
      expect(useOnboardingStore.getState().onboarding.completed).toBe(true);
    });

    it('should set completedAt timestamp', () => {
      const before = Date.now();
      useOnboardingStore.getState().completeOnboarding();
      expect(useOnboardingStore.getState().onboarding.completedAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe('skipOnboarding', () => {
    it('should mark onboarding as completed', () => {
      useOnboardingStore.getState().skipOnboarding();
      expect(useOnboardingStore.getState().onboarding.completed).toBe(true);
    });

    it('should set skippedAt timestamp', () => {
      const before = Date.now();
      useOnboardingStore.getState().skipOnboarding();
      expect(useOnboardingStore.getState().onboarding.skippedAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe('resetOnboarding', () => {
    it('should reset all onboarding state to defaults', () => {
      useOnboardingStore.getState().setRole('student');
      useOnboardingStore.getState().toggleApp('files');
      useOnboardingStore.getState().completeOnboarding();

      useOnboardingStore.getState().resetOnboarding();
      const state = useOnboardingStore.getState().onboarding;
      expect(state.completed).toBe(false);
      expect(state.selectedRole).toBeNull();
      expect(state.selectedApps).toEqual([]);
      expect(state.skippedAt).toBeUndefined();
      expect(state.completedAt).toBeUndefined();
    });
  });

  describe('availableRoles', () => {
    it('should have 8 roles', () => {
      expect(useOnboardingStore.getState().availableRoles).toHaveLength(8);
    });

    it('should match the static AVAILABLE_ROLES export', () => {
      expect(useOnboardingStore.getState().availableRoles).toBe(AVAILABLE_ROLES);
    });

    it('should include filmmaker role with suggested apps', () => {
      const filmmaker = useOnboardingStore.getState().availableRoles.find((r) => r.id === 'filmmaker');
      expect(filmmaker).toBeDefined();
      expect(filmmaker!.suggestedApps).toContain('campaign');
      expect(filmmaker!.suggestedApps).toContain('moodboard');
    });
  });
});
