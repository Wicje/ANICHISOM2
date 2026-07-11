/**
 * Marketplace Zustand Store — reactive state for the public marketplace
 * submission review pipeline, ratings, install counts, and revenue.
 *
 * Delegates persistence to IndexedDB via idb-keyval with debounced writes.
 */
import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import {
  MarketplaceReviewService,
  type PluginSubmission,
  type PluginReview,
  type RevenueRecord,
} from '@/lib/services/marketplace-review.service';

// ─── Types ───────────────────────────────────────────────────────────────

interface MarketplaceState {
  submissions: Record<string, PluginSubmission>;
  reviews: Record<string, PluginReview[]>;
  revenue: Record<string, RevenueRecord[]>;
  installCounts: Record<string, number>;
  activeSubmissionId: string | null;

  submitPlugin: (submission: PluginSubmission) => PluginSubmission;
  reviewSubmission: (
    id: string,
    reviewer: string,
    status: 'approved' | 'rejected',
    notes: string,
  ) => PluginSubmission | null;
  approvePlugin: (id: string, reviewer: string) => PluginSubmission | null;
  rejectPlugin: (id: string, reviewer: string, reason: string) => PluginSubmission | null;
  addReview: (
    pluginId: string,
    userId: string,
    userName: string,
    rating: number,
    title: string,
    content: string,
  ) => PluginReview;
  getReviews: (pluginId: string) => PluginReview[];
  getAverageRating: (pluginId: string) => number;
  incrementInstallCount: (pluginId: string) => number;
  getPopularPlugins: (limit?: number) => { pluginId: string; installs: number }[];
  getRevenue: (pluginId: string, month: string) => RevenueRecord[];
  hydrate: () => void;
}

// ─── Persistence ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'anichisom-marketplace-state';
let persistTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncePersist(state: {
  submissions: Record<string, PluginSubmission>;
  reviews: Record<string, PluginReview[]>;
  revenue: Record<string, RevenueRecord[]>;
  installCounts: Record<string, number>;
}): void {
  if (persistTimeout) clearTimeout(persistTimeout);
  persistTimeout = setTimeout(async () => {
    try {
      await idbSet(STORAGE_KEY, state);
    } catch {
      // SSR or quota — silently ignore
    }
  }, 300);
}

// ─── Store ───────────────────────────────────────────────────────────────

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  submissions: {},
  reviews: {},
  revenue: {},
  installCounts: {},
  activeSubmissionId: null,

  submitPlugin: (submission) => {
    const result = MarketplaceReviewService.submitPlugin(submission);
    const svc = MarketplaceReviewService._state;
    const next = {
      submissions: { ...svc.submissions },
      reviews: { ...svc.reviews },
      revenue: { ...svc.revenue },
      installCounts: { ...svc.installCounts },
    };
    set({ submissions: next.submissions });
    debouncePersist(next);
    return result;
  },

  reviewSubmission: (id, reviewer, status, notes) => {
    const result = MarketplaceReviewService.reviewSubmission(id, reviewer, status, notes);
    if (!result) return null;
    const svc = MarketplaceReviewService._state;
    const next = {
      submissions: { ...svc.submissions },
      reviews: { ...svc.reviews },
      revenue: { ...svc.revenue },
      installCounts: { ...svc.installCounts },
    };
    set({ submissions: next.submissions });
    debouncePersist(next);
    return result;
  },

  approvePlugin: (id, reviewer) => {
    const result = MarketplaceReviewService.approvePlugin(id, reviewer);
    if (!result) return null;
    const svc = MarketplaceReviewService._state;
    const next = {
      submissions: { ...svc.submissions },
      reviews: { ...svc.reviews },
      revenue: { ...svc.revenue },
      installCounts: { ...svc.installCounts },
    };
    set({ submissions: next.submissions });
    debouncePersist(next);
    return result;
  },

  rejectPlugin: (id, reviewer, reason) => {
    const result = MarketplaceReviewService.rejectPlugin(id, reviewer, reason);
    if (!result) return null;
    const svc = MarketplaceReviewService._state;
    const next = {
      submissions: { ...svc.submissions },
      reviews: { ...svc.reviews },
      revenue: { ...svc.revenue },
      installCounts: { ...svc.installCounts },
    };
    set({ submissions: next.submissions });
    debouncePersist(next);
    return result;
  },

  addReview: (pluginId, userId, userName, rating, title, content) => {
    const result = MarketplaceReviewService.addReview(pluginId, userId, userName, rating, title, content);
    const svc = MarketplaceReviewService._state;
    const next = {
      submissions: { ...svc.submissions },
      reviews: { ...svc.reviews },
      revenue: { ...svc.revenue },
      installCounts: { ...svc.installCounts },
    };
    set({ reviews: next.reviews });
    debouncePersist(next);
    return result;
  },

  getReviews: (pluginId) => {
    return get().reviews[pluginId] || [];
  },

  getAverageRating: (pluginId) => {
    return MarketplaceReviewService.getAverageRating(pluginId);
  },

  incrementInstallCount: (pluginId) => {
    const count = MarketplaceReviewService.incrementInstallCount(pluginId);
    const svc = MarketplaceReviewService._state;
    const next = {
      submissions: { ...svc.submissions },
      reviews: { ...svc.reviews },
      revenue: { ...svc.revenue },
      installCounts: { ...svc.installCounts },
    };
    set({ installCounts: next.installCounts });
    debouncePersist(next);
    return count;
  },

  getPopularPlugins: (limit) => {
    return MarketplaceReviewService.getPopularPlugins(limit);
  },

  getRevenue: (pluginId, month) => {
    return MarketplaceReviewService.getRevenue(pluginId, month);
  },

  hydrate: async () => {
    try {
      const data = await idbGet<{
        submissions: Record<string, PluginSubmission>;
        reviews: Record<string, PluginReview[]>;
        revenue: Record<string, RevenueRecord[]>;
        installCounts: Record<string, number>;
      }>(STORAGE_KEY);
      if (data) {
        MarketplaceReviewService._state = {
          submissions: data.submissions || {},
          reviews: data.reviews || {},
          installCounts: data.installCounts || {},
          revenue: data.revenue || {},
        };
        set({
          submissions: data.submissions || {},
          reviews: data.reviews || {},
          revenue: data.revenue || {},
          installCounts: data.installCounts || {},
        });
      }
    } catch {
      // SSR or IDB unavailable
    }
  },
}));
