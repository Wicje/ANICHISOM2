'use client';

import React, { useEffect, useRef, useState } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { VirtualFS, execute, parseInput } from '@/lib/terminal/commands';
import { audioSystem } from '@/lib/services/audio-engine';

export function TerminalBox({ window }: { window: OSWindow }) {
  const { openWindow, performanceMode, setPerformanceMode, currentUser } = useOS();
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const vfsRef = useRef(new VirtualFS());
  const [history, setHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('continuaos:terminal-history') || '[]');
    } catch {
      return [];
    }
  });
  const historyRef = useRef(history);
  const historyIdxRef = useRef(-1);
  const currentLineRef = useRef('');
  const [ready, setReady] = useState(false);
  const currentUserRef = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    if (!termRef.current || xtermRef.current) return;

    let disposed = false;

    Promise.all([
      import('@xterm/xterm'),
      import('@xterm/addon-fit'),
      import('@xterm/addon-web-links'),
    ]).then(([xtermMod, fitMod, linksMod]) => {
      if (disposed) return;

      const { Terminal } = xtermMod;
      const { FitAddon } = fitMod;
      const { WebLinksAddon } = linksMod;

      const term = new Terminal({
        fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Menlo, monospace',
        fontSize: 13,
        lineHeight: 1.4,
        cursorBlink: true,
        cursorStyle: 'bar',
        theme: {
          background: 'transparent',
          foreground: '#e2e8f0',
          cursor: '#10F4A0',
          selectionBackground: 'rgba(16, 244, 160, 0.25)',
          black: '#0a0a0a',
          red: '#ff5555',
          green: '#10F4A0',
          yellow: '#f1fa8c',
          blue: '#00f0ff',
          magenta: '#bd93f9',
          cyan: '#00f0ff',
          white: '#f8f8f2',
          brightBlack: '#6272a4',
          brightRed: '#ff6e6e',
          brightGreen: '#10F4A0',
          brightYellow: '#ffffa5',
          brightBlue: '#66f3ff',
          brightMagenta: '#d6acff',
          brightCyan: '#66f3ff',
          brightWhite: '#ffffff',
        },
        allowTransparency: true,
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);
      term.open(termRef.current!);

      fitAddon.fit();
      xtermRef.current = term;
      fitAddonRef.current = fitAddon;
      vfsRef.current = new VirtualFS();

      const PROMPT = () => {
        const cwd = vfsRef.current.getCwd();
        const displayCwd = cwd === '/' ? '~' : cwd.replace(/^\/home\/user/, '~');
        return `\x1b[1;32m${currentUserRef.current?.name || 'continua'}\x1b[0m:\x1b[1;34m${displayCwd}\x1b[0m$ `;
      };

      term.writeln('\x1b[1;36m╔══════════════════════════════════════════╗\x1b[0m');
      term.writeln('\x1b[1;36m║  ContinuaOS Glass Terminal               ║\x1b[0m');
      term.writeln('\x1b[1;36m║  Real filesystem · Real commands          ║\x1b[0m');
      term.writeln('\x1b[1;36m╚══════════════════════════════════════════╝\x1b[0m');
      term.writeln('');
      term.write(PROMPT());

      // Chunked non-blocking output writing
      const writeOutput = (text: string) => {
        const lines = text.split('\n');
        if (lines.length > 300) {
          let idx = 0;
          const CHUNK_SIZE = 100;
          function writeChunk() {
            const end = Math.min(idx + CHUNK_SIZE, lines.length);
            for (; idx < end; idx++) {
              term.writeln(lines[idx] || '');
            }
            if (idx < lines.length) {
              requestAnimationFrame(writeChunk);
            }
          }
          writeChunk();
        } else {
          for (const line of lines) {
            term.writeln(line);
          }
        }
      };

      let inputBuffer = '';

      term.onKey(({ key, domEvent }) => {
        audioSystem.playKeyPress();
        const ev = domEvent;
        const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

        if (ev.key === 'Enter') {
          const line = inputBuffer.trim();
          term.writeln('');

          if (line) {
            const next = [line, ...historyRef.current.filter(h => h !== line)];
            if (next.length > 200) next.shift();
            historyRef.current = next;
            setHistory(next);
            localStorage.setItem('continuaos:terminal-history', JSON.stringify(next));
          }
          historyIdxRef.current = -1;
          inputBuffer = '';

          if (line) {
            const ctx = {
              vfs: vfsRef.current,
              openWindow,
              performanceMode,
              setPerformanceMode,
              currentUser,
            };

            execute(line, ctx).then(result => {
              if (result.clear) {
                term.clear();
              } else if (result.error) {
                term.writeln(`\x1b[31m${result.error}\x1b[0m`);
              } else if (result.output) {
                writeOutput(result.output);
              }
              term.write(PROMPT());
            });
          } else {
            term.write(PROMPT());
          }
        } else if (ev.key === 'Backspace') {
          if (inputBuffer.length > 0) {
            inputBuffer = inputBuffer.slice(0, -1);
            term.write('\b \b');
          }
        } else if (ev.key === 'ArrowUp') {
          ev.preventDefault();
          if (historyRef.current.length > 0) {
            const idx = historyIdxRef.current;
            const newIdx = idx < historyRef.current.length - 1 ? idx + 1 : idx;
            historyIdxRef.current = newIdx;
            const cmd = historyRef.current[historyRef.current.length - 1 - newIdx] || '';
            term.write('\x1b[2K\r' + PROMPT() + cmd);
            inputBuffer = cmd;
          }
        } else if (ev.key === 'ArrowDown') {
          ev.preventDefault();
          const idx = historyIdxRef.current;
          if (idx > 0) {
            const newIdx = idx - 1;
            historyIdxRef.current = newIdx;
            const cmd = historyRef.current[historyRef.current.length - 1 - newIdx] || '';
            term.write('\x1b[2K\r' + PROMPT() + cmd);
            inputBuffer = cmd;
          } else if (idx === 0) {
            historyIdxRef.current = -1;
            term.write('\x1b[2K\r' + PROMPT());
            inputBuffer = '';
          }
        } else if (ev.key === 'Tab') {
          ev.preventDefault();
          const trimmed = inputBuffer.trimStart();
          const parts = trimmed.split(/\s+/);
          const cmdName = parts[0] || '';
          const lastToken = parts[parts.length - 1] || '';

          if (parts.length <= 1 && !trimmed.includes(' ')) {
            const ALL_CMDS = ['help', 'clear', 'ls', 'pwd', 'cd', 'cat', 'touch', 'mkdir', 'rm', 'echo', 'whoami', 'sysinfo', 'open', 'mode', 'theme', 'date', 'history', 'uname', 'env', 'ps', 'kill', 'top', 'uptime', 'netstat', 'ping', 'curl', 'tree', 'find', 'du', 'df', 'grep', 'wc', 'chmod', 'chown', 'export', 'alias', 'version', 'motd', 'banner', 'credits', 'reboot'];
            const matches = ALL_CMDS.filter(c => c.startsWith(cmdName));
            if (matches.length === 1) {
              const completion = matches[0] + ' ';
              term.write('\x1b[2K\r' + PROMPT() + completion);
              inputBuffer = completion;
            } else if (matches.length > 1) {
              term.writeln('');
              term.writeln(matches.join('  '));
              term.write(PROMPT() + inputBuffer);
            }
          } else {
            vfsRef.current.ls().then((children: any[]) => {
              const matches = children.filter((c: any) => c.name.startsWith(lastToken));
              if (matches.length === 1) {
                const item = matches[0];
                const suffix = item.isDir ? '/' : ' ';
                const newParts = [...parts.slice(0, -1), item.name + suffix];
                const newCmd = newParts.join(' ');
                term.write('\x1b[2K\r' + PROMPT() + newCmd);
                inputBuffer = newCmd;
              } else if (matches.length > 1) {
                term.writeln('');
                term.writeln(matches.map((m: any) => m.isDir ? m.name + '/' : m.name).join('  '));
                term.write(PROMPT() + inputBuffer);
              }
            });
          }
        } else if (ev.ctrlKey && ev.key === 'c') {
          term.writeln('^C');
          inputBuffer = '';
          term.write(PROMPT());
        } else if (ev.ctrlKey && ev.key === 'l') {
          term.clear();
          term.write(PROMPT() + inputBuffer);
        } else if (ev.ctrlKey && ev.key === 'u') {
          term.write('\x1b[2K\r' + PROMPT());
          inputBuffer = '';
        } else if (ev.ctrlKey && ev.key === 'w') {
          const trimmed = inputBuffer.trimEnd();
          const lastSpace = trimmed.lastIndexOf(' ');
          inputBuffer = lastSpace >= 0 ? trimmed.substring(0, lastSpace + 1) : '';
          term.write('\x1b[2K\r' + PROMPT() + inputBuffer);
        } else if (printable) {
          inputBuffer += key;
          term.write(key);
        }
      });

      setReady(true);
    });

    return () => {
      disposed = true;
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const onResize = () => fitAddonRef.current?.fit();
    globalThis.addEventListener('resize', onResize);
    return () => globalThis.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="w-full h-full bg-[#05070d]/65 backdrop-blur-3xl border border-white/15 flex flex-col overflow-hidden shadow-2xl relative group">
      <div ref={termRef} className="flex-1 p-3" />
    </div>
  );
}
