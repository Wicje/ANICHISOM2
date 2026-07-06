'use client';

import React, { useState, useEffect, useRef } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { FileCode, Play, Settings, RefreshCcw, Server, Users, ChevronRight, ChevronDown, Folder, File as FileIcon, Search, Plus, Terminal, GitBranch, Bug, Layout, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Storage } from '@/lib/storage';
import { FS } from '@/lib/fs';
import Editor, { useMonaco } from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';

export function CodeEditor({ window: osWindow }: { window: OSWindow }) {
  const { openWindow, currentUser, workspaceMode, setWorkspaceMode } = useOS();
  const projectId = osWindow.data?.projectId || 'default';
  
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
         return `export default function App() {\n  // Set breakpoints by clicking the gutter on the left\n  const handleAction = () => {\n    const data = { status: 'running' };\n    console.log(data);\n  };\n\n  return (\n    <div className="p-4">\n      <h1 className="text-xl font-bold">Hello World</h1>\n      <button onClick={handleAction}>Run</button>\n    </div>\n  );\n}\n`;
    }
  };

  const [files, setFiles] = useState<{ id: string, name: string, type: string, folder: string }[]>([
    { id: 'app.tsx', name: 'app.tsx', type: 'file', folder: 'src' },
    { id: 'package.json', name: 'package.json', type: 'file', folder: 'root' },
  ]);
  
  const refreshFiles = async () => {
      const localFiles = await FS.readDir('');
      if (localFiles && localFiles.length > 0) {
         setFiles(localFiles.map(f => ({ id: f.id, name: f.name, type: 'file', folder: f.id.includes('/') ? f.id.split('/')[0] : 'root' })));
      }
  };

  useEffect(() => {
     refreshFiles();
  }, []);

  const [activeFileId, setActiveFileId] = useState(
    projectId === 'portfolio-v3' ? 'app.tsx' : projectId === 'tesla-redesign' ? 'ui.tsx' : 'app.tsx'
  );
  const activeFile = files.find(f => f.id === activeFileId);
  const fileName = activeFile?.name || activeFileId || 'app.tsx';

  const [code, setCode] = useState(getInitialCode(projectId, osWindow.data?.content));
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['src', 'root']);
  const [isDeploying, setIsDeploying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  
  // UI States
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [agentOpen, setAgentOpen] = useState(false);
  const [activityTab, setActivityTab] = useState<'explorer' | 'search' | 'git' | 'debug'>('explorer');

  // Agent States
  const [agentInput, setAgentInput] = useState('');
  const [agentHistory, setAgentHistory] = useState<{role: 'user'|'agent', content: string}[]>([
    { role: 'agent', content: 'I am your Agentic Copilot. I can generate code, debug, or refactor entire modules natively.' }
  ]);
  
  // Git States
  const [commitMsg, setCommitMsg] = useState('');
  
  const isSyncingRef = useRef(false);

  const roomId = `code-${projectId}-${activeFileId}`;
  
  const editorRef = useRef<any>(null);
  const bindingRef = useRef<any>(null);
  const providerRef = useRef<any>(null);
  const monaco = useMonaco();

  const handleEditorDidMount = (editor: any, monacoInstance: any) => {
    editorRef.current = editor;
    
    // YJS Bindings
    if (workspaceMode === 'agency') {
       const ydoc = new Y.Doc();
       const wsUrl = typeof window !== 'undefined' && window.location.protocol === 'https:' 
          ? `wss://${window.location.hostname}:1234` 
          : 'ws://localhost:1234';
       const provider = new WebsocketProvider(wsUrl, roomId, ydoc);
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
    
    // First try OPFS natively
    FS.read(activeFileId).then(localFile => {
       if (localFile && typeof localFile.content === 'string') {
          setCode(localFile.content);
          setLoaded(true);
       } else {
          // Fallback to legacy cloud storage or templates
          Storage.getDoc('codes', roomId, workspaceMode).then((saved: any) => {
             if (workspaceMode === 'private' && saved && typeof saved === 'string') {
                setCode(saved);
             } else if (saved && saved.code !== undefined) {
                setCode(saved.code);
             } else {
                setCode(getInitialCode(projectId, osWindow.data?.content));
             }
             setLoaded(true);
          });
       }
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
        // Save to native OPFS for local offline access and FileManager visibility
        FS.write(activeFileId, val).catch(e => console.warn('FS write failed', e));
        
        // Sync to legacy/cloud storage
        if (workspaceMode === 'private') {
           Storage.setDoc('codes', roomId, val, workspaceMode);
        } else {
           Storage.setDoc('codes', roomId, { code: val, workspaceMode: 'agency' }, workspaceMode);
        }
    }, 500);
  };

  const handleDeploy = () => {
    setIsDeploying(true);
    setTimeout(() => {
       setIsDeploying(false);
       
       let executableCode = code;
       executableCode = executableCode.replace(/export default function (\w+)/, 'function $1');
       executableCode = executableCode.replace(/import .* from .*/g, '');
       
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
    <div className="w-full h-full flex flex-col bg-[#1e1e1e] text-[#d4d4d4] font-sans text-sm overflow-hidden shadow-2xl relative">
      {/* Top Menu Bar */}
      <div className="flex items-center justify-between p-2 bg-[#333333] border-b border-[#252526]">
        <div className="flex items-center gap-4 pl-2">
          <span className="font-bold text-xs uppercase tracking-wider text-white/70 flex items-center gap-2">
            <Layout className="w-4 h-4" /> Code Studio
          </span>
          <div className="hidden md:flex gap-3 text-xs text-white/50 cursor-pointer">
             <span className="hover:text-white">File</span>
             <span className="hover:text-white">Edit</span>
             <span className="hover:text-white">Selection</span>
             <span className="hover:text-white">View</span>
             <span className="hover:text-white">Go</span>
             <span className="hover:text-white">Run</span>
             <span className="hover:text-white" onClick={() => { if(editorRef.current) editorRef.current.trigger('anyString', 'editor.action.quickCommand', {}); }}>Terminal</span>
          </div>
        </div>
        
        {/* Command Palette Hint */}
        <div 
          onClick={() => { if(editorRef.current) editorRef.current.trigger('anyString', 'editor.action.quickCommand', {}); }}
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#252526] border border-[#3c3c3c] px-4 py-1 rounded-md text-white/50 hover:bg-[#2d2d2d] hover:text-white transition-colors cursor-pointer text-xs"
        >
           <Search className="w-3 h-3" />
           <span>{projectId}</span>
        </div>

        <div className="flex items-center gap-2">
          {currentUser && (
            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md text-xs pointer-events-none">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <Users className="w-3 h-3" /> Live
            </div>
          )}
          <button className="flex items-center gap-1 px-2 py-1 bg-blue-600/80 hover:bg-blue-500 rounded text-white text-xs font-sans transition-colors" onClick={handleDeploy} disabled={isDeploying}>
             {isDeploying ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Server className="w-3 h-3" />}
             <span>Preview</span>
          </button>
          <button onClick={() => setAgentOpen(!agentOpen)} className={cn("flex items-center gap-1 px-2 py-1 rounded text-white text-xs font-sans transition-colors", agentOpen ? "bg-purple-600" : "bg-white/10 hover:bg-white/20")}>
            <Search className="w-3 h-3" /> Copilot
          </button>
        </div>
      </div>
      
      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Activity Bar (VS Code left-most icon bar) */}
        <div className="w-12 bg-[#333333] flex flex-col items-center py-2 gap-4 shrink-0 border-r border-[#252526] z-10 text-white/40">
           <button onClick={() => setActivityTab('explorer')} className={cn("p-2 rounded cursor-pointer transition-colors relative", activityTab === 'explorer' ? "text-white" : "hover:text-white")}>
             {activityTab === 'explorer' && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />}
             <FileIcon className="w-6 h-6" />
           </button>
           <button onClick={() => setActivityTab('search')} className={cn("p-2 rounded cursor-pointer transition-colors relative", activityTab === 'search' ? "text-white" : "hover:text-white")}>
             {activityTab === 'search' && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />}
             <Search className="w-6 h-6" />
           </button>
           <button onClick={() => setActivityTab('git')} className={cn("p-2 rounded cursor-pointer transition-colors relative", activityTab === 'git' ? "text-white" : "hover:text-white")}>
             {activityTab === 'git' && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />}
             <GitBranch className="w-6 h-6" />
             <div className="absolute right-1 bottom-1 w-3.5 h-3.5 bg-blue-500 rounded-full text-white text-[8px] flex items-center justify-center font-bold">2</div>
           </button>
           <button onClick={() => setActivityTab('debug')} className={cn("p-2 rounded cursor-pointer transition-colors relative", activityTab === 'debug' ? "text-white" : "hover:text-white")}>
             {activityTab === 'debug' && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />}
             <Bug className="w-6 h-6" />
           </button>
           <button className="p-2 mt-auto rounded cursor-pointer hover:text-white transition-colors">
             <Settings className="w-6 h-6" />
           </button>
        </div>

        {/* Primary Sidebar (Explorer, Git, Debug) */}
        <div className="w-60 shrink-0 bg-[#252526] border-r border-[#3c3c3c] flex flex-col custom-scrollbar overflow-y-auto z-10">
           
           {/* EXPLORER TAB */}
           {activityTab === 'explorer' && (
             <>
               <div className="p-3 flex items-center justify-between text-[#cccccc] text-[11px] font-semibold uppercase tracking-wider">
                 <span>Explorer</span>
                 <div className="flex items-center gap-1">
                   <button onClick={async () => {
                     const name = prompt("Enter file path (e.g. src/app.tsx):");
                     if (name) { await FS.write(name, '// new file\\n'); await refreshFiles(); }
                   }} className="p-0.5 hover:bg-[#3c3c3c] rounded"><Plus className="w-3.5 h-3.5" /></button>
                   <button onClick={refreshFiles} className="p-0.5 hover:bg-[#3c3c3c] rounded"><RefreshCcw className="w-3.5 h-3.5" /></button>
                 </div>
               </div>
               
               <div className="flex flex-col mt-1">
                 {Object.entries(
                   files.reduce((acc, file) => {
                      const parts = file.id.split('/');
                      const folder = parts.length > 1 ? parts[0] : 'root';
                      if (!acc[folder]) acc[folder] = [];
                      acc[folder].push(file);
                      return acc;
                   }, {} as Record<string, typeof files>)
                 ).map(([folderName, folderFiles]) => (
                   <React.Fragment key={folderName}>
                     <div 
                       className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-[#2a2d2e] text-[#cccccc] text-sm font-semibold"
                       onClick={() => setExpandedFolders(prev => prev.includes(folderName) ? prev.filter(f => f !== folderName) : [...prev, folderName])}
                     >
                       {expandedFolders.includes(folderName) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                       <Folder className="w-4 h-4 text-blue-400" />
                       <span>{folderName.toUpperCase()}</span>
                     </div>
                     {expandedFolders.includes(folderName) && folderFiles.map(file => (
                       <div 
                         key={file.id} 
                         onClick={async () => { 
                           setActiveFileId(file.id); 
                           const localFile = await FS.read(file.id);
                           setCode(localFile?.content || getInitialCode(projectId, '')); 
                         }}
                         className={cn("flex items-center justify-between pl-8 pr-2 py-1 cursor-pointer text-[13px] group", activeFileId === file.id ? "bg-[#37373d] text-white" : "text-[#cccccc] hover:bg-[#2a2d2e]")}
                       >
                         <div className="flex items-center gap-2 overflow-hidden">
                           <FileIcon className={cn("w-4 h-4 shrink-0", file.name.endsWith('.tsx') || file.name.endsWith('.ts') || file.name.endsWith('.js') ? "text-[#e3c14a]" : "text-[#519aba]")} />
                           <span className="truncate">{file.id.includes('/') ? file.id.substring(file.id.indexOf('/') + 1) : file.name}</span>
                         </div>
                         <button 
                           className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded text-rose-400"
                           onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(`Delete ${file.id}?`)) {
                                 await FS.delete(file.id);
                                 await refreshFiles();
                              }
                           }}
                         >✖</button>
                       </div>
                     ))}
                   </React.Fragment>
                 ))}
               </div>
             </>
           )}

           {/* GIT / SOURCE CONTROL TAB */}
           {activityTab === 'git' && (
             <div className="flex flex-col h-full">
               <div className="p-3 text-[#cccccc] text-[11px] font-semibold uppercase tracking-wider flex justify-between items-center">
                 <span>Source Control</span>
                 <Check className="w-3.5 h-3.5 cursor-pointer hover:text-white" />
               </div>
               <div className="px-3 pb-3 border-b border-[#3c3c3c]">
                 <input 
                   value={commitMsg}
                   onChange={e => setCommitMsg(e.target.value)}
                   placeholder="Message (Enter to commit)" 
                   className="w-full bg-[#3c3c3c] border border-transparent rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-white/40" 
                 />
                 <button className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white rounded py-1 text-xs transition-colors">Commit</button>
               </div>
               <div className="flex flex-col mt-2 px-2">
                 <div className="text-[11px] font-bold uppercase text-white/50 mb-1 px-1">Changes</div>
                 <div className="flex items-center justify-between p-1 hover:bg-[#2a2d2e] cursor-pointer text-[13px] text-[#cccccc] rounded">
                    <div className="flex items-center gap-2">
                      <FileIcon className="w-3.5 h-3.5 text-[#e3c14a]" /> <span className={cn("truncate", activeFileId === 'app.tsx' && "text-[#e2c08d]")}>app.tsx</span>
                    </div>
                    <span className="text-[#e2c08d] text-xs font-bold">M</span>
                 </div>
                 <div className="flex items-center justify-between p-1 hover:bg-[#2a2d2e] cursor-pointer text-[13px] text-[#cccccc] rounded">
                    <div className="flex items-center gap-2">
                      <FileIcon className="w-3.5 h-3.5 text-green-400" /> <span className="truncate text-green-400">new_component.tsx</span>
                    </div>
                    <span className="text-green-400 text-xs font-bold">U</span>
                 </div>
               </div>
             </div>
           )}

           {/* DEBUG TAB */}
           {activityTab === 'debug' && (
             <div className="flex flex-col h-full">
               <div className="p-3 text-[#cccccc] text-[11px] font-semibold uppercase tracking-wider flex justify-between items-center">
                 <span>Run and Debug</span>
                 <Play className="w-3.5 h-3.5 cursor-pointer hover:text-green-400" />
               </div>
               <div className="flex-1 flex flex-col gap-px bg-[#3c3c3c]">
                 <div className="bg-[#252526] p-2 flex flex-col gap-1">
                    <div className="text-[11px] font-bold uppercase text-white/80 cursor-pointer flex items-center"><ChevronDown className="w-3.5 h-3.5" /> Variables</div>
                    <div className="pl-4 text-xs text-blue-300 font-mono flex items-center gap-2">Local <span className="text-white/40">...</span></div>
                 </div>
                 <div className="bg-[#252526] p-2 flex flex-col gap-1">
                    <div className="text-[11px] font-bold uppercase text-white/80 cursor-pointer flex items-center"><ChevronDown className="w-3.5 h-3.5" /> Watch</div>
                 </div>
                 <div className="bg-[#252526] p-2 flex flex-col gap-1">
                    <div className="text-[11px] font-bold uppercase text-white/80 cursor-pointer flex items-center"><ChevronDown className="w-3.5 h-3.5" /> Call Stack</div>
                 </div>
                 <div className="bg-[#252526] p-2 flex flex-col gap-1 flex-1">
                    <div className="text-[11px] font-bold uppercase text-white/80 cursor-pointer flex items-center"><ChevronDown className="w-3.5 h-3.5" /> Breakpoints</div>
                    <div className="pl-4 text-xs font-mono flex items-center gap-2 mt-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /> app.tsx:4</div>
                 </div>
               </div>
             </div>
           )}
        </div>
        
        {/* Editor & Terminal Area */}
        <div className="flex-1 flex flex-col relative bg-[#1e1e1e] min-w-0">
           {/* Editor Tabs */}
           <div className="flex bg-[#2d2d2d] custom-scrollbar overflow-x-auto shrink-0">
             <div className="flex items-center gap-2 px-3 py-2 bg-[#1e1e1e] text-white text-[13px] cursor-pointer min-w-[120px] relative shrink-0">
               <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500" />
               <FileIcon className={cn("w-3.5 h-3.5", fileName.endsWith('.tsx') || fileName.endsWith('.ts') ? "text-[#519aba]" : "text-[#e3c14a]")} />
               <span className="italic">{fileName}</span>
               <button className="ml-auto opacity-0 hover:opacity-100 hover:bg-white/10 rounded p-0.5">✖</button>
             </div>
           </div>
           
           <Editor
            height={terminalOpen ? "calc(100% - 200px)" : "100%"}
            defaultLanguage={fileName.endsWith('.tsx') || fileName.endsWith('.ts') ? 'typescript' : 'javascript'}
            theme="vs-dark"
            value={code}
            onChange={handleCodeChange}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: true, scale: 0.75 },
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              wordWrap: 'on',
              formatOnPaste: true,
              tabSize: 2,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              glyphMargin: true,
              folding: true,
              lineNumbersMinChars: 3,
            }}
            className="flex-1 min-h-0"
         />

           {/* Integrated Terminal Panel */}
           {terminalOpen && (
             <div className="h-[200px] bg-[#1e1e1e] border-t border-[#3c3c3c] flex flex-col font-mono text-[13px] shrink-0 z-20">
                <div className="flex items-center justify-between pl-4 pr-2 bg-[#1e1e1e] border-b border-[#3c3c3c] pt-2 pb-0 flex-none gap-4">
                   <div className="flex gap-4">
                      <span className="text-[11px] uppercase tracking-wider text-white border-b border-blue-500 pb-2 cursor-pointer">Terminal</span>
                      <span className="text-[11px] uppercase tracking-wider text-white/50 hover:text-white cursor-pointer pb-2">Output</span>
                      <span className="text-[11px] uppercase tracking-wider text-white/50 hover:text-white cursor-pointer pb-2">Debug Console</span>
                      <span className="text-[11px] uppercase tracking-wider text-white/50 hover:text-white cursor-pointer pb-2">Ports</span>
                   </div>
                   <div className="flex gap-2 pb-2">
                      <button onClick={() => setTerminalOpen(false)} className="text-white/50 hover:text-white">✖</button>
                   </div>
                </div>
                <div className="p-3 flex-1 overflow-y-auto">
                   <div className="text-white/40 italic mb-2">ANICHISOM WebContainer Node.js Engine (v18.17.0)</div>
                   <div className="text-white/60 mb-2">Welcome to the integrated terminal.</div>
                   <div className="flex items-center gap-2 mt-4">
                     <span className="text-green-500 font-bold">zk3@workspace</span>
                     <span className="text-blue-400 font-bold">~/projects/{projectId}</span>
                     <span className="text-white">$</span>
                     <input type="text" className="flex-1 bg-transparent border-none outline-none text-white focus:ring-0 p-0 m-0" placeholder="" autoFocus onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                           alert('Mock: Executing inline terminal command natively.');
                           e.currentTarget.value = '';
                        }
                     }} />
                   </div>
                </div>
             </div>
           )}
        </div>

        {/* Agentic Copilot Panel (Right Sidebar) */}
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
                   <div key={i} className={cn("text-[13px] leading-relaxed p-3 rounded-lg font-sans", msg.role === 'agent' ? "bg-[#37373d] text-white/90" : "bg-blue-600 text-white self-end max-w-[85%]")}>
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
      
      {/* Bottom Status Bar */}
      <div className="h-6 shrink-0 bg-[#007acc] text-white flex items-center px-3 text-xs justify-between font-sans">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 cursor-pointer hover:bg-white/10 px-1 rounded"><GitBranch className="w-3 h-3" /> main*</span>
          <span className="flex items-center gap-1 cursor-pointer hover:bg-white/10 px-1 rounded"><RefreshCcw className="w-3 h-3" /> 0 ↓ 2 ↑</span>
          <span className="cursor-pointer hover:bg-white/10 px-1 rounded">✖ 0  ⚠ 0</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="cursor-pointer hover:bg-white/10 px-1 rounded">Ln {code.split('\n').length}, Col {code.length > 0 ? code.split('\n')[code.split('\n').length - 1].length : 0}</span>
          <span className="cursor-pointer hover:bg-white/10 px-1 rounded">Spaces: 2</span>
          <span className="cursor-pointer hover:bg-white/10 px-1 rounded">UTF-8</span>
          <span className="cursor-pointer hover:bg-white/10 px-1 rounded">{fileName.endsWith('.tsx') ? 'TypeScript React' : 'TypeScript'}</span>
          <span className="cursor-pointer hover:bg-white/10 px-1 rounded flex items-center gap-1"><Check className="w-3 h-3" /> Prettier</span>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 10px; height: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #424242; border: 2px solid #252526; border-radius: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4f4f4f; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
}
