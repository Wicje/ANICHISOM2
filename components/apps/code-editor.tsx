'use client';

import React, { useState, useEffect, useRef } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { FileCode, Play, Settings, RefreshCcw, Server, Users, ChevronRight, ChevronDown, Folder, File as FileIcon, Search, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Storage } from '@/lib/storage';
import Editor, { useMonaco } from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { MonacoBinding } from 'y-monaco';

export function CodeEditor({ window }: { window: OSWindow }) {
  const { openWindow, currentUser, workspaceMode, setWorkspaceMode } = useOS();
  const projectId = window.data?.projectId || 'default';
  
  const getInitialCode = (id: string, content?: string) => {
    if (content) return content;
    switch (id) {
       case 'nike-campaign':
         return `import { initCampaign } from '@anichisom/core';\n\n// Nike Air Force 1 : 40th Anniversary\nconst campaign = initCampaign({\n  target: 'Global',\n  platforms: ['Instagram', 'TikTok'],\n  mood: 'Energetic, Street, Heritage'\n});\n`;
       case 'tesla-redesign':
         return `import { renderUI } from '@anichisom/ui';\n\n// Tesla dashboard concept\nexport default function App() {\n  return (\n    <div className="bg-black text-white p-8">\n       <h1>Tesla UI Staging</h1>\n       <p>Dashboard visualization active.</p>\n    </div>\n  )\n}\n`;
       case 'portfolio-v3':
         return `// Portfolio OS Core Boot Sequence\nimport { bootOS } from './kernel';\n\nbootOS({\n  user: 'ANICHISOM',\n  desktopTheme: 'macOS Monterey',\n  apps: ['Terminal', 'Moodboard', 'Code']\n});\n`;
       default:
         return `export default function App() {\n  return (\n    <div className="p-4">\n      <h1 className="text-xl font-bold">Hello World</h1>\n    </div>\n  );\n}\n`;
    }
  };

  const [files] = useState([
    { id: '1', name: 'app.tsx', type: 'file', folder: 'src' },
    { id: '2', name: 'kernel.ts', type: 'file', folder: 'src' },
    { id: '3', name: 'ui.tsx', type: 'file', folder: 'src' },
    { id: '4', name: 'package.json', type: 'file', folder: 'root' },
    { id: '5', name: 'README.md', type: 'file', folder: 'root' },
  ]);
  const [activeFileId, setActiveFileId] = useState(
    projectId === 'portfolio-v3' ? '2' : projectId === 'tesla-redesign' ? '3' : '1'
  );
  const activeFile = files.find(f => f.id === activeFileId);
  const fileName = activeFile?.name || 'app.tsx';

  const [code, setCode] = useState(getInitialCode(projectId, window.data?.content));
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['src', 'root']);
  const [isDeploying, setIsDeploying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentInput, setAgentInput] = useState('');
  const [agentHistory, setAgentHistory] = useState<{role: 'user'|'agent', content: string}[]>([
    { role: 'agent', content: 'I am your Agentic Copilot. I can generate code, debug, or refactor entire modules natively.' }
  ]);
  const isSyncingRef = useRef(false);

  const roomId = `code-${projectId}-${activeFileId}`;
  
  const editorRef = useRef<any>(null);
  const bindingRef = useRef<any>(null);
  const providerRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    
    if (workspaceMode === 'agency') {
       const ydoc = new Y.Doc();
       const provider = new WebrtcProvider(roomId, ydoc, { signaling: ['wss://signaling.yjs.dev'] });
       const type = ydoc.getText('monaco');
       
       const binding = new MonacoBinding(type, editor.getModel(), new Set([editor]), provider.awareness);
       
       providerRef.current = provider;
       bindingRef.current = binding;
    }
  };

  useEffect(() => {
    return () => {
      if (bindingRef.current) bindingRef.current.destroy();
      if (providerRef.current) providerRef.current.destroy();
    };
  }, [roomId, workspaceMode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(false);
    
    // Abstracted Storage Load
    Storage.getDoc('codes', roomId, workspaceMode).then((saved: any) => {
       if (workspaceMode === 'private' && saved && typeof saved === 'string') {
          setCode(saved);
       } else if (saved && saved.code !== undefined) {
          setCode(saved.code);
       }
       setLoaded(true);
    });

    const unsub = Storage.subscribe('codes', roomId, workspaceMode, (state: any) => {
       if (state) {
         const remoteCode = workspaceMode === 'private' ? state : state.code;
         if (remoteCode !== undefined && remoteCode !== code) {
             isSyncingRef.current = true;
             setCode(remoteCode);
         }
       }
    });

    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, workspaceMode, currentUser]);

  const saveCodeRef = useRef<NodeJS.Timeout | null>(null);
  const handleCodeChange = (newCode: string | undefined) => {
    let val = newCode || '';
    
    // Secret Redaction Logic: Mask simple tokens/keys
    if (val.match(/sk-[a-zA-Z0-9]{20,}/)) {
       val = val.replace(/sk-[a-zA-Z0-9]{20,}/g, 'sk-***REDACTED***');
    }
    
    setCode(val);
    
    if (isSyncingRef.current) {
        isSyncingRef.current = false;
        return;
    }
    
    if (saveCodeRef.current) clearTimeout(saveCodeRef.current);
    saveCodeRef.current = setTimeout(() => {
        if (workspaceMode === 'private') {
           Storage.setDoc('codes', roomId, val, workspaceMode);
        } else {
           Storage.setDoc('codes', roomId, { code: val, workspaceMode: 'agency' }, workspaceMode);
        }
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (saveCodeRef.current) clearTimeout(saveCodeRef.current);
    };
  }, []);

  const handleDeploy = () => {
    setIsDeploying(true);
    setTimeout(() => {
       setIsDeploying(false);
       
       let executableCode = code;
       // Extremely basic transpilation of exports for the iframe payload
       executableCode = executableCode.replace(/export default function (\w+)/, 'function $1');
       executableCode = executableCode.replace(/import .* from .*/g, ''); // strip imports
       
       const htmlContent = `
         <!DOCTYPE html>
         <html lang="en">
           <head>
             <meta charset="utf-8">
             <title>Staging Virtualizer</title>
             <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
             <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
             <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
             <script src="https://cdn.tailwindcss.com"></script>
           </head>
           <body>
             <div id="root" class="w-full h-full min-h-screen bg-white text-black"></div>
             <script type="text/babel">
               ${executableCode}
               
               // Attempt to find the main App component and render it
               const ComponentToRender = typeof App !== 'undefined' ? App : () => <div class="p-8 text-red-500 font-mono">Export default 'App' function not found.</div>;
               const root = ReactDOM.createRoot(document.getElementById('root'));
               root.render(<ComponentToRender />);
             </script>
           </body>
         </html>
       `;
       const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
       openWindow('browser', `Staging: ${fileName}`, { url: dataUrl });
    }, 800);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm overflow-hidden shadow-2xl relative">
      {/* Shared Session Indicator */}
      {currentUser && (
          <div className="absolute top-12 right-6 z-20 flex items-center gap-2 bg-black/40 border border-white/10 px-2 py-1 rounded-md text-xs font-sans text-white/70 pointer-events-none">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <Users className="w-3 h-3" /> <span className="opacity-70">Live Collaboration</span>
          </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between p-2 bg-[#252526] border-b border-[#3c3c3c]">
        <div className="flex items-center gap-4 text-[#cccccc] pl-2">
          <span className="font-bold text-xs uppercase tracking-wider text-white/50">{projectId}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setWorkspaceMode(workspaceMode === 'private' ? 'agency' : 'private')}
            className={cn("flex flex-col justify-center px-2 py-0.5 rounded transition-colors uppercase font-bold tracking-wider leading-tight text-[9px]", workspaceMode === 'agency' ? "text-neon-blue bg-neon-blue/10" : "text-[#aaaaaa] hover:bg-[#333333]")}
            title={workspaceMode === 'private' ? "Switch to Team Workspace" : "Switch to Personal Space"}
          >
            <span>{workspaceMode}</span>
            <span className="text-[7px] opacity-70 mt-[-2px]">Context</span>
          </button>
          
          <div className="w-px h-5 bg-[#3c3c3c] mx-1" />

          <button className="flex items-center gap-1 px-2 py-1 bg-blue-600/80 hover:bg-blue-500 rounded text-white text-xs font-sans transition-colors" title="Deploy to Localhost Virtualizer" onClick={handleDeploy} disabled={isDeploying}>
            {isDeploying ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Server className="w-3 h-3" />}
            <span>{isDeploying ? 'Deploying...' : 'Live Preview'}</span>
          </button>
          <button onClick={() => setAgentOpen(!agentOpen)} className={cn("flex items-center gap-1 px-2 py-1 rounded text-white text-xs font-sans transition-colors", agentOpen ? "bg-purple-600" : "bg-white/10 hover:bg-white/20")} title="Agentic AI Copilot">
            <Search className="w-3 h-3" />
            <span>Copilot</span>
          </button>
          <button onClick={() => setTerminalOpen(!terminalOpen)} className={cn("flex items-center gap-1 px-2 py-1 rounded text-white text-xs font-sans transition-colors", terminalOpen ? "bg-white/20" : "bg-white/10 hover:bg-white/20")} title="Inline Terminal">
            <TerminalIcon className="w-3 h-3" />
          </button>
          <button className="flex items-center gap-1 px-2 py-1 bg-green-700/80 hover:bg-green-600 rounded text-white text-xs font-sans transition-colors" title="Run Code">
            <Play className="w-3 h-3" />
            <span>Run</span>
          </button>
        </div>
      </div>
      
      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* File Tree Sidebar */}
        <div className="w-56 shrink-0 bg-[#252526] border-r border-[#3c3c3c] flex flex-col custom-scrollbar overflow-y-auto">
           <div className="p-2 flex items-center justify-between text-[#cccccc] text-xs font-semibold uppercase tracking-wider">
             <span>Explorer</span>
             <div className="flex items-center gap-1">
               <button className="p-0.5 hover:bg-[#3c3c3c] rounded"><Plus className="w-3.5 h-3.5" /></button>
               <button className="p-0.5 hover:bg-[#3c3c3c] rounded"><RefreshCcw className="w-3.5 h-3.5" /></button>
             </div>
           </div>
           
           <div className="flex flex-col mt-2">
             {/* SRC Folder */}
             <div 
               className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-[#2a2d2e] text-[#cccccc] text-sm"
               onClick={() => setExpandedFolders(prev => prev.includes('src') ? prev.filter(f => f !== 'src') : [...prev, 'src'])}
             >
               {expandedFolders.includes('src') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
               <Folder className="w-4 h-4 text-blue-400" />
               <span>src</span>
             </div>
             {expandedFolders.includes('src') && files.filter(f => f.folder === 'src').map(file => (
               <div 
                 key={file.id} 
                 onClick={() => { setActiveFileId(file.id); setCode(getInitialCode(projectId, '')); }}
                 className={cn("flex items-center gap-2 pl-8 pr-2 py-1 cursor-pointer text-sm", activeFileId === file.id ? "bg-[#37373d] text-white" : "text-[#cccccc] hover:bg-[#2a2d2e]")}
               >
                 <FileIcon className={cn("w-4 h-4", file.name.endsWith('.tsx') || file.name.endsWith('.ts') ? "text-blue-500" : "text-yellow-500")} />
                 <span>{file.name}</span>
               </div>
             ))}
             
             {/* Root Files */}
             {files.filter(f => f.folder === 'root').map(file => (
               <div 
                 key={file.id} 
                 onClick={() => { setActiveFileId(file.id); setCode(getInitialCode(projectId, '')); }}
                 className={cn("flex items-center gap-2 pl-6 pr-2 py-1 cursor-pointer text-sm mt-1", activeFileId === file.id ? "bg-[#37373d] text-white" : "text-[#cccccc] hover:bg-[#2a2d2e]")}
               >
                 <FileIcon className={cn("w-4 h-4", file.name.endsWith('.json') ? "text-yellow-400" : "text-blue-400")} />
                 <span>{file.name}</span>
               </div>
             ))}
           </div>
        </div>
        
        {/* Editor Area */}
        <div className="flex-1 flex flex-col relative bg-[#1e1e1e]">
           {/* Editor Tabs */}
           <div className="flex bg-[#2d2d2d] border-b border-[#3c3c3c]">
             <div className="flex items-center gap-2 px-4 py-2 bg-[#1e1e1e] border-t-2 border-blue-500 text-white text-sm cursor-pointer min-w-[120px]">
               <FileIcon className={cn("w-4 h-4", fileName.endsWith('.tsx') || fileName.endsWith('.ts') ? "text-blue-500" : "text-yellow-500")} />
               <span>{fileName}</span>
             </div>
           </div>
           
           <Editor
            height="100%"
            defaultLanguage={fileName.endsWith('.tsx') || fileName.endsWith('.ts') ? 'typescript' : 'javascript'}
            theme="vs-dark"
            value={code}
            onChange={handleCodeChange}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              wordWrap: 'on',
              formatOnPaste: true,
              tabSize: 2,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
         />

           {/* Inline Terminal */}
           {terminalOpen && (
             <div className="h-48 bg-[#1e1e1e] border-t border-[#3c3c3c] flex flex-col font-mono text-[13px]">
                <div className="flex items-center justify-between px-4 py-1 bg-[#252526] border-b border-[#3c3c3c] text-white/50 text-xs uppercase tracking-wider">
                   <span>Web Terminal (sh)</span>
                   <button onClick={() => setTerminalOpen(false)}>✖</button>
                </div>
                <div className="p-2 flex-1 overflow-y-auto">
                   <div className="text-white/40 italic mb-2">ANICHISOM WebContainer Node.js Engine</div>
                   <div className="flex items-center gap-2">
                     <span className="text-green-500">➜</span>
                     <span className="text-blue-400">workspace</span>
                     <input type="text" className="flex-1 bg-transparent border-none outline-none text-white focus:ring-0 p-0 m-0" placeholder="npm run dev..." onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                           alert('Mock: Executing inline terminal command in WebContainer.');
                           e.currentTarget.value = '';
                        }
                     }} />
                   </div>
                </div>
             </div>
           )}
        </div>

        {/* Agentic Copilot Panel */}
        {agentOpen && (
           <div className="w-80 shrink-0 bg-[#252526] border-l border-[#3c3c3c] flex flex-col z-20 shadow-[-10px_0_20px_rgba(0,0,0,0.2)]">
              <div className="p-3 border-b border-[#3c3c3c] flex items-center justify-between text-white/80 font-sans">
                 <div className="flex items-center gap-2 font-semibold">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" /> Agentic Copilot
                 </div>
                 <button onClick={() => setAgentOpen(false)} className="text-white/50 hover:text-white">✖</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
                 {agentHistory.map((msg, i) => (
                   <div key={i} className={cn("text-[13px] leading-relaxed p-3 rounded-lg font-sans", msg.role === 'agent' ? "bg-[#37373d] text-white/90" : "bg-blue-600/20 text-white border border-blue-500/20 self-end max-w-[85%]")}>
                      {msg.content}
                   </div>
                 ))}
              </div>
              <div className="p-3 border-t border-[#3c3c3c]">
                 <input 
                   type="text" 
                   value={agentInput}
                   onChange={e => setAgentInput(e.target.value)}
                   onKeyDown={e => {
                     if (e.key === 'Enter' && agentInput.trim()) {
                       setAgentHistory(prev => [...prev, { role: 'user', content: agentInput }]);
                       setAgentInput('');
                       setTimeout(() => {
                         setAgentHistory(prev => [...prev, { role: 'agent', content: 'Analyzing your codebase... generating diff implementation for that request.' }]);
                       }, 500);
                     }
                   }}
                   placeholder="Ask copilot to edit..." 
                   className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-xs text-white outline-none focus:border-purple-500 transition-colors"
                 />
              </div>
           </div>
        )}
      </div>
      
      {/* Status Bar */}
      <div className="h-6 shrink-0 bg-[#007acc] text-white flex items-center px-3 text-xs justify-between">
        <div className="flex items-center gap-4">
          <span>main</span>
          <span>● {fileName}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Ln {code.split('\n').length}, Col {code.length > 0 ? code.split('\n')[code.split('\n').length - 1].length : 0}</span>
          <span>Spaces: 2</span>
          <span>UTF-8</span>
          <span>TypeScript</span>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 14px;
          height: 14px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e1e1e;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #424242;
          border: 4px solid #1e1e1e;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4f4f4f;
        }
        .custom-scrollbar::-webkit-scrollbar-corner {
          background: #1e1e1e;
        }
      `}} />
    </div>
  );
}
