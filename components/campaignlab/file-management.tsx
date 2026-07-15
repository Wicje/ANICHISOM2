'use client';

import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard, Calendar, Inbox, CheckSquare, Users, Folder,
  ChevronDown, ChevronRight, Plus, Search, List, Grid3x3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCampaignStore } from '@/lib/stores/campaign.store';
import type { Page, Block } from '@/lib/campaign-types';

const AVATAR_COLORS = ['bg-pink-400', 'bg-blue-400', 'bg-purple-400', 'bg-green-400', 'bg-amber-400'];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

interface FolderItem {
  name: string;
  files: number;
  size: string;
}

interface FileRow {
  name: string;
  date: string;
  addedBy: string;
  avatarColor: string;
}

const sidebarTree = [
  { label: 'Dashboard', count: 48 },
  { label: 'Calendar', count: 12 },
  { label: 'Inbox', count: 127 },
  { label: 'My Tasks', count: 21 },
];

const neuralinkTree: Array<{ label: string; count?: number; indent?: boolean; expanded?: boolean; active?: boolean; children?: Array<{ label: string; count?: number; indent?: boolean; active?: boolean }> }> = [
  { label: 'Operations', count: 48, indent: true },
  { label: 'Folders', count: 12, indent: true, expanded: true, children: [
    { label: 'Documents', indent: true, active: true },
    { label: 'Sprint 28 - Product Spec', indent: true },
    { label: 'Design System Update', indent: true },
  ]},
  { label: 'Tasks', count: 127, indent: true },
  { label: 'Activity', count: 54, indent: true },
  { label: 'Channels', count: 12, indent: true },
];

export function FileManagement() {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const pages = useCampaignStore((s) => s.pages);

  const folders: FolderItem[] = useMemo(() => {
    return pages
      .filter((p) => p.level === 'campaign' && !p.trash)
      .map((p) => ({
        name: p.title,
        files: p.blocks?.length || 0,
        size: `${p.blocks?.length || 0} blocks`,
      }));
  }, [pages]);

  const files: FileRow[] = useMemo(() => {
    return pages
      .filter((p) => p.level !== 'campaign' && !p.trash)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((p) => ({
        name: p.title,
        date: formatDate(p.updatedAt),
        addedBy: p.assignee || 'Unknown',
        avatarColor: getAvatarColor(p.assignee || 'Unknown'),
      }));
  }, [pages]);

  return (
    <div className="w-full h-full flex bg-[#f8f7f4] font-sans overflow-hidden rounded-xl">
      {/* Sidebar */}
      <div className="w-56 flex flex-col shrink-0 border-r border-gray-200/80 bg-white/80 backdrop-blur-xl">
        {/* Logo */}
        <div className="px-4 py-4 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <span className="text-sm font-bold text-gray-900">Synapse</span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {/* Folders */}
          <div className="mb-4">
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Folders</div>
            <div className="flex flex-col gap-0.5">
              {sidebarTree.map((item, i) => (
                <button key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    {item.label === 'Dashboard' && <LayoutDashboard className="w-3.5 h-3.5 text-gray-400" />}
                    {item.label === 'Calendar' && <Calendar className="w-3.5 h-3.5 text-gray-400" />}
                    {item.label === 'Inbox' && <Inbox className="w-3.5 h-3.5 text-gray-400" />}
                    {item.label === 'My Tasks' && <CheckSquare className="w-3.5 h-3.5 text-gray-400" />}
                    {item.label}
                  </div>
                  <span className="text-[10px] text-gray-400">{item.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Neuralink Space */}
          <div className="mb-4">
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Neuralink Space</div>
            <div className="flex flex-col gap-0.5">
              {neuralinkTree.map((item, i) => (
                <React.Fragment key={i}>
                  <button className={cn(
                    "flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors",
                    'active' in item && item.active ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-50"
                  )}>
                    <div className="flex items-center gap-2">
                      {item.expanded ? <ChevronDown className="w-3 h-3 text-gray-400" /> : item.children ? <ChevronRight className="w-3 h-3 text-gray-400" /> : <div className="w-3" />}
                      {item.label === 'Operations' && <Users className="w-3.5 h-3.5 text-gray-400" />}
                      {item.label === 'Folders' && <Folder className="w-3.5 h-3.5 text-gray-400" />}
                      {item.label === 'Tasks' && <CheckSquare className="w-3.5 h-3.5 text-gray-400" />}
                      {item.label === 'Activity' && <Calendar className="w-3.5 h-3.5 text-gray-400" />}
                      {item.label === 'Channels' && <Inbox className="w-3.5 h-3.5 text-gray-400" />}
                      {item.label}
                    </div>
                    {item.count !== undefined && <span className="text-[10px] text-gray-400">{item.count}</span>}
                  </button>
                  {item.children?.map((child, ci) => (
                    <button key={ci} className={cn(
                      "flex items-center gap-2 pl-8 pr-3 py-1.5 rounded-lg text-xs transition-colors",
                      child.active ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-500 hover:bg-gray-50"
                    )}>
                      <Folder className="w-3.5 h-3.5 text-gray-400" />
                      {child.label}
                    </button>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Tags</div>
            <div className="flex flex-col gap-0.5 px-3">
              {[
                { color: 'bg-red-500', label: 'Important', count: 12 },
                { color: 'bg-yellow-500', label: 'Normal', count: 47 },
              ].map((tag, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", tag.color)} />
                    {tag.label}
                  </div>
                  <span className="text-[10px] text-gray-400">{tag.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <span>📁 Docs</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-700 font-medium">Meeting Notes</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-bold text-gray-900">Documents</h1>
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                <button className="px-3 py-1 rounded-md text-xs font-medium text-gray-700 bg-white shadow-sm">List View</button>
                <button className="px-3 py-1 rounded-md text-xs font-medium text-gray-500 hover:text-gray-700">
                  <Grid3x3 className="w-3.5 h-3.5 inline mr-1" />
                  Grid
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500">Recent {files.length}</div>
        </div>

        {/* Folder cards */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex gap-4">
            {folders.map((folder, i) => (
              <div key={i} className="flex-1 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="w-14 h-12 mb-3">
                  <svg viewBox="0 0 60 50" fill="none" className="w-full h-full">
                    <path d="M3 10C3 7.23858 5.23858 5 8 5H22L27 10H52C54.7614 10 57 12.2386 57 15V40C57 42.7614 54.7614 45 52 45H8C5.23858 45 3 42.7614 3 40V10Z" fill="url(#fmFolderGrad)" />
                    <path d="M3 15C3 12.2386 5.23858 10 8 10H52C54.7614 10 57 12.2386 57 15V17H3V15Z" fill="url(#fmFolderTop)" />
                    <defs>
                      <linearGradient id="fmFolderGrad" x1="3" y1="5" x2="57" y2="45" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#60B3F7" /><stop offset="1" stopColor="#3B82F6" />
                      </linearGradient>
                      <linearGradient id="fmFolderTop" x1="3" y1="10" x2="57" y2="17" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#93C5FD" /><stop offset="1" stopColor="#60B3F7" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="text-xs font-semibold text-gray-900 mb-0.5">{folder.name}</div>
                <div className="text-[10px] text-gray-400">{folder.files} Files · {folder.size}</div>
              </div>
            ))}
          </div>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">File name</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Date added</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Added by</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <span className="text-blue-500 text-xs">📄</span>
                      </div>
                      <span className="text-xs font-medium text-gray-700">{file.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{file.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-5 h-5 rounded-full", file.avatarColor)} />
                      <span className="text-xs text-gray-500">{file.addedBy}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default FileManagement;
