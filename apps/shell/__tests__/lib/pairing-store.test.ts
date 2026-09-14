import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getOrCreateSession,
  approveSession,
  peekSession,
  recordPairingFailure,
  isValidPin,
  PAIRING_TTL_MS,
} from '@/lib/pairing-store';

describe('Pairing Store (memory fallback)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('validates PIN format', () => {
    expect(isValidPin('ABC234')).toBe(true);
    expect(isValidPin('7X9K25')).toBe(true);
    expect(isValidPin('abc234')).toBe(false); // lowercase
    expect(isValidPin('A2C23')).toBe(false); // too short
    expect(isValidPin('1BC234')).toBe(false); // 0/1 excluded
    expect(isValidPin(123456)).toBe(false);
  });

  it('creates a waiting session with TTL', async () => {
    const session = await getOrCreateSession('ABC234');
    expect(session).not.toBeNull();
    expect(session!.status).toBe('waiting');
    expect(session!.pin).toBe('ABC234');

    const ttl =
      new Date(session!.expiresAt).getTime() -
      new Date(session!.createdAt).getTime();
    expect(ttl).toBe(PAIRING_TTL_MS);
  });

  it('expires sessions after the TTL', async () => {
    const pin = 'XYZ789';
    await getOrCreateSession(pin);
    expect(await peekSession(pin)).not.toBeNull();

    vi.advanceTimersByTime(PAIRING_TTL_MS + 1000);
    expect(await peekSession(pin)).toBeNull();

    // Re-poll after expiry creates a fresh waiting session
    const fresh = await getOrCreateSession(pin);
    expect(fresh!.status).toBe('waiting');
  });

  it('approves a waiting session exactly once', async () => {
    const pin = 'QWE456';
    await getOrCreateSession(pin);

    const approved = await approveSession(pin, {
      workspace: 'Continua OS',
      userId: 'user-1',
      capabilityToken: 'tok',
      capabilityTokenHash: 'hash',
    });
    expect(approved!.status).toBe('approved');
    expect(approved!.capabilityToken).toBe('tok');

    // Second approval is rejected
    const again = await approveSession(pin, { capabilityToken: 'tok2' });
    expect(again).toBeNull();
  });

  it('rejects approvals for expired or nonexistent sessions', async () => {
    expect(
      await approveSession('NOPE99', { capabilityToken: 't' })
    ).toBeNull();

    const pin = 'EXP234';
    await getOrCreateSession(pin);
    vi.advanceTimersByTime(PAIRING_TTL_MS + 1000);
    expect(await approveSession(pin, { capabilityToken: 't' })).toBeNull();
  });

  it('locks a PIN out after repeated failed approvals and destroys its session', async () => {
    const pin = 'LCK567';
    await getOrCreateSession(pin);

    for (let i = 0; i < 10; i++) {
      recordPairingFailure(pin);
    }

    // Locked out: lookups return null even though session existed
    expect(await peekSession(pin)).toBeNull();
    expect(await getOrCreateSession(pin)).toBeNull();
    expect(await approveSession(pin, { capabilityToken: 't' })).toBeNull();
  });

  it('does not lock out before the failure cap', async () => {
    const pin = 'OKL234';
    await getOrCreateSession(pin);

    for (let i = 0; i < 9; i++) {
      recordPairingFailure(pin);
    }
    expect(await peekSession(pin)).not.toBeNull();

    // Failure window lapses without hitting the cap
    vi.advanceTimersByTime(11 * 60 * 1000);
    expect(await getOrCreateSession(pin)).not.toBeNull();
  });
});
