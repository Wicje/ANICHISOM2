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
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold">Privacy & Security</h1>
            <p className="text-sm text-gray-400">Control who can see your apps and data</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Shared</span>
            </div>
            <div className="text-2xl font-bold">{summary.shared}</div>
            <div className="text-xs text-gray-500">apps visible to all</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <EyeOff className="w-4 h-4" />
              <span className="text-sm font-medium">Private</span>
            </div>
            <div className="text-2xl font-bold">{summary.private}</div>
            <div className="text-xs text-gray-500">apps visible to you</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 text-yellow-400 mb-2">
              <Lock className="w-4 h-4" />
              <span className="text-sm font-medium">Restricted</span>
            </div>
            <div className="text-2xl font-bold">{summary.restricted}</div>
            <div className="text-xs text-gray-500">apps with user limits</div>
          </div>
        </div>

        {/* Workspace Defaults */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-400" />
              <span className="font-medium">Workspace Default</span>
            </div>
            <button
              onClick={() => setShowWorkspaceDefaults(!showWorkspaceDefaults)}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Change
            </button>
          </div>
          <div className="text-sm text-gray-400">
            New apps will default to: <span className="text-white font-medium capitalize">{workspaceDefaults.level}</span>
          </div>

          {showWorkspaceDefaults && (
            <div className="mt-3 space-y-2">
              {PRIVACY_LEVELS.map((pl) => (
                <button
                  key={pl.level}
                  onClick={() => handleWorkspaceDefault(pl.level)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    workspaceDefaults.level === pl.level
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                      : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  {pl.icon}
                  <div className="text-left">
                    <div className="font-medium">{pl.label}</div>
                    <div className="text-xs text-gray-500">{pl.description}</div>
                  </div>
                  {workspaceDefaults.level === pl.level && <Check className="w-4 h-4 ml-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Per-App Privacy */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <h3 className="font-medium mb-3">App Privacy Overrides</h3>
          <p className="text-sm text-gray-400 mb-4">Override the workspace default for individual apps</p>

          <div className="space-y-2">
            {availableApps.map((app) => {
              const settings = appSettings[app.id];
              const level = settings?.level || workspaceDefaults.level;
              const isOverridden = !!settings;
              const isExpanded = selectedApp === app.id;

              return (
                <div key={app.id}>
                  <div
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isExpanded ? 'bg-blue-600/10 border-blue-500' : 'bg-gray-700/30 border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        level === 'private' ? 'bg-red-400' : level === 'restricted' ? 'bg-yellow-400' : 'bg-green-400'
                      }`} />
                      <span className="font-medium">{app.name}</span>
                      {isOverridden && (
                        <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded">overridden</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 capitalize">{level}</span>
                      <button
                        onClick={() => setSelectedApp(isExpanded ? null : app.id)}
                        className="text-gray-400 hover:text-white"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="ml-6 mt-1 mb-2 p-2 bg-gray-700/20 rounded-lg border border-gray-600/50 space-y-1">
                      {PRIVACY_LEVELS.map((pl) => (
                        <button
                          key={pl.level}
                          onClick={() => handleSetPrivacy(app.id, pl.level)}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                            level === pl.level
                              ? 'bg-blue-600/20 text-blue-400'
                              : 'hover:bg-gray-700/50 text-gray-300'
                          }`}
                        >
                          {pl.icon}
                          <div className="flex-1">
                            <div className="text-xs font-medium">{pl.label}</div>
                            <div className="text-[10px] text-gray-500">{pl.description}</div>
                          </div>
                          {level === pl.level && <Check className="w-3 h-3" />}
                        </button>
                      ))}
                      {isOverridden && (
                        <button
                          onClick={() => handleRemoveOverride(app.id)}
                          className="w-full flex items-center gap-2 p-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <h3 className="font-medium mb-2">How Privacy Works</h3>
          <ul className="text-sm text-gray-400 space-y-2">
            <li className="flex items-start gap-2">
              <EyeOff className="w-4 h-4 mt-0.5 text-red-400 shrink-0" />
              <span><strong className="text-white">Private:</strong> Your app data stays hidden from all collaborators. Only you can see and access it.</span>
            </li>
            <li className="flex items-start gap-2">
              <Users className="w-4 h-4 mt-0.5 text-green-400 shrink-0" />
              <span><strong className="text-white">Shared:</strong> All workspace collaborators can see and interact with this app.</span>
            </li>
            <li className="flex items-start gap-2">
              <Lock className="w-4 h-4 mt-0.5 text-yellow-400 shrink-0" />
              <span><strong className="text-white">Restricted:</strong> Only specific users you choose can see this app.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default PrivacySettings;
