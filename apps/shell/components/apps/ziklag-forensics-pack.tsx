'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import {
  Shield, FolderOpen, FileText, Link2, ClipboardList,
  Plus, Search, ChevronRight, CheckCircle, AlertTriangle,
  Clock, MapPin, User, Hash, Trash2, X, ArrowRight,
  ShieldCheck, ShieldAlert, Package, Eye, Edit3, Archive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useForensicsStore,
  Case, Evidence, ChainEntry, Report
} from '@/lib/stores/forensics.store';

// ─── Constants ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<Case['status'], string> = {
  open: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  active: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  closed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  archived: 'bg-gray-700/20 text-gray-500 border-gray-600/30',
};

const PRIORITY_COLORS: Record<Case['priority'], string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const EVIDENCE_TYPE_COLORS: Record<Evidence['type'], string> = {
  physical: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  digital: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  testimonial: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  documentary: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  biological: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const EVIDENCE_STATUS_COLORS: Record<Evidence['status'], string> = {
  collected: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'in-transit': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'in-lab': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  stored: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  disposed: 'bg-red-500/20 text-red-400 border-red-500/30',
  returned: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const CHAIN_ACTION_COLORS: Record<ChainEntry['action'], string> = {
  collected: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  transferred: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  received: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  analyzed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  stored: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  disposed: 'bg-red-500/20 text-red-400 border-red-500/30',
  returned: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  accessed: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const REPORT_STATUS_COLORS: Record<Report['status'], string> = {
  draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  review: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  final: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

// ─── Main Component ─────────────────────────────────────────────────────

export function ZiklagForensicsPack({ window: osWindow }: { window: OSWindow }) {
  const { workspaceMode } = useOS();
  const [activeTab, setActiveTab] = useState<'cases' | 'evidence' | 'chain' | 'reports'>('cases');

  const store = useForensicsStore();

  useEffect(() => {
    (useForensicsStore as any).hydrate?.();
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-gray-950 text-white font-sans overflow-hidden">
      <div className="h-14 border-b border-white/10 flex items-center px-4 shrink-0 bg-[#0a0a0a]">
        <Shield className="w-5 h-5 text-emerald-400 mr-3" />
        <h1 className="font-bold tracking-wider hidden sm:block">Ziklag Forensics Pack</h1>
        <div className="ml-8 flex gap-2 overflow-x-auto no-scrollbar">
          {(['cases', 'evidence', 'chain', 'reports'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md uppercase tracking-wider transition-colors flex items-center gap-2",
                activeTab === tab
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                  : "text-white/50 hover:bg-white/5 hover:text-white/80 border border-transparent"
              )}
            >
              {tab === 'cases' && <FolderOpen className="w-3.5 h-3.5" />}
              {tab === 'evidence' && <Package className="w-3.5 h-3.5" />}
              {tab === 'chain' && <Link2 className="w-3.5 h-3.5" />}
              {tab === 'reports' && <FileText className="w-3.5 h-3.5" />}
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'cases' && <CasesTab />}
        {activeTab === 'evidence' && <EvidenceTab />}
        {activeTab === 'chain' && <ChainTab />}
        {activeTab === 'reports' && <ReportsTab />}
      </div>
    </div>
  );
}

// ─── Cases Tab ──────────────────────────────────────────────────────────

function CasesTab() {
  const { cases, activeCaseId, createCase, deleteCase, setActiveCase, getCaseStats } = useForensicsStore();
  const [showForm, setShowForm] = useState(false);
  const [viewCase, setViewCase] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ caseNumber: '', title: '', description: '', priority: 'medium' as Case['priority'], lead: '', agency: '' });

  const allCases = useMemo(() => Object.values(cases).sort((a, b) => b.createdAt - a.createdAt), [cases]);
  const filtered = useMemo(() =>
    allCases.filter(c =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.lead.toLowerCase().includes(search.toLowerCase()) ||
      c.agency.toLowerCase().includes(search.toLowerCase())
    ), [allCases, search]
  );

  const handleCreate = () => {
    if (!form.caseNumber || !form.title) return;
    createCase(form.caseNumber, form.title, form.description, form.priority, form.lead, form.agency);
    setForm({ caseNumber: '', title: '', description: '', priority: 'medium', lead: '', agency: '' });
    setShowForm(false);
  };

  const detail = viewCase ? cases[viewCase] : activeCaseId ? cases[activeCaseId] : null;
  const detailId = viewCase || activeCaseId;

  return (
    <div className="flex h-full">
      {/* Case List */}
      <div className={cn("flex flex-col border-r border-white/10 shrink-0 overflow-hidden transition-all", detail ? "w-80" : "w-full")}>
        <div className="p-3 border-b border-white/10 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search cases..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 placeholder:text-white/30"
              />
            </div>
            <button
              onClick={() => { setShowForm(!showForm); }}
              className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {showForm && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col gap-2">
              <input value={form.caseNumber} onChange={e => setForm(f => ({ ...f, caseNumber: e.target.value }))} placeholder="Case Number" className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 placeholder:text-white/30" />
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 placeholder:text-white/30" />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 placeholder:text-white/30 resize-none h-16" />
              <div className="flex gap-2">
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Case['priority'] }))} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs flex-1 focus:outline-none">
                  {['low', 'medium', 'high', 'critical'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <input value={form.lead} onChange={e => setForm(f => ({ ...f, lead: e.target.value }))} placeholder="Lead Investigator" className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 placeholder:text-white/30" />
              <input value={form.agency} onChange={e => setForm(f => ({ ...f, agency: e.target.value }))} placeholder="Agency" className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 placeholder:text-white/30" />
              <button onClick={handleCreate} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded text-xs font-bold border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors">Create Case</button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {filtered.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-white/20 text-xs italic">No cases found</div>
          )}
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => { setViewCase(c.id); setActiveCase(c.id); }}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-colors",
                detailId === c.id
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-white/40">{c.caseNumber}</span>
                <div className="flex gap-1">
                  <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border", STATUS_COLORS[c.status])}>{c.status}</span>
                  <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border", PRIORITY_COLORS[c.priority])}>{c.priority}</span>
                </div>
              </div>
              <div className="text-xs font-bold truncate">{c.title}</div>
              <div className="text-[10px] text-white/40 mt-1 flex items-center gap-2">
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{c.lead}</span>
                <span>{c.agency}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Case Detail */}
      {detail && (
        <div className="flex-1 overflow-y-auto p-6">
          <CaseDetail caseData={detail} onBack={() => { setViewCase(null); }} onDelete={() => { deleteCase(detail.id); setViewCase(null); }} />
        </div>
      )}
    </div>
  );
}

