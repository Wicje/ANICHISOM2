'use client';

/**
 * Context & Privacy — three-tier privacy guardrail switcher.
 *
 * Standard: metadata-only checkpoints with cloud sync.
 * Local Only: checkpoints stay in IndexedDB, zero cloud sync.
 * Private Session: all context monitoring paused.
 */
import React from 'react';
import { Eye, HardDrive, EyeOff, Check } from 'lucide-react';
import { useContextPrivacyStore } from '@/lib/stores/context-privacy.store';
import type { PrivacyMode } from '@/lib/context-kernel/graph';

const TIERS: Array<{
  id: PrivacyMode;
  title: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  accent: string;
}> = [
  {
    id: 'standard',
    title: 'Standard',
    tagline: 'Recommended',
    description:
      'Captures lightweight metadata checkpoints (open apps, tabs, git branch) every 30s and syncs them to your Continua cloud for cross-device restore.',
    icon: Eye,
    accent: '#10F4A0',
  },
  {
    id: 'local_only',
    title: 'Local Only',
    tagline: 'Zero cloud sync',
    description:
      'Checkpoints are written strictly to this device\'s IndexedDB. Nothing leaves your browser — restoration works only on this machine.',
    icon: HardDrive,
    accent: '#22d3ee',
  },
  {
    id: 'private_session',
    title: 'Private Session',
    tagline: 'Pause monitoring',
    description:
      'Pauses all context recording entirely until you switch back. Your workspace keeps working normally — nothing is captured.',
    icon: EyeOff,
    accent: '#fbbf24',
  },
];

export function ContextPrivacySection() {
  const { mode, hydrated, hydrate, setMode } = useContextPrivacyStore();

  // Hydrate persisted tier on first mount
  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleSelect = (next: PrivacyMode) => {
    if (next === mode) return;
    setMode(next);
    const tier = TIERS.find((t) => t.id === next);
    window.dispatchEvent(
      new CustomEvent('os:notify', {
        detail: {
          title: 'Privacy Mode Updated',
          description: `Context engine is now in ${tier?.title} mode.`,
          type: 'success',
        },
      })
    );
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b border-white/10">
        <Eye className="w-5 h-5 text-[#10F4A0]" />
        <div>
          <h2 className="text-lg font-medium">Context Engine &amp; Privacy</h2>
          <p className="text-xs text-white/40">
            Control what the continuity engine records and where it is stored.
          </p>
        </div>
      </div>

      <div
        className="space-y-3"
        role="radiogroup"
        aria-label="Context privacy mode"
      >
        {TIERS.map((tier) => {
          const Icon = tier.icon;
          const isActive = hydrated && mode === tier.id;
          return (
            <button
              key={tier.id}
              role="radio"
              aria-checked={isActive}
              onClick={() => handleSelect(tier.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 ${
                isActive
                  ? 'border-[#10F4A0]/50 bg-[#10F4A0]/[0.06]'
                  : 'border-white/10 bg-white/5 hover:bg-white/[0.07] hover:border-white/20'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-[#10F4A0]/15' : 'bg-white/5'
                }`}
              >
                <Icon
                  className="w-4.5 h-4.5"
                  style={{ color: isActive ? tier.accent : 'rgba(255,255,255,0.5)' }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-white">{tier.title}</span>
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wide"
                    style={{
                      color: tier.accent,
                      backgroundColor: `${tier.accent}14`,
                      border: `1px solid ${tier.accent}30`,
                    }}
                  >
                    {tier.tagline}
                  </span>
                </div>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">{tier.description}</p>
              </div>

              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 transition-colors ${
                  isActive ? 'border-[#10F4A0] bg-[#10F4A0]' : 'border-white/25'
                }`}
              >
                {isActive && <Check className="w-3 h-3 text-slate-950" strokeWidth={3} />}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-white/30 leading-relaxed">
        In every mode, raw code contents, keystrokes and credentials are never captured — only
        structured metadata such as file paths, branch names and tab URLs.
      </p>
    </section>
  );
}
