/**
 * Feedback Zustand Store — beta user feedback collection.
 *
 * All persistence through Context Layer (readDomain/writeDomain).
 */
import { create } from 'zustand';
import { readDomain, writeDomain } from '@/lib/context-layer';
import { generateId } from '@/lib/utils';

const DOMAIN = 'feedback';
const LEGACY_KEY = 'continuaos-feedback-state';

export type FeedbackType = 'bug' | 'feature-request' | 'general' | 'ux-issue';
export type FeedbackStatus = 'new' | 'reviewed' | 'planned' | 'done';
export interface FeedbackItem {
  id: string; userId: string; type: FeedbackType; title: string; content: string;
  rating?: number; appId?: string; status: FeedbackStatus; createdAt: number;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist(state: FeedbackStoreState) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    writeDomain(DOMAIN, { feedback: state.feedback });
  }, 2000);
}

interface FeedbackStoreState {
  feedback: Record<string, FeedbackItem>;
  submitFeedback: (type: FeedbackType, title: string, content: string, rating?: number, appId?: string) => string;
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
    const lastTs = existingIds.length > 0 ? Math.max(...existingIds.map(k => get().feedback[k]!.createdAt)) : 0;
    const createdAt = now <= lastTs ? lastTs + 1 : now;
    const item: FeedbackItem = { id, userId: '', type, title, content, rating, appId, status: 'new', createdAt };
    set(s => { const feedback = { ...s.feedback, [id]: item }; schedulePersist({ ...s, feedback }); return { feedback }; });
    return id;
  },

  getFeedbackByType: (type) => Object.values(get().feedback).filter(f => f.type === type),
  getFeedbackByApp: (appId) => Object.values(get().feedback).filter(f => f.appId === appId),
  getRecentFeedback: (limit) => Object.values(get().feedback).sort((a, b) => b.createdAt - a.createdAt).slice(0, limit),
  getAverageRating: () => {
    const items = Object.values(get().feedback).filter(f => f.rating != null);
    if (items.length === 0) return 0;
    return items.reduce((acc, f) => acc + (f.rating ?? 0), 0) / items.length;
  },

  hydrate: async () => {
    try {
      const data = await readDomain<{ feedback?: Record<string, FeedbackItem> }>(DOMAIN);
      if (data) { set({ feedback: data.feedback || {} }); return; }
      const { get: idbGet } = await import('idb-keyval');
      const legacy = await idbGet<{ feedback: Record<string, FeedbackItem> }>(LEGACY_KEY);
      if (legacy) { set({ feedback: legacy.feedback || {} }); writeDomain(DOMAIN, legacy); }
    } catch (e) { console.warn('[FeedbackStore] Failed to hydrate:', e); }
  },
}));
