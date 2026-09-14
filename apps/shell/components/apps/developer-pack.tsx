'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import {
  Code,
  GitPullRequest,
  Activity,
  Server,
  Rocket,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Play,
  Loader2,
  Globe,
  Shield,
  Timer,
  Filter,
  GitBranch,
  Terminal,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useDevopsStore,
  Deployment,
  CodeReview,
  Pipeline,
  ApiEndpoint,
} from '@/lib/stores/devops.store';

type Tab = 'deployments' | 'reviews' | 'monitor' | 'ci';

const ENV_COLORS: Record<Deployment['environment'], { bg: string; text: string; label: string }> = {
  production: { bg: 'bg-green-500/15', text: 'text-green-400', label: 'Production' },
  staging: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', label: 'Staging' },
  development: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Development' },
};

const STATUS_COLORS: Record<Deployment['status'], { dot: string; text: string }> = {
  healthy: { dot: 'bg-green-500', text: 'text-green-400' },
  degraded: { dot: 'bg-yellow-500', text: 'text-yellow-400' },
  down: { dot: 'bg-red-500', text: 'text-red-400' },
  deploying: { dot: 'bg-blue-500 animate-pulse', text: 'text-blue-400' },
  'rolled-back': { dot: 'bg-emerald-500', text: 'text-emerald-400' },
};

