'use client';

import React, { useState, useMemo } from 'react';
import {
  Users, Activity, TrendingUp, MapPin, PieChart, MessageSquare, 
  Plus, Search, Edit2, Trash2, Filter, Bell, UserCheck, Globe, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCampaignStore } from '@/lib/stores/campaign.store';
import type { Notification } from '@/lib/campaign-types';

const initialSegments = [
  { id: 1, name: 'Core Engagers', size: '12.4k', criteria: 'Interacted > 5 times in 30 days', growth: '+12%' },
  { id: 2, name: 'Dormant', size: '45.1k', criteria: 'No interaction in 90 days', growth: '-2%' },
  { id: 3, name: 'High Value', size: '3.2k', criteria: 'LTV > $500', growth: '+5%' },
];

const mockFeedback = [
  { id: 1, author: 'Sarah Jenkins', role: 'Stakeholder', text: 'The new campaign messaging really resonates with the Gen-Z segment.', date: '2 hours ago', sentiment: 'positive' },
  { id: 2, author: 'Mike Chen', role: 'Partner', text: 'We might need to adjust the frequency of emails to the dormant segment.', date: '5 hours ago', sentiment: 'neutral' },
  { id: 3, author: 'Alex Russo', role: 'Sponsor', text: 'Engagement rates are dropping in the EU region, let\'s investigate.', date: '1 day ago', sentiment: 'negative' },
];

export function AudienceHub({ window: osWindow }: { window?: any }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'segments' | 'feedback' | 'feed'>('overview');
  const [segments, setSegments] = useState(initialSegments);
  const [searchQuery, setSearchQuery] = useState('');
  
  const notifications = useCampaignStore(s => s.notifications);

  const feedItems = useMemo(() => 
    notifications.slice(0, 15).map(n => ({
      id: n.id,
      message: n.message,
      time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: n.type
    })), [notifications]
  );

  const handleAddSegment = () => {
    const name = prompt('Enter new segment name:');
    if (name) {
      setSegments([...segments, { id: Date.now(), name, size: '0', criteria: 'New Segment', growth: '0%' }]);
    }
  };

  const handleDeleteSegment = (id: number) => {
    if (confirm('Are you sure you want to delete this segment?')) {
      setSegments(segments.filter(s => s.id !== id));
    }
  };

  const stats = [
    { label: 'Total Reach', value: '2.4M', change: '+14%', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Engagement Rate', value: '4.8%', change: '+1.2%', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Audience Growth', value: '+12k', change: '+5%', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 bg-white border-b border-black/5 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Audience Hub
          </h1>
          <p className="text-sm text-slate-500">Manage campaign community, demographics, and segments.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-black/10 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm" onClick={handleAddSegment}>
            <Plus className="w-4 h-4" /> New Segment
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 bg-white border-b border-black/5 shrink-0">
        <div className="flex gap-6">
          {(['overview', 'segments', 'feedback', 'feed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "py-3 text-sm font-medium border-b-2 transition-colors capitalize",
                activeTab === tab ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'overview' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              {stats.map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-500 font-medium mb-1">{stat.label}</div>
                    <div className="text-3xl font-bold text-slate-800 flex items-end gap-2">
                      {stat.value}
                      <span className="text-sm font-medium text-emerald-500 mb-1">{stat.change}</span>
                    </div>
                  </div>
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", stat.bg)}>
                    <stat.icon className={cn("w-6 h-6", stat.color)} />
                  </div>
                </div>
              ))}
            </div>

            {/* Demographics */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-cyan-500" /> Top Locations</h3>
                <div className="space-y-4">
                  {[
                    { loc: 'New York, USA', val: '24%', bar: 'w-[24%]' },
                    { loc: 'London, UK', val: '18%', bar: 'w-[18%]' },
                    { loc: 'Toronto, CA', val: '12%', bar: 'w-[12%]' },
                    { loc: 'Sydney, AU', val: '8%', bar: 'w-[8%]' },
                  ].map((l, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">{l.loc}</span>
                        <span className="text-slate-500">{l.val}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn("h-full bg-cyan-500 rounded-full", l.bar)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><PieChart className="w-5 h-5 text-rose-500" /> Age & Gender</h3>
                <div className="flex gap-8 items-center h-full pb-4">
                  <div className="w-32 h-32 rounded-full border-[12px] border-rose-500 relative flex flex-col items-center justify-center">
                    <span className="text-xs text-slate-500 absolute top-0 -mt-2 bg-white px-1">Female 60%</span>
                    <span className="text-xs text-slate-500 absolute bottom-0 -mb-2 bg-white px-1">Male 40%</span>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between text-sm"><span className="text-slate-500">18-24</span><span className="font-medium">15%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">25-34</span><span className="font-medium">45%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">35-44</span><span className="font-medium">25%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">45+</span><span className="font-medium">15%</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'segments' && (
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-black/5 bg-slate-50/50 flex items-center">
                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search segments..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-black/10 rounded-lg outline-none focus:border-blue-500" />
                </div>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-black/5">
                    <th className="p-4 font-semibold">Segment Name</th>
                    <th className="p-4 font-semibold">Criteria</th>
                    <th className="p-4 font-semibold">Size</th>
                    <th className="p-4 font-semibold">Growth (30d)</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {segments.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(segment => (
                    <tr key={segment.id} className="border-b border-black/5 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-medium text-slate-800 flex items-center gap-2"><UserCheck className="w-4 h-4 text-blue-500" /> {segment.name}</td>
                      <td className="p-4 text-sm text-slate-600">{segment.criteria}</td>
                      <td className="p-4 text-sm font-medium">{segment.size}</td>
                      <td className="p-4 text-sm text-emerald-500">{segment.growth}</td>
                      <td className="p-4 text-right">
                        <button className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors mr-1"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteSegment(segment.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {segments.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">No segments found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="max-w-4xl mx-auto space-y-4">
            {mockFeedback.map(fb => (
              <div key={fb.id} className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-emerald-500 shrink-0 flex items-center justify-center text-white font-bold">
                  {fb.author.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="font-bold text-slate-800 mr-2">{fb.author}</span>
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{fb.role}</span>
                    </div>
                    <span className="text-xs text-slate-400">{fb.date}</span>
                  </div>
                  <p className="text-slate-600 text-sm mt-2">{fb.text}</p>
                </div>
                <div className="shrink-0 flex items-center">
                  {fb.sentiment === 'positive' && <Star className="w-5 h-5 text-amber-400 fill-amber-400" />}
                  {fb.sentiment === 'neutral' && <MessageSquare className="w-5 h-5 text-slate-400" />}
                  {fb.sentiment === 'negative' && <Activity className="w-5 h-5 text-rose-400" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'feed' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 relative">
              <div className="absolute left-[39px] top-6 bottom-6 w-px bg-slate-100 z-0" />
              <div className="space-y-6 relative z-10">
                {feedItems.map(item => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-50 border-4 border-white flex items-center justify-center shrink-0 shadow-sm">
                      <Bell className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <div className="flex-1 pt-1.5">
                      <p className="text-sm text-slate-700">{item.message}</p>
                      <span className="text-xs text-slate-400 mt-1 block">{item.time}</span>
                    </div>
                  </div>
                ))}
                {feedItems.length === 0 && (
                  <div className="text-center text-slate-500 py-8">No recent notifications in the feed.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AudienceHub;
