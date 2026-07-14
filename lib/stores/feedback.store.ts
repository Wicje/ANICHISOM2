/**
 * Feedback Zustand Store — beta user feedback collection.
 *
 * Persists to IndexedDB via debounced writes.
 */
import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { generateId } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────

export type FeedbackType = 'bug' | 'feature-request' | 'general' | 'ux-issue';
export type FeedbackStatus = 'new' | 'reviewed' | 'planned' | 'done';

export interface FeedbackItem {
  id: string;
  userId: string;
  type: FeedbackType;
  title: string;
  content: string;
  rating?: number;
  appId?: string;
  status: FeedbackStatus;
  createdAt: number;
}

export interface BetaMetrics {
  totalUsers: number;
  activeUsers: number;
  feedbackCount: number;
  averageRating: number;
}

// ─── Storage ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'anichisom-feedback-state';
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(state: FeedbackStoreState) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    idbSet(STORAGE_KEY, { feedback: state.feedback }).catch((e: unknown) => {
      console.warn('[FeedbackStore] Failed to persist:', e);
    });
  }, 2000);
}

// ─── State ──────────────────────────────────────────────────────────────

interface FeedbackStoreState {
  feedback: Record<string, FeedbackItem>;

  submitFeedback: (
    type: FeedbackType,
    title: string,
    content: string,
    rating?: number,
    appId?: string,
  ) => string;
  getFeedbackByType: (type: FeedbackType) => FeedbackItem[];
  getFeedbackByApp: (appId: string) => FeedbackItem[];
  getRecentFeedback: (limit: number) => FeedbackItem[];
  getAverageRating: () => number;
  hydrate: () => Promise<void>;
}

export const useFeedbackStore = create<FeedbackStoreState>((set, get) => ({
  feedback: {},

  submitFeedback: (type, title, content, rating, appId) => {
    const id = generateId('fb');
    const now = Date.now();
    const existingIds = Object.keys(get().feedback);
    const lastTs = existingIds.length > 0
      ? Math.max(...existingIds.map(k => get().feedback[k]!.createdAt))
      : 0;
    const createdAt = now <= lastTs ? lastTs + 1 : now;
    const item: FeedbackItem = {
      id,
      userId: '',
      type,
      title,
      content,
      rating,
      appId,
      status: 'new',
      createdAt,
    };
    set((s) => {
      const feedback = { ...s.feedback, [id]: item };
      schedulePersist({ ...s, feedback });
      return { feedback };
    });
    return id;
  },

  getFeedbackByType: (type) => {
    return Object.values(get().feedback).filter((f) => f.type === type);
  },

  getFeedbackByApp: (appId) => {
    return Object.values(get().feedback).filter((f) => f.appId === appId);
  },

  getRecentFeedback: (limit) => {
    return Object.values(get().feedback)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },

  getAverageRating: () => {
    const items = Object.values(get().feedback).filter((f) => f.rating != null);
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, f) => acc + (f.rating ?? 0), 0);
    return sum / items.length;
  },

  hydrate: async () => {
    try {
      const data = await idbGet<{ feedback: Record<string, FeedbackItem> }>(STORAGE_KEY);
      if (data) {
        set({ feedback: data.feedback || {} });
      }
    } catch (e) {
      console.warn('[FeedbackStore] Failed to hydrate:', e);
    }
  },
}));
