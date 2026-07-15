'use client';

import React, { useState } from 'react';
import {
  Clock, Users, HardDrive, Download, Monitor, FileText, Cloud,
  ChevronLeft, ChevronRight, Home, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinderItem {
  name: string;
  type: 'folder' | 'file';
  icon?: string;
}

const sidebarSections = [
  {
    label: '',
    items: [
      { id: 'recents', icon: Clock, label: 'Recents' },
      { id: 'shared', icon: Users, label: 'Shared' },
    ],
  },
  {
    label: 'Favorites',
    items: [
      { id: 'applications', icon: HardDrive, label: 'Applications' },
      { id: 'downloads', icon: Download, label: 'Downloads' },
      { id: 'desktop', icon: Monitor, label: 'Desktop' },
      { id: 'documents', icon: FileText, label: 'Documents' },
    ],
  },
  {
    label: 'Locations',
    items: [
      { id: 'icloud', icon: Cloud, label: 'iCloud Drive' },
      { id: 'user', icon: Home, label: 'Sebastiano' },
    ],
  },
];

const folderItems: FinderItem[] = [
  { name: 'Applications', type: 'folder' },
  { name: 'BI_CBP_CONS...', type: 'file' },
  { name: 'Desktop', type: 'folder' },
  { name: 'Downloads', type: 'folder' },
  { name: 'Music', type: 'folder' },
  { name: 'QAV.pdf', type: 'file' },
];

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 70" fill="none">
      <path d="M5 15C5 10.5817 8.58172 7 13 7H31L37 15H67C71.4183 15 75 18.5817 75 23V57C75 61.4183 71.4183 65 67 65H13C8.58172 65 5 61.4183 5 57V15Z" fill="url(#folderGrad)" />
      <path d="M5 23C5 18.5817 8.58172 15 13 15H67C71.4183 15 75 18.5817 75 23V25H5V23Z" fill="url(#folderTop)" />
      <defs>
        <linearGradient id="folderGrad" x1="5" y1="7" x2="75" y2="65" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60B3F7" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="folderTop" x1="5" y1="15" x2="75" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#93C5FD" />
          <stop offset="1" stopColor="#60B3F7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 60" fill="none">
      <path d="M4 4C4 1.79086 5.79086 0 8 0H30L44 14V56C44 58.2091 42.2091 60 40 60H8C5.79086 60 4 58.2091 4 56V4Z" fill="#E5E7EB" />
      <path d="M30 0L44 14H34C31.7909 14 30 12.2091 30 10V0Z" fill="#D1D5DB" />
      <line x1="12" y1="28" x2="36" y2="28" stroke="#9CA3AF" strokeWidth="2" />
      <line x1="12" y1="36" x2="32" y2="36" stroke="#9CA3AF" strokeWidth="2" />
      <line x1="12" y1="44" x2="28" y2="44" stroke="#9CA3AF" strokeWidth="2" />
    </svg>
  );
}

export function FinderLight() {
  const [activeItem, setActiveItem] = useState('applications');

  return (
    <div className="w-full h-full flex bg-white rounded-xl overflow-hidden shadow-2xl border border-gray-200 font-sans">
      {/* Sidebar */}
      <div className="w-52 bg-[#f5f5f5]/80 backdrop-blur-xl border-r border-gray-200/80 flex flex-col shrink-0">
        {/* Traffic lights */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {sidebarSections.map((section, si) => (
            <div key={si} className="mb-4">
              {section.label && (
                <div className="px-4 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  {section.label}
                </div>
              )}
              <div className="flex flex-col px-2">
                {section.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveItem(item.id)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors",
                      activeItem === item.id
                        ? "bg-gray-200/80 text-gray-900 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <item.icon className="w-4 h-4 text-gray-500" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Toolbar */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <h2 className="text-[15px] font-semibold text-gray-900">Sebastiano</h2>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-8">
            {folderItems.map((item, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group"
              >
                <div className="w-20 h-20 flex items-center justify-center">
                  {item.type === 'folder' ? (
                    <FolderIcon className="w-full h-full drop-shadow-sm" />
                  ) : (
                    <FileIcon className="w-14 h-16 drop-shadow-sm" />
                  )}
                </div>
                <span className="text-[12px] text-gray-700 text-center font-medium leading-tight max-w-[100px] truncate">
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinderLight;
