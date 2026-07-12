'use client';

import React, { useState, useRef, useEffect } from 'react';
import { OSWindow, useOS, useAppVisibility } from '@/lib/os-context';
import { Terminal as TerminalIcon, Search as SearchIcon, Image as ImageIcon, Folder, ExternalLink, Command, Cpu, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { get, set } from 'idb-keyval';
import { generateTerminalResponse } from '@/app/actions';
import { getSupabase } from '@/lib/supabase';
import { FS } from '@/lib/fs';

type TerminalEntry = {
  id: string;
  type: 'command' | 'output' | 'system' | 'visual';
  content?: string;
  isError?: boolean;
  visual?: React.ReactNode;
};

// --- Command Parser --- //
function parseCommand(input: string) {
  const tokens = input.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};

  tokens.forEach(token => {
    if (token.startsWith('--')) {
      const parts = token.substring(2).split('=');
      flags[parts[0]] = parts.length > 1 ? parts[1].replace(/^"|"$/g, '') : true;
    } else {
      args.push(token.replace(/^"|"$/g, ''));
    }
  });

  return { root: args[0]?.toLowerCase() || '', args: args.slice(1), flags };
}

export function TerminalBox({ window }: { window: OSWindow }) {
  const { openWindow, loadProject, performanceMode, setPerformanceMode } = useOS();
  const [history, setHistory] = useState<TerminalEntry[]>([
    { id: '1', type: 'system', content: 'ANICHISOM OS // MULTI-USER EDGE TERMINAL v1.0.4' },
    { id: '2', type: 'system', content: 'Type "help" for a list of available commands. Session is synced.' }
  ]);
  const [input, setInput] = useState('');
  const [cwd, setCwd] = useState('/home/user');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);
  const { currentUser } = useOS();
  const { isVisible, isFocused } = useAppVisibility(window.id);

  useEffect(() => {
    // If not visible, we could throttle UI updates or pause heavy animation loops.
    // For now we just log to indicate process management abstraction works.
    if (!isVisible) {
      console.log(`[ProcessManager] Suspending heavy operations for Terminal (${window.id})`);
    }
  }, [isVisible, window.id]);

  useEffect(() => {
    if (!currentUser) return;
    const supabase = getSupabase();
    
    // Initial fetch
    supabase.from('terminals').select('history').eq('id', currentUser.id).single()
      .then(({ data }) => {
        if (data && data.history) {
          const safeHistory = data.history.map((h: any) => ({
             id: h.id, type: h.type, content: h.content || null, isError: h.isError || false
          }));
          isSyncingRef.current = true;
          setHistory(safeHistory);
        }
      });

    // Realtime subscription
    const channel = supabase
      .channel(`terminal:${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'terminals', filter: `id=eq.${currentUser.id}` },
        (payload: any) => {
          const data = payload.new;
          if (data && data.history) {
            const safeHistory = data.history.map((h: any) => ({
               id: h.id, type: h.type, content: h.content || null, isError: h.isError || false
            }));
            isSyncingRef.current = true;
            setHistory(safeHistory);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isSyncingRef.current) {
       isSyncingRef.current = false;
       return;
    }
    if (currentUser && history.length > 2) {
       timeout = setTimeout(() => {
         const safeHistory = history.map(h => ({
           id: h.id, type: h.type, content: h.content || null, isError: h.isError || false
         }));
         getSupabase().from('terminals').upsert(
           { id: currentUser.id, history: safeHistory },
           { onConflict: 'id' }
         );
       }, 500);
    }
    return () => clearTimeout(timeout);
  }, [history, currentUser]);

  // --- Core Command Registry --- //
  const executeCommand = async (rawInput: string) => {
    if (!rawInput.trim() || isProcessing) return;

    // Handle history replay (!23)
    if (rawInput.startsWith('!') && rawInput.length > 1) {
       const idx = parseInt(rawInput.substring(1));
       if (!isNaN(idx) && idx >= 0 && idx < commandHistory.length) {
         rawInput = commandHistory[idx];
       }
    }

    const newCommandEntry: TerminalEntry = { id: crypto.randomUUID(), type: 'command', content: rawInput };
    setHistory(prev => [...prev, newCommandEntry].slice(-100));
    
    // Save to history
    setCommandHistory(prev => [...prev, rawInput].slice(-100));
    setHistoryIndex(-1);

    const { root, args, flags } = parseCommand(rawInput);
    
    let result: Partial<TerminalEntry> | null = null;
    setIsProcessing(true);

    try {
      switch (root) {
        case 'help':
          result = {
            type: 'output',
            content: `SYSTEM COMMANDS:
  help                      Show this help message
  clear                     Clear the terminal screen
  history                   Show command history
  whoami                    Identify current user
  pwd                       Print working directory
  cd [dir]                  Change directory
  ls                        List directory contents
  mkdir [dir]               Create a directory (creates .keep file)
  touch [file]              Create an empty file
  rm [file]                 Delete a file or directory
  cat [file]                Read file contents
  date                      Show current date and time
  echo [text]               Print text to terminal
  theme [light|heavy]       Switch OS performance mode

AI GATEWAY:
  ai [prompt]               Query the integrated foundation model natively

APP & CREATIVE COMMANDS:
  open [app]                Launch an app (files, browser, campaign, moodboard)
  campaign new "[name]"     Launch Campaign Lab with a new context
  moodboard add "[query]"   Search and insert assets into your moodboard`
          };
          break;
        case 'clear':
          setHistory([]);
          setIsProcessing(false);
          return;
        case 'history':
          result = { type: 'output', content: commandHistory.map((cmd, i) => `  ${i}  ${cmd}`).join('\n') };
          break;
        case 'whoami':
          result = { type: 'output', content: 'ANICHISOM. Root User.' };
          break;
        case 'date':
          result = { type: 'output', content: new Date().toString() };
          break;
        case 'pwd':
          result = { type: 'output', content: cwd };
          break;
        case 'echo':
          result = { type: 'output', content: args.join(' ') };
          break;
        case 'cd':
          const targetDir = args[0] || '/home/user';
          if (targetDir === '..' && cwd !== '/') {
             setCwd(cwd.split('/').slice(0, -1).join('/') || '/');
          } else if (targetDir.startsWith('/')) {
             setCwd(targetDir);
          } else {
             setCwd(cwd === '/' ? `/${targetDir}` : `${cwd}/${targetDir}`);
          }
          break;
        case 'mkdir':
          if (!args[0]) throw new Error('mkdir: missing operand');
          await FS.write(`${cwd === '/' ? '' : cwd}/${args[0]}/.keep`, '');
          result = { type: 'output', content: `Created directory: ${args[0]}` };
          break;
        case 'touch':
          if (!args[0]) throw new Error('touch: missing operand');
          await FS.write(`${cwd === '/' ? '' : cwd}/${args[0]}`, '');
          result = { type: 'output', content: `Created file: ${args[0]}` };
          break;
        case 'rm':
          if (!args[0]) throw new Error('rm: missing operand');
          await FS.delete(`${cwd === '/' ? '' : cwd}/${args[0]}`);
          result = { type: 'output', content: `Deleted: ${args[0]}` };
          break;
        case 'cat':
          if (!args[0]) throw new Error('cat: missing operand');
          const fileData = await FS.read(`${cwd === '/' ? '' : cwd}/${args[0]}`);
          if (fileData && fileData.content) result = { type: 'output', content: fileData.content };
          else result = { type: 'output', content: `cat: ${args[0]}: No such file or directory` };
          break;
        case 'ls':
          try {
            const files = await FS.readDir(cwd === '/' ? '' : cwd);
            if (files && files.length > 0) {
              const fileList = files.map(f => {
                const icon = f.mimeType?.startsWith('image') ? '🖼️' : (f.name.includes('.') ? '📄' : '📁');
                return `${icon} ${f.name.padEnd(20)} ${f.size || '--'}`;
              }).join('\n');
              result = { type: 'output', content: fileList };
            } else {
              result = { type: 'output', content: 'Empty directory.' };
            }
          } catch (e) {
            result = { type: 'output', content: 'ls: cannot access directory' };
          }
          break;
        case 'theme':
          const t = args[0];
          if (t === 'light' || t === 'heavy') {
            setPerformanceMode(t);
            result = { type: 'output', content: `[SYSTEM] Switched UI performance mode to: ${t.toUpperCase()}` };
          } else {
            result = { type: 'output', content: `Current mode: ${performanceMode}. Valid options: light, heavy.` };
          }
          break;
        case 'ai':
        case 'gpt':
          if (args.length === 0) throw new Error('Missing prompt. Usage: ai [your question]');
          const prompt = args.join(' ');
          const streamId = crypto.randomUUID();
          // Add loading state
          setHistory(prev => [...prev, { id: streamId, type: 'output', content: 'Querying AI Node...' }]);
          
          try {
             // Let UI update immediately to show loading
             await new Promise(r => setTimeout(r, 10)); 
             const aiResponse = await generateTerminalResponse(prompt);
             
             setHistory(prev => prev.map(entry => 
               entry.id === streamId 
                 ? { ...entry, content: aiResponse.success ? aiResponse.text : `[ERROR] ${aiResponse.error}`, isError: !aiResponse.success } 
                 : entry
             ));
          } catch (e: any) {
             setHistory(prev => prev.map(entry => 
               entry.id === streamId 
                 ? { ...entry, content: '[NETWORK ERROR] Failed to reach AI Gateway.', isError: true } 
                 : entry
             ));
          }
          setIsProcessing(false);
          return;
        case 'open':
          if (!args[0]) throw new Error('Missing target app or project.');
          const target = args[0].toLowerCase();
          const validApps = ['files', 'browser', 'campaign', 'moodboard', 'editor', 'office'];
          if (validApps.includes(target)) {
            openWindow(target);
            result = { type: 'output', content: `[SYSTEM] Booting process: ${target}.exe...` };
          } else {
             loadProject(target);
             result = { type: 'output', content: `[SYSTEM] Loading project workspace: ${target}...` };
          }
          break;
        case 'campaign':
          if (args[0] === 'new') {
            const title = args.slice(1).join(' ') || 'Street Energy';
            openWindow('campaign');
            result = { type: 'visual', visual: <VisualCard title={title} subtitle="Campaign context injected." icon={<Command className="w-5 h-5 text-[#f5f5f5]" />} meta="Live Editing" /> };
          } else {
            throw new Error(`Invalid campaign operation.`);
          }
          break;
        case 'moodboard':
          if (args[0] === 'add' || args[0] === 'search') {
            const query = args.slice(1).join(' ');
            openWindow('moodboard');
            result = { type: 'visual', visual: <SearchVisual query={query} /> };
          } else {
            throw new Error(`Invalid moodboard operation.`);
          }
          break;
        default:
          throw new Error(`Command not found: ${root}`);
      }
    } catch (e: any) {
       result = { type: 'output', content: e.message || 'Unknown error occurred.', isError: true };
    }

    if (result) {
      setHistory(prev => [...prev, { id: crypto.randomUUID(), ...result } as TerminalEntry]);
    }
    setIsProcessing(false);
  };


  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIndex = historyIndex + 1 < commandHistory.length ? historyIndex + 1 : historyIndex;
        setHistoryIndex(nextIndex);
        setInput(commandHistory[commandHistory.length - 1 - nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInput(commandHistory[commandHistory.length - 1 - nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'l' && e.ctrlKey) {
       e.preventDefault();
       setHistory([]);
    }
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [history]);

  // Command palette autocomplete suggestion logic
  const cmds = ['help', 'clear', 'history', 'whoami', 'pwd', 'cd', 'ls', 'date', 'echo', 'theme light', 'theme heavy', 'ai', 'open files', 'open browser', 'open editor', 'open office', 'campaign new', 'moodboard add'];
  const suggestion = input.trim() ? cmds.find(c => c.startsWith(input.toLowerCase().trim())) : '';

  return (
    <div 
      className="w-full h-full bg-[#050505] text-[#f5f5f5] font-mono p-4 flex flex-col overflow-hidden shadow-2xl relative"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-white/10 px-2 py-1 rounded-md text-xs font-sans text-white/70">
         <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
         <Users className="w-3 h-3" /> <span className="opacity-70">Shared Session</span>
      </div>

      {/* Background glow effects */}
      {performanceMode === 'heavy' && (
        <>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-electric-purple/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-neon-blue/5 blur-[100px] rounded-full pointer-events-none" />
        </>
      )}

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto whitespace-pre-wrap hide-scrollbar pb-8 z-10 scroll-smooth">
          {history.map((entry) => (
            <div 
              key={entry.id}
              className="mb-1.5 leading-relaxed tracking-tight text-[13px]"
            >
              {entry.type === 'command' && (
                <div className="flex items-start text-white/50">
                  <span className="mr-3 font-bold">~</span>
                  <span className="text-white font-medium">{entry.content}</span>
                </div>
              )}
              {entry.type === 'system' && (
                <div className="text-white/40 italic flex items-center gap-2">
                  <TerminalIcon className="w-3 h-3" /> {entry.content}
                </div>
              )}
              {entry.type === 'output' && (
                <div className={cn("pl-5", entry.isError ? "text-red-400" : "text-white/70 font-light")}>
                  {entry.content}
                </div>
              )}
              {entry.type === 'visual' && (
                <div className="pl-5 pt-2 pb-3">
                  {entry.visual}
                </div>
              )}
            </div>
          ))}

        <div className="flex items-center mt-2 group relative z-10 w-full">
          <span className="text-white/50 mr-3 font-bold group-hover:text-neon-blue transition-colors">~</span>
          <div className="relative flex-1 flex items-center">
             {suggestion && suggestion !== input.toLowerCase().trim() && (
                <span className="absolute left-0 text-white/20 pointer-events-none whitespace-pre pr-8 overflow-hidden text-ellipsis w-full text-[13px]">
                   {suggestion}
                </span>
             )}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent border-none outline-none text-white focus:ring-0 p-0 m-0 z-10 text-[13px] tracking-tight relative caret-white"
              autoFocus
              spellCheck={false}
            />
          </div>
        </div>
        <div ref={endRef} className="h-4" />
      </div>
    </div>
  );
}

// --- Visual Output Blocks --- //

function VisualCard({ title, subtitle, icon, meta }: { title: string, subtitle?: string, icon?: React.ReactNode, meta?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 w-full max-w-sm backdrop-blur-md flex flex-col gap-3 hover:bg-white/10 transition-colors cursor-default">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-md border border-white/10">
            {icon || <Command className="w-4 h-4 text-white/70" />}
          </div>
          <div className="font-sans">
             <div className="text-white font-medium text-sm leading-none mb-1">{title}</div>
             {subtitle && <div className="text-white/50 text-xs">{subtitle}</div>}
          </div>
        </div>
        {meta && (
          <div className="text-[10px] uppercase tracking-wider text-white/30 border border-white/10 px-2 py-0.5 rounded-full font-mono">
            {meta}
          </div>
        )}
      </div>
    </div>
  )
}

function SearchVisual({ query }: { query: string }) {
  const images = Array.from({ length: 3 }).map((_, i) => `https://picsum.photos/seed/${query + i}/300/200`);
  
  return (
    <div className="flex flex-col gap-3 max-w-md w-full">
       <div className="text-xs text-white/50 flex items-center gap-2">
         <SearchIcon className="w-3 h-3" /> Found 3 visual assets matching <span className="text-white italic">&quot;{query}&quot;</span>
       </div>
       <div className="grid grid-cols-3 gap-2">
         {images.map((img, i) => (
           <React.Fragment key={i}>
             {/* eslint-disable-next-line @next/next/no-img-element */}
             <img src={img} className="w-full aspect-[4/3] object-cover rounded-md border border-white/10 hover:border-white/30 transition-colors" alt="Asset" />
           </React.Fragment>
         ))}
       </div>
       <button className="flex items-center justify-center gap-2 w-full py-2 bg-white/5 border border-white/10 rounded-md font-sans text-xs text-white/70 hover:bg-white/10 transition-colors mt-1">
         <ExternalLink className="w-3 h-3" /> Insert into Workspace
       </button>
    </div>
  )
}
