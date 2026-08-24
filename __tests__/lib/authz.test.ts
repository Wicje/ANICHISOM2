import { describe, expect, it } from 'vitest';
import {
  authorize,
  PERSONAL_DEFAULT_SCOPES,
  principalFromClaims,
  roleAtLeast,
} from '@/lib/authz';

const user = () => ({
  userId: 'u1',
  ws: 'Continua OS',
  scopes: [...PERSONAL_DEFAULT_SCOPES],
});

describe('roleAtLeast', () => {
  it('ranks member < admin < owner', () => {
    expect(roleAtLeast('member', 'member')).toBe(true);
    expect(roleAtLeast('admin', 'admin')).toBe(true);
    expect(roleAtLeast('owner', 'admin')).toBe(true);
    expect(roleAtLeast('member', 'admin')).toBe(false);
    expect(roleAtLeast('admin', 'owner')).toBe(false);
  });

  it('rejects unknown or missing roles', () => {
    expect(roleAtLeast(null, 'member')).toBe(false);
    expect(roleAtLeast(undefined, 'member')).toBe(false);
    expect(roleAtLeast('superuser', 'member')).toBe(false);
  });
});

describe('principalFromClaims', () => {
  it('v1 claims (no scopes) receive personal defaults', () => {
    const p = principalFromClaims({ sub: 'u1', ws: 'ws' });
    expect(p.scopes).toEqual(PERSONAL_DEFAULT_SCOPES);
    expect(p.orgId).toBeUndefined();
  });

  it('v2 claims keep explicit scopes and org', () => {
    const p = principalFromClaims({
      sub: 'u1',
      ws: 'ws',
      org: '11111111-1111-1111-1111-111111111111',
      scopes: ['context.read', 'proxy.invoke'],
    });
    expect(p.orgId).toBe('11111111-1111-1111-1111-111111111111');
    expect(p.scopes).toEqual(['context.read', 'proxy.invoke']);
  });

  it('drops unrecognized scopes (deny-by-default)', () => {
    const p = principalFromClaims({
      sub: 'u1',
      ws: 'ws',
      scopes: ['context.read', 'root.everything' as any],
    });
    expect(p.scopes).toEqual(['context.read']);
  });
});

describe('authorize — context resources', () => {
  it('allows an owner with context.write', () => {
    const decision = authorize(user(), 'context.write', {
      type: 'context',
      owner: 'u1',
      domain: 'theme',
    });
    expect(decision.ok).toBe(true);
  });

  it('denies writing into another person\'s graph (invariant 2)', () => {
    const decision = authorize(user(), 'context.write', {
      type: 'context',
      owner: 'someone-else',
    });
    expect(decision.ok).toBe(false);
  });

  it('denies without the required scope even when owner matches', () => {
    const p = { userId: 'u1', ws: 'w', scopes: ['context.read' as const] };
    expect(
      authorize(p, 'context.write', { type: 'context', owner: 'u1' }).ok
    ).toBe(false);
    expect(
      authorize(p, 'proxy.invoke', { type: 'proxy' }).ok
    ).toBe(false);
  });

  it('honors restricted v2 tokens', () => {
    const p = principalFromClaims({ sub: 'u1', ws: 'w', scopes: ['proxy.invoke'] });
    expect(authorize(p, 'proxy.invoke', { type: 'proxy' }).ok).toBe(true);
    expect(authorize(p, 'context.read', { type: 'context', owner: 'u1' }).ok).toBe(false);
  });

});

describe('authorize — org resources', () => {
  const orgId = '22222222-2222-2222-2222-222222222222';
  const resource = { type: 'org' as const, orgId };

  it('org.admin requires an admin/owner seat regardless of scopes', () => {
    const p = user();
    expect(authorize(p, 'org.admin', resource, { orgRole: 'member' }).ok).toBe(false);
    expect(authorize(p, 'org.admin', resource, { orgRole: 'admin' }).ok).toBe(true);
    expect(authorize(p, 'org.admin', resource, { orgRole: 'owner' }).ok).toBe(true);
    // A token claiming org powers is worthless without the seat:
    expect(authorize(p, 'org.admin', resource, { orgRole: null }).ok).toBe(false);
    expect(authorize(p, 'org.admin', resource).ok).toBe(false);
  });

  it('org.read passes for any seat but not strangers', () => {
    const p = user();
    expect(authorize(p, 'org.read', resource, { orgRole: 'member' }).ok).toBe(true);
    expect(authorize(p, 'org.read', resource, { orgRole: null }).ok).toBe(false);
  });
});
