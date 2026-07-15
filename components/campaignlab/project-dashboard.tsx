'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard, Folder, CheckSquare, Users, MessageSquare,
  Megaphone, Mail, Briefcase, DollarSign, FileText, CreditCard,
  TrendingUp, Settings, ChevronDown, MoreHorizontal, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCampaignStore } from '@/lib/stores/campaign.store';
import { Page } from '@/lib/campaign-types';

const sidebarSections = [
  {
    label: 'Workspace',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard' },
      { icon: Folder, label: 'Projects', active: true },
      { icon: CheckSquare, label: 'Tasks' },
      { icon: Users, label: 'Clients' },
      { icon: MessageSquare, label: 'Messages' },
    ],
  },
  {
    label: 'Leads',
    items: [
      { icon: Megaphone, label: 'Social Medias' },
      { icon: Mail, label: 'Email' },
      { icon: Briefcase, label: 'Affiliates' },
      { icon: Folder, label: 'Job Board' },
    ],
  },
  {
    label: 'Payments',
    items: [
      { icon: FileText, label: 'Invoices' },
      { icon: CreditCard, label: 'Expenses' },
      { icon: DollarSign, label: 'Income' },
      { icon: TrendingUp, label: 'Services' },
    ],
  },
];

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]}, ${d.getFullYear()}`;
}

function formatStatus(status?: string): string {
  if (!status) return 'Active';
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, ' ');
}

export function ProjectDashboard({ window: osWindow }: { window?: any }) {
  const [activeTab, setActiveTab] = useState<'active' | 'negotiating' | 'archived'>('active');
  const [activeSidebar, setActiveSidebar] = useState('Projects');
  const pages = useCampaignStore(s => s.pages);

  const allProjects = pages.filter(
    p => !p.trash && (
      p.level === 'campaign' ||
      (!p.parentId && p.level !== 'subtask' && p.level !== 'task' && p.level !== 'phase')
    )
  );

  const filteredProjects = allProjects.filter((page: Page) => {
    if (activeTab === 'active') return page.status !== 'done';
    if (activeTab === 'negotiating') return page.status === 'review' || page.status === 'blocked';
    if (activeTab === 'archived') return page.status === 'done';
    return true;
  });

  const projects = filteredProjects.map((page: Page) => ({
    name: page.title,
    date: formatTimestamp(page.updatedAt),
    status: formatStatus(page.status),
    title: page.description || page.title,
    tags: page.blocks?.length ? [`${page.blocks.length} block${page.blocks.length > 1 ? 's' : ''}`] : [],
    platform: 'OS',
    budget: `${page.blocks?.length || 0} blocks`,
    due: page.dueDate ? `Due ${page.dueDate}` : 'No due date',
    messages: page.blocks?.length || 0,
    id: page.id,
  }));

  return (
    <div className="w-full h-full flex bg-[#f8f7f4] font-sans overflow-hidden rounded-xl">
      {/* Sidebar */}
      <div className="w-56 flex flex-col shrink-0 border-r border-gray-200/80 bg-white/80 backdrop-blur-xl">
        {/* Logo */}
        <div className="px-4 py-4 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <span className="text-sm font-bold text-gray-900">Mantra</span>
        </div>

        {/* User */}
        <div className="px-3 mb-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100/80">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-200 to-amber-400" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-900">Amanda Smith</div>
              <div className="text-[10px] text-gray-500">Professional Account</div>
            </div>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-3">
          {sidebarSections.map((section, si) => (
            <div key={si} className="mb-4">
              <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {section.label}
              </div>
              <div className="flex flex-col gap-0.5">
                {section.items.map((item, ii) => (
                  <button
                    key={ii}
                    onClick={() => setActiveSidebar(item.label)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors",
                      activeSidebar === item.label
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Upgrade */}
        <div className="p-3 m-3 mb-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-gray-900">Upgrade Account</span>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Gain access to all our high powered features and unlimited storage with another level
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <div className="flex items-center bg-gray-100 rounded-xl p-1">
              {(['active', 'negotiating', 'archived'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-medium transition-colors capitalize flex items-center gap-1.5",
                    activeTab === tab
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {tab === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                  {tab === 'negotiating' && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />}
                  {tab === 'archived' && <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Project cards */}
          <div className="flex gap-6 overflow-x-auto pb-4">
            {projects.map((project, i) => (
              <div key={i} className="w-80 shrink-0 bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => console.log('Project clicked:', project)}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-xs font-bold text-gray-600">
                      {project.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-900">{project.name}</div>
                      <div className="text-[10px] text-gray-400">{project.date}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[10px] font-medium">
                      {project.status}
                    </span>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Image */}
                <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-gray-300 text-2xl">📊</div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">{project.title}</h3>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {project.tags.map((tag, ti) => (
                      <span key={ti} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="text-red-400">●</span> {project.platform}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <DollarSign className="w-3 h-3" /> {project.budget}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>📅</span> {project.due}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <MessageSquare className="w-3 h-3" /> {project.messages} New Messages
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectDashboard;
