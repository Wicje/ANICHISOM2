'use client';
import React, { useState } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { Code, TerminalSquare, GitPullRequest, Activity, Server } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DeveloperPack({ window: osWindow }: { window: OSWindow }) {
  const [activeTab, setActiveTab] = useState<'deployments' | 'reviews' | 'monitor' | 'ci'>('deployments');
  
  return (
    <div className="w-full h-full flex flex-col bg-[#0d1117] text-gray-300 font-mono">
      <div className="h-14 border-b border-gray-800 flex items-center px-4 shrink-0 bg-[#010409]">
        <Code className="w-5 h-5 text-blue-400 mr-3" />
        <h1 className="font-bold">DevOps Pack</h1>
        <div className="ml-8 flex gap-2">
          {(['deployments', 'reviews', 'monitor', 'ci'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-3 py-1 text-xs font-semibold rounded-md capitalize", activeTab === tab ? "bg-gray-800 text-white" : "hover:bg-gray-800/50")}>
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'deployments' && (
          <div className="flex flex-col gap-4">
             <div className="flex justify-between items-center bg-gray-900 p-4 rounded-lg border border-gray-800">
                <div>
                   <div className="text-blue-400 font-bold text-lg">Production</div>
                   <div className="text-xs text-gray-500 mt-1">Last deployed 2 hours ago</div>
                </div>
                <div className="flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-green-500"></span>
                   <span className="text-green-500 text-sm font-bold">Healthy</span>
                </div>
             </div>
          </div>
        )}
        {activeTab === 'reviews' && <div>Code Review Logs - Peer review tracking.</div>}
        {activeTab === 'monitor' && <div>API Monitor - Latency and uptime checks.</div>}
        {activeTab === 'ci' && <div>CI/CD Bridge - GitHub Actions integration.</div>}
      </div>
    </div>
  );
}
