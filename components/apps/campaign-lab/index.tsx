'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { OSWindow } from '@/lib/os-context';
import { useOS } from '@/lib/os-context';
import {
  Plus, MoreHorizontal, Smile, PanelLeftClose, PanelLeft,
  ChevronRight, Globe, Lock, Search, Image as ImageIcon, Palette, Layout, CheckCircle, Send,
  Type, AtSign, Copy, Share2, Undo2, Redo2, Star, Trash, Clock, Brain, Sparkles,
  Eye, MessageSquare, Edit3, Shield, X, Users, Link2, Mail, ExternalLink, Camera
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { Page, Block, DatabaseSchema, DatabaseStore, PermissionLevel, BlockComment } from './types';
import { TEMPLATES, DEFAULT_PAGES, DEFAULT_DATABASES, COVER_GRADIENTS, PERMISSION_LABELS } from './data';
import { useCollaborativeDoc } from '@/lib/hooks/useCollaborativeDoc';
import { CursorOverlay } from './components/CursorOverlay';
import { SidebarSections } from './components/PageTree';
import { BlockEditor } from './components/BlockEditor';
import { DatabaseView } from './components/DatabaseView';

export function CampaignLab({ window: osWindow }: { window: OSWindow }) {
  const { currentUser, workspaceMode, openWindow } = useOS();
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [clipperOpen, setClipperOpen] = useState(false);
  const [formsOpen, setFormsOpen] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [campaignPhase, setCampaignPhase] = useState<'discovery' | 'design' | 'delivery'>('design');

  // ─── Database Store ────────────────────────────────────────
  const [databaseStore, setDatabaseStore] = useState<DatabaseStore>(() => {
    const store: DatabaseStore = {};
    DEFAULT_DATABASES.forEach(db => store[db.id] = db);
    return store;
  });

  const updateDatabase = useCallback((dbId: string, updates: Partial<DatabaseSchema>) => {
    setDatabaseStore(prev => ({
      ...prev,
      [dbId]: { ...prev[dbId], ...updates },
    }));
  }, []);

  const updateBlockInEditor = useCallback((pageId: string, blockId: string, updates: Partial<Block>) => {
    const yPages = collab.sharedTypesRef.current.pages;
    if (!yPages) return;
    const page = yPages.get(pageId) as Page | undefined;
    if (!page) return;

    const newBlocks = page.blocks.map(b =>
      b.id === blockId ? { ...b, ...updates } : b
    );
    yPages.set(pageId, { ...page, blocks: newBlocks, updatedAt: Date.now() });
  }, []);

  // ─── Collab ────────────────────────────────────────────────
  const projectId = osWindow.data?.projectId || 'global';

  const collab = useCollaborativeDoc({
    appPrefix: 'campaign',
    docId: projectId,
    sharedTypes: [{ name: 'pages', kind: 'Map' }],
    undoTrackingTypes: ['pages'],
    onFirstSync: (ydoc, types) => {
      DEFAULT_PAGES.forEach(p => types.pages.set(p.id, p));
    },
  });

  const [pages, setPages] = useState<Page[]>([]);

  useEffect(() => {
    if (!collab.synced) return;
    const yPages = collab.sharedTypesRef.current.pages;
    if (!yPages) return;

    const syncPages = () => {
      const arr = Array.from(yPages.values()) as Page[];
      arr.sort((a, b) => a.updatedAt - b.updatedAt);
      setPages(arr);
    };

    syncPages();
    yPages.observe(syncPages);
    return () => yPages.unobserve(syncPages);
  }, [collab.synced]);

  const updateYPage = (newVals: Partial<Page> & { id: string }) => {
    const yPages = collab.sharedTypesRef.current.pages;
    if (yPages) {
      const existing = yPages.get(newVals.id) || {};
      yPages.set(newVals.id, { ...existing, ...newVals, updatedAt: Date.now() });
    }
  };

  const deleteYPage = (id: string) => {
    const yPages = collab.sharedTypesRef.current.pages;
    if (yPages) yPages.delete(id);
  };

  const canUndo = collab.canUndo;
  const canRedo = collab.canRedo;
  const undo = collab.undo;
  const redo = collab.redo;

  const activePage = pages.find(p => p.id === activePageId && !p.trash);

  // ─── Breadcrumbs ──────────────────────────────────────────
  const breadcrumbs = useMemo(() => {
    if (!activePage) return [];
    const pageById = new Map(pages.map(page => [page.id, page]));
    const trail: Page[] = [];
    let current: Page | null = activePage;
    while (current) {
      trail.unshift(current);
      current = current.parentId ? pageById.get(current.parentId) || null : null;
    }
    return trail;
  }, [activePage, pages]);

  // ─── Page Actions ─────────────────────────────────────────
  const addPage = (parentId: string | null = null, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newPage: Page = {
      id: crypto.randomUUID(),
      parentId,
      title: '',
      icon: '📄',
      blocks: [{ id: crypto.randomUUID(), type: 'p', content: '' }],
      updatedAt: Date.now(),
      createdAt: Date.now(),
      expanded: true,
      shared: false,
      favorite: false,
      trash: false,
    };

    updateYPage(newPage);
    if (parentId) {
      const parent = pages.find(p => p.id === parentId);
      if (parent && !parent.expanded) updateYPage({ id: parentId, expanded: true });
    }
    setActivePageId(newPage.id);
  };

  const applyTemplate = (template: typeof TEMPLATES[0]) => {
    // Ensure template databases exist in the store
    if (template.databases) {
      template.databases.forEach(dbId => {
        if (!databaseStore[dbId]) {
          const defaultDb = DEFAULT_DATABASES.find(d => d.id === dbId);
          if (defaultDb) updateDatabase(dbId, defaultDb);
        }
      });
    }

    const parentId = crypto.randomUUID();
    const parentPage: Page = {
      id: parentId,
      parentId: null,
      title: template.name,
      icon: template.icon,
      coverGradient: template.coverGradient,
      description: template.description,
      blocks: [{ id: crypto.randomUUID(), type: 'h1', content: template.name }],
      updatedAt: Date.now(),
      createdAt: Date.now(),
      expanded: true,
      favorite: false,
      trash: false,
    };
    updateYPage(parentPage);

    template.pages.forEach((p, i) => {
      const blocks = p.blocks as Block[];
      updateYPage({
        id: crypto.randomUUID(),
        parentId,
        title: p.title,
        icon: p.icon,
        blocks,
        updatedAt: Date.now() + i + 1,
        createdAt: Date.now() + i + 1,
        trash: false,
      });
    });
    setActivePageId(parentId);
  };

  const deletePage = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Soft-delete: move to trash (not permanent delete)
    const getIdsToTrash = (pageId: string, pageList: Page[]): string[] => {
      let ids = [pageId];
      const children = pageList.filter(p => p.parentId === pageId && !p.trash);
      children.forEach(c => ids = [...ids, ...getIdsToTrash(c.id, pageList)]);
      return ids;
    };

    const idsToTrash = getIdsToTrash(id, pages);
    idsToTrash.forEach(trashId => updateYPage({ id: trashId, trash: true, trashedAt: Date.now() }));

    if (activePageId && idsToTrash.includes(activePageId)) {
      const remaining = pages.filter(p => !idsToTrash.includes(p.id) && !p.trash);
      setTimeout(() => setActivePageId(remaining.length > 0 ? remaining[0].id : null), 0);
    }
  };

  const restorePage = (id: string) => {
    // Restore from trash
    const getIdsToRestore = (pageId: string, pageList: Page[]): string[] => {
      let ids = [pageId];
      // Also restore children that were trashed with this page
      const children = pageList.filter(p => p.parentId === pageId && p.trash);
      children.forEach(c => ids = [...ids, ...getIdsToRestore(c.id, pageList)]);
      return ids;
    };

    const idsToRestore = getIdsToRestore(id, pages);
    idsToRestore.forEach(restoreId => updateYPage({ id: restoreId, trash: false, trashedAt: undefined }));
  };

  const updatePage = (id: string, updates: Partial<Page>) => updateYPage({ id, ...updates });
  const updateBlocks = (pageId: string, newBlocks: Block[]) => updateYPage({ id: pageId, blocks: newBlocks });

  const handlePointerMove = (e: React.PointerEvent) => {
    const container = document.getElementById(`campaign-scroll-container-${osWindow.id}`);
    if (container) {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left + container.scrollLeft;
      const y = e.clientY - rect.top + container.scrollTop;
      collab.setLocalCursor(x, y);
    }
  };

  if (!collab.synced) return null;

  // ─── Render ────────────────────────────────────────────────
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

          <SidebarSections
            pages={pages}
            activePageId={activePageId}
            setActivePageId={setActivePageId}
            updatePage={updatePage}
            addPage={addPage}
            deletePage={deletePage}
            restorePage={restorePage}
          />

          {/* Templates */}
          <div className="px-3 border-t border-black/5 pt-3 pb-1">
            <div className="text-xs font-semibold text-[#37352f]/50 uppercase tracking-wider mb-2">Templates</div>
            <div className="flex flex-col gap-1">
              {TEMPLATES.map(t => (
                <button key={t.name} onClick={() => applyTemplate(t)} className="flex items-center gap-2 text-xs text-[#37352f]/70 hover:bg-black/5 p-2 rounded text-left group/t">
                  <span>{t.icon}</span>
                  <span className="flex-1">{t.name}</span>
                  {t.coverGradient && (
                    <div className={cn("w-4 h-4 rounded bg-gradient-to-r", t.coverGradient, "opacity-60 group-hover/t:opacity-100 transition-opacity")} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tools */}
          <div className="px-3 border-t border-black/5 pt-3 pb-1">
            <div className="text-xs font-semibold text-[#37352f]/50 uppercase tracking-wider mb-2">Tools</div>
            <div className="flex flex-col gap-1">
              <button onClick={() => setClipperOpen(true)} className="flex items-center gap-2 text-xs text-[#37352f]/70 hover:bg-black/5 p-2 rounded text-left">
                <span>✂️</span> Web Clipper & Imports
              </button>
              <button onClick={() => setFormsOpen(true)} className="flex items-center gap-2 text-xs text-[#37352f]/70 hover:bg-black/5 p-2 rounded text-left">
                <span>📝</span> Forms & Submissions
              </button>
              <button onClick={() => openWindow('assistant', 'AI Writing Assistant')} className="flex items-center gap-2 text-xs text-[#37352f]/70 hover:bg-black/5 p-2 rounded text-left">
                <Brain className="w-4 h-4 text-blue-500" /> AI Assistant
              </button>
            </div>
          </div>

          {/* New page */}
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
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
          if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
        }}
        tabIndex={0}
      >
        {collab.remoteCursors.map((cursor) => (
          <CursorOverlay key={cursor.userId} state={{ cursor: { x: cursor.x, y: cursor.y }, user: { name: cursor.name, color: cursor.color } }} />
        ))}

        {/* Cover Image */}
        {activePage && (activePage.coverGradient || activePage.coverImage) && (
          <div
            className={cn(
              "w-full h-40 relative group/cover shrink-0 transition-colors duration-500 overflow-hidden",
              activePage.coverImage ? '' : `bg-gradient-to-r ${activePage.coverGradient}`
            )}
          >
            {activePage.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activePage.coverImage} className="w-full h-full object-cover" alt="Cover" />
            )}
            <div className="absolute inset-0 bg-black/0 group-hover/cover:bg-black/20 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover/cover:opacity-100 transition-opacity flex gap-2">
                <button onClick={() => setCoverPickerOpen(true)} className="bg-black/60 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-black/70">
                  <Camera className="w-3.5 h-3.5" /> Change cover
                </button>
                <button onClick={() => updatePage(activePage.id, { coverGradient: undefined, coverImage: undefined })} className="bg-black/60 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-black/70">
                  <X className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add cover button when no cover */}
        {activePage && !activePage.coverGradient && !activePage.coverImage && (
          <div className="w-full h-6 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-slate-50/50">
            <button onClick={() => setCoverPickerOpen(true)} className="text-xs text-[#37352f]/40 hover:text-[#37352f]/60 flex items-center gap-1">
              <Camera className="w-3 h-3" /> Add cover
            </button>
          </div>
        )}

        {/* Sticky Header: Breadcrumbs + Tools */}
        <div className={cn("sticky top-0 z-40 w-full flex items-center justify-between p-3 border-b backdrop-blur-md transition-colors duration-500",
            campaignPhase === 'discovery' ? 'bg-amber-50/80 border-amber-200/50' :
            campaignPhase === 'delivery' ? 'bg-emerald-50/80 border-emerald-200/50' :
            'bg-white/80 border-transparent'
        )}>
          <div className="flex items-center gap-2 text-sm font-medium text-[#37352f]/70 min-w-0">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-1 hover:bg-black/5 rounded shrink-0">
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
              <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                {breadcrumbs.map((p, i) => (
                  <React.Fragment key={p.id}>
                    {i > 0 && <ChevronRight className="w-3 h-3 text-[#37352f]/30 shrink-0" />}
                    <button
                      className={cn("text-sm hover:bg-black/5 px-1.5 py-0.5 rounded truncate transition-colors",
                        i === breadcrumbs.length - 1 ? "font-medium text-[#37352f]" : "text-[#37352f]/60"
                      )}
                      onClick={() => setActivePageId(p.id)}
                    >
                      {p.icon} {p.title || 'Untitled'}
                    </button>
                  </React.Fragment>
                ))}
                {activePage?.shared && (
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide flex items-center gap-1 ml-1 shrink-0">
                    <Globe className="w-3 h-3" /> Shared
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 relative shrink-0">
            <button onClick={undo} disabled={!canUndo} className="p-1 hover:bg-black/5 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors" title="Undo (Ctrl+Z)">
              <Undo2 className="w-4 h-4 text-[#37352f]/70" />
            </button>
            <button onClick={redo} disabled={!canRedo} className="p-1 hover:bg-black/5 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors" title="Redo (Ctrl+Shift+Z)">
              <Redo2 className="w-4 h-4 text-[#37352f]/70" />
            </button>
            {/* Favorite */}
            {activePage && (
              <button
                onClick={() => updatePage(activePage.id, { favorite: !activePage.favorite })}
                className={cn("p-1 hover:bg-black/5 rounded transition-colors", activePage.favorite ? "text-amber-500" : "text-[#37352f]/40")}
                title={activePage.favorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star className={cn("w-4 h-4", activePage.favorite && "fill-amber-500")} />
              </button>
            )}
            {/* Share */}
            {activePage && (
              <button className="p-1 hover:bg-black/5 rounded relative" onClick={() => setShareModalOpen(true)}>
                <Share2 className="w-4 h-4 text-[#37352f]/70" />
              </button>
            )}
            {/* More */}
            <button className="p-1 hover:bg-black/5 rounded relative" onClick={() => setShareMenuOpen(!shareMenuOpen)}>
              <MoreHorizontal className="w-4 h-4 text-[#37352f]/70" />
            </button>

            {shareMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-black/10 shadow-2xl rounded-xl p-2 z-50 flex flex-col gap-1 text-sm text-[#37352f]">
                <div className="text-xs font-semibold text-[#37352f]/50 px-2 pt-2 pb-1 uppercase tracking-wider">Phases</div>
                <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-black/5 rounded text-left transition-colors" onClick={() => { setCampaignPhase('discovery'); setShareMenuOpen(false); }}>
                  <Search className="w-4 h-4 text-amber-500" /> Discovery
                </button>
                <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-black/5 rounded text-left transition-colors" onClick={() => { setCampaignPhase('design'); setShareMenuOpen(false); }}>
                  <Palette className="w-4 h-4 text-blue-500" /> Design
                </button>
                <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-black/5 rounded text-left transition-colors" onClick={() => { setCampaignPhase('delivery'); setShareMenuOpen(false); }}>
                  <CheckCircle className="w-4 h-4 text-emerald-500" /> Delivery
                </button>

                <div className="h-px bg-black/10 my-1 mx-2" />
                <div className="text-xs font-semibold text-[#37352f]/50 px-2 pt-2 pb-1 uppercase tracking-wider">Actions</div>

                <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-black/5 rounded text-left transition-colors" onClick={() => {
                  setShareMenuOpen(false);
                  openWindow('moodboard', `Moodboard: ${activePage?.title || 'Campaign'}`, { projectId });
                }}>
                  <ImageIcon className="w-4 h-4 text-indigo-500" /> Open Moodboard
                </button>

                <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-black/5 rounded text-left transition-colors" onClick={() => {
                  setShareMenuOpen(false);
                  openWindow('assistant', 'Campaign AI');
                }}>
                  <Brain className="w-4 h-4 text-blue-500" /> Ask AI
                </button>

                <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-black/5 rounded text-left transition-colors">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Final Approval
                </button>
                <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-black/5 rounded text-left transition-colors">
                  <Send className="w-4 h-4 text-blue-600" /> Publish to Portal
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Page Content */}
        {activePage ? (
          <div className="max-w-4xl w-full mx-auto px-12 py-8 flex-1 flex flex-col focus-within:ring-0 pb-32">
            <div className="group relative">
               {/* Icon + Title */}
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
                 {!activePage.coverGradient && !activePage.coverImage && (
                   <button
                    className="flex items-center gap-1 text-sm text-[#37352f]/50 hover:bg-black/5 px-2 py-1 rounded transition-colors"
                    onClick={() => setCoverPickerOpen(true)}
                   >
                     <Camera className="w-4 h-4" /> Add cover
                   </button>
                 )}
               </div>

               <div className="text-[78px] leading-none mb-4">{activePage.icon}</div>

               <input
                 type="text"
                 value={activePage.title}
                 onChange={(e) => updatePage(activePage.id, { title: e.target.value })}
                 placeholder="Untitled"
                 className="w-full text-5xl font-bold border-none outline-none bg-transparent placeholder:text-[#37352f]/20 mb-2 font-display"
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

               {/* Description / Subtitle */}
               <input
                 type="text"
                 value={activePage.description || ''}
                 onChange={(e) => updatePage(activePage.id, { description: e.target.value })}
                 placeholder="Add a description..."
                 className="w-full text-lg text-[#37352f]/60 border-none outline-none bg-transparent placeholder:text-[#37352f]/20 mb-6"
               />
            </div>

            <BlockEditor
              blocks={activePage.blocks}
              onChange={(blocks) => updateBlocks(activePage.id, blocks)}
              databaseStore={databaseStore}
              onUpdateDatabase={updateDatabase}
              pageId={activePage.id}
              onUpdateBlockInEditor={(blockId, updates) => updateBlockInEditor(activePage.id, blockId, updates)}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#37352f]/40 text-sm">
            Select or create a page
          </div>
        )}
      </div>

      {/* ─── Cover Picker Modal ────────────────────────────── */}
      {coverPickerOpen && activePage && (
        <div className="absolute inset-0 z-[100] bg-white/80 backdrop-blur-sm flex items-center justify-center p-8">
          <div className="bg-white border border-black/10 shadow-2xl rounded-2xl w-full max-w-lg p-6 relative">
            <button onClick={() => setCoverPickerOpen(false)} className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-full"><X className="w-5 h-5" /></button>
            <h2 className="text-xl font-bold mb-2">Cover Image</h2>
            <p className="text-sm text-[#37352f]/60 mb-4">Choose a gradient preset or paste an image URL.</p>

            {/* Gradient Presets */}
            <div className="text-xs font-semibold text-[#37352f]/50 uppercase tracking-wider mb-2">Gradients</div>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {COVER_GRADIENTS.map(g => (
                <button
                  key={g}
                  onClick={() => { updatePage(activePage.id, { coverGradient: g, coverImage: undefined }); setCoverPickerOpen(false); }}
                  className={cn("h-20 rounded-xl bg-gradient-to-r hover:scale-[1.05] transition-transform shadow-sm border border-black/5", g)}
                />
              ))}
            </div>

            {/* Custom Image URL */}
            <div className="text-xs font-semibold text-[#37352f]/50 uppercase tracking-wider mb-2">Custom Image</div>
            <div className="flex gap-2">
              <input
                id="cover-url-input"
                type="text"
                placeholder="Paste image URL..."
                className="flex-1 border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const url = (document.getElementById('cover-url-input') as HTMLInputElement)?.value;
                    if (url) { updatePage(activePage.id, { coverImage: url, coverGradient: undefined }); setCoverPickerOpen(false); }
                  }
                }}
              />
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium" onClick={() => {
                const url = (document.getElementById('cover-url-input') as HTMLInputElement)?.value;
                if (url) { updatePage(activePage.id, { coverImage: url, coverGradient: undefined }); setCoverPickerOpen(false); }
              }}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Share Modal ────────────────────────────────────── */}
      {shareModalOpen && activePage && (
        <div className="absolute inset-0 z-[100] bg-white/80 backdrop-blur-sm flex items-center justify-center p-8">
          <div className="bg-white border border-black/10 shadow-2xl rounded-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setShareModalOpen(false)} className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-full"><X className="w-5 h-5" /></button>

            <h2 className="text-xl font-bold mb-2">Share Page</h2>
            <p className="text-sm text-[#37352f]/60 mb-4">Control who can view, comment, or edit this page.</p>

            {/* Public Access Toggle */}
            <div className="bg-slate-50 border border-black/5 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold">Public Access</span>
                </div>
                <button
                  onClick={() => {
                    updatePage(activePage.id, {
                      shared: !activePage.shared,
                      share: {
                        ...activePage.share || { shareLinks: [], invitedUsers: [] },
                        publicAccess: activePage.shared ? null : 'viewer',
                      }
                    });
                  }}
                  className={cn("w-10 h-5 rounded-full relative transition-colors", activePage.shared ? "bg-blue-500" : "bg-black/20")}
                >
                  <div className={cn("w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm", activePage.shared ? "left-5.5" : "left-0.5")} />
                </button>
              </div>

              {activePage.shared && (
                <>
                  {/* Permission level selector */}
                  <div className="flex gap-2 mb-3">
                    {(['viewer', 'commenter', 'editor'] as PermissionLevel[]).map(level => (
                      <button
                        key={level}
                        onClick={() => updatePage(activePage.id, {
                          share: { ...activePage.share || { shareLinks: [], invitedUsers: [] }, publicAccess: level }
                        })}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                          (activePage.share?.publicAccess || 'viewer') === level
                            ? "bg-blue-500 text-white border-blue-500"
                            : "bg-white text-[#37352f]/60 border-black/10 hover:border-blue-300"
                        )}
                      >
                        {PERMISSION_LABELS[level].label}
                      </button>
                    ))}
                  </div>

                  {/* Share link */}
                  <div className="flex items-center gap-2 bg-white border border-black/5 p-2 rounded-lg">
                    <input
                      type="text"
                      readOnly
                      value={`https://os.anichisom.com/c/${activePage.id}`}
                      className="text-xs w-full outline-none text-[#37352f]/60 bg-transparent px-1"
                    />
                    <button className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded transition-colors" title="Copy Link">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-[#37352f]/40 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Permission: {PERMISSION_LABELS[activePage.share?.publicAccess || 'viewer']?.label} — {PERMISSION_LABELS[activePage.share?.publicAccess || 'viewer']?.description}
                  </div>
                </>
              )}
            </div>

            {/* Invite by email */}
            <div className="mb-4">
              <div className="text-xs font-semibold text-[#37352f]/50 uppercase tracking-wider mb-2">Invite People</div>
              <div className="flex gap-2">
                <input
                  id="invite-email-input"
                  type="email"
                  placeholder="Email address..."
                  className="flex-1 border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <select id="invite-permission-select" className="border border-black/10 rounded-lg px-2 py-2 text-sm bg-white">
                  <option value="viewer">Can View</option>
                  <option value="commenter">Can Comment</option>
                  <option value="editor">Can Edit</option>
                  <option value="admin">Full Access</option>
                </select>
                <button className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1">
                  <Mail className="w-4 h-4" /> Invite
                </button>
              </div>
            </div>

            {/* Currently invited */}
            {(activePage.share?.invitedUsers?.length || 0) > 0 && (
              <div>
                <div className="text-xs font-semibold text-[#37352f]/50 uppercase tracking-wider mb-2">People with access</div>
                {activePage.share!.invitedUsers.map((u, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 hover:bg-black/5 rounded-lg mb-1">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                      {u.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm flex-1">{u.name}</span>
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded",
                      PERMISSION_LABELS[u.permission]?.color === 'slate' ? 'bg-slate-100 text-slate-700' :
                      PERMISSION_LABELS[u.permission]?.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                      PERMISSION_LABELS[u.permission]?.color === 'green' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-amber-100 text-amber-700'
                    )}>
                      {PERMISSION_LABELS[u.permission]?.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Privacy notice */}
            <div className="mt-4 pt-4 border-t border-black/5 text-xs text-[#37352f]/40 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Shared pages are private by default. Only invited people can access them.
            </div>
          </div>
        </div>
      )}

      {/* ─── Clipper Modal ─────────────────────────────────── */}
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

      {/* ─── Forms Modal ───────────────────────────────────── */}
      {formsOpen && (
        <div className="absolute inset-0 z-[100] bg-white/80 backdrop-blur-sm flex items-center justify-center p-8">
          <div className="bg-white border border-black/10 shadow-2xl rounded-2xl w-full max-w-lg p-6 relative">
            <button onClick={() => setFormsOpen(false)} className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-full"><Plus className="w-5 h-5 rotate-45" /></button>
            <h2 className="text-xl font-bold mb-2">Workspace Forms</h2>
            <p className="text-sm text-[#37352f]/60 mb-6">Build easy-to-use forms that pipe submissions directly into your databases.</p>

            <div className="bg-[#f7f7f5] border border-black/5 rounded-xl p-4 mb-4">
              <div className="text-sm font-semibold mb-3">Target Database</div>
              <select className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white">
                {Object.values(databaseStore).map(db => (
                  <option key={db.id} value={db.id}>{db.icon} {db.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3 mb-6">
              <div className="text-sm font-semibold">Form Fields</div>
              {activePage && Object.values(databaseStore).length > 0 && (
                <>
                  {Object.values(databaseStore)[0]?.properties.slice(0, 3).map(prop => (
                    <div key={prop.id} className="flex items-center gap-3 bg-white border border-black/10 p-3 rounded-lg shadow-sm">
                      <Type className="w-4 h-4 text-[#37352f]/40" />
                      <span className="text-sm flex-1">{prop.name}</span>
                      <span className="text-xs text-[#37352f]/40">{prop.type}</span>
                    </div>
                  ))}
                </>
              )}
              <button className="w-full border border-dashed border-black/20 hover:border-black/40 hover:bg-black/5 rounded-lg p-3 text-sm flex items-center justify-center gap-2 text-[#37352f]/60 transition-colors">
                <Plus className="w-4 h-4" /> Add Field
              </button>
            </div>

            <div className="flex gap-3">
              <button className="flex-1 bg-black hover:bg-black/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors" onClick={() => {
                 if (!activePage) return;
                 const firstDb = Object.values(databaseStore)[0];
                 const newBlocks = [
                   ...activePage.blocks,
                   { id: crypto.randomUUID(), type: 'h2' as const, content: `Form Submissions` },
                   { id: crypto.randomUUID(), type: 'database' as const, content: '', databaseId: firstDb?.id }
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
