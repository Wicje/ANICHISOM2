'use client';

import React, { useState } from 'react';
import {
  Home, LayoutDashboard, Folder, CheckSquare, BarChart3, Users,
  LifeBuoy, Settings, Search, ChevronDown, ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationCategory {
  name: string;
  description: string;
  channels: { push: boolean; email: boolean; sms: boolean };
}

const categories: NotificationCategory[] = [
  {
    name: 'Comments',
    description: 'These are notifications for comments on your posts and replies to your comments.',
    channels: { push: true, email: true, sms: false },
  },
  {
    name: 'Tags',
    description: 'These are notifications for when someone tags you in a comment, post or story.',
    channels: { push: true, email: false, sms: false },
  },
  {
    name: 'Reminders',
    description: 'These are notifications to remind you of updates you might have missed.',
    channels: { push: false, email: false, sms: false },
  },
  {
    name: 'More activity about you',
    description: 'These are notifications for posts on your profile, likes and other reactions to your...',
    channels: { push: false, email: false, sms: false },
  },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "w-9 h-5 rounded-full transition-colors relative",
        enabled ? "bg-blue-600" : "bg-gray-200"
      )}
    >
      <div className={cn(
        "w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform shadow-sm",
        enabled ? "translate-x-4" : "translate-x-0.5"
      )} />
    </button>
  );
}

export function NotificationSettings({ window: osWindow }: { window?: any }) {
  const [notifs, setNotifs] = useState(categories);

  const toggleChannel = (catIndex: number, channel: 'push' | 'email' | 'sms') => {
    setNotifs(prev => prev.map((cat, i) =>
      i === catIndex
        ? { ...cat, channels: { ...cat.channels, [channel]: !cat.channels[channel] } }
        : cat
    ));
  };

  const sidebarItems = [
    { icon: Home, label: 'Home' },
    { icon: LayoutDashboard, label: 'Dashboard' },
    { icon: Folder, label: 'Projects' },
    { icon: CheckSquare, label: 'Tasks' },
    { icon: BarChart3, label: 'Reporting' },
    { icon: Users, label: 'Users' },
  ];

  const tabs = ['My details', 'Profile', 'Password', 'Team', 'Plan', 'Billing', 'Email', 'Notifications', 'Integrations'];

  return (
    <div className="w-full h-full flex bg-white font-sans overflow-hidden rounded-xl">
      {/* Sidebar */}
      <div className="w-56 bg-[#f8f9fc] border-r border-gray-100 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-4 py-4 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">U</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">Untitled UI</span>
        </div>

        {/* Search */}
        <div className="px-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              className="w-full bg-white border border-gray-200 rounded-lg py-1.5 pl-9 pr-3 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-2 flex-1">
          {sidebarItems.map((item, i) => (
            <button
              key={i}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors",
                i === 2
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {i < 5 && <ChevronDown className="w-3 h-3 text-gray-400" />}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-gray-100 space-y-2">
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-gray-500 hover:bg-gray-100 w-full">
            <LifeBuoy className="w-4 h-4" />
            Support
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-gray-500 hover:bg-gray-100 w-full">
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>

        {/* Usage */}
        <div className="p-4 border-t border-gray-100">
          <div className="relative w-16 h-16 mx-auto mb-2">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <circle cx="18" cy="18" r="16" fill="none" stroke="#2563eb" strokeWidth="3" strokeDasharray="80 100" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900">80%</div>
          </div>
          <div className="text-[10px] text-gray-500 text-center">
            <span className="font-semibold text-gray-700">Used credits this month</span>
            <br />
            Your team has used 80% of your...
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 shrink-0">
          <button className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 mb-4">
            <ChevronLeft className="w-4 h-4" />
            Back to dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
            {tabs.map((tab, i) => (
              <button
                key={i}
                className={cn(
                  "px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors -mb-px",
                  i === 7
                    ? "border-blue-600 text-blue-600 font-medium"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Settings content */}
        <div className="px-8 pb-8">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Notification settings</h2>
            <p className="text-sm text-gray-500 mb-8">
              We may still send you important notifications about your account outside of your notification settings.
            </p>

            <div className="space-y-8">
              {notifs.map((cat, ci) => (
                <div key={ci} className="border-b border-gray-100 pb-8 last:border-0">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{cat.name}</h3>
                  <p className="text-xs text-gray-500 mb-4">{cat.description}</p>

                  <div className="space-y-3">
                    {(['push', 'email', 'sms'] as const).map(ch => (
                      <div key={ch} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 capitalize">{ch}</span>
                        <Toggle
                          enabled={cat.channels[ch]}
                          onChange={() => toggleChannel(ci, ch)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationSettings;
