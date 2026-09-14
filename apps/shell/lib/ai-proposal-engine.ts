/**
 * ContinuaOS: AI Proposal Engine
 * 
 * Generate design recommendations and proposals using AI
 * Phase 3B: AI Proposals & Adaptive UI
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export interface DesignProposal {
  id: string;
  type: 'color-palette' | 'typography' | 'layout' | 'animation' | 'accessibility';
  title: string;
  description: string;
  details: Record<string, any>;
  confidence: number;
  tags: string[];
  generatedAt: Date;
}

export interface ProjectBriefAnalysis {
  themes: string[];
  targetAudience: string;
  keyColors: string[];
  suggestedTypography: string[];
  recommendations: DesignProposal[];
}

/**
 * AIProposalEngine generates design recommendations using Claude
 */
export class AIProposalEngine {
  private model = openai('gpt-4-turbo');

  /**
   * Analyze project brief and generate design proposals
   */
  async analyzeProjectBrief(brief: {
    projectName: string;
    description: string;
    clientName: string;
    targetAudience?: string;
    existingAssets?: string[];
    constraints?: string[];
  }): Promise<ProjectBriefAnalysis> {
    try {
      const prompt = `
You are a world-class design strategist and creative director. Analyze this project brief and provide detailed design recommendations.

Project: ${brief.projectName}
Description: ${brief.description}
Client: ${brief.clientName}
Target Audience: ${brief.targetAudience || 'Not specified'}
Existing Assets: ${brief.existingAssets?.join(', ') || 'None'}
Constraints: ${brief.constraints?.join(', ') || 'None'}

Please analyze this brief and provide:
1. Key design themes (3-5 themes)
2. Target audience profile
3. Recommended color palette (3-5 colors with hex codes)
4. Typography recommendations (2-3 font pairings)
5. Design accessibility considerations
6. Animation and microinteraction ideas
7. Overall creative direction

Format your response as a JSON object with these fields:
{
  "themes": ["theme1", "theme2", ...],
  "targetAudience": "description",
  "keyColors": ["#XXXXXX", ...],
  "suggestedTypography": ["font pairing", ...],
  "recommendations": [
    {
      "type": "color-palette|typography|layout|animation|accessibility",
      "title": "title",
      "description": "description",
      "details": {...},
      "confidence": 0.0-1.0,
      "tags": [...]
    }
  ]
}
`;

      const { text } = await generateText({
        model: this.model,
        prompt,
        temperature: 0.7,
      });

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid response format');

      const analysis = JSON.parse(jsonMatch[0]);

      // Add IDs and timestamps to proposals
      const proposals: DesignProposal[] = (analysis.recommendations || []).map(
        (rec: any) => ({
          ...rec,
          id: crypto.randomUUID(),
          generatedAt: new Date(),
        })
      );

      return {
        themes: analysis.themes,
        targetAudience: analysis.targetAudience,
        keyColors: analysis.keyColors,
        suggestedTypography: analysis.suggestedTypography,
        recommendations: proposals,
      };
    } catch (error) {
      console.error('[v0] Failed to analyze project brief:', error);
      throw error;
    }
  }

  /**
   * Generate color palette variations
   */
  async generateColorPaletteVariations(
    baseColor: string,
    style: 'vibrant' | 'minimal' | 'elegant' | 'bold'
  ): Promise<string[]> {
    try {
      const prompt = `
Generate 4 complementary color palettes based on the color ${baseColor}.
Create palettes in a ${style} style.
Return only the hex codes as a JSON array like: ["#XXXXXX", "#XXXXXX", "#XXXXXX", "#XXXXXX", "#XXXXXX"]
`;

      const { text } = await generateText({
        model: this.model,
        prompt,
        temperature: 0.8,
      });

      const jsonMatch = text.match(/\["#[A-Fa-f0-9]{6}".*\]/);
      if (!jsonMatch) throw new Error('Invalid response format');

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('[v0] Failed to generate color palettes:', error);
      return [baseColor];
    }
  }

