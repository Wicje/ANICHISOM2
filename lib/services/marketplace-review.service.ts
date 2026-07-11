/**
 * Marketplace Review Service — manages the public marketplace submission
 * review pipeline, ratings, install tracking, and revenue sharing.
 *
 * Pure in-memory state with localStorage persistence.
 */

// ─── Types ──────────────────────────────────────────────────────────────

export interface PluginSubmission {
  id: string;
  pluginId: string;
  name: string;
  version: string;
  description: string;
  author: string;
  authorEmail: string;
  category: string;
  permissions: string[];
  runtime: 'iframe' | 'native';
  entryUrl?: string;
  manifestUrl?: string;
  status: 'pending' | 'under-review' | 'approved' | 'rejected' | 'suspended';
  submittedAt: number;
  reviewedAt?: number;
  reviewer?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  price: number;
  isFree: boolean;
}

export interface PluginReview {
  id: string;
  pluginId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  content: string;
  helpful: number;
  reported: boolean;
  createdAt: number;
}

export interface RevenueRecord {
  id: string;
  pluginId: string;
  publisherId: string;
  month: string;
  downloads: number;
  revenue: number;
  share: number;
  platformFee: number;
  payoutStatus: 'pending' | 'processing' | 'paid';
  createdAt: number;
}

// ─── Persistence ────────────────────────────────────────────────────────

const STORAGE_KEY = 'anichisom-marketplace-reviews';

interface PersistedState {
  submissions: Record<string, PluginSubmission>;
  reviews: Record<string, PluginReview[]>;
  installCounts: Record<string, number>;
  revenue: Record<string, RevenueRecord[]>;
}

function loadState(): PersistedState {
  try {
    if (typeof localStorage === 'undefined') return defaultState();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return JSON.parse(raw);
  } catch {
    return defaultState();
  }
}

function saveState(state: PersistedState): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded or SSR — silently ignore
  }
}

function defaultState(): PersistedState {
  return { submissions: {}, reviews: {}, installCounts: {}, revenue: {} };
}

// ─── Service ────────────────────────────────────────────────────────────

export const MarketplaceReviewService = {
  _state: loadState() as PersistedState,

  _persist(): void {
    saveState(this._state);
  },

  // ─── Submissions ─────────────────────────────────────────────────

  submitPlugin(submission: PluginSubmission): PluginSubmission {
    this._state.submissions[submission.id] = {
      ...submission,
      status: 'pending',
      submittedAt: Date.now(),
    };
    this._persist();
    return this._state.submissions[submission.id];
  },

  getSubmissions(status?: PluginSubmission['status']): PluginSubmission[] {
    const all = Object.values(this._state.submissions);
    if (!status) return all;
    return all.filter((s) => s.status === status);
  },

  reviewSubmission(
    id: string,
    reviewer: string,
    status: 'approved' | 'rejected',
    notes: string,
  ): PluginSubmission | null {
    const submission = this._state.submissions[id];
    if (!submission) return null;
    submission.status = status;
    submission.reviewedAt = Date.now();
    submission.reviewer = reviewer;
    submission.reviewNotes = notes;
    this._persist();
    return submission;
  },

  approvePlugin(id: string, reviewer: string): PluginSubmission | null {
    const submission = this._state.submissions[id];
    if (!submission) return null;
    submission.status = 'approved';
    submission.reviewedAt = Date.now();
    submission.reviewer = reviewer;
    this._persist();
    return submission;
  },

  rejectPlugin(id: string, reviewer: string, reason: string): PluginSubmission | null {
    const submission = this._state.submissions[id];
    if (!submission) return null;
    submission.status = 'rejected';
    submission.reviewedAt = Date.now();
    submission.reviewer = reviewer;
    submission.rejectionReason = reason;
    this._persist();
    return submission;
  },

  suspendPlugin(id: string, reviewer: string, reason: string): PluginSubmission | null {
    const submission = this._state.submissions[id];
    if (!submission) return null;
    submission.status = 'suspended';
    submission.reviewedAt = Date.now();
    submission.reviewer = reviewer;
    submission.rejectionReason = reason;
    this._persist();
    return submission;
  },

  // ─── Reviews ─────────────────────────────────────────────────────

  addReview(
    pluginId: string,
    userId: string,
    userName: string,
    rating: number,
    title: string,
    content: string,
  ): PluginReview {
    const review: PluginReview = {
      id: `review_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      pluginId,
      userId,
      userName,
      rating: Math.max(1, Math.min(5, Math.round(rating))),
      title,
      content,
      helpful: 0,
      reported: false,
      createdAt: Date.now(),
    };

    if (!this._state.reviews[pluginId]) {
      this._state.reviews[pluginId] = [];
    }
    this._state.reviews[pluginId].push(review);
    this._persist();
    return review;
  },

  getReviews(pluginId: string): PluginReview[] {
    return this._state.reviews[pluginId] || [];
  },

  getAverageRating(pluginId: string): number {
    const reviews = this._state.reviews[pluginId];
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  },

  // ─── Install Counts ─────────────────────────────────────────────

  incrementInstallCount(pluginId: string): number {
    this._state.installCounts[pluginId] =
      (this._state.installCounts[pluginId] || 0) + 1;
    this._persist();
    return this._state.installCounts[pluginId];
  },

  getInstallCount(pluginId: string): number {
    return this._state.installCounts[pluginId] || 0;
  },

  getPopularPlugins(limit: number = 10): { pluginId: string; installs: number }[] {
    return Object.entries(this._state.installCounts)
      .map(([pluginId, installs]) => ({ pluginId, installs }))
      .sort((a, b) => b.installs - a.installs)
      .slice(0, limit);
  },

  // ─── Revenue ─────────────────────────────────────────────────────

  getRevenue(pluginId: string, month: string): RevenueRecord[] {
    const all = this._state.revenue[pluginId] || [];
    return all.filter((r) => r.month === month);
  },

  calculateRevenueShare(revenue: number): { publisherShare: number; platformFee: number } {
    const platformFee = Math.round(revenue * 0.25 * 100) / 100;
    const publisherShare = Math.round((revenue - platformFee) * 100) / 100;
    return { publisherShare, platformFee };
  },

  // ─── Reset (for testing) ────────────────────────────────────────

  _reset(): void {
    this._state = defaultState();
    this._persist();
  },
};
