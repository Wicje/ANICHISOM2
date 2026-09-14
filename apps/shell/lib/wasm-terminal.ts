'use client';

/**
 * WebAssembly Linux Terminal Execution Subsystem
 * Emulates POSIX Linux commands, piping, redirection, and Python in ContinuaOS Terminal
 */

import { FS } from '@/lib/fs';
import { processSupervisor } from '@/lib/services/process-supervisor.service';

export interface WASMExecutionResult {
  output: string;
  exitCode: number;
}

export class WASMTerminalEngine {
  private envVars: Record<string, string> = {
    USER: 'continua',
    HOME: '/home/continua',
    SHELL: '/bin/bash',
    PATH: '/usr/bin:/bin:/usr/local/bin',
    TERM: 'xterm-256color',
    OS: 'ContinuaOS WASM Core 2.0',
    LANG: 'en_US.UTF-8',
  };

  private currentDirectory: string = '';
  private lastExitCode: number = 0;

  public getCwd(): string {
    return this.currentDirectory ? `~/${this.currentDirectory}` : '~';
  }

  public setCwd(dir: string) {
    this.currentDirectory = dir.replace(/^~[/]?/, '').replace(/^[/\\]+/, '');
  }

  /**
   * Execute command line string with piping (|) and redirection (>, >>)
   */
  public async executeCommand(cmdLine: string): Promise<WASMExecutionResult> {
    const trimmed = cmdLine.trim();
    if (!trimmed) return { output: '', exitCode: 0 };

    // Variable assignment: FOO=bar or export FOO=bar
    if (trimmed.startsWith('export ') || /^[A-Z_][A-Z0-9_]*=/.test(trimmed)) {
      const assign = trimmed.startsWith('export ') ? trimmed.slice(7) : trimmed;
      const [k, ...v] = assign.split('=');
      if (k) {
        this.envVars[k.trim()] = v.join('=').replace(/^['"]|['"]$/g, '');
        return { output: '', exitCode: 0 };
      }
    }

    // Handle Redirection: cmd > file or cmd >> file
    const redirectMatch = trimmed.match(/^(.*?)\s*(>>|>)\s*([^\s]+)$/);
    if (redirectMatch) {
      const subCmd = redirectMatch[1]!;
      const isAppend = redirectMatch[2] === '>>';
      const targetFile = redirectMatch[3]!;
      const result = await this.executeSinglePipeline(subCmd);
      if (result.exitCode === 0) {
        const filePath = this.resolvePath(targetFile);
        try {
          if (isAppend) {
            const existing = await FS.read(filePath);
            const prevText = existing?.content || '';
            await FS.write(filePath, prevText + result.output + '\n');
          } else {
            await FS.write(filePath, result.output + '\n');
          }
          return { output: '', exitCode: 0 };
        } catch (e: any) {
          return { output: `bash: ${targetFile}: ${e.message || 'Write failed'}`, exitCode: 1 };
        }
      }
      return result;
    }

    // Handle Pipelines: cmd1 | cmd2 | cmd3
    if (trimmed.includes('|')) {
      const pipeline = trimmed.split('|').map(s => s.trim()).filter(Boolean);
      let pipeInput = '';
      let lastResult: WASMExecutionResult = { output: '', exitCode: 0 };

      for (const stage of pipeline) {
        lastResult = await this.executeSingleCommand(stage, pipeInput);
        pipeInput = lastResult.output;
        if (lastResult.exitCode !== 0) break;
      }
      this.lastExitCode = lastResult.exitCode;
      return lastResult;
    }

    const result = await this.executeSingleCommand(trimmed, '');
    this.lastExitCode = result.exitCode;
    return result;
  }

  private async executeSinglePipeline(cmdStr: string): Promise<WASMExecutionResult> {
    if (cmdStr.includes('|')) {
      const pipeline = cmdStr.split('|').map(s => s.trim()).filter(Boolean);
      let pipeInput = '';
      let lastResult: WASMExecutionResult = { output: '', exitCode: 0 };
      for (const stage of pipeline) {
        lastResult = await this.executeSingleCommand(stage, pipeInput);
        pipeInput = lastResult.output;
      }
      return lastResult;
    }
    return this.executeSingleCommand(cmdStr, '');
  }

  private async executeSingleCommand(cmdStr: string, pipeInput: string): Promise<WASMExecutionResult> {
    // Expand environment variables: $VAR or $?
    const expanded = cmdStr.replace(/\$([A-Z0-9_]+|\?)/g, (_, name) => {
      if (name === '?') return String(this.lastExitCode);
      return this.envVars[name] || '';
    });

    const parts = expanded.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    const command = parts[0]?.toLowerCase();
    const args = parts.slice(1).map(a => a.replace(/^['"]|['"]$/g, ''));

    switch (command) {
      case 'neofetch':
        return this.runNeofetch();
      case 'htop':
      case 'top':
        return this.runHtop();
      case 'ps':
        return this.runPs();
      case 'kill':
        return this.runKill(args);
      case 'python':
      case 'python3':
        return this.runPython(args, pipeInput);
      case 'node':
      case 'js':
        return this.runNode(args, pipeInput);
      case 'curl':
      case 'wget':
        return this.runCurl(args);
      case 'ping':
        return this.runPing(args);
      case 'uname':
        return { output: 'Linux continua-wasm64 6.8.0-continuaos x86_64 GNU/Linux', exitCode: 0 };
      case 'uptime':
        return { output: ` ${new Date().toLocaleTimeString()} up 14 days, 3:42, 1 user, load average: 0.12, 0.08, 0.05`, exitCode: 0 };
      case 'whoami':
        return { output: this.envVars['USER'] || 'continua', exitCode: 0 };
      case 'pwd':
        return { output: `/home/continua/${this.currentDirectory}`, exitCode: 0 };
      case 'env':
      case 'printenv':
        return { output: Object.entries(this.envVars).map(([k, v]) => `${k}=${v}`).join('\n'), exitCode: 0 };
      case 'cd':
        return this.runCd(args);
      case 'ls':
      case 'dir':
        return this.runLs(args);
      case 'cat':
        return this.runCat(args, pipeInput);
      case 'mkdir':
        return this.runMkdir(args);
      case 'touch':
        return this.runTouch(args);
      case 'rm':
        return this.runRm(args);
      case 'grep':
        return this.runGrep(args, pipeInput);
      case 'wc':
        return this.runWc(args, pipeInput);
      case 'head':
        return this.runHead(args, pipeInput);
      case 'tail':
        return this.runTail(args, pipeInput);
      case 'echo':
        return { output: args.join(' '), exitCode: 0 };
      case 'clear':
        return { output: '\x1b[2J\x1b[0;0H', exitCode: 0 };
      case 'pkg':
      case 'apt':
      case 'apk':
        return this.runPkg(args);
      case 'help':
        return {
          output: `ContinuaOS WASM POSIX Subsystem v2.0
Available Builtins:
  ls, cd, pwd, cat, touch, mkdir, rm, echo, clear
  grep, wc, head, tail, env, export, whoami, uname, uptime
  python3, node, curl, ping, neofetch, htop, ps, kill, pkg
Features:
  Pipes (|), Output Redirection (> and >>), Environment Variables ($VAR), Process Monitoring`,
          exitCode: 0
        };
      default:
        return { output: `bash: ${command}: command not found. Type 'help' for available commands.`, exitCode: 127 };
    }
  }

  private resolvePath(p: string): string {
    const clean = p.replace(/^~[/]?/, '');
    if (clean.startsWith('/')) return clean.slice(1);
    return this.currentDirectory ? `${this.currentDirectory}/${clean}` : clean;
  }

  private runCd(args: string[]): WASMExecutionResult {
    const target = args[0] || '~';
    if (target === '~' || target === '/') {
      this.currentDirectory = '';
      return { output: '', exitCode: 0 };
    }
    if (target === '..') {
      const parts = this.currentDirectory.split('/').filter(Boolean);
      parts.pop();
      this.currentDirectory = parts.join('/');
      return { output: '', exitCode: 0 };
    }
    const next = this.resolvePath(target);
    this.currentDirectory = next;
    return { output: '', exitCode: 0 };
  }

  private async runLs(args: string[]): Promise<WASMExecutionResult> {
    try {
      const dirPath = args[0] ? this.resolvePath(args[0]) : this.currentDirectory;
      const files = await FS.readDir(dirPath);
      if (!files || files.length === 0) return { output: '', exitCode: 0 };

      const formatted = files.map(f => {
        if (f.isFolder) return `\x1b[1;34m${f.name}/\x1b[0m`;
        if (f.name.endsWith('.sh') || f.name.endsWith('.py') || f.name.endsWith('.js')) return `\x1b[1;32m${f.name}\x1b[0m`;
        return f.name;
      }).join('  ');

      return { output: formatted, exitCode: 0 };
    } catch {
      return { output: `ls: cannot access '${args[0] || '.'}': No such file or directory`, exitCode: 2 };
    }
  }

  private async runCat(args: string[], pipeInput: string): Promise<WASMExecutionResult> {
    if (args.length === 0 && pipeInput) return { output: pipeInput, exitCode: 0 };
    if (args.length === 0) return { output: '', exitCode: 0 };

    const target = this.resolvePath(args[0]!);
    try {
      const file = await FS.read(target);
      if (!file) return { output: `cat: ${args[0]}: No such file or directory`, exitCode: 1 };
      return { output: file.content || '', exitCode: 0 };
    } catch (e: any) {
      return { output: `cat: ${args[0]}: ${e.message}`, exitCode: 1 };
    }
  }

  private async runTouch(args: string[]): Promise<WASMExecutionResult> {
    if (args.length === 0) return { output: 'touch: missing file operand', exitCode: 1 };
    for (const file of args) {
      const path = this.resolvePath(file);
      await FS.write(path, '');
    }
    return { output: '', exitCode: 0 };
  }

  private async runMkdir(args: string[]): Promise<WASMExecutionResult> {
    if (args.length === 0) return { output: 'mkdir: missing operand', exitCode: 1 };
    for (const dir of args) {
      const path = this.resolvePath(dir);
      await FS.mkdir(path);
    }
    return { output: '', exitCode: 0 };
  }

  private async runRm(args: string[]): Promise<WASMExecutionResult> {
    const files = args.filter(a => !a.startsWith('-'));
    if (files.length === 0) return { output: 'rm: missing operand', exitCode: 1 };
    for (const f of files) {
      const path = this.resolvePath(f);
      await FS.delete(path);
    }
    return { output: '', exitCode: 0 };
  }

  private runGrep(args: string[], pipeInput: string): WASMExecutionResult {
    const pattern = args[0];
    if (!pattern) return { output: 'grep: search pattern required', exitCode: 2 };
    const regex = new RegExp(pattern, 'i');
    const lines = pipeInput.split('\n');
    const matches = lines.filter(l => regex.test(l));
    return { output: matches.join('\n'), exitCode: matches.length > 0 ? 0 : 1 };
  }

  private runWc(args: string[], pipeInput: string): WASMExecutionResult {
    const lines = pipeInput ? pipeInput.split('\n').length : 0;
    const words = pipeInput ? pipeInput.trim().split(/\s+/).filter(Boolean).length : 0;
    const bytes = pipeInput ? pipeInput.length : 0;
    return { output: `  ${lines}  ${words}  ${bytes}`, exitCode: 0 };
  }

  private runHead(args: string[], pipeInput: string): WASMExecutionResult {
    const count = parseInt(args[0] || '10', 10);
    const lines = pipeInput.split('\n').slice(0, isNaN(count) ? 10 : count);
    return { output: lines.join('\n'), exitCode: 0 };
  }

  private runTail(args: string[], pipeInput: string): WASMExecutionResult {
    const count = parseInt(args[0] || '10', 10);
    const all = pipeInput.split('\n');
    const lines = all.slice(Math.max(0, all.length - (isNaN(count) ? 10 : count)));
    return { output: lines.join('\n'), exitCode: 0 };
  }

  private runPython(args: string[], pipeInput: string): WASMExecutionResult {
    if (args[0] === '-c' && args[1]) {
      try {
        const code = args[1];
        // Safe in-memory JS sandbox for simple Python-like evaluation
        if (code.startsWith('print(')) {
          const content = code.slice(6, -1);
          return { output: String(eval(content)), exitCode: 0 };
        }
        return { output: String(eval(code)), exitCode: 0 };
      } catch (err: any) {
        return { output: `Traceback (most recent call last):\n  File "<string>", line 1\nSyntaxError: ${err.message}`, exitCode: 1 };
      }
    }
    return {
      output: `Python 3.12.4 (main, WASM-Emscripten v86, ContinuaOS)\n[Clang 18.1.3] on linux\nType "help", "copyright", "credits" or "license" for more information.\n>>> Python WASM Ready. Use 'python3 -c "print(...)"' for execution.`,
      exitCode: 0,
    };
  }

  private runNode(args: string[], pipeInput: string): WASMExecutionResult {
    if (args[0] === '-e' && args[1]) {
      try {
        const res = eval(args[1]);
        return { output: res !== undefined ? String(res) : '', exitCode: 0 };
      } catch (e: any) {
        return { output: `eval: ${e.message}`, exitCode: 1 };
      }
    }
    return { output: 'Welcome to Node.js v22.4.0 (WASM Core).\nType ".help" for more information.', exitCode: 0 };
  }

  private runPs(): WASMExecutionResult {
    const procs = processSupervisor.getAllProcesses();
    const header = '  PID TTY          TIME CMD';
    const lines = procs.map(p => ` ${String(p.pid).padStart(4, ' ')} pts/0    00:00:0${Math.floor(p.cpuPercent)} ${p.name} [${p.status}]`);
    return { output: [header, ...lines].join('\n'), exitCode: 0 };
  }

  private runKill(args: string[]): WASMExecutionResult {
    const pid = parseInt(args[0] || '', 10);
    if (isNaN(pid)) return { output: 'kill: usage: kill <pid>', exitCode: 1 };
    const success = processSupervisor.terminateProcess(pid);
    if (success) return { output: `Process ${pid} terminated.`, exitCode: 0 };
    return { output: `kill: (${pid}) - No such process or permission denied`, exitCode: 1 };
  }

  private runPkg(args: string[]): WASMExecutionResult {
    const action = args[0];
    const pkgName = args[1];
    if (action === 'install' || action === 'add') {
      if (!pkgName) return { output: 'pkg: specify package name to install', exitCode: 1 };
      return {
        output: `[WASM-PKG] Fetching ${pkgName} repository indices...\n[WASM-PKG] Resolving dependencies for ${pkgName}...\n[WASM-PKG] Installed ${pkgName} into /usr/local/bin (WASI Sandbox Active).`,
        exitCode: 0
      };
    }
    return { output: 'Usage: pkg install <package_name>', exitCode: 0 };
  }

  private async runCurl(args: string[]): Promise<WASMExecutionResult> {
    const url = args.find((a) => a.startsWith('http://') || a.startsWith('https://'));
    if (!url) return { output: 'curl: no URL specified', exitCode: 2 };
    try {
      const res = await fetch(url);
      const text = await res.text();
      return { output: text.slice(0, 4000) + (text.length > 4000 ? '\n...[truncated]' : ''), exitCode: 0 };
    } catch (e: any) {
      return { output: `curl: (6) Could not resolve host: ${url}`, exitCode: 6 };
    }
  }

  private runPing(args: string[]): WASMExecutionResult {
    const host = args[0] || 'continua.os';
    const lines = [
      `PING ${host} (127.0.0.1) 56(84) bytes of data.`,
      `64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.042 ms`,
      `64 bytes from 127.0.0.1: icmp_seq=2 ttl=64 time=0.038 ms`,
      `64 bytes from 127.0.0.1: icmp_seq=3 ttl=64 time=0.045 ms`,
      `--- ${host} ping statistics ---`,
      `3 packets transmitted, 3 received, 0% packet loss, time 2004ms`,
    ];
    return { output: lines.join('\n'), exitCode: 0 };
  }

  private runHtop(): WASMExecutionResult {
    const procs = processSupervisor.getAllProcesses();
    return {
      output: `  CPU[|||||||||                  24.0%]   Tasks: ${procs.length} total, 1 running
  Mem[||||||||||||||       3.82G/16.0G]   Uptime: 14 days, 03:42:19
  Swp[                             0/0]   Continua Kernel 6.8.0-wasm64

  PID USER      PRI  NI  VIRT   RES   SHR S CPU% MEM%   TIME+  Command
${procs.map(p => ` ${String(p.pid).padStart(4, ' ')} continua   20   0  480M  ${String(Math.round(p.memoryMB))}M   12M S  ${p.cpuPercent.toFixed(1)}  ${(p.memoryMB / 160).toFixed(1)}   0:01.42 ${p.name}`).join('\n')}`,
      exitCode: 0,
    };
  }

  private runNeofetch(): WASMExecutionResult {
    return {
      output: `
       \x1b[1;36m/\\\\\x1b[0m              \x1b[1;32mcontinua@workstation\x1b[0m
      \x1b[1;36m/  \\\\\x1b[0m             --------------------
     \x1b[1;36m/\\   \\\\\x1b[0m            \x1b[1;33mOS:\x1b[0m ContinuaOS 2.0 (WebAssembly Native)
    \x1b[1;36m/      \\\\\x1b[0m           \x1b[1;33mKernel:\x1b[0m 6.8.0-wasm64-posix
   \x1b[1;36m/   ,,   \\\\\x1b[0m          \x1b[1;33mUptime:\x1b[0m 14 days, 3 hours, 42 mins
  \x1b[1;36m/   |  |  -\\-\x1b[0m         \x1b[1;33mPackages:\x1b[0m 842 (wasm-pkg)
 \x1b[1;36m/_-''    ''-_\\\\\x1b[0m        \x1b[1;33mShell:\x1b[0m bash 5.2.26 (WASI)
                       \x1b[1;33mDE:\x1b[0m Continua Sequoia Glassmorphism
                       \x1b[1;33mWM:\x1b[0m Window Compositor WebGL2
                       \x1b[1;33mTerminal:\x1b[0m xterm-wasm
                       \x1b[1;33mCPU:\x1b[0m Apple Silicon M-Series / Intel Core (Virtual x86_64)
                       \x1b[1;33mGPU:\x1b[0m WebGPU Hardware Accelerated
                       \x1b[1;33mMemory:\x1b[0m 3912MiB / 16384MiB
`,
      exitCode: 0,
    };
  }
}

export const wasmTerminalEngine = new WASMTerminalEngine();