const REVIEW_STATUS_COLORS: Record<CodeReview['status'], { bg: string; text: string }> = {
  open: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  approved: { bg: 'bg-green-500/15', text: 'text-green-400' },
  'changes-requested': { bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  merged: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  closed: { bg: 'bg-gray-500/15', text: 'text-gray-400' },
};

const METHOD_COLORS: Record<ApiEndpoint['method'], { bg: string; text: string }> = {
  GET: { bg: 'bg-green-500/15', text: 'text-green-400' },
  POST: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  PUT: { bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  DELETE: { bg: 'bg-red-500/15', text: 'text-red-400' },
  PATCH: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
};

const PIPELINE_STATUS_COLORS: Record<Pipeline['status'], { bg: string; text: string; icon: React.ReactNode }> = {
  running: { bg: 'bg-blue-500/15', text: 'text-blue-400', icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
  passed: { bg: 'bg-green-500/15', text: 'text-green-400', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  failed: { bg: 'bg-red-500/15', text: 'text-red-400', icon: <XCircle className="w-3.5 h-3.5" /> },
  queued: { bg: 'bg-gray-500/15', text: 'text-gray-400', icon: <Clock className="w-3.5 h-3.5" /> },
  cancelled: { bg: 'bg-gray-500/15', text: 'text-gray-500', icon: <XCircle className="w-3.5 h-3.5" /> },
};

const STAGE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-700',
  running: 'bg-blue-500 animate-pulse',
  passed: 'bg-green-500',
  failed: 'bg-red-500',
  skipped: 'bg-gray-600',
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Main Component ──────────────────────────────────────────────────────

export function DeveloperPack({ window: osWindow }: { window: OSWindow }) {
  const [activeTab, setActiveTab] = useState<Tab>('deployments');
  useEffect(() => {
    (useDevopsStore as any).hydrate?.();
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-[var(--os-bg)] text-[var(--os-text)] font-sans overflow-hidden select-none">
      {/* Header */}
      <div className="h-14 border-b border-[var(--os-border)] flex items-center px-4 shrink-0 bg-[var(--os-surface)] justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--os-primary)]/15 text-[var(--os-primary)] border border-[var(--os-primary)]/30">
            <Code className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[var(--os-text)]">DevOps &amp; Cloud Operations</h1>
            <p className="text-[10px] text-[var(--os-text-muted)]">Deployments, Code Review, Health Telemetry &amp; CI/CD</p>
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
          {([
            { id: 'deployments' as Tab, icon: <Server className="w-3.5 h-3.5" /> },
            { id: 'reviews' as Tab, icon: <GitPullRequest className="w-3.5 h-3.5" /> },
            { id: 'monitor' as Tab, icon: <Activity className="w-3.5 h-3.5" /> },
            { id: 'ci' as Tab, icon: <Rocket className="w-3.5 h-3.5" /> },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-xl capitalize transition-all flex items-center gap-1.5 whitespace-nowrap border",
                activeTab === tab.id
                  ? "bg-[var(--os-primary)] text-slate-950 border-[var(--os-primary)] font-bold shadow-sm"
                  : "text-[var(--os-text-muted)] hover:bg-[var(--os-hover)] hover:text-[var(--os-text)] border-transparent"
              )}
            >
              {tab.icon}
              {tab.id}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 bg-[var(--os-surface-dim)] custom-scrollbar">
        {activeTab === 'deployments' && <DeploymentsTab />}
        {activeTab === 'reviews' && <ReviewsTab />}
        {activeTab === 'monitor' && <ApiMonitorTab />}
        {activeTab === 'ci' && <CICDTab />}
      </div>
    </div>
  );
}

// ─── Deployments Tab ─────────────────────────────────────────────────────

function DeploymentsTab() {
  const { deployments, createDeployment } = useDevopsStore();
  const [showForm, setShowForm] = useState(false);
  const [formService, setFormService] = useState('');
  const [formEnv, setFormEnv] = useState<Deployment['environment']>('production');
  const [formVersion, setFormVersion] = useState('');

  const allDeployments = useMemo(() => Object.values(deployments), [deployments]);
  const total = allDeployments.length;
  const healthy = allDeployments.filter(d => d.status === 'healthy').length;
  const degraded = allDeployments.filter(d => d.status === 'degraded').length;
  const down = allDeployments.filter(d => d.status === 'down').length;

  const handleDeploy = () => {
    if (!formService.trim() || !formVersion.trim()) return;
    createDeployment(formService.trim(), formEnv, formVersion.trim());
    setFormService('');
    setFormVersion('');
    setShowForm(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Health Summary */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center gap-6">
        <div className="text-sm text-gray-400">Services</div>
        <div className="flex items-center gap-1.5">
          <Server className="w-4 h-4 text-gray-500" />
          <span className="text-white font-bold">{total}</span>
        </div>
        <div className="w-px h-5 bg-gray-800" />
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm text-green-400">{healthy} healthy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-sm text-yellow-400">{degraded} degraded</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-sm text-red-400">{down} down</span>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors"
          >
            <Rocket className="w-3.5 h-3.5" />
            Deploy
          </button>
        </div>
      </div>

      {/* Deploy Form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">New Deployment</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Service name"
              value={formService}
              onChange={e => setFormService(e.target.value)}
              className="bg-[#161b22] border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
            <select
              value={formEnv}
              onChange={e => setFormEnv(e.target.value as Deployment['environment'])}
              className="bg-[#161b22] border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </select>
            <input
              type="text"
              placeholder="Version (e.g. v1.2.0)"
              value={formVersion}
              onChange={e => setFormVersion(e.target.value)}
              className="bg-[#161b22] border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleDeploy}
            disabled={!formService.trim() || !formVersion.trim()}
            className="self-end px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-md transition-colors"
          >
            Start Deploy
          </button>
        </div>
      )}

      {/* Deployment Grid */}
      {allDeployments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-600">
          <Server className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">No deployments yet. Click Deploy to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {allDeployments.map(dep => {
            const env = ENV_COLORS[dep.environment];
            const status = STATUS_COLORS[dep.status];
            return (
              <div
                key={dep.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col gap-3 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-white font-bold text-sm">{dep.service}</span>
                    <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm inline-block w-fit", env.bg, env.text)}>
                      {env.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("w-2 h-2 rounded-full", status.dot)} />
                    <span className={cn("text-xs font-bold capitalize", status.text)}>{dep.status}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    {dep.version}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(dep.deployedAt)}
                  </span>
                </div>

                {dep.metrics && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-800">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-600 uppercase">Latency</span>
                      <span className="text-xs text-white font-bold">{dep.metrics.latency}ms</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-600 uppercase">Errors</span>
                      <span className="text-xs font-bold text-red-400">{dep.metrics.errorRate}%</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-600 uppercase">Uptime</span>
                      <span className="text-xs font-bold text-green-400">{dep.metrics.uptime}%</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Reviews Tab ─────────────────────────────────────────────────────────

function ReviewsTab() {
  const { reviews, createReview } = useDevopsStore();
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<CodeReview['status'] | 'all'>('all');
  const [formRepo, setFormRepo] = useState('');
  const [formPr, setFormPr] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formAuthor, setFormAuthor] = useState('');

  const allReviews = useMemo(() => Object.values(reviews), [reviews]);
  const filtered = useMemo(() => {
    if (filterStatus === 'all') return allReviews;
    return allReviews.filter(r => r.status === filterStatus);
  }, [allReviews, filterStatus]);

  const handleCreate = () => {
    if (!formRepo.trim() || !formPr.trim() || !formTitle.trim() || !formAuthor.trim()) return;
    createReview(formRepo.trim(), parseInt(formPr), formTitle.trim(), formAuthor.trim());
    setFormRepo('');
    setFormPr('');
    setFormTitle('');
    setFormAuthor('');
    setShowForm(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-500">Filter:</span>
          {(['all', 'open', 'approved', 'changes-requested', 'merged', 'closed'] as const).map(s => {
            const isActive = filterStatus === s;
            let label: string = s;
            if (s === 'all') label = 'All';
            if (s === 'changes-requested') label = 'Changes Requested';
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-2 py-1 text-[10px] font-bold rounded capitalize transition-colors",
                  isActive
                    ? "bg-gray-800 text-white border border-gray-700"
                    : "text-gray-500 hover:text-gray-300 border border-transparent"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Review
        </button>
      </div>

      {/* New Review Form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Create Code Review</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Repository"
              value={formRepo}
              onChange={e => setFormRepo(e.target.value)}
              className="bg-[#161b22] border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
            <input
              type="number"
              placeholder="PR #"
              value={formPr}
              onChange={e => setFormPr(e.target.value)}
              className="bg-[#161b22] border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="PR title"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              className="bg-[#161b22] border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Author"
              value={formAuthor}
              onChange={e => setFormAuthor(e.target.value)}
              className="bg-[#161b22] border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={!formRepo.trim() || !formPr.trim() || !formTitle.trim() || !formAuthor.trim()}
            className="self-end px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-md transition-colors"
          >
            Create Review
          </button>
        </div>
      )}

      {/* Reviews Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-600">
          <GitPullRequest className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">No reviews{filterStatus !== 'all' ? ` with status "${filterStatus}"` : ''}.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-[#010409]">
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500 font-bold">PR</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Title</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Author</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Status</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500 font-bold text-right">Files</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500 font-bold text-right">+/−</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(rev => {
                const sc = REVIEW_STATUS_COLORS[rev.status];
                return (
                  <tr key={rev.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 text-blue-400 font-bold">#{rev.prNumber}</td>
                    <td className="px-4 py-3 text-white text-xs">{rev.title}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{rev.author}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm", sc.bg, sc.text)}>
                        {rev.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs text-right">{rev.filesChanged}</td>
                    <td className="px-4 py-3 text-xs text-right font-mono">
                      <span className="text-green-400">+{rev.additions}</span>
                      <span className="text-gray-600 mx-1">/</span>
                      <span className="text-red-400">-{rev.deletions}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── API Monitor Tab ─────────────────────────────────────────────────────

function ApiMonitorTab() {
  const { endpoints, createEndpoint, getAverageLatency, getOverallUptime } = useDevopsStore();
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formMethod, setFormMethod] = useState<ApiEndpoint['method']>('GET');
  const [formUrl, setFormUrl] = useState('');

  const allEndpoints = useMemo(() => Object.values(endpoints), [endpoints]);
  const avgLatency = useMemo(() => getAverageLatency(), [getAverageLatency, allEndpoints]);
  const uptime = useMemo(() => getOverallUptime(), [getOverallUptime, allEndpoints]);

  const handleAdd = () => {
    if (!formName.trim() || !formUrl.trim()) return;
    createEndpoint(formName.trim(), formMethod, formUrl.trim());
    setFormName('');
    setFormUrl('');
    setShowForm(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Timer className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase text-gray-600 tracking-wider font-bold">Avg Latency</div>
            <div className="text-xl font-bold text-white">{avgLatency.toFixed(0)}<span className="text-xs text-gray-500 ml-1">ms</span></div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase text-gray-600 tracking-wider font-bold">Overall Uptime</div>
            <div className="text-xl font-bold text-white">{uptime.toFixed(1)}<span className="text-xs text-gray-500 ml-1">%</span></div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Endpoint
        </button>
      </div>

      {/* Add Endpoint Form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Add API Endpoint</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Endpoint name"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              className="bg-[#161b22] border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
            <select
              value={formMethod}
              onChange={e => setFormMethod(e.target.value as ApiEndpoint['method'])}
              className="bg-[#161b22] border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="/api/v1/resource"
              value={formUrl}
              onChange={e => setFormUrl(e.target.value)}
              className="bg-[#161b22] border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!formName.trim() || !formUrl.trim()}
            className="self-end px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-md transition-colors"
          >
            Add Endpoint
          </button>
        </div>
      )}

      {/* Endpoints List */}
      {allEndpoints.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-600">
          <Activity className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">No API endpoints monitored yet.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-[#010409]">
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Method</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500 font-bold">URL</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Status</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500 font-bold text-right">Latency</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500 font-bold text-right">p50</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500 font-bold text-right">p95</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500 font-bold text-right">p99</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500 font-bold text-right">Error Rate</th>
              </tr>
            </thead>
            <tbody>
              {allEndpoints.map(ep => {
                const mc = METHOD_COLORS[ep.method];
                const statusColor = ep.status === 'healthy' ? 'text-green-400' : ep.status === 'degraded' ? 'text-yellow-400' : 'text-red-400';
                return (
                  <tr key={ep.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-sm", mc.bg, mc.text)}>
                        {ep.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white text-xs font-mono">{ep.url}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-bold capitalize", statusColor)}>{ep.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300 text-right font-mono">{ep.latency}ms</td>
                    <td className="px-4 py-3 text-xs text-gray-400 text-right font-mono">{ep.p50}ms</td>
                    <td className="px-4 py-3 text-xs text-gray-400 text-right font-mono">{ep.p95}ms</td>
                    <td className="px-4 py-3 text-xs text-gray-400 text-right font-mono">{ep.p99}ms</td>
                    <td className="px-4 py-3 text-xs text-right font-mono">
                      <span className={ep.errorRate > 5 ? 'text-red-400' : ep.errorRate > 1 ? 'text-yellow-400' : 'text-green-400'}>
                        {ep.errorRate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── CI/CD Tab ───────────────────────────────────────────────────────────

function CICDTab() {
  const { pipelines, createPipeline } = useDevopsStore();
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formRepo, setFormRepo] = useState('');
  const [formBranch, setFormBranch] = useState('main');

  const allPipelines = useMemo(() => Object.values(pipelines), [pipelines]);

  const handleTrigger = () => {
    if (!formName.trim() || !formRepo.trim()) return;
    createPipeline(formName.trim(), formRepo.trim(), formBranch.trim(), 'manual');
    setFormName('');
    setFormRepo('');
    setFormBranch('main');
    setShowForm(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          Trigger Pipeline
        </button>
      </div>

      {/* Trigger Form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Trigger New Pipeline</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Pipeline name"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              className="bg-[#161b22] border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Repository"
              value={formRepo}
              onChange={e => setFormRepo(e.target.value)}
              className="bg-[#161b22] border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Branch"
              value={formBranch}
              onChange={e => setFormBranch(e.target.value)}
              className="bg-[#161b22] border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleTrigger}
            disabled={!formName.trim() || !formRepo.trim()}
            className="self-end px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-md transition-colors"
          >
            Trigger
          </button>
        </div>
      )}

      {/* Pipeline List */}
      {allPipelines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-600">
          <Rocket className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">No pipelines yet. Trigger one to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {allPipelines.map(pipe => {
            const pc = PIPELINE_STATUS_COLORS[pipe.status];
            return (
              <div
                key={pipe.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col gap-3 hover:border-gray-700 transition-colors"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", pc.bg)}>
                      <span className={pc.text}>{pc.icon}</span>
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">{pipe.name}</div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5" />
                          {pipe.repo}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-2.5 h-2.5" />
                          {pipe.branch}
                        </span>
                        <span className="flex items-center gap-1">
                          <Terminal className="w-2.5 h-2.5" />
                          {pipe.trigger}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-600">{timeAgo(pipe.lastRun)}</span>
                    <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm capitalize", pc.bg, pc.text)}>
                      {pipe.status}
                    </span>
                  </div>
                </div>

                {/* Stages Progress Bar */}
                {pipe.stages.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-800">
                    <div className="flex gap-1">
                      {pipe.stages.map((stage, i) => (
                        <div key={i} className="flex-1 flex flex-col gap-1">
                          <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                STAGE_STATUS_COLORS[stage.status],
                                stage.status === 'passed' ? 'w-full' :
                                stage.status === 'failed' ? 'w-full' :
                                stage.status === 'running' ? 'w-2/3' :
                                stage.status === 'pending' ? 'w-0' :
                                'w-0'
                              )}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-gray-600">
                            <span>{stage.name}</span>
                            {stage.duration !== undefined && (
                              <span>{stage.duration}s</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
