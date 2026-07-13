import { describe, it, expect, beforeEach } from 'vitest';
import {
  MarketplaceReviewService,
  type PluginSubmission,
  type PluginReview,
} from '@/lib/services/marketplace-review.service';

function makeSubmission(overrides: Partial<PluginSubmission> = {}): PluginSubmission {
  return {
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    pluginId: 'plugin-test-1',
    name: 'Test Plugin',
    version: '1.0.0',
    description: 'A test plugin for the marketplace',
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

describe('MarketplaceReviewService', () => {
  beforeEach(() => {
    MarketplaceReviewService._reset();
  });

  describe('Plugin Submission', () => {
    it('should submit a plugin with pending status', () => {
      const sub = makeSubmission({ id: 'sub-1' });
      const result = MarketplaceReviewService.submitPlugin(sub);
      expect(result.status).toBe('pending');
      expect(result.submittedAt).toBeGreaterThan(0);
    });

    it('should retrieve submissions by status', () => {
      MarketplaceReviewService.submitPlugin(makeSubmission({ id: 'sub-a' }));
      MarketplaceReviewService.submitPlugin(makeSubmission({ id: 'sub-b' }));

      expect(MarketplaceReviewService.getSubmissions()).toHaveLength(2);
      expect(MarketplaceReviewService.getSubmissions('pending')).toHaveLength(2);
      expect(MarketplaceReviewService.getSubmissions('approved')).toHaveLength(0);
    });
  });

  describe('Approval / Rejection Workflow', () => {
    it('should approve a plugin', () => {
      MarketplaceReviewService.submitPlugin(makeSubmission({ id: 'sub-1' }));
      const result = MarketplaceReviewService.approvePlugin('sub-1', 'reviewer@test.com');
      expect(result?.status).toBe('approved');
      expect(result?.reviewer).toBe('reviewer@test.com');
      expect(result?.reviewedAt).toBeGreaterThan(0);
    });

    it('should reject a plugin with a reason', () => {
      MarketplaceReviewService.submitPlugin(makeSubmission({ id: 'sub-1' }));
      const result = MarketplaceReviewService.rejectPlugin('sub-1', 'reviewer@test.com', 'Missing license');
      expect(result?.status).toBe('rejected');
      expect(result?.rejectionReason).toBe('Missing license');
    });

    it('should return null for unknown submission', () => {
      expect(MarketplaceReviewService.approvePlugin('nonexistent', 'rev')).toBeNull();
      expect(MarketplaceReviewService.rejectPlugin('nonexistent', 'rev', 'N/A')).toBeNull();
    });

    it('should reviewSubmission with notes', () => {
      MarketplaceReviewService.submitPlugin(makeSubmission({ id: 'sub-1' }));
      const result = MarketplaceReviewService.reviewSubmission('sub-1', 'admin', 'approved', 'LGTM');
      expect(result?.status).toBe('approved');
      expect(result?.reviewNotes).toBe('LGTM');
    });

    it('should suspend a published plugin', () => {
      MarketplaceReviewService.submitPlugin(makeSubmission({ id: 'sub-1' }));
      MarketplaceReviewService.approvePlugin('sub-1', 'reviewer');
      const result = MarketplaceReviewService.suspendPlugin('sub-1', 'admin', 'Malware detected');
      expect(result?.status).toBe('suspended');
      expect(result?.rejectionReason).toBe('Malware detected');
    });
  });

  describe('Reviews', () => {
    it('should add a review and retrieve it', () => {
      const review = MarketplaceReviewService.addReview(
        'plugin-1', 'user-1', 'Alice', 5, 'Great plugin', 'Works perfectly',
      );
      expect(review.id).toContain('review_');
      expect(review.rating).toBe(5);

      const reviews = MarketplaceReviewService.getReviews('plugin-1');
      expect(reviews).toHaveLength(1);
      expect(reviews[0]!.title).toBe('Great plugin');
    });

    it('should calculate average rating', () => {
      MarketplaceReviewService.addReview('p1', 'u1', 'A', 4, 'T', 'C');
      MarketplaceReviewService.addReview('p1', 'u2', 'B', 2, 'T', 'C');
      expect(MarketplaceReviewService.getAverageRating('p1')).toBe(3);

      expect(MarketplaceReviewService.getAverageRating('unknown')).toBe(0);
    });

    it('should clamp ratings between 1 and 5', () => {
      const high = MarketplaceReviewService.addReview('p1', 'u1', 'A', 10, 'T', 'C');
      expect(high.rating).toBe(5);

      const low = MarketplaceReviewService.addReview('p1', 'u2', 'B', -3, 'T', 'C');
      expect(low.rating).toBe(1);
    });
  });

  describe('Install Counts', () => {
    it('should track install counts', () => {
      expect(MarketplaceReviewService.incrementInstallCount('p1')).toBe(1);
      expect(MarketplaceReviewService.incrementInstallCount('p1')).toBe(2);
      expect(MarketplaceReviewService.getInstallCount('p1')).toBe(2);
    });

    it('should return 0 for unknown plugin', () => {
      expect(MarketplaceReviewService.getInstallCount('unknown')).toBe(0);
    });

    it('should sort popular plugins by install count', () => {
      MarketplaceReviewService.submitPlugin(makeSubmission({ pluginId: 'p1', id: 's1' }));
      MarketplaceReviewService.submitPlugin(makeSubmission({ pluginId: 'p2', id: 's2' }));
      MarketplaceReviewService.submitPlugin(makeSubmission({ pluginId: 'p3', id: 's3' }));

      for (let i = 0; i < 5; i++) MarketplaceReviewService.incrementInstallCount('p2');
      for (let i = 0; i < 3; i++) MarketplaceReviewService.incrementInstallCount('p1');
      for (let i = 0; i < 10; i++) MarketplaceReviewService.incrementInstallCount('p3');

      const popular = MarketplaceReviewService.getPopularPlugins(2);
      expect(popular).toHaveLength(2);
      expect(popular[0]!.pluginId).toBe('p3');
      expect(popular[1]!.pluginId).toBe('p2');
    });
  });

  describe('Revenue', () => {
    it('should calculate 75/25 revenue split', () => {
      const split = MarketplaceReviewService.calculateRevenueShare(100);
      expect(split.publisherShare).toBe(75);
      expect(split.platformFee).toBe(25);
    });

    it('should handle fractional revenue', () => {
      const split = MarketplaceReviewService.calculateRevenueShare(33.33);
      expect(split.publisherShare + split.platformFee).toBeCloseTo(33.33, 1);
    });
  });

  describe('Default State', () => {
    it('should start with empty state after reset', () => {
      MarketplaceReviewService._reset();
      expect(MarketplaceReviewService.getSubmissions()).toHaveLength(0);
      expect(MarketplaceReviewService.getReviews('any')).toHaveLength(0);
      expect(MarketplaceReviewService.getInstallCount('any')).toBe(0);
      expect(MarketplaceReviewService.getPopularPlugins()).toHaveLength(0);
    });
  });
});
