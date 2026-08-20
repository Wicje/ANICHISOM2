import React, { useState } from 'react';
import { AgentMessage } from '../types';
import { cn } from '@/lib/utils';

interface CopilotProps {
  agentOpen: boolean;
  setAgentOpen: (open: boolean) => void;
}

export function CopilotPanel({ agentOpen, setAgentOpen }: CopilotProps) {
  const [agentInput, setAgentInput] = useState('');
  const [agentHistory, setAgentHistory] = useState<AgentMessage[]>([
    { role: 'agent', content: 'I am your Agentic Copilot. I can generate code, debug, or refactor entire modules natively.' }
  ]);

  if (!agentOpen) return null;

  return (
    <div className="w-80 shrink-0 bg-[#252526] border-l border-[#3c3c3c] flex flex-col z-20 shadow-[-10px_0_20px_rgba(0,0,0,0.2)]">
      <div className="p-3 border-b border-[#3c3c3c] flex items-center justify-between text-white/80 font-sans">
         <div className="flex items-center gap-2 font-semibold">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Agentic Copilot
         </div>
         <button onClick={() => setAgentOpen(false)} className="text-white/50 hover:text-white">X</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
         {agentHistory.map((msg, i) => (
           <div key={i} className={cn("text-[13px] leading-relaxed p-3 rounded-lg font-sans", msg.role === 'agent' ? "bg-[#37373d] text-white/90" : "bg-blue-600 text-white self-end max-w-[85%]")}>
              {msg.content}
           </div>
         ))}
      </div>
      <div className="p-3 border-t border-[#3c3c3c]">
         <input 
           type="text" 
           value={agentInput}
           onChange={e => setAgentInput(e.target.value)}
           onKeyDown={e => {
             if (e.key === 'Enter' && agentInput.trim()) {
               setAgentHistory(prev => [...prev, { role: 'user', content: agentInput }]);
               setAgentInput('');
               setTimeout(() => {
                 setAgentHistory(prev => [...prev, { role: 'agent', content: 'Analyzing your codebase... generating diff implementation for that request.' }]);
               }, 500);
             }
           }}
           placeholder="Ask copilot to edit..." 
           className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 transition-colors"
         />
      </div>
    </div>
  );
}
