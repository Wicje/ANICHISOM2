import React, { useState } from 'react';
import { Block } from '../types';
import { Database, Columns, LayoutList, Clock, Calendar, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DatabaseView({ block }: { block: Block }) {
  const [view, setView] = useState<'table' | 'board' | 'list' | 'timeline' | 'calendar'>('table');
  const d = {
    columns: ['Name', 'Status', 'Date', 'Assignee'],
    rows: [
      { id: '1', Name: 'Draft Launch Email', Status: 'In Progress', Date: 'Oct 24', Assignee: '@Copywriter' },
      { id: '2', Name: 'Design Assets', Status: 'To Do', Date: 'Oct 26', Assignee: '@Designer' },
      { id: '3', Name: 'Approve Budget', Status: 'Done', Date: 'Oct 20', Assignee: '@Founder' }
    ]
  };

  const ViewIcon = {
    table: Database,
    board: Columns,
    list: LayoutList,
    timeline: Clock,
    calendar: Calendar
  }[view];

  return (
    <div className="border border-black/10 rounded-xl overflow-hidden my-4 text-sm font-sans bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative group/db">
      <div className="absolute top-2 right-2 opacity-0 group-hover/db:opacity-100 transition-opacity">
        <button className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1 shadow-sm">
          <Plus className="w-3 h-3" /> New
        </button>
      </div>
      
      <div className="flex items-center gap-1 p-2 border-b border-black/5 bg-slate-50">
        {[
          { id: 'table', label: 'Table', Icon: Database },
          { id: 'board', label: 'Board', Icon: Columns },
          { id: 'list', label: 'List', Icon: LayoutList },
          { id: 'timeline', label: 'Timeline', Icon: Clock },
          { id: 'calendar', label: 'Calendar', Icon: Calendar }
        ].map((v) => (
          <button 
            key={v.id} 
            onClick={() => setView(v.id as any)} 
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
              view === v.id ? 'bg-white shadow-sm border border-black/5 text-[#37352f]' : 'hover:bg-black/5 text-[#37352f]/60'
            )}
          >
            <v.Icon className="w-3.5 h-3.5" />
            {v.label}
          </button>
        ))}
      </div>

      <div className="p-1">
        {view === 'table' && (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  {d.columns.map(c => <th key={c} className="p-3 border-b border-black/5 font-medium text-black/50 whitespace-nowrap bg-slate-50/50 text-xs uppercase tracking-wider">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {d.rows.map(r => (
                  <tr key={r.id} className="border-b border-black/5 last:border-0 hover:bg-slate-50/50 transition-colors">
                    {d.columns.map(c => (
                      <td key={c} className="p-3 whitespace-nowrap">
                        {c === 'Status' ? (
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            r[c] === 'Done' ? "bg-emerald-100 text-emerald-700" : 
                            r[c] === 'In Progress' ? "bg-blue-100 text-blue-700" : 
                            "bg-slate-100 text-slate-700"
                          )}>{r[c]}</span>
                        ) : c === 'Assignee' ? (
                           <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-xs font-medium">{r[c]}</span>
                        ) : (
                          (r as any)[c]
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'board' && (
          <div className="p-4 flex gap-4 overflow-x-auto min-h-[300px] bg-[#f7f7f5] rounded-b-lg">
             {['To Do', 'In Progress', 'Done'].map(status => (
               <div key={status} className="flex-1 min-w-[240px] max-w-[280px]">
                  <div className="font-medium text-[#37352f]/70 mb-3 px-1 flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", status === 'Done' ? "bg-emerald-500" : status === 'In Progress' ? "bg-blue-500" : "bg-slate-400")} />
                    {status}
                    <span className="text-black/30 ml-auto bg-black/5 px-1.5 rounded">{d.rows.filter(r => r.Status === status).length}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {d.rows.filter(r => r.Status === status).map(r => (
                      <div key={r.id} className="bg-white p-3 border border-black/5 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-grab">
                        <div className="font-medium mb-2 text-[#37352f]">{r.Name}</div>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-black/5">
                          <div className="text-xs text-black/40 flex-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> {r.Date}</div>
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold" title={r.Assignee}>
                            {r.Assignee.replace('@', '').substring(0,2).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
             ))}
          </div>
        )}

        {view === 'list' && (
          <div className="flex flex-col p-2">
             {d.rows.map(r => (
               <div key={r.id} className="flex items-center justify-between p-3 border-b border-black/5 hover:bg-slate-50 transition-colors rounded-lg group">
                 <div className="flex items-center gap-3">
                   <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500" checked={r.Status === 'Done'} readOnly />
                   <span className={cn("font-medium", r.Status === 'Done' ? "line-through text-slate-400" : "text-[#37352f]")}>{r.Name}</span>
                 </div>
                 <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <span className="text-xs text-slate-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/> {r.Date}</span>
                   <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-medium">{r.Assignee}</span>
                 </div>
               </div>
             ))}
          </div>
        )}

        {view === 'calendar' && (
          <div className="p-4 bg-white border-t border-black/5 min-h-[400px]">
             <div className="grid grid-cols-7 gap-px bg-black/5 border border-black/5 rounded-lg overflow-hidden">
               {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                 <div key={day} className="bg-slate-50 p-2 text-center text-xs font-semibold text-black/50 uppercase tracking-wider">{day}</div>
               ))}
               {Array.from({length: 35}).map((_, i) => {
                 const dayNum = i - 2 > 0 && i - 2 <= 31 ? i - 2 : null;
                 const dayItems = d.rows.filter(r => r.Date.includes(dayNum?.toString() || 'xx'));
                 
                 return (
                   <div key={i} className="bg-white min-h-[100px] p-2 hover:bg-slate-50 transition-colors">
                     {dayNum && <div className="text-sm text-black/40 font-medium mb-1">{dayNum}</div>}
                     <div className="flex flex-col gap-1">
                       {dayItems.map(r => (
                         <div key={r.id} className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-1 rounded font-medium truncate cursor-pointer hover:bg-blue-200">
                           {r.Name}
                         </div>
                       ))}
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>
        )}

        {view === 'timeline' && (
          <div className="p-4 bg-white border-t border-black/5 overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Timeline Header */}
              <div className="flex border-b border-black/5 pb-2 mb-4">
                <div className="w-48 shrink-0 font-medium text-xs text-black/50 uppercase tracking-wider pl-2">Task</div>
                <div className="flex-1 flex justify-between text-xs text-black/40 font-medium px-4">
                  <span>Oct 15</span>
                  <span>Oct 20</span>
                  <span>Oct 25</span>
                  <span>Oct 30</span>
                </div>
              </div>
              
              {/* Timeline Rows */}
              <div className="flex flex-col gap-3">
                {d.rows.map((r, i) => {
                  const startPercent = 10 + (i * 20);
                  const widthPercent = 15 + (i * 10);
                  
                  return (
                    <div key={r.id} className="flex items-center group cursor-pointer">
                      <div className="w-48 shrink-0 text-sm font-medium text-[#37352f] truncate pr-4 pl-2 group-hover:text-blue-600 transition-colors">
                        {r.Name}
                      </div>
                      <div className="flex-1 relative h-8 bg-slate-50 rounded-lg overflow-hidden border border-black/5">
                        <div 
                          className={cn(
                            "absolute top-1 bottom-1 rounded-md flex items-center px-2 text-[10px] font-bold text-white shadow-sm transition-transform hover:scale-[1.02]",
                            r.Status === 'Done' ? "bg-emerald-500" : r.Status === 'In Progress' ? "bg-blue-500" : "bg-slate-400"
                          )}
                          style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
                        >
                          <span className="truncate">{r.Assignee}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
