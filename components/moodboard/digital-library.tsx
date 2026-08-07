'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, FileText, LayoutGrid, Plus, Settings, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollaborativeDoc } from '@/lib/hooks/useCollaborativeDoc';
import type { BoardNode } from '@/components/apps/moodboard/types';

interface Category {
  name: string;
  count: number;
  color: string;
}

const categories: Category[] = [
  { name: 'Economics', count: 18, color: 'bg-yellow-400' },
  { name: 'Psychology', count: 22, color: 'bg-emerald-400' },
  { name: 'Computer Science', count: 58, color: 'bg-blue-500', },
  { name: 'AI', count: 26, color: 'bg-green-500' },
  { name: 'Bioinformatics', count: 8, color: 'bg-pink-400' },
  { name: 'Neuroscience', count: 3, color: 'bg-red-400' },
  { name: 'Webpages', count: 12, color: 'bg-orange-400' },
  { name: 'Biology', count: 15, color: 'bg-teal-400' },
  { name: 'Sort', count: 36, color: 'bg-gray-400' },
  { name: 'Creativity', count: 18, color: 'bg-amber-400' },
  { name: 'Physics', count: 4, color: 'bg-cyan-400' },
  { name: 'Hardware', count: 2, color: 'bg-cyan-400' },
  { name: 'Probability', count: 2, color: 'bg-rose-400' },
];

const subcategories = [
  { name: 'Knowledge graphs', count: 2, color: 'bg-blue-300' },
  { name: 'Machine learning', count: 39, color: 'bg-blue-400' },
  { name: 'Cyber security', count: 1, color: 'bg-blue-300' },
];

const aiSubs = [
  { name: 'Agents', count: 1, color: 'bg-green-300' },
  { name: 'Vision', count: 1, color: 'bg-green-300' },
  { name: 'LLMs', count: 27, color: 'bg-green-400' },
  { name: 'Transformers', count: 1, color: 'bg-green-300' },
];

const authors = [
  'Frank Arute', 'Kunal Arya', 'Shekoofeh Azizi', 'Ryan Babbush',
  'Dave Bacon', 'Joseph C. Bardi', 'Joelle Baral', 'Rupak Biswas',
  'Sergio Boixo',
];

