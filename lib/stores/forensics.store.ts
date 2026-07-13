/**
 * Forensics Zustand Store — case management, evidence, chain of custody, and reports
 * for the Ziklag Forensics Pack.
 *
 * Persists to IndexedDB via debounced writes.
 */
import { create } from 'zustand';
import { withPersistence } from '@/lib/stores/persisted-store';

// ─── Types ──────────────────────────────────────────────────────────────

export interface Case {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  status: 'open' | 'active' | 'closed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  lead: string;
  agency: string;
  dateOpened: string;
  dateClosed?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Evidence {
  id: string;
  caseId: string;
  evidenceNumber: string;
  name: string;
  description: string;
  type: 'physical' | 'digital' | 'testimonial' | 'documentary' | 'biological';
  status: 'collected' | 'in-transit' | 'in-lab' | 'stored' | 'disposed' | 'returned';
  location: string;
  collectedBy: string;
  collectedAt: string;
  hash?: string;
  notes: string;
  tags: string[];
  createdAt: number;
}

export interface ChainEntry {
  id: string;
  evidenceId: string;
  action: 'collected' | 'transferred' | 'received' | 'analyzed' | 'stored' | 'disposed' | 'returned' | 'accessed';
  fromPerson: string;
  toPerson: string;
  location: string;
  timestamp: string;
  notes: string;
  signatureHash?: string;
}

export interface Report {
  id: string;
  caseId: string;
  title: string;
  content: string;
  author: string;
  status: 'draft' | 'review' | 'final';
  createdAt: number;
  updatedAt: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── State ──────────────────────────────────────────────────────────────

export interface CaseStats {
  totalEvidence: number;
  byType: Record<Evidence['type'], number>;
  byStatus: Record<Evidence['status'], number>;
}

export interface ForensicsState {
  cases: Record<string, Case>;
  evidence: Record<string, Evidence>;
  chainEntries: Record<string, ChainEntry>;
  reports: Record<string, Report>;
  activeCaseId: string | null;

  // ─── Case CRUD ──────────────────────────────────────────────────
  createCase: (caseNumber: string, title: string, description: string, priority: Case['priority'], lead: string, agency: string) => string;
  updateCase: (id: string, updates: Partial<Omit<Case, 'id' | 'createdAt'>>) => void;
  deleteCase: (id: string) => void;
  setActiveCase: (id: string | null) => void;
  getCasesByStatus: (status: Case['status']) => Case[];

  // ─── Evidence CRUD ─────────────────────────────────────────────
  addEvidence: (caseId: string, evidenceNumber: string, name: string, description: string, type: Evidence['type'], location: string, collectedBy: string, collectedAt: string, notes: string) => string;
  updateEvidence: (id: string, updates: Partial<Omit<Evidence, 'id' | 'createdAt'>>) => void;
  deleteEvidence: (id: string) => void;
  getEvidenceByCase: (caseId: string) => Evidence[];

  // ─── Chain of Custody CRUD ─────────────────────────────────────
  addChainEntry: (evidenceId: string, action: ChainEntry['action'], fromPerson: string, toPerson: string, location: string, notes: string) => string;
  getChainOfCustody: (evidenceId: string) => ChainEntry[];

  // ─── Report CRUD ───────────────────────────────────────────────
  createReport: (caseId: string, title: string, content: string, author: string) => string;
  updateReport: (id: string, updates: Partial<Omit<Report, 'id' | 'createdAt'>>) => void;
  deleteReport: (id: string) => void;
  getReportsByCase: (caseId: string) => Report[];

