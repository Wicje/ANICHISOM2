'use client';

import React, { useState } from 'react';
import {
  Download, FileText, Monitor, HardDrive, Cloud, WifiOff, Search,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface FileItem {
  name: string;
  items: number;
}

const todayFiles: FileItem[] = [
  { name: 'geist-font', items: 6 },
  { name: 'PulseBoard', items: 12 },
  { name: 'Atlas', items: 8 },
];

const yesterdayFiles: FileItem[] = [
  { name: 'AEUX_0.8.2', items: 4 },
  { name: 'Invoices', items: 48 },
  { name: 'Liquid', items: 2 },
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

export function FinderDark() {
  const [activeItem, setActiveItem] = useState('downloads');

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
                    onClick={() => setActiveItem(item.id)}
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
              <button className="p-1 rounded hover:bg-white/10 text-white/40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="p-1 rounded hover:bg-white/10 text-white/40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <h2 className="text-[15px] font-semibold text-white">Downloads</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="text"
              placeholder=""
              className="w-40 bg-white/5 border border-white/10 rounded-md py-1 pl-8 pr-3 text-xs text-white outline-none focus:border-white/20"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Today */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white/80 mb-3">Today</h3>
            <div className="grid grid-cols-3 gap-4">
              {todayFiles.map((file, i) => (
                <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                  <div className="w-16 h-14">
                    <FolderIconLarge />
                  </div>
                  <span className="text-[11px] text-white/80 text-center font-medium">{file.name}</span>
                  <span className="text-[9px] text-white/30">{file.items} items</span>
                </div>
              ))}
            </div>
          </div>

          {/* Yesterday */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white/80 mb-3">Yesterday</h3>
            <div className="grid grid-cols-3 gap-4">
              {yesterdayFiles.map((file, i) => (
                <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                  <div className="w-16 h-14">
                    <FolderIconLarge />
                  </div>
                  <span className="text-[11px] text-white/80 text-center font-medium">{file.name}</span>
                  <span className="text-[9px] text-white/30">{file.items} items</span>
                </div>
              ))}
            </div>
          </div>

          {/* Previous 7 Days */}
          <div>
            <h3 className="text-sm font-semibold text-white/80 mb-3">Previous 7 Days</h3>
            <div className="grid grid-cols-3 gap-4">
              {[{ name: 'Projects', items: 24 }, { name: 'Backups', items: 7 }].map((file, i) => (
                <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                  <div className="w-16 h-14">
                    <FolderIconLarge />
                  </div>
                  <span className="text-[11px] text-white/80 text-center font-medium">{file.name}</span>
                  <span className="text-[9px] text-white/30">{file.items} items</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinderDark;
