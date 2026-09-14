import React, { useState, useRef, useCallback, useEffect } from 'react';
import { VirtualFS, execute } from '@/lib/terminal/commands';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useWindowStore } from '@/lib/stores/window.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useFocusStore } from '@/lib/stores/focus.store';

interface TerminalProps {
  terminalOpen: boolean;
  setTerminalOpen: (open: boolean) => void;
  projectId: string;
}

interface TerminalLine {
  id: number;
  type: 'input' | 'output' | 'error';
  text: string;
}

export function TerminalPanel({ terminalOpen, setTerminalOpen, projectId }: TerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: 0, type: 'output', text: 'ContinuaOS WebContainer Node.js Engine (v18.17.0)' },
    { id: 1, type: 'output', text: 'Connected to VirtualFS POSIX kernel. Type "help" or "/" for skills.' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const lineCounter = useRef(2);
  const vfsRef = useRef(new VirtualFS());

  const handleCommand = useCallback(async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    if (trimmed === 'clear') {
      setLines([]);
      setInputValue('');
      return;
    }

    const newLine: TerminalLine = { id: lineCounter.current++, type: 'input', text: cmd };
    setLines(prev => [...prev, newLine]);
    setInputValue('');

    try {
      const ctx = {
        openWindow: (appId: string, title?: string, data?: any) => useWindowStore.getState().openWindow(appId, title, data),
        vfs: vfsRef.current,
        performanceMode: 'heavy',
        setPerformanceMode: () => {},
        currentUser: useAuthStore.getState().currentUser,
      };

      const res = await execute(trimmed, ctx);
      if (res.error) {
        setLines(prev => [...prev, {
          id: lineCounter.current++,
          type: 'error',
          text: res.error || 'Execution error'
        }]);
      } else if (res.output) {
        setLines(prev => [...prev, {
          id: lineCounter.current++,
          type: 'output',
          text: res.output || ''
        }]);
      }
    } catch (err: any) {
      setLines(prev => [...prev, {
        id: lineCounter.current++,
        type: 'error',
        text: err.message || 'Execution failed'
      }]);
    }
  }, [projectId]);

  if (!terminalOpen) return null;

  return (
    <div className="h-[200px] bg-[#1e1e1e] border-t border-[#3c3c3c] flex flex-col font-mono text-[13px] shrink-0 z-20">
      <div className="flex items-center justify-between pl-4 pr-2 bg-[#1e1e1e] border-b border-[#3c3c3c] pt-2 pb-0 flex-none gap-4">
         <div className="flex gap-4">
            <span className="text-[11px] uppercase tracking-wider text-white border-b border-blue-500 pb-2 cursor-pointer">Terminal</span>
            <span className="text-[11px] uppercase tracking-wider text-white/50 hover:text-white cursor-pointer pb-2">Output</span>
            <span className="text-[11px] uppercase tracking-wider text-white/50 hover:text-white cursor-pointer pb-2">Debug Console</span>
            <span className="text-[11px] uppercase tracking-wider text-white/50 hover:text-white cursor-pointer pb-2">Ports</span>
         </div>
         <div className="flex gap-2 pb-2">
            <button onClick={() => setTerminalOpen(false)} className="text-white/50 hover:text-white">X</button>
         </div>
      </div>
      <div className="p-3 flex-1 overflow-y-auto" onClick={() => inputRef.current?.focus()}>
         {lines.map(line => (
           <div key={line.id} className={line.type === 'error' ? 'text-red-400' : 'text-white/60'}>
             {line.type === 'input' ? (
               <div className="flex items-center gap-2 mt-1">
                 <span className="text-green-500 font-bold">zk3@workspace</span>
                 <span className="text-blue-400 font-bold">~/projects/{projectId}</span>
                 <span className="text-white">$ {line.text}</span>
               </div>
             ) : (
               <div className="ml-0">{line.text}</div>
             )}
           </div>
         ))}
         <div className="flex items-center gap-2 mt-1">
           <span className="text-green-500 font-bold">zk3@workspace</span>
           <span className="text-blue-400 font-bold">~/projects/{projectId}</span>
           <span className="text-white">$</span>
           <input
             ref={inputRef}
             type="text"
             value={inputValue}
             onChange={e => setInputValue(e.target.value)}
             onKeyDown={e => {
               if (e.key === 'Enter') {
                 handleCommand(inputValue);
               }
             }}
             className="flex-1 bg-transparent border-none outline-none text-white focus:ring-0 p-0 m-0"
             placeholder=""
             autoFocus
           />
         </div>
      </div>
    </div>
  );
}
