'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  RotateCcw,
  Check,
  X,
  FileText,
  Globe,
  AppWindow,
  StickyNote,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useContinuityStore } from '@/lib/stores/continuity.store';
import { detectCapabilities } from '@/lib/capabilities';
import { scoreAllResources } from '@/lib/continuity/relevance';
import type { RestorePlan, WorkspaceResource, ResourceRelevance } from '@/lib/continuity/types';

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
    case 'url':
      return Globe;
    case 'file':
      return FileText;
    case 'application':
      return AppWindow;
    case 'note':
      return StickyNote;
  }
}

function relevanceDot(relevance: ResourceRelevance) {
  switch (relevance) {
    case 'high':
      return 'bg-emerald-400 shadow-emerald-400/50';
    case 'medium':
      return 'bg-amber-400 shadow-amber-400/50';
    case 'low':
      return 'bg-zinc-400 shadow-zinc-400/50';
  }
}

function relevanceLabel(relevance: ResourceRelevance) {
  switch (relevance) {
    case 'high':
      return 'High Relevance';
    case 'medium':
      return 'Medium Relevance';
    case 'low':
      return 'Low Relevance';
  }
}

// ─── Props ──────────────────────────────────────────────────

interface RestorePanelProps {
  onDismiss: () => void;
  onRestore: (plan: RestorePlan) => void;
}

// ─── Component ──────────────────────────────────────────────