export function DigitalLibrary({ window: osWindow }: { window: any }) {
  const projectId = osWindow?.data?.projectId || osWindow?.id || 'default';

  const collab = useCollaborativeDoc({
    appPrefix: 'moodboard',
    docId: projectId,
    sharedTypes: [{ name: 'nodes', kind: 'Map' }],
    undoTrackingTypes: ['nodes'],
  });

  const [nodes, setNodes] = useState<BoardNode[]>([]);
  useEffect(() => {
    if (!collab.synced) return;
    const nodesMap = collab.sharedTypesRef.current.nodes;
    if (!nodesMap) return;
    const load = () => {
      const arr: BoardNode[] = [];
      nodesMap.forEach((v: any) => arr.push(v));
      setNodes(arr);
    };
    load();
    nodesMap.observe(load);
    return () => nodesMap.unobserve(load);
  }, [collab.synced]);

  const [activeCategory, setActiveCategory] = useState('Computer Science');
  const [activeTab, setActiveTab] = useState<'items' | 'notebooks' | 'canvases'>('items');

  const libraryItems = nodes.map((node) => ({
    title: node.content?.substring(0, 40) || 'Untitled',
    type: node.type,
    color: node.backgroundColor || '#f0f0f0',
    tags: node.tags,
    comments: node.comments?.length || 0,
  }));

  return (
    <div className="w-full h-full flex bg-white font-sans overflow-hidden rounded-xl">
      {/* Sidebar */}
      <div className="w-52 flex flex-col shrink-0 border-r border-gray-100 bg-white/80 backdrop-blur-xl">
        {/* Logo */}
        <div className="px-4 py-4 flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gray-900 flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-gray-900">My Library</span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {/* Recent */}
          <div className="mb-4">
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Recent</div>
            <button className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
              Reading list
              <span className="text-[10px] text-gray-400">24</span>
            </button>
            <button className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
              Discover
            </button>
          </div>

          {/* My library */}
          <div className="mb-4">
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">My library</div>
            <div className="flex flex-col gap-0.5">
              {categories.map((cat, i) => (
                <React.Fragment key={i}>
                  <button
                    onClick={() => setActiveCategory(cat.name)}
                    className={cn(
                      "flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors",
                      activeCategory === cat.name
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", cat.color)} />
                      {cat.name}
                    </div>
                    <span className="text-[10px] text-gray-400">{cat.count}</span>
                  </button>
                  {/* Subcategories */}
                  {cat.name === 'Computer Science' && activeCategory === 'Computer Science' && subcategories.map((sub, si) => (
                    <button key={si} className="flex items-center justify-between pl-8 pr-3 py-1 rounded-lg text-[11px] text-gray-500 hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-1.5 h-1.5 rounded-full", sub.color)} />
                        {sub.name}
                      </div>
                      <span className="text-[10px] text-gray-400">{sub.count}</span>
                    </button>
                  ))}
                  {cat.name === 'AI' && activeCategory === 'AI' && aiSubs.map((sub, si) => (
                    <button key={si} className="flex items-center justify-between pl-8 pr-3 py-1 rounded-lg text-[11px] text-gray-500 hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-1.5 h-1.5 rounded-full", sub.color)} />
                        {sub.name}
                      </div>
                      <span className="text-[10px] text-gray-400">{sub.count}</span>
                    </button>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>

          <button className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-50">
            <Plus className="w-3 h-3" /> New category +
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-50 mt-1">
            <Settings className="w-3 h-3" /> Settings
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Breadcrumb */}
        <div className="px-6 py-3 flex items-center gap-2 text-xs text-gray-400 border-b border-gray-100 shrink-0">
          <span>My Library</span>
          <ChevronRight className="w-3 h-3" />
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-gray-700 font-medium">{activeCategory}</span>
          </span>
        </div>

        <div className="px-6 py-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              {activeCategory}
              <button className="text-gray-300 hover:text-gray-500">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">
              Collection of papers and articles spanning various subfields of computer science.
              This library covers topics from foundational concepts to cutting-edge developments,
              with a particular emphasis on machine learning, artificial intelligence, data analysis, and algorithms.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
            {([
              { id: 'items' as const, icon: FileText, label: 'Items' },
              { id: 'notebooks' as const, icon: BookOpen, label: 'Notebooks' },
              { id: 'canvases' as const, icon: LayoutGrid, label: 'Canvases' },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px",
                  activeTab === tab.id
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Authors */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-700 mb-2">Authors</h3>
            <div className="flex flex-wrap gap-1.5">
              {authors.map((author, i) => (
                <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-[11px] text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors">
                  {author} <span className="text-gray-400 ml-1">2</span>
                </span>
              ))}
            </div>
          </div>

          {/* Items header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">Items ({libraryItems.length})</span>
              <button className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-[10px] text-gray-600 hover:bg-gray-200">
                <Plus className="w-3 h-3" /> Add
              </button>
              <button className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-[10px] text-gray-600 hover:bg-gray-200">
                ↕ Recently accessed
              </button>
            </div>
          </div>

          {/* Paper cards grid */}
          <div className="grid grid-cols-3 gap-4">
            {libraryItems.map((item, i) => (
              <div key={i} className={cn("rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer")} style={{ backgroundColor: item.color }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-gray-500">{item.type}</span>
                  {item.tags && item.tags.length > 0 && (
                    <span className="text-[10px] text-gray-400">{item.tags[0]}</span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-gray-900 mb-2 leading-snug">{item.title}</h4>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100/50">
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> {item.comments}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DigitalLibrary;
