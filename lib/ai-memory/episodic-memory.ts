/**
 * Continuous Episodic Memory Engine
 *
 * Implements MemMachine ground-truth conversational episodic preservation
 * and contextualized nucleus retrieval, with Athena-Public MinMax token optimization.
 *
 * Ground-Truth Persistence:
 * - Stored in browser OPFS at /System/Memory/episodes.json (with IndexedDB fallback)
 * - Retains full conversational turns across sessions without lossy LLM compression
 * - Expands nucleus token matches with surrounding dialogue turns (±2 turns)
 */

import { FS } from '@/lib/fs';
import { get as idbGet, set as idbSet } from 'idb-keyval';

export interface MemoryTurn {
  id: string;
  timestamp: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  appContext?: string;
  referencedFiles?: string[];
  tags?: string[];
}

export interface MemoryEpisode {
  id: string;
  title: string;
  startedAt: number;
  lastActiveAt: number;
  turns: MemoryTurn[];
  metadata?: Record<string, any>;
}

const STORAGE_PATH = 'System/Memory/episodes.json';
const IDB_FALLBACK_KEY = 'continua_episodic_memory_v1';
const MAX_EPISODES = 50;
const MAX_TURNS_PER_EPISODE = 100;

// Common English stopwords for tokenization
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for',
  'with', 'by', 'about', 'as', 'into', 'like', 'through', 'after', 'over', 'between', 'out',
  'of', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they',
  'what', 'which', 'who', 'how', 'when', 'where', 'why', 'can', 'could', 'should', 'would', 'will'
]);

