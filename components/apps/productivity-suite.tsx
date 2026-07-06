'use client';

import React, { useState, useEffect, useRef } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { FileText, Grid, Presentation, FileCode, Printer, Share2, Save, X, Type, Image as ImageIcon, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import DOMPurify from 'isomorphic-dompurify';
import { Storage } from '@/lib/storage';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
// @ts-ignore
import { Parser } from 'hot-formula-parser';

type AppType = 'word' | 'sheets' | 'slides' | 'pdf';

/**
 * Safely sanitize HTML using DOMPurify
 * Always validates DOMPurify is available before use
 */
function sanitizeHTML(html: string): string {
  if (!DOMPurify || typeof DOMPurify.sanitize !== 'function') {
    // Fallback: escape HTML if DOMPurify not available
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }
  return DOMPurify.sanitize(html);
}

export function ProductivitySuite({ window }: { window: OSWindow }) {
  const { performanceMode, currentUser, workspaceMode, setWorkspaceMode } = useOS();
  const [activeTab, setActiveTab] = useState<AppType>((window.data?.tab as AppType) || 'word');
  
  const projectId = window.data?.projectId || 'global';

  return (
    <div className="w-full h-full flex flex-col bg-white text-slate-800 font-sans shadow-2xl relative overflow-hidden">
      {/* Dynamic Background Noise for Heavy Mode */}
      {performanceMode === 'heavy' && (
        <div 
          className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none mix-blend-multiply" 
          style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }} 
        />
      )}

      {/* Ribbon Banner */}
      <div className="relative z-10 flex flex-col bg-slate-50 border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="flex items-center gap-1">
            {(['word', 'sheets', 'slides', 'pdf'] as AppType[]).map((app) => (
               <button
                 key={app}
                 onClick={() => setActiveTab(app)}
                 className={cn(
                   "px-4 py-1.5 text-xs font-medium rounded-t-lg transition-colors border border-transparent border-b-0 flex items-center min-w-[90px] justify-center text-center",
                   activeTab === app 
                     ? "bg-white text-blue-600 border-slate-200 shadow-[0_-2px_4px_rgba(0,0,0,0.02)]" 
                     : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
                 )}
               >
                 {app === 'word' && <div className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Word</div>}
                 {app === 'sheets' && <div className="flex items-center gap-1.5"><Grid className="w-3.5 h-3.5" /> Sheets</div>}
                 {app === 'slides' && <div className="flex items-center gap-1.5"><Presentation className="w-3.5 h-3.5" /> Slides</div>}
                 {app === 'pdf' && <div className="flex items-center gap-1.5"><FileCode className="w-3.5 h-3.5" /> PDF Reader</div>}
               </button>
            ))}
          </div>
          
          <button 
            onClick={() => setWorkspaceMode(workspaceMode === 'private' ? 'agency' : 'private')}
            className={cn("px-2 py-1 flex flex-col justify-center text-[9px] rounded-t-lg transition-colors uppercase font-bold tracking-wider leading-tight mb-[-1px] border border-transparent border-b-0", workspaceMode === 'agency' ? 'bg-white text-neon-blue border-slate-200' : 'text-slate-400 hover:text-slate-600')}
            title={workspaceMode === 'private' ? "Switch to Team Workspace" : "Switch to Personal Space"}
          >
            <span>{workspaceMode}</span>
            <span className="text-[7px] opacity-70">Context</span>
          </button>
        </div>
        
        {/* Toolbar */}
        <div className="flex items-center gap-4 px-4 py-2 bg-white border-t border-slate-200">
           <div className="flex items-center gap-1 border-r border-slate-200 pr-4">
             <button className="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="Save to local-first DB"><Save className="w-4 h-4" /></button>
             <button className="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="Print"><Printer className="w-4 h-4" /></button>
             <button className="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="Share via Self-Host"><Share2 className="w-4 h-4" /></button>
           </div>
           
           {activeTab === 'word' && (
             <div className="flex items-center gap-2">
               <select className="text-xs border border-slate-200 rounded px-2 py-1 outline-none bg-slate-50">
                 <option>Normal Text</option>
                 <option>Heading 1</option>
                 <option>Heading 2</option>
               </select>
               <select className="text-xs border border-slate-200 rounded px-2 py-1 outline-none bg-slate-50">
                 <option>Inter</option>
                 <option>Space Grotesk</option>
                 <option>JetBrains Mono</option>
               </select>
               <div className="flex items-center gap-1 px-2 border-l border-slate-200">
                 <button className="p-1 hover:bg-slate-100 rounded font-bold text-slate-700">B</button>
                 <button className="p-1 hover:bg-slate-100 rounded italic text-slate-700">I</button>
                 <button className="p-1 hover:bg-slate-100 rounded underline text-slate-700">U</button>
               </div>
             </div>
           )}

           {activeTab === 'sheets' && (
             <div className="flex items-center gap-2 w-full max-w-md">
               <div className="flex items-center gap-2 text-xs font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200 flex-1">
                 <span className="text-slate-400">fx</span>
                 <input type="text" className="bg-transparent outline-none flex-1 font-mono text-slate-700" placeholder="=SUM(A1:A10)" />
               </div>
             </div>
           )}

          {activeTab === 'slides' && (
            <div className="flex items-center gap-2">
               <button className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1 rounded transition-colors font-medium">
                 <Presentation className="w-3.5 h-3.5" /> Present
               </button>
               <div className="w-px h-4 bg-slate-200 mx-2" />
               <button className="p-1 hover:bg-slate-100 rounded"><Type className="w-4 h-4 text-slate-600" /></button>
               <button className="p-1 hover:bg-slate-100 rounded"><ImageIcon className="w-4 h-4 text-slate-600" /></button>
            </div>
          )}
        </div>
      </div>

      {/* Editor Content Area */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="flex-1 relative z-10 overflow-hidden bg-slate-100"
        >
          {activeTab === 'word' && <WordEditor performanceMode={performanceMode} workspaceMode={workspaceMode} projectId={projectId} currentUser={currentUser} />}
          {activeTab === 'sheets' && <SheetsEditor workspaceMode={workspaceMode} projectId={projectId} currentUser={currentUser} />}
          {activeTab === 'slides' && <SlidesEditor workspaceMode={workspaceMode} projectId={projectId} currentUser={currentUser} />}
          {activeTab === 'pdf' && <PdfEditor initialUrl={window.data?.url} />}
        </motion.div>
      </AnimatePresence>

      {/* Status Bar */}
      <div className="h-6 shrink-0 bg-blue-600 text-white flex items-center justify-between px-3 text-[10px] uppercase tracking-wider relative z-10 w-full overflow-hidden">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Saved locally (IndexedDB)</span>
        </div>
        <div className="flex items-center gap-4">
           {activeTab === 'word' && <span>Word Processor Active</span>}
           {activeTab === 'sheets' && <span>Cell: B4</span>}
           {activeTab === 'slides' && <span>Slide 1 of 5</span>}
        </div>
      </div>
    </div>
  );
}

