/**
 * Unified Slash Skill Registry & Dispatcher
 *
 * Implements Athena-Public slash-skills and command substrate.
 * Exposes deterministic workflows accessible from Terminal, Spotlight, and AI agents:
 * - /tidy: Smart file organizer
 * - /mount-git: GitHub VFS mount
 * - /convert-md: Doc-to-Markdown converter
 * - /summarize: File summarizer
 * - /memory: Episodic memory inspector
 * - /help: Slash skills manual
 */

import { FS } from '@/lib/fs';
import { DocParser } from '@/lib/doc-parser';
import { episodicMemory } from '@/lib/ai-memory/episodic-memory';
import { getAiProvider } from '@/lib/ai-providers/ai-provider-factory';

export interface SlashSkill {
  name: string;
  description: string;
  usage: string;
  execute: (args: string[], context?: Record<string, any>) => Promise<string>;
}

class SlashSkillRegistry {
  private skills = new Map<string, SlashSkill>();

  constructor() {
    this.registerBuiltIns();
  }

  register(skill: SlashSkill): void {
    this.skills.set(skill.name.toLowerCase(), skill);
  }

  get(name: string): SlashSkill | undefined {
    const cleanName = name.replace(/^\//, '').toLowerCase();
    return this.skills.get(cleanName);
  }

  list(): SlashSkill[] {
    return Array.from(this.skills.values());
  }

  async execute(input: string, context?: Record<string, any>): Promise<string> {
    const trimmed = input.trim();
    if (!trimmed.startsWith('/')) {
      throw new Error(`Invalid slash command: "${input}". Commands must start with "/".`);
    }

    const parts = trimmed.slice(1).split(/\s+/);
    const commandName = parts[0]?.toLowerCase() || 'help';
    const args = parts.slice(1);

    const skill = this.skills.get(commandName);
    if (!skill) {
      return `Unknown slash command "/${commandName}". Type "/help" to view available skills.`;
    }

    return await skill.execute(args, context);
  }

  private registerBuiltIns(): void {
    // /help
    this.register({
      name: 'help',
      description: 'List all available Continua slash skills',
      usage: '/help',
      execute: async () => {
        const list = this.list();
        return [
          '=== Continua Sovereign Slash Skills (/skills) ===',
          '',
          ...list.map((s) => `  /${s.name.padEnd(12)} - ${s.description}\n    Usage: ${s.usage}`),
          '',
          'Type any slash command in Terminal or Spotlight (e.g., "/tidy", "/memory").',
        ].join('\n');
      },
    });

    // /tidy
    this.register({
      name: 'tidy',
      description: 'Trigger Smart AI File Organizer on target directory',
      usage: '/tidy [folderPath]',
      execute: async (args) => {
        const folder = args[0] || 'Downloads';
        try {
          const files = await FS.readDir(folder);
          if (!files || files.length === 0) {
            return `Directory "${folder}" is empty or has no files to organize.`;
          }

          const fileList = files.filter((f) => !f.isFolder).map((f) => ({ name: f.name, path: `${folder}/${f.name}` }));
          if (fileList.length === 0) {
            return `No files found in "${folder}" to organize.`;
          }

          const provider = getAiProvider();
          const response = await provider.chat({
            messages: [
              {
                role: 'user',
                content: `You are a smart file organizer. Propose clean descriptive destination paths for these files:\n${JSON.stringify(fileList)}`,
              },
            ],
          });

          return `[Smart Tidy Analysis for "${folder}"]\n${response.text}`;
        } catch (e: any) {
          return `Smart Tidy failed: ${e.message || 'Unknown error'}`;
        }
      },
    });

    // /mount-git
    this.register({
      name: 'mount-git',
      description: 'Mount a public/private GitHub repository into Continua Virtual Drive',
      usage: '/mount-git <owner/repo> [branch]',
      execute: async (args) => {
        if (!args[0]) {
          return 'Usage: /mount-git <owner/repo> [branch]\nExample: /mount-git torvalds/linux master';
        }
        const [owner, repo] = args[0].replace(/^https?:\/\/github\.com\//, '').split('/');
        if (!owner || !repo) {
          return 'Error: Invalid repository format. Use "owner/repo" or GitHub URL.';
        }
        const branch = args[1] || 'main';
        try {
          const mount = await FS.mountGitHub(owner, repo, branch);
          return `Successfully mounted GitHub repository "${mount.owner}/${mount.repo}" on branch "${mount.branch}". Access it at "github/${mount.owner}/${mount.repo}".`;
        } catch (err: any) {
          return `Failed to mount repository: ${err.message || 'API error'}`;
        }
      },
    });

    // /convert-md
    this.register({
      name: 'convert-md',
      description: 'Convert any file (CSV, JSON, HTML, text) into clean AI-ready Markdown',
      usage: '/convert-md <filePath>',
      execute: async (args) => {
        if (!args[0]) return 'Usage: /convert-md <filePath>';
        try {
          const dest = await DocParser.convertAndSave(args[0]);
          return `Successfully converted "${args[0]}" to AI Markdown at "${dest}".`;
        } catch (e: any) {
          return `Conversion failed: ${e.message}`;
        }
      },
    });

    // /summarize
    this.register({
      name: 'summarize',
      description: 'Generate concise executive summary of a file using MinMax token pruning',
      usage: '/summarize <filePath>',
      execute: async (args) => {
        if (!args[0]) return 'Usage: /summarize <filePath>';
        try {
          const file = await FS.read(args[0]);
          if (!file || typeof file.content !== 'string') {
            return `File "${args[0]}" not found or unreadable.`;
          }
          const provider = getAiProvider();
          const cleanDoc = DocParser.toMarkdown(file.content, file.name);
          const pruned = episodicMemory.optimizeTokens(cleanDoc, 1000);

          const response = await provider.chat({
            messages: [
              {
                role: 'user',
                content: `Provide a clear, concise 3-bullet executive summary and key findings for this document:\n\n${pruned}`,
              },
            ],
          });

          return `[Executive Summary for "${file.name}"]\n${response.text}`;
        } catch (e: any) {
          return `Summarization failed: ${e.message}`;
        }
      },
    });

    // /memory
    this.register({
      name: 'memory',
      description: 'Inspect Continuous Episodic Memory stats and active turns',
      usage: '/memory',
      execute: async () => {
        await episodicMemory.init();
        const episodes = episodicMemory.getAllEpisodes();
        const active = episodicMemory.getActiveEpisode();
        const totalTurns = episodes.reduce((acc, e) => acc + e.turns.length, 0);

        return [
          '=== Continua Episodic Memory Subsystem (MemMachine Ground-Truth) ===',
          `- Total Episodes: ${episodes.length}`,
          `- Total Stored Dialogue Turns: ${totalTurns}`,
          `- Active Session: "${active?.title || 'None'}" (${active?.turns.length || 0} turns)`,
          '',
          'Recent Turns:',
          ...(active?.turns.slice(-4).map((t) => `  [${new Date(t.timestamp).toLocaleTimeString()}] ${t.role.toUpperCase()}: ${t.content.slice(0, 60)}...`) || ['  (No turns recorded)']),
        ].join('\n');
      },
    });
  }
}

export const slashSkills = new SlashSkillRegistry();
