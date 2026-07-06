import React from 'react';
import { GitBranch, RefreshCcw, Check } from 'lucide-react';

interface StatusBarProps {
  code: string;
  fileName: string;
}

export function StatusBar({ code, fileName }: StatusBarProps) {
  return (
    <div className="h-6 shrink-0 bg-[#007acc] text-white flex items-center px-3 text-xs justify-between font-sans">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1 cursor-pointer hover:bg-white/10 px-1 rounded"><GitBranch className="w-3 h-3" /> main*</span>
        <span className="flex items-center gap-1 cursor-pointer hover:bg-white/10 px-1 rounded"><RefreshCcw className="w-3 h-3" /> 0 ↓ 2 ↑</span>
        <span className="cursor-pointer hover:bg-white/10 px-1 rounded">✖ 0  ⚠ 0</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="cursor-pointer hover:bg-white/10 px-1 rounded">Ln {code.split('\n').length}, Col {code.length > 0 ? code.split('\n')[code.split('\n').length - 1].length : 0}</span>
        <span className="cursor-pointer hover:bg-white/10 px-1 rounded">Spaces: 2</span>
        <span className="cursor-pointer hover:bg-white/10 px-1 rounded">UTF-8</span>
        <span className="cursor-pointer hover:bg-white/10 px-1 rounded">{fileName.endsWith('.tsx') ? 'TypeScript React' : 'TypeScript'}</span>
        <span className="cursor-pointer hover:bg-white/10 px-1 rounded flex items-center gap-1"><Check className="w-3 h-3" /> Prettier</span>
      </div>
    </div>
  );
}
