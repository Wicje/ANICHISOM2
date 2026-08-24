import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  extractTokenFromRequest,
  signCapabilityToken,
  verifyCapabilityToken,
} from '@/lib/capability-token';

describe('capability token v2', () => {
  beforeEach(() => {
    vi.stubEnv('CAPABILITY_JWT_SECRET', 'test-secret-for-vitest');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('round-trips v1 claims (sub, ws only)', async () => {
    const { token } = await signCapabilityToken({ sub: 'u1', ws: 'Starknet' });
    const claims = await verifyCapabilityToken(token);
    expect(claims).not.toBeNull();
    expect(claims!.sub).toBe('u1');
    expect(claims!.ws).toBe('Starknet');
    expect(claims!.org).toBeUndefined();
    expect(claims!.scopes).toBeUndefined();
  });

  it('round-trips v2 org + scopes', async () => {
    const orgId = '33333333-3333-3333-3333-333333333333';
    const { token } = await signCapabilityToken({
      sub: 'u1',
      ws: 'ws',
      org: orgId,
      scopes: ['context.read', 'proxy.invoke'],
    });
    const claims = await verifyCapabilityToken(token);
    expect(claims!.org).toBe(orgId);
    expect(claims!.scopes).toEqual(['context.read', 'proxy.invoke']);
  });

  it('drops unknown scopes at mint (deny-by-default)', async () => {
    const { token } = await signCapabilityToken({
      sub: 'u1',
      ws: 'ws',
      scopes: ['context.read', 'kernel.root' as any],
    });
    const claims = await verifyCapabilityToken(token);
    expect(claims!.scopes).toEqual(['context.read']);
  });

  it('omits empty/absent optional claims entirely', async () => {
    const { token } = await signCapabilityToken({
      sub: 'u1',
      ws: 'ws',
      scopes: [],
    });
    const claims = await verifyCapabilityToken(token);
    expect(claims!.org).toBeUndefined();
    expect(claims!.scopes).toBeUndefined();
  });

  it('rejects tampered and expired tokens', async () => {
    const { token } = await signCapabilityToken(
      { sub: 'u1', ws: 'w' },
      { ttlSeconds: -10 }
    );
    expect(await verifyCapabilityToken(token)).toBeNull();

    const valid = await signCapabilityToken({ sub: 'u1', ws: 'w' });
    expect(await verifyCapabilityToken(valid.token + 'x')).toBeNull();
  });

  it('extracts from header or bearer', () => {
    const req = (headers: Record<string, string>) => new Request('https://x.test/', { headers });
    expect(extractTokenFromRequest(req({ 'x-capability-token': 'a' }))).toBe('a');
    expect(extractTokenFromRequest(req({ authorization: 'Bearer b' }))).toBe('b');
    expect(extractTokenFromRequest(req({}))).toBeNull();
  });
});
