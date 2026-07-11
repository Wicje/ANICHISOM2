'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { FileText, Grid, Presentation, FileCode, Printer, Share2, Save, X, Type, Image as ImageIcon, Search, Download, Plus, Trash2, Pencil, Copy, PanelLeft, Undo2, Redo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import DOMPurify from 'isomorphic-dompurify';
import { Storage } from '@/lib/storage';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Collaboration from '@tiptap/extension-collaboration';
// @ts-ignore
import { Parser } from 'hot-formula-parser';
import { useCollaborativeDoc, CollaborativeDocState } from '@/lib/hooks/useCollaborativeDoc';

type AppType = 'word' | 'sheets' | 'slides' | 'pdf';

interface DocMeta {
  id: string;
  title: string;
  type: AppType;
  updatedAt: number;
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadDataURL(filename: string, dataUrl: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

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

export function ProductivitySuite({ window: osWindow }: { window: OSWindow }) {
  const { performanceMode, currentUser, workspaceMode, setWorkspaceMode } = useOS();
  const [activeTab, setActiveTab] = useState<AppType>((osWindow.data?.tab as AppType) || 'word');
  const [wordEditor, setWordEditor] = useState<Editor | null>(null);
  const sheetsDataRef = useRef<Record<string, string>>({});
  const fabricCanvasRef = useRef<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [docList, setDocList] = useState<DocMeta[]>([]);
  const [projectId, setProjectId] = useState(osWindow.data?.projectId || osWindow.id);
  const [docTitle, setDocTitle] = useState('Untitled Document');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const collab = useCollaborativeDoc({
    appPrefix: 'office',
    docId: projectId,
    sharedTypes: [
      { name: 'content', kind: 'XmlFragment' },
      { name: 'cells', kind: 'Map' },
      { name: 'canvas', kind: 'Map' },
    ],
    undoTrackingTypes: ['content', 'cells'],
  });

  useEffect(() => {
    Storage.getDoc('meta', `doc_index_${workspaceMode}`, workspaceMode).then((saved: any) => {
      if (saved && saved.documents) {
        setDocList(saved.documents);
        const current = saved.documents.find((d: DocMeta) => d.id === projectId);
        if (current) setDocTitle(current.title);
      } else {
        const initial: DocMeta = { id: projectId, title: 'Untitled Document', type: activeTab, updatedAt: Date.now() };
        setDocList([initial]);
        Storage.setDoc('meta', `doc_index_${workspaceMode}`, { documents: [initial] }, workspaceMode);
      }
    });
  }, [workspaceMode]);

  const saveDocIndex = (docs: DocMeta[]) => {
    setDocList(docs);
    Storage.setDoc('meta', `doc_index_${workspaceMode}`, { documents: docs }, workspaceMode);
  };

  const createNewDoc = () => {
    const newId = `doc-${Date.now()}`;
    const newDoc: DocMeta = { id: newId, title: 'New Document', type: activeTab, updatedAt: Date.now() };
    const newList = [...docList, newDoc];
    saveDocIndex(newList);
    setProjectId(newId);
    setDocTitle('New Document');
    window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Document Created', message: 'A new document has been created.' } }));
  };

  const deleteDoc = (docId: string) => {
    if (docList.length <= 1) {
      window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Cannot Delete', message: 'You must have at least one document.' } }));
      return;
    }
    const newList = docList.filter(d => d.id !== docId);
    saveDocIndex(newList);
    Storage.deleteDoc('docs', `word-${docId}`, workspaceMode);
    Storage.deleteDoc('docs', `sheets-${docId}`, workspaceMode);
    Storage.deleteDoc('docs', `slides-fabric-${docId}`, workspaceMode);
    if (docId === projectId) {
      setProjectId(newList[0].id);
      setDocTitle(newList[0].title);
    }
    window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Document Deleted', message: 'The document has been removed.' } }));
  };

  const renameDoc = (docId: string, newTitle: string) => {
    const newList = docList.map(d => d.id === docId ? { ...d, title: newTitle, updatedAt: Date.now() } : d);
    saveDocIndex(newList);
    if (docId === projectId) setDocTitle(newTitle);
    setRenaming(null);
  };

  const duplicateDoc = (docId: string) => {
    const source = docList.find(d => d.id === docId);
    if (!source) return;
    const newId = `doc-${Date.now()}`;
    const newDoc: DocMeta = { id: newId, title: `${source.title} (Copy)`, type: source.type, updatedAt: Date.now() };
    saveDocIndex([...docList, newDoc]);
    // Copy word content
    Storage.getDoc('docs', `word-${docId}`, workspaceMode).then((data: any) => {
      if (data) Storage.setDoc('docs', `word-${newId}`, data, workspaceMode);
    });
    Storage.getDoc('docs', `sheets-${docId}`, workspaceMode).then((data: any) => {
      if (data) Storage.setDoc('docs', `sheets-${newId}`, data, workspaceMode);
    });
    Storage.getDoc('docs', `slides-fabric-${docId}`, workspaceMode).then((data: any) => {
      if (data) Storage.setDoc('docs', `slides-fabric-${newId}`, data, workspaceMode);
    });
    window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Document Duplicated', message: 'A copy has been created.' } }));
  };

  const switchDoc = (docId: string) => {
    const doc = docList.find(d => d.id === docId);
    if (!doc || docId === projectId) return;
    // Update current doc's timestamp
    const newList = docList.map(d => d.id === projectId ? { ...d, updatedAt: Date.now() } : d);
    saveDocIndex(newList);
    setProjectId(docId);
    setDocTitle(doc.title);
    if (doc.type) setActiveTab(doc.type);
  };

  const handleDocTitleChange = (newTitle: string) => {
    setDocTitle(newTitle);
    const newList = docList.map(d => d.id === projectId ? { ...d, title: newTitle, updatedAt: Date.now() } : d);
    saveDocIndex(newList);
  };

  const handleExport = () => {
    if (activeTab === 'word') {
      if (!wordEditor) return;
      const html = wordEditor.getHTML();
      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Document</title><style>body{font-family:Inter,sans-serif;max-width:816px;margin:40px auto;padding:0 24px;line-height:1.6;color:#1e293b;}h1,h2{margin-top:1.5em;}blockquote{border-left:3px solid rgba(13,13,13,0.1);padding-left:1rem;margin-left:0;}</style></head><body>${html}</body></html>`;
      downloadFile(`${projectId}.html`, fullHtml, 'text/html');
      window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Exported', message: 'Word document exported as HTML.' } }));
    } else if (activeTab === 'sheets') {
      const data = sheetsDataRef.current;
      const cols = Array.from({ length: 15 }, (_, i) => String.fromCharCode(65 + i));
      const rows = Array.from({ length: 30 }, (_, i) => i + 1);
      const csvLines = rows.map(r => cols.map(c => data[`${c}${r}`] || '').join(','));
      downloadFile(`${projectId}.csv`, csvLines.join('\n'), 'text/csv');
      window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Exported', message: 'Sheet exported as CSV.' } }));
    } else if (activeTab === 'slides') {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 2 });
      downloadDataURL(`${projectId}.png`, dataUrl);
      window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Exported', message: 'Slide exported as PNG.' } }));
    }
  };

  return (
    <div className="w-full h-full flex bg-white text-slate-800 font-sans shadow-2xl relative overflow-hidden">
      {/* Document Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 220, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col overflow-hidden relative z-20"
          >
            <div className="p-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Documents</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-200"><PanelLeft className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {docList.map(doc => (
                <div key={doc.id} className={cn(
                  "group/doc flex items-center gap-2 px-2 py-1.5 rounded-lg mb-1 cursor-pointer transition-colors",
                  doc.id === projectId ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200 text-slate-700"
                )} onClick={() => switchDoc(doc.id)}>
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  {renaming === doc.id ? (
                    <input
                      className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') renameDoc(doc.id, renameValue); if (e.key === 'Escape') setRenaming(null); }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="flex-1 text-xs font-medium truncate">{doc.title}</span>
                  )}
                  <div className="opacity-0 group-hover/doc:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
                    <button className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-white/50" title="Rename" onClick={(e) => { e.stopPropagation(); setRenaming(doc.id); setRenameValue(doc.title); }}>
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-white/50" title="Duplicate" onClick={(e) => { e.stopPropagation(); duplicateDoc(doc.id); }}>
                      <Copy className="w-3 h-3" />
                    </button>
                    <button className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-white/50" title="Delete" onClick={(e) => { e.stopPropagation(); deleteDoc(doc.id); }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-slate-200">
              <button onClick={createNewDoc} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> New Document
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!sidebarOpen && (
        <button onClick={() => setSidebarOpen(true)} className="absolute left-2 top-2 z-30 p-1.5 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 shadow-sm transition-colors" title="Open document sidebar">
          <PanelLeft className="w-4 h-4" />
        </button>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
      {/* Dynamic Background Noise for Heavy Mode */}
      {performanceMode === 'heavy' && (
        <div
          className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none mix-blend-multiply"
          style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}
        />
      )}

      {/* Ribbon Banner */}
      <div className="relative z-10 flex flex-col bg-slate-50 border-b border-slate-200 shrink-0">
        {/* Document Title */}
        <div className="flex items-center gap-2 px-4 py-1 border-b border-slate-100">
          <input
            className="text-sm font-medium bg-transparent outline-none text-slate-700 flex-1 min-w-0"
            value={docTitle}
            onChange={(e) => handleDocTitleChange(e.target.value)}
          />
        </div>
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
             <button className="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="Save to local-first DB" onClick={() => window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Document Saved', message: 'Your work has been securely saved.' }}))}><Save className="w-4 h-4" /></button>
             <button className="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="Print" onClick={() => window.print()}><Printer className="w-4 h-4" /></button>
             <button className="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="Share via Self-Host" onClick={() => window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Share Link Created', message: 'Link copied to clipboard.' }}))}><Share2 className="w-4 h-4" /></button>
             <button className="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="Export" onClick={handleExport}><Download className="w-4 h-4" /></button>
           </div>
           
           {activeTab === 'word' && (
             <div className="flex items-center gap-2">
               <select
                 className="text-xs border border-slate-200 rounded px-2 py-1 outline-none bg-slate-50"
                 value={
                   wordEditor?.isActive('heading', { level: 1 }) ? 'h1'
                   : wordEditor?.isActive('heading', { level: 2 }) ? 'h2'
                   : 'normal'
                 }
                 onChange={(e) => {
                   if (!wordEditor) return;
                   const val = e.target.value;
                   if (val === 'normal') {
                     wordEditor.chain().focus().setParagraph().run();
                   } else if (val === 'h1') {
                     wordEditor.chain().focus().toggleHeading({ level: 1 }).run();
                   } else if (val === 'h2') {
                     wordEditor.chain().focus().toggleHeading({ level: 2 }).run();
                   }
                 }}
               >
                 <option value="normal">Normal Text</option>
                 <option value="h1">Heading 1</option>
                 <option value="h2">Heading 2</option>
               </select>
               <select
                 className="text-xs border border-slate-200 rounded px-2 py-1 outline-none bg-slate-50"
                 value={wordEditor?.getAttributes('textStyle').fontFamily || 'Inter'}
                 onChange={(e) => {
                   if (!wordEditor) return;
                   wordEditor.chain().focus().setFontFamily(e.target.value).run();
                 }}
               >
                 <option value="Inter">Inter</option>
                 <option value="Space Grotesk">Space Grotesk</option>
                 <option value="JetBrains Mono">JetBrains Mono</option>
               </select>
               <div className="flex items-center gap-1 px-2 border-l border-slate-200">
                 <button
                   className={cn("p-1 hover:bg-slate-100 rounded font-bold text-slate-700", wordEditor?.isActive('bold') && "bg-slate-200 text-blue-600")}
                   onClick={() => wordEditor?.chain().focus().toggleBold().run()}
                 >B</button>
                 <button
                   className={cn("p-1 hover:bg-slate-100 rounded italic text-slate-700", wordEditor?.isActive('italic') && "bg-slate-200 text-blue-600")}
                   onClick={() => wordEditor?.chain().focus().toggleItalic().run()}
                 >I</button>
                 <button
                   className={cn("p-1 hover:bg-slate-100 rounded underline text-slate-700", wordEditor?.isActive('underline') && "bg-slate-200 text-blue-600")}
                   onClick={() => wordEditor?.chain().focus().toggleUnderline().run()}
                 >U</button>
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
          {activeTab === 'word' && <WordEditor performanceMode={performanceMode} workspaceMode={workspaceMode} projectId={projectId} currentUser={currentUser} onEditorReady={setWordEditor} collab={collab} />}
          {activeTab === 'sheets' && <SheetsEditor workspaceMode={workspaceMode} projectId={projectId} currentUser={currentUser} dataRef={sheetsDataRef} collab={collab} />}
          {activeTab === 'slides' && <SlidesEditor workspaceMode={workspaceMode} projectId={projectId} currentUser={currentUser} canvasRef={fabricCanvasRef} collab={collab} />}
          {activeTab === 'pdf' && <PdfEditor initialUrl={osWindow.data?.url} />}
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
    </div>
  );
}

function WordEditor({ performanceMode, workspaceMode, projectId, currentUser, onEditorReady, collab }: { performanceMode: 'light' | 'heavy', workspaceMode: 'private' | 'agency', projectId: string, currentUser: any, onEditorReady: (editor: Editor | null) => void, collab: CollaborativeDocState }) {
  const defaultContent = '<h1>Manifesto for the Edge</h1><p>The future of software is not centralized. It is distributed, local-first, and owned by the user.</p><h2>Self-Hostable Infrastructure</h2><p>Users who prefer data independence can pull the open-source code via Docker.</p>';

  // Wait for Yjs sync — only create the editor once the Collaboration fragment is available
  const fragment = collab.synced ? collab.sharedTypesRef.current.content : null;

  // Build extensions: StarterKit (without UndoRedo) + Collaboration bound to Y.XmlFragment
  const extensions = useMemo(() => {
    if (!fragment) return [StarterKit, Underline, TextStyle, FontFamily];
    return [
      StarterKit.configure({ undoRedo: false }),
      Underline,
      TextStyle,
      FontFamily,
      Collaboration.configure({ fragment }),
    ];
  }, [fragment]);

  const editor = useEditor({
    extensions,
    content: fragment ? undefined : defaultContent,
    immediatelyRender: !!fragment, // Create immediately once collab is ready
    onUpdate: ({ editor }) => {
       onEditorReady(editor);
    },
    onSelectionUpdate: ({ editor }) => {
       onEditorReady(editor);
    },
  }, [extensions]); // Recreate editor when extensions change (collab sync triggers this)

  // Seed default content into the Y.XmlFragment if it's empty
  useEffect(() => {
    if (!editor || !fragment) return;
    if (fragment.length === 0) {
      editor.commands.setContent(defaultContent);
    }
    onEditorReady(editor);
  }, [editor, fragment]);

  useEffect(() => {
    onEditorReady(editor);
    return () => onEditorReady(null);
  }, [editor, onEditorReady]);

  if (!collab.synced || !editor) return <div className="p-8 text-slate-500">Loading collaborative editor...</div>;

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
    </div>
  );
}

function SheetsEditor({ workspaceMode, projectId, currentUser, dataRef, collab }: { workspaceMode: 'private' | 'agency', projectId: string, currentUser: any, dataRef: React.MutableRefObject<Record<string, string>>, collab: CollaborativeDocState }) {
  const [data, setData] = useState<Record<string, string>>({});
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const observeListenerRef = useRef<any>(null);
  const YRef = useRef<any>(null);

  const parser = useRef(new Parser()).current;

  // Keep parent ref synced for export
  useEffect(() => {
    dataRef.current = data;
  }, [data, dataRef]);

  // Configure formula parser to resolve cell coordinates (e.g. A1, B2) to values from data state
  useEffect(() => {
    parser.on('callCellValue', (cellCoord: any, done: any) => {
       const col = cellCoord.column.index;
       const row = cellCoord.row.index + 1;
       const cellId = `${String.fromCharCode(65 + col)}${row}`;

       let val = data[cellId];
       if (val && val.startsWith('=')) {
          const res = parser.parse(val.substring(1));
          val = res.error ? res.error : res.result;
       }
       done(val || '');
    });
  }, [data, parser]);

  // Sync Y.Map -> React state when synced
  useEffect(() => {
    if (!collab.synced) return;

    const cellsMap = collab.sharedTypesRef.current.cells;
    if (!cellsMap) return;

    // Load initial data from Y.Map
    const initial: Record<string, string> = {};
    cellsMap.forEach((value: any, key: string) => {
      initial[key] = value;
    });
    setData(initial);
    dataRef.current = initial;

    // Observe Y.Map changes and sync to React state
    const observer = () => {
      const updated: Record<string, string> = {};
      cellsMap.forEach((value: any, key: string) => {
        updated[key] = value;
      });
      setData(updated);
      dataRef.current = updated;
    };
    cellsMap.observe(observer);
    observeListenerRef.current = observer;

    return () => {
      if (observeListenerRef.current) {
        cellsMap.unobserve(observeListenerRef.current);
        observeListenerRef.current = null;
      }
    };
  }, [collab.synced, collab.sharedTypesRef, dataRef]);

  // Load Yjs module for direct Y.Map mutations
  useEffect(() => {
    import('yjs').then((mod) => {
      YRef.current = mod;
    });
  }, []);

  const handleChange = (cell: string, value: string) => {
    const cellsMap = collab.sharedTypesRef.current.cells;
    if (!cellsMap || !YRef.current) return;

    // Write to Y.Map — this triggers the observer above to update React state
    cellsMap.set(cell, value);
  };

  const cols = Array.from({ length: 15 }, (_, i) => String.fromCharCode(65 + i));
  const rows = Array.from({ length: 30 }, (_, i) => i + 1);

  if (!collab.synced) return <div className="p-8 text-slate-500">Loading collaborative sheets...</div>;

  return (
    <div
      className="w-full h-full overflow-auto bg-white flex flex-col custom-scrollbar text-xs"
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); collab.undo(); }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); collab.redo(); }
      }}
      tabIndex={0}
    >
      {/* Undo/Redo toolbar */}
      <div className="flex items-center gap-1 sticky top-0 bg-slate-50 border-b border-slate-200 z-20 px-2 py-1">
        <button onClick={() => collab.undo()} disabled={!collab.canUndo} className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors" title="Undo (Ctrl+Z)">
          <Undo2 className="w-3.5 h-3.5 text-slate-600" />
        </button>
        <button onClick={() => collab.redo()} disabled={!collab.canRedo} className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors" title="Redo (Ctrl+Shift+Z)">
          <Redo2 className="w-3.5 h-3.5 text-slate-600" />
        </button>
      </div>
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

