'use client';

/**
 * Workspace Switcher — dock widget showing active workspace.
 *
 * Displays the current workspace name and recent workspaces.
 * Allows quick switching between workspaces.
 */
import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, Clock, ChevronDown, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useContinuityStore } from '@/lib/stores/continuity.store';
import { useTeamStore } from '@/lib/stores/team.store';

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function WorkspaceSwitcher() {
  const { activeWorkspace, recentWorkspaces, isCapturing, startCapture, stopCapture, loadWorkspaces, deleteWorkspace } = useContinuityStore();
  const { shareWorkspace } = useTeamStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showNewInput, setShowNewInput] = useState(false);
  const [showShareInput, setShowShareInput] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const handleNewWorkspace = () => {
    if (newName.trim()) {
      startCapture(newName.trim());
      setNewName('');
      setShowNewInput(false);
      setIsOpen(false);
    }
  };

  const handleShare = async () => {
    if (shareEmail.trim() && activeWorkspace) {
      const ok = await shareWorkspace(activeWorkspace.id, shareEmail.trim());
      if (ok) {
        setShareEmail('');
        setShowShareInput(false);
        window.dispatchEvent(new CustomEvent('os:notify', {
          detail: { title: 'Workspace Shared', description: `Shared with ${shareEmail}`, type: 'success' },
        }));
      }
    }
  };

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
          isCapturing
            ? "bg-[var(--os-primary)]/20 text-[var(--os-primary)] border border-[var(--os-primary)]/30"
            : "text-[var(--os-text-muted)] hover:text-[var(--os-text)] hover:bg-[var(--os-hover)]"
        )}
        title="Workspaces"
      >
        <Layers className="w-3.5 h-3.5" />
        {activeWorkspace && (
          <span className="max-w-[80px] truncate">{activeWorkspace.name}</span>
        )}
        <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-full left-0 mb-2 w-72 bg-[var(--os-glass-bg)] backdrop-blur-xl border border-[var(--os-glass-border)] rounded-xl shadow-2xl z-[9999] overflow-hidden">
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-[var(--os-border)] flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--os-text)]">Workspaces</span>
              <button
                onClick={() => { setShowNewInput(true); }}
                className="p-1 rounded-md hover:bg-[var(--os-hover)] text-[var(--os-text-muted)] hover:text-[var(--os-primary)] transition-colors"
                title="New workspace"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* New workspace input */}
            {showNewInput && (
              <div className="px-3 py-2 border-b border-[var(--os-border)]">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNewWorkspace();
                    if (e.key === 'Escape') { setShowNewInput(false); setNewName(''); }
                  }}
                  placeholder="Workspace name..."
                  className="w-full px-2 py-1 text-xs bg-[var(--os-surface-elevated)] border border-[var(--os-border)] rounded-md text-[var(--os-text)] outline-none focus:border-[var(--os-primary)]"
                  autoFocus
                />
              </div>
            )}

            {/* Active workspace */}
            {activeWorkspace && (
              <div className="px-3 py-2 border-b border-[var(--os-border)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[var(--os-text)] truncate">{activeWorkspace.name}</div>
                      {activeWorkspace.activeTask && (
                        <div className="text-[10px] text-[var(--os-text-muted)] truncate">{activeWorkspace.activeTask}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setShowShareInput(!showShareInput)}
                      className="text-[10px] text-[var(--os-text-muted)] hover:text-[var(--os-primary)] transition-colors"
                      title="Share workspace"
                    >
                      <Share2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => { stopCapture(); setIsOpen(false); }}
                      className="text-[10px] text-[var(--os-text-muted)] hover:text-[var(--os-error)] transition-colors"
                    >
                      Stop
                    </button>
                  </div>
                </div>
                <div className="text-[10px] text-[var(--os-text-muted)] mt-1">
                  {activeWorkspace.resources.length} resource{activeWorkspace.resources.length !== 1 ? 's' : ''} tracked
                </div>

                {/* Share input */}
                {showShareInput && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <input
                      type="email"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleShare(); if (e.key === 'Escape') { setShowShareInput(false); setShareEmail(''); } }}
                      placeholder="Email to share with..."
                      className="flex-1 px-2 py-1 text-[10px] bg-[var(--os-surface-elevated)] border border-[var(--os-border)] rounded-md text-[var(--os-text)] outline-none focus:border-[var(--os-primary)]"
                      autoFocus
                    />
                    <button
                      onClick={handleShare}
                      className="px-2 py-1 text-[10px] font-medium rounded-md bg-[var(--os-primary)] text-white hover:brightness-110 transition-all"
                    >
                      Share
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Recent workspaces */}
            <div className="max-h-48 overflow-y-auto">
              {recentWorkspaces.length === 0 && !activeWorkspace ? (
                <div className="px-3 py-4 text-center text-xs text-[var(--os-text-muted)]">
                  No workspaces yet. Click + to start tracking.
                </div>
              ) : (
                recentWorkspaces
                  .filter(w => w.id !== activeWorkspace?.id)
                  .slice(0, 8)
                  .map(ws => (
                    <div
                      key={ws.id}
                      className="px-3 py-2 hover:bg-[var(--os-hover)] flex items-center justify-between group transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-[var(--os-text)] truncate">{ws.name}</div>
                        <div className="text-[10px] text-[var(--os-text-muted)] flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {timeAgo(ws.syncedAt || ws.capturedAt)}
                          <span className="mx-0.5">·</span>
                          {ws.resources.length} resource{ws.resources.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteWorkspace(ws.id); }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--os-error)]/20 text-[var(--os-text-muted)] hover:text-[var(--os-error)] transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
