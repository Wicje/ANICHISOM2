'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, Users, TrendingUp, Clock, Zap, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface MetricData {
  avg: number;
  p75: number;
  p95: number;
  count: number;
  good: number;
  needsImprovement: number;
  poor: number;
}

interface VitalsResponse {
  ok: boolean;
  metrics: Record<string, MetricData>;
  raw: Array<{
    name: string;
    value: number;
    rating: string;
    url: string;
    recorded_at: string;
  }>;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers24h: number;
  totalApps: number;
  pendingReviews: number;
}

const METRIC_INFO: Record<string, { label: string; unit: string; good: number; poor: number }> = {
  LCP: { label: 'Largest Contentful Paint', unit: 'ms', good: 2500, poor: 4000 },
  CLS: { label: 'Cumulative Layout Shift', unit: '', good: 0.1, poor: 0.25 },
  INP: { label: 'Interaction to Next Paint', unit: 'ms', good: 200, poor: 500 },
  TTFB: { label: 'Time to First Byte', unit: 'ms', good: 800, poor: 1800 },
  FCP: { label: 'First Contentful Paint', unit: 'ms', good: 1800, poor: 3000 },
};

function RatingBadge({ rating }: { rating: string }) {
  if (rating === 'good') return <span className="inline-flex items-center gap-1 text-xs text-green-400"><CheckCircle className="w-3 h-3" /> Good</span>;
  if (rating === 'needs-improvement') return <span className="inline-flex items-center gap-1 text-xs text-yellow-400"><AlertTriangle className="w-3 h-3" /> Needs Work</span>;
  return <span className="inline-flex items-center gap-1 text-xs text-red-400"><XCircle className="w-3 h-3" /> Poor</span>;
}

function MetricCard({ name, data }: { name: string; data: MetricData }) {
  const info = METRIC_INFO[name];
  const passRate = data.count > 0 ? ((data.good / data.count) * 100).toFixed(0) : '0';

  return (
    <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--os-text)]">{info?.label || name}</h3>
        <span className="text-xs text-[var(--os-text-muted)]">{data.count} samples</span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-lg font-bold text-[var(--os-text)]">
            {data.avg.toFixed(name === 'CLS' ? 3 : 0)}{info?.unit}
          </div>
          <div className="text-xs text-[var(--os-text-muted)]">Avg</div>
        </div>
        <div>
          <div className="text-lg font-bold text-[var(--os-text)]">
            {data.p75.toFixed(name === 'CLS' ? 3 : 0)}{info?.unit}
          </div>
          <div className="text-xs text-[var(--os-text-muted)]">P75</div>
        </div>
        <div>
          <div className="text-lg font-bold text-[var(--os-text)]">
            {data.p95.toFixed(name === 'CLS' ? 3 : 0)}{info?.unit}
          </div>
          <div className="text-xs text-[var(--os-text-muted)]">P95</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex-1 h-2 bg-[var(--os-hover)] rounded-full overflow-hidden mr-3">
          <div
            className="h-full bg-green-500 rounded-full"
            style={{ width: `${passRate}%` }}
          />
        </div>
        <span className="text-xs font-medium text-[var(--os-text)]">{passRate}%</span>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [vitals, setVitals] = useState<VitalsResponse | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [vitalsRes, statsRes] = await Promise.all([
        fetch(`/api/vitals?hours=${hours}&limit=500`),
        fetch('/api/admin/stats'),
      ]);

      if (vitalsRes.ok) {
        const data = await vitalsRes.json();
        setVitals(data);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch {
      // Dashboard is best-effort
    }
    setLoading(false);
  }, [hours]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="h-full overflow-y-auto p-6 bg-[var(--os-bg)]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--os-text)]">Analytics Dashboard</h1>
            <p className="text-sm text-[var(--os-text-muted)]">Real-time performance and usage metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={hours}
              onChange={e => setHours(Number(e.target.value))}
              className="px-3 py-1.5 text-sm bg-[var(--os-surface)] border border-[var(--os-border)] rounded-lg text-[var(--os-text)]"
            >
              <option value={1}>Last 1 hour</option>
              <option value={6}>Last 6 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={168}>Last 7 days</option>
            </select>
            <button
              onClick={fetchData}
              className="px-3 py-1.5 text-sm bg-[var(--os-primary)] text-white rounded-lg hover:opacity-90"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading && !vitals ? (
          <div className="text-center py-20 text-[var(--os-text-muted)]">Loading analytics...</div>
        ) : (
          <>
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-[var(--os-primary)]" />
                    <span className="text-xs text-[var(--os-text-muted)]">Total Users</span>
                  </div>
                  <div className="text-2xl font-bold text-[var(--os-text)]">{stats.totalUsers}</div>
                </div>
                <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-[var(--os-text-muted)]">Active (24h)</span>
                  </div>
                  <div className="text-2xl font-bold text-[var(--os-text)]">{stats.activeUsers24h}</div>
                </div>
                <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-[var(--os-text-muted)]">Published Apps</span>
                  </div>
                  <div className="text-2xl font-bold text-[var(--os-text)]">{stats.totalApps}</div>
                </div>
                <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-orange-400" />
                    <span className="text-xs text-[var(--os-text-muted)]">Pending Reviews</span>
                  </div>
                  <div className="text-2xl font-bold text-[var(--os-text)]">{stats.pendingReviews}</div>
                </div>
              </div>
            )}

            {/* Web Vitals */}
            <h2 className="text-lg font-semibold text-[var(--os-text)] mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Web Vitals
            </h2>
            {vitals?.metrics && Object.keys(vitals.metrics).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {Object.entries(vitals.metrics).map(([name, data]) => (
                  <MetricCard key={name} name={name} data={data} />
                ))}
              </div>
            ) : (
              <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-8 text-center mb-8">
                <Activity className="w-8 h-8 text-[var(--os-text-muted)] mx-auto mb-3" />
                <p className="text-[var(--os-text-muted)]">No vitals data collected yet</p>
                <p className="text-xs text-[var(--os-text-muted)] mt-1">Metrics will appear as users visit the app</p>
              </div>
            )}

            {/* Recent Events */}
            {vitals?.raw && vitals.raw.length > 0 && (
              <>
                <h2 className="text-lg font-semibold text-[var(--os-text)] mb-4">Recent Events</h2>
                <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--os-border)]">
                        <th className="text-left px-4 py-2 text-[var(--os-text-muted)] font-medium">Metric</th>
                        <th className="text-left px-4 py-2 text-[var(--os-text-muted)] font-medium">Value</th>
                        <th className="text-left px-4 py-2 text-[var(--os-text-muted)] font-medium">Rating</th>
                        <th className="text-left px-4 py-2 text-[var(--os-text-muted)] font-medium">URL</th>
                        <th className="text-left px-4 py-2 text-[var(--os-text-muted)] font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vitals.raw.slice(0, 20).map((m, i) => (
                        <tr key={i} className="border-b border-[var(--os-border)] last:border-0">
                          <td className="px-4 py-2 text-[var(--os-text)] font-mono">{m.name}</td>
                          <td className="px-4 py-2 text-[var(--os-text)]">{m.value.toFixed(1)}</td>
                          <td className="px-4 py-2"><RatingBadge rating={m.rating} /></td>
                          <td className="px-4 py-2 text-[var(--os-text-muted)] truncate max-w-[200px]">{m.url || '—'}</td>
                          <td className="px-4 py-2 text-[var(--os-text-muted)]">{new Date(m.recorded_at).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