function WordEditor({ performanceMode, workspaceMode, projectId, currentUser }: { performanceMode: 'light' | 'heavy', workspaceMode: 'private' | 'agency', projectId: string, currentUser: any }) {
  const [content, setContent] = useState<string>("Loading document...");
  const [loaded, setLoaded] = useState(false);
  const isSyncingRef = useRef(false);
  const latestContentRef = useRef("Loading document...");
  const lastSavedContentRef = useRef<string | null>(null);

  const roomId = `word-${projectId}`;
  const storageKey = `anichisom_os_word_${projectId}`;

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    onUpdate: ({ editor }) => {
       const newContent = editor.getHTML();
       handleInput(newContent);
    },
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(false);

    Storage.getDoc('docs', roomId, workspaceMode).then((saved: any) => {
        let initialContent = `<h1>Manifesto for the Edge</h1><p>The future of software is not centralized. It is distributed, local-first, and owned by the user.</p><h2>Self-Hostable Infrastructure</h2><p>Users who prefer data independence can pull the open-source code via Docker.</p>`;
        
        if (workspaceMode === 'private' && saved && typeof saved === 'string') {
          initialContent = saved;
        } else if (saved && saved.content !== undefined) {
          initialContent = saved.content;
        }
        
        setContent(initialContent);
        latestContentRef.current = initialContent;
        if (editor) editor.commands.setContent(initialContent);
        setLoaded(true);
    });

    const unsub = Storage.subscribe('docs', roomId, workspaceMode, (state: any) => {
       if (state) {
         const remoteData = workspaceMode === 'private' ? state : state.content;
         if (remoteData !== undefined && remoteData !== latestContentRef.current && remoteData !== lastSavedContentRef.current) {
             isSyncingRef.current = true;
             setContent(remoteData);
             latestContentRef.current = remoteData;
             if (editor) {
               // Get cursor position before update
               const { from, to } = editor.state.selection;
               editor.commands.setContent(remoteData, { emitUpdate: false });
               // Restore cursor
               editor.commands.setTextSelection({ from, to });
             }
         }
       }
    });

    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceMode, projectId, currentUser, roomId, editor]);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInput = (newContent: string) => {
    setContent(newContent);
    latestContentRef.current = newContent;
    if (isSyncingRef.current) {
        isSyncingRef.current = false;
        return;
    }
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
       lastSavedContentRef.current = newContent;
       if (workspaceMode === 'private') {
           Storage.setDoc('docs', roomId, newContent, workspaceMode);
       } else {
           Storage.setDoc('docs', roomId, { content: newContent, workspaceMode: 'shared' }, workspaceMode);
       }
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  if (!loaded) return <div className="p-8 text-slate-500">Loading editor...</div>;

  return (
    <div className="w-full h-full overflow-auto p-4 md:p-8 flex justify-center custom-scrollbar">
      <div 
        className={cn(
          "w-full max-w-[816px] min-h-[1056px] bg-white outline-none p-12 lg:p-24 transition-all duration-300 prose prose-slate max-w-none tiptap-editor",
          performanceMode === 'heavy' ? "shadow-2xl border border-slate-200" : "shadow-sm border border-slate-100"
        )}
      >
        <EditorContent editor={editor} />
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .tiptap-editor .ProseMirror:focus { outline: none; }
        .tiptap-editor .ProseMirror > * + * { margin-top: 0.75em; }
        .tiptap-editor .ProseMirror ul, .tiptap-editor .ProseMirror ol { padding: 0 1rem; }
        .tiptap-editor .ProseMirror blockquote { border-left: 3px solid rgba(13, 13, 13, 0.1); padding-left: 1rem; }
      `}} />
    </div>
  );
}

function SheetsEditor({ workspaceMode, projectId, currentUser }: { workspaceMode: 'private' | 'agency', projectId: string, currentUser: any }) {
  const [data, setData] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const isSyncingRef = useRef(false);
  const latestDataRef = useRef<Record<string, string>>({});
  const lastSavedDataRef = useRef<string | null>(null);
  
  const parser = useRef(new Parser()).current;

  // Configure formula parser to resolve cell coordinates (e.g. A1, B2) to values from data state
  useEffect(() => {
    parser.on('callCellValue', (cellCoord: any, done: any) => {
       const col = cellCoord.column.index;
       const row = cellCoord.row.index + 1;
       const cellId = `${String.fromCharCode(65 + col)}${row}`;
       
       let val = data[cellId];
       if (val && val.startsWith('=')) {
          // nested evaluation is risky but simple for basic usage
          const res = parser.parse(val.substring(1));
          val = res.error ? res.error : res.result;
       }
       done(val || '');
    });
  }, [data, parser]);

  const roomId = `sheets-${projectId}`;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(false);

    Storage.getDoc('docs', roomId, workspaceMode).then((saved: any) => {
        if (workspaceMode === 'private' && saved) {
          setData(saved);
          latestDataRef.current = saved;
        } else if (saved && saved.data !== undefined) {
          setData(saved.data);
          latestDataRef.current = saved.data;
        }
        setLoaded(true);
    });

    const unsub = Storage.subscribe('docs', roomId, workspaceMode, (state: any) => {
       if (state) {
         const remoteData = workspaceMode === 'private' ? state : state.data;
         const remoteDataStr = JSON.stringify(remoteData);
         if (remoteData !== undefined && remoteDataStr !== JSON.stringify(latestDataRef.current) && remoteDataStr !== lastSavedDataRef.current) {
             isSyncingRef.current = true;
             setData(remoteData);
             latestDataRef.current = remoteData;
         }
       }
    });

    return () => unsub();
  }, [workspaceMode, projectId, currentUser, roomId]);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (cell: string, value: string) => {
    const newData = { ...data, [cell]: value };
    setData(newData);
    latestDataRef.current = newData;
    if (isSyncingRef.current) {
        isSyncingRef.current = false;
        return;
    }
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
        lastSavedDataRef.current = JSON.stringify(newData);
        if (workspaceMode === 'private') {
           Storage.setDoc('docs', roomId, newData, workspaceMode);
        } else {
           Storage.setDoc('docs', roomId, { data: newData, workspaceMode: 'agency' }, workspaceMode);
        }
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const cols = Array.from({ length: 15 }, (_, i) => String.fromCharCode(65 + i));
  const rows = Array.from({ length: 30 }, (_, i) => i + 1);

  if (!loaded) return <div className="p-8 text-slate-500">Loading sheets...</div>;

  return (
    <div className="w-full h-full overflow-auto bg-white flex flex-col custom-scrollbar text-xs">
      {/* Headers */}
      <div className="flex sticky top-0 bg-slate-50 border-b border-slate-200 z-10 w-max">
        <div className="w-10 h-7 shrink-0 border-r border-slate-200 bg-slate-100" />
        {cols.map(c => (
          <div key={c} className="w-24 h-7 shrink-0 border-r border-slate-200 flex items-center justify-center font-medium text-slate-500">{c}</div>
        ))}
      </div>
      
      {/* Body */}
      <div className="flex flex-col w-max">
        {rows.map(r => (
          <div key={r} className="flex border-b border-slate-100 group">
            <div className="w-10 h-6 shrink-0 border-r border-slate-200 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600 sticky left-0 z-10">
              {r}
            </div>
            {cols.map(c => {
              const cellId = `${c}${r}`;
              const rawValue = data[cellId] !== undefined ? data[cellId] : (r === 1 ? `Header ${c}` : r === 2 && c === 'A' ? '1250.00' : '');
              
              let displayValue = rawValue;
              if (activeCell !== cellId && typeof rawValue === 'string' && rawValue.startsWith('=')) {
                 const res = parser.parse(rawValue.substring(1));
                 displayValue = res.error ? res.error : res.result?.toString() || '';
              }
              
              return (
              <div key={c} className="w-24 h-6 shrink-0 border-r border-slate-100 relative">
                <input 
                  value={activeCell === cellId ? rawValue : displayValue}
                  onChange={(e) => handleChange(cellId, e.target.value)}
                  onFocus={() => setActiveCell(cellId)}
                  onBlur={() => setActiveCell(null)}
                  className={cn(
                     "w-full h-full outline-none px-1 py-0.5 text-slate-700 focus:bg-blue-50/50 focus:ring-1 focus:ring-blue-500 focus:ring-inset",
                     r === 1 ? 'font-bold bg-slate-50' : 'bg-transparent'
                  )}
                />
              </div>
            )})}
          </div>
        ))}
      </div>
    </div>
  );
}

function SlidesEditor({ workspaceMode, projectId, currentUser }: { workspaceMode: 'private' | 'agency', projectId: string, currentUser: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const isSyncingRef = useRef(false);

  const roomId = `slides-fabric-${projectId}`;

  useEffect(() => {
    let active = true;
    let unsub = () => {};

    import('fabric').then((fabric) => {
      if (!active || !canvasRef.current) return;
      
      const canvas = new fabric.Canvas(canvasRef.current, {
         width: 768,
         height: 432,
         backgroundColor: '#ffffff'
      });
      fabricCanvasRef.current = canvas;

      const setupDefault = () => {
         const title = new fabric.IText('Project "Edge"', {
            left: 384,
            top: 150,
            originX: 'center',
            originY: 'center',
            fontFamily: 'sans-serif',
            fontSize: 48,
            fontWeight: 'bold',
            fill: '#1e293b'
         });
         const subtitle = new fabric.IText('An infrastructure presentation explaining local-first architecture and node scaling.', {
            left: 384,
            top: 250,
            originX: 'center',
            originY: 'center',
            fontFamily: 'sans-serif',
            fontSize: 20,
            fill: '#64748b',
            textAlign: 'center'
         });
         canvas.add(title, subtitle);
         canvas.renderAll();
      };

      Storage.getDoc('docs', roomId, workspaceMode).then((saved: any) => {
        if (!active) return;
        const target = workspaceMode === 'private' ? saved : (saved?.canvasState ? saved : null);
        if (target && target.canvasState) {
           const p = canvas.loadFromJSON(target.canvasState, () => {
               if (!p || !p.then) {
                  canvas.renderAll();
                  setLoaded(true);
               }
           });
           if (p && p.then) {
              p.then(() => {
                 canvas.renderAll();
                 setLoaded(true);
              });
           }
        } else {
           setupDefault();
           setLoaded(true);
        }
      });

      unsub = Storage.subscribe('docs', roomId, workspaceMode, (state: any) => {
         if (state) {
            const target = workspaceMode === 'private' ? state : state;
            if (target.canvasState && !isSyncingRef.current) {
               isSyncingRef.current = true;
               const p = canvas.loadFromJSON(target.canvasState, () => {
                   if (!p || !p.then) {
                      canvas.renderAll();
                      setTimeout(() => { isSyncingRef.current = false; }, 100);
                   }
               });
               if (p && p.then) {
                  p.then(() => {
                     canvas.renderAll();
                     setTimeout(() => { isSyncingRef.current = false; }, 100);
                  });
               }
            }
         }
      });

      const handleModify = () => {
         if (isSyncingRef.current) return;
         isSyncingRef.current = true;
         const state = canvas.toJSON();
         
         if (workspaceMode === 'private') {
            Storage.setDoc('docs', roomId, { canvasState: state }, workspaceMode);
         } else {
            Storage.setDoc('docs', roomId, { canvasState: state, workspaceMode: 'agency' }, workspaceMode);
         }
         
         setTimeout(() => { isSyncingRef.current = false; }, 100);
      };

      canvas.on('object:modified', handleModify);
      canvas.on('text:changed', handleModify);
    });
    
    return () => { 
      active = false; 
      unsub();
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }
    };
  }, [workspaceMode, projectId, roomId]);

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* Thumbnail Sidebar */}
      <div className="w-48 bg-slate-50 border-r border-slate-200 flex flex-col overflow-y-auto p-2 gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex gap-2">
            <span className="text-[10px] font-bold text-slate-400 mt-1">{s}</span>
            <div className={cn(
              "w-full aspect-video bg-white border rounded shadow-sm flex items-center justify-center cursor-pointer",
              s === 1 ? "border-amber-400 ring-1 ring-amber-400 focus:outline-none" : "border-slate-200"
            )}>
               <div className="flex flex-col items-center gap-1 w-full p-2">
                  <div className="w-3/4 h-1.5 bg-slate-200 rounded" />
                  <div className="w-1/2 h-1 bg-slate-100 rounded" />
               </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Main Canvas */}
      <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-8 relative">
         {!loaded && (
             <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 z-10">
                <div className="text-slate-500 animate-pulse">Loading canvas engine...</div>
             </div>
         )}
         <div className="shadow-2xl bg-white ring-1 ring-slate-200 flex items-center justify-center overflow-hidden">
            <canvas ref={canvasRef} />
         </div>
      </div>
    </div>
  );
}

function PdfEditor({ initialUrl }: { initialUrl?: string }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(initialUrl || null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
       const url = URL.createObjectURL(file);
       setPdfUrl(url);
    } else if (file) {
      alert("Please upload a valid PDF file.");
    }
  };

  return (
     <div className="w-full h-full bg-neutral-800 flex flex-col items-center justify-center overflow-auto">
        {!pdfUrl ? (
           <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-12 flex flex-col items-center max-w-sm text-center">
             <FileCode className="w-12 h-12 text-blue-500 mb-4" />
             <h2 className="text-xl font-medium text-white mb-2">Open PDF Document</h2>
             <p className="text-neutral-400 text-sm mb-6">Select a standard PDF file to read within the OS environment.</p>
             <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors">
                Choose File
                <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
             </label>
           </div>
        ) : (
           <div className="w-full h-full flex flex-col">
             <div className="bg-neutral-900 p-2 flex shrink-0 items-center gap-2 border-b border-neutral-700">
                <button 
                  onClick={() => setPdfUrl(null)} 
                  className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-xs text-neutral-300 border border-neutral-600"
                >
                  Close Document
                </button>
             </div>
             <iframe src={pdfUrl} className="w-full flex-1 border-none bg-white" title="PDF Viewer" />
           </div>
        )}
     </div>
  )
}
