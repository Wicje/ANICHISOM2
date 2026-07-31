'use client';

import React, { useState } from 'react';
import { Home, Bookmark, Settings, Zap, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FutureCardProps {
  text: string;
  variant?: 'default' | 'small';
}

function FutureCard({ text, variant = 'default' }: FutureCardProps) {
  return (
    <div className={cn(
      "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4",
      variant === 'small' ? "text-xs" : "text-sm"
    )}>
      <p className="text-white/80 leading-relaxed">{text}</p>
      <div className="mt-3 text-[10px] font-bold tracking-widest text-orange-500 uppercase">Future</div>
    </div>
  );
}

export function MindPalaceAI() {
  const [homeInput, setHomeInput] = useState('');
  const [rememberInput, setRememberInput] = useState('');
  const [futureInput, setFutureInput] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'remember' | 'settings'>('home');

  return (
    <div className="w-full h-full flex bg-[#1a1a1a] text-white font-sans overflow-hidden rounded-2xl">
      {/* Left Sidebar */}
      <div className="w-56 flex flex-col shrink-0 border-r border-white/10 bg-[#111]">
        <div className="p-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
          </div>
        </div>

        <div className="px-3 mb-4">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-sm font-medium w-full">
            <span className="text-orange-400">✦</span> NEW
            <Sparkles className="w-3 h-3 ml-auto text-orange-400" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 px-3">
          {[
            { id: 'home' as const, icon: Home, label: 'Home' },
            { id: 'remember' as const, icon: Bookmark, label: 'Remember' },
            { id: 'settings' as const, icon: Settings, label: 'Settings' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                activeTab === item.id
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-4 border-t border-white/10">
          <div className="text-[10px] font-bold tracking-widest text-orange-500 uppercase mb-1">Today</div>
          <p className="text-xs text-white/60 leading-relaxed">
            Which months had the highest ad revenue in 2024?
          </p>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex items-end p-8">
          <div className="w-full">
            <h1 className="text-4xl font-light text-white/90 mb-6">
              Ask your data anything<span className="text-orange-500">_</span>
            </h1>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={activeTab === 'home' ? homeInput : rememberInput}
                  onChange={e => activeTab === 'home' ? setHomeInput(e.target.value) : setRememberInput(e.target.value)}
                  placeholder={activeTab === 'home' ? "Ask your data anything..." : "Search saved memories & insights..."}
                  className="w-full bg-transparent border-b border-white/20 pb-3 text-white outline-none focus:border-orange-500 transition-colors text-lg"
                />
              </div>
              <button className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center hover:bg-orange-600 transition-colors shrink-0">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-4 mt-4 text-white/30">
              <button className="hover:text-white/60 transition-colors">⊞</button>
              <button className="hover:text-white/60 transition-colors">◎</button>
              <button className="hover:text-white/60 transition-colors">⚡</button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Future/Past */}
      <div className="w-72 flex flex-col shrink-0 border-l border-white/10 bg-[#111] p-4 gap-4 overflow-y-auto">
        <div className="flex items-center gap-2 text-xs text-white/40 mb-2">
          <span>← PAST</span>
          <span className="ml-auto px-3 py-1 rounded-full bg-white/10 text-white/80 font-medium">
            FUTURE ✦→
          </span>
        </div>

        <FutureCard text="Predict my busiest weeks based on my calendar trends." />
        <FutureCard text="Predict questions I might receive for my next presentation." variant="small" />
        <FutureCard text="What should I focus on improving based on my overdue tasks?" variant="small" />
      </div>
    </div>
  );
}

export default MindPalaceAI;
