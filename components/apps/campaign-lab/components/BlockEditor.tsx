import React, { useState, useEffect } from 'react';
import { Block, BlockType } from '../types';
import { SLASH_COMMANDS, TEAM_MEMBERS } from '../data';
import { DatabaseView } from './DatabaseView';
import { GripVertical, CheckSquare, Square, Image as ImageIcon, Trash2, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BlockEditor({ blocks, onChange }: { blocks: Block[], onChange: (blocks: Block[]) => void }) {
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

    if (e.key === 'Escape') {
      if (slashMenu) setSlashMenu(null);
      if (mentionMenu) setMentionMenu(null);
      return;
    }

    if (e.key === 'Enter') {
      if (slashMenu || mentionMenu) {
        e.preventDefault(); 
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
    
    const rect = e.target.getBoundingClientRect();
    
    if (slashMatch) {
      setSlashMenu({ index, x: rect.left, y: rect.bottom, query: slashMatch[1] || '' });
      setMentionMenu(null);
    } else if (mentionMatch) {
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
          block.type === 'code' && "text-sm font-mono bg-[#f7f7f5] border border-black/5 p-4 rounded-lg text-[#37352f] min-h-[80px] my-2 w-full",
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
