import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  signCapabilityToken,
  verifyCapabilityToken,
  CAPABILITY_TTL_SECONDS,
} from '@/lib/capability-token';

describe('Capability Tokens', () => {
  it('round-trips a signed token into claims', async () => {
    const { token, expiresAt } = await signCapabilityToken({
      sub: 'user-123',
      ws: 'Continua OS',
    });

    expect(token).toBeTruthy();
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());

    const claims = await verifyCapabilityToken(token);
    expect(claims).not.toBeNull();
    expect(claims!.sub).toBe('user-123');
    expect(claims!.ws).toBe('Continua OS');
  });

  it('rejects tampered tokens', async () => {
    const { token } = await signCapabilityToken({ sub: 'user-123', ws: 'ws' });
    const parts = token.split('.');
    // Flip payload content
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString());
    payload.sub = 'attacker';
    parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const tampered = parts.join('.');

    expect(await verifyCapabilityToken(tampered)).toBeNull();
  });

  it('rejects garbage and missing tokens', async () => {
    expect(await verifyCapabilityToken(null)).toBeNull();
    expect(await verifyCapabilityToken(undefined)).toBeNull();
    expect(await verifyCapabilityToken('')).toBeNull();
    expect(await verifyCapabilityToken('not.a.jwt')).toBeNull();
    // Supabase access tokens are not capability tokens
    expect(await verifyCapabilityToken('tok_mobile_key_active')).toBeNull();
  });

  it('defaults the workspace scope when absent', async () => {
    const { token } = await signCapabilityToken({
      sub: 'user-123',
      ws: '',
    });
    const claims = await verifyCapabilityToken(token);
    expect(claims!.ws).toBe('Continua OS');
  });

  it('uses a 60 minute TTL', async () => {
    expect(CAPABILITY_TTL_SECONDS).toBe(60 * 60);
    const { expiresAt } = await signCapabilityToken({ sub: 'u', ws: 'w' });
    const deltaMs = new Date(expiresAt).getTime() - Date.now();
    expect(deltaMs).toBeGreaterThan((60 * 60 - 10) * 1000);
    expect(deltaMs).toBeLessThanOrEqual(60 * 60 * 1000);
  });
});