function SlidesEditor({ workspaceMode, projectId, currentUser, canvasRef, collab }: { workspaceMode: 'private' | 'agency', projectId: string, currentUser: any, canvasRef: React.MutableRefObject<any>, collab: CollaborativeDocState }) {
  const localCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const isSyncingRef = useRef(false);
  // Fabric canvas state is too complex for Yjs UndoManager to track granularly — keep snapshot undo/redo
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const previousStateRef = useRef<string>('');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const canvasObserverRef = useRef<any>(null);

  useEffect(() => {
    let active = true;

    import('fabric').then((fabric) => {
      if (!active || !localCanvasRef.current) return;

      const canvas = new fabric.Canvas(localCanvasRef.current, {
         width: 768,
         height: 432,
         backgroundColor: '#ffffff'
      });
      fabricCanvasRef.current = canvas;
      canvasRef.current = canvas;

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

      // Wait for collab sync then load canvas state from Y.Map
      const waitForSync = () => {
        if (!collab.synced || !active) return;

        const canvasMap = collab.sharedTypesRef.current.canvas;
        if (!canvasMap) {
          setupDefault();
          previousStateRef.current = JSON.stringify(canvas.toJSON());
          // Write initial canvas state to Y.Map
          canvasMap?.set('state', JSON.stringify(canvas.toJSON()));
          setLoaded(true);
          return;
        }

        const savedState = canvasMap.get('state');
        if (savedState) {
           const p = canvas.loadFromJSON(JSON.parse(savedState as string), () => {
               if (!p || !p.then) {
                  canvas.renderAll();
                  previousStateRef.current = JSON.stringify(canvas.toJSON());
                  setLoaded(true);
               }
           });
           if (p && p.then) {
              p.then(() => {
                 canvas.renderAll();
                 previousStateRef.current = JSON.stringify(canvas.toJSON());
                 setLoaded(true);
              });
           }
        } else {
           setupDefault();
           previousStateRef.current = JSON.stringify(canvas.toJSON());
           canvasMap.set('state', JSON.stringify(canvas.toJSON()));
           setLoaded(true);
        }

        // Observe Y.Map changes for remote canvas updates
        const observer = () => {
          const remoteState = canvasMap.get('state') as string | undefined;
          if (!remoteState || isSyncingRef.current) return;
          if (canvas.getActiveObject()) return; // Don't overwrite during active editing

          const currentStateStr = JSON.stringify(canvas.toJSON());
          const remoteStateStr = remoteState;
          if (currentStateStr === remoteStateStr) return;

          isSyncingRef.current = true;
          const p = canvas.loadFromJSON(JSON.parse(remoteState), () => {
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
        };
        canvasMap.observe(observer);
        canvasObserverRef.current = observer;
      };

      if (collab.synced) {
        waitForSync();
      } else {
        // Will be triggered by the parent re-rendering when collab.synced flips
        const checkInterval = setInterval(() => {
          if (collab.synced && active) {
            clearInterval(checkInterval);
            waitForSync();
          }
        }, 200);
      }

      const handleModify = () => {
         if (isSyncingRef.current) return;

         undoStackRef.current.push(previousStateRef.current);
         redoStackRef.current = [];
         setCanUndo(true);
         setCanRedo(false);

         previousStateRef.current = JSON.stringify(canvas.toJSON());

         isSyncingRef.current = true;
         const stateStr = JSON.stringify(canvas.toJSON());
         const canvasMap = collab.sharedTypesRef.current.canvas;
         if (canvasMap) {
           canvasMap.set('state', stateStr);
         }

         setTimeout(() => { isSyncingRef.current = false; }, 100);
      };

      canvas.on('object:modified', handleModify);
      canvas.on('text:changed', handleModify);
    });

    return () => {
      active = false;
      canvasRef.current = null;
      if (canvasObserverRef.current && collab.sharedTypesRef.current.canvas) {
        collab.sharedTypesRef.current.canvas.unobserve(canvasObserverRef.current);
        canvasObserverRef.current = null;
      }
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }
    };
  }, [collab.synced, projectId]);

  const handleSlidesUndo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || undoStackRef.current.length === 0) return;

    redoStackRef.current.push(previousStateRef.current);
    const prevState = undoStackRef.current.pop()!;
    previousStateRef.current = prevState;

    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);

    isSyncingRef.current = true;
    const p = canvas.loadFromJSON(JSON.parse(prevState), () => {
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
  };

  const handleSlidesRedo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || redoStackRef.current.length === 0) return;

    undoStackRef.current.push(previousStateRef.current);
    const nextState = redoStackRef.current.pop()!;
    previousStateRef.current = nextState;

    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);

    isSyncingRef.current = true;
    const p = canvas.loadFromJSON(JSON.parse(nextState), () => {
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
  };

  if (!collab.synced) return <div className="p-8 text-slate-500">Loading collaborative slides...</div>;

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
      <div
        className="flex-1 overflow-auto bg-slate-100 flex flex-col items-center justify-center p-8 relative"
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleSlidesUndo(); }
          if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleSlidesRedo(); }
        }}
        tabIndex={0}
      >
         {/* Undo/Redo toolbar */}
         <div className="flex items-center gap-1 mb-4">
           <button onClick={handleSlidesUndo} disabled={!canUndo} className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors" title="Undo (Ctrl+Z)">
             <Undo2 className="w-4 h-4 text-slate-600" />
           </button>
           <button onClick={handleSlidesRedo} disabled={!canRedo} className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors" title="Redo (Ctrl+Shift+Z)">
             <Redo2 className="w-4 h-4 text-slate-600" />
           </button>
         </div>

         {!loaded && (
             <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 z-10">
                <div className="text-slate-500 animate-pulse">Loading canvas engine...</div>
             </div>
         )}
         <div className="shadow-2xl bg-white ring-1 ring-slate-200 flex items-center justify-center overflow-hidden">
            <canvas ref={localCanvasRef} />
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