  /**
   * Generate typography recommendations
   */
  async generateTypographyRecommendations(
    tone: 'professional' | 'creative' | 'friendly' | 'minimal'
  ): Promise<Array<{ heading: string; body: string }>> {
    try {
      const prompt = `
Suggest 3 excellent font pairings for a ${tone} brand design.
Include both heading and body fonts.
Return as JSON array: [{ "heading": "Font Name", "body": "Font Name" }, ...]
Only include fonts available on Google Fonts.
`;

      const { text } = await generateText({
        model: this.model,
        prompt,
        temperature: 0.7,
      });

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Invalid response format');

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('[v0] Failed to generate typography:', error);
      return [{ heading: 'Inter', body: 'Inter' }];
    }
  }

  /**
   * Generate layout recommendations
   */
  async generateLayoutRecommendations(
    contentType: 'portfolio' | 'ecommerce' | 'saas' | 'blog' | 'marketing'
  ): Promise<Array<{ name: string; description: string; benefits: string[] }>> {
    try {
      const prompt = `
Generate 3 recommended layout patterns for a ${contentType} website.
Include layout name, description, and benefits.
Return as JSON: [{ "name": "...", "description": "...", "benefits": ["...", ...] }, ...]
`;

      const { text } = await generateText({
        model: this.model,
        prompt,
        temperature: 0.7,
      });

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Invalid response format');

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('[v0] Failed to generate layouts:', error);
      return [];
    }
  }

  /**
   * Evaluate design for accessibility issues
   */
  async evaluateAccessibility(designDescription: string): Promise<{
    score: number;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const prompt = `
Evaluate this design for accessibility and WCAG compliance.
Design: ${designDescription}

Return JSON:
{
  "score": 0-100,
  "issues": ["issue1", ...],
  "recommendations": ["recommendation1", ...]
}
`;

      const { text } = await generateText({
        model: this.model,
        prompt,
        temperature: 0.5,
      });

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid response format');

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('[v0] Failed to evaluate accessibility:', error);
      return { score: 0, issues: [], recommendations: [] };
    }
  }

  /**
   * Generate animation/microinteraction ideas
   */
  async generateAnimationIdeas(
    context: string
  ): Promise<Array<{ element: string; animation: string; purpose: string }>> {
    try {
      const prompt = `
Generate 5 subtle, purposeful animation/microinteraction ideas for this design context:
${context}

Return as JSON array:
[
  { "element": "...", "animation": "...", "purpose": "..." },
  ...
]

Keep animations subtle and functional, not flashy.
`;

      const { text } = await generateText({
        model: this.model,
        prompt,
        temperature: 0.7,
      });

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Invalid response format');

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('[v0] Failed to generate animations:', error);
      return [];
    }
  }

  /**
   * Generate content strategy recommendations
   */
  async generateContentStrategy(
    brief: string
  ): Promise<{
    messaging: string[];
    contentPillars: string[];
    toneOfVoice: string;
  }> {
    try {
      const prompt = `
Based on this project brief, develop a content strategy:
${brief}

Return JSON:
{
  "messaging": ["key message 1", ...],
  "contentPillars": ["pillar 1", ...],
  "toneOfVoice": "description of tone"
}
`;

      const { text } = await generateText({
        model: this.model,
        prompt,
        temperature: 0.7,
      });

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid response format');

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('[v0] Failed to generate content strategy:', error);
      return { messaging: [], contentPillars: [], toneOfVoice: '' };
    }
  }
}

/**
 * Global AI proposal engine instance
 */
let globalAIEngine: AIProposalEngine | null = null;

export function getAIProposalEngine(): AIProposalEngine {
  if (!globalAIEngine) {
    globalAIEngine = new AIProposalEngine();
  }
  return globalAIEngine;
}
