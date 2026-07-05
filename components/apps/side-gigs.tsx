'use client';

import React, { useState, useEffect } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { Briefcase, Clock, Play, Square, DollarSign, FileText, Plus, ChevronRight, Download } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TimeEntry {
  id: string;
  projectId: string;
  description: string;
  duration: number; // in seconds
  date: Date;
}

export function SideGigsApp({ window: osWindow }: { window: OSWindow }) {
  const { emitEvent, currentUser } = useOS();
  const [activeTimer, setActiveTimer] = useState<number | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [entries, setEntries] = useState<TimeEntry[]>([
    { id: '1', projectId: 'Freelance UI/UX', description: 'Homepage redesign concepts', duration: 3600 * 2.5, date: new Date(Date.now() - 86400000) },
    { id: '2', projectId: 'Logo Design', description: 'Vector polishing', duration: 3600 * 1.25, date: new Date() }
  ]);
  const [currentProject, setCurrentProject] = useState('Freelance UI/UX');
  const [currentTask, setCurrentTask] = useState('');
  const [rate, setRate] = useState(85);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer]);

  const toggleTimer = () => {
    if (activeTimer) {
      // Stop
      const newEntry: TimeEntry = {
        id: Math.random().toString(36).substr(2, 9),
        projectId: currentProject,
        description: currentTask || 'Working session',
        duration: timerSeconds,
        date: new Date()
      };
      setEntries([newEntry, ...entries]);
      setActiveTimer(null);
      setTimerSeconds(0);
      setCurrentTask('');
      
      emitEvent({
        workspaceId: 'private-sidegig', // Isolation from team
        type: 'project_updated',
        entityId: 'time-entry',
        userId: currentUser?.id || 'anonymous',
        comment: `Logged ${formatTime(timerSeconds)} for ${currentProject}`
      });
    } else {
      // Start
      setActiveTimer(Date.now());
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const formatHours = (seconds: number) => (seconds / 3600).toFixed(2);
  
  const totalBillable = entries.reduce((acc, curr) => acc + curr.duration, 0);
  const totalAmount = (totalBillable / 3600) * rate;

  return (
    <div className="w-full h-full flex bg-[#111] text-white font-sans overflow-hidden">
      {/* Sidebar - Projects & Invoices */}
      <div className="w-64 border-r border-white/10 flex flex-col bg-[#0a0a0a]">
        <div className="p-4 border-b border-white/10 flex items-center gap-3 shrink-0">
          <Briefcase className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="text-sm font-medium">Side-Gigs</h2>
            <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Private Context
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-3">Active Projects</div>
          <div className="flex flex-col gap-1 mb-8">
            {['Freelance UI/UX', 'Logo Design', 'Consulting'].map(p => (
              <button 
                key={p}
                onClick={() => setCurrentProject(p)}
                className={cn(
                  "text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between items-center",
                  currentProject === p ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                {p}
                {currentProject === p && <ChevronRight className="w-3 h-3 text-white/40" />}
              </button>
            ))}
            <button className="text-left px-3 py-2 rounded-lg text-sm text-emerald-400/80 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors flex items-center gap-2 mt-2">
              <Plus className="w-3 h-3" /> New Client
            </button>
          </div>

          <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-3">Invoices</div>
          <div className="flex flex-col gap-1">
            <button className="text-left px-3 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5 hover:text-white flex items-center gap-2">
              <FileText className="w-4 h-4" /> Drafts (1)
            </button>
            <button className="text-left px-3 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5 hover:text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Paid ($4,250)
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-[#111]">
        {/* Top Timer Bar */}
        <div className="h-20 border-b border-white/10 px-6 flex items-center justify-between shrink-0 bg-white/[0.02]">
          <div className="flex-1 max-w-xl">
            <input 
              type="text"
              placeholder="What are you working on?"
              value={currentTask}
              onChange={(e) => setCurrentTask(e.target.value)}
              className="w-full bg-transparent border-none text-lg focus:outline-none placeholder:text-white/20"
            />
            <div className="text-xs text-emerald-400 mt-1 font-medium">{currentProject}</div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-2xl font-mono font-medium tracking-tight w-32 text-right">
              {formatTime(timerSeconds)}
            </div>
            <button 
              onClick={toggleTimer}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg",
                activeTimer 
                  ? "bg-rose-500 hover:bg-rose-600 shadow-[0_0_20px_rgba(244,63,94,0.4)]" 
                  : "bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              )}
            >
              {activeTimer ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
            </button>
          </div>
        </div>

        {/* Dashboard & Entries */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-3 gap-6 mb-10">
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="text-sm text-white/50 mb-2">Unbilled Time</div>
              <div className="text-3xl font-medium">{formatHours(totalBillable)}<span className="text-lg text-white/30 ml-1">hrs</span></div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="text-sm text-white/50 mb-2 flex justify-between">
                Unbilled Amount 
                <span className="text-white/30">@ ${rate}/hr</span>
              </div>
              <div className="text-3xl font-medium text-emerald-400">${totalAmount.toFixed(2)}</div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 flex flex-col justify-center items-center cursor-pointer hover:bg-emerald-500/20 transition-colors group">
              <FileText className="w-8 h-8 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-medium text-emerald-400">Generate Invoice</div>
            </div>
          </div>

          <h3 className="text-lg font-medium mb-4">Recent Entries</h3>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-white/40 uppercase bg-black/40 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Project</th>
                  <th className="px-6 py-4 font-medium">Description</th>
                  <th className="px-6 py-4 font-medium text-right">Duration</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-white/60">{format(entry.date, 'MMM d, yyyy')}</td>
                    <td className="px-6 py-4 font-medium">{entry.projectId}</td>
                    <td className="px-6 py-4 text-white/80">{entry.description}</td>
                    <td className="px-6 py-4 text-right font-mono text-white/90">{formatTime(entry.duration)}</td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-white/30 italic">No time logged yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
