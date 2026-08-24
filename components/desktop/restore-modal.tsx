'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  GitBranch, 
  FileCode, 
  Globe, 
  ShieldCheck, 
  X, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  Zap,
  Laptop
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export function RestorationModal() {
  const searchParams = useSearchParams();
  const isEphemeral = searchParams?.get('ephemeral') === 'true';
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Show restoration toast/modal on initial mount or when entering via ephemeral connect
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed top-12 right-6 z-50 max-w-sm w-full animate-fade-in">
      <div className="p-5 rounded-3xl bg-[#0B0F17]/95 border border-[#10F4A0]/40 backdrop-blur-2xl shadow-2xl shadow-black/80 text-white space-y-4 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#10F4A0]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#10F4A0]/15 border border-[#10F4A0]/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#10F4A0]" />
            </div>
            <div>
              <div className="font-bold text-xs tracking-tight text-white flex items-center gap-1.5">
                <span>Workspace Reconstructed</span>
                {isEphemeral && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded">
                    Guest Mode
                  </span>
                )}
              </div>
              <div className="text-[10px] text-white/50">Continua Context Engine</div>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-white/40 hover:text-white text-xs p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Restored Metadata */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2 text-xs text-white/80">
          <div className="flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-mono text-[11px] text-white/90">branch: context-engine (2 modified)</span>
          </div>
          <div className="flex items-center gap-2">
            <FileCode className="w-3.5 h-3.5 text-[#10F4A0] shrink-0" />
            <span className="truncate text-white/90">src/components/Workspace.tsx</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>8 Documentation & Research Tabs</span>
          </div>
        </div>

        {/* Bottom Status & Dismiss Action */}
        <div className="flex items-center justify-between pt-1 text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero Credentials Stored</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="px-3 py-1.5 rounded-xl bg-[#10F4A0] text-slate-950 font-bold text-xs hover:brightness-110 active:scale-95 transition-all"
          >
            Resume Work
          </button>
        </div>

      </div>
    </div>
  );
}
