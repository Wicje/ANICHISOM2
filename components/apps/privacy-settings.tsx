'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePrivacyStore, type PrivacyLevel } from '@/lib/stores/privacy.store';
import { Shield, Lock, Users, Eye, EyeOff, Settings, ChevronDown, Check, X } from 'lucide-react';

const PRIVACY_LEVELS: { level: PrivacyLevel; label: string; description: string; icon: React.ReactNode }[] = [
  { level: 'shared', label: 'Shared', description: 'Visible to all workspace collaborators', icon: <Users className="w-4 h-4" /> },
  { level: 'private', label: 'Private', description: 'Only visible to you', icon: <EyeOff className="w-4 h-4" /> },
  { level: 'restricted', label: 'Restricted', description: 'Visible to specific users only', icon: <Lock className="w-4 h-4" /> },
];

export function PrivacySettings() {
  const { appSettings, workspaceDefaults, setAppPrivacy, removeAppPrivacy, setWorkspaceDefault, getPrivacySummary } = usePrivacyStore();
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [showWorkspaceDefaults, setShowWorkspaceDefaults] = useState(false);
  const [userIdsInput, setUserIdsInput] = useState('');
  const [summary, setSummary] = useState({ private: 0, shared: 0, restricted: 0 });

  // Hydrate from IDB on mount
  useEffect(() => {
    const store = usePrivacyStore as any;
    if (typeof store.hydrate === 'function') {
      store.hydrate();
    }
  }, []);

  // Get available apps from manifest (simplified — in production would use app store)
  const availableApps = [
    { id: 'browser', name: 'Power Browser' },
    { id: 'campaign', name: 'Campaign Lab' },
    { id: 'moodboard', name: 'Moodboard' },
    { id: 'files', name: 'File Manager' },
    { id: 'terminal', name: 'Terminal' },
    { id: 'code-editor', name: 'Code Editor' },
    { id: 'brand-guides', name: 'Brand Guides' },
    { id: 'client-portal', name: 'Client Portal' },
    { id: 'proposal-generator', name: 'Proposal Generator' },
    { id: 'side-gigs', name: 'Side Gigs' },
  ];

  useEffect(() => {
    setSummary(getPrivacySummary());
  }, [appSettings, getPrivacySummary]);

  const handleSetPrivacy = useCallback((appId: string, level: PrivacyLevel, userIds?: string[]) => {
    setAppPrivacy(appId, level, userIds);
    setSelectedApp(null);
  }, [setAppPrivacy]);

  const handleRemoveOverride = useCallback((appId: string) => {
    removeAppPrivacy(appId);
    setSelectedApp(null);
  }, [removeAppPrivacy]);

  const handleWorkspaceDefault = useCallback((level: PrivacyLevel) => {
    setWorkspaceDefault(level);
    setShowWorkspaceDefaults(false);
  }, [setWorkspaceDefault]);

  return (
    <div className="p-6 bg-[var(--os-bg)] min-h-screen text-[var(--os-text)] font-sans select-none custom-scrollbar">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-2xl bg-[var(--os-primary)]/15 text-[var(--os-primary)] border border-[var(--os-primary)]/30">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--os-text)]">Privacy &amp; Security Shield</h1>
            <p className="text-xs text-[var(--os-text-muted)]">Control application visibility, access boundaries &amp; permissions</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[var(--os-surface)] rounded-2xl p-4 border border-[var(--os-border)] shadow-sm">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Shared</span>
            </div>
            <div className="text-2xl font-bold text-[var(--os-text)]">{summary.shared}</div>
            <div className="text-[10px] text-[var(--os-text-muted)] mt-1">apps visible to all</div>
          </div>
          <div className="bg-[var(--os-surface)] rounded-2xl p-4 border border-[var(--os-border)] shadow-sm">
            <div className="flex items-center gap-2 text-rose-400 mb-2">
              <EyeOff className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Private</span>
            </div>
            <div className="text-2xl font-bold text-[var(--os-text)]">{summary.private}</div>
            <div className="text-[10px] text-[var(--os-text-muted)] mt-1">apps visible to you</div>
          </div>
          <div className="bg-[var(--os-surface)] rounded-2xl p-4 border border-[var(--os-border)] shadow-sm">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <Lock className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Restricted</span>
            </div>
            <div className="text-2xl font-bold text-[var(--os-text)]">{summary.restricted}</div>
            <div className="text-[10px] text-[var(--os-text-muted)] mt-1">apps with user limits</div>
          </div>
        </div>

        {/* Workspace Defaults */}
        <div className="bg-[var(--os-surface)] rounded-2xl border border-[var(--os-border)] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-[var(--os-primary)]" />
              <span className="font-bold text-sm text-[var(--os-text)]">Workspace Default</span>
            </div>
            <button
              onClick={() => setShowWorkspaceDefaults(!showWorkspaceDefaults)}
              className="text-xs font-bold text-[var(--os-primary)] hover:underline"
            >
              Change
            </button>
          </div>
          <div className="text-xs text-[var(--os-text-muted)]">
            New apps will default to: <span className="text-[var(--os-primary)] font-bold capitalize">{workspaceDefaults.level}</span>
          </div>

          {showWorkspaceDefaults && (
            <div className="mt-3 space-y-2">
              {PRIVACY_LEVELS.map((pl) => (
                <button
                  key={pl.level}
                  onClick={() => handleWorkspaceDefault(pl.level)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    workspaceDefaults.level === pl.level
                      ? 'bg-[var(--os-primary)]/15 border-[var(--os-primary)]/40 text-[var(--os-primary)]'
                      : 'bg-[var(--os-surface-dim)] border-[var(--os-border)] hover:bg-[var(--os-hover)] text-[var(--os-text)]'
                  }`}
                >
                  {pl.icon}
                  <div className="text-left">
                    <div className="font-semibold text-xs text-[var(--os-text)]">{pl.label}</div>
                    <div className="text-[10px] text-[var(--os-text-muted)]">{pl.description}</div>
                  </div>
                  {workspaceDefaults.level === pl.level && <Check className="w-4 h-4 ml-auto text-[var(--os-primary)]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Per-App Privacy */}
        <div className="bg-[var(--os-surface)] rounded-2xl border border-[var(--os-border)] p-5 shadow-sm">
          <h3 className="font-bold text-sm text-[var(--os-text)] mb-1">App Privacy Overrides</h3>
          <p className="text-xs text-[var(--os-text-muted)] mb-4">Override the workspace default for individual apps</p>

          <div className="space-y-2">
            {availableApps.map((app) => {
              const settings = appSettings[app.id];
              const level = settings?.level || workspaceDefaults.level;
              const isOverridden = !!settings;
              const isExpanded = selectedApp === app.id;

              return (
                <div key={app.id}>
                  <div
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isExpanded ? 'bg-[var(--os-primary)]/10 border-[var(--os-primary)]/30' : 'bg-[var(--os-surface-dim)] border-[var(--os-border)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        level === 'private' ? 'bg-rose-400' : level === 'restricted' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`} />
                      <span className="font-medium text-xs text-[var(--os-text)]">{app.name}</span>
                      {isOverridden && (
                        <span className="text-[10px] bg-[var(--os-primary)]/20 text-[var(--os-primary)] px-2 py-0.5 rounded-full border border-[var(--os-primary)]/30 font-bold">overridden</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[var(--os-text-muted)] capitalize font-semibold">{level}</span>
                      <button
                        onClick={() => setSelectedApp(isExpanded ? null : app.id)}
                        className="text-[var(--os-text-muted)] hover:text-[var(--os-text)] p-1 rounded"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="ml-4 mt-1.5 mb-2 p-2 bg-[var(--os-surface-dim)] rounded-xl border border-[var(--os-border)] space-y-1.5">
                      {PRIVACY_LEVELS.map((pl) => (
                        <button
                          key={pl.level}
                          onClick={() => handleSetPrivacy(app.id, pl.level)}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all ${
                            level === pl.level
                              ? 'bg-[var(--os-primary)]/15 text-[var(--os-primary)] font-bold'
                              : 'hover:bg-[var(--os-hover)] text-[var(--os-text)]'
                          }`}
                        >
                          {pl.icon}
                          <div className="flex-1">
                            <div className="text-xs font-medium">{pl.label}</div>
                            <div className="text-[10px] text-[var(--os-text-muted)]">{pl.description}</div>
                          </div>
                          {level === pl.level && <Check className="w-3.5 h-3.5 text-[var(--os-primary)]" />}
                        </button>
                      ))}
                      {isOverridden && (
                        <button
                          onClick={() => handleRemoveOverride(app.id)}
                          className="w-full flex items-center gap-2 p-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <X className="w-3 h-3" /> Remove override (use workspace default)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Privacy Enforcement Info */}
        <div className="bg-[var(--os-surface)] rounded-2xl border border-[var(--os-border)] p-5 shadow-sm">
          <h3 className="font-bold text-sm text-[var(--os-text)] mb-3">How Privacy Works</h3>
          <ul className="text-xs text-[var(--os-text-muted)] space-y-2.5">
            <li className="flex items-start gap-2.5">
              <EyeOff className="w-4 h-4 mt-0.5 text-rose-400 shrink-0" />
              <span><strong className="text-[var(--os-text)]">Private:</strong> Your app data stays hidden from all collaborators. Only you can see and access it.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Users className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
              <span><strong className="text-[var(--os-text)]">Shared:</strong> All workspace collaborators can see and interact with this app.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
              <span><strong className="text-[var(--os-text)]">Restricted:</strong> Only specific users you choose can see this app.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default PrivacySettings;
