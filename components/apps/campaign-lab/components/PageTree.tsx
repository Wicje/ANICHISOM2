import React from 'react';
import { Page } from '../types';
import { ChevronRight, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageTreeProps {
  pages: Page[];
  activePageId: string | null;
  setActivePageId: (id: string) => void;
  updatePage: (id: string, updates: Partial<Page>) => void;
  addPage: (parentId: string | null, e?: React.MouseEvent) => void;
  deletePage: (id: string, e?: React.MouseEvent) => void;
  parentId?: string | null;
  indent?: number;
}

export function PageTree({ 
  pages, 
  activePageId, 
  setActivePageId, 
  updatePage, 
  addPage, 
  deletePage, 
  parentId = null, 
  indent = 0 
}: PageTreeProps) {
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
