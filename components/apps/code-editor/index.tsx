'use client';

import React, { useState, useRef, useEffect } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { Layout, Search, Users, RefreshCcw, Server, File as FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import '@/lib/monaco-config';
import Editor, { useMonaco } from '@monaco-editor/react';
import { MonacoBinding } from 'y-monaco';

import { ActivityTab } from './types';
import { useCodeEditorState } from './hooks/useCodeEditorState';
import { Sidebar } from './components/Sidebar';
import { TerminalPanel } from './components/Terminal';
import { CopilotPanel } from './components/Copilot';
import { StatusBar } from './components/StatusBar';
import { useCollaborativeDoc } from '@/lib/hooks/useCollaborativeDoc';

export function CodeEditor({ window: osWindow }: { window: OSWindow }) {
  const { openWindow, currentUser, workspaceMode } = useOS();
  const projectId = osWindow.data?.projectId || 'default';
  const roomId = `code-${projectId}-${osWindow.data?.content || 'app.tsx'}`;

  // useCollaborativeDoc for IndexedDB persistence (all modes) + WebSocket (agency mode)
  const collab = useCollaborativeDoc({
    appPrefix: 'code',
    docId: `${projectId}-${osWindow.data?.content || 'app.tsx'}`,
    sharedTypes: [
      { name: 'monaco', kind: 'Text' },
    ],
    undoTrackingTypes: ['monaco'],
  });

  const {
    files,
    activeFileId,
    setActiveFileId,
    fileName,
    code,
    loaded,
    refreshFiles,
    handleCodeChange,
    setCode
  } = useCodeEditorState(projectId, osWindow.data?.content, workspaceMode, roomId, currentUser, osWindow.data?.fileId);

  // UI States
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [agentOpen, setAgentOpen] = useState(false);
  const [activityTab, setActivityTab] = useState<ActivityTab>('explorer');
  const [isDeploying, setIsDeploying] = useState(false);
  const [editorReady, setEditorReady] = useState(false);

  const editorRef = useRef<any>(null);
  const bindingRef = useRef<any>(null);
  const monaco = useMonaco();
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  const handleEditorDidMount = (editor: any, monacoInstance: any) => {
    editorRef.current = editor;

    editor.onDidChangeCursorPosition((e: any) => {
      setCursorPosition({ line: e.position.lineNumber, column: e.position.column });
    });

    setEditorReady(true);
  };

  useEffect(() => {
    if (editorReady && workspaceMode === 'agency' && collab.synced && editorRef.current) {
       const yText = collab.sharedTypesRef.current.monaco;
       const wsProvider = collab.wsProviderRef.current;
       if (!yText || !wsProvider) return;

       if (bindingRef.current) {
         try { bindingRef.current.destroy(); } catch {}
         bindingRef.current = null;
       }

       const binding = new MonacoBinding(yText, editorRef.current.getModel(), new Set([editorRef.current]), wsProvider.awareness);
       bindingRef.current = binding;
    }
  }, [editorReady, workspaceMode, collab.synced, collab.connected]);

  // Cleanup: destroy MonacoBinding (Y.Doc + WS provider owned by useCollaborativeDoc)
  useEffect(() => {
    return () => {
      if (bindingRef.current) { bindingRef.current.destroy(); bindingRef.current = null; }
    };
  }, [roomId, workspaceMode]);

  useEffect(() => {
    const contextHandler = () => {
      window.dispatchEvent(new CustomEvent('os:context-response', {
        detail: {
          appId: osWindow.appId,
          context: `File: ${fileName}\nCode Snapshot:\n\`\`\`\n${code.substring(0, 500)}${code.length > 500 ? '\n... (truncated)' : ''}\n\`\`\``
        }
      }));
    };
    window.addEventListener('os:request-context', contextHandler);
    return () => window.removeEventListener('os:request-context', contextHandler);
  }, [osWindow.appId, fileName, code]);

  const handleDeploy = () => {
    setIsDeploying(true);
    setTimeout(() => {
       setIsDeploying(false);
       
        let executableCode = code;
        executableCode = executableCode.replace(/export default function (\w+)/, 'function $1');
        executableCode = executableCode.replace(/import .* from .*/g, '');
        // Escape </script> to prevent HTML injection breaking the template
        executableCode = executableCode.replace(/<\/script>/gi, '<\\/script>');
       
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
        <Sidebar 
          activityTab={activityTab} 
          setActivityTab={setActivityTab}
          files={files}
          activeFileId={activeFileId}
          setActiveFileId={setActiveFileId}
          refreshFiles={refreshFiles}
          setCode={setCode}
          projectId={projectId}
        />
        
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
           
            {!editorReady && (
            <div className="flex-1 flex flex-col gap-2 p-4 pt-8 min-h-0" style={{ height: terminalOpen ? "calc(100% - 200px)" : "100%" }}>
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-4 bg-[#2a2a2a]"
                  width={`${55 + (i % 3) * 15}%`}
                />
              ))}
            </div>
          )}
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
            className={cn("flex-1 min-h-0", !editorReady && "invisible absolute")}
         />

           <TerminalPanel terminalOpen={terminalOpen} setTerminalOpen={setTerminalOpen} projectId={projectId} />
        </div>

        <CopilotPanel agentOpen={agentOpen} setAgentOpen={setAgentOpen} />
      </div>
      
      <StatusBar cursorPosition={cursorPosition} fileName={fileName} />
    </div>
  );
}
