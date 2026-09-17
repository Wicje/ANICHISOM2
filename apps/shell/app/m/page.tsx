'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { loadTabs, loadWorkspaces, openWorkspaceOnDesktop, pushTab, type MobileTab, type MobileWorkspace } from '@/lib/mobile-tabs';

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function MobileHome() {
  const [tabs, setTabs] = useState<MobileTab[]>([]);
  const [workspaces, setWorkspaces] = useState<MobileWorkspace[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'locked'>('loading');
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState('');
  const [canInstall, setCanInstall] = useState(false);
  const [deferred, setDeferred] = useState<Event | null>(null);

  const refresh = useCallback(async () => {
    setError('');
    try {
      setTabs(await loadTabs());
      try { setWorkspaces(await loadWorkspaces()); } catch { /* workspaces need a newer desktop */ }
      setState('ready');
    } catch (e) {
      setState(String((e as Error)?.message) === 'unauthorized' ? 'locked' : 'ready');
      if (String((e as Error)?.message) !== 'unauthorized') setError('Offline — showing last view. Pull to retry.');
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [refresh]);

  const send = async () => {
    if (!url.trim() || sending) return;
    setSending(true);
    setSent('');
    try {
      await pushTab(url);
      setUrl('');
      setSent('Sent — pull on your desktop to open it.');
      await refresh();
    } catch (e) {
      setError(String((e as Error)?.message || 'Send failed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <main style={styles.page}>
      <header style={styles.head}>
        <div>
          <div style={styles.brand}>Continua Tabs</div>
          <div style={styles.sub}>{state === 'ready' ? `${tabs.length} open on desktop` : '…'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canInstall && (
            <button
              style={styles.install}
              onClick={() => (deferred as unknown as { prompt: () => void })?.prompt?.()}
            >
              Install
            </button>
          )}
          <button style={styles.refresh} onClick={() => void refresh()} aria-label="Refresh">
            ↻
          </button>
        </div>
      </header>

      {state === 'locked' ? (
        <section style={styles.card}>
          <p style={styles.p}>Sign in on this phone to see your desktop tabs.</p>
          <a style={styles.primary} href="/auth">Sign in</a>
        </section>
      ) : (
        <>
          <section style={styles.card}>
            <div style={styles.label}>Send to desktop</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={styles.input}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void send(); }}
                placeholder="Paste a link…"
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
              />
              <button style={styles.primary} disabled={sending || !url.trim()} onClick={() => void send()}>
                {sending ? '…' : 'Send'}
              </button>
            </div>
            {sent && <p style={styles.ok}>{sent}</p>}
            {state === 'loading' && <p style={styles.p}>Loading tabs…</p>}
          </section>

          {error && <p style={styles.err}>{error}</p>}

          <section>
            {tabs.length === 0 && state === 'ready' ? (
              <p style={styles.p}>No open tabs. Anything you open on desktop shows up here.</p>
            ) : (
              <ul style={styles.list}>
                {tabs.map((t) => (
                  <li key={t.url} style={styles.row}>
                    <span style={styles.glyph}>{(t.title || hostOf(t.url))[0]?.toUpperCase()}</span>
                    <a href={t.url} style={styles.link}>
                      <span style={styles.title}>{t.title || hostOf(t.url)}</span>
                      <span style={styles.host}>{hostOf(t.url)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {workspaces.length > 0 && (
            <section style={{ marginTop: 20 }}>
              <div style={styles.label}>Workspaces</div>
              <ul style={styles.list}>
                {workspaces.map((w) => (
                  <li key={w.name} style={styles.row}>
                    <span style={styles.glyph}>▤</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.title}>{w.name}</div>
                      <div style={styles.host}>{w.tabs.length} tabs</div>
                    </div>
                    <button
                      style={styles.small}
                      onClick={() => void openWorkspaceOnDesktop(w).then(() => refresh()).catch(() => setError('Open failed'))}
                    >
                      Open
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100dvh', background: '#000', color: '#f5f5f7', padding: 'calc(env(safe-area-inset-top) + 20px) 16px 32px', fontFamily: '-apple-system, system-ui, sans-serif' },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  brand: { fontSize: 24, fontWeight: 700, letterSpacing: -0.5 },
  sub: { fontSize: 13, color: '#86868b', marginTop: 2 },
  refresh: { width: 40, height: 40, borderRadius: 20, border: '1px solid #2c2c2e', background: '#161617', color: '#f5f5f7', fontSize: 18 },
  install: { height: 40, padding: '0 16px', borderRadius: 20, border: 'none', background: '#0071e3', color: '#fff', fontWeight: 600, fontSize: 15 },
  small: { height: 36, padding: '0 16px', borderRadius: 18, border: '1px solid #0071e3', background: 'transparent', color: '#2997ff', fontWeight: 600, fontSize: 14 },
  card: { background: '#161617', border: '1px solid #2c2c2e', borderRadius: 12, padding: 16, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#86868b', marginBottom: 10 },
  input: { flex: 1, minWidth: 0, height: 44, borderRadius: 22, border: '1px solid #2c2c2e', background: '#000', color: '#f5f5f7', padding: '0 16px', fontSize: 16 },
  primary: { display: 'inline-flex', alignItems: 'center', height: 44, padding: '0 20px', borderRadius: 22, border: 'none', background: '#0071e3', color: '#fff', fontWeight: 600, fontSize: 16, textDecoration: 'none' },
  p: { fontSize: 15, color: '#86868b', lineHeight: 1.5, margin: '8px 0 0' },
  ok: { fontSize: 14, color: '#30d158', margin: '10px 0 0' },
  err: { fontSize: 14, color: '#ff9f0a', margin: '0 0 12px' },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 },
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 10 },
  glyph: { width: 36, height: 36, borderRadius: 9, background: '#2c2c2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flex: 'none' },
  link: { display: 'flex', flexDirection: 'column', minWidth: 0, textDecoration: 'none' },
  title: { color: '#f5f5f7', fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  host: { color: '#86868b', fontSize: 13 },
};