  // ─── Computed ──────────────────────────────────────────────────
  getCaseStats: (caseId: string) => CaseStats;
}

export const useForensicsStore = create<ForensicsState>((set, get) => ({
  cases: {},
  evidence: {},
  chainEntries: {},
  reports: {},
  activeCaseId: null,

  // ─── Case CRUD ──────────────────────────────────────────────────

  createCase: (caseNumber, title, description, priority, lead, agency) => {
    const id = generateId('case');
    const now = Date.now();
    const caseObj: Case = {
      id,
      caseNumber,
      title,
      description,
      status: 'open',
      priority,
      lead,
      agency,
      dateOpened: new Date(now).toISOString(),
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    set((s) => {
      const cases = { ...s.cases, [id]: caseObj };
      return { cases };
    });
    return id;
  },

  updateCase: (id, updates) => {
    set((s) => {
      const existing = s.cases[id];
      if (!existing) return s;
      const cases = {
        ...s.cases,
        [id]: { ...existing, ...updates, updatedAt: Date.now() },
      };
      return { cases };
    });
  },

  deleteCase: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.cases;
      const activeCaseId = s.activeCaseId === id ? null : s.activeCaseId;
      return { cases: rest, activeCaseId };
    });
  },

  setActiveCase: (id) => {
    set({ activeCaseId: id });
  },

  getCasesByStatus: (status) => {
    return Object.values(get().cases).filter((c) => c.status === status);
  },

  // ─── Evidence CRUD ─────────────────────────────────────────────

  addEvidence: (caseId, evidenceNumber, name, description, type, location, collectedBy, collectedAt, notes) => {
    const id = generateId('evid');
    const ev: Evidence = {
      id,
      caseId,
      evidenceNumber,
      name,
      description,
      type,
      status: 'collected',
      location,
      collectedBy,
      collectedAt,
      notes,
      tags: [],
      createdAt: Date.now(),
    };
    set((s) => {
      const evidence = { ...s.evidence, [id]: ev };
      return { evidence };
    });
    return id;
  },

  updateEvidence: (id, updates) => {
    set((s) => {
      const existing = s.evidence[id];
      if (!existing) return s;
      const evidence = { ...s.evidence, [id]: { ...existing, ...updates } };
      return { evidence };
    });
  },

  deleteEvidence: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.evidence;
      return { evidence: rest };
    });
  },

  getEvidenceByCase: (caseId) => {
    return Object.values(get().evidence).filter((e) => e.caseId === caseId);
  },

  // ─── Chain of Custody CRUD ─────────────────────────────────────

  addChainEntry: (evidenceId, action, fromPerson, toPerson, location, notes) => {
    const id = generateId('chain');
    const entry: ChainEntry = {
      id,
      evidenceId,
      action,
      fromPerson,
      toPerson,
      location,
      timestamp: new Date().toISOString(),
      notes,
    };
    set((s) => {
      const chainEntries = { ...s.chainEntries, [id]: entry };
      return { chainEntries };
    });
    return id;
  },

  getChainOfCustody: (evidenceId) => {
    return Object.values(get().chainEntries)
      .filter((e) => e.evidenceId === evidenceId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  },

  // ─── Report CRUD ───────────────────────────────────────────────

  createReport: (caseId, title, content, author) => {
    const id = generateId('rpt');
    const now = Date.now();
    const report: Report = {
      id,
      caseId,
      title,
      content,
      author,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    set((s) => {
      const reports = { ...s.reports, [id]: report };
      return { reports };
    });
    return id;
  },

  updateReport: (id, updates) => {
    set((s) => {
      const existing = s.reports[id];
      if (!existing) return s;
      const reports = {
        ...s.reports,
        [id]: { ...existing, ...updates, updatedAt: Date.now() },
      };
      return { reports };
    });
  },

  deleteReport: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.reports;
      return { reports: rest };
    });
  },

  getReportsByCase: (caseId) => {
    return Object.values(get().reports).filter((r) => r.caseId === caseId);
  },

  // ─── Computed ──────────────────────────────────────────────────

  getCaseStats: (caseId) => {
    const caseEvidence = Object.values(get().evidence).filter((e) => e.caseId === caseId);
    const byType: Record<Evidence['type'], number> = { physical: 0, digital: 0, testimonial: 0, documentary: 0, biological: 0 };
    const byStatus: Record<Evidence['status'], number> = { collected: 0, 'in-transit': 0, 'in-lab': 0, stored: 0, disposed: 0, returned: 0 };
    for (const ev of caseEvidence) {
      byType[ev.type]++;
      byStatus[ev.status]++;
    }
    return { totalEvidence: caseEvidence.length, byType, byStatus };
  },
}));

withPersistence(useForensicsStore, 'forensics-state', ['cases', 'evidence', 'chainEntries', 'reports', 'activeCaseId']);