function CaseDetail({ caseData, onBack, onDelete }: { caseData: Case; onBack: () => void; onDelete: () => void }) {
  const { evidence, reports, getCaseStats, getEvidenceByCase, getReportsByCase, getChainOfCustody } = useForensicsStore();
  const stats = getCaseStats(caseData.id);
  const caseEvidence = useMemo(() => getEvidenceByCase(caseData.id).sort((a, b) => b.createdAt - a.createdAt), [caseData.id, evidence]);
  const caseReports = useMemo(() => getReportsByCase(caseData.id).sort((a, b) => b.createdAt - a.createdAt), [caseData.id, reports]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><ChevronRight className="w-4 h-4 rotate-180" /></button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-white/40">{caseData.caseNumber}</span>
            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border", STATUS_COLORS[caseData.status])}>{caseData.status}</span>
            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border", PRIORITY_COLORS[caseData.priority])}>{caseData.priority}</span>
          </div>
          <h2 className="text-lg font-bold">{caseData.title}</h2>
          <p className="text-xs text-white/50 mt-1">{caseData.description}</p>
        </div>
        <button onClick={onDelete} className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-gray-900 border border-white/10 rounded-xl p-3">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Lead</div>
          <div className="text-sm font-bold mt-1">{caseData.lead}</div>
        </div>
        <div className="bg-gray-900 border border-white/10 rounded-xl p-3">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Agency</div>
          <div className="text-sm font-bold mt-1">{caseData.agency}</div>
        </div>
        <div className="bg-gray-900 border border-white/10 rounded-xl p-3">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Date Opened</div>
          <div className="text-sm font-bold mt-1">{new Date(caseData.dateOpened).toLocaleDateString()}</div>
        </div>
        <div className="bg-gray-900 border border-white/10 rounded-xl p-3">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Total Evidence</div>
          <div className="text-sm font-bold mt-1 text-emerald-400">{stats.totalEvidence}</div>
        </div>
      </div>

      <div className="bg-gray-900 border border-white/10 rounded-xl p-4">
        <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">Evidence Summary</h3>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(stats.byType).filter(([_, v]) => v > 0).map(([type, count]) => (
            <div key={type} className="bg-white/5 rounded-lg p-2 border border-white/5">
              <div className="text-[10px] text-white/40 capitalize">{type}</div>
              <div className="text-sm font-bold">{count}</div>
            </div>
          ))}
        </div>
        {stats.totalEvidence === 0 && <p className="text-xs text-white/30 italic">No evidence logged yet.</p>}
      </div>

      {caseEvidence.length > 0 && (
        <div className="bg-gray-900 border border-white/10 rounded-xl p-4">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">Recent Evidence</h3>
          <div className="flex flex-col gap-1">
            {caseEvidence.slice(0, 5).map(ev => (
              <div key={ev.id} className="flex items-center gap-3 text-xs px-2 py-1.5 bg-white/5 rounded-lg border border-white/5">
                <span className="font-mono text-white/40">{ev.evidenceNumber}</span>
                <span className="font-bold flex-1 truncate">{ev.name}</span>
                <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border", EVIDENCE_TYPE_COLORS[ev.type])}>{ev.type}</span>
                <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border", EVIDENCE_STATUS_COLORS[ev.status])}>{ev.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {caseReports.length > 0 && (
        <div className="bg-gray-900 border border-white/10 rounded-xl p-4">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">Reports</h3>
          <div className="flex flex-col gap-1">
            {caseReports.slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center gap-3 text-xs px-2 py-1.5 bg-white/5 rounded-lg border border-white/5">
                <FileText className="w-3.5 h-3.5 text-white/30 shrink-0" />
                <span className="font-bold flex-1 truncate">{r.title}</span>
                <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border", REPORT_STATUS_COLORS[r.status])}>{r.status}</span>
                <span className="text-white/40">{r.author}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Evidence Tab ───────────────────────────────────────────────────────

function EvidenceTab() {
  const { evidence, cases, activeCaseId, addEvidence, updateEvidence, deleteEvidence, getChainOfCustody } = useForensicsStore();
  const [showForm, setShowForm] = useState(false);
  const [selectedEvId, setSelectedEvId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const allEvidence = useMemo(() => Object.values(evidence).sort((a, b) => b.createdAt - a.createdAt), [evidence]);
  const filtered = useMemo(() => {
    let list = activeCaseId ? allEvidence.filter(e => e.caseId === activeCaseId) : allEvidence;
    if (search) {
      list = list.filter(e =>
        e.evidenceNumber.toLowerCase().includes(search.toLowerCase()) ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.location.toLowerCase().includes(search.toLowerCase())
      );
    }
    return list;
  }, [allEvidence, activeCaseId, search]);

  const [form, setForm] = useState({ caseId: '', evidenceNumber: '', name: '', description: '', type: 'physical' as Evidence['type'], location: '', collectedBy: '', collectedAt: '', notes: '' });

  const handleCreate = () => {
    if (!form.caseId || !form.evidenceNumber || !form.name) return;
    addEvidence(form.caseId, form.evidenceNumber, form.name, form.description, form.type, form.location, form.collectedBy, form.collectedAt || new Date().toISOString(), form.notes);
    setForm({ caseId: '', evidenceNumber: '', name: '', description: '', type: 'physical', location: '', collectedBy: '', collectedAt: '', notes: '' });
    setShowForm(false);
  };

  const selectedEv = selectedEvId ? evidence[selectedEvId] : null;
  const selectedChain = selectedEv ? getChainOfCustody(selectedEv.id) : [];

  const caseOptions = Object.values(cases);

  return (
    <div className="flex h-full">
      {/* Evidence List */}
      <div className={cn("flex flex-col border-r border-white/10 shrink-0 overflow-hidden transition-all", selectedEv ? "w-96" : "w-full")}>
        <div className="p-3 border-b border-white/10 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search evidence..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50 placeholder:text-white/30"
              />
            </div>
            <button onClick={() => setShowForm(!showForm)} className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors shrink-0">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {activeCaseId && (
            <div className="text-[10px] text-white/30 px-1">Filtered by case: {cases[activeCaseId]?.title}</div>
          )}
          {showForm && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col gap-2">
              <select value={form.caseId} onChange={e => setForm(f => ({ ...f, caseId: e.target.value }))} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none">
                <option value="">Select case...</option>
                {caseOptions.map(c => <option key={c.id} value={c.id}>{c.caseNumber} - {c.title}</option>)}
              </select>
              <div className="flex gap-2">
                <input value={form.evidenceNumber} onChange={e => setForm(f => ({ ...f, evidenceNumber: e.target.value }))} placeholder="Evidence #" className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs flex-1 focus:outline-none placeholder:text-white/30" />
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs flex-1 focus:outline-none placeholder:text-white/30" />
              </div>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none resize-none h-12 placeholder:text-white/30" />
              <div className="flex gap-2">
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Evidence['type'] }))} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs flex-1 focus:outline-none">
                  {['physical', 'digital', 'testimonial', 'documentary', 'biological'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Location" className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs flex-1 focus:outline-none placeholder:text-white/30" />
              </div>
              <div className="flex gap-2">
                <input value={form.collectedBy} onChange={e => setForm(f => ({ ...f, collectedBy: e.target.value }))} placeholder="Collected by" className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs flex-1 focus:outline-none placeholder:text-white/30" />
                <input type="datetime-local" value={form.collectedAt} onChange={e => setForm(f => ({ ...f, collectedAt: e.target.value }))} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs flex-1 focus:outline-none" />
              </div>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes" className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none resize-none h-12 placeholder:text-white/30" />
              <button onClick={handleCreate} className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded text-xs font-bold border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors">Add Evidence</button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-[10px] text-white/40 uppercase tracking-wider">
                <th className="px-3 py-2 text-left font-bold">Ev #</th>
                <th className="px-3 py-2 text-left font-bold">Name</th>
                <th className="px-3 py-2 text-left font-bold">Type</th>
                <th className="px-3 py-2 text-left font-bold">Status</th>
                <th className="px-3 py-2 text-left font-bold">Location</th>
                <th className="px-3 py-2 text-left font-bold">Collected By</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ev => (
                <tr
                  key={ev.id}
                  onClick={() => setSelectedEvId(ev.id)}
                  className={cn(
                    "border-b border-white/5 cursor-pointer transition-colors text-xs",
                    selectedEvId === ev.id ? "bg-cyan-500/10" : "hover:bg-white/5"
                  )}
                >
                  <td className="px-3 py-2 font-mono text-white/50">{ev.evidenceNumber}</td>
                  <td className="px-3 py-2 font-bold truncate max-w-[120px]">{ev.name}</td>
                  <td className="px-3 py-2"><span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border", EVIDENCE_TYPE_COLORS[ev.type])}>{ev.type}</span></td>
                  <td className="px-3 py-2"><span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border", EVIDENCE_STATUS_COLORS[ev.status])}>{ev.status}</span></td>
                  <td className="px-3 py-2 text-white/50 truncate max-w-[100px]">{ev.location}</td>
                  <td className="px-3 py-2 text-white/50">{ev.collectedBy}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-white/20 text-xs italic">No evidence items found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evidence Detail / Chain of Custody Timeline */}
      {selectedEv && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setSelectedEvId(null)} className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><X className="w-4 h-4" /></button>
            <div>
              <div className="text-[10px] font-mono text-white/40">{selectedEv.evidenceNumber}</div>
              <h2 className="text-lg font-bold">{selectedEv.name}</h2>
            </div>
            <div className="flex gap-1 ml-auto">
              <span className={cn("px-2 py-1 rounded text-[10px] font-bold border", EVIDENCE_TYPE_COLORS[selectedEv.type])}>{selectedEv.type}</span>
              <select
                value={selectedEv.status}
                onChange={e => updateEvidence(selectedEv.id, { status: e.target.value as Evidence['status'] })}
                className={cn("px-2 py-1 rounded text-[10px] font-bold border bg-transparent cursor-pointer focus:outline-none", EVIDENCE_STATUS_COLORS[selectedEv.status])}
              >
                {['collected', 'in-transit', 'in-lab', 'stored', 'disposed', 'returned'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-900 border border-white/10 rounded-xl p-3">
              <div className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</div>
              <div className="text-sm font-bold mt-1">{selectedEv.location || 'Unknown'}</div>
            </div>
            <div className="bg-gray-900 border border-white/10 rounded-xl p-3">
              <div className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1"><User className="w-3 h-3" /> Collected By</div>
              <div className="text-sm font-bold mt-1">{selectedEv.collectedBy}</div>
            </div>
            <div className="bg-gray-900 border border-white/10 rounded-xl p-3">
              <div className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> Collected At</div>
              <div className="text-sm font-bold mt-1">{new Date(selectedEv.collectedAt).toLocaleDateString()}</div>
            </div>
          </div>

          {selectedEv.hash && (
            <div className="bg-gray-900 border border-white/10 rounded-xl p-3 mb-6">
              <div className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1"><Hash className="w-3 h-3" /> Hash</div>
              <div className="text-xs font-mono mt-1 text-cyan-400 break-all">{selectedEv.hash}</div>
            </div>
          )}

          {selectedEv.notes && (
            <div className="bg-gray-900 border border-white/10 rounded-xl p-3 mb-6">
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Notes</div>
              <div className="text-xs mt-1 text-white/70">{selectedEv.notes}</div>
            </div>
          )}

          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">Chain of Custody Timeline</h3>
          <ChainTimeline entries={selectedChain} />
          <button onClick={() => deleteEvidence(selectedEv.id)} className="mt-4 px-3 py-1.5 bg-red-500/10 text-red-400 rounded text-xs font-bold border border-red-500/30 hover:bg-red-500/20 transition-colors flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete Evidence</button>
        </div>
      )}
    </div>
  );
}

// ─── Chain of Custody Tab ───────────────────────────────────────────────

function ChainTab() {
  const { evidence, cases, activeCaseId, getChainOfCustody, addChainEntry } = useForensicsStore();
  const [selectedEvId, setSelectedEvId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ action: 'collected' as ChainEntry['action'], fromPerson: '', toPerson: '', location: '', notes: '' });

  const allEvidence = useMemo(() => {
    const list = Object.values(evidence);
    return activeCaseId ? list.filter(e => e.caseId === activeCaseId) : list;
  }, [evidence, activeCaseId]);

  const chain = useMemo(() => selectedEvId ? getChainOfCustody(selectedEvId) : [], [selectedEvId, evidence]);

  const handleAdd = () => {
    if (!selectedEvId || !form.fromPerson || !form.toPerson) return;
    addChainEntry(selectedEvId, form.action, form.fromPerson, form.toPerson, form.location, form.notes);
    setForm({ action: 'collected', fromPerson: '', toPerson: '', location: '', notes: '' });
    setShowForm(false);
  };

  return (
    <div className="flex h-full">
      {/* Evidence Selector */}
      <div className="w-64 border-r border-white/10 flex flex-col shrink-0 overflow-hidden">
        <div className="p-3 border-b border-white/10">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Select Evidence</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {allEvidence.map(ev => (
            <button
              key={ev.id}
              onClick={() => { setSelectedEvId(ev.id); setShowForm(false); }}
              className={cn(
                "w-full text-left p-2 rounded-lg border transition-colors text-xs",
                selectedEvId === ev.id
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-white/5 border-white/5 hover:bg-white/10"
              )}
            >
              <div className="font-mono text-[10px] text-white/40">{ev.evidenceNumber}</div>
              <div className="font-bold truncate">{ev.name}</div>
            </button>
          ))}
          {allEvidence.length === 0 && <p className="text-xs text-white/20 italic text-center mt-4">No evidence found</p>}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedEvId ? (
          <div className="h-full flex items-center justify-center text-white/20 text-xs italic">Select evidence to view chain of custody</div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Link2 className="w-5 h-5 text-emerald-400" />
                Chain of Custody
              </h2>
              <button onClick={() => setShowForm(!showForm)} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded text-xs font-bold border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Entry
              </button>
            </div>

            {showForm && (
              <div className="bg-gray-900 border border-white/10 rounded-xl p-4 mb-6 flex flex-col gap-3">
                <div className="flex gap-2">
                  <select value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value as ChainEntry['action'] }))} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs flex-1 focus:outline-none">
                    {['collected', 'transferred', 'received', 'analyzed', 'stored', 'disposed', 'returned', 'accessed'].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input value={form.fromPerson} onChange={e => setForm(f => ({ ...f, fromPerson: e.target.value }))} placeholder="From (person/entity)" className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs flex-1 focus:outline-none placeholder:text-white/30" />
                  <ArrowRight className="w-4 h-4 text-white/20 shrink-0 self-center" />
                  <input value={form.toPerson} onChange={e => setForm(f => ({ ...f, toPerson: e.target.value }))} placeholder="To (person/entity)" className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs flex-1 focus:outline-none placeholder:text-white/30" />
                </div>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Location" className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs focus:outline-none placeholder:text-white/30" />
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes" className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs focus:outline-none resize-none h-16 placeholder:text-white/30" />
                <button onClick={handleAdd} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded text-xs font-bold border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors self-end">Add Entry</button>
              </div>
            )}

            {/* Chain Integrity Indicator */}
            <ChainIntegrity entries={chain} />

            <ChainTimeline entries={chain} />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Chain Timeline Component ───────────────────────────────────────────

function ChainTimeline({ entries }: { entries: ChainEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-xs text-white/20 italic">No chain of custody entries yet.</p>;
  }

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-2.5 top-0 bottom-0 w-px bg-white/10" />
      <div className="flex flex-col gap-4">
        {entries.map((entry, i) => (
          <div key={entry.id} className="relative">
            {/* Dot */}
            <div className={cn(
              "absolute -left-3.5 top-1 w-3 h-3 rounded-full border-2",
              entry.action === 'collected' ? "bg-emerald-500 border-emerald-400" :
              entry.action === 'transferred' ? "bg-yellow-500 border-yellow-400" :
              entry.action === 'analyzed' ? "bg-emerald-500 border-emerald-400" :
              entry.action === 'disposed' ? "bg-red-500 border-red-400" :
              entry.action === 'accessed' ? "bg-orange-500 border-orange-400" :
              "bg-blue-500 border-blue-400"
            )} />
            <div className="bg-gray-900 border border-white/10 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border", CHAIN_ACTION_COLORS[entry.action])}>{entry.action}</span>
                <span className="text-[10px] text-white/30 font-mono">{new Date(entry.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-xs mb-1">
                <User className="w-3 h-3 text-white/30" />
                <span className="text-white/70">{entry.fromPerson}</span>
                <ArrowRight className="w-3 h-3 text-white/20" />
                <span className="text-white/70">{entry.toPerson}</span>
              </div>
              {entry.location && (
                <div className="flex items-center gap-1 text-[10px] text-white/40 mb-1">
                  <MapPin className="w-3 h-3" />
                  {entry.location}
                </div>
              )}
              {entry.notes && <div className="text-[10px] text-white/50 mt-1 italic">{entry.notes}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChainIntegrity({ entries }: { entries: ChainEntry[] }) {
  if (entries.length === 0) return null;

  const hasGap = entries.length > 1 && entries.some((e, i) => {
    if (i === 0) return false;
    const prev = entries[i - 1]!;
    return prev.toPerson !== e.fromPerson && e.action !== 'collected';
  });

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg border mb-4 text-xs font-bold",
      hasGap
        ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
    )}>
      {hasGap ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
      {hasGap ? 'Potential chain gap detected' : `Chain intact — ${entries.length} entries`}
    </div>
  );
}

// ─── Reports Tab ────────────────────────────────────────────────────────

function ReportsTab() {
  const { reports, cases, activeCaseId, createReport, updateReport, deleteReport, getReportsByCase } = useForensicsStore();
  const [selectedRptId, setSelectedRptId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ caseId: '', title: '', content: '', author: '' });

  const caseReports = useMemo(() => {
    const list = activeCaseId ? getReportsByCase(activeCaseId) : Object.values(reports);
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }, [reports, activeCaseId]);

  const selectedRpt = selectedRptId ? reports[selectedRptId] : null;

  const handleCreate = () => {
    const caseId = form.caseId || activeCaseId || '';
    if (!caseId || !form.title) return;
    createReport(caseId, form.title, form.content, form.author);
    setForm({ caseId: '', title: '', content: '', author: '' });
    setShowForm(false);
  };

  const caseOptions = Object.values(cases);

  return (
    <div className="flex h-full">
      {/* Report List */}
      <div className={cn("flex flex-col border-r border-white/10 shrink-0 overflow-hidden transition-all", selectedRpt ? "w-72" : "w-full")}>
        <div className="p-3 border-b border-white/10 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
              {activeCaseId ? `Reports — ${cases[activeCaseId]?.title}` : 'All Reports'}
            </h3>
            <button onClick={() => setShowForm(!showForm)} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {showForm && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col gap-2">
              {!activeCaseId && (
                <select value={form.caseId} onChange={e => setForm(f => ({ ...f, caseId: e.target.value }))} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none">
                  <option value="">Select case...</option>
                  {caseOptions.map(c => <option key={c.id} value={c.id}>{c.caseNumber} - {c.title}</option>)}
                </select>
              )}
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Report Title" className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none placeholder:text-white/30" />
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Report content..." className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none resize-none h-24 placeholder:text-white/30" />
              <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="Author" className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none placeholder:text-white/30" />
              <button onClick={handleCreate} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded text-xs font-bold border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors">Create Report</button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {caseReports.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-white/20 text-xs italic">No reports found</div>
          )}
          {caseReports.map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedRptId(r.id)}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-colors",
                selectedRptId === r.id
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-white/5 border-white/5 hover:bg-white/10"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border", REPORT_STATUS_COLORS[r.status])}>{r.status}</span>
                <span className="text-[10px] text-white/30">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="text-xs font-bold truncate">{r.title}</div>
              <div className="text-[10px] text-white/40 mt-0.5">by {r.author}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Report Editor */}
      {selectedRpt && (
        <ReportEditor report={selectedRpt} onBack={() => setSelectedRptId(null)} />
      )}
    </div>
  );
}

function ReportEditor({ report, onBack }: { report: Report; onBack: () => void }) {
  const { updateReport, deleteReport, cases } = useForensicsStore();
  const [title, setTitle] = useState(report.title);
  const [content, setContent] = useState(report.content);
  const [author, setAuthor] = useState(report.author);

  useEffect(() => {
    setTitle(report.title);
    setContent(report.content);
    setAuthor(report.author);
  }, [report.id]);

  const handleSave = () => {
    updateReport(report.id, { title, content, author });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><X className="w-4 h-4" /></button>
        <div className="flex-1">
          <div className="text-[10px] text-white/30">{cases[report.caseId]?.title || 'Unknown Case'}</div>
          <input value={title} onChange={e => setTitle(e.target.value)} className="text-lg font-bold bg-transparent border-none focus:outline-none w-full" />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={report.status}
            onChange={e => updateReport(report.id, { status: e.target.value as Report['status'] })}
            className={cn("px-2 py-1 rounded text-[10px] font-bold border bg-transparent cursor-pointer focus:outline-none", REPORT_STATUS_COLORS[report.status])}
          >
            {['draft', 'review', 'final'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={handleSave} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded text-xs font-bold border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors">Save</button>
          <button onClick={() => { deleteReport(report.id); onBack(); }} className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 text-xs text-white/40">
        <div className="flex items-center gap-1"><User className="w-3 h-3" />
          <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author" className="bg-transparent border-none focus:outline-none text-white/60 w-32" />
        </div>
        <span>•</span>
        <span>Created {new Date(report.createdAt).toLocaleDateString()}</span>
        <span>•</span>
        <span>Updated {new Date(report.updatedAt).toLocaleDateString()}</span>
      </div>

      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Start writing your report..."
        className="flex-1 bg-gray-900 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none placeholder:text-white/20 min-h-[300px]"
      />
    </div>
  );
}
