'use client';

import React, { useEffect, useMemo, useCallback, useRef } from 'react';
import { OSWindow } from '@/lib/os-context';
import { useOS } from '@/lib/os-context';
import {
  Plus, MoreHorizontal, Smile, PanelLeftClose, PanelLeft,
  ChevronRight, Globe, Lock, Search, Image as ImageIcon, Palette, Layout, CheckCircle, Send,
  Type, AtSign, Copy, Share2, Undo2, Redo2, Star, Trash, Clock, Brain, Sparkles,
  Eye, MessageSquare, Edit3, Shield, X, Users, Link2, Mail, ExternalLink, Camera,
  Bell, Target, Layers, ListTodo
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { Page, Block, DatabaseSchema, PermissionLevel, BlockComment, PageLevel } from '@/lib/campaign-types';
import { TEMPLATES, DEFAULT_PAGES, DEFAULT_DATABASES, COVER_GRADIENTS, PERMISSION_LABELS, TEAM_MEMBERS } from '@/lib/campaign-data';
import { useCollaborativeDoc } from '@/lib/hooks/useCollaborativeDoc';
import { useCampaignStore } from '@/lib/stores/campaign.store';
import { CursorOverlay } from './components/CursorOverlay';
import { SidebarSections } from './components/PageTree';
import { BlockEditor } from './components/BlockEditor';

const LEVEL_ICONS: Record<PageLevel, React.ComponentType<{ className?: string }>> = {
  campaign: Target,
  phase: Layers,
  task: CheckCircle,
  subtask: ListTodo,
};

export function CampaignLab({ window: osWindow }: { window: OSWindow }) {
  const { currentUser, workspaceMode, openWindow } = useOS();
  const store = useCampaignStore();
  const [moreMenuOpen, setMoreMenuOpen] = React.useState(false);
  const moreMenuRef = React.useRef<HTMLDivElement>(null);

  // Close three-dot menu on outside click
  React.useEffect(() => {
    if (!moreMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [moreMenuOpen]);

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

  // ─── Sync Yjs → Zustand ───────────────────────────────────
  useEffect(() => {
    if (!collab.synced) return;
    const yPages = collab.sharedTypesRef.current.pages;
    if (!yPages) return;

    const syncPages = () => {
      const arr = Array.from(yPages.values()) as Page[];
      arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      store.setPages(arr);
    };

    syncPages();
    yPages.observe(syncPages);
    return () => yPages.unobserve(syncPages);
  }, [collab.synced]);

  const updateYPage = useCallback((newVals: Partial<Page> & { id: string }) => {
    const yPages = collab.sharedTypesRef.current.pages;
    if (yPages) {
      const existing = yPages.get(newVals.id) || {};
      yPages.set(newVals.id, { ...existing, ...newVals, updatedAt: Date.now() });
    }
  }, [collab]);

  const deleteYPage = useCallback((id: string) => {
    const yPages = collab.sharedTypesRef.current.pages;
    if (yPages) yPages.delete(id);
  }, [collab]);

  // ─── Store selectors ──────────────────────────────────────
  const {
    pages, databaseStore, notifications,
    activePageId, sidebarOpen, shareModalOpen, coverPickerOpen,
    setActivePageId, setSidebarOpen, setShareModalOpen, setCoverPickerOpen,
    addPage: storeAddPage, updatePage: storeUpdatePage, deletePage: storeDeletePage, restorePage: storeRestorePage,
    updateDatabase, getBreadcrumbs, getChildren,
    createShareLink, getCampaignShares, addNotification,
    addCommentWithMentions,
  } = store;

  const pagesRef = useRef(pages);
  useEffect(() => { pagesRef.current = pages; }, [pages]);

  const activePage = useMemo(() => pages.find(p => p.id === activePageId && !p.trash), [pages, activePageId]);
  const breadcrumbs = useMemo(() => activePageId ? getBreadcrumbs(activePageId) : [], [activePageId, pages]);
  const currentUserNotifications = useMemo(
    () => notifications.filter(n => n.userId === currentUser?.id),
    [notifications, currentUser?.id]
  );
  const unreadCount = useMemo(
    () => currentUserNotifications.filter(n => !n.read).length,
    [currentUserNotifications]
  );

  // ─── Page Actions ─────────────────────────────────────────
  const addPage = useCallback((parentId: string | null = null, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newPage = storeAddPage(parentId);
    updateYPage(newPage);
  }, [storeAddPage, updateYPage]);

  const applyTemplate = useCallback((template: typeof TEMPLATES[0]) => {
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
      level: 'campaign',
      campaignId: parentId,
      sortOrder: pages.length,
    };
    updateYPage(parentPage);

    template.pages.forEach((p, i) => {
      const pageData = p as { title: string; icon: string; level?: PageLevel; blocks: Block[] };
      updateYPage({
        id: crypto.randomUUID(),
        parentId,
        title: pageData.title,
        icon: pageData.icon,
        blocks: pageData.blocks,
        updatedAt: Date.now() + i + 1,
        createdAt: Date.now() + i + 1,
        trash: false,
        level: pageData.level || 'phase',
        campaignId: parentId,
        sortOrder: i,
      });
    });
    setActivePageId(parentId);
  }, [databaseStore, updateDatabase, pages.length, updateYPage, setActivePageId]);

  const deletePage = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const currentPages = pagesRef.current;
    const collectDescendants = (pageId: string): string[] => {
      const children = currentPages.filter(p => p.parentId === pageId);
      return [pageId, ...children.flatMap(c => collectDescendants(c.id))];
    };
    const idsToTrash = collectDescendants(id);
    idsToTrash.forEach(trashId => updateYPage({ id: trashId, trash: true, trashedAt: Date.now() }));
    storeDeletePage(id);
  }, [updateYPage, storeDeletePage]);

  const restorePage = useCallback((id: string) => {
    const currentPages = pagesRef.current;
    const collectDescendants = (pageId: string): string[] => {
      const children = currentPages.filter(p => p.parentId === pageId && p.trash);
      return [pageId, ...children.flatMap(c => collectDescendants(c.id))];
    };
    const idsToRestore = collectDescendants(id);
    idsToRestore.forEach(restoreId => updateYPage({ id: restoreId, trash: false, trashedAt: undefined }));
    storeRestorePage(id);
  }, [updateYPage, storeRestorePage]);

  const updatePage = useCallback((id: string, updates: Partial<Page>) => {
    updateYPage({ id, ...updates });
  }, [updateYPage]);

  const updateBlocks = useCallback((pageId: string, newBlocks: Block[]) => {
    updateYPage({ id: pageId, blocks: newBlocks });
  }, [updateYPage]);

  const updateBlockInEditor = useCallback((pageId: string, blockId: string, updates: Partial<Block>) => {
    const yPages = collab.sharedTypesRef.current.pages;
    if (!yPages) return;
    const page = yPages.get(pageId) as Page | undefined;
    if (!page) return;

    const newBlocks = page.blocks.map(b =>
      b.id === blockId ? { ...b, ...updates } : b
    );
    yPages.set(pageId, { ...page, blocks: newBlocks, updatedAt: Date.now() });
  }, [collab]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const container = document.getElementById(`campaign-scroll-container-${osWindow.id}`);
    if (container) {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left + container.scrollLeft;
      const y = e.clientY - rect.top + container.scrollTop;
      collab.setLocalCursor(x, y);
    }
  }, [collab, osWindow.id]);

  const canUndo = collab.canUndo;
  const canRedo = collab.canRedo;
  const undo = collab.undo;
  const redo = collab.redo;

  if (!collab.synced) return (
    <div className="w-full h-full flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Syncing workspace...</span>
      </div>
    </div>
  );

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
              <button onClick={() => setCoverPickerOpen(true)} className="flex items-center gap-2 text-xs text-[#37352f]/70 hover:bg-black/5 p-2 rounded text-left">
                <span>🎨</span> Cover Picker
              </button>
              <button onClick={() => setShareModalOpen(true)} className="flex items-center gap-2 text-xs text-[#37352f]/70 hover:bg-black/5 p-2 rounded text-left">
                <Share2 className="w-4 h-4 text-blue-500" /> Share & Permissions
              </button>
              <button onClick={() => openWindow('assistant', 'AI Writing Assistant')} className="flex items-center gap-2 text-xs text-[#37352f]/70 hover:bg-black/5 p-2 rounded text-left">
                <Brain className="w-4 h-4 text-blue-500" /> AI Assistant
              </button>
            </div>
          </div>

          {/* Notifications */}
          {unreadCount > 0 && (
            <div className="px-3 border-t border-black/5 pt-3 pb-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#37352f]/50 uppercase tracking-wider">Notifications</span>
                <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">{unreadCount}</span>
              </div>
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                {currentUserNotifications.slice(0, 5).map(n => (
                  <div key={n.id} className={cn("text-xs p-2 rounded", n.read ? "text-[#37352f]/40" : "bg-blue-50 text-[#37352f]/70")}>
                    {n.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New page */}
          <div className="mt-auto">
            <div
              onClick={() => addPage(null)}
              className="p-3 border-t border-black/5 flex items-center gap-2 hover:bg-black/5 cursor-pointer text-sm font-medium text-[#37352f]/70"
            >
              <Plus className="w-4 h-4" />
              <span>New campaign</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div
        className="flex-1 h-full overflow-y-auto flex flex-col relative bg-white"
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
              <img loading="lazy" src={activePage.coverImage} className="w-full h-full object-cover" alt="Cover" />
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
        <div className="sticky top-0 z-40 w-full flex items-center justify-between p-3 border-b border-transparent bg-white/80 backdrop-blur-md">
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
                      className={cn("text-sm hover:bg-black/5 px-1.5 py-0.5 rounded truncate transition-colors flex items-center gap-1",
                        i === breadcrumbs.length - 1 ? "font-medium text-[#37352f]" : "text-[#37352f]/60"
                      )}
                      onClick={() => setActivePageId(p.id)}
                    >
                      {p.level && LEVEL_ICONS[p.level] && React.createElement(LEVEL_ICONS[p.level], { className: "w-3 h-3" })}
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
            {/* Notifications */}
            {unreadCount > 0 && (
              <button className="p-1 hover:bg-black/5 rounded relative" title={`${unreadCount} unread notifications`}>
                <Bell className="w-4 h-4 text-[#37352f]/70" />
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full text-[8px] text-white font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </button>
            )}
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
            <div className="relative" ref={moreMenuRef}>
              <button 
                onClick={() => setMoreMenuOpen(!moreMenuOpen)} 
                className="p-1 hover:bg-black/5 rounded relative"
              >
                <MoreHorizontal className="w-4 h-4 text-[#37352f]/70" />
              </button>
              {moreMenuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-black/10 rounded-xl shadow-2xl w-56 py-2 z-50">
                  {activePage && (
                    <>
                      <button onClick={() => { deletePage(activePage.id); setMoreMenuOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <Trash className="w-4 h-4" /> Move to Trash
                      </button>
                      <button onClick={() => { navigator.clipboard.writeText(activePage.title); setMoreMenuOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#37352f]/70 hover:bg-black/5 transition-colors">
                        <Copy className="w-4 h-4" /> Copy title
                      </button>
                      <button onClick={() => { setShareModalOpen(true); setMoreMenuOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#37352f]/70 hover:bg-black/5 transition-colors">
                        <Share2 className="w-4 h-4" /> Share & Permissions
                      </button>
                      <button onClick={() => { openWindow('assistant', 'AI Writing Assistant'); setMoreMenuOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#37352f]/70 hover:bg-black/5 transition-colors">
                        <Brain className="w-4 h-4" /> AI Assistant
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        {activePage ? (
          <div className="max-w-4xl w-full mx-auto px-12 py-8 flex-1 flex flex-col focus-within:ring-0 pb-32">
            {/* Hierarchy level badge */}
            {activePage.level && (
              <div className="flex items-center gap-2 mb-4">
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider",
                  activePage.level === 'campaign' ? 'bg-purple-100 text-purple-700' :
                  activePage.level === 'phase' ? 'bg-blue-100 text-blue-700' :
                  activePage.level === 'task' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-700'
                )}>
                  {activePage.level}
                </span>
                {activePage.status && (
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full",
                    activePage.status === 'todo' ? 'bg-slate-200 text-slate-600' :
                    activePage.status === 'in-progress' ? 'bg-blue-200 text-blue-700' :
                    activePage.status === 'review' ? 'bg-amber-200 text-amber-700' :
                    activePage.status === 'done' ? 'bg-emerald-200 text-emerald-700' :
                    'bg-red-200 text-red-700'
                  )}>
                    {activePage.status}
                  </span>
                )}
                {activePage.assignee && (
                  <span className="text-xs text-[#37352f]/50">@{activePage.assignee}</span>
                )}
                {activePage.dueDate && (
                  <span className="text-xs text-[#37352f]/50">Due {activePage.dueDate}</span>
                )}
              </div>
            )}

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
                        document.getElementById(`block-${activePage.blocks[0]!.id}`)?.focus();
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

            {/* Task status controls */}
            {(activePage.level === 'task' || activePage.level === 'subtask') && (
              <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-lg border border-black/5">
                <span className="text-xs font-semibold text-[#37352f]/50 uppercase tracking-wider">Status:</span>
                {(['todo', 'in-progress', 'review', 'done', 'blocked'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => updatePage(activePage.id, { status })}
                    className={cn("px-3 py-1 rounded-lg text-xs font-medium border transition-colors",
                      activePage.status === status
                        ? status === 'done' ? "bg-emerald-500 text-white border-emerald-500"
                          : status === 'in-progress' ? "bg-blue-500 text-white border-blue-500"
                          : status === 'review' ? "bg-amber-500 text-white border-amber-500"
                          : status === 'blocked' ? "bg-red-500 text-white border-red-500"
                          : "bg-slate-500 text-white border-slate-500"
                        : "bg-white text-[#37352f]/60 border-black/10 hover:border-slate-300"
                    )}
                  >
                    {status}
                  </button>
                ))}
                <span className="text-xs text-[#37352f]/40 ml-auto">
                  Assignee: <select
                    value={activePage.assignee || ''}
                    onChange={(e) => updatePage(activePage.id, { assignee: e.target.value || undefined })}
                    className="bg-transparent border-none text-xs text-[#37352f]/70 outline-none cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </span>
              </div>
            )}

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
          <div className="flex-1 flex flex-col items-center justify-center text-[#37352f]/40 text-sm gap-4">
            <div className="text-6xl">🎯</div>
            <div className="text-lg font-medium text-[#37352f]/60">Select or create a campaign</div>
            <div className="flex gap-2">
              {TEMPLATES.slice(0, 4).map(t => (
                <button key={t.name} onClick={() => applyTemplate(t)} className="flex items-center gap-2 px-4 py-2 bg-white border border-black/10 rounded-lg text-sm hover:bg-black/5 transition-colors">
                  <span>{t.icon}</span> {t.name}
                </button>
              ))}
            </div>
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

            <h2 className="text-xl font-bold mb-2">Share {activePage.level === 'campaign' ? 'Campaign' : 'Page'}</h2>
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
                        {PERMISSION_LABELS[level]!.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 bg-white border border-black/5 p-2 rounded-lg">
                    <input
                      type="text"
                      readOnly
                      value={`https://os.continuaos.com/c/${activePage.id}`}
                      className="text-xs w-full outline-none text-[#37352f]/60 bg-transparent px-1"
                    />
                    <button className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded transition-colors" title="Copy Link">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-[#37352f]/40 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Permission: {PERMISSION_LABELS[activePage.share?.publicAccess || 'viewer']?.label}
                  </div>
                </>
              )}
            </div>

            {/* Campaign share link (for campaigns) */}
            {activePage.level === 'campaign' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold text-sm">Client Share Link</span>
                </div>
                <p className="text-xs text-[#37352f]/60 mb-3">Generate a read-only link for clients to view this campaign.</p>
                <div className="flex gap-2">
                  <input
                    id="client-name-input"
                    type="text"
                    placeholder="Client name (optional)"
                    className="flex-1 border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
                  />
                  <button
                    onClick={() => {
                      const name = (document.getElementById('client-name-input') as HTMLInputElement)?.value;
                      const share = createShareLink(activePage.id, name || 'Client Access', name);
                      updatePage(activePage.id, { shared: true });
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
                  >
                    Generate Link
                  </button>
                </div>
                {(getCampaignShares(activePage.id).length > 0) && (
                  <div className="mt-3 space-y-2">
                    {getCampaignShares(activePage.id).map(share => (
                      <div key={share.id} className="flex items-center gap-2 bg-white border border-black/5 p-2 rounded-lg">
                        <Link2 className="w-4 h-4 text-blue-500" />
                        <span className="text-xs flex-1 truncate">{share.label || 'Shared link'}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`https://os.continuaos.com/shared/${share.token}`);
                          }}
                          className="text-xs text-blue-500 hover:underline"
                        >
                          Copy
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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

            <div className="mt-4 pt-4 border-t border-black/5 text-xs text-[#37352f]/40 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Shared pages are private by default. Only invited people can access them.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
