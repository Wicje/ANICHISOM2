import { describe, expect, it } from 'vitest';
import {
  classifyImportance,
  IMPORTANCE,
  isJournalEvent,
  JOURNAL_EVENT_KINDS,
  makeJournalEvent,
  MIN_SYNC_IMPORTANCE,
} from '@/lib/journal/envelope';

describe('journal envelope (S4)', () => {
  it('classifies kinds deterministically', () => {
    expect(classifyImportance('git.commit')).toBe(IMPORTANCE.MILESTONE);
    expect(classifyImportance('session.end')).toBe(IMPORTANCE.CHECKPOINT);
    expect(classifyImportance('app.focus')).toBe(IMPORTANCE.LOW);
    expect(classifyImportance('window.title')).toBe(IMPORTANCE.NOISE);
  });

  it('every kind has a classification and sync bar stays below session.end', () => {
    for (const kind of JOURNAL_EVENT_KINDS) {
      const imp = classifyImportance(kind);
      expect(imp).toBeGreaterThanOrEqual(0);
      expect(imp).toBeLessThanOrEqual(4);
    }
    expect(MIN_SYNC_IMPORTANCE).toBe(3);
    expect(classifyImportance('session.end')).toBeGreaterThanOrEqual(MIN_SYNC_IMPORTANCE);
  });

  it('makeJournalEvent fills defaults and truncates long project tags', () => {
    const ev = makeJournalEvent({
      device: 'daemon-x',
      kind: 'git.commit',
      projectTag: 'p'.repeat(400),
      payload: { subject: 'feat: thing' },
    });
    expect(ev.id).toBeTruthy();
    expect(ev.ts).toBeGreaterThan(0);
    expect(ev.importance).toBe(3); // classified, not provided
    expect(ev.projectTag!.length).toBe(256);
    expect(isJournalEvent(ev)).toBe(true);
  });

  it('accepts explicit importance overrides (checkpoint.manual)', () => {
    const ev = makeJournalEvent({ device: 'd', kind: 'window.title', importance: 4 });
    expect(ev.importance).toBe(4);
  });

  describe('isJournalEvent rejects malformed wire input', () => {
    const base = {
      id: 'abc',
      ts: 1756000000000,
      device: 'daemon-1',
      kind: 'git.commit',
      importance: 3,
    };

    it('accepts the minimal valid event', () => {
      expect(isJournalEvent(base)).toBe(true);
    });

    it.each([
      ['missing id', { ...base, id: undefined }],
      ['empty id', { ...base, id: '' }],
      ['oversized id', { ...base, id: 'x'.repeat(200) }],
      ['zero ts', { ...base, ts: 0 }],
      ['non-finite ts', { ...base, ts: Number.NaN }],
      ['unknown kind', { ...base, kind: 'screen.record' }],
      ['importance 5', { ...base, importance: 5 }],
      ['fractional importance', { ...base, importance: 2.5 }],
      ['negative device', { ...base, device: '' }],
      ['array payload', { ...base, payload: [] }],
      ['oversized projectTag', { ...base, projectTag: 'y'.repeat(300) }],
      ['not an object', 'git.commit'],
      ['null', null],
    ])('%s', (_label, bad) => {
      expect(isJournalEvent(bad)).toBe(false);
    });
  });
});
