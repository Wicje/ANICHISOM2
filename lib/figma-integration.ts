/**
 * Figma Context Integration
 *
 * Pulls design data from Figma REST API and stores it in the Context Layer.
 * Users authenticate via personal access token (stored in IDB, never sent to our server).
 *
 * Data pulled:
 * - File structure (pages, frames, components)
 * - Design tokens (colors, typography, effects)
 * - Component library (names, variants, descriptions)
 * - Export thumbnails for visual context
 */

import { writeDomain, readDomain } from '@/lib/context-layer';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FigmaConfig {
  accessToken: string;
  lastSyncedAt?: number;
}

export interface FigmaFile {
  key: string;
  name: string;
  lastModified: string;
  thumbnailUrl?: string;
  pages: FigmaPage[];
}

export interface FigmaPage {
  id: string;
  name: string;
  frames: FigmaFrame[];
}

export interface FigmaFrame {
  id: string;
  name: string;
  type: string;
  width: number;
  height: number;
  children?: FigmaFrame[];
}

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
  hex: string;
  name?: string;
}

export interface FigmaTextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  fills: FigmaColor[];
}

export interface FigmaComponent {
  id: string;
  name: string;
  description: string;
  thumbnailUrl?: string;
  variants?: string[];
}

export interface FigmaDesignTokens {
  colors: FigmaColor[];
  textStyles: FigmaTextStyle[];
  effects: Array<{ type: string; visible: boolean; [key: string]: unknown }>;
  components: FigmaComponent[];
}

export interface FigmaContextState {
  config: FigmaConfig | null;
  files: Record<string, FigmaFile>;
  tokens: FigmaDesignTokens;
  syncing: boolean;
  lastError?: string;
}

// ─── Figma REST API Client ──────────────────────────────────────────────────

const FIGMA_API = 'https://api.figma.com/v1';

