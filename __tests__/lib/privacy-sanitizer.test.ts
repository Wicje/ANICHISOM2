import { describe, it, expect } from 'vitest';
import { sanitizeForPrivacy, createWorkContext } from '@/lib/context-kernel/graph';

function ctxWithTabs(urls: string[]) {
  const base = createWorkContext('proj-1', 'Project One', 'device-1');
  return {
    ...base,
    browserTabs: urls.map((url, i) => ({ id: `tab-${i}`, title: `T${i}`, url })),
  };
}

describe('Privacy Sanitizer', () => {
  it('returns null in private_session mode (zero sync)', () => {
    const ctx = ctxWithTabs(['https://example.com']);
    expect(sanitizeForPrivacy(ctx as never, 'private_session')).toBeNull();
  });

  it('strips credential-like query params in standard mode', () => {
    const ctx = ctxWithTabs([
      'https://app.example.com/dashboard?token=SECRET123&page=2',
      'https://api.service.com/v1/data?key=abc&auth=bearer&ok=1',
      'https://cloud.vendor.com/settings?api_key=xyz99',
    ]);

    const out = sanitizeForPrivacy(ctx as never, 'standard');
    expect(out).not.toBeNull();

    const urls = out!.browserTabs.map((t) => t.url);
    expect(urls[0]!).not.toContain('SECRET123');
    expect(urls[0]!).toContain('page=2'); // benign params survive

    expect(urls[1]!).not.toContain('key=abc');
    expect(urls[1]!).not.toContain('auth=bearer');
    expect(urls[1]!).toContain('ok=1');

    expect(urls[2]!).not.toContain('xyz99');
  });

  it('sanitizes identically in local_only mode', () => {
    const ctx = ctxWithTabs(['https://x.com/?token=t']);
    const out = sanitizeForPrivacy(ctx as never, 'local_only');
    expect(out!.browserTabs[0]!.url).not.toContain('token=t');
  });

  it('leaves malformed URLs untouched instead of throwing', () => {
    const base = createWorkContext('p', 'P', 'd');
    const broken = {
      ...base,
      browserTabs: [{ id: 't', title: 'bad', url: '::::not-a-url' }],
    };
    expect(() => sanitizeForPrivacy(broken as never, 'standard')).not.toThrow();
    expect(
      sanitizeForPrivacy(broken as never, 'standard')!.browserTabs[0]!.url
    ).toBe('::::not-a-url');
  });
});