class EpisodicMemoryManager {
  private episodes: MemoryEpisode[] = [];
  private activeEpisodeId: string | null = null;
  private initialized = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // 1. Try reading from OPFS / VFS
      const file = await FS.read(STORAGE_PATH);
      if (file && typeof file.content === 'string') {
        this.episodes = JSON.parse(file.content);
      } else {
        // 2. Try reading from IDB fallback
        const idbData = await idbGet<MemoryEpisode[]>(IDB_FALLBACK_KEY);
        if (idbData && Array.isArray(idbData)) {
          this.episodes = idbData;
        }
      }
    } catch (e) {
      console.warn('[EpisodicMemory] Could not load stored episodes:', e);
      this.episodes = [];
    }

    if (this.episodes.length === 0) {
      this.createNewEpisode('Continua System Session');
    } else {
      this.activeEpisodeId = this.episodes[0]!.id;
    }

    this.initialized = true;
  }

  createNewEpisode(title: string, metadata?: Record<string, any>): MemoryEpisode {
    const episode: MemoryEpisode = {
      id: typeof crypto !== 'undefined' ? crypto.randomUUID() : `ep-${Date.now()}`,
      title: title || `Session ${new Date().toLocaleDateString()}`,
      startedAt: Date.now(),
      lastActiveAt: Date.now(),
      turns: [],
      metadata,
    };

    this.episodes = [episode, ...this.episodes].slice(0, MAX_EPISODES);
    this.activeEpisodeId = episode.id;
    this.scheduleSave();
    return episode;
  }

  getActiveEpisode(): MemoryEpisode | undefined {
    return this.episodes.find((e) => e.id === this.activeEpisodeId) || this.episodes[0];
  }

  getAllEpisodes(): MemoryEpisode[] {
    return this.episodes;
  }

  async recordTurn(
    role: 'user' | 'assistant' | 'system',
    content: string,
    options?: { appContext?: string; referencedFiles?: string[]; tags?: string[] }
  ): Promise<MemoryTurn> {
    await this.init();

    let episode = this.getActiveEpisode();
    if (!episode) {
      episode = this.createNewEpisode('Continua Workspace Session');
    }

    const turn: MemoryTurn = {
      id: typeof crypto !== 'undefined' ? crypto.randomUUID() : `turn-${Date.now()}`,
      timestamp: Date.now(),
      role,
      content,
      appContext: options?.appContext,
      referencedFiles: options?.referencedFiles,
      tags: options?.tags,
    };

    episode.turns.push(turn);
    if (episode.turns.length > MAX_TURNS_PER_EPISODE) {
      episode.turns = episode.turns.slice(episode.turns.length - MAX_TURNS_PER_EPISODE);
    }
    episode.lastActiveAt = Date.now();

    this.scheduleSave();
    return turn;
  }

  /**
   * MemMachine Contextualized Nucleus Retrieval
   * Finds matching nucleus keywords and expands to surrounding ±2 turns
   */
  async retrieveNucleusContext(
    query: string,
    options?: { maxTurns?: number; maxTokens?: number; activeAppContext?: string }
  ): Promise<string> {
    await this.init();

    if (!query || !query.trim()) return '';

    const maxTurns = options?.maxTurns || 6;
    const queryTokens = query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t));

    if (queryTokens.length === 0) return '';

    // Score all turns across all episodes
    interface ScoredTurn {
      episodeTitle: string;
      episodeIndex: number;
      turnIndex: number;
      turn: MemoryTurn;
      score: number;
    }

    const scoredTurns: ScoredTurn[] = [];

    this.episodes.forEach((episode, epIdx) => {
      episode.turns.forEach((turn, turnIdx) => {
        let score = 0;
        const text = turn.content.toLowerCase();

        for (const token of queryTokens) {
          if (text.includes(token)) {
            score += 2;
          }
        }

        if (options?.activeAppContext && turn.appContext === options.activeAppContext) {
          score += 1;
        }

        if (score > 0) {
          scoredTurns.push({
            episodeTitle: episode.title,
            episodeIndex: epIdx,
            turnIndex: turnIdx,
            turn,
            score,
          });
        }
      });
    });

    if (scoredTurns.length === 0) return '';

    // Sort by relevance score descending
    scoredTurns.sort((a, b) => b.score - a.score);

    // Pick top nucleus and expand with surrounding turns (±2 turns)
    const topNucleus = scoredTurns[0]!;
    const targetEpisode = this.episodes[topNucleus.episodeIndex];
    if (!targetEpisode) return '';

    const startIdx = Math.max(0, topNucleus.turnIndex - 2);
    const endIdx = Math.min(targetEpisode.turns.length, topNucleus.turnIndex + 3);
    const expandedTurns = targetEpisode.turns.slice(startIdx, endIdx);

    const formattedLines = expandedTurns.map((t) => {
      const time = new Date(t.timestamp).toLocaleTimeString();
      const prefix = t.role === 'user' ? 'User' : t.role === 'assistant' ? 'Continua Assistant' : 'System';
      const app = t.appContext ? ` (${t.appContext})` : '';
      return `[${time}] ${prefix}${app}: ${t.content.trim()}`;
    });

    return (
      `=== Continua Episodic Memory Context (Ground-Truth Nucleus from "${targetEpisode.title}") ===\n` +
      formattedLines.slice(0, maxTurns).join('\n') +
      `\n=== End Memory Context ===`
    );
  }

  /**
   * Athena-Public MinMax Token Optimizer
   * Prunes whitespace, redundant lines, and boilerplate while preserving AST signatures
   */
  optimizeTokens(text: string, maxBudget = 2000): string {
    if (!text || text.length <= maxBudget * 4) {
      return text;
    }

    // Strip excess blank lines & comments
    const lines = text.split('\n');
    const pruned: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (pruned[pruned.length - 1] !== '') pruned.push('');
      } else if (trimmed.startsWith('//') && trimmed.length > 50) {
        // Skip excessively long comment lines
        continue;
      } else {
        pruned.push(line);
      }
    }

    const result = pruned.join('\n');
    if (result.length > maxBudget * 4) {
      return result.slice(0, maxBudget * 4) + '\n... [Context truncated for token efficiency]';
    }
    return result;
  }

  private scheduleSave(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(async () => {
      try {
        const payload = JSON.stringify(this.episodes, null, 2);
        await FS.mkdir('System/Memory').catch(() => {});
        await FS.write(STORAGE_PATH, payload, 'application/json');
        await idbSet(IDB_FALLBACK_KEY, this.episodes);
      } catch (err) {
        console.warn('[EpisodicMemory] Failed to persist memory:', err);
      }
    }, 1000);
  }
}

export const episodicMemory = new EpisodicMemoryManager();
