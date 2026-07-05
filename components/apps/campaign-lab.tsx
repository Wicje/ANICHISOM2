'use client';

import React, { useState, useEffect, useRef } from 'react';
import { OSWindow } from '@/lib/os-context';
import { 
  Plus, MoreHorizontal, Smile, Menu, PanelLeftClose, PanelLeft, 
  GripVertical, ChevronRight, CheckSquare, Square, Heading1, 
  Heading2, Heading3, List, Type, Image as ImageIcon, Link as LinkIcon, Database, Trash2,
  Calendar, LayoutList, Share2, AtSign, Columns, Clock, Copy, Globe, Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';

type BlockType = 'p' | 'h1' | 'h2' | 'h3' | 'todo' | 'bullet' | 'image' | 'database';

type Block = {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
};

type Page = {
  id: string;
  parentId: string | null;
  title: string;
  icon: string;
  expanded?: boolean;
  blocks: Block[];
  updatedAt: number;
  shared?: boolean;
};

const DEFAULT_BLOCKS: Block[] = [
  { id: 'b1', type: 'h1', content: 'Core Narrative' },
  { id: 'b2', type: 'p', content: 'We are here to rewrite the physics of the market.' },
  { id: 'b3', type: 'p', content: 'The new product line doesn\'t iterate, it obliterates.' },
  { id: 'b4', type: 'todo', content: 'Finalize brand assets', checked: false },
  { id: 'b5', type: 'todo', content: 'Send deck to leadership', checked: true }
];

const DEFAULT_PAGES: Page[] = [
  {
    id: '1',
    parentId: null,
    title: 'Brand Strategy Q4',
    icon: '🎯',
    expanded: true,
    blocks: DEFAULT_BLOCKS,
    updatedAt: Date.now(),
  },
  {
    id: '2',
    parentId: '1',
    title: 'Design Sync',
    icon: '📝',
    blocks: [
      { id: 'c1', type: 'bullet', content: 'Discussed new moodboard direction' },
      { id: 'c2', type: 'bullet', content: 'Alignment on brutalist themes' },
      { id: 'c3', type: 'database', content: '' }
    ],
    updatedAt: Date.now() - 100000,
  }
];

const SLASH_COMMANDS = [
  { id: 'p', label: 'Text', icon: Type },
  { id: 'h1', label: 'Heading 1', icon: Heading1 },
  { id: 'h2', label: 'Heading 2', icon: Heading2 },
  { id: 'h3', label: 'Heading 3', icon: Heading3 },
  { id: 'todo', label: 'To-do List', icon: CheckSquare },
  { id: 'bullet', label: 'Bulleted List', icon: List },
  { id: 'image', label: 'Image', icon: ImageIcon },
  { id: 'database', label: 'Database', icon: Database },
];

const TEAM_MEMBERS = ['@Founder', '@CreativeDir', '@Designer', '@Developer', '@Filmmaker', '@Copywriter', '@DataRecovery'];

const TEMPLATES = [
  { 
    name: 'ANICHISOM Campaign', 
    icon: '✨',
    pages: [
      { title: 'Discovery & Brief', icon: '📝', blocks: [{ id: 't1', type: 'h1', content: 'Client Brief' }] },
      { title: 'Moodboard & Visuals', icon: '🎨', blocks: [{ id: 't2', type: 'h1', content: 'Art Direction' }] },
      { title: 'Deliverables', icon: '📦', blocks: [{ id: 't3', type: 'database', content: '' }] }
    ] 
  },
  { 
    name: 'Clothing Drop', 
    icon: '👕',
    pages: [
      { title: 'Collection Planner', icon: '📅', blocks: [{ id: 't4', type: 'h1', content: 'Season Concept' }] },
      { title: 'Supplier Contacts', icon: '🏭', blocks: [{ id: 't5', type: 'database', content: '' }] },
      { title: 'Lookbook', icon: '📸', blocks: [{ id: 't6', type: 'image', content: '' }] }
    ] 
  },
  { 
    name: 'Hardware Iteration', 
    icon: '⚙️',
    pages: [
      { title: 'BOM Tracker', icon: '📋', blocks: [{ id: 't7', type: 'database', content: '' }] },
      { title: 'Firmware Specs', icon: '💻', blocks: [{ id: 't8', type: 'h1', content: 'v2.0 Logic' }] }
    ] 
  }
];

import { useOS } from '@/lib/os-context';
import { PerfectCursor } from 'perfect-cursors';

function usePerfectCursor(cb: (point: number[]) => void, point?: number[]) {
  const [pc] = useState(() => new PerfectCursor(cb));
  useEffect(() => {
    if (point) pc.addPoint(point);
  }, [pc, point]);
  useEffect(() => () => pc.dispose(), [pc]);
  return pc;
}

function CursorOverlay({ state }: { state: any }) {
  const [point, setPoint] = useState([state.cursor.x, state.cursor.y]);
  usePerfectCursor(setPoint, [state.cursor.x, state.cursor.y]);
  
  return (
    <div 
      className="absolute pointer-events-none z-50 pointer-events-none will-change-transform"
      style={{ transform: `translate(${point[0] - 12}px, ${point[1] - 12}px)` }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="drop-shadow-md">
         <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-5.01c.2-.21.49-.32.78-.32h6.79c.45 0 .67-.54.35-.85L6.35 2.85c-.31-.31-.85-.09-.85.36z" fill={state.user.color} stroke="white" strokeWidth="2"/>
      </svg>
      <div 
        className="absolute top-5 left-3 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-md whitespace-nowrap"
        style={{ backgroundColor: state.user.color }}
      >
        {state.user.name}
      </div>
    </div>
  );
}

export function CampaignLab({ window: osWindow }: { window: OSWindow }) {
  const { currentUser, workspaceMode, openWindow } = useOS();
  const [pages, setPages] = useState<Page[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [awarenessInfo, setAwarenessInfo] = useState<any[]>([]);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  
  const projectId = osWindow.data?.projectId || 'global';
  const roomId = `campaign-${workspaceMode}-${projectId}`;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoaded(false);
    
    import('yjs').then(Y => {
        import('y-indexeddb').then(({ IndexeddbPersistence }) => {
            const ydoc = new Y.Doc();
            const yPages = ydoc.getMap<Page>('pages');
            const provider = new IndexeddbPersistence(roomId, ydoc);
            
            const syncUiToYjs = () => {
                const arr = Array.from(yPages.values());
                arr.sort((a, b) => a.updatedAt - b.updatedAt);
                setPages(arr);
            };
            
            provider.on('synced', () => {
                if (yPages.size === 0) {
                    DEFAULT_PAGES.forEach(p => yPages.set(p.id, p));
                }
                syncUiToYjs();
                setIsLoaded(true);
            });
            
            yPages.observe(syncUiToYjs);

            let webrtcProvider: any = null;
            if (workspaceMode === 'agency') {
                import('y-webrtc').then(({ WebrtcProvider }) => {
                   webrtcProvider = new WebrtcProvider(roomId, ydoc, { signaling: ['wss://signaling.yjs.dev'] });
                   webrtcProvider.awareness.setLocalStateField('user', {
                     name: currentUser?.name || 'Anonymous',
                     color: `hsl(${Math.round(Math.random() * 360)}, 100%, 50%)`,
                     avatar: currentUser?.avatarUrl
                   });
                   
                   webrtcProvider.awareness.on('change', () => {
                     const states = Array.from(webrtcProvider.awareness.getStates().entries())
                       .filter((entry: any) => entry[0] !== webrtcProvider.doc.clientID && entry[1].user && entry[1].cursor)
                       .map((entry: any) => ({ clientId: entry[0], ...entry[1] }));
                     setAwarenessInfo(states);
                   });
                   
                   (globalThis.window as any)[`wrtc_${osWindow.id}`] = webrtcProvider;
                });
            }

            (globalThis.window as any)[`ypages_${osWindow.id}`] = yPages;

            return () => {
                provider.destroy();
                if (webrtcProvider) webrtcProvider.destroy();
                delete (globalThis.window as any)[`wrtc_${osWindow.id}`];
                delete (globalThis.window as any)[`ypages_${osWindow.id}`];
            };
        });
    });
  }, [roomId, workspaceMode, currentUser, osWindow.id]);

  const _updateYPage = (newVals: Partial<Page> & { id: string }) => {
     const yPages = (globalThis.window as any)[`ypages_${osWindow.id}`];
     if (yPages) {
        const existing = yPages.get(newVals.id) || {};
        yPages.set(newVals.id, { ...existing, ...newVals, updatedAt: Date.now() });
     }
  };
  
  const _deleteYPage = (id: string) => {
      const yPages = (globalThis.window as any)[`ypages_${osWindow.id}`];
      if (yPages) yPages.delete(id);
  };

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
    
    _updateYPage(newPage);
    if (parentId) {
      const parent = pages.find(p => p.id === parentId);
      if (parent && !parent.expanded) _updateYPage({ id: parentId, expanded: true });
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
    _updateYPage(parentPage);

    template.pages.forEach((p, i) => {
      _updateYPage({
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
    idsToDelete.forEach(delId => _deleteYPage(delId));
    
    if (activePageId && idsToDelete.includes(activePageId)) {
       const remaining = pages.filter(p => !idsToDelete.includes(p.id));
       setTimeout(() => setActivePageId(remaining.length > 0 ? remaining[0].id : null), 0);
    }
  };

  const updatePage = (id: string, updates: Partial<Page>) => _updateYPage({ id, ...updates });
  const updateBlocks = (pageId: string, newBlocks: Block[]) => _updateYPage({ id: pageId, blocks: newBlocks });

  const handlePointerMove = (e: React.PointerEvent) => {
    const webrtc = (globalThis.window as any)[`wrtc_${osWindow.id}`];
    if (webrtc && webrtc.awareness) {
      const container = document.getElementById(`campaign-scroll-container-${osWindow.id}`);
      if (container) {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left + container.scrollLeft;
        const y = e.clientY - rect.top + container.scrollTop;
        webrtc.awareness.setLocalStateField('cursor', { x, y });
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
              <div className="w-5 h-5 rounded bg-orange-500 font-bold text-white flex items-center justify-center text-xs">C</div>
              <span>Campaign Lab</span>
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
        className="flex-1 h-full overflow-y-auto flex flex-col relative bg-white" 
        id={`campaign-scroll-container-${osWindow.id}`}
        onPointerMove={handlePointerMove}
      >
        {awarenessInfo.map((state) => {
          if (!state.cursor || !state.user) return null;
          return <CursorOverlay key={state.clientId} state={state} />;
        })}
        
        <div className="sticky top-0 z-40 w-full flex items-center justify-between p-3 bg-white/80 backdrop-blur-md border-b border-transparent">
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
            <button 
              onClick={() => openWindow('moodboard', `Moodboard: ${activePage?.title || 'Campaign'}`, { projectId })}
              className="flex items-center gap-2 text-sm text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded transition-colors"
              title="Open Attached Moodboard"
            >
              <ImageIcon className="w-4 h-4" /> Moodboard
            </button>
            <div className="w-px h-4 bg-black/10 mx-1" />
            <button className="flex items-center gap-2 text-sm text-[#37352f]/70 hover:bg-black/5 px-3 py-1.5 rounded transition-colors" onClick={() => setShareMenuOpen(!shareMenuOpen)}>
              <Share2 className="w-4 h-4" /> Share
            </button>
            <button className="p-1 hover:bg-black/5 rounded">
              <MoreHorizontal className="w-4 h-4 text-[#37352f]/50" />
            </button>

            {/* Share Menu */}
            {shareMenuOpen && activePage && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-black/10 shadow-2xl rounded-xl p-4 z-50">
                <div className="text-sm font-bold mb-1 flex items-center gap-2"><Globe className="w-4 h-4 text-blue-500"/> Publish to Client</div>
                <p className="text-xs text-[#37352f]/60 mb-4">Create a read-only link. Clients do not need an OS account to view this campaign.</p>
                
                <div className="flex items-center justify-between bg-[#f7f7f5] p-2 rounded-lg mb-4">
                  <div className="flex items-center gap-2">
                    {activePage.shared ? <Globe className="w-4 h-4 text-emerald-500" /> : <Lock className="w-4 h-4 text-[#37352f]/40" />}
                    <span className="text-sm">{activePage.shared ? 'Link is live' : 'Private'}</span>
                  </div>
                  <button 
                    onClick={() => updatePage(activePage.id, { shared: !activePage.shared })}
                    className={cn(
                      "w-10 h-5 rounded-full relative transition-colors",
                      activePage.shared ? "bg-blue-500" : "bg-black/20"
                    )}
                  >
                    <div className={cn("w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm", activePage.shared ? "left-5" : "left-1")} />
                  </button>
                </div>

                {activePage.shared && (
                  <div className="flex items-center gap-2 bg-white border border-black/10 p-1.5 rounded-lg">
                    <input type="text" readOnly value={`https://os.anichisom.com/c/${activePage.id}`} className="text-xs w-full outline-none text-[#37352f]/60 bg-transparent px-1" />
                    <button className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded transition-colors" title="Copy Link"><Copy className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {activePage ? (
          <div className="max-w-4xl w-full mx-auto px-12 py-8 flex-1 flex flex-col focus-within:ring-0 pb-32">
            <div className="group relative">
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
    </div>
  );
}

// ----------------------------------------------------
// Page Tree Sidebar
// ----------------------------------------------------
function PageTree({ pages, activePageId, setActivePageId, updatePage, addPage, deletePage, parentId = null, indent = 0 }: any) {
  const childPages = pages.filter((p: Page) => p.parentId === parentId);
  if (childPages.length === 0) return null;

  return (
    <>
      {childPages.map((page: Page) => {
        const hasChildren = pages.some((p: Page) => p.parentId === page.id);
        return (
          <div key={page.id}>
            <div
              className={cn(
                "flex items-center gap-1 text-sm cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis rounded-md group text-[#37352f]/80 relative m-1",
                activePageId === page.id ? "bg-black/5 font-medium" : "hover:bg-black/5"
              )}
              style={{ paddingLeft: `${indent * 12 + 4}px`, paddingRight: '4px', paddingTop: '4px', paddingBottom: '4px' }}
              onClick={() => setActivePageId(page.id)}
            >
              <div 
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  updatePage(page.id, { expanded: !page.expanded });
                }}
              >
                {hasChildren ? (
                  <ChevronRight className={cn("w-3 h-3 text-[#37352f]/40 transition-transform", page.expanded && "rotate-90")} />
                ) : (
                  <div className="w-3 h-3 flex items-center justify-center"><div className="w-1 h-1 rounded-full bg-[#37352f]/20" /></div>
                )}
              </div>
              <span className="shrink-0">{page.icon}</span>
              <span className="truncate flex-1 py-0.5">{page.title || 'Untitled'}</span>
              
              <div className="opacity-0 group-hover:opacity-100 flex items-center shrink-0 pr-1">
                <button className="p-1 hover:bg-black/10 rounded text-[#37352f]/50" onClick={(e) => deletePage(page.id, e)} title="Delete">
                  <Trash2 className="w-3 h-3" />
                </button>
                <button className="p-1 hover:bg-black/10 rounded text-[#37352f]/50" onClick={(e) => addPage(page.id, e)} title="Add Sub-page">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
            {page.expanded && (
              <PageTree 
                pages={pages} 
                activePageId={activePageId} 
                setActivePageId={setActivePageId} 
                updatePage={updatePage}
                addPage={addPage}
                deletePage={deletePage}
                parentId={page.id} 
                indent={indent + 1} 
              />
            )}
          </div>
        );
      })}
    </>
  );
}

// ----------------------------------------------------
// Block Editor Core
// ----------------------------------------------------
function BlockEditor({ blocks, onChange }: { blocks: Block[], onChange: (blocks: Block[]) => void }) {
  const [slashMenu, setSlashMenu] = useState<{ index: number, x: number, y: number, query: string } | null>(null);
  const [mentionMenu, setMentionMenu] = useState<{ index: number, x: number, y: number, query: string } | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const updateBlock = (index: number, updates: Partial<Block>) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], ...updates };
    onChange(newBlocks);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    const el = e.currentTarget;
    const val = el.value.slice(0, el.selectionStart);
    const slashMatch = val.match(/(?:\s|^)\/([a-zA-Z]*)$/);
    const mentionMatch = val.match(/(?:\s|^)@([a-zA-Z0-9]*)$/);

    if (e.key === 'Escape') {
      if (slashMenu) setSlashMenu(null);
      if (mentionMenu) setMentionMenu(null);
      return;
    }

    if (e.key === 'Enter') {
      if (slashMenu || mentionMenu) {
        e.preventDefault(); // Menus handle selection via their own logic or we expect mouse click for now
        return;
      }
      
      if (!e.shiftKey) {
        e.preventDefault();
        const currentBlock = blocks[index];
        let newType: BlockType = 'p';
        if (currentBlock.type === 'todo') newType = 'todo';
        if (currentBlock.type === 'bullet') newType = 'bullet';
        
        const cursor = el.selectionStart;
        const textBefore = currentBlock.content.substring(0, cursor);
        const textAfter = currentBlock.content.substring(cursor);
        
        const newBlocks = [...blocks];
        newBlocks[index] = { ...currentBlock, content: textBefore };
        
        const newBlock: Block = { id: crypto.randomUUID(), type: newType, content: textAfter, checked: false };
        newBlocks.splice(index + 1, 0, newBlock);
        
        onChange(newBlocks);
        
        setTimeout(() => {
          const nextEl = document.getElementById(`block-${newBlock.id}`) as HTMLTextAreaElement;
          if (nextEl) {
            nextEl.focus();
            nextEl.setSelectionRange(0, 0);
          }
        }, 0);
      }
    } else if (e.key === 'Backspace' && el.selectionStart === 0 && el.selectionEnd === 0) {
      if (blocks[index].type !== 'p' && blocks[index].content === '') {
         e.preventDefault();
         updateBlock(index, { type: 'p' });
      } else if (index > 0) {
        e.preventDefault();
        const prevBlock = blocks[index - 1];
        const mergedContent = prevBlock.content + blocks[index].content;
        const newBlocks = [...blocks];
        newBlocks[index - 1] = { ...prevBlock, content: mergedContent };
        newBlocks.splice(index, 1);
        onChange(newBlocks);
        
        setTimeout(() => {
          const prevEl = document.getElementById(`block-${prevBlock.id}`) as HTMLTextAreaElement;
          if (prevEl) {
            prevEl.focus();
            prevEl.setSelectionRange(prevBlock.content.length, prevBlock.content.length);
          }
        }, 0);
      }
    } else if (e.key === 'ArrowUp' && el.selectionStart === 0 && index > 0) {
      if (!slashMenu && !mentionMenu) {
        e.preventDefault();
        document.getElementById(`block-${blocks[index - 1].id}`)?.focus();
      }
    } else if (e.key === 'ArrowDown' && el.selectionStart === el.value.length && index < blocks.length - 1) {
      if (!slashMenu && !mentionMenu) {
        e.preventDefault();
        document.getElementById(`block-${blocks[index + 1].id}`)?.focus();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>, index: number) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
    
    updateBlock(index, { content: e.target.value });

    const val = e.target.value.slice(0, e.target.selectionStart);
    const slashMatch = val.match(/(?:\s|^)\/([a-zA-Z0-9]*)$/);
    const mentionMatch = val.match(/(?:\s|^)@([a-zA-Z0-9]*)$/);
    
    const parentRect = document.getElementById('campaign-scroll-container')?.getBoundingClientRect();
    const rect = e.target.getBoundingClientRect();
    
    if (slashMatch && parentRect) {
      setSlashMenu({ index, x: rect.left, y: rect.bottom, query: slashMatch[1] || '' });
      setMentionMenu(null);
    } else if (mentionMatch && parentRect) {
      setMentionMenu({ index, x: rect.left + 50, y: rect.bottom, query: mentionMatch[1] || '' });
      setSlashMenu(null);
    } else {
      setSlashMenu(null);
      setMentionMenu(null);
    }
  };

  const executeSlashCommand = (cmdId: string) => {
    if (!slashMenu) return;
    const { index } = slashMenu;
    const block = blocks[index];
    const textBeforeSlash = block.content.substring(0, block.content.lastIndexOf('/'));
    
    const newBlocks = [...blocks];
    newBlocks[index] = { ...block, type: cmdId as BlockType, content: textBeforeSlash };
    onChange(newBlocks);
    setSlashMenu(null);
    setTimeout(() => document.getElementById(`block-${block.id}`)?.focus(), 0);
  };

  const executeMention = (memberName: string) => {
    if (!mentionMenu) return;
    const { index } = mentionMenu;
    const block = blocks[index];
    const lastAtIdx = block.content.lastIndexOf('@');
    const textBefore = block.content.substring(0, lastAtIdx);
    const textAfter = block.content.substring(lastAtIdx + mentionMenu.query.length + 1); // +1 for the '@'
    
    const newBlocks = [...blocks];
    newBlocks[index] = { ...block, content: `${textBefore}${memberName} ${textAfter}` };
    onChange(newBlocks);
    setMentionMenu(null);
    setTimeout(() => document.getElementById(`block-${block.id}`)?.focus(), 0);
  };

  const onDragStart = (e: React.DragEvent, index: number) => { setDraggedIdx(index); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (e: React.DragEvent, index: number) => e.preventDefault();
  const onDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === dropIdx) return;
    const newBlocks = [...blocks];
    const [removed] = newBlocks.splice(draggedIdx, 1);
    newBlocks.splice(dropIdx, 0, removed);
    onChange(newBlocks);
    setDraggedIdx(null);
  };

  useEffect(() => {
    blocks.forEach(b => {
      const el = document.getElementById(`block-${b.id}`);
      if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks.length]);

  return (
    <div className="flex-1 w-full pb-32">
      {blocks.map((block, index) => {
        const textClass = cn(
          "w-full resize-none border-none outline-none bg-transparent overflow-hidden leading-relaxed",
          block.type === 'h1' && "text-4xl font-bold font-display mt-6 mb-2",
          block.type === 'h2' && "text-2xl font-semibold font-display mt-5 mb-1",
          block.type === 'h3' && "text-xl font-medium font-display mt-4 mb-1",
          block.type === 'p' && "text-base text-[#37352f] min-h-[24px]",
          block.type === 'todo' && "text-base text-[#37352f]",
          block.type === 'bullet' && "text-base text-[#37352f]",
          block.type === 'image' && "hidden",
          block.type === 'database' && "hidden"
        );

        return (
          <div key={block.id} className="group relative flex items-start -ml-8 py-0.5 mt-1" onDragOver={(e) => onDragOver(e, index)} onDrop={(e) => onDrop(e, index)}>
             <div 
               className="w-6 shrink-0 opacity-0 group-hover:opacity-100 cursor-grab flex items-center justify-center mt-1.5 transition-opacity" 
               draggable onDragStart={(e) => onDragStart(e, index)} onDragEnd={() => setDraggedIdx(null)}
             >
                <GripVertical className="w-4 h-4 text-[#37352f]/30 hover:text-[#37352f]/60"/>
             </div>

             {block.type === 'todo' && (
                <div className="mt-1 mr-2 cursor-pointer shrink-0" onClick={() => updateBlock(index, { checked: !block.checked })}>
                  {block.checked ? <CheckSquare className="w-5 h-5 text-blue-500" /> : <Square className="w-5 h-5 text-[#37352f]/30 hover:bg-black/5 rounded" />}
                </div>
             )}
             {block.type === 'bullet' && (
                <div className="mt-3 mr-3 ml-2 shrink-0"><div className="w-1.5 h-1.5 rounded-full bg-[#37352f]" /></div>
             )}

             <div className="flex-1 min-w-0">
                {block.type === 'image' ? (
                  <div className="py-2">
                    {block.content ? (
                      <div className="relative group/img max-w-full inline-block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={block.content} className="max-w-full max-h-[500px] rounded-lg border border-black/5" alt="Block image" />
                        <button className="absolute top-2 right-2 p-1.5 bg-black/60 rounded backdrop-blur text-white opacity-0 group-hover/img:opacity-100" onClick={() => updateBlock(index, { content: '' })}><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-black/10 rounded-lg p-4 flex flex-col gap-2 relative">
                        <div className="text-sm font-medium text-[#37352f]/70 mb-1 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Embed Image</div>
                        <input autoFocus type="text" placeholder="Paste image URL and press Enter..." className="w-full bg-white border border-black/10 rounded p-2 text-sm outline-none focus:border-blue-500"
                          onKeyDown={(e) => { 
                            if(e.key === 'Enter') { e.preventDefault(); updateBlock(index, { content: e.currentTarget.value }); }
                            if(e.key === 'Backspace' && e.currentTarget.value === '') updateBlock(index, { type: 'p' });
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : block.type === 'database' ? (
                  <DatabaseView block={block} />
                ) : (
                  <div className="relative">
                    <textarea
                      id={`block-${block.id}`}
                      className={cn(textClass, block.checked && "line-through text-[#37352f]/40 transition-colors")}
                      value={block.content}
                      placeholder={block.type === 'p' ? "Type '/' for commands or '@' to mention" : block.type.startsWith('h') ? "Heading" : ""}
                      onChange={(e) => handleChange(e, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      rows={1}
                      spellCheck={false}
                    />
                  </div>
                )}
             </div>
          </div>
        )
      })}

      {/* Slash Menu */}
      {slashMenu && (
        <div className="fixed z-[100] bg-white border border-black/10 rounded-xl shadow-2xl w-72 overflow-hidden flex flex-col py-2" style={{ top: Math.min(slashMenu.y + 4, window.innerHeight - 300), left: Math.min(slashMenu.x, window.innerWidth - 300) }}>
          <div className="text-xs font-semibold text-[#37352f]/50 px-3 pb-2 pt-1 uppercase tracking-wider">Basic Blocks</div>
          <div className="max-h-[300px] overflow-y-auto">
            {SLASH_COMMANDS.filter(c => c.label.toLowerCase().includes(slashMenu.query.toLowerCase()) || c.id.includes(slashMenu.query.toLowerCase())).map((cmd, i) => (
              <button key={cmd.id} className={cn("flex items-center gap-3 w-full text-left px-3 py-2 text-[#37352f] transition-colors", i === 0 ? "bg-black/5" : "hover:bg-black/5")} onClick={() => executeSlashCommand(cmd.id)}>
                <div className="w-10 h-10 rounded border border-[#37352f]/10 bg-white flex items-center justify-center shrink-0"><cmd.icon className="w-5 h-5 text-[#37352f]/70" /></div>
                <div><div className="text-sm font-medium">{cmd.label}</div><div className="text-xs text-[#37352f]/50">Action command to convert block</div></div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mention Menu */}
      {mentionMenu && (
        <div className="fixed z-[100] bg-white border border-black/10 rounded-xl shadow-2xl w-56 overflow-hidden flex flex-col py-2" style={{ top: Math.min(mentionMenu.y + 4, window.innerHeight - 300), left: Math.min(mentionMenu.x, window.innerWidth - 300) }}>
          <div className="text-xs font-semibold text-[#37352f]/50 px-3 pb-2 pt-1 uppercase tracking-wider flex items-center gap-2"><AtSign className="w-3 h-3"/> Team Members</div>
          <div className="max-h-[300px] overflow-y-auto">
            {TEAM_MEMBERS.filter(m => m.toLowerCase().includes(mentionMenu.query.toLowerCase())).map((member, i) => (
              <button key={member} className={cn("flex items-center gap-3 w-full text-left px-3 py-2 text-[#37352f] transition-colors", i === 0 ? "bg-blue-50" : "hover:bg-black/5")} onClick={() => executeMention(member)}>
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">{member.charAt(1)}</div>
                <div className="text-sm font-medium">{member}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------
// Database Mock Component (Multi-view)
// ----------------------------------------------------
function DatabaseView({ block }: { block: Block }) {
  const [view, setView] = useState<'table' | 'board' | 'list' | 'timeline' | 'calendar'>('table');
  const d = {
    columns: ['Name', 'Status', 'Date', 'Assignee'],
    rows: [
      { id: '1', Name: 'Draft Launch Email', Status: 'In Progress', Date: 'Oct 24', Assignee: '@Copywriter' },
      { id: '2', Name: 'Design Assets', Status: 'To Do', Date: 'Oct 26', Assignee: '@Designer' },
      { id: '3', Name: 'Approve Budget', Status: 'Done', Date: 'Oct 20', Assignee: '@Founder' }
    ]
  };

  const ViewIcon = {
    table: Database,
    board: Columns,
    list: LayoutList,
    timeline: Clock,
    calendar: Calendar
  }[view];

  return (
    <div className="border border-black/10 rounded-xl overflow-hidden my-4 text-sm font-sans bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative group/db">
      <div className="absolute top-2 right-2 opacity-0 group-hover/db:opacity-100 transition-opacity">
        <button className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1 shadow-sm">
          <Plus className="w-3 h-3" /> New
        </button>
      </div>
      
      <div className="flex items-center gap-1 p-2 border-b border-black/5 bg-slate-50">
        {[
          { id: 'table', label: 'Table', Icon: Database },
          { id: 'board', label: 'Board', Icon: Columns },
          { id: 'list', label: 'List', Icon: LayoutList },
          { id: 'timeline', label: 'Timeline', Icon: Clock },
          { id: 'calendar', label: 'Calendar', Icon: Calendar }
        ].map((v) => (
          <button 
            key={v.id} 
            onClick={() => setView(v.id as any)} 
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
              view === v.id ? 'bg-white shadow-sm border border-black/5 text-[#37352f]' : 'hover:bg-black/5 text-[#37352f]/60'
            )}
          >
            <v.Icon className="w-3.5 h-3.5" />
            {v.label}
          </button>
        ))}
      </div>

      <div className="p-1">
        {view === 'table' && (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  {d.columns.map(c => <th key={c} className="p-3 border-b border-black/5 font-medium text-black/50 whitespace-nowrap bg-slate-50/50 text-xs uppercase tracking-wider">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {d.rows.map(r => (
                  <tr key={r.id} className="border-b border-black/5 last:border-0 hover:bg-slate-50/50 transition-colors">
                    {d.columns.map(c => (
                      <td key={c} className="p-3 whitespace-nowrap">
                        {c === 'Status' ? (
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            r[c] === 'Done' ? "bg-emerald-100 text-emerald-700" : 
                            r[c] === 'In Progress' ? "bg-blue-100 text-blue-700" : 
                            "bg-slate-100 text-slate-700"
                          )}>{r[c]}</span>
                        ) : c === 'Assignee' ? (
                           <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-xs font-medium">{r[c]}</span>
                        ) : (
                          (r as any)[c]
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'board' && (
          <div className="p-4 flex gap-4 overflow-x-auto min-h-[300px] bg-[#f7f7f5] rounded-b-lg">
             {['To Do', 'In Progress', 'Done'].map(status => (
               <div key={status} className="flex-1 min-w-[240px] max-w-[280px]">
                  <div className="font-medium text-[#37352f]/70 mb-3 px-1 flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", status === 'Done' ? "bg-emerald-500" : status === 'In Progress' ? "bg-blue-500" : "bg-slate-400")} />
                    {status}
                    <span className="text-black/30 ml-auto bg-black/5 px-1.5 rounded">{d.rows.filter(r => r.Status === status).length}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {d.rows.filter(r => r.Status === status).map(r => (
                      <div key={r.id} className="bg-white p-3 border border-black/5 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-grab">
                        <div className="font-medium mb-2 text-[#37352f]">{r.Name}</div>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-black/5">
                          <div className="text-xs text-black/40 flex-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> {r.Date}</div>
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold" title={r.Assignee}>
                            {r.Assignee.replace('@', '').substring(0,2).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
             ))}
          </div>
        )}

        {view === 'list' && (
          <div className="flex flex-col p-2">
             {d.rows.map(r => (
               <div key={r.id} className="flex items-center justify-between p-3 border-b border-black/5 hover:bg-slate-50 transition-colors rounded-lg group">
                 <div className="flex items-center gap-3">
                   <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500" checked={r.Status === 'Done'} readOnly />
                   <span className={cn("font-medium", r.Status === 'Done' ? "line-through text-slate-400" : "text-[#37352f]")}>{r.Name}</span>
                 </div>
                 <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <span className="text-xs text-slate-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/> {r.Date}</span>
                   <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-medium">{r.Assignee}</span>
                 </div>
               </div>
             ))}
          </div>
        )}

        {(view === 'calendar' || view === 'timeline') && (
          <div className="h-64 flex flex-col items-center justify-center bg-slate-50 border-t border-black/5">
            <ViewIcon className="w-8 h-8 text-slate-300 mb-3" />
            <div className="text-sm font-medium text-slate-500">
              {view === 'calendar' ? 'Monthly Calendar View' : 'Gantt Timeline View'}
            </div>
            <div className="text-xs text-slate-400 mt-1">This specific view rendering is scheduled for Phase 3</div>
          </div>
        )}
      </div>
    </div>
  )
}
