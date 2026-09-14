import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreativePackService } from '@/lib/services/creative-pack.service';
import { useBrandStore } from '@/lib/stores/brand.store';
import { useMoodboardStore, MoodboardBoard, MoodboardNode } from '@/lib/stores/moodboard.store';

vi.mock('@/lib/ai-gateway-service', () => ({
  getAIGateway: () => ({
    chat: vi.fn().mockResolvedValue({
      text: JSON.stringify({
        summary: 'Test proposal summary',
        phases: [
          { name: 'Discovery', duration: 'Week 1-2', deliverables: ['Brief'] },
          { name: 'Design', duration: 'Week 3-6', deliverables: ['Mockups'] },
        ],
        approach: 'Strategic approach',
        investment: '$10,000',
        timeline: '6 weeks',
        whyUs: 'Expert team',
      }),
    }),
  }),
}));

function makeBoard(overrides: Partial<MoodboardBoard> & { name: string }): MoodboardBoard {
  return {
    id: `board_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    nodes: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeNode(overrides: Partial<MoodboardNode> & { id: string }): MoodboardNode {
  return {
    type: 'image',
    x: 0,
    y: 0,
    content: 'https://example.com/img.jpg',
    ...overrides,
  };
}

describe('CreativePackService', () => {
  beforeEach(() => {
    useBrandStore.setState({ brands: {}, activeBrandId: null });
    useMoodboardStore.setState({
      boards: [],
      activeBoardId: null,
    });
  });

  describe('getPackData', () => {
    it('should return nulls for empty state', () => {
      const data = CreativePackService.getPackData(null);
      expect(data.brand).toBeNull();
      expect(data.moodboard).toBeNull();
      expect(data.proposal).toBeNull();
      expect(data.campaignId).toBeNull();
    });

    it('should return active brand when no campaignId', () => {
      const brandId = useBrandStore.getState().createBrand('Active Brand');
      useBrandStore.getState().setActiveBrand(brandId);
      const data = CreativePackService.getPackData(null);
      expect(data.brand?.brandName).toBe('Active Brand');
    });

    it('should return first board when no campaignId', () => {
      const board = makeBoard({ name: 'Board 1' });
      useMoodboardStore.setState({ boards: [board] });
      const data = CreativePackService.getPackData(null);
      expect(data.moodboard?.name).toBe('Board 1');
    });

    it('should link brand to campaign', () => {
      const brandId = useBrandStore.getState().createBrand('Campaign Brand');
      useBrandStore.getState().linkCampaign(brandId, 'camp_abc');
      const data = CreativePackService.getPackData('camp_abc');
      expect(data.brand?.brandName).toBe('Campaign Brand');
    });

    it('should link moodboard board to campaign', () => {
      const board = makeBoard({ name: 'Campaign Board', campaignId: 'camp_xyz' });
      useMoodboardStore.setState({ boards: [board] });
      const data = CreativePackService.getPackData('camp_xyz');
      expect(data.moodboard?.name).toBe('Campaign Board');
    });
  });

  describe('generateProposalFromBrand', () => {
    it('should generate proposal with AI', async () => {
      const result = await CreativePackService.generateProposalFromBrand(
        'Acme Corp', 'Brand Redesign', '15000',
      );
      expect(result.clientName).toBe('Acme Corp');
      expect(result.scope).toBe('Brand Redesign');
      expect(result.budget).toBe('15000');
      expect(result.phases).toHaveLength(2);
      expect(result.phases[0]).toContain('Discovery');
      expect(result.generatedAt).toBeGreaterThan(0);
    });

    it('should include brand context when brandId provided', async () => {
      const brandId = useBrandStore.getState().createBrand('Voice Brand');
      useBrandStore.getState().updateVoice(brandId, {
        tone: 'Bold',
        personality: ['confident', 'daring'],
      });
      const result = await CreativePackService.generateProposalFromBrand(
        'Client', 'Project', '5000', brandId,
      );
      expect(result.content).toBeTruthy();
    });
  });

  describe('getClientSummary', () => {
    it('should return summary with defaults', () => {
      const summary = CreativePackService.getClientSummary('Test Campaign');
      expect(summary.campaignName).toBe('Test Campaign');
      expect(summary.brandName).toBeNull();
      expect(summary.moodboardAssetCount).toBe(0);
      expect(summary.proposalExists).toBe(false);
      expect(summary.phaseProgress).toHaveLength(4);
    });

    it('should count approved assets via reactions', () => {
      const nodes: MoodboardNode[] = [
        makeNode({ id: 'n1', reactions: { 'thumbs-up': ['user1'] } }),
        makeNode({ id: 'n2', content: 'https://example.com/2.jpg' }),
      ];
      const board = makeBoard({ name: 'Test Board', nodes });
      useMoodboardStore.setState({ boards: [board] });
      const summary = CreativePackService.getClientSummary('Test');
      expect(summary.moodboardAssetCount).toBe(2);
      expect(summary.approvedAssetCount).toBe(1);
    });

    it('should include brand name when linked', () => {
      const brandId = useBrandStore.getState().createBrand('Summary Brand');
      useBrandStore.getState().setActiveBrand(brandId);
      const summary = CreativePackService.getClientSummary('Test');
      expect(summary.brandName).toBe('Summary Brand');
    });
  });

  describe('exportBrandAndProposal', () => {
    it('should export brand and proposal as JSON blob', () => {
      const brandId = useBrandStore.getState().createBrand('Export Brand');
      const proposal = {
        clientName: 'Client',
        scope: 'Work',
        budget: '5000',
        generatedAt: Date.now(),
        content: 'Proposal text',
        phases: ['Phase 1'],
      };
      const blob = CreativePackService.exportBrandAndProposal(brandId, proposal);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
    });
  });

  describe('brand-campaign linking', () => {
    it('should link and unlink brand to campaign via service', () => {
      const brandId = useBrandStore.getState().createBrand('Linkable');
      CreativePackService.linkBrandToCampaign(brandId, 'camp_link');
      expect(useBrandStore.getState().brands[brandId]!.linkedCampaignIds).toContain('camp_link');
      CreativePackService.unlinkBrandFromCampaign(brandId, 'camp_link');
      expect(useBrandStore.getState().brands[brandId]!.linkedCampaignIds).not.toContain('camp_link');
    });

    it('should get brands for campaign', () => {
      const brandId = useBrandStore.getState().createBrand('Camp Brand');
      CreativePackService.linkBrandToCampaign(brandId, 'camp_get');
      expect(CreativePackService.getBrandsForCampaign('camp_get')).toHaveLength(1);
    });

    it('should get boards for campaign', () => {
      const board = makeBoard({ name: 'Camp Board', campaignId: 'camp_b' });
      useMoodboardStore.setState({ boards: [board] });
      expect(CreativePackService.getBoardsForCampaign('camp_b')).toHaveLength(1);
    });
  });

  describe('countApprovedAssets', () => {
    it('should return 0 for unknown board', () => {
      expect(CreativePackService.countApprovedAssets('nonexistent')).toBe(0);
    });

    it('should count nodes with reactions', () => {
      const nodes: MoodboardNode[] = [
        makeNode({ id: 'n1', reactions: { 'thumbs-up': ['user1'] } }),
        makeNode({ id: 'n2', content: 'https://example.com/2.jpg' }),
      ];
      const board = makeBoard({ name: 'Count Board', nodes });
      useMoodboardStore.setState({ boards: [board] });
      expect(CreativePackService.countApprovedAssets(board.id)).toBe(1);
    });
  });
});
