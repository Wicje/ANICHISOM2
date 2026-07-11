/**
 * Creative Pack Service — cross-app orchestration for the ANICHISOM Creative Pack.
 *
 * Aggregates brand guidelines, moodboard boards, and proposals into
 * unified data structures for the Client Portal and Pack UI.
 */
import { useBrandStore, BrandGuidelines } from '@/lib/stores/brand.store';
import { useMoodboardStore, MoodboardBoard, MoodboardNode } from '@/lib/stores/moodboard.store';
import { getAIGateway } from '@/lib/ai-gateway-service';

// ─── Types ──────────────────────────────────────────────────────────────

export interface PackData {
  brand: BrandGuidelines | null;
  moodboard: MoodboardBoard | null;
  proposal: ProposalSummary | null;
  campaignId: string | null;
}

export interface ProposalSummary {
  clientName: string;
  scope: string;
  budget: string;
  generatedAt: number;
  content: string;
  phases: string[];
}

export interface ClientSummary {
  campaignName: string;
  brandName: string | null;
  moodboardAssetCount: number;
  approvedAssetCount: number;
  proposalExists: boolean;
  phaseProgress: { name: string; progress: number }[];
}

// ─── Creative Pack Service ──────────────────────────────────────────────

export const CreativePackService = {
  /**
   * Aggregate all Creative Pack data for a campaign.
   */
  getPackData(campaignId: string | null): PackData {
    const brands = useBrandStore.getState();
    const moodboards = useMoodboardStore.getState();

    const linkedBrand = campaignId
      ? brands.getBrandsForCampaign(campaignId)[0] || null
      : brands.getActiveBrand();

    const linkedBoard = campaignId
      ? Object.values(moodboards.boards).find((b) => b.campaignId === campaignId) || null
      : Object.values(moodboards.boards)[0] || null;

    return {
      brand: linkedBrand,
      moodboard: linkedBoard,
      proposal: null, // Proposals are stored in component state, not a store
      campaignId,
    };
  },

  /**
   * Generate a proposal that incorporates brand voice and guidelines.
   */
  async generateProposalFromBrand(
    clientName: string,
    scope: string,
    budget: string,
    brandId?: string,
  ): Promise<ProposalSummary> {
    let brandContext = '';
    if (brandId) {
      const brand = useBrandStore.getState().brands[brandId];
      if (brand) {
        brandContext = `
Brand Guidelines for this proposal:
- Brand Name: ${brand.brandName}
- Tone: ${brand.voice.tone}
- Personality: ${brand.voice.personality.join(', ')}
- Colors: ${brand.colors.map((c) => `${c.name} (${c.hex})`).join(', ')}
- Typography: Heading: ${brand.typography.headingFont}, Body: ${brand.typography.bodyFont}
- Do's: ${brand.voice.dos.join('; ')}
- Don'ts: ${brand.voice.donts.join('; ')}
`;
      }
    }

    const gateway = getAIGateway();
    const systemPrompt = `You are a senior creative strategist at ANICHISOM. Generate a professional project proposal.
${brandContext}
Return your response as valid JSON:
{
  "summary": "Executive summary",
  "phases": [{ "name": "Phase", "duration": "Week X-Y", "deliverables": ["item"] }],
  "approach": "Strategic approach paragraph",
  "investment": "Budget breakdown",
  "timeline": "Timeline summary",
  "whyUs": "Why ANICHISOM"
}
Be specific, professional, and persuasive.`;

    const response = await gateway.chat({
      messages: [{ role: 'user', content: `Create a proposal for:\nClient: ${clientName}\nProject: ${scope}\nBudget: $${budget}` }],
      systemPrompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    let phases: string[] = [];
    try {
      const parsed = JSON.parse(response.text);
      phases = (parsed.phases || []).map((p: any) => `${p.name} (${p.duration || ''})`);
    } catch {
      // AI response wasn't valid JSON — use raw text
    }

    return {
      clientName,
      scope,
      budget,
      generatedAt: Date.now(),
      content: response.text,
      phases,
    };
  },

  /**
   * Generate a client-ready summary of all campaign assets.
   */
  getClientSummary(campaignName: string, campaignId?: string): ClientSummary {
    const brands = useBrandStore.getState();
    const moodboards = useMoodboardStore.getState();

    const linkedBrand = campaignId ? brands.getBrandsForCampaign(campaignId)[0] : brands.getActiveBrand();
    const linkedBoard = campaignId
      ? Object.values(moodboards.boards).find((b) => b.campaignId === campaignId)
      : Object.values(moodboards.boards)[0];

    const approvedNodes = linkedBoard
      ? linkedBoard.nodes.filter((n) => n.reactions && Object.values(n.reactions).some((r) => r.length > 0))
      : [];

    return {
      campaignName,
      brandName: linkedBrand?.brandName || null,
      moodboardAssetCount: linkedBoard?.nodes.length || 0,
      approvedAssetCount: approvedNodes.length,
      proposalExists: false, // Would need a proposal store to check
      phaseProgress: [
        { name: 'Discovery & Strategy', progress: 100 },
        { name: 'Visual Identity', progress: 65 },
        { name: 'Digital Experience', progress: 0 },
        { name: 'Handoff & Review', progress: 0 },
      ],
    };
  },

  /**
   * Export brand guidelines and proposal as a single JSON document.
   */
  exportBrandAndProposal(brandId: string, proposal: ProposalSummary): Blob {
    const brand = useBrandStore.getState().brands[brandId];
    const data = {
      exportedAt: new Date().toISOString(),
      brand: brand || null,
      proposal,
    };
    return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  },

  /**
   * Link a brand to a campaign.
   */
  linkBrandToCampaign(brandId: string, campaignId: string): void {
    useBrandStore.getState().linkCampaign(brandId, campaignId);
  },

  /**
   * Unlink a brand from a campaign.
   */
  unlinkBrandFromCampaign(brandId: string, campaignId: string): void {
    useBrandStore.getState().unlinkCampaign(brandId, campaignId);
  },

  /**
   * Get all brands linked to a campaign.
   */
  getBrandsForCampaign(campaignId: string): BrandGuidelines[] {
    return useBrandStore.getState().getBrandsForCampaign(campaignId);
  },

  /**
   * Get all moodboard boards linked to a campaign.
   */
  getBoardsForCampaign(campaignId: string): MoodboardBoard[] {
    return useMoodboardStore.getState().getBoardsForCampaign(campaignId);
  },

  /**
   * Count approved moodboard assets for a board.
   */
  countApprovedAssets(boardId: string): number {
    const board = useMoodboardStore.getState().boards.find((b) => b.id === boardId);
    if (!board) return 0;
    return board.nodes.filter(
      (n) => n.reactions && Object.values(n.reactions).some((r) => r.length > 0),
    ).length;
  },
};
