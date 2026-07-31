import { VirtualFS, VFSEntry } from './virtual-fs';
import { wasmTerminalEngine } from '@/lib/wasm-terminal';

export type CommandResult = {
  output?: string;
  error?: string;
  clear?: boolean;
};

export type CommandContext = {
  vfs: VirtualFS;
  openWindow: (appId: string, title?: string, data?: any) => void;
  performanceMode: string;
  setPerformanceMode: (mode: 'light' | 'heavy') => void;
  currentUser?: { name?: string } | null;
};

const commands: Record<string, (args: string[], flags: Record<string, string | boolean>, ctx: CommandContext) => Promise<CommandResult> | CommandResult> = {
  help: () => ({
    output: [
      'ContinuaOS Terminal v2.0 — Real filesystem, real commands',
      '',
      'FILESYSTEM:',
      '  ls [path]            List directory contents',
      '  cd [path]            Change directory',
      '  pwd                  Print working directory',
      '  cat <file>           Display file contents',
      '  touch <file>         Create empty file',
      '  mkdir <dir>          Create directory',
      '  rm [-r] <path>       Remove file or directory',
      '  mv <src> <dest>      Move/rename file',
      '  cp <src> <dest>      Copy file',
      '  find <query>         Search for files by name',
      '  stat <file>          Show file details',
      '  echo <text>          Print text (supports > file redirect)',
      '',
      'SYSTEM:',
      '  clear                Clear terminal screen',
      '  history              Show command history',
      '  whoami               Show current user',
      '  date                 Show current date/time',
      '  theme [light|heavy]  Switch performance mode',
      '',
      'APPS:',
      '  open <app>           Launch an app (terminal, files, browser, code, ...)',
      '',
      'AI:',
      '  ai <prompt>          Query the AI assistant',
    ].join('\n'),
  }),

  clear: () => ({ clear: true }),

  history: (args, flags, ctx) => {
    return { output: '(use ↑/↓ arrow keys to navigate history)' };
  },

  whoami: (args, flags, ctx) => ({
    output: ctx.currentUser?.name || 'user@continuaos',
  }),

  pwd: (args, flags, ctx) => ({
    output: ctx.vfs.getCwd(),
  }),

  date: () => ({
    output: new Date().toString(),
  }),

  echo: async (args, flags, ctx) => {
    const text = args.join(' ');
    const redirectMatch = text.match(/^(.+?)\s*>\s*(.+)$/);
    if (redirectMatch && redirectMatch[1] && redirectMatch[2]) {
      const content = redirectMatch[1].trim();
      const filePath = redirectMatch[2].trim();
      await ctx.vfs.write(filePath, content + '\n');
      return { output: '' };
    }
    return { output: text };
  },

  cd: async (args, flags, ctx) => {
    const target = args[0] || '~';
    try {
      await ctx.vfs.cd(target);
      return { output: '' };
    } catch {
      return { error: `cd: ${target}: No such directory` };
    }
  },

  ls: async (args, flags, ctx) => {
    const target = args[0] || undefined;
    try {
      const entries = await ctx.vfs.ls(target);
      if (entries.length === 0) return { output: '' };

      const showAll = !!flags.a || !!flags['all'];
      const longFormat = !!flags.l;

      const filtered = showAll ? entries : entries.filter(e => !e.name.startsWith('.'));

      if (filtered.length === 0) return { output: '' };

      if (longFormat) {
        const lines = filtered.map(e => {
          const perms = e.isDir ? 'drwxr-xr-x' : '-rw-r--r--';
          const size = ctx.vfs.formatSize(e.size).padStart(8);
          const name = e.isDir ? `\x1b[34m${e.name}/\x1b[0m` : e.name;
          return `${perms}  ${size}  ${name}`;
        });
        return { output: lines.join('\n') };
      }

      const names = filtered.map(e => {
        if (e.isDir) return `\x1b[34m${e.name}/\x1b[0m`;
        if (e.mimeType?.startsWith('image/')) return `\x1b[32m${e.name}\x1b[0m`;
        if (e.mimeType?.startsWith('video/') || e.mimeType?.startsWith('audio/')) return `\x1b[35m${e.name}\x1b[0m`;
        if (e.mimeType === 'application/pdf') return `\x1b[31m${e.name}\x1b[0m`;
        return e.name;
      });

      return { output: names.join('  ') };
    } catch {
      return { error: `ls: cannot access '${target || ctx.vfs.getCwd()}': No such directory` };
    }
  },

  cat: async (args, flags, ctx) => {
    if (!args[0]) return { error: 'cat: missing file operand' };
    try {
      const content = await ctx.vfs.cat(args[0]);
      return { output: content };
    } catch (e: any) {
      return { error: e.message };
    }
  },

  touch: async (args, flags, ctx) => {
    if (!args[0]) return { error: 'touch: missing file operand' };
    try {
      await ctx.vfs.touch(args[0]);
      return { output: '' };
    } catch (e: any) {
      return { error: e.message };
    }
  },

  mkdir: async (args, flags, ctx) => {
    if (!args[0]) return { error: 'mkdir: missing operand' };
    try {
      await ctx.vfs.mkdir(args[0]);
      return { output: '' };
    } catch (e: any) {
      return { error: e.message };
    }
  },

  rm: async (args, flags, ctx) => {
    if (!args[0]) return { error: 'rm: missing operand' };
    const recursive = !!flags.r || !!flags.recursive;
    const target = args[0];
    try {
      await ctx.vfs.rm(target, recursive);
      return { output: '' };
    } catch (e: any) {
      return { error: e.message };
    }
  },

  mv: async (args, flags, ctx) => {
    if (args.length < 2) return { error: 'mv: missing source or destination' };
    const src = args[0]!;
    const dest = args[1]!;
    try {
      await ctx.vfs.mv(src, dest);
      return { output: '' };
    } catch (e: any) {
      return { error: e.message };
    }
  },

  cp: async (args, flags, ctx) => {
    if (args.length < 2) return { error: 'cp: missing source or destination' };
    const src = args[0]!;
    const dest = args[1]!;
    try {
      await ctx.vfs.cp(src, dest);
      return { output: '' };
    } catch (e: any) {
      return { error: e.message };
    }
  },

  find: async (args, flags, ctx) => {
    if (!args[0]) return { error: 'find: missing search query' };
    try {
      const results = await ctx.vfs.find(args[0]);
      if (results.length === 0) return { output: '(no results)' };
      return { output: results.join('\n') };
    } catch (e: any) {
      return { error: e.message };
    }
  },

  stat: async (args, flags, ctx) => {
    if (!args[0]) return { error: 'stat: missing file operand' };
    try {
      const info = await ctx.vfs.stat(args[0]);
      return {
        output: [
          `  Name: ${info.name}`,
          `  Path: ${info.path}`,
          `  Size: ${ctx.vfs.formatSize(info.size)}`,
          `  Type: ${info.mimeType || 'unknown'}`,
        ].join('\n'),
      };
    } catch (e: any) {
      return { error: e.message };
    }
  },

  theme: (args, flags, ctx) => {
    const mode = args[0];
    if (mode === 'light' || mode === 'heavy') {
      ctx.setPerformanceMode(mode);
      return { output: `[theme] Switched to ${mode} mode` };
    }
    return { output: `Current mode: ${ctx.performanceMode}. Options: light, heavy` };
  },

  open: (args, flags, ctx) => {
    if (!args[0]) return { error: 'open: missing app name' };
    const appId = args[0].toLowerCase();
    try {
      ctx.openWindow(appId);
      return { output: `[launch] ${appId}` };
    } catch {
      return { error: `open: unknown app '${appId}'` };
    }
  },

  ai: async (args, flags, ctx) => {
    if (!args[0]) return { error: 'ai: missing prompt. Usage: ai <your question>' };
    const prompt = args.join(' ');
    try {
      const { useAIStore } = await import('@/lib/stores/ai.store');
      const store = useAIStore.getState();
      if (!store.ready) {
        return { error: `[ai] Edge AI is not ready. Status: ${store.progress}` };
      }
      const response = await store.query(prompt);
      return { output: response };
    } catch (e: any) {
      return { error: `[ai] Failed to query Edge AI: ${e.message}` };
    }
  },

  wget: async (args, flags, ctx) => {
    if (!args[0]) return { error: 'wget: missing url operand. Usage: wget <url> [filename]' };
    const url = args[0];
    const filename = args[1] || url.split('/').pop()?.split('?')[0] || 'downloaded_file';
    
    try {
      // Use ContinuaOS internal proxy to bypass CORS
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const blob = await res.blob();
      const contentType = res.headers.get('content-type') || 'application/octet-stream';
      
      const targetPath = ctx.vfs.getCwd() === '/' ? `Desktop/${filename}` : `${ctx.vfs.getCwd()}/${filename}`.replace('//', '/');
      await ctx.vfs.write(targetPath, blob, contentType);
      
      // Notify the desktop to refresh if we saved it to Desktop
      if (typeof window !== 'undefined' && targetPath.startsWith('Desktop/')) {
        window.dispatchEvent(new CustomEvent('os:refresh-desktop'));
      }
      
      return { output: `[wget] Downloaded to ${targetPath} (${ctx.vfs.formatSize(blob.size)})` };
    } catch (e: any) {
      return { error: `[wget] Failed to download: ${e.message}` };
    }
  },
};

