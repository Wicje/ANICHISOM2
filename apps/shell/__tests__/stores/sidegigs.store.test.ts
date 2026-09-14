import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSideGigsStore } from '@/lib/stores/sidegigs.store';

describe('SideGigsStore', () => {
  beforeEach(() => {
    useSideGigsStore.setState({
      gigs: {},
      timeEntries: {},
      invoices: {},
      activeGigId: null,
    });
    vi.clearAllTimers();
  });

  // ─── Default State ──────────────────────────────────────────────

  describe('default state', () => {
    it('should have empty records and null activeGigId', () => {
      const s = useSideGigsStore.getState();
      expect(s.gigs).toEqual({});
      expect(s.timeEntries).toEqual({});
      expect(s.invoices).toEqual({});
      expect(s.activeGigId).toBeNull();
    });
  });

  // ─── Gig CRUD ──────────────────────────────────────────────────

  describe('Gig CRUD', () => {
    it('should create a gig and return its ID', () => {
      const id = useSideGigsStore.getState().createGig('Logo Design', 'Acme Corp', 'acme@test.com', 75, 'hourly');
      expect(id).toMatch(/^gig_/);
      const gig = useSideGigsStore.getState().gigs[id];
      expect(gig).toBeDefined();
      expect(gig!.name).toBe('Logo Design');
      expect(gig!.clientName).toBe('Acme Corp');
      expect(gig!.rate).toBe(75);
      expect(gig!.rateType).toBe('hourly');
      expect(gig!.status).toBe('active');
    });

    it('should update a gig', () => {
      const id = useSideGigsStore.getState().createGig('Old Name', 'Client', 'c@c.com', 50, 'daily');
      useSideGigsStore.getState().updateGig(id, { name: 'New Name', rate: 100 });
      const gig = useSideGigsStore.getState().gigs[id];
      expect(gig!.name).toBe('New Name');
      expect(gig!.rate).toBe(100);
    });

    it('should not create a gig for unknown ID on update', () => {
      useSideGigsStore.getState().updateGig('nonexistent', { name: 'X' });
      expect(useSideGigsStore.getState().gigs['nonexistent']).toBeUndefined();
    });

    it('should delete a gig', () => {
      const id = useSideGigsStore.getState().createGig('Doomed', 'C', 'c@c.com', 10, 'hourly');
      useSideGigsStore.getState().deleteGig(id);
      expect(useSideGigsStore.getState().gigs[id]).toBeUndefined();
    });

    it('should clear activeGigId when deleting active gig', () => {
      const id = useSideGigsStore.getState().createGig('Active', 'C', 'c@c.com', 10, 'hourly');
      useSideGigsStore.getState().setActiveGig(id);
      expect(useSideGigsStore.getState().activeGigId).toBe(id);
      useSideGigsStore.getState().deleteGig(id);
      expect(useSideGigsStore.getState().activeGigId).toBeNull();
    });

    it('should get gigs by status', () => {
      const id1 = useSideGigsStore.getState().createGig('Active 1', 'C', 'c@c.com', 10, 'hourly');
      const id2 = useSideGigsStore.getState().createGig('Active 2', 'C', 'c@c.com', 10, 'hourly');
      useSideGigsStore.getState().updateGig(id2, { status: 'paused' });
      expect(useSideGigsStore.getState().getGigsByStatus('active')).toHaveLength(1);
      expect(useSideGigsStore.getState().getGigsByStatus('active')[0]!.id).toBe(id1);
      expect(useSideGigsStore.getState().getGigsByStatus('paused')).toHaveLength(1);
      expect(useSideGigsStore.getState().getGigsByStatus('completed')).toHaveLength(0);
    });
  });

  // ─── TimeEntry CRUD ────────────────────────────────────────────

  describe('TimeEntry CRUD', () => {
    it('should create a time entry with computed duration', () => {
      const gigId = useSideGigsStore.getState().createGig('Test', 'C', 'c@c.com', 50, 'hourly');
      const teId = useSideGigsStore.getState().createTimeEntry(gigId, '2025-01-15', '09:00', '12:00', 'Morning work', true);
      expect(teId).toMatch(/^te_/);
      const te = useSideGigsStore.getState().timeEntries[teId];
      expect(te).toBeDefined();
      expect(te!.duration).toBe(10800); // 3 hours in seconds
      expect(te!.billable).toBe(true);
      expect(te!.invoiced).toBe(false);
      expect(te!.notes).toBe('Morning work');
    });

    it('should handle overnight duration (end < start)', () => {
      const gigId = useSideGigsStore.getState().createGig('Overnight', 'C', 'c@c.com', 50, 'hourly');
      const teId = useSideGigsStore.getState().createTimeEntry(gigId, '2025-01-15', '22:00', '02:00');
      const te = useSideGigsStore.getState().timeEntries[teId];
      expect(te!.duration).toBe(14400); // 4 hours
    });

    it('should update a time entry', () => {
      const gigId = useSideGigsStore.getState().createGig('Test', 'C', 'c@c.com', 50, 'hourly');
      const teId = useSideGigsStore.getState().createTimeEntry(gigId, '2025-01-15', '09:00', '10:00', 'old');
      useSideGigsStore.getState().updateTimeEntry(teId, { notes: 'updated', invoiced: true });
      expect(useSideGigsStore.getState().timeEntries[teId]!.notes).toBe('updated');
      expect(useSideGigsStore.getState().timeEntries[teId]!.invoiced).toBe(true);
    });

    it('should delete a time entry', () => {
      const gigId = useSideGigsStore.getState().createGig('Test', 'C', 'c@c.com', 50, 'hourly');
      const teId = useSideGigsStore.getState().createTimeEntry(gigId, '2025-01-15', '09:00', '10:00');
      useSideGigsStore.getState().deleteTimeEntry(teId);
      expect(useSideGigsStore.getState().timeEntries[teId]).toBeUndefined();
    });

    it('should get time entries by gig', () => {
      const gigId = useSideGigsStore.getState().createGig('Test', 'C', 'c@c.com', 50, 'hourly');
      const gigId2 = useSideGigsStore.getState().createGig('Other', 'C', 'c@c.com', 50, 'hourly');
      useSideGigsStore.getState().createTimeEntry(gigId, '2025-01-15', '09:00', '10:00');
      useSideGigsStore.getState().createTimeEntry(gigId, '2025-01-15', '11:00', '12:00');
      useSideGigsStore.getState().createTimeEntry(gigId2, '2025-01-15', '09:00', '10:00');
      expect(useSideGigsStore.getState().getTimeEntriesByGig(gigId)).toHaveLength(2);
      expect(useSideGigsStore.getState().getTimeEntriesByGig(gigId2)).toHaveLength(1);
    });

    it('should get time entries by date range', () => {
      const gigId = useSideGigsStore.getState().createGig('Test', 'C', 'c@c.com', 50, 'hourly');
      useSideGigsStore.getState().createTimeEntry(gigId, '2025-01-10', '09:00', '10:00');
      useSideGigsStore.getState().createTimeEntry(gigId, '2025-01-15', '09:00', '10:00');
      useSideGigsStore.getState().createTimeEntry(gigId, '2025-01-20', '09:00', '10:00');
      const range = useSideGigsStore.getState().getTimeEntriesByDateRange('2025-01-12', '2025-01-18');
      expect(range).toHaveLength(1);
      expect(range[0]!.date).toBe('2025-01-15');
    });
  });

  // ─── Invoice CRUD ──────────────────────────────────────────────

  describe('Invoice CRUD', () => {
    it('should create an invoice with computed amounts', () => {
      const gigId = useSideGigsStore.getState().createGig('Test', 'Acme', 'acme@test.com', 100, 'hourly');
      const invId = useSideGigsStore.getState().createInvoice(
        gigId, 'Acme', 'acme@test.com',
        [{ description: 'Design work', quantity: 10, rate: 100 }],
        'Test invoice',
      );
      expect(invId).toMatch(/^inv_/);
      const inv = useSideGigsStore.getState().invoices[invId];
      expect(inv).toBeDefined();
      expect(inv!.subtotal).toBe(1000);
      expect(inv!.tax).toBe(100);
      expect(inv!.total).toBe(1100);
      expect(inv!.status).toBe('draft');
      expect(inv!.items).toHaveLength(1);
      expect(inv!.items[0]!.amount).toBe(1000);
    });

    it('should update an invoice', () => {
      const gigId = useSideGigsStore.getState().createGig('Test', 'C', 'c@c.com', 50, 'hourly');
      const invId = useSideGigsStore.getState().createInvoice(gigId, 'C', 'c@c.com', [{ description: 'A', quantity: 1, rate: 50 }]);
      useSideGigsStore.getState().updateInvoice(invId, { status: 'sent' });
      expect(useSideGigsStore.getState().invoices[invId]!.status).toBe('sent');
    });

    it('should delete an invoice', () => {
      const gigId = useSideGigsStore.getState().createGig('Test', 'C', 'c@c.com', 50, 'hourly');
      const invId = useSideGigsStore.getState().createInvoice(gigId, 'C', 'c@c.com', [{ description: 'A', quantity: 1, rate: 50 }]);
      useSideGigsStore.getState().deleteInvoice(invId);
      expect(useSideGigsStore.getState().invoices[invId]).toBeUndefined();
    });

    it('should get invoices by gig', () => {
      const gigId = useSideGigsStore.getState().createGig('Test', 'C', 'c@c.com', 50, 'hourly');
      const gigId2 = useSideGigsStore.getState().createGig('Other', 'C', 'c@c.com', 50, 'hourly');
      useSideGigsStore.getState().createInvoice(gigId, 'C', 'c@c.com', [{ description: 'A', quantity: 1, rate: 50 }]);
      useSideGigsStore.getState().createInvoice(gigId2, 'C', 'c@c.com', [{ description: 'B', quantity: 1, rate: 50 }]);
      expect(useSideGigsStore.getState().getInvoicesByGig(gigId)).toHaveLength(1);
    });

    it('should get invoices by status', () => {
      const gigId = useSideGigsStore.getState().createGig('Test', 'C', 'c@c.com', 50, 'hourly');
      const invId = useSideGigsStore.getState().createInvoice(gigId, 'C', 'c@c.com', [{ description: 'A', quantity: 1, rate: 50 }]);
      useSideGigsStore.getState().updateInvoice(invId, { status: 'paid' });
      expect(useSideGigsStore.getState().getInvoicesByStatus('paid')).toHaveLength(1);
      expect(useSideGigsStore.getState().getInvoicesByStatus('draft')).toHaveLength(0);
    });
  });

  // ─── getUninvoicedHours + getTotalEarnings ─────────────────────

  describe('getUninvoicedHours', () => {
    it('should return uninvoiced billable hours', () => {
      const gigId = useSideGigsStore.getState().createGig('Test', 'C', 'c@c.com', 100, 'hourly');
      useSideGigsStore.getState().createTimeEntry(gigId, '2025-01-15', '09:00', '12:00', '', true); // 3h
      useSideGigsStore.getState().createTimeEntry(gigId, '2025-01-15', '13:00', '15:00', '', true); // 2h, invoiced below
      // Mark second entry as invoiced
      const entries = useSideGigsStore.getState().getTimeEntriesByGig(gigId);
      useSideGigsStore.getState().updateTimeEntry(entries[1]!.id, { invoiced: true });
      expect(useSideGigsStore.getState().getUninvoicedHours(gigId)).toBeCloseTo(3, 1);
    });
  });

  describe('getTotalEarnings', () => {
    it('should calculate hourly earnings', () => {
      const gigId = useSideGigsStore.getState().createGig('Test', 'C', 'c@c.com', 100, 'hourly');
      useSideGigsStore.getState().createTimeEntry(gigId, '2025-01-15', '09:00', '12:00'); // 3h
      useSideGigsStore.getState().createTimeEntry(gigId, '2025-01-15', '13:00', '15:00'); // 2h
      expect(useSideGigsStore.getState().getTotalEarnings(gigId)).toBeCloseTo(500, 0);
    });

    it('should calculate daily earnings', () => {
      const gigId = useSideGigsStore.getState().createGig('Test', 'C', 'c@c.com', 800, 'daily');
      useSideGigsStore.getState().createTimeEntry(gigId, '2025-01-15', '09:00', '17:00');
      useSideGigsStore.getState().createTimeEntry(gigId, '2025-01-16', '09:00', '17:00');
      expect(useSideGigsStore.getState().getTotalEarnings(gigId)).toBe(1600);
    });

    it('should return fixed rate if any entries exist', () => {
      const gigId = useSideGigsStore.getState().createGig('Test', 'C', 'c@c.com', 2000, 'fixed');
      useSideGigsStore.getState().createTimeEntry(gigId, '2025-01-15', '09:00', '17:00');
      expect(useSideGigsStore.getState().getTotalEarnings(gigId)).toBe(2000);
    });

    it('should return 0 for unknown gig', () => {
      expect(useSideGigsStore.getState().getTotalEarnings('nonexistent')).toBe(0);
    });
  });

  // ─── generateInvoice ──────────────────────────────────────────

  describe('generateInvoice', () => {
    it('should create an invoice from uninvoiced entries', () => {
      const gigId = useSideGigsStore.getState().createGig('Test', 'Acme', 'acme@test.com', 100, 'hourly');
      useSideGigsStore.getState().createTimeEntry(gigId, '2025-01-15', '09:00', '12:00', '', true); // 3h
      useSideGigsStore.getState().createTimeEntry(gigId, '2025-01-16', '09:00', '11:00', '', true); // 2h
      const invId = useSideGigsStore.getState().generateInvoice(gigId, { start: '2025-01-15', end: '2025-01-20' });
      expect(invId).not.toBeNull();
      const inv = useSideGigsStore.getState().invoices[invId!]!;
      expect(inv).toBeDefined();
      expect(inv.items[0]!.quantity).toBeCloseTo(5, 1); // 5 hours
      expect(inv.items[0]!.rate).toBe(100);
      // Entries should be marked invoiced
      const entries = useSideGigsStore.getState().getTimeEntriesByGig(gigId);
      expect(entries.every(te => te.invoiced)).toBe(true);
    });

    it('should return null if no uninvoiced entries in range', () => {
      const gigId = useSideGigsStore.getState().createGig('Test', 'C', 'c@c.com', 100, 'hourly');
      useSideGigsStore.getState().createTimeEntry(gigId, '2025-01-15', '09:00', '12:00', '', true);
      // Mark as invoiced
      const entries = useSideGigsStore.getState().getTimeEntriesByGig(gigId);
      useSideGigsStore.getState().updateTimeEntry(entries[0]!.id, { invoiced: true });
      const invId = useSideGigsStore.getState().generateInvoice(gigId, { start: '2025-01-15', end: '2025-01-20' });
      expect(invId).toBeNull();
    });

    it('should return null for unknown gig', () => {
      const result = useSideGigsStore.getState().generateInvoice('nonexistent', { start: '2025-01-01', end: '2025-01-31' });
      expect(result).toBeNull();
    });
  });

  // ─── getRevenueStats ──────────────────────────────────────────

  describe('getRevenueStats', () => {
    it('should compute total revenue, outstanding, and this month', () => {
      const gigId = useSideGigsStore.getState().createGig('Test', 'C', 'c@c.com', 100, 'hourly');
      // Paid invoice
      const inv1 = useSideGigsStore.getState().createInvoice(gigId, 'C', 'c@c.com', [{ description: 'A', quantity: 10, rate: 100 }]);
      useSideGigsStore.getState().updateInvoice(inv1, { status: 'paid', paidDate: new Date().toISOString().slice(0, 10) });
      // Sent (outstanding) invoice
      const inv2 = useSideGigsStore.getState().createInvoice(gigId, 'C', 'c@c.com', [{ description: 'B', quantity: 5, rate: 100 }]);
      useSideGigsStore.getState().updateInvoice(inv2, { status: 'sent' });
      const stats = useSideGigsStore.getState().getRevenueStats();
      expect(stats.totalRevenue).toBeCloseTo(1100, 0); // 1000 * 1.1
      expect(stats.outstanding).toBeCloseTo(550, 0); // 500 * 1.1
      expect(stats.thisMonth).toBeCloseTo(1100, 0); // paid this month
    });
  });
});
