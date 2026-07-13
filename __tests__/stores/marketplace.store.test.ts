import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMarketplaceStore } from '@/lib/stores/marketplace.store';
import { MarketplaceReviewService } from '@/lib/services/marketplace-review.service';
import type { PluginSubmission } from '@/lib/services/marketplace-review.service';

function makeSubmission(overrides: Partial<PluginSubmission> = {}): PluginSubmission {
  return {
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    pluginId: 'plugin-store-1',
    name: 'Store Test Plugin',
    version: '1.0.0',
    description: 'A test plugin',
    author: 'Test Author',
    authorEmail: 'test@example.com',
    category: 'utility',
    permissions: ['files:read'],
    runtime: 'iframe',
    entryUrl: 'https://example.com/plugin.html',
    status: 'pending',
    submittedAt: Date.now(),
    price: 0,
    isFree: true,
    ...overrides,
  };
}

// Stub idb-keyval so hydrate/debouncePersist don't fail
vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  MarketplaceReviewService._reset();
  useMarketplaceStore.setState({
    submissions: {},
    reviews: {},
    revenue: {},
    installCounts: {},
    activeSubmissionId: null,
  });
});

describe('MarketplaceStore', () => {
  describe('Default State', () => {
    it('should start with empty state', () => {
      const state = useMarketplaceStore.getState();
      expect(Object.keys(state.submissions)).toHaveLength(0);
      expect(Object.keys(state.reviews)).toHaveLength(0);
      expect(Object.keys(state.installCounts)).toHaveLength(0);
      expect(state.activeSubmissionId).toBeNull();
    });
  });

  describe('Submission CRUD', () => {
    it('should submit a plugin and update state', () => {
      const store = useMarketplaceStore.getState();
      const sub = makeSubmission({ id: 'sub-1' });
      const result = store.submitPlugin(sub);
      expect(result.status).toBe('pending');
      expect(useMarketplaceStore.getState().submissions['sub-1']).toBeDefined();
    });

    it('should return all submissions after submit', () => {
      const store = useMarketplaceStore.getState();
      store.submitPlugin(makeSubmission({ id: 'sub-a' }));
      store.submitPlugin(makeSubmission({ id: 'sub-b' }));
      expect(Object.keys(useMarketplaceStore.getState().submissions)).toHaveLength(2);
    });
  });

  describe('Approval Workflow', () => {
    it('should approve a plugin through store', () => {
      const store = useMarketplaceStore.getState();
      store.submitPlugin(makeSubmission({ id: 'sub-1' }));
      const result = store.approvePlugin('sub-1', 'reviewer@anichisom.com');
      expect(result?.status).toBe('approved');
      expect(useMarketplaceStore.getState().submissions['sub-1']!.status).toBe('approved');
    });

    it('should reject a plugin through store', () => {
      const store = useMarketplaceStore.getState();
      store.submitPlugin(makeSubmission({ id: 'sub-1' }));
      const result = store.rejectPlugin('sub-1', 'admin', 'Violates TOS');
      expect(result?.status).toBe('rejected');
      expect(result?.rejectionReason).toBe('Violates TOS');
    });

    it('should reviewSubmission through store', () => {
      const store = useMarketplaceStore.getState();
      store.submitPlugin(makeSubmission({ id: 'sub-1' }));
      const result = store.reviewSubmission('sub-1', 'admin', 'approved', 'Looks good');
      expect(result?.status).toBe('approved');
      expect(result?.reviewNotes).toBe('Looks good');
    });
  });

  describe('Reviews', () => {
    it('should add a review through store', () => {
      const store = useMarketplaceStore.getState();
      const review = store.addReview('p1', 'u1', 'Alice', 4, 'Nice', 'Works well');
      expect(review.rating).toBe(4);
      expect(useMarketplaceStore.getState().reviews['p1']).toHaveLength(1);
    });

    it('should get reviews through store', () => {
      const store = useMarketplaceStore.getState();
      store.addReview('p1', 'u1', 'Alice', 5, 'T', 'C');
      store.addReview('p1', 'u2', 'Bob', 3, 'T', 'C');
      const reviews = store.getReviews('p1');
      expect(reviews).toHaveLength(2);
    });

    it('should calculate average rating through store', () => {
      const store = useMarketplaceStore.getState();
      store.addReview('p1', 'u1', 'Alice', 4, 'T', 'C');
      store.addReview('p1', 'u2', 'Bob', 2, 'T', 'C');
      expect(store.getAverageRating('p1')).toBe(3);
    });
  });

  describe('Install Counts', () => {
    it('should track install counts through store', () => {
      const store = useMarketplaceStore.getState();
      expect(store.incrementInstallCount('p1')).toBe(1);
      expect(store.incrementInstallCount('p1')).toBe(2);
      expect(useMarketplaceStore.getState().installCounts['p1']).toBe(2);
    });

    it('should return popular plugins through store', () => {
      const store = useMarketplaceStore.getState();
      for (let i = 0; i < 3; i++) store.incrementInstallCount('p1');
      for (let i = 0; i < 5; i++) store.incrementInstallCount('p2');

      const popular = store.getPopularPlugins();
      expect(popular[0]!.pluginId).toBe('p2');
      expect(popular[1]!.pluginId).toBe('p1');
    });
  });

  describe('Hydrate', () => {
    it('should hydrate from IndexedDB (no-op when empty)', async () => {
      const store = useMarketplaceStore.getState();
      await store.hydrate();
      expect(useMarketplaceStore.getState().submissions).toEqual({});
    });
  });
});
