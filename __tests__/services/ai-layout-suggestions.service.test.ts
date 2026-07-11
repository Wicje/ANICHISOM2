import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  analyzeLayout,
  applyLayout,
  getAISuggestions,
  type MoodboardNode,
} from '@/lib/services/ai-layout-suggestions.service';

vi.mock('@/lib/ai-gateway-service', () => ({
  getAIGateway: () => ({
    chat: vi.fn().mockResolvedValue({
      text: 'AI suggestion: increase spacing between elements for better visual hierarchy.',
    }),
  }),
}));

function makeNode(overrides: Partial<MoodboardNode> = {}): MoodboardNode {
  return {
    id: crypto.randomUUID(),
    type: 'image',
    content: 'test',
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    ...overrides,
  };
}

describe('ai-layout-suggestions.service', () => {
  describe('analyzeLayout', () => {
    it('returns empty defaults for no nodes', () => {
      const analysis = analyzeLayout([]);
      expect(analysis.nodeCount).toBe(0);
      expect(analysis.typeBreakdown).toEqual({});
      expect(analysis.suggestedGrid).toEqual({ cols: 1, rows: 1 });
    });

    it('counts node types correctly', () => {
      const nodes = [
        makeNode({ type: 'image' }),
        makeNode({ type: 'image' }),
        makeNode({ type: 'text' }),
        makeNode({ type: 'color' }),
      ];
      const analysis = analyzeLayout(nodes);
      expect(analysis.nodeCount).toBe(4);
      expect(analysis.typeBreakdown).toEqual({ image: 2, text: 1, color: 1 });
    });

    it('calculates spread and average position', () => {
      const nodes = [
        makeNode({ x: 0, y: 0, width: 100, height: 100 }),
        makeNode({ x: 500, y: 400, width: 200, height: 200 }),
      ];
      const analysis = analyzeLayout(nodes);
      expect(analysis.averagePosition).toEqual({ x: 250, y: 200 });
      expect(analysis.spread.x).toBeGreaterThan(0);
      expect(analysis.spread.y).toBeGreaterThan(0);
    });

    it('detects clusters when nodes are close together', () => {
      const nodes = Array.from({ length: 8 }, (_, i) =>
        makeNode({ x: 100 + i * 30, y: 100 + i * 30 }),
      );
      const analysis = analyzeLayout(nodes);
      expect(analysis.hasClusters).toBe(true);
    });

    it('suggests appropriate grid dimensions', () => {
      const nodes = Array.from({ length: 6 }, () => makeNode());
      const analysis = analyzeLayout(nodes);
      expect(analysis.suggestedGrid.cols).toBe(3);
      expect(analysis.suggestedGrid.rows).toBe(2);
    });
  });

  describe('applyLayout', () => {
    it('moves nodes to suggested positions', () => {
      const nodes = [makeNode({ id: 'a' }), makeNode({ id: 'b' })];
      const suggestion = {
        id: 'test',
        name: 'Test',
        description: '',
        confidence: 1,
        reasoning: '',
        nodePositions: [
          { nodeId: 'a', x: 10, y: 20, width: 300, height: 250 },
          { nodeId: 'b', x: 400, y: 20, width: 300, height: 250 },
        ],
      };
      const result = applyLayout(nodes, suggestion);
      expect(result[0].x).toBe(10);
      expect(result[0].y).toBe(20);
      expect(result[1].x).toBe(400);
    });

    it('preserves nodes not in layout suggestion', () => {
      const nodes = [makeNode({ id: 'a', x: 99, y: 99 })];
      const suggestion = {
        id: 'test',
        name: 'Test',
        description: '',
        confidence: 1,
        reasoning: '',
        nodePositions: [],
      };
      const result = applyLayout(nodes, suggestion);
      expect(result[0].x).toBe(99);
    });
  });

  describe('getAISuggestions', () => {
    it('returns at least 3 suggestions (structural + AI)', async () => {
      const nodes = Array.from({ length: 4 }, () => makeNode());
      const suggestions = await getAISuggestions(nodes, 'Test Board');
      expect(suggestions.length).toBeGreaterThanOrEqual(3);
    });

    it('includes grid, masonry, and radial suggestions', async () => {
      const nodes = Array.from({ length: 4 }, () => makeNode());
      const suggestions = await getAISuggestions(nodes);
      const ids = suggestions.map((s) => s.id);
      expect(ids).toContain('grid');
      expect(ids).toContain('masonry');
      expect(ids).toContain('radial');
    });

    it('returns suggestions sorted by confidence descending', async () => {
      const nodes = Array.from({ length: 4 }, () => makeNode());
      const suggestions = await getAISuggestions(nodes);
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i].confidence).toBeLessThanOrEqual(
          suggestions[i - 1].confidence,
        );
      }
    });

    it('each suggestion has valid nodePositions for all nodes', async () => {
      const nodes = Array.from({ length: 3 }, (_, i) => makeNode({ id: `n${i}` }));
      const suggestions = await getAISuggestions(nodes);
      for (const s of suggestions) {
        expect(s.nodePositions.length).toBe(3);
        expect(s.reasoning).toBeTruthy();
      }
    });
  });
});
