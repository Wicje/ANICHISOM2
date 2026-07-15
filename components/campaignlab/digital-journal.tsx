'use client';

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCampaignStore } from '@/lib/stores/campaign.store';
import type { Page } from '@/lib/campaign-types';

export function DigitalJournal({ window: osWindow }: { window?: any }) {
  const pages = useCampaignStore((s) => s.pages);
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});

  const taskPages = pages.filter(
    (p: Page) => !p.trash && (p.level === 'task' || p.level === 'subtask')
  );

  const primaryTasks = taskPages
    .filter((p: Page) => p.status === 'in-progress' || p.status === 'review')
    .map((p: Page) => ({ text: p.title, id: p.id, checked: checkedState[p.id] ?? (p.status === 'done') }));

  const secondaryTasks = taskPages
    .filter(
      (p: Page) =>
        p.status === 'todo' || p.status === 'blocked' || p.status === undefined
    )
    .map((p: Page) => ({ text: p.title, id: p.id, checked: checkedState[p.id] ?? (p.status === 'done') }));

  const toggleCheck = (id: string) => {
    setCheckedState(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const weeksRemaining = (() => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const endOfQuarter = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
    const diff = endOfQuarter.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (7 * 86400000)));
  })();

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#c8d8c0] font-sans overflow-hidden p-8">
      <div className="w-full max-w-4xl bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden flex">
        {/* Left Page */}
        <div className="flex-1 p-8 border-r border-gray-100">
          {/* Date */}
          <div className="mb-6">
            <div className="text-[9px] font-bold tracking-[0.3em] text-gray-400 uppercase mb-1">Current Timeline</div>
            <h1 className="text-3xl font-serif text-gray-900 mb-1">{today}</h1>
            <p className="text-xs text-gray-400">Weeks remaining in quarter: {weeksRemaining}</p>
          </div>

          {/* Primary Focus */}
          <div className="mb-6">
            <h3 className="text-[9px] font-bold tracking-[0.3em] text-gray-400 uppercase mb-3">Primary Focus</h3>
            <div className="space-y-2">
              {primaryTasks.map((task, i) => (
                <label key={i} className="flex items-start gap-2.5 cursor-pointer group" onClick={() => toggleCheck(task.id)}>
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center mt-0.5 shrink-0 transition-colors",
                    task.checked ? "bg-gray-900 border-gray-900" : "border-gray-300 group-hover:border-gray-400"
                  )}>
                    {task.checked && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className={cn("text-xs leading-relaxed", task.checked ? "text-gray-400 line-through" : "text-gray-700")}>
                    {task.text}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Secondary Tasks */}
          <div>
            <h3 className="text-[9px] font-bold tracking-[0.3em] text-gray-400 uppercase mb-3">Secondary Tasks</h3>
            <div className="space-y-2">
              {secondaryTasks.map((task, i) => (
                <label key={i} className="flex items-start gap-2.5 cursor-pointer group" onClick={() => toggleCheck(task.id)}>
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center mt-0.5 shrink-0 transition-colors",
                    task.checked ? "bg-gray-900 border-gray-900" : "border-gray-300 group-hover:border-gray-400"
                  )}>
                    {task.checked && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className={cn("text-xs leading-relaxed", task.checked ? "text-gray-400 line-through" : "text-gray-700")}>
                    {task.text}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right Page */}
        <div className="flex-1 p-8">
          <div className="mb-6">
            <div className="text-[9px] font-bold tracking-[0.3em] text-gray-400 uppercase mb-1">Inspirations & Observations</div>
            <h2 className="text-2xl font-serif text-gray-900 mb-4">Atmospheric Texture</h2>

            {/* Quote */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-700 italic leading-relaxed">
                "The details are not the details. They make the design."
              </p>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={cn("w-1.5 h-1.5 rounded-full", i <= 3 ? "bg-gray-800" : "bg-gray-300")} />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-gray-600 leading-relaxed">
              The transition between physical and digital shouldn't be a jarring jump — it's a soft gradient. Building on that:
            </p>
            <ul className="space-y-2 text-xs text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">•</span>
                Light refraction on semi-opaque surfaces
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">•</span>
                The "breath" of high-gam cotton textures
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">•</span>
                Micro-interactions that reward stillness
              </li>
            </ul>
          </div>

          {/* Page number */}
          <div className="mt-8 text-right">
            <span className="text-[9px] text-gray-300">vol. 42 / no. 17</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DigitalJournal;
