'use client';

import React, { useState } from 'react';
import { OSWindow } from '@/lib/os-context';
import { Save, Plus, FileText, FileDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
}

export function Notes({ window }: { window: OSWindow }) {
  const [notes, setNotes] = useState<Note[]>([
    {
      id: '1',
      title: 'ANICHISOM OS Architecture',
      content: '# Layer 1\n- Persistent State\n- Auth + Workspaces\n- Real-time Presence',
      updatedAt: new Date()
    },
    {
      id: '2',
      title: 'Meeting Notes - Nike Q3',
      content: 'Discussed new campaign lab timeline. Deliverables expected by Friday.',
      updatedAt: new Date(Date.now() - 86400000)
    }
  ]);
  const [activeNoteId, setActiveNoteId] = useState<string>(notes[0].id);

  const activeNote = notes.find(n => n.id === activeNoteId);

  const handleCreateNote = () => {
    const newNote = {
      id: crypto.randomUUID(),
      title: 'Untitled Note',
      content: '',
      updatedAt: new Date()
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  };

  const updateActiveNote = (updates: Partial<Note>) => {
    setNotes(notes.map(n => n.id === activeNoteId ? { ...n, ...updates, updatedAt: new Date() } : n));
  };

  return (
    <div className="flex h-full bg-[#1e1e1e] text-white">
      {/* Sidebar */}
      <div className="w-64 border-r border-white/10 flex flex-col bg-[#252526]">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <span className="font-semibold text-sm">Notes</span>
          <button onClick={handleCreateNote} className="hover:bg-white/10 p-1.5 rounded transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="p-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input 
              type="text" 
              placeholder="Search notes..." 
              className="w-full bg-[#3c3c3c] border-none rounded text-xs py-2 pl-9 pr-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {notes.map(note => (
            <button
              key={note.id}
              onClick={() => setActiveNoteId(note.id)}
              className={cn(
                "w-full text-left p-3 border-b border-white/5 transition-colors",
                activeNoteId === note.id ? "bg-[#37373d]" : "hover:bg-[#2a2d2e]"
              )}
            >
              <div className="text-sm font-medium truncate">{note.title}</div>
              <div className="text-xs text-white/50 truncate mt-1">{note.content.substring(0, 40) || 'No content...'}</div>
              <div className="text-[10px] text-white/30 mt-2">{note.updatedAt.toLocaleDateString()}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col bg-[#1e1e1e]">
        {activeNote ? (
          <>
            <div className="h-12 border-b border-white/10 flex items-center px-4 justify-between bg-[#252526]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <input 
                  type="text" 
                  value={activeNote.title}
                  onChange={(e) => updateActiveNote({ title: e.target.value })}
                  className="bg-transparent border-none focus:outline-none text-sm font-medium w-64 text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">Last edited just now</span>
                <button className="hover:bg-white/10 p-1.5 rounded transition-colors text-white/70" title="Export to PDF">
                  <FileDown className="w-4 h-4" />
                </button>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              <textarea 
                value={activeNote.content}
                onChange={(e) => updateActiveNote({ content: e.target.value })}
                className="w-full h-full bg-transparent border-none focus:outline-none resize-none text-sm font-mono leading-relaxed"
                placeholder="Start writing..."
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/40 text-sm">
            Select or create a note
          </div>
        )}
      </div>
    </div>
  );
}
