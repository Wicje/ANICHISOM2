import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Block, BlockType, DatabaseSchema, DatabaseStore } from '@/lib/campaign-types';
import { SLASH_COMMANDS, TEAM_MEMBERS } from '@/lib/campaign-data';
import { DatabaseView } from './DatabaseView';
import { GripVertical, CheckSquare, Square, Image as ImageIcon, Trash2, AtSign, ChevronRight, Copy, Table2, Code2, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOS } from '@/lib/os-context';

const CALLOUT_ICONS = ['💡', '⚠️', '📌', '✅', '❌', '🔥', '📝', '🎯', '💬', '⭐'];
const CODE_LANGUAGES = ['plaintext', 'javascript', 'typescript', 'python', 'html', 'css', 'json', 'bash', 'sql', 'markdown'];

interface BlockEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  databaseStore: DatabaseStore;
  onUpdateDatabase: (dbId: string, updates: Partial<DatabaseSchema>) => void;
  pageId: string;
  onUpdateBlockInEditor: (blockId: string, updates: Partial<Block>) => void;
}

export function BlockEditor({ blocks, onChange, databaseStore, onUpdateDatabase, pageId, onUpdateBlockInEditor }: BlockEditorProps) {
  const { openWindow } = useOS();
  const [slashMenu, setSlashMenu] = useState<{ index: number, x: number, y: number, query: string, selectedIndex: number } | null>(null);
  const [mentionMenu, setMentionMenu] = useState<{ index: number, x: number, y: number, query: string, selectedIndex: number } | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [toggleOpen, setToggleOpen] = useState<Record<string, boolean>>({});
  const menuRef = useRef<HTMLDivElement>(null);

  const updateBlock = (index: number, updates: Partial<Block>) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index]!, ...updates };
    onChange(newBlocks);
  };

  const filteredSlashCommands = slashMenu ? SLASH_COMMANDS.filter(c => c.label.toLowerCase().includes(slashMenu.query.toLowerCase()) || c.id.includes(slashMenu.query.toLowerCase())) : [];
  const filteredMembers = mentionMenu ? TEAM_MEMBERS.filter(m => m.toLowerCase().includes(mentionMenu.query.toLowerCase())) : [];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    const el = e.currentTarget;

    if (e.key === 'Escape') {
      if (slashMenu) setSlashMenu(null);
      if (mentionMenu) setMentionMenu(null);
      return;
    }

    if (slashMenu) {
       if (e.key === 'ArrowDown') {
         e.preventDefault();
         setSlashMenu(prev => prev ? { ...prev, selectedIndex: Math.min(prev.selectedIndex + 1, filteredSlashCommands.length - 1) } : null);
         return;
       }
       if (e.key === 'ArrowUp') {
         e.preventDefault();
         setSlashMenu(prev => prev ? { ...prev, selectedIndex: Math.max(prev.selectedIndex - 1, 0) } : null);
         return;
       }
       if (e.key === 'Enter') {
         e.preventDefault();
         if (filteredSlashCommands[slashMenu.selectedIndex]) {
            executeSlashCommand(filteredSlashCommands[slashMenu.selectedIndex]!.id);
         }
         return;
       }
    }

    if (mentionMenu) {
       if (e.key === 'ArrowDown') {
         e.preventDefault();
         setMentionMenu(prev => prev ? { ...prev, selectedIndex: Math.min(prev.selectedIndex + 1, filteredMembers.length - 1) } : null);
         return;
       }
       if (e.key === 'ArrowUp') {
         e.preventDefault();
         setMentionMenu(prev => prev ? { ...prev, selectedIndex: Math.max(prev.selectedIndex - 1, 0) } : null);
         return;
       }
       if (e.key === 'Enter') {
         e.preventDefault();
         if (filteredMembers[mentionMenu.selectedIndex]) {
            executeMention(filteredMembers[mentionMenu.selectedIndex]!);
         }
         return;
       }
    }

    if (e.key === 'Enter') {
      if (!e.shiftKey) {
        e.preventDefault();
        const currentBlock = blocks[index]!;
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
      if (blocks[index]!.type !== 'p' && blocks[index]!.content === '') {
         e.preventDefault();
         updateBlock(index, { type: 'p' });
      } else if (index > 0) {
        e.preventDefault();
        const prevBlock = blocks[index - 1]!;
        const mergedContent = prevBlock.content + blocks[index]!.content;
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
      e.preventDefault();
      document.getElementById(`block-${blocks[index - 1]!.id}`)?.focus();
    } else if (e.key === 'ArrowDown' && el.selectionStart === el.value.length && index < blocks.length - 1) {
      e.preventDefault();
      document.getElementById(`block-${blocks[index + 1]!.id}`)?.focus();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>, index: number) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
    
    updateBlock(index, { content: e.target.value });

    const val = e.target.value.slice(0, e.target.selectionStart);
    const slashMatch = val.match(/(?:\s|^)\/([a-zA-Z0-9-]*)$/);
    const mentionMatch = val.match(/(?:\s|^)@([a-zA-Z0-9-]*)$/);
    
    const rect = e.target.getBoundingClientRect();
    
    if (slashMatch) {
      setSlashMenu({ index, x: rect.left, y: rect.bottom, query: slashMatch[1] || '', selectedIndex: 0 });
      setMentionMenu(null);
    } else if (mentionMatch) {
      setMentionMenu({ index, x: rect.left + 50, y: rect.bottom, query: mentionMatch[1] || '', selectedIndex: 0 });
      setSlashMenu(null);
    } else {
      setSlashMenu(null);
      setMentionMenu(null);
    }
  };

  const executeSlashCommand = (cmdId: string) => {
    if (!slashMenu) return;
    const { index } = slashMenu;
    const block = blocks[index]!;
    const textBeforeSlash = block.content.substring(0, block.content.lastIndexOf('/'));
    
    const newBlocks = [...blocks];
    
    if (cmdId === 'action-ai') {
       openWindow('assistant', 'System AI');
       newBlocks[index] = { ...block, content: textBeforeSlash };
    } else if (cmdId.startsWith('action-')) {
       openWindow('assistant', cmdId.replace('action-', 'AI '));
       newBlocks[index] = { ...block, content: textBeforeSlash };
    } else {
       const extra: Partial<Block> = {};
       if (cmdId === 'table') {
         extra.columns = ['Column 1', 'Column 2', 'Column 3'];
         extra.rows = [['', '', ''], ['', '', '']];
       }
       if (cmdId === 'toggle') {
         extra.children = [{ id: `child-${Date.now()}`, type: 'p', content: '' }];
       }
       if (cmdId === 'code') {
         extra.language = 'plaintext';
       }
       if (cmdId === 'callout') {
         extra.icon = '💡';
       }
       newBlocks[index] = { ...block, type: cmdId as BlockType, content: textBeforeSlash, ...extra };
    }
    
    onChange(newBlocks);
    setSlashMenu(null);
    setTimeout(() => document.getElementById(`block-${block.id}`)?.focus(), 0);
  };

  const executeMention = (memberName: string) => {
    if (!mentionMenu) return;
    const { index } = mentionMenu;
    const block = blocks[index]!;
    const lastAtIdx = block.content.lastIndexOf('@');
    const textBefore = block.content.substring(0, lastAtIdx);
    const textAfter = block.content.substring(lastAtIdx + mentionMenu.query.length + 1);
    
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
    newBlocks.splice(dropIdx, 0, removed!);
    onChange(newBlocks);
    setDraggedIdx(null);
  };

  useEffect(() => {
    blocks.forEach(b => {
      const el = document.getElementById(`block-${b.id}`);
      if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
    });
  }, [blocks.length]);
  
  // Scroll selected menu item into view
  useEffect(() => {
    if (menuRef.current) {
      const selectedEl = menuRef.current.querySelector('.bg-black\\/5') as HTMLElement;
      if (selectedEl) {
         selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [slashMenu?.selectedIndex, mentionMenu?.selectedIndex]);

  return (
    <div className="flex-1 w-full pb-32">
      {blocks.map((block, index) => {
        const textClass = cn(
          "w-full resize-none border-none outline-none bg-transparent overflow-hidden leading-relaxed",
          block.type === 'h1' && "text-4xl font-bold font-display mt-6 mb-2",
          block.type === 'h2' && "text-2xl font-semibold font-display mt-5 mb-1",
          block.type === 'h3' && "text-xl font-medium font-display mt-4 mb-1",
          ['p', 'todo', 'bullet', 'num', 'toggle'].includes(block.type) && "text-base text-[#37352f] min-h-[24px]",
          block.type === 'quote' && "text-lg text-[#37352f] pl-4 border-l-4 border-black/20 italic my-2",
          block.type === 'callout' && "text-base bg-[#f7f7f5] p-4 rounded-lg my-2 flex items-start gap-3",
          block.type === 'divider' && "h-0 text-transparent min-h-0 py-2 my-2 border-b border-black/10 select-none",
          block.type === 'code' && "text-sm font-mono bg-[#f7f7f5] border border-black/5 p-4 rounded-lg text-[#37352f] min-h-[80px] my-2 w-full",
          ['image', 'database', 'board', 'calendar', 'list', 'gallery', 'timeline', 'linked', 'video', 'audio', 'file', 'web', 'table'].includes(block.type) && "hidden"
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
             {block.type === 'num' && (
                <div className="mt-1 mr-2 ml-1 text-sm text-[#37352f]/60 font-medium shrink-0">{index + 1}.</div>
             )}
             {block.type === 'toggle' && (
                <div className="mt-1.5 mr-1 cursor-pointer shrink-0" onClick={() => setToggleOpen(prev => ({ ...prev, [block.id]: !prev[block.id] }))}>
                  <div className="w-4 h-4 flex items-center justify-center hover:bg-black/5 rounded transition-transform" style={{ transform: toggleOpen[block.id] ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                     <ChevronRight className="w-3 h-3 text-[#37352f]/60" />
                  </div>
                </div>
             )}
             {block.type === 'callout' && (
                <div className="mt-5 mr-3 shrink-0 text-xl ml-2 cursor-pointer group/callout relative" onClick={() => {
                  const currentIcon = block.icon || '💡';
                  const currentIdx = CALLOUT_ICONS.indexOf(currentIcon);
                  const nextIcon = CALLOUT_ICONS[(currentIdx + 1) % CALLOUT_ICONS.length];
                  updateBlock(index, { icon: nextIcon });
                }}>
                  {block.icon || '💡'}
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-black/30 opacity-0 group-hover/callout:opacity-100 transition-opacity whitespace-nowrap">click to change</span>
                </div>
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
                ) : block.type === 'table' ? (
                  <TableBlock block={block} index={index} updateBlock={updateBlock} />
                ) : block.type === 'code' ? (
                  <CodeBlock block={block} index={index} updateBlock={updateBlock} handleChange={handleChange} handleKeyDown={handleKeyDown} />
                ) : ['database', 'board', 'calendar', 'list', 'gallery', 'timeline', 'linked', 'form'].includes(block.type) ? (
                  <DatabaseView
                    block={block}
                    databaseStore={databaseStore}
                    onUpdateDatabase={onUpdateDatabase}
                    onUpdateBlock={(updates) => onUpdateBlockInEditor(block.id, updates)}
                  />
                ) : ['video', 'audio', 'file', 'web'].includes(block.type) ? (
                  <div className="py-2">
                      <div className="bg-slate-50 border border-black/10 rounded-lg p-4 flex flex-col gap-2 relative">
                        <div className="text-sm font-medium text-[#37352f]/70 mb-1 flex items-center gap-2 capitalize">
                           <ImageIcon className="w-4 h-4" /> Embed {block.type}
                        </div>
                        <input type="text" placeholder={`Paste ${block.type} URL and press Enter...`} className="w-full bg-white border border-black/10 rounded p-2 text-sm outline-none focus:border-blue-500"
                          onKeyDown={(e) => {
                            if(e.key === 'Backspace' && e.currentTarget.value === '') updateBlock(index, { type: 'p' });
                          }}
                        />
                      </div>
                  </div>
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
             {block.type === 'toggle' && toggleOpen[block.id] && block.children && block.children.length > 0 && (
               <div className="ml-6 mt-1 border-l-2 border-black/10 pl-4">
                 {block.children.map((child, childIdx) => (
                   <div key={child.id} className="py-0.5">
                     <textarea
                       id={`block-${child.id}`}
                       className={cn(
                         "w-full resize-none border-none outline-none bg-transparent overflow-hidden leading-relaxed text-base text-[#37352f] min-h-[24px]",
                         child.checked && "line-through text-[#37352f]/40"
                       )}
                       value={child.content}
                       placeholder="Type '/' for commands..."
                       onChange={(e) => {
                         e.target.style.height = 'auto';
                         e.target.style.height = `${e.target.scrollHeight}px`;
                         const newChildren = [...block.children!];
                          newChildren[childIdx] = { ...newChildren[childIdx]!, content: e.target.value };
                          updateBlock(index, { children: newChildren });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            const cursor = e.currentTarget.selectionStart;
                            const textBefore = child.content.substring(0, cursor);
                            const textAfter = child.content.substring(cursor);
                            const newChildren = [...block.children!];
                            newChildren[childIdx] = { ...newChildren[childIdx]!, content: textBefore };
                           const newChild: Block = { id: crypto.randomUUID(), type: child.type === 'todo' ? 'todo' : child.type === 'bullet' ? 'bullet' : 'p', content: textAfter };
                           newChildren.splice(childIdx + 1, 0, newChild);
                           updateBlock(index, { children: newChildren });
                           setTimeout(() => {
                             const nextEl = document.getElementById(`block-${newChild.id}`) as HTMLTextAreaElement;
                             if (nextEl) { nextEl.focus(); nextEl.setSelectionRange(0, 0); }
                           }, 0);
                         }
                       }}
                       rows={1}
                       spellCheck={false}
                     />
                   </div>
                 ))}
               </div>
             )}
          </div>
        )
      })}
      {slashMenu && filteredSlashCommands.length > 0 && typeof document !== 'undefined' && createPortal(
        <div ref={menuRef} className="fixed z-[9999] bg-white border border-black/10 rounded-xl shadow-2xl w-72 flex flex-col py-2" style={{ top: Math.min(slashMenu.y + 4, window.innerHeight - 300), left: Math.min(slashMenu.x, window.innerWidth - 300) }}>
           <div className="px-3 pb-2 text-[10px] font-bold tracking-widest text-[#37352f]/50 uppercase">Basic Blocks</div>
           <div className="flex-1 overflow-y-auto max-h-[300px] custom-scrollbar">
             {filteredSlashCommands.map((cmd, i) => (
              <button key={cmd.id} className={cn("flex items-center gap-3 w-full text-left px-3 py-2 text-[#37352f] transition-colors", i === slashMenu.selectedIndex ? "bg-black/5" : "hover:bg-black/5")} onClick={() => executeSlashCommand(cmd.id)}>
                <cmd.icon className="w-4 h-4 shrink-0 text-[#37352f]/70" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{cmd.label}</span>
                </div>
              </button>
             ))}
           </div>
        </div>, document.body
      )}

      {mentionMenu && filteredMembers.length > 0 && typeof document !== 'undefined' && createPortal(
        <div ref={menuRef} className="fixed z-[9999] bg-white border border-black/10 rounded-xl shadow-2xl w-56 flex flex-col py-2" style={{ top: Math.min(mentionMenu.y + 4, window.innerHeight - 200), left: Math.min(mentionMenu.x, window.innerWidth - 200) }}>
           <div className="px-3 pb-2 text-[10px] font-bold tracking-widest text-[#37352f]/50 uppercase">Team Members</div>
           <div className="flex-1 overflow-y-auto max-h-[200px] custom-scrollbar">
             {filteredMembers.map((member, i) => (
              <button key={member} className={cn("flex items-center gap-2 w-full text-left px-3 py-1.5 text-[#37352f] transition-colors", i === mentionMenu.selectedIndex ? "bg-black/5" : "hover:bg-black/5")} onClick={() => executeMention(member)}>
                <AtSign className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-sm font-medium">{member.replace('@', '')}</span>
              </button>
             ))}
           </div>
        </div>, document.body
      )}
    </div>
  )
}

function TableBlock({ block, index, updateBlock }: { block: Block, index: number, updateBlock: (index: number, updates: Partial<Block>) => void }) {
  const defaultCols = ['Column 1', 'Column 2', 'Column 3'];
  const defaultRows = [['', '', ''], ['', '', '']];
  const columns = block.columns || defaultCols;
  const rows = block.rows || defaultRows;

  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    const newRows = [...rows];
    newRows[rowIdx] = [...newRows[rowIdx]!];
    newRows[rowIdx][colIdx] = value;
    updateBlock(index, { rows: newRows, columns });
  };

  const updateColumn = (colIdx: number, value: string) => {
    const newCols = [...columns];
    newCols[colIdx] = value;
    updateBlock(index, { rows, columns: newCols });
  };

  const addRow = () => {
    const newRows = [...rows, Array(columns.length).fill('')];
    updateBlock(index, { rows: newRows, columns });
  };

  const addColumn = () => {
    const newCols = [...columns, `Column ${columns.length + 1}`];
    const newRows = rows.map(r => [...r, '']);
    updateBlock(index, { rows: newRows, columns: newCols });
  };

  const deleteRow = (rowIdx: number) => {
    if (rows.length <= 1) return;
    const newRows = rows.filter((_, i) => i !== rowIdx);
    updateBlock(index, { rows: newRows, columns });
  };

  const deleteColumn = (colIdx: number) => {
    if (columns.length <= 1) return;
    const newCols = columns.filter((_, i) => i !== colIdx);
    const newRows = rows.map(r => r.filter((_, i) => i !== colIdx));
    updateBlock(index, { rows: newRows, columns: newCols });
  };

  return (
    <div className="my-2 border border-black/10 rounded-xl overflow-hidden bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-black/5">
        <Table2 className="w-4 h-4 text-[#37352f]/50" />
        <span className="text-xs font-medium text-[#37352f]/50">Table</span>
        <button onClick={addRow} className="ml-auto text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50">+ Row</button>
        <button onClick={addColumn} className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50">+ Col</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr>
              {columns.map((col, colIdx) => (
                <th key={colIdx} className="relative p-2 border-b border-black/10 bg-slate-50/50 group/th">
                  <input
                    className="w-full bg-transparent outline-none font-medium text-[#37352f]/50 text-xs uppercase tracking-wider"
                    value={col}
                    onChange={(e) => updateColumn(colIdx, e.target.value)}
                  />
                  {columns.length > 1 && (
                    <button className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/th:opacity-100 text-[#37352f]/30 hover:text-red-500 transition-opacity" onClick={() => deleteColumn(colIdx)}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b border-black/5 last:border-0 group/tr hover:bg-slate-50/30">
                {row.map((cell, colIdx) => (
                  <td key={colIdx} className="p-2">
                    <input
                      className="w-full bg-transparent outline-none text-[#37352f] text-sm"
                      value={cell}
                      onChange={(e) => updateCell(rowIdx, colIdx, e.target.value)}
                      placeholder="—"
                    />
                  </td>
                ))}
                {rows.length > 1 && (
                  <td className="w-6 opacity-0 group-hover/tr:opacity-100 transition-opacity">
                    <button className="text-[#37352f]/30 hover:text-red-500" onClick={() => deleteRow(rowIdx)}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CodeBlock({ block, index, updateBlock, handleChange, handleKeyDown }: { block: Block, index: number, updateBlock: (index: number, updates: Partial<Block>) => void, handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>, index: number) => void, handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => void }) {
  const language = block.language || 'plaintext';

  const copyCode = () => {
    navigator.clipboard.writeText(block.content);
    window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Copied', description: 'Code copied to clipboard.' } }));
  };

  return (
    <div className="my-2 relative">
      <div className="flex items-center justify-between px-4 py-1 bg-[#f7f7f5] border border-black/5 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-[#37352f]/40" />
          <select
            className="text-xs bg-transparent outline-none text-[#37352f]/50 border-none cursor-pointer font-medium"
            value={language}
            onChange={(e) => updateBlock(index, { language: e.target.value })}
          >
            {CODE_LANGUAGES.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
        <button onClick={copyCode} className="text-xs text-[#37352f]/40 hover:text-[#37352f] flex items-center gap-1 px-2 py-1 rounded hover:bg-black/5 transition-colors">
          <Copy className="w-3 h-3" /> Copy
        </button>
      </div>
      <textarea
        id={`block-${block.id}`}
        className="w-full resize-none outline-none bg-[#f7f7f5] border border-black/5 border-t-0 rounded-b-lg p-4 text-sm font-mono text-[#37352f] min-h-[80px] overflow-hidden leading-relaxed"
        value={block.content}
        placeholder="Write code..."
        onChange={(e) => handleChange(e, index)}
        onKeyDown={(e) => handleKeyDown(e, index)}
        rows={1}
        spellCheck={false}
      />
    </div>
  );
}
