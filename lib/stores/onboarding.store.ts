/**
 * Onboarding Zustand Store — manages the first-launch onboarding wizard.
 *
 * Persists to IndexedDB via debounced writes.
 */
import { create } from 'zustand';
import { withPersistence } from '@/lib/stores/persisted-store';

// ─── Types ──────────────────────────────────────────────────────────────

export type UserRole =
  | 'filmmaker'
  | 'photographer'
  | 'developer'
  | 'designer'
  | 'marketer'
  | 'business'
  | 'student'
  | 'other';

export interface RoleOption {
  id: UserRole;
  label: string;
  description: string;
  icon: string;
  suggestedApps: string[];
}

export interface OnboardingState {
  completed: boolean;
  selectedRole: UserRole | null;
  selectedApps: string[];
  customApps: string[];
  storageProvider?: string | null;
  skippedAt?: number;
  completedAt?: number;
}

// ─── Static Role Data ───────────────────────────────────────────────────

export const AVAILABLE_ROLES: RoleOption[] = [
  {
    id: 'filmmaker',
    label: 'Filmmaker',
    description: 'Video production, editing, and post-production',
    icon: '🎬',
    suggestedApps: ['campaign', 'moodboard', 'media-player', 'screen-recorder', 'calls', 'files', 'terminal'],
  },
  {
    id: 'photographer',
    label: 'Photographer',
    description: 'Photo shoots, editing, and client delivery',
    icon: '📷',
    suggestedApps: ['photography-pack', 'moodboard', 'files', 'calls', 'brand-guides', 'client-portal'],
  },
  {
    id: 'developer',
    label: 'Developer',
    description: 'Software development, DevOps, and hardware',
    icon: '💻',
    suggestedApps: ['code', 'developer-pack', 'terminal', 'browser', 'files', 'hardware-pack', 'hardware-manager'],
  },
  {
    id: 'designer',
    label: 'Designer',
    description: 'UI/UX, branding, and visual design',
    icon: '🎨',
    suggestedApps: ['moodboard', 'brand-guides', 'color-picker', 'client-portal', 'proposal-generator', 'files', 'clothing-brand-pack'],
  },
  {
    id: 'marketer',
    label: 'Marketer',
    description: 'Campaigns, analytics, and content',
    icon: '📢',
    suggestedApps: ['campaign', 'productivity', 'calls', 'files', 'browser', 'assistant', 'client-portal'],
  },
  {
    id: 'business',
    label: 'Business Owner',
    description: 'Project management, invoicing, and operations',
    icon: '💼',
    suggestedApps: ['campaign', 'productivity', 'side-gigs', 'calls', 'files', 'proposal-generator', 'client-portal'],
  },
  {
    id: 'student',
    label: 'Student',
    description: 'Learning, research, and projects',
    icon: '📚',
    suggestedApps: ['files', 'terminal', 'browser', 'code', 'productivity', 'calls', 'assistant'],
  },
  {
    id: 'other',
    label: 'Explorer',
    description: "Just exploring what's possible",
    icon: '🚀',
    suggestedApps: ['files', 'browser', 'terminal', 'ai', 'moodboard', 'productivity'],
  },
];

// ─── State ──────────────────────────────────────────────────────────────

interface OnboardingStoreState {
  onboarding: OnboardingState;
  availableRoles: RoleOption[];

  setRole: (role: UserRole) => void;
  toggleApp: (appId: string) => void;
  selectApps: (appIds: string[]) => void;
  setStorageProvider: (provider: string) => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
}

const defaultOnboarding: OnboardingState = {
  completed: false,
  selectedRole: null,
  selectedApps: [],
  customApps: [],
  storageProvider: null,
};

export const useOnboardingStore = create<OnboardingStoreState>((set, get) => ({
  onboarding: { ...defaultOnboarding },
  availableRoles: AVAILABLE_ROLES,

  setRole: (role) => {
    set((s) => {
      const onboarding = { ...s.onboarding, selectedRole: role };
      return { onboarding };
    });
  },

  toggleApp: (appId) => {
    set((s) => {
      const apps = s.onboarding.selectedApps.includes(appId)
        ? s.onboarding.selectedApps.filter((a) => a !== appId)
        : [...s.onboarding.selectedApps, appId];
      const onboarding = { ...s.onboarding, selectedApps: apps };
      return { onboarding };
    });
  },

  selectApps: (appIds) => {
    set((s) => {
      const onboarding = { ...s.onboarding, selectedApps: appIds };
      return { onboarding };
    });
  },

  setStorageProvider: (provider) => {
    set((s) => {
      const onboarding = { ...s.onboarding, storageProvider: provider };
      return { onboarding };
    });
  },

  completeOnboarding: () => {
    set((s) => {
      const onboarding: OnboardingState = {
        ...s.onboarding,
        completed: true,
        completedAt: Date.now(),
      };
      return { onboarding };
    });
  },

  skipOnboarding: () => {
    set((s) => {
      const onboarding: OnboardingState = {
        ...s.onboarding,
        completed: true,
        skippedAt: Date.now(),
      };
      return { onboarding };
    });
  },

  resetOnboarding: () => {
    set((s) => {
      const onboarding: OnboardingState = { ...defaultOnboarding };
      return { onboarding };
    });
  },
}));

withPersistence(useOnboardingStore, 'onboarding-state', ['onboarding']);
