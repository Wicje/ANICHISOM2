'use client';

import React, { useState } from 'react';
import { OSWindow } from '@/lib/os-context';
import { useOS } from '@/lib/os-context';
import { 
  Plus, MoreHorizontal, Smile, PanelLeftClose, PanelLeft, 
  ChevronRight, Globe, Lock, Search, Image as ImageIcon, Palette, Layout, CheckCircle, Send,
  Type, AtSign, Copy, Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { Page, Block } from './types';
import { TEMPLATES } from './data';
import { useCampaignState } from './hooks/useCampaignState';
import { CursorOverlay } from './components/CursorOverlay';
import { PageTree } from './components/PageTree';
import { BlockEditor } from './components/BlockEditor';

export function CampaignLab({ window: osWindow }: { window: OSWindow }) {
  const { currentUser, workspaceMode, openWindow } = useOS();
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [clipperOpen, setClipperOpen] = useState(false);
  const [formsOpen, setFormsOpen] = useState(false);
  const [campaignPhase, setCampaignPhase] = useState<'discovery' | 'design' | 'delivery'>('design');

  const projectId = osWindow.data?.projectId || 'global';
  const roomId = `campaign-${workspaceMode}-${projectId}`;

  const {
    pages,
    isLoaded,
    awarenessInfo,
    updateYPage,
    deleteYPage
  } = useCampaignState(roomId, workspaceMode, currentUser, osWindow.id);

  const activePage = pages.find((p) => p.id === activePageId);

  const addPage = (parentId: string | null = null, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newPage: Page = {
      id: crypto.randomUUID(),
      parentId,
      title: '',
      icon: '📄',
      blocks: [{ id: crypto.randomUUID(), type: 'p', content: '' }],
      updatedAt: Date.now(),
      expanded: true,
      shared: false
    };
    
    updateYPage(newPage);
    if (parentId) {
      const parent = pages.find(p => p.id === parentId);
      if (parent && !parent.expanded) updateYPage({ id: parentId, expanded: true });
    }
    setActivePageId(newPage.id);
  };

  const applyTemplate = (template: typeof TEMPLATES[0]) => {
    const parentId = crypto.randomUUID();
    const parentPage: Page = {
      id: parentId,
      parentId: null,
      title: template.name,
      icon: template.icon,
      blocks: [{ id: crypto.randomUUID(), type: 'h1', content: template.name }],
      updatedAt: Date.now(),
      expanded: true,
    };
    updateYPage(parentPage);

    template.pages.forEach((p, i) => {
      updateYPage({
        id: crypto.randomUUID(),
        parentId,
        title: p.title,
        icon: p.icon,
        blocks: p.blocks as Block[],
        updatedAt: Date.now() + i + 1,
      });
    });
    setActivePageId(parentId);
  };

  const deletePage = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const getIdsToDelete = (pageId: string, pageList: Page[]): string[] => {
      let ids = [pageId];
      const children = pageList.filter(p => p.parentId === pageId);
      children.forEach(c => ids = [...ids, ...getIdsToDelete(c.id, pageList)]);
      return ids;
    };

    const idsToDelete = getIdsToDelete(id, pages);
    idsToDelete.forEach(delId => deleteYPage(delId));
    
    if (activePageId && idsToDelete.includes(activePageId)) {
       const remaining = pages.filter(p => !idsToDelete.includes(p.id));
       setTimeout(() => setActivePageId(remaining.length > 0 ? remaining[0].id : null), 0);
    }
  };

  const updatePage = (id: string, updates: Partial<Page>) => updateYPage({ id, ...updates });
  const updateBlocks = (pageId: string, newBlocks: Block[]) => updateYPage({ id: pageId, blocks: newBlocks });

  const handlePointerMove = (e: React.PointerEvent) => {
    const ws = (globalThis.window as any)[`ws_${osWindow.id}`];
    if (ws && ws.awareness) {
      const container = document.getElementById(`campaign-scroll-container-${osWindow.id}`);
      if (container) {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left + container.scrollLeft;
        const y = e.clientY - rect.top + container.scrollTop;
        ws.awareness.setLocalStateField('cursor', { x, y });
      }
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="w-full h-full flex bg-white text-[#37352f] font-sans relative">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 shrink-0 bg-[#f7f7f5] border-r border-black/5 flex flex-col h-full overflow-hidden transition-all duration-300">
          <div className="p-3 flex items-center justify-between hover:bg-black/5 cursor-pointer text-sm font-medium">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-blue-500 font-bold text-white flex items-center justify-center text-xs">W</div>
              <span>Workspace</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-black/5 rounded text-[#37352f]/50 hover:text-[#37352f]">
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
            <div className="px-3 pb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#37352f]/50 uppercase tracking-wider">
                {workspaceMode === 'private' ? 'Personal Space' : 'Team Workspace'}
              </span>
            </div>
            {pages.length === 0 && <div className="px-5 py-4 text-xs text-[#37352f]/40 italic">No pages yet.</div>}
            
            <PageTree 
              pages={pages} 
              activePageId={activePageId} 
              setActivePageId={setActivePageId} 
              updatePage={updatePage}
              addPage={addPage}
              deletePage={deletePage}
            />

            <div className="mt-6 px-3">
              <div className="text-xs font-semibold text-[#37352f]/50 uppercase tracking-wider mb-2">Templates</div>
              <div className="flex flex-col gap-1">
                {TEMPLATES.map(t => (
                  <button key={t.name} onClick={() => applyTemplate(t)} className="flex items-center gap-2 text-xs text-[#37352f]/70 hover:bg-black/5 p-2 rounded text-left">
                    <span>{t.icon}</span>
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 px-3 border-t border-black/5 pt-4">
              <div className="text-xs font-semibold text-[#37352f]/50 uppercase tracking-wider mb-2">Tools</div>
              <div className="flex flex-col gap-1">
                <button onClick={() => setClipperOpen(true)} className="flex items-center gap-2 text-xs text-[#37352f]/70 hover:bg-black/5 p-2 rounded text-left">
                  <span>✂️</span> Web Clipper & Imports
                </button>
                <button onClick={() => setFormsOpen(true)} className="flex items-center gap-2 text-xs text-[#37352f]/70 hover:bg-black/5 p-2 rounded text-left">
                  <span>📝</span> Forms & Submissions
                </button>
              </div>
            </div>
          </div>

          <div
            onClick={() => addPage(null)}
            className="p-3 border-t border-black/5 flex items-center gap-2 hover:bg-black/5 cursor-pointer text-sm font-medium text-[#37352f]/70"
          >
            <Plus className="w-4 h-4" />
            <span>New page</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div 
        className={cn("flex-1 h-full overflow-y-auto flex flex-col relative transition-colors duration-500",
           campaignPhase === 'discovery' ? 'bg-amber-50/40' : 
           campaignPhase === 'delivery' ? 'bg-emerald-50/40' : 
           'bg-white'
        )} 
        id={`campaign-scroll-container-${osWindow.id}`}
        onPointerMove={handlePointerMove}
      >
        {awarenessInfo.map((state) => {
          if (!state.cursor || !state.user) return null;
          return <CursorOverlay key={state.clientId} state={state} />;
        })}
        
        <div className={cn("sticky top-0 z-40 w-full flex items-center justify-between p-3 border-b backdrop-blur-md transition-colors duration-500", 
            campaignPhase === 'discovery' ? 'bg-amber-50/80 border-amber-200/50' : 
            campaignPhase === 'delivery' ? 'bg-emerald-50/80 border-emerald-200/50' : 
            'bg-white/80 border-transparent'
        )}>
          <div className="flex items-center gap-2 text-sm font-medium text-[#37352f]/70">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-1 hover:bg-black/5 rounded">
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
            {activePage && (
              <div className="flex items-center gap-2">
                <span className="text-lg">{activePage.icon}</span>
                <span>{activePage.title || 'Untitled'}</span>
                {activePage.shared && (
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide flex items-center gap-1 ml-2">
                    <Globe className="w-3 h-3" /> Shared
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 relative">
            {/* Streamlined right side tools */}
            <button className="p-1 hover:bg-black/5 rounded relative" onClick={() => setShareMenuOpen(!shareMenuOpen)}>
              <MoreHorizontal className="w-4 h-4 text-[#37352f]/70" />
            </button>

            {shareMenuOpen && activePage && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-black/10 shadow-2xl rounded-xl p-2 z-50 flex flex-col gap-1 text-sm text-[#37352f]">
                
                <div className="text-xs font-semibold text-[#37352f]/50 px-2 pt-2 pb-1 uppercase tracking-wider">Phases</div>
                <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-black/5 rounded text-left transition-colors" onClick={() => setCampaignPhase('discovery')}>
                  <Search className="w-4 h-4 text-amber-500" /> Discovery
                </button>
                <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-black/5 rounded text-left transition-colors" onClick={() => setCampaignPhase('design')}>
                  <Palette className="w-4 h-4 text-blue-500" /> Design
                </button>
                <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-black/5 rounded text-left transition-colors" onClick={() => setCampaignPhase('delivery')}>
                  <CheckCircle className="w-4 h-4 text-emerald-500" /> Delivery
                </button>
                
                <div className="h-px bg-black/10 my-1 mx-2" />
                <div className="text-xs font-semibold text-[#37352f]/50 px-2 pt-2 pb-1 uppercase tracking-wider">Actions</div>
                
                <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-black/5 rounded text-left transition-colors" onClick={() => {
                  setShareMenuOpen(false);
                  openWindow('moodboard', `Moodboard: ${activePage.title || 'Campaign'}`, { projectId });
                }}>
                  <ImageIcon className="w-4 h-4 text-indigo-500" /> Open Moodboard
                </button>
                
                <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-black/5 rounded text-left transition-colors">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Final Approval
                </button>
                <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-black/5 rounded text-left transition-colors">
                  <Send className="w-4 h-4 text-blue-600" /> Publish to Portal
                </button>
                
                <div className="h-px bg-black/10 my-1 mx-2" />
                
                <div className="px-2 py-1.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-xs">Share Page</span>
                    <button 
                      onClick={() => updatePage(activePage.id, { shared: !activePage.shared })}
                      className={cn("w-8 h-4 rounded-full relative transition-colors", activePage.shared ? "bg-blue-500" : "bg-black/20")}
                    >
                      <div className={cn("w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all shadow-sm", activePage.shared ? "left-4.5" : "left-0.5")} />
                    </button>
                  </div>
                  {activePage.shared && (
                    <div className="flex items-center gap-2 bg-black/5 border border-black/5 p-1 rounded">
                      <input type="text" readOnly value={`https://os.anichisom.com/c/${activePage.id}`} className="text-[10px] w-full outline-none text-[#37352f]/60 bg-transparent px-1" />
                      <button className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded transition-colors" title="Copy Link"><Copy className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>

        {activePage ? (
          <div className="max-w-4xl w-full mx-auto px-12 py-8 flex-1 flex flex-col focus-within:ring-0 pb-32">
            <div className="group relative">
               {/* Clean editor area */}

               <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity mb-4">
                 <button 
                  className="flex items-center gap-1 text-sm text-[#37352f]/50 hover:bg-black/5 px-2 py-1 rounded transition-colors"
                  onClick={() => {
                    const icons = ['📄', '🎯', '📝', '✨', '🚀', '💡', '🔥', '🎨', '📦', '📅', '🏭', '📸', '⚙️', '📋', '💻'];
                    const randomIcon = icons[Math.floor(Math.random() * icons.length)];
                    updatePage(activePage.id, { icon: randomIcon });
                  }}
                 >
                   <Smile className="w-4 h-4" /> Add icon
                 </button>
               </div>
               
               <div className="text-[78px] leading-none mb-4">{activePage.icon}</div>
               
               <input
                 type="text"
                 value={activePage.title}
                 onChange={(e) => updatePage(activePage.id, { title: e.target.value })}
                 placeholder="Untitled"
                 className="w-full text-5xl font-bold border-none outline-none bg-transparent placeholder:text-[#37352f]/20 mb-6 font-display"
                 onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                     e.preventDefault();
                     if (activePage.blocks.length > 0) {
                       document.getElementById(`block-${activePage.blocks[0].id}`)?.focus();
                     } else {
                       const newBlock: Block = { id: crypto.randomUUID(), type: 'p', content: '' };
                       updateBlocks(activePage.id, [newBlock]);
                       setTimeout(() => document.getElementById(`block-${newBlock.id}`)?.focus(), 0);
                     }
                   }
                  }}
               />
            </div>
            
            <BlockEditor 
              blocks={activePage.blocks} 
              onChange={(blocks) => updateBlocks(activePage.id, blocks)} 
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#37352f]/40 text-sm">
            Select or create a page
          </div>
        )}
      </div>

      {clipperOpen && (
        <div className="absolute inset-0 z-[100] bg-white/80 backdrop-blur-sm flex items-center justify-center p-8">
          <div className="bg-white border border-black/10 shadow-2xl rounded-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setClipperOpen(false)} className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-full"><Plus className="w-5 h-5 rotate-45" /></button>
            <h2 className="text-xl font-bold mb-2">Web Clipper & Imports</h2>
            <p className="text-sm text-[#37352f]/60 mb-6">Save web pages directly to your workspace or import existing data.</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#37352f]/50 mb-2 block">Clip from Web</label>
                <div className="flex gap-2">
                  <input id="clip-url" type="text" placeholder="https://..." className="flex-1 border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                  <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors" onClick={() => {
                     const url = (document.getElementById('clip-url') as HTMLInputElement)?.value;
                     if (!url || !activePage) return;
                     const newBlocks = [
                       ...activePage.blocks,
                       { id: crypto.randomUUID(), type: 'h2' as const, content: `Clipped: ${url}` },
                       { id: crypto.randomUUID(), type: 'p' as const, content: 'This content was imported via the Web Clipper.' }
                     ];
                     updateBlocks(activePage.id, newBlocks);
                     setClipperOpen(false);
                  }}>Clip</button>
                </div>
              </div>
              
              <div className="pt-4 border-t border-black/5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#37352f]/50 mb-2 block">Import from</label>
                <div className="grid grid-cols-2 gap-2">
                   {['Evernote', 'Word', 'Google Docs', 'Notion'].map((source) => (
                     <button 
                       key={source}
                       onClick={() => {
                         if (!activePage) return;
                         const newBlocks = [
                           ...activePage.blocks,
                           { id: crypto.randomUUID(), type: 'h2' as const, content: `Imported from ${source}` },
                           { id: crypto.randomUUID(), type: 'p' as const, content: `Document content extracted from ${source} archive.` }
                         ];
                         updateBlocks(activePage.id, newBlocks);
                         setClipperOpen(false);
                       }}
                       className="border border-black/10 hover:bg-black/5 rounded-lg p-3 text-sm flex items-center gap-2 transition-colors"
                     >
                       <div className="w-5 h-5 bg-black rounded flex items-center justify-center text-white font-bold text-[10px]">{source[0]}</div>
                       {source}
                     </button>
                   ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {formsOpen && (
        <div className="absolute inset-0 z-[100] bg-white/80 backdrop-blur-sm flex items-center justify-center p-8">
          <div className="bg-white border border-black/10 shadow-2xl rounded-2xl w-full max-w-lg p-6 relative">
            <button onClick={() => setFormsOpen(false)} className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-full"><Plus className="w-5 h-5 rotate-45" /></button>
            <h2 className="text-xl font-bold mb-2">Workspace Forms</h2>
            <p className="text-sm text-[#37352f]/60 mb-6">Build easy-to-use forms that pipe submissions directly into your databases.</p>
            
            <div className="bg-[#f7f7f5] border border-black/5 rounded-xl p-4 mb-4">
              <div className="text-sm font-semibold mb-3">Target Database</div>
              <select className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white">
                 <option>Deliverables (Current Page)</option>
                 <option>Supplier Contacts</option>
                 <option>BOM Tracker</option>
              </select>
            </div>

            <div className="space-y-3 mb-6">
              <div className="text-sm font-semibold">Form Fields</div>
              <div className="flex items-center gap-3 bg-white border border-black/10 p-3 rounded-lg shadow-sm">
                 <Type className="w-4 h-4 text-[#37352f]/40" />
                 <span className="text-sm flex-1">Name</span>
                 <span className="text-xs text-[#37352f]/40">Short Text</span>
              </div>
              <div className="flex items-center gap-3 bg-white border border-black/10 p-3 rounded-lg shadow-sm">
                 <AtSign className="w-4 h-4 text-[#37352f]/40" />
                 <span className="text-sm flex-1">Email</span>
                 <span className="text-xs text-[#37352f]/40">Email</span>
              </div>
              <button className="w-full border border-dashed border-black/20 hover:border-black/40 hover:bg-black/5 rounded-lg p-3 text-sm flex items-center justify-center gap-2 text-[#37352f]/60 transition-colors">
                <Plus className="w-4 h-4" /> Add Field
              </button>
            </div>

            <div className="flex gap-3">
              <button className="flex-1 bg-black hover:bg-black/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors" onClick={() => {
                 if (!activePage) return;
                 const newBlocks = [
                   ...activePage.blocks,
                   { id: crypto.randomUUID(), type: 'h2' as const, content: `Form Submissions` },
                   { id: crypto.randomUUID(), type: 'database' as const, content: '' }
                 ];
                 updateBlocks(activePage.id, newBlocks);
                 setFormsOpen(false);
              }}>Publish Form (Insert Database)</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
