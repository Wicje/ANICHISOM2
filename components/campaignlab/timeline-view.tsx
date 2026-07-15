'use client';

import React, { useState, useMemo } from 'react';
import {
  LayoutGrid, Plus, BarChart3, Folder, Tag, Zap, Settings,
  Clock, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCampaignStore } from '@/lib/stores/campaign.store';
import { Page } from '@/lib/campaign-types';

interface TimelineEntry {
  text: string;
  date?: string;
  highlight?: boolean;
}

function getDateLabel(ts: number): string {
  const now = new Date();
  const d = new Date(ts);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diff = today.getTime() - target.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const sidebarIcons = [LayoutGrid, Plus, BarChart3, Folder, Tag, Zap, Settings];

export function TimelineView({ window: osWindow }: { window?: any }) {
  const pages = useCampaignStore((s) => s.pages);
  const [activeTab, setActiveTab] = useState<'day' | 'week' | 'month'>('day');
  const [activeSidebar, setActiveSidebar] = useState(1);
  const [hoveredEntry, setHoveredEntry] = useState<number | null>(null);

  const entries = useMemo(() => {
    const now = Date.now();
    const dayMs = 86400000;
    const cutoff = activeTab === 'day' ? now - dayMs : activeTab === 'week' ? now - 7 * dayMs : now - 30 * dayMs;

    const relevant = pages.filter(
      (p) => !p.trash && (p.dueDate || p.updatedAt) && p.updatedAt >= cutoff
    );

    relevant.sort((a, b) => b.updatedAt - a.updatedAt);

    const mapped: TimelineEntry[] = relevant.map((page) => ({
      text: page.title || 'Untitled',
      date: undefined,
      highlight: page.status === 'in-progress',
    }));

    // Insert date headers when the label changes
    const result: TimelineEntry[] = [];
    let lastLabel = '';
    let idx = 0;

    for (const page of relevant) {
      const label = getDateLabel(page.updatedAt);
      if (label !== lastLabel) {
        result.push({
          text: page.title || 'Untitled',
          date: label,
          highlight: page.status === 'in-progress',
        });
        lastLabel = label;
      } else {
        const entry = mapped[idx];
        if (entry) result.push(entry);
      }
      idx++;
    }

    return result;
  }, [pages, activeTab]);

  return (
    <div className="w-full h-full flex bg-[#f5f3f0] font-sans overflow-hidden rounded-xl">
      {/* Left Sidebar */}
      <div className="w-14 flex flex-col items-center gap-3 py-4 shrink-0 border-r border-black/5 bg-[#ebe9e5]">
        {sidebarIcons.map((Icon, i) => (
          <button
            key={i}
            onClick={() => setActiveSidebar(i)}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
              activeSidebar === i ? "bg-gray-200 text-gray-800" : "text-gray-400 hover:bg-gray-200/50 hover:text-gray-600"
            )}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0">
          <h1 className="text-lg font-semibold text-gray-900">Timeline</h1>
          <div className="flex items-center bg-gray-200/60 rounded-lg p-0.5">
            {(['day', 'week', 'month'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize",
                  activeTab === tab
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-6 pb-8">
          <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-300" />

            {entries.map((entry, i) => (
              <div
                key={i}
                className="relative mb-6"
                onMouseEnter={() => setHoveredEntry(i)}
                onMouseLeave={() => setHoveredEntry(null)}
              >
                {/* Date header */}
                {entry.date && (
                  <div className="flex items-center gap-3 mb-3 -ml-6 pl-6">
                    <div className={cn(
                      "w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center z-10",
                      entry.highlight
                        ? "border-pink-400 bg-pink-400"
                        : "border-gray-300 bg-[#f5f3f0]"
                    )}>
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{entry.date}</span>
                  </div>
                )}

                {/* Entry */}
                {!entry.date && (
                  <div className={cn(
                    "flex items-center gap-3 py-1.5 px-3 -mx-3 rounded-lg transition-colors cursor-pointer",
                    hoveredEntry === i ? "bg-gray-200/60" : "",
                    entry.highlight && "bg-pink-50"
                  )}>
                    <div className={cn(
                      "w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center z-10 shrink-0",
                      entry.highlight
                        ? "border-pink-400 bg-pink-400"
                        : "border-gray-300 bg-[#f5f3f0]"
                    )}>
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <span className={cn(
                      "text-sm",
                      entry.highlight ? "text-gray-900 font-medium" : "text-gray-600"
                    )}>
                      {entry.text}
                    </span>
                    {hoveredEntry === i && (
                      <ChevronRight className="w-4 h-4 text-gray-400 ml-auto shrink-0" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TimelineView;