export default function RestorePanel({ onDismiss, onRestore }: RestorePanelProps) {
  const { recentWorkspaces, loadWorkspaces, restoreWorkspace, isRestoring } =
    useContinuityStore();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'high'>('all');
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);

  // Load workspaces on mount
  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const workspace = recentWorkspaces[0] ?? null;

  // Score resources
  const scored = useMemo(() => {
    if (!workspace) return [];
    return scoreAllResources(workspace.resources);
  }, [workspace]);

  // Initialize selection based on filter
  useEffect(() => {
    if (!workspace) return;
    const ids = scored
      .filter((s) => (filter === 'high' ? s.relevance === 'high' : true))
      .map((s) => s.resource.id);
    setSelected(new Set(ids));
  }, [workspace, filter, scored]);

  const filteredScored = useMemo(() => {
    if (filter === 'high') return scored.filter((s) => s.relevance === 'high');
    return scored;
  }, [scored, filter]);

  const grouped = useMemo(() => {
    const high = filteredScored.filter((s) => s.relevance === 'high');
    const medium = filteredScored.filter((s) => s.relevance === 'medium');
    const low = filteredScored.filter((s) => s.relevance === 'low');
    return { high, medium, low };
  }, [filteredScored]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(filteredScored.map((s) => s.resource.id)));
  };

  const selectHighOnly = () => {
    setFilter('high');
  };

  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const handleRestore = async () => {
    if (!workspace || restoring) return;
    setRestoring(true);
    setRestoreProgress(0);

    const total = selected.size;
    intervalRef.current = setInterval(() => {
      setRestoreProgress((p) => {
        if (p >= total) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return total;
        }
        return p + 1;
      });
    }, 300);

    const caps = detectCapabilities();
    const plan = await restoreWorkspace(workspace, caps, selected);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRestoreProgress(total);

    setTimeout(() => {
      onRestore(plan);
    }, 400);
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const selectedCount = selected.size;

  // ── Empty state ──────────────────────────────────────────

  if (!workspace) {
    return (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div
          className={cn(
            'w-full max-w-md p-8 rounded-3xl',
            'bg-[var(--os-glass-bg)] backdrop-blur-xl',
            'border border-[var(--os-glass-border)]',
            'shadow-2xl text-center flex flex-col items-center gap-4',
          )}
        >
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-zinc-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--os-text)' }}>
              Welcome Back
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--os-text-muted)' }}>
              No workspace found. Start fresh and we&apos;ll pick up where you left off next time.
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="mt-2 px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-semibold transition-all border border-[var(--os-glass-border)]"
            style={{ color: 'var(--os-text)' }}
          >
            Start Fresh
          </button>
        </div>
      </div>
    );
  }

  // ── Resource row ─────────────────────────────────────────

  function ResourceRow({
    item,
  }: {
    item: (typeof scored)[number];
  }) {
    const { resource, relevance, score } = item;
    const Icon = resourceIcon(resource.type);
    const isActive = selected.has(resource.id);

    return (
      <button
        onClick={() => toggle(resource.id)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
          isActive
            ? 'bg-white/10 border border-white/15'
            : 'bg-transparent border border-transparent hover:bg-white/5',
        )}
      >
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
            isActive ? 'bg-white/10' : 'bg-white/5',
          )}
        >
          <Icon
            className="w-4 h-4"
            style={{ color: isActive ? 'var(--os-text)' : 'var(--os-text-muted)' }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium truncate"
            style={{ color: isActive ? 'var(--os-text)' : 'var(--os-text-muted)' }}
          >
            {resource.name}
          </p>
          <p className="text-[11px] truncate" style={{ color: 'var(--os-text-muted)', opacity: 0.6 }}>
            {resource.type === 'url'
              ? resource.metadata.url
              : resource.type === 'file'
                ? resource.metadata.filePath
                : resource.type === 'application'
                  ? resource.metadata.appTitle
                  : 'Note'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--os-text-muted)', opacity: 0.5 }}>
            {Math.round(score * 100)}
          </span>
          <span
            className={cn(
              'w-2 h-2 rounded-full shadow-sm',
              relevanceDot(relevance),
            )}
          />
          <div
            className={cn(
              'w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center transition-all',
              isActive
                ? 'border-emerald-400 bg-emerald-400/20'
                : 'border-zinc-500 bg-transparent',
            )}
            style={{ width: 18, height: 18 }}
          >
            {isActive && <Check className="w-3 h-3 text-emerald-400" />}
          </div>
        </div>
      </button>
    );
  }

  // ── Section group ────────────────────────────────────────

  function SectionGroup({
    label,
    items,
    color,
  }: {
    label: string;
    items: Array<(typeof scored)[number]>;
    color: string;
  }) {
    if (items.length === 0) return null;

    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 px-1">
          <span className={cn('w-1.5 h-1.5 rounded-full', color)} />
          <span
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--os-text-muted)', opacity: 0.6 }}
          >
            {label}
          </span>
          <span
            className="text-[11px] tabular-nums"
            style={{ color: 'var(--os-text-muted)', opacity: 0.4 }}
          >
            {items.length}
          </span>
        </div>
        {items.map((item) => (
          <ResourceRow key={item.resource.id} item={item} />
        ))}
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────

  const progressPct = selectedCount > 0 ? (restoreProgress / selectedCount) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      {/* Panel */}
      <div
        className={cn(
          'w-full max-w-lg max-h-[85vh] flex flex-col',
          'bg-[var(--os-glass-bg)] backdrop-blur-xl',
          'border border-[var(--os-glass-border)]',
          'rounded-3xl shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-300',
        )}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--os-text)' }}>
                Welcome Back
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--os-text-muted)' }}>
                {workspace.name} · {timeAgo(workspace.syncedAt || workspace.capturedAt)}
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: 'var(--os-text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active task */}
        {workspace.activeTask && (
          <div className="px-6 pb-3">
            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--os-text-muted)', opacity: 0.5 }}>
                Active Task
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--os-text)' }}>
                {workspace.activeTask}
              </p>
            </div>
          </div>
        )}

        {/* Quick filters */}
        <div className="px-6 pb-3 flex items-center gap-2">
          <button
            onClick={() => { setFilter('all'); selectAll(); }}
            className={cn(
              'px-3 py-1 rounded-lg text-[11px] font-semibold transition-all border',
              filter === 'all'
                ? 'bg-white/10 border-white/15 text-white'
                : 'bg-transparent border-transparent hover:bg-white/5',
            )}
            style={{ color: filter === 'all' ? 'var(--os-text)' : 'var(--os-text-muted)' }}
          >
            Select All
          </button>
          <button
            onClick={selectHighOnly}
            className={cn(
              'px-3 py-1 rounded-lg text-[11px] font-semibold transition-all border',
              filter === 'high'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-transparent border-transparent hover:bg-white/5',
            )}
            style={{ color: filter === 'high' ? undefined : 'var(--os-text-muted)' }}
          >
            High Relevance Only
          </button>
          <div className="flex-1" />
          <span className="text-[11px] tabular-nums" style={{ color: 'var(--os-text-muted)', opacity: 0.5 }}>
            {selectedCount} of {scored.length} selected
          </span>
        </div>

        {/* Resource list */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-4 custom-scrollbar">
          <SectionGroup label="High Relevance" items={grouped.high} color="bg-emerald-400" />
          <SectionGroup label="Medium Relevance" items={grouped.medium} color="bg-amber-400" />
          <SectionGroup label="Low Relevance" items={grouped.low} color="bg-zinc-400" />
        </div>

        {/* Restore progress */}
        {restoring && (
          <div className="px-6 pb-2">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-300 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p
              className="text-[11px] mt-1.5 text-center"
              style={{ color: 'var(--os-text-muted)' }}
            >
              {restoreProgress >= selectedCount
                ? 'Workspace restored'
                : `Restoring ${restoreProgress} of ${selectedCount}…`}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 flex items-center gap-3 border-t border-[var(--os-glass-border)]">
          <button
            onClick={onDismiss}
            disabled={restoring}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border border-[var(--os-glass-border)]',
              'hover:bg-white/10 disabled:opacity-40',
            )}
            style={{ color: 'var(--os-text-muted)' }}
          >
            Start Fresh
          </button>
          <button
            onClick={handleRestore}
            disabled={restoring || selectedCount === 0}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all',
              'bg-gradient-to-r from-emerald-500 to-blue-500 text-white',
              'hover:brightness-110 shadow-lg shadow-emerald-500/20',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'flex items-center justify-center gap-2',
            )}
          >
            {restoring ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Restoring…
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                Resume Workspace
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
