/**
 * WebAssembly Linux Terminal Execution Subsystem
 * Emulates Linux commands & WebAssembly runtime inside ContinuaOS Terminal
 */

import { FS } from '@/lib/fs';

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
  };

  /**
   * Execute command line string inside WASM/JS Linux Engine
   */
  public async executeCommand(cmdLine: string): Promise<WASMExecutionResult> {
    const trimmed = cmdLine.trim();
    if (!trimmed) return { output: '', exitCode: 0 };

    const parts = trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    const command = parts[0]?.toLowerCase();
    const args = parts.slice(1).map((a) => a.replace(/^['"]|['"]$/g, ''));

    switch (command) {
      case 'neofetch':
        return this.runNeofetch();

      case 'htop':
      case 'top':
        return this.runHtop();

      case 'python':
      case 'python3':
        return this.runPython(args);

      case 'node':
      case 'js':
        return this.runNode(args);

      case 'curl':
      case 'wget':
        return this.runCurl(args);

      case 'ping':
        return this.runPing(args);

      case 'uname':
        return { output: 'Linux continua-vfs 6.8.0-wasm64-continuaos x86_64 GNU/Linux', exitCode: 0 };

      case 'uptime':
        return { output: ` ${new Date().toLocaleTimeString()} up 42 min, 1 user, load average: 0.12, 0.08, 0.04`, exitCode: 0 };

      case 'env':
        return {
          output: Object.entries(this.envVars)
            .map(([k, v]) => `${k}=${v}`)
            .join('\n'),
          exitCode: 0,
        };

      default:
        return { output: '', exitCode: -1 }; // Handled by standard VFS commands
    }
  }

  private runNeofetch(): WASMExecutionResult {
    const art = `
\x1b[36m   ████████████████████   \x1b[0m   \x1b[1;36mcontinua\x1b[0m@\x1b[1;36mcontinuaos\x1b[0m
\x1b[36m  ████          ████  \x1b[0m   --------------------
\x1b[36m ████    ████    ████ \x1b[0m   \x1b[33mOS\x1b[0m: ContinuaOS WebAssembly 2.0 x86_64
\x1b[36m ████   ██████   ████ \x1b[0m   \x1b[33mKernel\x1b[0m: 6.8.0-wasm64-continuaos
\x1b[36m ████    ████    ████ \x1b[0m   \x1b[33mUptime\x1b[0m: 42 mins
\x1b[36m  ████          ████  \x1b[0m   \x1b[33mPackages\x1b[0m: 42 (wasm-pkg)
\x1b[36m   ████████████████████   \x1b[0m   \x1b[33mShell\x1b[0m: bash 5.2.21
                             \x1b[33mWM\x1b[0m: Continua Glass Windows
                             \x1b[33mTerminal\x1b[0m: xterm.js (WASM Accelerated)
                             \x1b[33mCPU\x1b[0m: Virtual WASM 8-Core Engine
                             \x1b[33mMemory\x1b[0m: 512MB / 4096MB (OPFS Backed)
`;
    return { output: art, exitCode: 0 };
  }

  private runHtop(): WASMExecutionResult {
    const output = `
\x1b[32m  1  [||||||||||||||||||||||                    42.0%]   Tasks: 18, 2 running\x1b[0m
\x1b[32m  2  [||||||||||                                18.4%]   Load average: 0.12 0.08 0.04
\x1b[32m  3  [||||||||||||||||||||||||||||              64.2%]   Uptime: 00:42:15
\x1b[32m  4  [||||                                       8.1%]\x1b[0m
\x1b[36m  Mem[|||||||||||||||||||||||||||||||||   512M/4.00G]\x1b[0m

  \x1b[1;37mPID USER      PRI  NI  VIRT   RES   SHR S CPU% MEM%   TIME+  Command\x1b[0m
 1042 continua   20   0  245M  48M  12M R 18.4  1.2  0:12.42 continua-os-kernel
 1089 continua   20   0   84M  18M   6M S  2.1  0.4  0:01.15 wasm-terminal
 1104 continua   20   0  120M  24M   8M S  0.0  0.6  0:00.45 opfs-storage-daemon
`;
    return { output, exitCode: 0 };
  }

  private runPython(args: string[]): WASMExecutionResult {
    if (args.includes('-c')) {
      const codeIdx = args.indexOf('-c') + 1;
      const code = args[codeIdx];
      if (code) {
        try {
          // Simple python math/print evaluator fallback
          if (code.includes('print(')) {
            const match = code.match(/print\((.*)\)/);
            if (match) {
              const expr = match[1]!.replace(/math\.pi/g, String(Math.PI)).replace(/math\.sqrt/g, 'Math.sqrt');
              // eslint-disable-next-line no-eval
              const res = Function(`"use strict"; return (${expr})`)();
              return { output: String(res), exitCode: 0 };
            }
          }
        } catch {
          return { output: 'Python WASM SyntaxError: invalid syntax', exitCode: 1 };
        }
      }
    }
    return { output: 'Python 3.11.4 (main, WASM Build) [GCC 13.2.0] on linux\nType "help", "copyright" for more information.', exitCode: 0 };
  }

  private runNode(args: string[]): WASMExecutionResult {
    if (args.includes('-e')) {
      const codeIdx = args.indexOf('-e') + 1;
      const code = args[codeIdx];
      if (code) {
        try {
          // eslint-disable-next-line no-eval
          const res = Function(`"use strict"; return (${code})`)();
          return { output: String(res), exitCode: 0 };
        } catch (err: any) {
          return { output: `Uncaught ${err.message}`, exitCode: 1 };
        }
      }
    }
    return { output: 'v20.11.0 (Node.js WebAssembly Core)', exitCode: 0 };
  }

  private async runCurl(args: string[]): Promise<WASMExecutionResult> {
    const url = args.find((a) => a.startsWith('http://') || a.startsWith('https://'));
    if (!url) return { output: 'curl: try \'curl --help\' or \'curl --manual\' for more information', exitCode: 1 };

    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      const text = await res.text();
      return { output: text.slice(0, 1000) + (text.length > 1000 ? '\n...[truncated]' : ''), exitCode: 0 };
    } catch (err: any) {
      return { output: `curl: (7) Failed to connect to ${url}: ${err.message}`, exitCode: 7 };
    }
  }

  private runPing(args: string[]): WASMExecutionResult {
    const host = args[0] || 'localhost';
    const lines = [
      `PING ${host} (127.0.0.1) 56(84) bytes of data.`,
      `64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.042 ms`,
      `64 bytes from 127.0.0.1: icmp_seq=2 ttl=64 time=0.038 ms`,
      `64 bytes from 127.0.0.1: icmp_seq=3 ttl=64 time=0.045 ms`,
      `--- ${host} ping statistics ---`,
      `3 packets transmitted, 3 received, 0% packet loss, time 2003ms`,
      `rtt min/avg/max/mdev = 0.038/0.041/0.045/0.003 ms`,
    ];
    return { output: lines.join('\n'), exitCode: 0 };
  }
}

export const wasmTerminalEngine = new WASMTerminalEngine();
