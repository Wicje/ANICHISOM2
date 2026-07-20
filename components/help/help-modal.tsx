'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, BookOpen, ExternalLink, MessageCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const HELP_TOPICS = [
  { id: 'campaign-lab', title: 'Campaign Lab', description: 'Manage projects, tasks, and team collaboration.', icon: BookOpen },
  { id: 'moodboard', title: 'Moodboard', description: 'Master the infinite canvas for visual ideation.', icon: Palette },
  { id: 'os-basics', title: 'OS Basics', description: 'Learn how to navigate the Continua OS interface.', icon: Info },
];

// Recreate missing icons to avoid import issues
function Palette(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>;
}

export function HelpModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+? or Ctrl+?
      if ((e.metaKey || e.ctrlKey) && e.key === '?') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredTopics = HELP_TOPICS.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center z-[90]"
        title="Help & Resources (Cmd+?)"
      >
        <span className="text-xl font-bold">?</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div ref={modalRef} className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-black/5 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Search help topics..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800"
                />
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              <div className="p-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Suggested Topics</div>
              <div className="flex flex-col gap-1">
                {filteredTopics.map(topic => (
                  <Link 
                    key={topic.id} 
                    href={`/help`} 
                    onClick={() => setIsOpen(false)}
                    className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <topic.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{topic.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{topic.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 self-center" />
                  </Link>
                ))}
                {filteredTopics.length === 0 && (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    No results found for "{searchQuery}".
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-black/5 flex justify-between items-center">
              <Link href="/help" onClick={() => setIsOpen(false)} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5">
                Browse Full Help Center <ExternalLink className="w-4 h-4" />
              </Link>
              <button className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow">
                <MessageCircle className="w-4 h-4" /> Contact Support
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ChevronRight(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m9 18 6-6-6-6"/></svg>;
}
