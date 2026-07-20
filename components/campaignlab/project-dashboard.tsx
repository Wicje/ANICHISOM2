'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard, CheckSquare, Users, MessageSquare, Activity,
  Folder, Calendar, AlertCircle, Plus, ChevronRight, Bell, Target, TrendingUp, CheckCircle, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCampaignStore } from '@/lib/stores/campaign.store';
import { Page } from '@/lib/campaign-types';

export function CommandCenter({ window: osWindow }: { window?: any }) {
  const { pages, notifications, addPage, updatePage } = useCampaignStore();
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');

  const campaigns = pages.filter(p => !p.trash && p.level === 'campaign');
  const tasks = pages.filter(p => !p.trash && (p.level === 'task' || p.level === 'subtask'));
  const completedTasks = tasks.filter(t => t.status === 'done');
  
  const stats = [
    { label: 'Active Campaigns', value: campaigns.length, icon: Target, color: 'text-blue-500' },
    { label: 'Task Completion', value: tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) + '%' : '0%', icon: CheckCircle, color: 'text-emerald-500' },
    { label: 'Recent Activity', value: notifications.length, icon: Activity, color: 'text-purple-500' },
  ];

  const recentNotifications = notifications.slice(0, 8);

  const filteredCampaigns = campaigns.filter(c => {
    if (activeTab === 'active') return c.status !== 'done';
    if (activeTab === 'completed') return c.status === 'done';
    return true;
  });

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 bg-white border-b border-black/5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-indigo-500" />
            Command Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">Overview of all active campaigns and project metrics.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => addPage(null)} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500 font-medium mb-1">{stat.label}</div>
                  <div className="text-3xl font-bold text-slate-800">{stat.value}</div>
                </div>
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-slate-50")}>
                  <stat.icon className={cn("w-6 h-6", stat.color)} />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-8">
            {/* Left Col - Campaigns */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Campaigns</h2>
                <div className="flex bg-white rounded-lg border border-black/5 p-1 shadow-sm">
                  {(['all', 'active', 'completed'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-4 py-1.5 rounded-md text-xs font-medium transition-colors capitalize", activeTab === tab ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700")}>
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {filteredCampaigns.map(campaign => {
                  const campaignTasks = tasks.filter(t => t.campaignId === campaign.id);
                  const completed = campaignTasks.filter(t => t.status === 'done');
                  const progress = campaignTasks.length ? (completed.length / campaignTasks.length) * 100 : 0;
                  
                  return (
                    <div key={campaign.id} className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => useCampaignStore.getState().setActivePageId(campaign.id)}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{campaign.icon || '🎯'}</div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-base">{campaign.title || 'Untitled'}</h3>
                            <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Updated {new Date(campaign.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", campaign.status === 'done' ? 'bg-emerald-100 text-emerald-700' : campaign.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700')}>
                          {campaign.status || 'Active'}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium text-slate-600">
                          <span>Progress</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1"><CheckSquare className="w-4 h-4" /> {completed.length}/{campaignTasks.length}</span>
                          <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {campaign.share?.invitedUsers?.length || 0}</span>
                        </div>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500 font-medium flex items-center">Open <ChevronRight className="w-4 h-4" /></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Col - Activity Feed */}
            <div className="col-span-1 space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Activity Feed</h2>
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5 relative overflow-hidden">
                <div className="absolute left-9 top-8 bottom-8 w-px bg-slate-100 z-0" />
                <div className="space-y-6 relative z-10">
                  {recentNotifications.map(notification => (
                    <div key={notification.id} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 border-4 border-white flex items-center justify-center shrink-0 shadow-sm relative z-10">
                        <Bell className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <div className="flex-1 pt-1.5">
                        <p className="text-sm text-slate-700 leading-snug">{notification.message}</p>
                        <span className="text-xs text-slate-400 mt-1 block">{new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                  {recentNotifications.length === 0 && (
                     <div className="text-center text-slate-500 py-8">No recent activity.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommandCenter;
