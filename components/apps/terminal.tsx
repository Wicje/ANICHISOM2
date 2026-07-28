'use client';

import React, { useEffect, useRef, useState } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { VirtualFS, execute, parseInput } from '@/lib/terminal/commands';

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
          background: '#0a0a0a',
          foreground: '#d4d4d4',
          cursor: '#d4d4d4',
          selectionBackground: '#264f78',
          black: '#0a0a0a',
          red: '#f14c4c',
          green: '#6a9955',
          yellow: '#dcdcaa',
          blue: '#569cd6',
          magenta: '#c586c0',
          cyan: '#4ec9b0',
          white: '#d4d4d4',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#6a9955',
          brightYellow: '#dcdcaa',
          brightBlue: '#569cd6',
          brightMagenta: '#c586c0',
          brightCyan: '#4ec9b0',
          brightWhite: '#ffffff',
        },
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

      const vfs = vfsRef.current;

      const PROMPT = () => `\x1b[36m${currentUserRef.current?.name || 'user'}\x1b[0m:\x1b[35m~\x1b[0m$ `;

      term.writeln('\x1b[1;36m╔══════════════════════════════════════════╗\x1b[0m');
      term.writeln('\x1b[1;36m║  ContinuaOS Terminal v2.0              ║\x1b[0m');
      term.writeln('\x1b[1;36m║  Real filesystem · Real commands          ║\x1b[0m');
      term.writeln('\x1b[1;36m╚══════════════════════════════════════════╝\x1b[0m');
      term.writeln('');
      term.write(PROMPT());

      // Handle ANSI escape sequences from output (convert \x1b[Xm to terminal colors)
      const writeOutput = (text: string) => {
        const lines = text.split('\n');
        for (const line of lines) {
          term.writeln(line);
        }
      };

      let inputBuffer = '';

      term.onKey(({ key, domEvent }) => {
        const ev = domEvent;
        const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

        if (ev.key === 'Enter') {
          const line = inputBuffer.trim();
          term.writeln('');

          if (line) {
            const next = [...historyRef.current, line];
            if (next.length > 200) next.shift();
            historyRef.current = next;
            setHistory(next);
            localStorage.setItem('continuaos:terminal-history', JSON.stringify(next));
          }
          historyIdxRef.current = -1;
          inputBuffer = '';

          if (line) {
            const ctx = {
              vfs,
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
            // Clear current line
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
          // Simple tab completion — search for matching files in cwd
          const partial = inputBuffer.split(' ').pop() || '';
          if (partial) {
            vfs.ls().then(entries => {
              const matches = entries.filter(e => e.name.startsWith(partial));
              if (matches.length === 1) {
                const completed = matches[0]!.name;
                const parts = inputBuffer.split(' ');
                parts[parts.length - 1] = completed;
                const newBuffer = parts.join(' ');
                term.write('\x1b[2K\r' + PROMPT() + newBuffer);
                inputBuffer = newBuffer;
              } else if (matches.length > 1) {
                term.writeln('');
                term.writeln(matches.map(m => m.name).join('  '));
                term.write(PROMPT() + inputBuffer);
              }
            });
          }
        } else if (ev.ctrlKey && ev.key === 'l') {
          ev.preventDefault();
          term.clear();
          term.write(PROMPT());
        } else if (ev.ctrlKey && ev.key === 'c') {
          ev.preventDefault();
          term.writeln('^C');
          inputBuffer = '';
          term.write(PROMPT());
        } else if (ev.ctrlKey && ev.key === 'a') {
          ev.preventDefault();
          term.write('\x1b[2K\r' + PROMPT() + inputBuffer);
          // Move cursor to start
        } else if (ev.ctrlKey && ev.key === 'e') {
          // End — cursor already at end
        } else if (ev.ctrlKey && ev.key === 'u') {
          ev.preventDefault();
          inputBuffer = '';
          term.write('\x1b[2K\r' + PROMPT());
        } else if (ev.ctrlKey && ev.key === 'w') {
          ev.preventDefault();
          // Delete word backward
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
    <div className="w-full h-full bg-[#0a0a0a] flex flex-col overflow-hidden">
      <div ref={termRef} className="flex-1 p-1" />
    </div>
  );
}
