'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { FileText, Grid, Presentation, FileCode, Printer, Share2, Save, X, Type, Image as ImageIcon, Download, Plus, Trash2, Pencil, Copy, PanelLeft, Undo2, Redo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import DOMPurify from 'isomorphic-dompurify';
import { Storage } from '@/lib/storage';
import { FS } from '@/lib/fs';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Collaboration from '@tiptap/extension-collaboration';
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
  const canvasRef = useRef<any>(null);
  const wordEditorRef = useRef<Editor | null>(null);
  const sheetsDataRef = useRef<Record<string, string>>({});
  const slidesPresenterRef = useRef<(() => void) | null>(null);
  const fabricCanvasRef = useRef<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [docList, setDocList] = useState<DocMeta[]>([]);
  const [projectId, setProjectId] = useState(osWindow.data?.projectId || osWindow.id);
  const [docTitle, setDocTitle] = useState('Untitled Document');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [activeSheetCell, setActiveSheetCell] = useState<string>('A1');
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [totalSlides, setTotalSlides] = useState<number>(1);

  const collab = useCollaborativeDoc({
    appPrefix: 'office',
    docId: projectId,
    sharedTypes: [
      { name: 'content', kind: 'XmlFragment' },
      { name: 'cells', kind: 'Map' },
      { name: 'canvas', kind: 'Map' },
      { name: 'slides', kind: 'Array' },
    ],
    undoTrackingTypes: ['content', 'cells'],
  });

  useEffect(() => {
    let cancelled = false;
    Storage.getDoc('meta', `doc_index_${workspaceMode}`, workspaceMode).then((saved: any) => {
      if (cancelled) return;
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
    return () => { cancelled = true; };
  }, [workspaceMode, projectId]);

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
    window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Document Created', description: 'A new document has been created.' } }));
  };

  const deleteDoc = (docId: string) => {
    if (docList.length <= 1) {
      window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Cannot Delete', description: 'You must have at least one document.' } }));
      return;
    }
    const newList = docList.filter(d => d.id !== docId);
    saveDocIndex(newList);
    Storage.deleteDoc('docs', `word-${docId}`, workspaceMode);
    Storage.deleteDoc('docs', `sheets-${docId}`, workspaceMode);
    Storage.deleteDoc('docs', `slides-fabric-${docId}`, workspaceMode);
    if (docId === projectId) {
      setProjectId(newList[0]!.id);
      setDocTitle(newList[0]!.title);
    }
    window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Document Deleted', description: 'The document has been removed.' } }));
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
    window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Document Duplicated', description: 'A copy has been created.' } }));
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

  // Safely reference the editor — null it out if destroyed to prevent commandManager crashes
  const we = wordEditorRef.current && !wordEditorRef.current.isDestroyed ? wordEditorRef.current : null;

  const handleExport = () => {
    if (activeTab === 'word') {
      if (!we) return;
      const html = we.getHTML();
      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Document</title><style>body{font-family:Inter,sans-serif;max-width:816px;margin:40px auto;padding:0 24px;line-height:1.6;color:#1e293b;}h1,h2{margin-top:1.5em;}blockquote{border-left:3px solid rgba(13,13,13,0.1);padding-left:1rem;margin-left:0;}</style></head><body>${html}</body></html>`;
      downloadFile(`${projectId}.html`, fullHtml, 'text/html');
      window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Exported', description: 'Word document exported as HTML.' } }));
    } else if (activeTab === 'sheets') {
      const data = sheetsDataRef.current;
      const cols = Array.from({ length: 15 }, (_, i) => String.fromCharCode(65 + i));
      const rows = Array.from({ length: 30 }, (_, i) => i + 1);
      const csvLines = rows.map(r => cols.map(c => data[`${c}${r}`] || '').join(','));
      downloadFile(`${projectId}.csv`, csvLines.join('\n'), 'text/csv');
      window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Exported', description: 'Sheet exported as CSV.' } }));
    } else if (activeTab === 'slides') {
      const canvas = fabricCanvasRef.current;
      if (!canvas?.toDataURL) return;
      try {
        const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 2 });
        downloadDataURL(`${projectId}.png`, dataUrl);
        window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Exported', description: 'Slide exported as PNG.' } }));
      } catch {
        window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Export Failed', description: 'Could not export slide.' } }));
      }
    }
  };

  const handleSaveToFS = async () => {
    setSaveStatus('saving');
    try {
      await FS.mkdir('Documents');
      let contentToSave = '';
      let ext = 'html';
      let mime = 'text/html';

      if (activeTab === 'word' && we) {
        contentToSave = we.getHTML();
      } else if (activeTab === 'sheets') {
        contentToSave = JSON.stringify(sheetsDataRef.current || {}, null, 2);
        ext = 'json';
        mime = 'application/json';
      } else if (activeTab === 'slides' && fabricCanvasRef.current) {
        contentToSave = JSON.stringify(fabricCanvasRef.current.toJSON?.() || {}, null, 2);
        ext = 'json';
        mime = 'application/json';
      } else {
        contentToSave = `<h1>${docTitle}</h1>`;
      }

      const safeTitle = (docTitle || 'Untitled').replace(/[\\/:*?"<>|]/g, '_');
      const filename = `Documents/${safeTitle}.${ext}`;
      await FS.write(filename, contentToSave, mime);

      setSaveStatus('saved');
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'Document Saved', description: `Saved to ${filename}`, type: 'success' }
      }));
      window.dispatchEvent(new CustomEvent('os:refresh-desktop'));
      window.dispatchEvent(new CustomEvent('os:fs-changed', { detail: { path: 'Documents' } }));
    } catch (err: any) {
      setSaveStatus('unsaved');
      console.error('Failed to mirror doc to FS:', err);
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
             <button className="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="Save Document to Storage & Files" onClick={handleSaveToFS}><Save className="w-4 h-4" /></button>
             <button className="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="Print" onClick={() => window.print()}><Printer className="w-4 h-4" /></button>
             <button className="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="Share via Self-Host" onClick={() => window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Share Link Created', description: 'Link copied to clipboard.' }}))}><Share2 className="w-4 h-4" /></button>
             <button className="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="Export" onClick={handleExport}><Download className="w-4 h-4" /></button>
           </div>
           
           {activeTab === 'word' && <WordToolbar editor={we} />}

           {activeTab === 'sheets' && (
             <div className="flex items-center gap-2 w-full max-w-md">
               <div className="flex items-center gap-2 text-xs font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200 flex-1">
                 <span className="text-slate-400">fx</span>
                 <input 
                   type="text" 
                   className="bg-transparent outline-none flex-1 font-mono text-slate-700" 
                   value={sheetsDataRef.current?.[activeSheetCell] || ''}
                   onChange={(e) => {
                      const cellsMap = collab.sharedTypesRef.current.cells;
                      if (cellsMap) {
                         cellsMap.set(activeSheetCell, e.target.value);
                         setSaveStatus('unsaved');
                      }
                   }}
                   placeholder="=SUM(A1:A10)" 
                 />
               </div>
             </div>
           )}

          {activeTab === 'slides' && (
            <div className="flex items-center gap-2">
               <button
                 onClick={() => slidesPresenterRef.current?.()}
                 className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1 rounded transition-colors font-medium cursor-pointer"
               >
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
          {activeTab === 'word' && <WordEditor performanceMode={performanceMode} workspaceMode={workspaceMode} projectId={projectId} currentUser={currentUser} onEditorReady={(editor) => { wordEditorRef.current = editor; }} collab={collab} onDirty={() => setSaveStatus('unsaved')} />}
          {activeTab === 'sheets' && <SheetsEditor workspaceMode={workspaceMode} projectId={projectId} currentUser={currentUser} dataRef={sheetsDataRef} collab={collab} onDirty={() => setSaveStatus('unsaved')} activeCell={activeSheetCell} setActiveCell={setActiveSheetCell} />}
          {activeTab === 'slides' && <SlidesEditor workspaceMode={workspaceMode} projectId={projectId} currentUser={currentUser} canvasRef={fabricCanvasRef} collab={collab} onDirty={() => setSaveStatus('unsaved')} onPresentRef={(fn) => { slidesPresenterRef.current = fn; }} onSlideChange={(idx, total) => { setActiveSlideIndex(idx); setTotalSlides(total); }} />}
          {activeTab === 'pdf' && <PdfEditor initialUrl={osWindow.data?.url} />}
        </motion.div>
      </AnimatePresence>

      {/* Status Bar */}
      <div className="h-6 shrink-0 bg-blue-600 text-white flex items-center justify-between px-3 text-[10px] uppercase tracking-wider relative z-10 w-full overflow-hidden">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            {saveStatus === 'saved' && <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Saved locally (IndexedDB)</>}
            {saveStatus === 'saving' && <><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Saving...</>}
            {saveStatus === 'unsaved' && <><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Unsaved changes</>}
          </span>
        </div>
        <div className="flex items-center gap-4">
           {activeTab === 'word' && <span>Word Processor Active</span>}
           {activeTab === 'sheets' && <span>Cell: {activeSheetCell || 'A1'}</span>}
           {activeTab === 'slides' && <span>Slide {activeSlideIndex + 1} of {totalSlides}</span>}
        </div>
      </div>
      </div>
    </div>
  );
}

function WordToolbar({ editor }: { editor: Editor | null }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const update = () => setTick(t => t + 1);
    editor.on('transaction', update);
    return () => { editor.off('transaction', update); };
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex items-center gap-2">
      <select
        className="text-xs border border-slate-200 rounded px-2 py-1 outline-none bg-slate-50"
        value={
          editor.isActive('heading', { level: 1 }) ? 'h1'
          : editor.isActive('heading', { level: 2 }) ? 'h2'
          : 'normal'
        }
        onChange={(e) => {
          const val = e.target.value;
          if (val === 'normal') {
            editor.chain().focus().setParagraph().run();
          } else if (val === 'h1') {
            editor.chain().focus().toggleHeading({ level: 1 }).run();
          } else if (val === 'h2') {
            editor.chain().focus().toggleHeading({ level: 2 }).run();
          }
        }}
      >
        <option value="normal">Normal Text</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
      </select>
      <select
        className="text-xs border border-slate-200 rounded px-2 py-1 outline-none bg-slate-50"
        value={editor.getAttributes('textStyle').fontFamily || 'Inter'}
        onChange={(e) => {
          editor.chain().focus().setFontFamily(e.target.value).run();
        }}
      >
        <option value="Inter">Inter</option>
        <option value="Space Grotesk">Space Grotesk</option>
        <option value="JetBrains Mono">JetBrains Mono</option>
      </select>
      <div className="flex items-center gap-1 px-2 border-l border-slate-200">
        <button
          className={cn("p-1 hover:bg-slate-100 rounded font-bold text-slate-700", editor.isActive('bold') && "bg-slate-200 text-blue-600")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >B</button>
        <button
          className={cn("p-1 hover:bg-slate-100 rounded italic text-slate-700", editor.isActive('italic') && "bg-slate-200 text-blue-600")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >I</button>
        <button
          className={cn("p-1 hover:bg-slate-100 rounded underline text-slate-700", editor.isActive('underline') && "bg-slate-200 text-blue-600")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >U</button>
      </div>
    </div>
  );
}

function WordEditor({ performanceMode, workspaceMode, projectId, currentUser, onEditorReady, collab, onDirty }: { performanceMode: 'light' | 'heavy', workspaceMode: 'private' | 'agency', projectId: string, currentUser: any, onEditorReady: (editor: Editor | null) => void, collab: CollaborativeDocState, onDirty?: () => void }) {
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
       onDirty?.();
    },
  }, [extensions]); // Recreate editor when extensions change (collab sync triggers this)

  // Seed default content into the Y.XmlFragment if it's empty
  useEffect(() => {
    if (!editor || editor.isDestroyed || !fragment) return;
    try {
      if (fragment.length === 0 && editor.commands) {
        editor.commands.setContent(defaultContent);
      }
    } catch {
      // Safe guard during teardown / remount
    }
    if (!editor.isDestroyed) {
      onEditorReady(editor);
    }
  }, [editor, fragment, onEditorReady]);

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      onEditorReady(editor);
    }
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

