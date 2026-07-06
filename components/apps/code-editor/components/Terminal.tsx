import React from 'react';

interface TerminalProps {
  terminalOpen: boolean;
  setTerminalOpen: (open: boolean) => void;
  projectId: string;
}

export function TerminalPanel({ terminalOpen, setTerminalOpen, projectId }: TerminalProps) {
  if (!terminalOpen) return null;

  return (
    <div className="h-[200px] bg-[#1e1e1e] border-t border-[#3c3c3c] flex flex-col font-mono text-[13px] shrink-0 z-20">
      <div className="flex items-center justify-between pl-4 pr-2 bg-[#1e1e1e] border-b border-[#3c3c3c] pt-2 pb-0 flex-none gap-4">
         <div className="flex gap-4">
            <span className="text-[11px] uppercase tracking-wider text-white border-b border-blue-500 pb-2 cursor-pointer">Terminal</span>
            <span className="text-[11px] uppercase tracking-wider text-white/50 hover:text-white cursor-pointer pb-2">Output</span>
            <span className="text-[11px] uppercase tracking-wider text-white/50 hover:text-white cursor-pointer pb-2">Debug Console</span>
            <span className="text-[11px] uppercase tracking-wider text-white/50 hover:text-white cursor-pointer pb-2">Ports</span>
         </div>
         <div className="flex gap-2 pb-2">
            <button onClick={() => setTerminalOpen(false)} className="text-white/50 hover:text-white">✖</button>
         </div>
      </div>
      <div className="p-3 flex-1 overflow-y-auto">
         <div className="text-white/40 italic mb-2">ANICHISOM WebContainer Node.js Engine (v18.17.0)</div>
         <div className="text-white/60 mb-2">Welcome to the integrated terminal.</div>
         <div className="flex items-center gap-2 mt-4">
           <span className="text-green-500 font-bold">zk3@workspace</span>
           <span className="text-blue-400 font-bold">~/projects/{projectId}</span>
           <span className="text-white">$</span>
           <input type="text" className="flex-1 bg-transparent border-none outline-none text-white focus:ring-0 p-0 m-0" placeholder="" autoFocus onKeyDown={(e) => {
              if (e.key === 'Enter') {
                 window.alert('Mock: Executing inline terminal command natively.');
                 e.currentTarget.value = '';
              }
           }} />
         </div>
      </div>
    </div>
  );
}
