/**
 * AI Layout Suggestions Service — provides intelligent layout recommendations
 * for moodboard boards based on node types, connections, and content.
 */
import { getAIGateway } from '@/lib/ai-gateway-service';

// ─── Types ────────────────────────────────────────────────────────────────

export interface MoodboardNode {
  id: string;
  type: 'image' | 'text' | 'color' | 'shape' | 'group';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  reactions?: Record<string, string[]>;
}

export interface LayoutSuggestion {
  id: string;
  name: string;
  description: string;
  confidence: number;
  nodePositions: Array<{
    nodeId: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  reasoning: string;
}

export interface LayoutAnalysis {
  nodeCount: number;
  typeBreakdown: Record<string, number>;
  averagePosition: { x: number; y: number };
  spread: { x: number; y: number };
  hasClusters: boolean;
  suggestedGrid: { cols: number; rows: number };
}

// ─── Analysis ─────────────────────────────────────────────────────────────

export function analyzeLayout(nodes: MoodboardNode[]): LayoutAnalysis {
  if (nodes.length === 0) {
    return {
      nodeCount: 0,
      typeBreakdown: {},
      averagePosition: { x: 0, y: 0 },
      spread: { x: 0, y: 0 },
      hasClusters: false,
      suggestedGrid: { cols: 1, rows: 1 },
    };
  }

  const typeBreakdown: Record<string, number> = {};
  let totalX = 0;
  let totalY = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    typeBreakdown[node.type] = (typeBreakdown[node.type] || 0) + 1;
    totalX += node.x;
    totalY += node.y;
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x + node.width);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y + node.height);
  }

  const avgX = totalX / nodes.length;
  const avgY = totalY / nodes.length;

  // Simple cluster detection: if more than 30% of nodes are within 200px of average
  let clusterCount = 0;
  for (const node of nodes) {
    const dist = Math.sqrt((node.x - avgX) ** 2 + (node.y - avgY) ** 2);
    if (dist < 200) clusterCount++;
  }
  const hasClusters = clusterCount > nodes.length * 0.3;

  // Suggest grid based on node count
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const rows = Math.ceil(nodes.length / cols);

  return {
    nodeCount: nodes.length,
    typeBreakdown,
    averagePosition: { x: avgX, y: avgY },
    spread: { x: maxX - minX, y: maxY - minY },
    hasClusters,
    suggestedGrid: { cols, rows },
  };
}

// ─── Layout Generation ────────────────────────────────────────────────────

function generateGridLayout(
  nodes: MoodboardNode[],
  gridCols: number,
  cellWidth = 300,
  cellHeight = 250,
  padding = 20,
): LayoutSuggestion['nodePositions'] {
  return nodes.map((node, i) => {
    const col = i % gridCols;
    const row = Math.floor(i / gridCols);
    return {
      nodeId: node.id,
      x: padding + col * (cellWidth + padding),
      y: padding + row * (cellHeight + padding),
      width: cellWidth,
      height: cellHeight,
    };
  });
}

function generateMasonryLayout(
  nodes: MoodboardNode[],
  columns = 3,
  columnWidth = 280,
  gap = 20,
): LayoutSuggestion['nodePositions'] {
  const columnHeights = new Array(columns).fill(0);

  return nodes.map((node) => {
    const shortestCol = columnHeights.indexOf(Math.min(...columnHeights));
    const x = gap + shortestCol * (columnWidth + gap);
    const y = columnHeights[shortestCol];
    const height = node.height || 200;

    columnHeights[shortestCol] += height + gap;

    return {
      nodeId: node.id,
      x,
      y,
      width: columnWidth,
      height,
    };
  });
}

function generateCenterLayout(
  nodes: MoodboardNode[],
  canvasWidth = 1200,
  canvasHeight = 800,
): LayoutSuggestion['nodePositions'] {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const radius = Math.min(canvasWidth, canvasHeight) * 0.35;

  return nodes.map((node, i) => {
    const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    return {
      nodeId: node.id,
      x: centerX + Math.cos(angle) * radius - (node.width || 200) / 2,
      y: centerY + Math.sin(angle) * radius - (node.height || 200) / 2,
      width: node.width || 200,
      height: node.height || 200,
    };
  });
}

// ─── AI Suggestions ───────────────────────────────────────────────────────

export async function getAISuggestions(
  nodes: MoodboardNode[],
  boardName?: string,
): Promise<LayoutSuggestion[]> {
  const analysis = analyzeLayout(nodes);
  const suggestions: LayoutSuggestion[] = [];

  // Always include structural suggestions
  suggestions.push({
    id: 'grid',
    name: 'Clean Grid',
    description: 'Organized grid layout with equal spacing',
    confidence: 0.8,
    nodePositions: generateGridLayout(nodes, analysis.suggestedGrid.cols),
    reasoning: `Based on ${analysis.nodeCount} nodes, a ${analysis.suggestedGrid.cols}×${analysis.suggestedGrid.rows} grid provides clean organization.`,
  });

  suggestions.push({
    id: 'masonry',
    name: 'Masonry Flow',
    description: 'Pinterest-style masonry layout',
    confidence: 0.75,
    nodePositions: generateMasonryLayout(nodes),
    reasoning: 'Masonry layout works well for mixed-size content and visual variety.',
  });

  suggestions.push({
    id: 'radial',
    name: 'Radial Focus',
    description: 'Circular arrangement centered on canvas',
    confidence: 0.65,
    nodePositions: generateCenterLayout(nodes),
    reasoning: 'Radial layout emphasizes the center and creates a sense of unity.',
  });

  // If AI gateway is available, get AI-powered suggestions
  try {
    const gateway = getAIGateway();
    
    const prompt = `You are a visual design assistant. Given a moodboard with ${analysis.nodeCount} nodes of types: ${JSON.stringify(analysis.typeBreakdown)}, suggest the best layout arrangement.

Current layout spread: ${Math.round(analysis.spread.x)}x${Math.round(analysis.spread.y)}px
Has clusters: ${analysis.hasClusters}
Board name: ${boardName || 'Untitled'}

Suggest 2 specific layout improvements. For each, provide:
1. A descriptive name
2. What to change
3. Why it would improve the visual composition

Keep suggestions practical and specific to this content.`;

    const response = await gateway.chat({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 500,
    });

    if (response.text) {
      suggestions.push({
        id: 'ai-suggestion',
        name: 'AI Recommended',
        description: response.text.split('\n')[0] || 'AI-optimized layout',
        confidence: 0.9,
        nodePositions: generateMasonryLayout(nodes, Math.min(4, analysis.suggestedGrid.cols + 1)),
        reasoning: response.text,
      });
    }
  } catch {
    // AI gateway not available — return structural suggestions only
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

// ─── Apply Layout ─────────────────────────────────────────────────────────

export function applyLayout(
  nodes: MoodboardNode[],
  suggestion: LayoutSuggestion,
): MoodboardNode[] {
  const positionMap = new Map(
    suggestion.nodePositions.map((p) => [p.nodeId, p]),
  );

  return nodes.map((node) => {
    const pos = positionMap.get(node.id);
    if (!pos) return node;
    return {
      ...node,
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
    };
  });
}