export function parseInput(input: string): { cmd: string; args: string[]; flags: Record<string, string | boolean> } {
  const tokens = input.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (const token of tokens) {
    if (token.startsWith('--')) {
      const parts = token.substring(2).split('=');
      flags[parts[0]!] = parts.length > 1 ? parts[1]!.replace(/^"|"$/g, '') : true;
    } else if (token.startsWith('-') && token.length > 1 && !token.startsWith('--')) {
      for (let i = 1; i < token.length; i++) {
        flags[token[i]!] = true;
      }
    } else {
      args.push(token.replace(/^"|"$/g, ''));
    }
  }

  return { cmd: args.shift()?.toLowerCase() || '', args, flags };
}

export async function execute(input: string, ctx: CommandContext): Promise<CommandResult> {
  const { cmd, args, flags } = parseInput(input);
  if (!cmd) return { output: '' };

  const handler = commands[cmd];
  if (handler) {
    return handler(args, flags, ctx);
  }

  // Fallback to WebAssembly Linux Engine
  const wasmRes = await wasmTerminalEngine.executeCommand(input);
  if (wasmRes.exitCode !== -1) {
    return { output: wasmRes.output };
  }

  return { error: `command not found: ${cmd}. Type "help" for available commands.` };
}

export { VirtualFS };
export type { VFSEntry };