async function figmaFetch(path: string, token: string): Promise<any> {
  const res = await fetch(`${FIGMA_API}${path}`, {
    headers: { 'X-Figma-Token': token },
  });
  if (!res.ok) {
    throw new Error(`Figma API ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

// ─── Extract Design Tokens from Figma File ──────────────────────────────────

function extractColors(node: any, colors: Map<string, FigmaColor> = new Map()): FigmaColor[] {
  if (node.fills && Array.isArray(node.fills)) {
    for (const fill of node.fills) {
      if (fill.type === 'SOLID' && fill.color) {
        const { r, g, b, a = 1 } = fill.color;
        const hex = rgbaToHex(r * 255, g * 255, b * 255, a);
        if (!colors.has(hex)) {
          colors.set(hex, {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255),
            a,
            hex,
            name: node.name || undefined,
          });
        }
      }
    }
  }
  if (node.children) {
    for (const child of node.children) {
      extractColors(child, colors);
    }
  }
  return Array.from(colors.values());
}

function extractTextStyles(node: any, styles: FigmaTextStyle[] = []): FigmaTextStyle[] {
  if (node.style && node.type === 'TEXT') {
    const s = node.style;
    styles.push({
      fontFamily: s.fontFamily || 'Unknown',
      fontSize: s.fontSize || 16,
      fontWeight: s.fontWeight || 400,
      lineHeight: s.lineHeightPx || s.fontSize * 1.5,
      letterSpacing: s.letterSpacing || 0,
      fills: (node.fills || [])
        .filter((f: any) => f.type === 'SOLID' && f.color)
        .map((f: any) => ({
          r: Math.round(f.color.r * 255),
          g: Math.round(f.color.g * 255),
          b: Math.round(f.color.b * 255),
          a: f.color.a ?? 1,
          hex: rgbaToHex(f.color.r * 255, f.color.g * 255, f.color.b * 255, f.color.a ?? 1),
        })),
    });
  }
  if (node.children) {
    for (const child of node.children) {
      extractTextStyles(child, styles);
    }
  }
  return styles;
}

function extractComponents(document: any): FigmaComponent[] {
  const components: FigmaComponent[] = [];

  function walk(node: any) {
    if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
      components.push({
        id: node.id,
        name: node.name,
        description: node.description || '',
        variants: node.children?.map((c: any) => c.name) || [],
      });
    }
    if (node.children) {
      for (const child of node.children) walk(child);
    }
  }

  walk(document);
  return components;
}

function extractFrames(node: any): FigmaFrame[] {
  const frames: FigmaFrame[] = [];
  if (node.type === 'FRAME' || node.type === 'SECTION' || node.type === 'COMPONENT') {
    frames.push({
      id: node.id,
      name: node.name,
      type: node.type,
      width: node.absoluteBoundingBox?.width || 0,
      height: node.absoluteBoundingBox?.height || 0,
      children: node.children ? extractFrames(node.children) : undefined,
    });
  } else if (node.children) {
    for (const child of node.children) {
      frames.push(...extractFrames(child));
    }
  }
  return frames;
}

function rgbaToHex(r: number, g: number, b: number, a: number): string {
  const ri = Math.round(Math.min(255, Math.max(0, r)));
  const gi = Math.round(Math.min(255, Math.max(0, g)));
  const bi = Math.round(Math.min(255, Math.max(0, b)));
  if (a < 1) {
    const ai = Math.round(a * 255);
    return `#${ri.toString(16).padStart(2, '0')}${gi.toString(16).padStart(2, '0')}${bi.toString(16).padStart(2, '0')}${ai.toString(16).padStart(2, '0')}`;
  }
  return `#${ri.toString(16).padStart(2, '0')}${gi.toString(16).padStart(2, '0')}${bi.toString(16).padStart(2, '0')}`;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Save Figma access token (stored locally in IDB, never sent to our server).
 */
export async function saveFigmaToken(token: string): Promise<void> {
  await writeDomain('figma', { config: { accessToken: token } });
}

/**
 * Get stored Figma config.
 */
export async function getFigmaConfig(): Promise<FigmaConfig | null> {
  const data = await readDomain('figma') as any;
  return data?.config || null;
}

/**
 * Sync a Figma file — pulls full document tree and extracts design tokens.
 */
export async function syncFigmaFile(fileKey: string): Promise<FigmaFile> {
  const config = await getFigmaConfig();
  if (!config?.accessToken) {
    throw new Error('Figma access token not configured');
  }

  // Fetch file data
  const fileData = await figmaFetch(`/files/${fileKey}?geometry=paths`, config.accessToken);

  // Extract pages
  const pages: FigmaPage[] = (fileData.document?.children || []).map((page: any) => ({
    id: page.id,
    name: page.name,
    frames: extractFrames(page),
  }));

  // Extract design tokens from entire document
  const colors = extractColors(fileData.document);
  const textStyles = extractTextStyles(fileData.document);
  const components = extractComponents(fileData.document);

  const file: FigmaFile = {
    key: fileKey,
    name: fileData.name || 'Untitled',
    lastModified: fileData.lastModified || new Date().toISOString(),
    thumbnailUrl: fileData.thumbnailUrl,
    pages,
  };

  // Save to Context Layer
  const existing = (await readDomain('figma') as any) || {};
  const files = { ...(existing.files || {}), [fileKey]: file };
  const tokens: FigmaDesignTokens = {
    colors,
    textStyles,
    effects: [],
    components,
  };

  await writeDomain('figma', {
    config: existing.config,
    files,
    tokens,
    lastSyncedAt: Date.now(),
  });

  return file;
}

/**
 * Get design tokens for the current project.
 */
export async function getDesignTokens(): Promise<FigmaDesignTokens> {
  const data = await readDomain('figma') as any;
  return data?.tokens || { colors: [], textStyles: [], effects: [], components: [] };
}

/**
 * Get all synced Figma files.
 */
export async function getSyncedFiles(): Promise<Record<string, FigmaFile>> {
  const data = await readDomain('figma') as any;
  return data?.files || {};
}
