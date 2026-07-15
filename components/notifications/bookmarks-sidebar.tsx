'use client';

import React, { useState } from 'react';
import {
  Compass, Bookmark, Calendar, FileText, Folder, Lightbulb, Puzzle,
  ChevronRight, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookmarkItem {
  name: string;
  handle: string;
  avatar: string;
  avatarColor: string;
  text: string;
  tags: { label: string; color: string }[];
  time: string;
}

const bookmarks: BookmarkItem[] = [
  {
    name: 'Ethan',
    handle: '@liamdesi',
    avatar: '🐱',
    avatarColor: 'bg-purple-200',
    text: 'Design Notes is a show that teaches us, hosted by...',
    tags: [
      { label: 'Motion', color: 'bg-blue-100 text-blue-700' },
      { label: 'iOS', color: 'bg-green-100 text-green-700' },
      { label: 'Apps', color: 'bg-gray-100 text-gray-600' },
    ],
    time: '8h',
  },
  {
    name: 'Sofia',
    handle: '@Sofia',
    avatar: '🐸',
    avatarColor: 'bg-green-200',
    text: 'How seven design problems — from inception to goi...',
    tags: [
      { label: 'Icons', color: 'bg-red-100 text-red-700' },
      { label: 'Web', color: 'bg-purple-100 text-purple-700' },
      { label: 'UI Desig...', color: 'bg-blue-100 text-blue-700' },
    ],
    time: '8h',
  },
  {
    name: 'Zara',
    handle: '@Zara',
    avatar: '🟢',
    avatarColor: 'bg-green-100',
    text: 'Just the usual, you know...',
    tags: [],
    time: '',
  },
];

const sidebarItems = [
  { id: 'ai', icon: Compass, label: 'Ask AI', rightIcon: Search },
  { id: 'bookmarks', icon: Bookmark, label: 'Bookmarks', rightIcon: ChevronRight, active: true },
  { id: 'schedules', icon: Calendar, label: 'Schedules' },
  { id: 'drafts', icon: FileText, label: 'Drafts' },
  { id: 'folders', icon: Folder, label: 'Folders', badge: true },
  { id: 'inspirations', icon: Lightbulb, label: 'Inspirations' },
  { id: 'extensions', icon: Puzzle, label: 'Extensions' },
];

export function BookmarksSidebar({ window: osWindow }: { window?: any }) {
  const [activeItem, setActiveItem] = useState('bookmarks');
  const [bookmarksList, setBookmarksList] = useState(bookmarks);
  const [searchQuery, setSearchQuery] = useState('');
  const [showChangeTimer, setShowChangeTimer] = useState(false);

  const filteredBookmarks = bookmarksList.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.tags.some(t => t.label.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const removeBookmark = (index: number) => {
    setBookmarksList(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full h-full flex bg-[#f5f5f5] font-sans overflow-hidden rounded-xl">
      {/* Left Sidebar */}
      <div className="w-56 bg-white/80 backdrop-blur-xl border-r border-gray-200/80 flex flex-col shrink-0">
        {/* Traffic lights */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>

        <div className="px-4 py-2">
          <div className="flex items-center gap-2 text-gray-400">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 px-3 py-2">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveItem(item.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors",
                activeItem === item.id
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="w-2 h-2 rounded-full bg-red-500" />
              )}
              {item.rightIcon && <item.rightIcon className="w-3.5 h-3.5 text-gray-400" />}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-white/50">
        {/* Breadcrumb */}
        <div className="px-8 py-4 flex items-center gap-2 text-sm shrink-0">
          <span className="text-gray-400">Home</span>
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <span className="font-semibold text-gray-900">Bookmarks</span>
        </div>

        {/* Bookmarks list */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Today, {new Date().toLocaleDateString()}</h2>

          <div className="mb-6">
            <input
              type="text"
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="space-y-6">
            {filteredBookmarks.map((item, i) => {
              const realIndex = bookmarksList.indexOf(item);
              return (
              <div key={i} className="flex gap-4 group">
                {/* Avatar */}
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0", item.avatarColor)}>
                  {item.avatar}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-gray-900">{item.name}</span>
                    <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="text-xs text-gray-400">{item.handle}</span>
                    {item.time && <span className="text-xs text-gray-400 ml-auto">{item.time}</span>}
                    <button
                      onClick={() => removeBookmark(realIndex)}
                      className="ml-1 w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.text}</p>
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map((tag, ti) => (
                        <span key={ti} className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-medium", tag.color)}>
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookmarksSidebar;