function SheetsEditor({ workspaceMode, projectId, currentUser, dataRef, collab, onDirty, activeCell, setActiveCell }: { workspaceMode: 'private' | 'agency', projectId: string, currentUser: any, dataRef: React.MutableRefObject<Record<string, string>>, collab: CollaborativeDocState, onDirty?: () => void, activeCell: string, setActiveCell: (c: string) => void }) {
  const [data, setData] = useState<Record<string, string>>({});
  const observeListenerRef = useRef<any>(null);
  const YRef = useRef<any>(null);

  const parser = useRef<any>(null);
  const [ParserClass, setParserClass] = useState<any>(null);
  const listenerRef = useRef<any>(null);

  useEffect(() => {
    // @ts-ignore — no type declarations for hot-formula-parser
    import('hot-formula-parser').then(mod => setParserClass(() => mod.Parser)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!ParserClass && !parser.current) return;
    if (!parser.current && ParserClass) {
      parser.current = new ParserClass();
    }
    if (!parser.current) return;

    if (listenerRef.current) {
      parser.current.off('callCellValue', listenerRef.current);
    }
    const listener = (cellCoord: any, done: any) => {
      const col = cellCoord.column.index;
      const row = cellCoord.row.index + 1;
      const cellId = `${String.fromCharCode(65 + col)}${row}`;
      let val = data[cellId];
      if (val && val.startsWith('=')) {
        try {
          const res = parser.current?.parse(val.substring(1));
          val = res?.error || res?.result;
        } catch { /* ignore */ }
      }
      done(val || '');
    };
    listenerRef.current = listener;
    parser.current.on('callCellValue', listener);
    return () => {
      if (parser.current && listenerRef.current) {
        parser.current.off('callCellValue', listenerRef.current);
        listenerRef.current = null;
      }
    };
  }, [data, ParserClass]);

  useEffect(() => {
    dataRef.current = data;
  }, [data, dataRef]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const pendingEditsRef = useRef<Array<{cell: string, value: string}>>([]);

  // Load Yjs module for direct Y.Map mutations
  useEffect(() => {
    import('yjs').then((mod) => {
      YRef.current = mod;
      const cellsMap = collab.sharedTypesRef.current.cells;
      if (cellsMap) {
        pendingEditsRef.current.forEach(({ cell, value }) => cellsMap.set(cell, value));
      }
      pendingEditsRef.current = [];
    });
  }, [collab.sharedTypesRef]);

  const handleChange = (cell: string, value: string) => {
    const cellsMap = collab.sharedTypesRef.current.cells;
    if (!cellsMap || !YRef.current) {
      pendingEditsRef.current.push({ cell, value });
      return;
    }

    cellsMap.set(cell, value);
    onDirty?.();
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
        {/* eslint-disable-next-line react-hooks/refs */}
        {rows.map(r => (
          <div key={r} className="flex border-b border-slate-100 group">
            <div className="w-10 h-6 shrink-0 border-r border-slate-200 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600 sticky left-0 z-10">
              {r}
            </div>
            {cols.map(c => {
              const cellId = `${c}${r}`;
              const rawValue = data[cellId] !== undefined ? data[cellId] : '';
              
               let displayValue = rawValue;
               if (activeCell !== cellId && typeof rawValue === 'string' && rawValue.startsWith('=')) {
                 try {
                   const res = parser.current?.parse(rawValue.substring(1));
                   displayValue = res?.error || res?.result?.toString() || rawValue;
                 } catch {
                   displayValue = rawValue;
                 }
              }
              
              return (
              <div key={c} className="w-24 h-6 shrink-0 border-r border-slate-100 relative">
                <input 
                  value={activeCell === cellId ? rawValue : displayValue}
                  onChange={(e) => handleChange(cellId, e.target.value)}
                  onFocus={() => setActiveCell(cellId)}
                  onBlur={() => setActiveCell('')}
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

function SlidesEditor({ workspaceMode, projectId, currentUser, canvasRef, collab, onDirty, onPresentRef, onSlideChange }: { workspaceMode: 'private' | 'agency', projectId: string, currentUser: any, canvasRef: React.MutableRefObject<any>, collab: CollaborativeDocState, onDirty?: () => void, onPresentRef?: (fn: () => void) => void, onSlideChange?: (idx: number, total: number) => void }) {
  const localCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [loaded, setLoaded] = useState(false);
  const [slideOrder, setSlideOrder] = useState<string[]>([]);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  
  useEffect(() => {
     if (onSlideChange) {
        onSlideChange(slideOrder.indexOf(activeSlideId || '') || 0, slideOrder.length || 1);
     }
  }, [activeSlideId, slideOrder.length]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isSyncingRef = useRef(false);
  const onDirtyRef = useRef(onDirty);
  useEffect(() => { onDirtyRef.current = onDirty; }, [onDirty]);

  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const previousStateRef = useRef<string>('');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const canvasObserverRef = useRef<any>(null);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const activeSlideIdRef = useRef<string | null>(null);
  activeSlideIdRef.current = activeSlideId;

  const handlePresent = useCallback(() => {
    if (containerRef.current?.requestFullscreen) {
       containerRef.current.requestFullscreen();
    }
  }, []);

  useEffect(() => {
    onPresentRef?.(handlePresent);
  }, [onPresentRef, handlePresent]);

  // Track Fullscreen
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

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

      const createDefaultSlideState = (isFirst: boolean) => {
         return JSON.stringify({
           version: "5.3.0",
           objects: isFirst ? [
             { type: "i-text", text: "Project \"Edge\"", left: 384, top: 150, originX: "center", originY: "center", fontFamily: "sans-serif", fontSize: 48, fontWeight: "bold", fill: "#1e293b" },
             { type: "i-text", text: "An infrastructure presentation\nexplaining local-first architecture and node scaling.", left: 384, top: 250, originX: "center", originY: "center", fontFamily: "sans-serif", fontSize: 20, fill: "#64748b", textAlign: "center" }
           ] : [
             { type: "i-text", text: "New Slide", left: 384, top: 216, originX: "center", originY: "center", fontFamily: "sans-serif", fontSize: 48, fill: "#cbd5e1" }
           ],
           background: "#ffffff"
         });
      };

      const waitForSync = () => {
        if (!collab.synced || !active) return;

        const canvasMap = collab.sharedTypesRef.current.canvas;
        if (!canvasMap) { setLoaded(true); return; }

        const initSlides = () => {
          let order = canvasMap.get('slide_order');
          if (!order) {
            const firstId = 'slide-' + Date.now();
            order = JSON.stringify([firstId]);
            canvasMap.set('slide_order', order);
            canvasMap.set(firstId, createDefaultSlideState(true));
          }
          const parsedOrder = JSON.parse(order as string);
          setSlideOrder(parsedOrder);
          
          if (!activeSlideIdRef.current && parsedOrder.length > 0) {
            setActiveSlideId(parsedOrder[0]);
          }
        };
        initSlides();

        const observer = (event: any) => {
          const keys = event.keys;
          if (keys.has('slide_order')) {
            const newOrder = JSON.parse(canvasMap.get('slide_order') as string);
            setSlideOrder(newOrder);
            if (!newOrder.includes(activeSlideIdRef.current)) {
               setActiveSlideId(newOrder.length > 0 ? newOrder[0] : null);
            }
          }
          
          if (activeSlideIdRef.current && keys.has(activeSlideIdRef.current)) {
            const remoteState = canvasMap.get(activeSlideIdRef.current) as string | undefined;
            if (!remoteState || isSyncingRef.current) return;
            if (canvas.getActiveObject()) return; // Don't disrupt local editing

            const currentStateStr = JSON.stringify(canvas.toJSON());
            if (currentStateStr === remoteState) return;

            isSyncingRef.current = true;
            try {
              const json = typeof remoteState === 'string' ? JSON.parse(remoteState) : remoteState;
              const res = canvas.loadFromJSON(json, () => {
                canvas.renderAll();
                setTimeout(() => { isSyncingRef.current = false; }, 100);
              });
              if (res && typeof res.then === 'function') {
                res.then(() => {
                  canvas.renderAll();
                  setTimeout(() => { isSyncingRef.current = false; }, 100);
                }).catch(() => { isSyncingRef.current = false; });
              }
            } catch {
              isSyncingRef.current = false;
            }
          }
        };
        
        canvasMap.observe(observer);
        canvasObserverRef.current = observer;
        setLoaded(true);
      };

      if (collab.synced) waitForSync();
      else {
        checkIntervalRef.current = setInterval(() => {
          if (collab.synced && active) {
            clearInterval(checkIntervalRef.current);
            waitForSync();
          }
        }, 200);
      }

      const handleModify = () => {
         if (isSyncingRef.current || !activeSlideIdRef.current) return;

         undoStackRef.current.push(previousStateRef.current);
         redoStackRef.current = [];
         setCanUndo(true);
         setCanRedo(false);

         previousStateRef.current = JSON.stringify(canvas.toJSON());
         isSyncingRef.current = true;
         
         const stateStr = JSON.stringify(canvas.toJSON());
         const canvasMap = collab.sharedTypesRef.current.canvas;
         if (canvasMap) {
           canvasMap.set(activeSlideIdRef.current, stateStr);
         }

         setTimeout(() => { isSyncingRef.current = false; }, 100);
         onDirtyRef.current?.();
      };

      canvas.on('object:modified', handleModify);
      canvas.on('text:changed', handleModify);
    });

    return () => {
      active = false;
      canvasRef.current = null;
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (canvasObserverRef.current && collab.sharedTypesRef.current.canvas) {
        collab.sharedTypesRef.current.canvas.unobserve(canvasObserverRef.current);
      }
      if (fabricCanvasRef.current) fabricCanvasRef.current.dispose();
    };
  }, [collab.synced, projectId]);

  useEffect(() => {
    if (!activeSlideId || !fabricCanvasRef.current || !collab.synced || !loaded) return;
    const canvasMap = collab.sharedTypesRef.current.canvas;
    if (!canvasMap) return;

    const state = canvasMap.get(activeSlideId) as string | undefined;
    if (state) {
      isSyncingRef.current = true;
      try {
        fabricCanvasRef.current.loadFromJSON(JSON.parse(state)).then(() => {
           fabricCanvasRef.current.renderAll();
           previousStateRef.current = JSON.stringify(fabricCanvasRef.current.toJSON());
           undoStackRef.current = [];
           redoStackRef.current = [];
           setCanUndo(false);
           setCanRedo(false);
           setTimeout(() => { isSyncingRef.current = false; }, 100);
        }).catch(() => { isSyncingRef.current = false; });
      } catch {
        isSyncingRef.current = false;
      }
    }
  }, [activeSlideId, loaded, projectId]);

  const addSlide = () => {
    const canvasMap = collab.sharedTypesRef.current.canvas;
    if (!canvasMap) return;
    const newId = 'slide-' + Date.now();
    
    // Default slide state
    const defaultState = JSON.stringify({ version: "5.3.0", objects: [], background: "#ffffff" });
    canvasMap.set(newId, defaultState);
    
    const newOrder = [...slideOrder, newId];
    canvasMap.set('slide_order', JSON.stringify(newOrder));
    setSlideOrder(newOrder);
    setActiveSlideId(newId);
  };

  const deleteSlide = (id: string) => {
    const canvasMap = collab.sharedTypesRef.current.canvas;
    if (!canvasMap || slideOrder.length <= 1) return;
    const newOrder = slideOrder.filter(s => s !== id);
    canvasMap.set('slide_order', JSON.stringify(newOrder));
    setSlideOrder(newOrder);
    if (activeSlideId === id) setActiveSlideId(newOrder[0] || null);
  };

  const handleSlidesUndo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || undoStackRef.current.length === 0 || !activeSlideId) return;
    redoStackRef.current.push(previousStateRef.current);
    const prevState = undoStackRef.current.pop()!;
    previousStateRef.current = prevState;
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);

    isSyncingRef.current = true;
    try {
      const json = typeof prevState === 'string' ? JSON.parse(prevState) : prevState;
      const res = canvas.loadFromJSON(json, () => {
        canvas.renderAll();
        collab.sharedTypesRef.current.canvas?.set(activeSlideId, prevState);
        setTimeout(() => { isSyncingRef.current = false; }, 100);
      });
      if (res && typeof res.then === 'function') {
        res.then(() => {
          canvas.renderAll();
          collab.sharedTypesRef.current.canvas?.set(activeSlideId, prevState);
          setTimeout(() => { isSyncingRef.current = false; }, 100);
        }).catch(() => { isSyncingRef.current = false; });
      }
    } catch { isSyncingRef.current = false; }
  };

  const handleSlidesRedo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || redoStackRef.current.length === 0 || !activeSlideId) return;
    undoStackRef.current.push(previousStateRef.current);
    const nextState = redoStackRef.current.pop()!;
    previousStateRef.current = nextState;
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);

    isSyncingRef.current = true;
    try {
      const json = typeof nextState === 'string' ? JSON.parse(nextState) : nextState;
      const res = canvas.loadFromJSON(json, () => {
        canvas.renderAll();
        collab.sharedTypesRef.current.canvas?.set(activeSlideId, nextState);
        setTimeout(() => { isSyncingRef.current = false; }, 100);
      });
      if (res && typeof res.then === 'function') {
        res.then(() => {
          canvas.renderAll();
          collab.sharedTypesRef.current.canvas?.set(activeSlideId, nextState);
          setTimeout(() => { isSyncingRef.current = false; }, 100);
        }).catch(() => { isSyncingRef.current = false; });
      }
    } catch { isSyncingRef.current = false; }
  };

  if (!collab.synced) return <div className="p-8 text-slate-500">Loading collaborative slides...</div>;

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* Thumbnail Sidebar */}
      {!isFullscreen && (
        <div className="w-48 shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col overflow-y-auto p-2 gap-2">
          {slideOrder.map((s, idx) => (
            <div key={s} className="flex gap-2 group relative">
              <span className="text-[10px] font-bold text-slate-400 mt-1 w-3 text-right shrink-0">{idx + 1}</span>
              <div 
                onClick={() => setActiveSlideId(s)}
                className={cn(
                "flex-1 aspect-video bg-white border rounded shadow-sm flex items-center justify-center cursor-pointer transition-all",
                activeSlideId === s ? "border-amber-400 ring-2 ring-amber-400 focus:outline-none" : "border-slate-200 hover:border-slate-300"
              )}>
                 <div className="text-[10px] text-slate-400 font-medium text-center px-1 truncate w-full">
                    {(() => {
                      try {
                        const stateStr = collab.sharedTypesRef.current.canvas?.get(s);
                        if (!stateStr) return `Slide ${idx + 1}`;
                        const data = JSON.parse(stateStr);
                        const firstText = data.objects?.find((o: any) => o.type === 'i-text' || o.type === 'text');
                        return firstText?.text || `Slide ${idx + 1}`;
                      } catch {
                        return `Slide ${idx + 1}`;
                      }
                    })()}
                 </div>
              </div>
              <button onClick={() => deleteSlide(s)} className="absolute right-1 top-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-opacity">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button onClick={addSlide} className="mt-2 w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded text-xs flex items-center justify-center gap-1 font-medium transition-colors">
            <Plus className="w-3 h-3" /> Add Slide
          </button>
        </div>
      )}

      {/* Main Canvas Area */}
      <div
        className={cn(
          "flex-1 overflow-auto flex flex-col items-center justify-center relative",
          isFullscreen ? "bg-black" : "bg-slate-100 p-8"
        )}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleSlidesUndo(); }
          if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleSlidesRedo(); }
        }}
        tabIndex={0}
      >
         {/* Top bar */}
         {!isFullscreen && (
           <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
             <div className="flex items-center gap-1">
               <button onClick={handleSlidesUndo} disabled={!canUndo} className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors bg-white shadow-sm border border-slate-200" title="Undo (Ctrl+Z)">
                 <Undo2 className="w-4 h-4 text-slate-600" />
               </button>
               <button onClick={handleSlidesRedo} disabled={!canRedo} className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors bg-white shadow-sm border border-slate-200" title="Redo (Ctrl+Shift+Z)">
                 <Redo2 className="w-4 h-4 text-slate-600" />
               </button>
             </div>
             
             <button onClick={handlePresent} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded font-medium shadow-sm flex items-center gap-2 transition-colors">
               <span className="text-sm">Present</span>
             </button>
           </div>
         )}

         {!loaded && (
             <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 z-10">
                <div className="text-slate-500 animate-pulse">Loading canvas engine...</div>
             </div>
         )}
         <div 
            ref={containerRef}
            className={cn(
              "flex items-center justify-center overflow-hidden transition-all",
              isFullscreen ? "w-screen h-screen bg-black" : "shadow-2xl bg-white ring-1 ring-slate-200"
            )}
         >
            <div 
              style={{
                transform: isFullscreen ? `scale(${Math.min(window.innerWidth / 768, window.innerHeight / 432)})` : 'scale(1)',
                transformOrigin: 'center center'
              }}
            >
              <canvas ref={localCanvasRef} />
            </div>
         </div>
      </div>
    </div>
  );
}

