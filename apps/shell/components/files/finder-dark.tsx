'use client';

import React, { useState, useEffect } from 'react';
import { FS, LocalFile } from '@/lib/fs';
import {
  Download, FileText, Monitor, HardDrive, Cloud, WifiOff, Search,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const sidebarSections = [
  {
    label: 'Favourites',
    items: [
      { id: 'downloads', icon: Download, label: 'Downloads' },
      { id: 'documents', icon: FileText, label: 'Documents' },
      { id: 'desktop', icon: Monitor, label: 'Desktop' },
      { id: 'applications', icon: HardDrive, label: 'Applications' },
    ],
  },
  {
    label: 'Locations',
    items: [
      { id: 'icloud', icon: Cloud, label: 'iCloud Drive' },
      { id: 'user', icon: HardDrive, label: 'byJWXN' },
      { id: 'airdrop', icon: WifiOff, label: 'AirDrop' },
      { id: 'network', icon: HardDrive, label: 'Network' },
    ],
  },
];

function FolderIconLarge() {
  return (
    <svg viewBox="0 0 80 65" fill="none" className="w-full h-full">
      <path d="M4 12C4 8.68629 6.68629 6 10 6H28L34 12H70C73.3137 12 76 14.6863 76 18V53C76 56.3137 73.3137 59 70 59H10C6.68629 59 4 56.3137 4 53V12Z" fill="url(#dg1)" />
      <path d="M4 18C4 14.6863 6.68629 12 10 12H70C73.3137 12 76 14.6863 76 18V20H4V18Z" fill="url(#dg2)" />
      <defs>
        <linearGradient id="dg1" x1="4" y1="6" x2="76" y2="59" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60B3F7" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="dg2" x1="4" y1="12" x2="76" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#93C5FD" />
          <stop offset="1" stopColor="#60B3F7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function FinderDark({ window: osWindow }: { window?: any }) {
  const [activeItem, setActiveItem] = useState('downloads');
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [navStack, setNavStack] = useState<string[]>(['']);
  const [navIndex, setNavIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadFiles = async () => {
      try {
        const pathMap: Record<string, string> = {
          downloads: 'Downloads',
          documents: 'Documents',
          desktop: 'Desktop',
          applications: '',
          icloud: '',
          user: '',
          airdrop: '',
          network: '',
        };
        const dir = pathMap[activeItem] ?? '';
        const items = await FS.readDir(dir);
        setFiles(items || []);
        setCurrentPath(dir);
      } catch {
        setFiles([]);
      }
    };
    loadFiles();
  }, [activeItem]);

  return (
    <div className="w-full h-full flex bg-[#1e1e1e]/95 backdrop-blur-2xl rounded-xl overflow-hidden shadow-2xl border border-white/10 font-sans">
      {/* Sidebar */}
      <div className="w-52 bg-[#2a2a2c]/80 backdrop-blur-xl border-r border-white/5 flex flex-col shrink-0">
        {/* Traffic lights */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {sidebarSections.map((section, si) => (
            <div key={si} className="mb-4">
              <div className="px-4 py-1 text-[11px] font-semibold text-white/30 uppercase tracking-wider">
                {section.label}
              </div>
              <div className="flex flex-col px-2">
                {section.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      const newStack = [...navStack.slice(0, navIndex + 1), item.id];
                      setNavStack(newStack);
                      setNavIndex(newStack.length - 1);
                      setActiveItem(item.id);
                      setSearchQuery('');
                    }}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors",
                      activeItem === item.id
                        ? "bg-white/10 text-white font-medium"
                        : "text-white/60 hover:bg-white/5 hover:text-white/80"
                    )}
                  >
                    <item.icon className="w-4 h-4 text-white/40" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#1a1a1c]">
        {/* Toolbar */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                className="p-1 rounded hover:bg-white/10 text-white/40 disabled:opacity-30"
                disabled={navIndex <= 0}
                onClick={() => {
                  if (navIndex > 0) {
                    const prev = navStack[navIndex - 1] ?? '';
                    setNavIndex(navIndex - 1);
                    setActiveItem(prev);
                  }
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                className="p-1 rounded hover:bg-white/10 text-white/40 disabled:opacity-30"
                disabled={navIndex >= navStack.length - 1}
                onClick={() => {
                  if (navIndex < navStack.length - 1) {
                    const next = navStack[navIndex + 1] ?? '';
                    setNavIndex(navIndex + 1);
                    setActiveItem(next);
                  }
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <h2 className="text-[15px] font-semibold text-white">{currentPath || 'Home'}</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="text"
              placeholder=""
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-40 bg-white/5 border border-white/10 rounded-md py-1 pl-8 pr-3 text-xs text-white outline-none focus:border-white/20"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {(() => {
            const filtered = files.filter((f) =>
              !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            if (filtered.length === 0) {
              return <p className="text-white/30 text-sm mt-8 text-center">No items</p>;
            }
            return (
              <div className="grid grid-cols-3 gap-4">
                {filtered.map((file) => {
                  const isFolder = !file.mimeType || file.mimeType.endsWith('/');
                  return (
                    <div
                      key={file.id}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => {
                        if (isFolder) {
                          const newStack = [...navStack.slice(0, navIndex + 1), activeItem];
                          setNavStack(newStack);
                          setNavIndex(newStack.length - 1);
                          setActiveItem(file.name);
                        }
                      }}
                    >
                      <div className="w-16 h-14">
                        <FolderIconLarge />
                      </div>
                      <span className="text-[11px] text-white/80 text-center font-medium">{file.name}</span>
                      <span className="text-[9px] text-white/30">
                        {isFolder ? (file.size ?? 0) + ' items' : formatSize(file.size)}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export default FinderDark;
