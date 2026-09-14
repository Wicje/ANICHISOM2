'use client';

/**
 * Dashboard — the main app page for Continua.
 *
 * Replaces the desktop shell with a focused workspace dashboard:
 * workspace list, capture status, restore panel, session history.
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  RotateCcw,
  Plus,
  Trash2,
  Clock,
  Share2,
  Sparkles,
  Globe,
  FileText,
  AppWindow,
  StickyNote,
  Loader2,
  X,
  Check,
  AlertTriangle,
  ArrowRight,
  Search,
  Zap,
  Monitor,
  ExternalLink,
  ChevronRight,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useContinuityStore } from '@/lib/stores/continuity.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useTeamStore } from '@/lib/stores/team.store';
import { summarizeWorkspace, type WorkspaceSummary } from '@/lib/continuity/summarize';
import { scoreAllResources } from '@/lib/continuity/relevance';
import { detectCapabilities } from '@/lib/capabilities';
import type { WorkspaceSnapshot, RestorePlan, ResourceRelevance, WorkspaceResource } from '@/lib/continuity/types';

// ─── Helpers ────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function resourceIcon(type: WorkspaceResource['type']) {
  switch (type) {
    case 'url': return Globe;
    case 'file': return FileText;
    case 'application': return AppWindow;
    case 'note': return StickyNote;
  }
}

function relevanceDot(r: ResourceRelevance) {
  switch (r) {
    case 'high': return 'bg-emerald-400';
    case 'medium': return 'bg-amber-400';
    case 'low': return 'bg-zinc-400';
  }
}

// ─── Dashboard ──────────────────────────────────────────────

export default function DashboardPage() {
  const {
    activeWorkspace,
    recentWorkspaces,
    isCapturing,
    startCapture,
    stopCapture,
    saveWorkspace,
    loadWorkspaces,
    deleteWorkspace,
    restoreWorkspace,
  } = useContinuityStore();
  const { currentUser, logout } = useAuthStore();
  const { shareWorkspace } = useTeamStore();

  const [showRestore, setShowRestore] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [showShareInput, setShowShareInput] = useState<string | null>(null);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  // Summaries for all workspaces
  const summaries = useMemo(() => {
    const map = new Map<string, WorkspaceSummary>();
    for (const ws of recentWorkspaces) {
      map.set(ws.id, summarizeWorkspace(ws));
    }
    if (activeWorkspace) {
      map.set(activeWorkspace.id, summarizeWorkspace(activeWorkspace));
    }
    return map;
  }, [recentWorkspaces, activeWorkspace]);

  // Filtered workspaces
  const filteredWorkspaces = useMemo(() => {
    const all = activeWorkspace
      ? [activeWorkspace, ...recentWorkspaces.filter(w => w.id !== activeWorkspace.id)]
      : recentWorkspaces;
    if (!searchQuery) return all;
    const q = searchQuery.toLowerCase();
    return all.filter(w =>
      w.name.toLowerCase().includes(q) ||
      w.resources.some(r => r.name.toLowerCase().includes(q))
    );
  }, [activeWorkspace, recentWorkspaces, searchQuery]);

  const handleNewWorkspace = () => {
    if (newName.trim()) {
      startCapture(newName.trim());
      setNewName('');
      setShowNewInput(false);
    }
  };

  const handleShare = async (wsId: string) => {
    if (shareEmail.trim()) {
      const ok = await shareWorkspace(wsId, shareEmail.trim());
      if (ok) {
        setShareEmail('');
        setShowShareInput(null);
      }
    }
  };

  const handleRestore = (ws: WorkspaceSnapshot) => {
    setSelectedWorkspace(ws);
    setShowRestore(true);
  };

  const handleRestoreConfirm = async (ws: WorkspaceSnapshot, selectedIds: Set<string>) => {
    const caps = detectCapabilities();
    const plan = await restoreWorkspace(ws, caps, selectedIds);
    setShowRestore(false);
    setSelectedWorkspace(null);
    return plan;
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: 'var(--os-bg)', color: 'var(--os-text)' }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-50 px-6 py-3 flex items-center gap-4 border-b backdrop-blur-xl"
        style={{
          background: 'var(--os-glass-bg)',
          borderColor: 'var(--os-border)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight">Continua</span>
        </div>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--os-text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workspaces..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border outline-none focus:ring-1 focus:ring-[var(--os-primary)]"
            style={{
              background: 'var(--os-surface)',
              borderColor: 'var(--os-border)',
              color: 'var(--os-text)',
            }}
          />
        </div>

        {/* User */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--os-text-muted)' }}>
            {currentUser?.email?.split('@')[0]}
          </span>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: 'var(--os-text-muted)' }}
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Capture status + actions */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold">Workspaces</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--os-text-muted)' }}>
              {activeWorkspace
                ? `Tracking "${activeWorkspace.name}" — ${activeWorkspace.resources.length} resources`
                : 'No active workspace. Start capturing to pick up where you left off.'
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isCapturing ? (
              <button
                onClick={() => { stopCapture(); saveWorkspace(); }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition-all"
              >
                Stop Capture
              </button>
            ) : (
              <button
                onClick={() => setShowNewInput(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--os-primary)]/15 text-[var(--os-primary)] border border-[var(--os-primary)]/20 hover:bg-[var(--os-primary)]/25 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                New Workspace
              </button>
            )}
          </div>
        </div>

        {/* New workspace input */}
        {showNewInput && (
          <div className="mb-6 p-4 rounded-xl border" style={{ background: 'var(--os-surface)', borderColor: 'var(--os-border)' }}>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNewWorkspace();
                  if (e.key === 'Escape') { setShowNewInput(false); setNewName(''); }
                }}
                placeholder="Workspace name (e.g. 'React dashboard feature')"
                className="flex-1 px-3 py-2 text-sm rounded-lg border outline-none focus:ring-1 focus:ring-[var(--os-primary)]"
                style={{
                  background: 'var(--os-bg)',
                  borderColor: 'var(--os-border)',
                  color: 'var(--os-text)',
                }}
                autoFocus
              />
              <button
                onClick={handleNewWorkspace}
                disabled={!newName.trim()}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--os-primary)] text-white hover:brightness-110 disabled:opacity-40 transition-all"
              >
                Start
              </button>
              <button
                onClick={() => { setShowNewInput(false); setNewName(''); }}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: 'var(--os-text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Workspace grid */}
        {filteredWorkspaces.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Layers className="w-8 h-8" style={{ color: 'var(--os-text-muted)', opacity: 0.4 }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--os-text-muted)' }}>
              {searchQuery ? 'No workspaces match your search' : 'No workspaces yet'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--os-text-muted)', opacity: 0.6 }}>
              {searchQuery ? 'Try a different query' : 'Install the extension and start browsing to capture your first workspace'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredWorkspaces.map((ws) => {
              const summary = summaries.get(ws.id);
              const isActive = ws.id === activeWorkspace?.id;
              const resourceCount = ws.resources.length;
              const urlCount = ws.resources.filter(r => r.type === 'url').length;

              return (
                <div
                  key={ws.id}
                  className={cn(
                    'group p-5 rounded-2xl border transition-all hover:shadow-lg',
                    isActive
                      ? 'border-[var(--os-primary)]/30 shadow-[var(--os-primary)]/5'
                      : 'border-[var(--os-border)] hover:border-[var(--os-border)]/80',
                  )}
                  style={{ background: 'var(--os-surface)' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        )}
                        <h3 className="text-sm font-bold truncate">{ws.name}</h3>
                        {isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold">
                            Active
                          </span>
                        )}
                      </div>

                      {ws.activeTask && (
                        <p className="text-xs mt-1" style={{ color: 'var(--os-text-muted)' }}>
                          {ws.activeTask}
                        </p>
                      )}

                      {/* Summary */}
                      {summary && summary.highlights.length > 0 && (
                        <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--os-text-muted)', opacity: 0.7 }}>
                          {summary.headline}
                        </p>
                      )}

                      {/* Meta */}
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--os-text-muted)', opacity: 0.5 }}>
                          <Clock className="w-3 h-3" />
                          {timeAgo(ws.syncedAt || ws.capturedAt)}
                        </span>
                        <span className="text-[11px]" style={{ color: 'var(--os-text-muted)', opacity: 0.5 }}>
                          {resourceCount} resource{resourceCount !== 1 ? 's' : ''}
                        </span>
                        {urlCount > 0 && (
                          <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--os-text-muted)', opacity: 0.5 }}>
                            <Globe className="w-3 h-3" />
                            {urlCount} tab{urlCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Highlight tags */}
                      {summary && summary.highlights.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {summary.highlights.slice(0, 4).map((h, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-0.5 rounded-full border"
                              style={{
                                background: 'var(--os-bg)',
                                borderColor: 'var(--os-border)',
                                color: 'var(--os-text-muted)',
                              }}
                            >
                              {h.length > 30 ? h.slice(0, 30) + '…' : h}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleRestore(ws)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        style={{ color: 'var(--os-text-muted)' }}
                        title="Restore workspace"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setShowShareInput(showShareInput === ws.id ? null : ws.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        style={{ color: 'var(--os-text-muted)' }}
                        title="Share"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteWorkspace(ws.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/15 text-[var(--os-text-muted)] hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Share input */}
                  {showShareInput === ws.id && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="email"
                        value={shareEmail}
                        onChange={(e) => setShareEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleShare(ws.id);
                          if (e.key === 'Escape') { setShowShareInput(null); setShareEmail(''); }
                        }}
                        placeholder="Email to share with..."
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border outline-none focus:ring-1 focus:ring-[var(--os-primary)]"
                        style={{
                          background: 'var(--os-bg)',
                          borderColor: 'var(--os-border)',
                          color: 'var(--os-text)',
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleShare(ws.id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--os-primary)] text-white hover:brightness-110 transition-all"
                      >
                        Share
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Restore modal */}
        {showRestore && selectedWorkspace && (
          <RestoreModal
            workspace={selectedWorkspace}
            onDismiss={() => { setShowRestore(false); setSelectedWorkspace(null); }}
            onRestore={(ids) => handleRestoreConfirm(selectedWorkspace, ids)}
          />
        )}
      </main>
    </div>
  );
}

// ─── Restore Modal ──────────────────────────────────────────

function RestoreModal({
  workspace,
  onDismiss,
  onRestore,
}: {
  workspace: WorkspaceSnapshot;
  onDismiss: () => void;
  onRestore: (selectedIds: Set<string>) => Promise<RestorePlan>;
}) {
  const scored = useMemo(() => scoreAllResources(workspace.resources), [workspace]);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(scored.filter(s => s.relevance === 'high').map(s => s.resource.id))
  );
  const [restoring, setRestoring] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleRestore = async () => {
    setRestoring(true);
    setProgress(0);
    const total = selected.size;
    const iv = setInterval(() => {
      setProgress(p => {
        if (p >= total) { clearInterval(iv); return total; }
        return p + 1;
      });
    }, 300);
    await onRestore(selected);
    clearInterval(iv);
    setProgress(total);
  };

  const grouped = useMemo(() => ({
    high: scored.filter(s => s.relevance === 'high'),
    medium: scored.filter(s => s.relevance === 'medium'),
    low: scored.filter(s => s.relevance === 'low'),
  }), [scored]);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-300"
        style={{
          background: 'var(--os-glass-bg)',
          border: '1px solid var(--os-glass-border)',
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--os-text)' }}>Restore Workspace</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--os-text-muted)' }}>
                {workspace.name} · {workspace.resources.length} resources
              </p>
            </div>
          </div>
          <button onClick={onDismiss} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--os-text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 pb-3 flex items-center gap-2">
          <button
            onClick={() => setSelected(new Set(scored.map(s => s.resource.id)))}
            className="px-3 py-1 rounded-lg text-[11px] font-semibold border border-white/15 bg-white/10"
            style={{ color: 'var(--os-text)' }}
          >
            Select All
          </button>
          <button
            onClick={() => setSelected(new Set(scored.filter(s => s.relevance === 'high').map(s => s.resource.id)))}
            className="px-3 py-1 rounded-lg text-[11px] font-semibold border border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
          >
            High Only
          </button>
          <div className="flex-1" />
          <span className="text-[11px] tabular-nums" style={{ color: 'var(--os-text-muted)', opacity: 0.5 }}>
            {selected.size} of {scored.length} selected
          </span>
        </div>

        {/* Resources */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-3 custom-scrollbar">
          {(['high', 'medium', 'low'] as const).map(rel => {
            const items = grouped[rel];
            if (items.length === 0) return null;
            const color = rel === 'high' ? 'bg-emerald-400' : rel === 'medium' ? 'bg-amber-400' : 'bg-zinc-400';
            return (
              <div key={rel} className="space-y-1.5">
                <div className="flex items-center gap-2 px-1">
                  <span className={cn('w-1.5 h-1.5 rounded-full', color)} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--os-text-muted)', opacity: 0.6 }}>
                    {rel} relevance
                  </span>
                  <span className="text-[11px] tabular-nums" style={{ color: 'var(--os-text-muted)', opacity: 0.4 }}>
                    {items.length}
                  </span>
                </div>
                {items.map(({ resource, relevance, score }) => {
                  const Icon = resourceIcon(resource.type);
                  const isActive = selected.has(resource.id);
                  return (
                    <button
                      key={resource.id}
                      onClick={() => toggle(resource.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                        isActive ? 'bg-white/10 border border-white/15' : 'bg-transparent border border-transparent hover:bg-white/5',
                      )}
                    >
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', isActive ? 'bg-white/10' : 'bg-white/5')}>
                        <Icon className="w-4 h-4" style={{ color: isActive ? 'var(--os-text)' : 'var(--os-text-muted)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: isActive ? 'var(--os-text)' : 'var(--os-text-muted)' }}>
                          {resource.name}
                        </p>
                        <p className="text-[11px] truncate" style={{ color: 'var(--os-text-muted)', opacity: 0.6 }}>
                          {resource.type === 'url' ? resource.metadata.url : resource.type === 'file' ? resource.metadata.filePath : resource.metadata.appTitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] tabular-nums" style={{ color: 'var(--os-text-muted)', opacity: 0.5 }}>{Math.round(score * 100)}</span>
                        <span className={cn('w-2 h-2 rounded-full', relevanceDot(relevance))} />
                        <div className={cn('w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center', isActive ? 'border-emerald-400 bg-emerald-400/20' : 'border-zinc-500')}>
                          {isActive && <Check className="w-3 h-3 text-emerald-400" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Progress */}
        {restoring && (
          <div className="px-6 pb-2">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-300"
                style={{ width: `${selected.size > 0 ? (progress / selected.size) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 flex items-center gap-3 border-t" style={{ borderColor: 'var(--os-glass-border)' }}>
          <button
            onClick={onDismiss}
            disabled={restoring}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border hover:bg-white/10 disabled:opacity-40 transition-all"
            style={{ color: 'var(--os-text-muted)', borderColor: 'var(--os-glass-border)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleRestore}
            disabled={restoring || selected.size === 0}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-blue-500 text-white hover:brightness-110 shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {restoring ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Restoring…</>
            ) : (
              <><RotateCcw className="w-4 h-4" /> Restore</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