function PdfEditor({ initialUrl }: { initialUrl?: string }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(initialUrl || null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfUrl || !containerRef.current) return;
    
    let active = true;
    setLoading(true);
    setError(null);
    containerRef.current.innerHTML = ''; // Clear previous renders

    const scriptId = 'pdfjs-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    
    const renderPdf = async () => {
      try {
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        if (!active) return;
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          if (!active) return;
          
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          if (!context) continue;
          
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.className = "my-4 mx-auto block shadow-xl border border-neutral-300 bg-white max-w-full h-auto";
          
          containerRef.current?.appendChild(canvas);
          await page.render({ canvasContext: context, viewport: viewport }).promise;
        }
        setLoading(false);
      } catch (err: any) {
        if (active) {
           setError('Failed to load PDF. ' + err.message);
           setLoading(false);
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => { if (active) renderPdf(); };
      document.body.appendChild(script);
    } else {
      if ((window as any).pdfjsLib) {
         renderPdf();
      } else {
         script.addEventListener('load', () => { if (active) renderPdf(); });
      }
    }

    return () => { active = false; };
  }, [pdfUrl]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
       const url = URL.createObjectURL(file);
       setPdfUrl(url);
    } else if (file) {
      window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Invalid File', description: 'Please upload a valid PDF file.' } }));
    }
  };

  return (
     <div className="w-full h-full bg-neutral-800 flex flex-col items-center justify-center overflow-hidden">
        {!pdfUrl ? (
           <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-12 flex flex-col items-center max-w-sm text-center shadow-lg">
             <FileCode className="w-12 h-12 text-blue-500 mb-4" />
             <h2 className="text-xl font-medium text-white mb-2">Open PDF Document</h2>
             <p className="text-neutral-400 text-sm mb-6">Select a standard PDF file to read within the OS environment. (Cross-browser supported)</p>
             <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors shadow">
                Choose File
                <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
             </label>
           </div>
        ) : (
           <div className="w-full h-full flex flex-col">
             <div className="bg-neutral-900 p-2 flex shrink-0 items-center gap-2 border-b border-neutral-700 shadow-md z-10">
                <button 
                  onClick={() => setPdfUrl(null)} 
                  className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-xs text-neutral-300 border border-neutral-600 transition-colors"
                >
                  Close Document
                </button>
             </div>
             <div className="flex-1 overflow-auto bg-neutral-200 relative">
               {loading && (
                 <div className="absolute inset-0 flex items-center justify-center text-neutral-500 animate-pulse font-medium">
                   Rendering PDF...
                 </div>
               )}
               {error && (
                 <div className="absolute inset-0 flex items-center justify-center text-red-500 font-medium">
                   {error}
                 </div>
               )}
               <div ref={containerRef} className="min-h-full py-4 flex flex-col items-center" />
             </div>
           </div>
        )}
     </div>
  );
}
