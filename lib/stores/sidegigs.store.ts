/**
 * Side-Gigs Zustand Store — freelance time tracking & invoicing state.
 *
 * Manages gigs, time entries, and invoices.
 * Persists to IndexedDB via debounced writes.
 */
import { create } from 'zustand';
import { withPersistence } from '@/lib/stores/persisted-store';
import { generateId } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────

export interface Gig {
  id: string;
  name: string;
  clientName: string;
  clientEmail: string;
  rate: number;
  rateType: 'hourly' | 'fixed' | 'daily';
  status: 'active' | 'paused' | 'completed' | 'archived';
  description: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface TimeEntry {
  id: string;
  gigId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  notes: string;
  billable: boolean;
  invoiced: boolean;
  createdAt: number;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  gigId: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issuedDate: string;
  dueDate: string;
  paidDate?: string;
  notes: string;
  createdAt: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

function parseTimeToSeconds(time: string): number {
  const [h, m] = time.split(':').map(Number) as [number, number];
  return h * 3600 + m * 60;
}

// ─── State ──────────────────────────────────────────────────────────────

export interface SideGigsState {
  gigs: Record<string, Gig>;
  timeEntries: Record<string, TimeEntry>;
  invoices: Record<string, Invoice>;
  activeGigId: string | null;

  // Gig CRUD
  createGig: (name: string, clientName: string, clientEmail: string, rate: number, rateType: Gig['rateType'], description?: string, tags?: string[]) => string;
  updateGig: (id: string, updates: Partial<Omit<Gig, 'id' | 'createdAt'>>) => void;
  deleteGig: (id: string) => void;
  setActiveGig: (id: string | null) => void;
  getGigsByStatus: (status: Gig['status']) => Gig[];

  // TimeEntry CRUD
  createTimeEntry: (gigId: string, date: string, startTime: string, endTime: string, notes?: string, billable?: boolean) => string;
  updateTimeEntry: (id: string, updates: Partial<Omit<TimeEntry, 'id' | 'createdAt'>>) => void;
  deleteTimeEntry: (id: string) => void;
  getTimeEntriesByGig: (gigId: string) => TimeEntry[];
  getTimeEntriesByDateRange: (start: string, end: string) => TimeEntry[];
  getUninvoicedHours: (gigId: string) => number;
  getTotalEarnings: (gigId: string) => number;

  // Invoice CRUD
  createInvoice: (gigId: string, clientName: string, clientEmail: string, items: Omit<InvoiceItem, 'id' | 'amount'>[], notes?: string) => string;
  updateInvoice: (id: string, updates: Partial<Omit<Invoice, 'id' | 'createdAt'>>) => void;
  deleteInvoice: (id: string) => void;
  getInvoicesByGig: (gigId: string) => Invoice[];
  getInvoicesByStatus: (status: Invoice['status']) => Invoice[];
  generateInvoice: (gigId: string, dateRange: { start: string; end: string }) => string | null;
  getRevenueStats: () => { totalRevenue: number; outstanding: number; thisMonth: number };
}

export const useSideGigsStore = create<SideGigsState>((set, get) => ({
  gigs: {},
  timeEntries: {},
  invoices: {},
  activeGigId: null,

  // ─── Gig CRUD ──────────────────────────────────────────────────────

  createGig: (name, clientName, clientEmail, rate, rateType, description = '', tags = []) => {
    const id = generateId('gig');
    const now = Date.now();
    const gig: Gig = {
      id,
      name,
      clientName,
      clientEmail,
      rate,
      rateType,
      status: 'active',
      description,
      tags,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => {
      const gigs = { ...s.gigs, [id]: gig };
      return { gigs };
    });
    return id;
  },

  updateGig: (id, updates) => {
    set((s) => {
      const existing = s.gigs[id];
      if (!existing) return s;
      const gigs = {
        ...s.gigs,
        [id]: { ...existing, ...updates, updatedAt: Date.now() },
      };
      return { gigs };
    });
  },

  deleteGig: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.gigs;
      const activeGigId = s.activeGigId === id ? null : s.activeGigId;
      return { gigs: rest, activeGigId };
    });
  },

  setActiveGig: (id) => {
    set({ activeGigId: id });
  },

  getGigsByStatus: (status) => {
    return Object.values(get().gigs).filter((g) => g.status === status);
  },

  // ─── TimeEntry CRUD ────────────────────────────────────────────────

  createTimeEntry: (gigId, date, startTime, endTime, notes = '', billable = true) => {
    const id = generateId('te');
    const startSec = parseTimeToSeconds(startTime);
    const endSec = parseTimeToSeconds(endTime);
    const duration = endSec >= startSec ? endSec - startSec : (86400 - startSec) + endSec;
    const entry: TimeEntry = {
      id,
      gigId,
      date,
      startTime,
      endTime,
      duration,
      notes,
      billable,
      invoiced: false,
      createdAt: Date.now(),
    };
    set((s) => {
      const timeEntries = { ...s.timeEntries, [id]: entry };
      return { timeEntries };
    });
    return id;
  },

  updateTimeEntry: (id, updates) => {
    set((s) => {
      const existing = s.timeEntries[id];
      if (!existing) return s;
      const timeEntries = {
        ...s.timeEntries,
        [id]: { ...existing, ...updates },
      };
      return { timeEntries };
    });
  },

  deleteTimeEntry: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.timeEntries;
      return { timeEntries: rest };
    });
  },

  getTimeEntriesByGig: (gigId) => {
    return Object.values(get().timeEntries).filter((te) => te.gigId === gigId);
  },

  getTimeEntriesByDateRange: (start, end) => {
    return Object.values(get().timeEntries).filter((te) => te.date >= start && te.date <= end);
  },

  getUninvoicedHours: (gigId) => {
    const entries = Object.values(get().timeEntries).filter(
      (te) => te.gigId === gigId && te.billable && !te.invoiced,
    );
    const totalSeconds = entries.reduce((sum, te) => sum + te.duration, 0);
    return totalSeconds / 3600;
  },

  getTotalEarnings: (gigId) => {
    const gig = get().gigs[gigId];
    if (!gig) return 0;
    const entries = Object.values(get().timeEntries).filter(
      (te) => te.gigId === gigId && te.billable,
    );
    if (gig.rateType === 'hourly') {
      const totalHours = entries.reduce((sum, te) => sum + te.duration / 3600, 0);
      return totalHours * gig.rate;
    }
    if (gig.rateType === 'daily') {
      const uniqueDays = new Set(entries.map((te) => te.date));
      return uniqueDays.size * gig.rate;
    }
    return entries.length > 0 ? gig.rate : 0;
  },

  // ─── Invoice CRUD ──────────────────────────────────────────────────

  createInvoice: (gigId, clientName, clientEmail, items, notes = '') => {
    const id = generateId('inv');
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const today = new Date().toISOString().slice(0, 10);
    const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const fullItems: InvoiceItem[] = items.map((item) => ({
      ...item,
      id: generateId('item'),
      amount: item.quantity * item.rate,
    }));
    const subtotal = fullItems.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * 0.1;
    const invoice: Invoice = {
      id,
      gigId,
      invoiceNumber,
      clientName,
      clientEmail,
      items: fullItems,
      subtotal,
      tax,
      total: subtotal + tax,
      status: 'draft',
      issuedDate: today,
      dueDate,
      notes,
      createdAt: Date.now(),
    };
    set((s) => {
      const invoices = { ...s.invoices, [id]: invoice };
      return { invoices };
    });
    return id;
  },

  updateInvoice: (id, updates) => {
    set((s) => {
      const existing = s.invoices[id];
      if (!existing) return s;
      const invoices = {
        ...s.invoices,
        [id]: { ...existing, ...updates },
      };
      return { invoices };
    });
  },

  deleteInvoice: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.invoices;
      return { invoices: rest };
    });
  },

  getInvoicesByGig: (gigId) => {
    return Object.values(get().invoices).filter((inv) => inv.gigId === gigId);
  },

  getInvoicesByStatus: (status) => {
    return Object.values(get().invoices).filter((inv) => inv.status === status);
  },

  generateInvoice: (gigId, dateRange) => {
    const state = get();
    const gig = state.gigs[gigId];
    if (!gig) return null;

    const entries = Object.values(state.timeEntries).filter(
      (te) =>
        te.gigId === gigId &&
        te.billable &&
        !te.invoiced &&
        te.date >= dateRange.start &&
        te.date <= dateRange.end,
    );

    if (entries.length === 0) return null;

    const description =
      gig.rateType === 'hourly'
        ? `Services rendered (${entries.length} entries)`
        : gig.rateType === 'daily'
          ? `Services rendered (${new Set(entries.map((te) => te.date)).size} days)`
          : gig.name;

    const quantity =
      gig.rateType === 'hourly'
        ? entries.reduce((sum, te) => sum + te.duration / 3600, 0)
        : gig.rateType === 'daily'
          ? new Set(entries.map((te) => te.date)).size
          : 1;

    const invoiceId = state.createInvoice(
      gigId,
      gig.clientName,
      gig.clientEmail,
      [{ description, quantity: Math.round(quantity * 100) / 100, rate: gig.rate }],
      `Auto-generated from ${dateRange.start} to ${dateRange.end}`,
    );

    entries.forEach((te) => {
      state.updateTimeEntry(te.id, { invoiced: true });
    });

    return invoiceId;
  },

  getRevenueStats: () => {
    const state = get();
    const invoices = Object.values(state.invoices);

    const totalRevenue = invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);

    const outstanding = invoices
      .filter((inv) => inv.status === 'sent' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.total, 0);

    const thisMonth = invoices
      .filter((inv) => {
        if (inv.status !== 'paid' || !inv.paidDate) return false;
        const paid = new Date(inv.paidDate);
        const now = new Date();
        return paid.getMonth() === now.getMonth() && paid.getFullYear() === now.getFullYear();
      })
      .reduce((sum, inv) => sum + inv.total, 0);

    return { totalRevenue, outstanding, thisMonth };
  },
}));

withPersistence(useSideGigsStore, 'sidegigs-state', ['gigs', 'timeEntries', 'invoices', 'activeGigId']);

export { formatDuration, parseTimeToSeconds };
