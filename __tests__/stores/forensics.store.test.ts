import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useForensicsStore } from '@/lib/stores/forensics.store';

describe('ForensicsStore', () => {
  beforeEach(() => {
    useForensicsStore.setState({
      cases: {},
      evidence: {},
      chainEntries: {},
      reports: {},
      activeCaseId: null,
    });
    vi.clearAllTimers();
  });

  describe('Case CRUD', () => {
    it('should create a case and return its ID', () => {
      const id = useForensicsStore.getState().createCase(
        '2024-001', 'Test Case', 'A test investigation', 'high', 'Det. Smith', 'FBI'
      );
      expect(id).toMatch(/^case_/);
      const c = useForensicsStore.getState().cases[id];
      expect(c).toBeDefined();
      expect(c.caseNumber).toBe('2024-001');
      expect(c.title).toBe('Test Case');
      expect(c.status).toBe('open');
      expect(c.priority).toBe('high');
    });

    it('should update a case', () => {
      const id = useForensicsStore.getState().createCase(
        '2024-002', 'Old Title', 'desc', 'low', 'Agent', 'CIA'
      );
      useForensicsStore.getState().updateCase(id, { title: 'New Title', status: 'active' });
      expect(useForensicsStore.getState().cases[id].title).toBe('New Title');
      expect(useForensicsStore.getState().cases[id].status).toBe('active');
    });

    it('should delete a case', () => {
      const id = useForensicsStore.getState().createCase(
        '2024-003', 'Doomed', 'desc', 'medium', 'Agent', 'NSA'
      );
      useForensicsStore.getState().deleteCase(id);
      expect(useForensicsStore.getState().cases[id]).toBeUndefined();
    });

    it('should clear activeCaseId when deleting active case', () => {
      const id = useForensicsStore.getState().createCase(
        '2024-004', 'Active Case', 'desc', 'low', 'Agent', 'ATF'
      );
      useForensicsStore.getState().setActiveCase(id);
      useForensicsStore.getState().deleteCase(id);
      expect(useForensicsStore.getState().activeCaseId).toBeNull();
    });

    it('should get cases by status', () => {
      useForensicsStore.getState().createCase('A', 'Open A', 'd', 'low', 'A', 'FBI');
      const id2 = useForensicsStore.getState().createCase('B', 'Active B', 'd', 'low', 'B', 'FBI');
      useForensicsStore.getState().updateCase(id2, { status: 'active' });
      expect(useForensicsStore.getState().getCasesByStatus('open')).toHaveLength(1);
      expect(useForensicsStore.getState().getCasesByStatus('active')).toHaveLength(1);
      expect(useForensicsStore.getState().getCasesByStatus('closed')).toHaveLength(0);
    });
  });

  describe('Evidence CRUD', () => {
    it('should add evidence to a case', () => {
      const caseId = useForensicsStore.getState().createCase(
        'E001', 'Evidence Case', 'd', 'high', 'Det.', 'FBI'
      );
      const evId = useForensicsStore.getState().addEvidence(
        caseId, 'EV-001', 'Laptop', 'Suspect laptop', 'digital', 'Lab A', 'Officer Jones', '2024-01-15T10:00:00Z', 'Seized from desk'
      );
      expect(evId).toMatch(/^evid_/);
      const ev = useForensicsStore.getState().evidence[evId];
      expect(ev.evidenceNumber).toBe('EV-001');
      expect(ev.status).toBe('collected');
    });

    it('should get evidence by case', () => {
      const caseId = useForensicsStore.getState().createCase(
        'E002', 'Multi-Evidence', 'd', 'low', 'Det.', 'DEA'
      );
      useForensicsStore.getState().addEvidence(caseId, 'EV-01', 'Item A', 'd', 'physical', 'Scene', 'J', '2024-01-01T00:00:00Z', '');
      useForensicsStore.getState().addEvidence(caseId, 'EV-02', 'Item B', 'd', 'digital', 'Lab', 'K', '2024-01-02T00:00:00Z', '');
      expect(useForensicsStore.getState().getEvidenceByCase(caseId)).toHaveLength(2);
    });

    it('should update evidence status', () => {
      const caseId = useForensicsStore.getState().createCase(
        'E003', 'Status Test', 'd', 'medium', 'Det.', 'FBI'
      );
      const evId = useForensicsStore.getState().addEvidence(
        caseId, 'EV-10', 'Phone', 'd', 'digital', 'Scene', 'A', '2024-01-01T00:00:00Z', ''
      );
      useForensicsStore.getState().updateEvidence(evId, { status: 'in-lab' });
      expect(useForensicsStore.getState().evidence[evId].status).toBe('in-lab');
    });

    it('should delete evidence', () => {
      const caseId = useForensicsStore.getState().createCase(
        'E004', 'Delete Test', 'd', 'low', 'Det.', 'FBI'
      );
      const evId = useForensicsStore.getState().addEvidence(
        caseId, 'EV-20', 'Gun', 'd', 'physical', 'Scene', 'A', '2024-01-01T00:00:00Z', ''
      );
      useForensicsStore.getState().deleteEvidence(evId);
      expect(useForensicsStore.getState().evidence[evId]).toBeUndefined();
    });
  });

  describe('Chain of Custody', () => {
    it('should add a chain entry', () => {
      const caseId = useForensicsStore.getState().createCase(
        'CC001', 'Chain Case', 'd', 'high', 'Det.', 'FBI'
      );
      const evId = useForensicsStore.getState().addEvidence(
        caseId, 'CC-EV1', 'Evidence Item', 'd', 'physical', 'Scene', 'Officer A', '2024-01-01T00:00:00Z', ''
      );
      const entryId = useForensicsStore.getState().addChainEntry(
        evId, 'collected', 'Nobody', 'Officer A', 'Crime Scene', 'Found near entrance'
      );
      expect(entryId).toMatch(/^chain_/);
    });

    it('should retrieve chain of custody sorted by timestamp', () => {
      const caseId = useForensicsStore.getState().createCase(
        'CC002', 'Sorted Chain', 'd', 'medium', 'Det.', 'FBI'
      );
      const evId = useForensicsStore.getState().addEvidence(
        caseId, 'CC-EV2', 'Item', 'd', 'digital', 'Lab', 'A', '2024-01-01T00:00:00Z', ''
      );
      useForensicsStore.getState().addChainEntry(evId, 'collected', 'Nobody', 'A', 'Scene', 'First');
      useForensicsStore.getState().addChainEntry(evId, 'transferred', 'A', 'B', 'Scene', 'Second');
      const chain = useForensicsStore.getState().getChainOfCustody(evId);
      expect(chain).toHaveLength(2);
      expect(chain[0].notes).toBe('First');
      expect(chain[1].notes).toBe('Second');
    });

    it('should not return chain entries for other evidence', () => {
      const caseId = useForensicsStore.getState().createCase(
        'CC003', 'Isolation', 'd', 'low', 'Det.', 'FBI'
      );
      const ev1 = useForensicsStore.getState().addEvidence(caseId, 'X1', 'A', 'd', 'physical', 'L', 'P', '2024-01-01T00:00:00Z', '');
      const ev2 = useForensicsStore.getState().addEvidence(caseId, 'X2', 'B', 'd', 'physical', 'L', 'P', '2024-01-01T00:00:00Z', '');
      useForensicsStore.getState().addChainEntry(ev1, 'collected', 'N', 'P', 'S', 'Entry');
      expect(useForensicsStore.getState().getChainOfCustody(ev2)).toHaveLength(0);
    });
  });

  describe('Reports', () => {
    it('should create a report as draft', () => {
      const caseId = useForensicsStore.getState().createCase(
        'R001', 'Report Case', 'd', 'high', 'Det.', 'FBI'
      );
      const rptId = useForensicsStore.getState().createReport(caseId, 'Initial Findings', 'Content here', 'Dr. Wilson');
      expect(rptId).toMatch(/^rpt_/);
      expect(useForensicsStore.getState().reports[rptId].status).toBe('draft');
    });

    it('should get reports by case', () => {
      const caseId = useForensicsStore.getState().createCase(
        'R002', 'Multi Report', 'd', 'medium', 'Det.', 'FBI'
      );
      useForensicsStore.getState().createReport(caseId, 'Report 1', 'c1', 'A');
      useForensicsStore.getState().createReport(caseId, 'Report 2', 'c2', 'B');
      expect(useForensicsStore.getState().getReportsByCase(caseId)).toHaveLength(2);
    });

    it('should update report status to final', () => {
      const caseId = useForensicsStore.getState().createCase(
        'R003', 'Finalize', 'd', 'low', 'Det.', 'FBI'
      );
      const rptId = useForensicsStore.getState().createReport(caseId, 'Draft Report', 'c', 'Author');
      useForensicsStore.getState().updateReport(rptId, { status: 'final' });
      expect(useForensicsStore.getState().reports[rptId].status).toBe('final');
    });
  });

  describe('addChainEntry helper', () => {
    it('should update evidence status when addChainEntry is called', () => {
      const caseId = useForensicsStore.getState().createCase(
        'ACE1', 'Chain Update', 'd', 'high', 'Det.', 'FBI'
      );
      const evId = useForensicsStore.getState().addEvidence(
        caseId, 'ACE-EV', 'Item', 'd', 'physical', 'Scene', 'A', '2024-01-01T00:00:00Z', ''
      );
      useForensicsStore.getState().addChainEntry(evId, 'transferred', 'A', 'B', 'Lab', 'Moved to lab');
      const chain = useForensicsStore.getState().getChainOfCustody(evId);
      expect(chain[0].action).toBe('transferred');
      expect(chain[0].fromPerson).toBe('A');
      expect(chain[0].toPerson).toBe('B');
    });
  });

  describe('getCaseStats', () => {
    it('should count evidence by type and status for a case', () => {
      const caseId = useForensicsStore.getState().createCase(
        'CS001', 'Stats Case', 'd', 'critical', 'Det.', 'FBI'
      );
      useForensicsStore.getState().addEvidence(caseId, 'S1', 'Physical', 'd', 'physical', 'Scene', 'A', '2024-01-01T00:00:00Z', '');
      const ev2 = useForensicsStore.getState().addEvidence(caseId, 'S2', 'Digital', 'd', 'digital', 'Lab', 'B', '2024-01-02T00:00:00Z', '');
      useForensicsStore.getState().addEvidence(caseId, 'S3', 'Bio', 'd', 'biological', 'Hospital', 'C', '2024-01-03T00:00:00Z', '');
      useForensicsStore.getState().updateEvidence(ev2, { status: 'in-lab' });
      const stats = useForensicsStore.getState().getCaseStats(caseId);
      expect(stats.totalEvidence).toBe(3);
      expect(stats.byType.physical).toBe(1);
      expect(stats.byType.digital).toBe(1);
      expect(stats.byType.biological).toBe(1);
      expect(stats.byStatus.collected).toBe(2);
      expect(stats.byStatus['in-lab']).toBe(1);
    });

    it('should return zeroed stats for case with no evidence', () => {
      const caseId = useForensicsStore.getState().createCase(
        'CS002', 'Empty Stats', 'd', 'low', 'Det.', 'FBI'
      );
      const stats = useForensicsStore.getState().getCaseStats(caseId);
      expect(stats.totalEvidence).toBe(0);
      expect(stats.byType.physical).toBe(0);
      expect(stats.byStatus.collected).toBe(0);
    });
  });

  describe('default state', () => {
    it('should have empty records and null activeCaseId', () => {
      const s = useForensicsStore.getState();
      expect(Object.keys(s.cases)).toHaveLength(0);
      expect(Object.keys(s.evidence)).toHaveLength(0);
      expect(Object.keys(s.chainEntries)).toHaveLength(0);
      expect(Object.keys(s.reports)).toHaveLength(0);
      expect(s.activeCaseId).toBeNull();
    });
  });
});
