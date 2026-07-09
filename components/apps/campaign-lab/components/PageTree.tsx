import React, { useState, useMemo } from 'react';
import { Page } from '../types';
import { ChevronRight, Trash2, Plus, Star, StarOff, Search, Clock, Trash, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageTreeProps {
  pages: Page[];
  activePageId: string | null;
  setActivePageId: (id: string) => void;
  updatePage: (id: string, updates: Partial<Page>) => void;
  addPage: (parentId: string | null, e?: React.MouseEvent) => void;
  deletePage: (id: string, e?: React.MouseEvent) => void;
  restorePage?: (id: string) => void;
  parentId?: string | null;
  indent?: number;
  searchQuery?: string;
  showTrash?: boolean;
}

export function PageTree({
  pages,
  activePageId,
  setActivePageId,
  updatePage,
  addPage,
  deletePage,
  restorePage,
  parentId = null,
  indent = 0,
  searchQuery = '',
  showTrash = false,
}: PageTreeProps) {
  const activePages = showTrash
    ? pages.filter(p => p.trash)
    : pages.filter(p => !p.trash);

  let childPages = activePages.filter(p => p.parentId === parentId);

  // Search filtering (only at root level)
  if (searchQuery && indent === 0) {
    const query = searchQuery.toLowerCase();
    const matchingIds = new Set<string>();
    activePages.forEach(p => {
      if (p.title.toLowerCase().includes(query)) {
        matchingIds.add(p.id);
        // Include ancestors so tree path is visible
        let ancestorId = p.parentId;
        while (ancestorId) {
          matchingIds.add(ancestorId);
          const ancestor = activePages.find(pp => pp.id === ancestorId);
          ancestorId = ancestor?.parentId || null;
        }
      }
    });
    childPages = childPages.filter(p => matchingIds.has(p.id));
  }

  if (childPages.length === 0 && indent === 0) return null;

  return (
    <>
      {childPages.map(page => {
        const hasChildren = activePages.some(p => p.parentId === page.id);
        const shouldExpand = searchQuery || page.expanded;
        return (
          <div key={page.id}>
            <div
              className={cn(
                "flex items-center gap-1 text-sm cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis rounded-md group text-[#37352f]/80 relative m-1",
                activePageId === page.id ? "bg-black/5 font-medium" : "hover:bg-black/5",
                page.favorite && !activePageId && "text-amber-600/80"
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
                  <ChevronRight className={cn("w-3 h-3 text-[#37352f]/40 transition-transform", shouldExpand && "rotate-90")} />
                ) : (
                  <div className="w-3 h-3 flex items-center justify-center"><div className="w-1 h-1 rounded-full bg-[#37352f]/20" /></div>
                )}
              </div>
              <span className="shrink-0">{page.icon}</span>
              <span className="truncate flex-1 py-0.5">{page.title || 'Untitled'}</span>

              {/* Favorite toggle */}
              <button
                className={cn("opacity-0 group-hover:opacity-100 shrink-0 p-1 hover:bg-black/10 rounded transition-opacity",
                  page.favorite && "!opacity-100"
                )}
                onClick={(e) => { e.stopPropagation(); updatePage(page.id, { favorite: !page.favorite }); }}
                title={page.favorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {page.favorite ? <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> : <StarOff className="w-3 h-3 text-[#37352f]/40" />}
              </button>

              <div className="opacity-0 group-hover:opacity-100 flex items-center shrink-0 pr-1 transition-opacity">
                {showTrash ? (
                  <>
                    <button className="p-1 hover:bg-emerald-50 rounded text-emerald-500" onClick={(e) => { e.stopPropagation(); restorePage?.(page.id); }} title="Restore">
                      <RotateCcw className="w-3 h-3" />
                    </button>
                    <button className="p-1 hover:bg-red-50 rounded text-red-400" onClick={(e) => deletePage(page.id, e)} title="Delete permanently">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <button className="p-1 hover:bg-black/10 rounded text-[#37352f]/50" onClick={(e) => deletePage(page.id, e)} title="Move to trash">
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <button className="p-1 hover:bg-black/10 rounded text-[#37352f]/50" onClick={(e) => addPage(page.id, e)} title="Add Sub-page">
                      <Plus className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </div>
            {shouldExpand && (
              <PageTree
                pages={pages}
                activePageId={activePageId}
                setActivePageId={setActivePageId}
                updatePage={updatePage}
                addPage={addPage}
                deletePage={deletePage}
                restorePage={restorePage}
                parentId={page.id}
                indent={indent + 1}
                searchQuery={indent === 0 ? searchQuery : ''}
                showTrash={showTrash}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

// ─── Sidebar Sections ───────────────────────────────────────

export function SidebarSections({
  pages,
  activePageId,
  setActivePageId,
  updatePage,
  addPage,
  deletePage,
  restorePage,
}: PageTreeProps & { restorePage: (id: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showRecent, setShowRecent] = useState(false);

  const nonTrashPages = useMemo(() => pages.filter(p => !p.trash), [pages]);
  const trashPages = useMemo(() => pages.filter(p => p.trash), [pages]);
  const favoritePages = useMemo(() => nonTrashPages.filter(p => p.favorite), [nonTrashPages]);
  const recentPages = useMemo(
    () => [...nonTrashPages].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5),
    [nonTrashPages]
  );

  return (
    <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
      {/* Search */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 bg-black/5 rounded-lg px-3 py-1.5">
          <Search className="w-4 h-4 text-[#37352f]/40 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search pages..."
            className="w-full text-sm outline-none bg-transparent text-[#37352f] placeholder:text-[#37352f]/40"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-0.5 hover:bg-black/10 rounded text-[#37352f]/40">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Favorites */}
      {favoritePages.length > 0 && !showTrash && (
        <div className="mb-2">
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className="px-3 py-1.5 flex items-center gap-2 text-xs font-semibold text-[#37352f]/50 uppercase tracking-wider hover:bg-black/5 w-full text-left"
          >
            <Star className="w-3.5 h-3.5 text-amber-500" />
            Favorites ({favoritePages.length})
            <ChevronRight className={cn("w-3 h-3 transition-transform", showFavorites && "rotate-90")} />
          </button>
          {showFavorites && favoritePages.map(p => (
            <div
              key={p.id}
              className={cn("flex items-center gap-2 text-sm cursor-pointer m-1 px-2 py-1 rounded-md",
                activePageId === p.id ? "bg-black/5 font-medium" : "hover:bg-black/5"
              )}
              onClick={() => setActivePageId(p.id)}
            >
              <span>{p.icon}</span>
              <span className="truncate">{p.title || 'Untitled'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent */}
      {!showTrash && !searchQuery && (
        <div className="mb-2">
          <button
            onClick={() => setShowRecent(!showRecent)}
            className="px-3 py-1.5 flex items-center gap-2 text-xs font-semibold text-[#37352f]/50 uppercase tracking-wider hover:bg-black/5 w-full text-left"
          >
            <Clock className="w-3.5 h-3.5" />
            Recent
            <ChevronRight className={cn("w-3 h-3 transition-transform", showRecent && "rotate-90")} />
          </button>
          {showRecent && recentPages.map(p => (
            <div
              key={p.id}
              className={cn("flex items-center gap-2 text-sm cursor-pointer m-1 px-2 py-1 rounded-md",
                activePageId === p.id ? "bg-black/5 font-medium" : "hover:bg-black/5"
              )}
              onClick={() => setActivePageId(p.id)}
            >
              <span>{p.icon}</span>
              <span className="truncate">{p.title || 'Untitled'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Page Tree */}
      {!showTrash && (
        <div className="px-3 pb-2">
          <span className="text-xs font-semibold text-[#37352f]/50 uppercase tracking-wider">
            Pages
          </span>
        </div>
      )}

      {showTrash && (
        <div className="px-3 pb-2">
          <span className="text-xs font-semibold text-[#37352f]/50 uppercase tracking-wider flex items-center gap-1">
            <Trash className="w-3.5 h-3.5" /> Trash ({trashPages.length})
          </span>
        </div>
      )}

      <PageTree
        pages={pages}
        activePageId={activePageId}
        setActivePageId={setActivePageId}
        updatePage={updatePage}
        addPage={addPage}
        deletePage={deletePage}
        restorePage={restorePage}
        searchQuery={searchQuery}
        showTrash={showTrash}
      />

      {nonTrashPages.length === 0 && !showTrash && (
        <div className="px-5 py-4 text-xs text-[#37352f]/40 italic">No pages yet.</div>
      )}
      {trashPages.length === 0 && showTrash && (
        <div className="px-5 py-4 text-xs text-[#37352f]/40 italic">Trash is empty.</div>
      )}

      {/* Trash toggle */}
      <div className="px-3 mt-4 border-t border-black/5 pt-3">
        <button
          onClick={() => setShowTrash(!showTrash)}
          className={cn("flex items-center gap-2 text-xs px-2 py-1.5 w-full hover:bg-black/5 rounded text-left transition-colors",
            showTrash ? "text-red-500 font-medium" : "text-[#37352f]/50"
          )}
        >
          <Trash className="w-3.5 h-3.5" />
          {showTrash ? 'Back to pages' : `Trash (${trashPages.length})`}
        </button>
      </div>
    </div>
  );
}
