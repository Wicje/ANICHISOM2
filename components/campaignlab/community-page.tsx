'use client';

import React, { useState, useMemo } from 'react';
import {
  Home, Wallet, Users, Tag, Settings, LogOut, Search, Globe,
  Calendar, DollarSign, MessageSquare, CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCampaignStore } from '@/lib/stores/campaign.store';
import type { Notification } from '@/lib/campaign-types';

const sidebarItems = [
  { icon: Home, label: 'Home', active: true },
  { icon: Wallet, label: 'Wallet' },
  { icon: Users, label: 'Communities' },
  { icon: Tag, label: 'Categories' },
  { icon: Settings, label: 'Settings' },
  { icon: LogOut, label: 'Logout' },
];

function relativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

const iconMap: Record<string, string> = {
  'mention': '🔔',
  'comment': '💬',
  'status-change': '🔄',
  'share': '🔗',
  'assignment': '📋',
};

export function CommunityPage() {
  const [activeTab, setActiveTab] = useState<'feed' | 'payments' | 'members'>('feed');
  const notifications = useCampaignStore(s => s.notifications);

  const feedItems = useMemo(() =>
    notifications.slice(0, 10).map((n: Notification) => ({
      icon: iconMap[n.type] || '🔔',
      text: n.message,
      time: relativeTime(n.createdAt),
    })),
    [notifications]
  );

  return (
    <div className="w-full h-full flex bg-[#0d1117] text-white font-sans overflow-hidden rounded-xl">
      {/* Sidebar */}
      <div className="w-48 flex flex-col shrink-0 border-r border-white/5 bg-[#0d1117]">
        {/* Logo */}
        <div className="px-4 py-4 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600" />
        </div>

        <nav className="flex flex-col gap-0.5 px-3 flex-1">
          {sidebarItems.map((item, i) => (
            <button
              key={i}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                item.active
                  ? "bg-white/10 text-white font-medium"
                  : "text-white/50 hover:bg-white/5 hover:text-white/70"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-blue-500" />
          <span className="text-xs text-white/60">James Gandolfini</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Breadcrumb + Search */}
        <div className="flex items-center justify-between px-6 py-3 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white/40">Communities</span>
            <span className="text-white/20">/</span>
            <span className="text-white font-medium">Name of Community</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="text"
              placeholder="Search"
              className="w-40 bg-white/5 border border-white/10 rounded-lg py-1.5 pl-9 pr-3 text-xs text-white outline-none focus:border-white/20"
            />
          </div>
        </div>

        {/* Banner */}
        <div className="mx-6 h-40 rounded-2xl overflow-hidden relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a3050] via-[#2a5040] to-[#1a4030]" />
          <div className="absolute inset-0 flex items-end p-6">
            <div className="flex items-end gap-6 w-full">
              {/* Tabs */}
              <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-xl p-1">
                {(['feed', 'payments', 'members'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize",
                      activeTab === tab
                        ? "bg-white text-gray-900"
                        : "text-white/70 hover:text-white"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Community info */}
              <div className="flex-1" />
              <div className="text-right">
                <h2 className="text-lg font-bold">Name of Community</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-white/60">
                    <Globe className="w-3 h-3" /> Public
                  </span>
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <Calendar className="w-3 h-3" /> Created Apr 2025
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex px-6 pb-6 gap-6 overflow-hidden">
          {/* Feed */}
          <div className="flex-1 space-y-3">
            {feedItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-white/5">
                <span className="text-lg">{item.icon}</span>
                <div className="flex-1">
                  <span className="text-sm text-white/80">{item.text}</span>
                </div>
                <span className="text-xs text-white/30">{item.time}</span>
              </div>
            ))}
          </div>

          {/* Sidebar info */}
          <div className="w-64 shrink-0 space-y-4">
            {/* Fund */}
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-xl font-bold text-white mb-1">$345.34</div>
              <div className="text-xs text-white/40">Funds</div>
              <div className="flex items-center gap-2 mt-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-purple-500" />
                <div>
                  <div className="text-xs text-white font-medium">Amanda smith</div>
                  <div className="text-[10px] text-white/40">Admin</div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              {[
                { icon: Users, label: 'Members', value: '34' },
                { icon: CreditCard, label: 'Payment Frequency', value: 'Weekly' },
                { icon: DollarSign, label: 'Amount', value: '$45.00' },
              ].map((stat, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <stat.icon className="w-3.5 h-3.5" />
                    {stat.label}
                  </div>
                  <span className="text-xs text-white font-medium">{stat.value}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button className="flex-1 py-2 bg-white/10 rounded-lg text-xs text-white font-medium hover:bg-white/15 transition-colors">
                Edit Members
              </button>
              <button className="flex-1 py-2 bg-white/10 rounded-lg text-xs text-white font-medium hover:bg-white/15 transition-colors">
                Unsubscribe
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommunityPage;
