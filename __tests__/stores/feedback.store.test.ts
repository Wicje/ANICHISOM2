import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFeedbackStore } from '@/lib/stores/feedback.store';

describe('FeedbackStore', () => {
  beforeEach(() => {
    useFeedbackStore.setState({ feedback: {} });
    vi.clearAllTimers();
  });

  describe('default state', () => {
    it('should have empty feedback by default', () => {
      expect(useFeedbackStore.getState().feedback).toEqual({});
    });

    it('should return empty array for getRecentFeedback', () => {
      expect(useFeedbackStore.getState().getRecentFeedback(10)).toEqual([]);
    });

    it('should return 0 for getAverageRating with no feedback', () => {
      expect(useFeedbackStore.getState().getAverageRating()).toBe(0);
    });
  });

  describe('submitFeedback', () => {
    it('should submit bug feedback and return an ID', () => {
      const id = useFeedbackStore.getState().submitFeedback('bug', 'Crash', 'App crashes on launch');
      expect(id).toMatch(/^fb_/);
      const item = useFeedbackStore.getState().feedback[id];
      expect(item).toBeDefined();
      expect(item.type).toBe('bug');
      expect(item.title).toBe('Crash');
      expect(item.status).toBe('new');
    });

    it('should submit feature-request feedback', () => {
      const id = useFeedbackStore.getState().submitFeedback('feature-request', 'Dark mode', 'Add dark mode');
      expect(useFeedbackStore.getState().feedback[id].type).toBe('feature-request');
    });

    it('should submit general feedback', () => {
      const id = useFeedbackStore.getState().submitFeedback('general', 'Nice', 'Great app');
      expect(useFeedbackStore.getState().feedback[id].type).toBe('general');
    });

    it('should submit ux-issue feedback', () => {
      const id = useFeedbackStore.getState().submitFeedback('ux-issue', 'Confusing', 'Hard to find settings');
      expect(useFeedbackStore.getState().feedback[id].type).toBe('ux-issue');
    });

    it('should store optional rating', () => {
      const id = useFeedbackStore.getState().submitFeedback('general', 'Good', 'Works well', 5);
      expect(useFeedbackStore.getState().feedback[id].rating).toBe(5);
    });

    it('should store optional appId', () => {
      const id = useFeedbackStore.getState().submitFeedback('bug', 'Bug', 'In terminal', undefined, 'terminal');
      expect(useFeedbackStore.getState().feedback[id].appId).toBe('terminal');
    });
  });

  describe('getFeedbackByType', () => {
    it('should return feedback filtered by type', () => {
      useFeedbackStore.getState().submitFeedback('bug', 'B1', 'content');
      useFeedbackStore.getState().submitFeedback('bug', 'B2', 'content');
      useFeedbackStore.getState().submitFeedback('general', 'G1', 'content');
      const bugs = useFeedbackStore.getState().getFeedbackByType('bug');
      expect(bugs).toHaveLength(2);
      expect(bugs.every((f) => f.type === 'bug')).toBe(true);
    });

    it('should return empty array for unmatched type', () => {
      useFeedbackStore.getState().submitFeedback('general', 'G1', 'content');
      expect(useFeedbackStore.getState().getFeedbackByType('bug')).toHaveLength(0);
    });
  });

  describe('getFeedbackByApp', () => {
    it('should return feedback filtered by appId', () => {
      useFeedbackStore.getState().submitFeedback('bug', 'B1', 'content', undefined, 'terminal');
      useFeedbackStore.getState().submitFeedback('bug', 'B2', 'content', undefined, 'browser');
      useFeedbackStore.getState().submitFeedback('bug', 'B3', 'content', undefined, 'terminal');
      const terminal = useFeedbackStore.getState().getFeedbackByApp('terminal');
      expect(terminal).toHaveLength(2);
    });
  });

  describe('getRecentFeedback', () => {
    it('should return feedback sorted by createdAt descending', () => {
      useFeedbackStore.getState().submitFeedback('general', 'Old', 'content');
      // Simulate delay
      const id2 = useFeedbackStore.getState().submitFeedback('general', 'New', 'content');
      const recent = useFeedbackStore.getState().getRecentFeedback(10);
      expect(recent[0].id).toBe(id2);
    });

    it('should respect the limit parameter', () => {
      useFeedbackStore.getState().submitFeedback('general', 'A', 'content');
      useFeedbackStore.getState().submitFeedback('general', 'B', 'content');
      useFeedbackStore.getState().submitFeedback('general', 'C', 'content');
      expect(useFeedbackStore.getState().getRecentFeedback(2)).toHaveLength(2);
    });
  });

  describe('getAverageRating', () => {
    it('should calculate average rating correctly', () => {
      useFeedbackStore.getState().submitFeedback('general', 'A', 'content', 4);
      useFeedbackStore.getState().submitFeedback('general', 'B', 'content', 2);
      expect(useFeedbackStore.getState().getAverageRating()).toBe(3);
    });

    it('should ignore items without rating', () => {
      useFeedbackStore.getState().submitFeedback('general', 'A', 'content', 5);
      useFeedbackStore.getState().submitFeedback('general', 'B', 'content');
      expect(useFeedbackStore.getState().getAverageRating()).toBe(5);
    });
  });
});
