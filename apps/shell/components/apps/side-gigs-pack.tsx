'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import {
  Briefcase,
  Clock,
  FileText,
  Users,
  DollarSign,
  Play,
  Pause,
  Plus,
  X,
  Filter,
  CheckCircle,
  AlertCircle,
  Send,
  Trash2,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  Timer,
  ChevronRight,
  Edit3,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useSideGigsStore,
  Gig,
  TimeEntry,
  Invoice,
} from '@/lib/stores/sidegigs.store';

type Tab = 'dashboard' | 'time' | 'invoices' | 'clients';

const GIG_STATUS_COLORS: Record<Gig['status'], { bg: string; text: string }> = {
  active: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  paused: { bg: 'bg-amber-100', text: 'text-amber-700' },
  completed: { bg: 'bg-blue-100', text: 'text-blue-700' },
  archived: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

const INVOICE_STATUS_COLORS: Record<Invoice['status'], { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-600' },
  sent: { bg: 'bg-blue-100', text: 'text-blue-700' },
  paid: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  overdue: { bg: 'bg-red-100', text: 'text-red-700' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-400' },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getWeekDates(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function getMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDurationShort(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── Main Component ──────────────────────────────────────────────────────

export function SideGigsPack({ window: osWindow }: { window: OSWindow }) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  useEffect(() => {
    (useSideGigsStore as any).hydrate?.();
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-[var(--os-bg)] text-[var(--os-text)] font-sans overflow-hidden select-none">
      {/* Header */}
      <div className="h-14 border-b border-[var(--os-border)] flex items-center px-4 shrink-0 bg-[var(--os-surface)] justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--os-primary)]/15 text-[var(--os-primary)] border border-[var(--os-primary)]/30">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[var(--os-text)]">Freelance &amp; Side Gigs</h1>
            <p className="text-[10px] text-[var(--os-text-muted)]">Time Tracking, Client Invoicing &amp; P&amp;L</p>
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
          {([
            { id: 'dashboard' as Tab, icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Dashboard' },
            { id: 'time' as Tab, icon: <Clock className="w-3.5 h-3.5" />, label: 'Time' },
            { id: 'invoices' as Tab, icon: <FileText className="w-3.5 h-3.5" />, label: 'Invoices' },
            { id: 'clients' as Tab, icon: <Users className="w-3.5 h-3.5" />, label: 'Clients' },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap border",
                activeTab === tab.id
                  ? "bg-[var(--os-primary)] text-slate-950 border-[var(--os-primary)] font-bold shadow-sm"
                  : "text-[var(--os-text-muted)] hover:bg-[var(--os-hover)] hover:text-[var(--os-text)] border-transparent"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 bg-[var(--os-surface-dim)] custom-scrollbar">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'time' && <TimeTrackingTab />}
        {activeTab === 'invoices' && <InvoicesTab />}
        {activeTab === 'clients' && <ClientsTab />}
      </div>
    </div>
  );
}

// ─── Dashboard Tab ──────────────────────────────────────────────────────

function DashboardTab() {
  const { gigs, timeEntries, invoices } = useSideGigsStore();
  const [timerGigId, setTimerGigId] = useState<string>('');
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState<number>(0);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allGigs = useMemo(() => Object.values(gigs), [gigs]);
  const stats = useMemo(() => {
    const invs = Object.values(invoices);
    const paid = invs.filter((i) => i.status === 'paid');
    const outstanding = invs.filter((i) => i.status === 'sent' || i.status === 'overdue');
    const now = new Date();
    const thisMonthPaid = paid.filter((i) => {
      if (!i.paidDate) return false;
      const d = new Date(i.paidDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return {
      totalRevenue: paid.reduce((s, i) => s + i.total, 0),
      outstanding: outstanding.reduce((s, i) => s + i.total, 0),
      thisMonth: thisMonthPaid.reduce((s, i) => s + i.total, 0),
    };
  }, [invoices]);
  const activeGigs = useMemo(() => allGigs.filter(g => g.status === 'active'), [allGigs]);
  const allEntries = useMemo(() => Object.values(timeEntries), [timeEntries]);

  const hoursThisWeek = useMemo(() => {
    const { start, end } = getWeekDates();
    return allEntries
      .filter(te => te.date >= start && te.date <= end)
      .reduce((sum, te) => sum + te.duration, 0) / 3600;
  }, [allEntries]);

  const recentEntries = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().slice(0, 10);
    return allEntries
      .filter(te => te.date >= cutoff)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);
  }, [allEntries]);

  const startTimer = useCallback(() => {
    if (!timerGigId) return;
    setTimerRunning(true);
    setTimerStart(Date.now());
    setTimerElapsed(0);
    intervalRef.current = setInterval(() => {
      setTimerElapsed(Date.now() - Date.now() + (Date.now() - timerStart));
    }, 1000);
    // Fix: use ref to track start
    const start = Date.now();
    setTimerStart(start);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTimerElapsed(Date.now() - start);
    }, 1000);
  }, [timerGigId, timerStart]);

  const stopTimer = useCallback(() => {
    if (!timerRunning) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    const endTime = new Date(timerStart + timerElapsed);
    const startTime = new Date(timerStart);
    const { createTimeEntry } = useSideGigsStore.getState();
    createTimeEntry(
      timerGigId,
      getToday(),
      `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`,
      `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`,
      'Quick timer entry',
      true,
    );
    setTimerRunning(false);
    setTimerElapsed(0);
    setTimerGigId('');
  }, [timerRunning, timerStart, timerElapsed, timerGigId]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const getGigName = (gigId: string) => gigs[gigId]?.name ?? 'Unknown';

  return (
    <div className="flex flex-col gap-5">
      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Total Earnings"
          value={formatCurrency(stats.totalRevenue)}
          color="emerald"
        />
        <StatCard
          icon={<Send className="w-5 h-5" />}
          label="Outstanding"
          value={formatCurrency(stats.outstanding)}
          color="amber"
        />
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label="This Month"
          value={formatCurrency(stats.thisMonth)}
          color="emerald"
        />
        <StatCard
          icon={<Timer className="w-5 h-5" />}
          label="Hours This Week"
          value={`${hoursThisWeek.toFixed(1)}h`}
          color="blue"
        />
      </div>

      {/* Quick Timer */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <Timer className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-gray-800">Quick Timer</h3>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timerGigId}
            onChange={e => setTimerGigId(e.target.value)}
            disabled={timerRunning}
            className="flex-1 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
          >
            <option value="">Select a gig...</option>
            {activeGigs.map(g => (
              <option key={g.id} value={g.id}>{g.name} — {g.clientName}</option>
            ))}
          </select>
          {!timerRunning ? (
            <button
              onClick={startTimer}
              disabled={!timerGigId}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-md flex items-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          ) : (
            <button
              onClick={stopTimer}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-md flex items-center gap-2 transition-colors"
            >
              <Pause className="w-4 h-4" />
              Stop
            </button>
          )}
          {timerRunning && (
            <span className="text-2xl font-mono font-bold text-emerald-700">
              {formatDurationShort(Math.floor(timerElapsed / 1000))}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Gigs */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-gray-800">Active Gigs</h3>
          {activeGigs.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">
              No active gigs
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {activeGigs.map(gig => {
                const sc = GIG_STATUS_COLORS[gig.status];
                const earnings = useSideGigsStore.getState().getTotalEarnings(gig.id);
                return (
                  <div key={gig.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between hover:border-emerald-200 transition-colors">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{gig.name}</span>
                        <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", sc.bg, sc.text)}>
                          {gig.status}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{gig.clientName} · {gig.rateType === 'hourly' ? `${formatCurrency(gig.rate)}/hr` : gig.rateType === 'daily' ? `${formatCurrency(gig.rate)}/day` : formatCurrency(gig.rate)}</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">{formatCurrency(earnings)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Time Entries */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-gray-800">Recent Entries (7 days)</h3>
          {recentEntries.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">
              No entries this week
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {recentEntries.map(te => (
                <div key={te.id} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-gray-800">{getGigName(te.gigId)}</span>
                    <span className="text-gray-500">{formatDate(te.date)} · {te.startTime}–{te.endTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-gray-700">{formatDurationShort(te.duration)}</span>
                    {te.invoiced && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1 rounded">INV</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, { bg: string; icon: string }> = {
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600' },
    cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
  };
  const c = colorMap[color] ?? colorMap.emerald!;
  return (
    <div className={cn("border border-gray-200 rounded-lg p-4 flex items-center gap-3", c.bg)}>
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", c.bg, c.icon)}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] uppercase text-gray-500 tracking-wider font-bold">{label}</div>
        <div className="text-lg font-bold text-gray-900">{value}</div>
      </div>
    </div>
  );
}

// ─── Time Tracking Tab ──────────────────────────────────────────────────

function TimeTrackingTab() {
  const { gigs, timeEntries, createTimeEntry, deleteTimeEntry, updateTimeEntry } = useSideGigsStore();
  const allGigs = useMemo(() => Object.values(gigs), [gigs]);
  const allEntries = useMemo(() => Object.values(timeEntries).sort((a, b) => b.createdAt - a.createdAt), [timeEntries]);

  const [showForm, setShowForm] = useState(false);
  const [formGigId, setFormGigId] = useState('');
  const [formDate, setFormDate] = useState(getToday());
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('17:00');
  const [formNotes, setFormNotes] = useState('');
  const [formBillable, setFormBillable] = useState(true);

  // Timer state
  const [timerGigId, setTimerGigId] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStartTs, setTimerStartTs] = useState(0);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Filters
  const [filterGigId, setFilterGigId] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  const filteredEntries = useMemo(() => {
    let entries = allEntries;
    if (filterGigId) entries = entries.filter(te => te.gigId === filterGigId);
    if (filterStart) entries = entries.filter(te => te.date >= filterStart);
    if (filterEnd) entries = entries.filter(te => te.date <= filterEnd);
    return entries;
  }, [allEntries, filterGigId, filterStart, filterEnd]);

  const dailyTotal = useMemo(() => {
    const today = getToday();
    return allEntries
      .filter(te => te.date === today)
      .reduce((sum, te) => sum + te.duration, 0);
  }, [allEntries]);

  const weeklyTotal = useMemo(() => {
    const { start, end } = getWeekDates();
    return allEntries
      .filter(te => te.date >= start && te.date <= end)
      .reduce((sum, te) => sum + te.duration, 0);
  }, [allEntries]);

  const handleManualEntry = () => {
    if (!formGigId) return;
    createTimeEntry(formGigId, formDate, formStart, formEnd, formNotes, formBillable);
    setFormNotes('');
    setShowForm(false);
  };

  const startTimer = () => {
    if (!timerGigId) return;
    const start = Date.now();
    setTimerStartTs(start);
    setTimerRunning(true);
    setTimerElapsed(0);
    timerInterval.current = setInterval(() => {
      setTimerElapsed(Date.now() - start);
    }, 1000);
  };

  const stopTimer = () => {
    if (!timerRunning || !timerGigId) return;
    if (timerInterval.current) clearInterval(timerInterval.current);
    const end = new Date(timerStartTs + timerElapsed);
    const startD = new Date(timerStartTs);
    createTimeEntry(
      timerGigId,
      getToday(),
      `${String(startD.getHours()).padStart(2, '0')}:${String(startD.getMinutes()).padStart(2, '0')}`,
      `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
      'Timer entry',
      true,
    );
    setTimerRunning(false);
    setTimerElapsed(0);
    setTimerGigId('');
  };

  useEffect(() => {
    return () => { if (timerInterval.current) clearInterval(timerInterval.current); };
  }, []);

  const getGigName = (gigId: string) => gigs[gigId]?.name ?? 'Unknown';

  return (
    <div className="flex flex-col gap-4">
      {/* Timer + Summary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Timer */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-gray-800">Live Timer</span>
          </div>
          <select
            value={timerGigId}
            onChange={e => setTimerGigId(e.target.value)}
            disabled={timerRunning}
            className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50"
          >
            <option value="">Select gig...</option>
            {allGigs.filter(g => g.status === 'active').map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-gray-900">
              {formatDurationShort(Math.floor(timerElapsed / 1000))}
            </div>
          </div>
          {!timerRunning ? (
            <button
              onClick={startTimer}
              disabled={!timerGigId}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4" /> Start Timer
            </button>
          ) : (
            <button
              onClick={stopTimer}
              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-colors"
            >
              <Pause className="w-4 h-4" /> Stop & Save
            </button>
          )}
        </div>

        {/* Daily Total */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col justify-center items-center">
          <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Today</span>
          <span className="text-2xl font-bold text-gray-900 mt-1">{formatDurationShort(dailyTotal)}</span>
          <span className="text-xs text-gray-400 mt-0.5">{getToday()}</span>
        </div>

        {/* Weekly Total */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col justify-center items-center">
          <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">This Week</span>
          <span className="text-2xl font-bold text-gray-900 mt-1">{formatDurationShort(weeklyTotal)}</span>
          <span className="text-xs text-gray-400 mt-0.5">{getWeekDates().start} – {getWeekDates().end}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filterGigId} onChange={e => setFilterGigId(e.target.value)} className="bg-white border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-emerald-500">
            <option value="">All gigs</option>
            {allGigs.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="bg-white border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-emerald-500" />
          <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="bg-white border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-emerald-500" />
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Manual Entry
        </button>
      </div>

      {/* Manual Entry Form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Add Time Entry</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <select value={formGigId} onChange={e => setFormGigId(e.target.value)} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
              <option value="">Select gig...</option>
              {allGigs.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
            <input type="time" value={formStart} onChange={e => setFormStart(e.target.value)} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
            <input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
            <input type="text" placeholder="Notes" value={formNotes} onChange={e => setFormNotes(e.target.value)} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={formBillable} onChange={e => setFormBillable(e.target.checked)} className="rounded border-gray-300 text-emerald-600" />
              Billable
            </label>
            <button
              onClick={handleManualEntry}
              disabled={!formGigId}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-md transition-colors"
            >
              Add Entry
            </button>
          </div>
        </div>
      )}

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Clock className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">No time entries found</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Gig</th>
                <th className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Date</th>
                <th className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Time</th>
                <th className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Duration</th>
                <th className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Notes</th>
                <th className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Status</th>
                <th className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-gray-500 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map(te => (
                <tr key={te.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 text-xs font-bold text-gray-800">{getGigName(te.gigId)}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{formatDate(te.date)}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 font-mono">{te.startTime}–{te.endTime}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-700 font-mono">{formatDurationShort(te.duration)}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[150px] truncate">{te.notes || '—'}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {!te.billable && <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1 rounded">NON-BILL</span>}
                      {te.invoiced && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1 rounded">INVOICED</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => deleteTimeEntry(te.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Invoices Tab ───────────────────────────────────────────────────────

function InvoicesTab() {
  const { gigs, invoices, timeEntries, createInvoice, updateInvoice, deleteInvoice, generateInvoice, getUninvoicedHours } = useSideGigsStore();
  const allGigs = useMemo(() => Object.values(gigs), [gigs]);
  const allInvoices = useMemo(() => Object.values(invoices).sort((a, b) => b.createdAt - a.createdAt), [invoices]);

  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [formGigId, setFormGigId] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formQty, setFormQty] = useState('1');
  const [formRate, setFormRate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Generate invoice state
  const [genGigId, setGenGigId] = useState('');
  const [genStart, setGenStart] = useState('');
  const [genEnd, setGenEnd] = useState('');

  const [filterStatus, setFilterStatus] = useState<Invoice['status'] | 'all'>('all');

  const filteredInvoices = useMemo(() => {
    if (filterStatus === 'all') return allInvoices;
    return allInvoices.filter(inv => inv.status === filterStatus);
  }, [allInvoices, filterStatus]);

  const selectedInvoice = showDetail ? invoices[showDetail] : null;
  const selectedGig = selectedInvoice ? gigs[selectedInvoice.gigId] : null;

  const handleCreateInvoice = () => {
    if (!formGigId || !formDesc || !formRate) return;
    const gig = gigs[formGigId];
    createInvoice(formGigId, gig?.clientName ?? '', gig?.clientEmail ?? '', [
      { description: formDesc, quantity: parseFloat(formQty) || 1, rate: parseFloat(formRate) },
    ], formNotes);
    setFormDesc('');
    setFormQty('1');
    setFormRate('');
    setFormNotes('');
    setShowForm(false);
  };

  const handleGenerate = () => {
    if (!genGigId || !genStart || !genEnd) return;
    generateInvoice(genGigId, { start: genStart, end: genEnd });
    setGenGigId('');
    setGenStart('');
    setGenEnd('');
  };

  const advanceStatus = (invId: string) => {
    const inv = invoices[invId];
    if (!inv) return;
    const flow: Record<string, Invoice['status']> = {
      draft: 'sent',
      sent: 'paid',
    };
    const next = flow[inv.status];
    if (next) {
      const updates: Partial<Invoice> = { status: next };
      if (next === 'paid') updates.paidDate = getToday();
      updateInvoice(invId, updates);
    }
  };

  const uninvoicedHours = useMemo(() => {
    if (!genGigId) return 0;
    const entries = Object.values(timeEntries).filter(
      (te) => te.gigId === genGigId && te.billable && !te.invoiced,
    );
    return entries.reduce((sum, te) => sum + te.duration, 0) / 3600;
  }, [genGigId, timeEntries]);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          {(['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'] as const).map(s => {
            const isActive = filterStatus === s;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold rounded capitalize transition-colors",
                  isActive
                    ? s === 'paid' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : s === 'overdue' ? 'bg-red-100 text-red-700 border border-red-200'
                      : s === 'sent' ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-gray-100 text-gray-700 border border-gray-200'
                    : "text-gray-400 hover:text-gray-600 border border-transparent"
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Invoice
          </button>
        </div>
      </div>

      {/* Generate Invoice Form */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-gray-800">Generate Invoice from Time Entries</h3>
        </div>
        <div className="flex items-end gap-3">
          <select value={genGigId} onChange={e => setGenGigId(e.target.value)} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
            <option value="">Select gig...</option>
            {allGigs.map(g => <option key={g.id} value={g.id}>{g.name} ({getUninvoicedHours(g.id).toFixed(1)}h uninvoiced)</option>)}
          </select>
          <input type="date" value={genStart} onChange={e => setGenStart(e.target.value)} placeholder="Start" className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
          <input type="date" value={genEnd} onChange={e => setGenEnd(e.target.value)} placeholder="End" className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
          {genGigId && (
            <span className="text-xs text-gray-500 whitespace-nowrap">{uninvoicedHours.toFixed(1)}h available</span>
          )}
          <button
            onClick={handleGenerate}
            disabled={!genGigId || !genStart || !genEnd}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-md transition-colors"
          >
            Generate
          </button>
        </div>
      </div>

      {/* Manual Invoice Form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">New Invoice</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <select value={formGigId} onChange={e => { setFormGigId(e.target.value); const g = gigs[e.target.value]; if (g) setFormRate(String(g.rate)); }} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
              <option value="">Select gig...</option>
              {allGigs.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <input type="text" placeholder="Description" value={formDesc} onChange={e => setFormDesc(e.target.value)} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
            <input type="number" placeholder="Qty" value={formQty} onChange={e => setFormQty(e.target.value)} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
            <input type="number" placeholder="Rate" value={formRate} onChange={e => setFormRate(e.target.value)} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
            <input type="text" placeholder="Notes" value={formNotes} onChange={e => setFormNotes(e.target.value)} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
          </div>
          <button
            onClick={handleCreateInvoice}
            disabled={!formGigId || !formDesc || !formRate}
            className="self-end px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-md transition-colors"
          >
            Create Invoice
          </button>
        </div>
      )}

      {/* Invoice List + Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* List */}
        <div className="lg:col-span-2">
          {filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileText className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">No invoices found</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Invoice #</th>
                    <th className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Client</th>
                    <th className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Total</th>
                    <th className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Status</th>
                    <th className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-gray-500 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(inv => {
                    const sc = INVOICE_STATUS_COLORS[inv.status];
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => setShowDetail(inv.id)}
                        className={cn(
                          "border-b border-gray-100 hover:bg-emerald-50/50 transition-colors cursor-pointer",
                          showDetail === inv.id && "bg-emerald-50"
                        )}
                      >
                        <td className="px-4 py-2.5 text-xs font-bold text-gray-800 font-mono">{inv.invoiceNumber}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{inv.clientName}</td>
                        <td className="px-4 py-2.5 text-xs font-bold text-gray-900">{formatCurrency(inv.total)}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", sc.bg, sc.text)}>{inv.status}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                              <button onClick={e => { e.stopPropagation(); advanceStatus(inv.id); }} className="text-gray-400 hover:text-emerald-600 transition-colors" title="Advance status">
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={e => { e.stopPropagation(); deleteInvoice(inv.id); }} className="text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-[200px]">
          {selectedInvoice ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800">{selectedInvoice.invoiceNumber}</h3>
                <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", INVOICE_STATUS_COLORS[selectedInvoice.status].bg, INVOICE_STATUS_COLORS[selectedInvoice.status].text)}>
                  {selectedInvoice.status}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                <div>Client: <span className="font-bold text-gray-700">{selectedInvoice.clientName}</span></div>
                <div>Email: {selectedInvoice.clientEmail}</div>
                <div>Issued: {formatDate(selectedInvoice.issuedDate)}</div>
                <div>Due: {formatDate(selectedInvoice.dueDate)}</div>
                {selectedInvoice.paidDate && <div>Paid: {formatDate(selectedInvoice.paidDate)}</div>}
              </div>
              <div className="border-t border-gray-200 pt-2">
                <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Line Items</div>
                {selectedInvoice.items.map(item => (
                  <div key={item.id} className="flex justify-between text-xs py-1">
                    <span className="text-gray-700">{item.description} × {item.quantity}</span>
                    <span className="font-bold text-gray-900">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 pt-2 flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-700">{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Tax (10%)</span>
                  <span className="text-gray-700">{formatCurrency(selectedInvoice.tax)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">{formatCurrency(selectedInvoice.total)}</span>
                </div>
              </div>
              {selectedInvoice.notes && (
                <div className="text-xs text-gray-500 border-t border-gray-200 pt-2">
                  <span className="font-bold">Notes:</span> {selectedInvoice.notes}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
              <Eye className="w-8 h-8 mb-2 opacity-40" />
              Select an invoice to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Clients Tab ────────────────────────────────────────────────────────

function ClientsTab() {
  const { gigs, timeEntries, invoices, getTotalEarnings } = useSideGigsStore();
  const allGigs = useMemo(() => Object.values(gigs), [gigs]);
  const allEntries = useMemo(() => Object.values(timeEntries), [timeEntries]);
  const allInvoices = useMemo(() => Object.values(invoices), [invoices]);

  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const clients = useMemo(() => {
    const clientMap: Record<string, { name: string; email: string; totalSpent: number; gigCount: number; gigIds: string[] }> = {};
    allGigs.forEach(gig => {
      if (!clientMap[gig.clientName]) {
        clientMap[gig.clientName] = { name: gig.clientName, email: gig.clientEmail, totalSpent: 0, gigCount: 0, gigIds: [] };
      }
      clientMap[gig.clientName]!.gigCount++;
      clientMap[gig.clientName]!.gigIds.push(gig.id);
      clientMap[gig.clientName]!.totalSpent += getTotalEarnings(gig.id);
    });
    return Object.values(clientMap).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [allGigs, getTotalEarnings]);

  const selectedClientData = selectedClient ? clients.find(c => c.name === selectedClient) : null;
  const clientGigs = useMemo(() => {
    if (!selectedClientData) return [];
    return allGigs.filter(g => selectedClientData.gigIds.includes(g.id));
  }, [allGigs, selectedClientData]);
  const clientEntries = useMemo(() => {
    if (!selectedClientData) return [];
    return allEntries.filter(te => selectedClientData.gigIds.includes(te.gigId));
  }, [allEntries, selectedClientData]);
  const clientInvoices = useMemo(() => {
    if (!selectedClientData) return [];
    return allInvoices.filter(inv => selectedClientData.gigIds.includes(inv.gigId));
  }, [allInvoices, selectedClientData]);

  const totalClientRevenue = useMemo(() => {
    return clientInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);
  }, [clientInvoices]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Client List */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-gray-800">Clients</h3>
          {clients.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No clients yet
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {clients.map(client => (
                <button
                  key={client.name}
                  onClick={() => setSelectedClient(client.name)}
                  className={cn(
                    "text-left bg-gray-50 border rounded-lg p-3 transition-colors",
                    selectedClient === client.name
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-gray-900">{client.name}</span>
                      <span className="text-xs text-gray-500">{client.email}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-600">{formatCurrency(client.totalSpent)}</div>
                      <div className="text-[10px] text-gray-400">{client.gigCount} gig{client.gigCount !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Client Detail */}
        <div className="lg:col-span-2">
          {selectedClientData ? (
            <div className="flex flex-col gap-4">
              {/* Client Header */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selectedClientData.name}</h3>
                    <span className="text-xs text-gray-500">{selectedClientData.email}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-600">{formatCurrency(totalClientRevenue)}</div>
                    <div className="text-xs text-gray-400">Total Revenue</div>
                  </div>
                </div>
              </div>

              {/* Client Gigs */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Gigs</h4>
                <div className="flex flex-col gap-1.5">
                  {clientGigs.map(gig => {
                    const sc = GIG_STATUS_COLORS[gig.status];
                    return (
                      <div key={gig.id} className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-800">{gig.name}</span>
                          <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", sc.bg, sc.text)}>{gig.status}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {gig.rateType === 'hourly' ? `${formatCurrency(gig.rate)}/hr` : gig.rateType === 'daily' ? `${formatCurrency(gig.rate)}/day` : formatCurrency(gig.rate)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Client Invoices */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Invoices</h4>
                {clientInvoices.length === 0 ? (
                  <p className="text-xs text-gray-400">No invoices</p>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-3 py-2 text-[10px] uppercase text-gray-500 font-bold">Invoice #</th>
                          <th className="px-3 py-2 text-[10px] uppercase text-gray-500 font-bold">Total</th>
                          <th className="px-3 py-2 text-[10px] uppercase text-gray-500 font-bold">Status</th>
                          <th className="px-3 py-2 text-[10px] uppercase text-gray-500 font-bold">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientInvoices.map(inv => {
                          const sc = INVOICE_STATUS_COLORS[inv.status];
                          return (
                            <tr key={inv.id} className="border-b border-gray-100">
                              <td className="px-3 py-2 font-mono font-bold text-gray-800">{inv.invoiceNumber}</td>
                              <td className="px-3 py-2 font-bold text-gray-900">{formatCurrency(inv.total)}</td>
                              <td className="px-3 py-2">
                                <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded", sc.bg, sc.text)}>{inv.status}</span>
                              </td>
                              <td className="px-3 py-2 text-gray-500">{formatDate(inv.issuedDate)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Client Time Entries Summary */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Time Entries ({clientEntries.length})
                </h4>
                <div className="text-xs text-gray-500">
                  Total hours: <span className="font-bold text-gray-800">{(clientEntries.reduce((s, te) => s + te.duration, 0) / 3600).toFixed(1)}h</span>
                  <span className="mx-2">·</span>
                  Billable: <span className="font-bold text-gray-800">{clientEntries.filter(te => te.billable).length}</span>
                  <span className="mx-2">·</span>
                  Invoiced: <span className="font-bold text-gray-800">{clientEntries.filter(te => te.invoiced).length}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Users className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">Select a client to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
