'use client';

import React, { useState } from 'react';
import { useCampaignStore } from '@/lib/stores/campaign.store';
import { Target, Search, Camera, CheckCircle2, ChevronRight, FileText, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileCompanion() {
  const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'capture'>('home');
  const store = useCampaignStore();
  const pages = store.pages || [];
  
  const recentPages = pages
    .filter(p => !p.trash)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5);

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#f7f7f5] text-[#37352f] overflow-hidden font-sans">
      {/* Header */}
      <header className="px-5 py-4 bg-white border-b border-black/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <div>
            <h1 className="font-semibold text-[15px] leading-tight">Companion</h1>
            <div className="text-[11px] text-black/40 font-medium tracking-wide uppercase">Continua OS</div>
          </div>
        </div>
        <button className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center">
          <Search className="w-4 h-4 text-black/60" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 px-5 pt-6 space-y-8">
        
        {/* Quick Actions */}
        <section>
          <h2 className="text-xs font-bold text-black/40 uppercase tracking-wider mb-3">Quick Capture</h2>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setActiveTab('capture')}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-2xl shadow-sm border border-black/5 active:scale-95 transition-transform"
            >
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold">New Note</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-2xl shadow-sm border border-black/5 active:scale-95 transition-transform">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold">Scan Asset</span>
            </button>
          </div>
        </section>

        {/* Recent Work */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-black/40 uppercase tracking-wider">Recent Work</h2>
            <button className="text-[11px] font-semibold text-emerald-600">See all</button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
            {recentPages.length === 0 ? (
              <div className="p-6 text-center text-sm text-black/40">No recent documents</div>
            ) : (
              <div className="flex flex-col divide-y divide-black/5">
                {recentPages.map(page => (
                  <button key={page.id} className="flex items-center gap-3 p-4 text-left active:bg-black/5 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-black/5 flex items-center justify-center shrink-0">
                      {page.level === 'campaign' ? <Target className="w-4 h-4 text-emerald-500" /> : <FileText className="w-4 h-4 text-black/40" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{page.title || 'Untitled'}</div>
                      <div className="text-[11px] text-black/40">{new Date(page.updatedAt).toLocaleDateString()}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-black/20" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Active Tasks Widget */}
        <section>
          <h2 className="text-xs font-bold text-black/40 uppercase tracking-wider mb-3">Today's Focus</h2>
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
              <span className="font-semibold text-sm">Action Items</span>
            </div>
            <div className="space-y-3 relative z-10">
              {/* Dummy tasks for prototype */}
              {[
                "Review Q3 Campaign Copy",
                "Approve Hero Images",
                "Sync with Design Team"
              ].map((task, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 flex items-center justify-center shrink-0 mt-0.5"></div>
                  <span className="text-sm text-white/90 leading-tight">{task}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/5 px-6 py-3 pb-safe-area flex items-center justify-between">
        <button onClick={() => setActiveTab('home')} className={cn("flex flex-col items-center gap-1", activeTab === 'home' ? 'text-emerald-600' : 'text-black/40')}>
          <Target className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Home</span>
        </button>
        <button onClick={() => setActiveTab('tasks')} className={cn("flex flex-col items-center gap-1", activeTab === 'tasks' ? 'text-emerald-600' : 'text-black/40')}>
          <CheckCircle2 className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Tasks</span>
        </button>
        <button onClick={() => setActiveTab('capture')} className={cn("flex flex-col items-center gap-1", activeTab === 'capture' ? 'text-emerald-600' : 'text-black/40')}>
          <div className="w-12 h-12 -mt-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Search className="w-5 h-5" />
          </div>
        </button>
        <button className="flex flex-col items-center gap-1 text-black/40">
          <FileText className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Docs</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-black/40">
          <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white overflow-hidden">
            {/* Avatar placeholder */}
            <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix" alt="User" className="w-full h-full object-cover" />
          </div>
          <span className="text-[10px] font-semibold">Profile</span>
        </button>
      </nav>
    </div>
  );
}
