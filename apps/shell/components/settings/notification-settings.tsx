'use client';

import React, { useState, useMemo } from 'react';
import { Activity, Zap, Folder, Bell, Settings, Search, Monitor, Package, Cog, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActivityStore, type ActivityType } from '@/lib/stores/activity.store';
import { format } from 'date-fns';

const TYPE_CONFIG: Record<ActivityType, { icon: React.ComponentType<any>; color: string; bg: string }> = {
  'app-open': { icon: Zap, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  'app-close': { icon: X, color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  'file-save': { icon: Folder, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  'file-open': { icon: Folder, color: '#00f0ff', bg: 'rgba(0,240,255,0.1)' },
  'notification': { icon: Bell, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  'system': { icon: Monitor, color: '#00f0ff', bg: 'rgba(0,240,255,0.1)' },
  'install': { icon: Package, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  'setting-change': { icon: Cog, color: '#00f0ff', bg: 'rgba(0,240,255,0.1)' },
  'search': { icon: Search, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
};

const FILTER_OPTIONS: { value: ActivityType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Activity' },
  { value: 'app-open', label: 'App Launches' },
  { value: 'file-save', label: 'File Saves' },
  { value: 'system', label: 'System Events' },
  { value: 'notification', label: 'Notifications' },
  { value: 'install', label: 'Installs' },
];

export function NotificationSettings({ window: osWindow }: { window?: any }) {
  const events = useActivityStore((s) => s.events);
  const clear = useActivityStore((s) => s.clear);
  const [filter, setFilter] = useState<ActivityType | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = events;
    if (filter !== 'all') result = result.filter((e) => e.type === filter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) => e.title.toLowerCase().includes(q) || e.detail?.toLowerCase().includes(q));
    }
    return result;
  }, [events, filter, search]);

  const stats = useMemo(() => {
    const total = events.length;
    const byType = Object.keys(TYPE_CONFIG).map((t) => ({
      type: t as ActivityType,
      count: events.filter((e) => e.type === t).length,
    }));
    const lastHour = events.filter((e) => e.timestamp > Date.now() - 3600000).length;
    return { total, byType, lastHour };
  }, [events]);

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return format(new Date(ts), 'MMM d, h:mm a');
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: 'var(--os-surface)' }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--os-text)' }}>Activity Monitor</h1>
            <p className="text-xs mt-1" style={{ color: 'var(--os-text-muted)' }}>Real-time system event timeline</p>
          </div>
          <button
            onClick={clear}
            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{ background: 'var(--os-hover)', color: 'var(--os-text-muted)' }}
          >
            Clear All
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <StatCard label="Total Events" value={stats.total} color="var(--os-primary)" />
          <StatCard label="Last Hour" value={stats.lastHour} color="#10b981" />
          <StatCard label="App Actions" value={stats.byType.find(b => b.type === 'app-open')?.count || 0} color="#00f0ff" />
          <StatCard label="File Ops" value={(stats.byType.find(b => b.type === 'file-save')?.count || 0) + (stats.byType.find(b => b.type === 'file-open')?.count || 0)} color="#f59e0b" />
        </div>

        {/* Search + Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--os-text-muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border outline-none"
              style={{ background: 'var(--os-hover)', borderColor: 'var(--os-border)', color: 'var(--os-text)' }}
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs rounded-lg border outline-none cursor-pointer"
            style={{ background: 'var(--os-hover)', borderColor: 'var(--os-border)', color: 'var(--os-text)' }}
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Type breakdown bar */}
      <div className="px-6 pb-2 flex gap-1 shrink-0">
        {stats.byType.filter(b => b.count > 0).map((b) => {
          const cfg = TYPE_CONFIG[b.type];
          const Icon = cfg.icon;
          return (
            <button
              key={b.type}
              onClick={() => setFilter(filter === b.type ? 'all' : b.type)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all",
                filter === b.type ? "ring-1" : ""
              )}
              style={{ background: cfg.bg, color: cfg.color, outline: filter === b.type ? `1px solid ${cfg.color}` : undefined }}
            >
              <Icon className="w-3 h-3" />
              {b.count}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48" style={{ color: 'var(--os-text-muted)' }}>
            <Activity className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No activity yet</p>
            <p className="text-xs mt-1 opacity-60">Events will appear as you use the OS</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px" style={{ background: 'var(--os-border)' }} />
            <div className="space-y-1">
              {filtered.map((event) => {
                const cfg = TYPE_CONFIG[event.type];
                const Icon = cfg.icon;
                return (
                  <div key={event.id} className="flex items-start gap-3 py-2 relative group">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-2"
                      style={{ background: cfg.bg, borderColor: 'var(--os-surface)' }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold" style={{ color: 'var(--os-text)' }}>{event.title}</span>
                        <span className="text-[10px] shrink-0" style={{ color: 'var(--os-text-muted)' }}>{formatTime(event.timestamp)}</span>
                      </div>
                      {event.detail && (
                        <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--os-text-muted)' }}>{event.detail}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="px-3 py-2 rounded-lg" style={{ background: 'var(--os-hover)' }}>
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] font-medium" style={{ color: 'var(--os-text-muted)' }}>{label}</div>
    </div>
  );
}

export default NotificationSettings;
