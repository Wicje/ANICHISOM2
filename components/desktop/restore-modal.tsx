'use client';

/**
 * Workspace Restoration Toast
 *
 * On boot (and especially on ephemeral guest entry) this pulls the latest
 * context checkpoint and actually restores the workspace: reopens apps and
 * browser tabs, then reports what was rebuilt. Falls back to a quiet notice
 * when no checkpoint exists.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Globe,
  ShieldCheck,
  X,
  CheckCircle2,
  Laptop,
  Clock,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { restoreLatestSession, type HydrationSummary } from '@/lib/hydration';

export function RestorationModal() {
  const searchParams = useSearchParams();
  const isEphemeral = searchParams?.get('ephemeral') === 'true';
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState<HydrationSummary | null>(null);
  const [found, setFound] = useState(true);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        // Ephemeral guests carry their scoped capability token in sessionStorage
        let capabilityToken: string | undefined;
        try {
          capabilityToken = sessionStorage.getItem('continua_ephemeral_cap') || undefined;
        } catch {}

        const result = await restoreLatestSession(capabilityToken);
        if (cancelled) return;

        setFound(result.ok);
        setSummary(result.summary ?? null);
        setIsOpen(true);
      } catch {
        if (!cancelled) {
          setFound(false);
          setIsOpen(isEphemeral); // stay quiet for normal boots with no checkpoint
        }
      }
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isEphemeral]);

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
              {found ? (
                <Sparkles className="w-4 h-4 text-[#10F4A0]" />
              ) : (
                <Laptop className="w-4 h-4 text-white/50" />
              )}
            </div>
            <div>
              <div className="font-bold text-xs tracking-tight text-white flex items-center gap-1.5">
                <span>{found ? 'Workspace Restored' : 'No Checkpoint Found'}</span>
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
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {found && summary ? (
          <>
            {/* Restored Metadata — real values from the checkpoint */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2 text-xs text-white/80">
              {summary.projectName && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10F4A0] shrink-0" />
                  <span className="text-white/90 truncate">{summary.projectName}</span>
                </div>
              )}

              {summary.appsRestored.length > 0 && (
                <div className="flex items-center gap-2">
                  <Laptop className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate text-white/90">
                    {summary.appsRestored.length} app{summary.appsRestored.length > 1 ? 's' : ''} reopened
                  </span>
                </div>
              )}

              {summary.tabsRestored > 0 && (
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    {summary.tabsRestored} browser tab{summary.tabsRestored > 1 ? 's' : ''} restored
                  </span>
                </div>
              )}

              {summary.checkpointAt && (
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-white/40 shrink-0" />
                  <span className="text-white/50">
                    from checkpoint · {new Date(summary.checkpointAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-white/60 leading-relaxed">
            This device has no saved context checkpoints yet. Keep working — the context engine
            will capture lightweight snapshots as you go.
          </div>
        )}

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
