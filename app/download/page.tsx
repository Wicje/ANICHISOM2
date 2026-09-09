'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, Apple, Monitor, Github, ChevronDown, Sun, Moon, CheckCircle2, Shield, Zap, FileDown, Package } from 'lucide-react';

type PlatformMeta = {
  name: string;
  note: string;
  artifact: string;
  url: string;
  size: number;
};

type Manifest = {
  product: string;
  release: { version: string; released: string; message: string };
  platforms: Record<'mac' | 'win' | 'linux', PlatformMeta>;
};

function useTheme() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const stored = localStorage.getItem('continuaos-theme-settings');
    if (stored) { try { const p = JSON.parse(stored); if (p.state?.colorMode === 'light') setDark(false); } catch {} }
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  const toggle = () => {
    const next = !dark; setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { const s = localStorage.getItem('continuaos-theme-settings'); if (s) { const p = JSON.parse(s); p.state = { ...p.state, colorMode: next ? 'dark' : 'light' }; localStorage.setItem('continuaos-theme-settings', JSON.stringify(p)); } } catch {}
  };
  return { dark, toggle };
}

function detectPlatform(): 'mac' | 'win' | 'linux' | 'other' {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/Mac/i.test(ua)) return 'mac';
  if (/Windows/i.test(ua)) return 'win';
  if (/Linux/i.test(ua)) return 'linux';
  return 'other';
}

function formatBytes(b: number) {
  if (!b) return '';
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(0)} MB`;
}

function Steps() {
  return (
    <div className="grid sm:grid-cols-3 gap-4 mt-10 text-left">
      {[
        { icon: Download, title: '1. Download & install', desc: 'Install like any desktop app. macOS dmgs may need right-click → Open (unsigned build).' },
        { icon: Zap, title: '2. Sign in once', desc: 'Continua syncs across every machine under your identity. No per-device setup.' },
        { icon: Shield, title: '3. Restore anywhere', desc: 'Sign into a fresh machine and your tabs, windows, and workspace state come back.' },
      ].map(s => (
        <div key={s.title} className="p-6 rounded-2xl glass-panel">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mb-4"><s.icon className="w-5 h-5" /></div>
          <h3 className="text-sm font-bold text-[var(--os-text)] mb-1.5">{s.title}</h3>
          <p className="text-xs text-[var(--os-text-muted)] leading-relaxed">{s.desc}</p>
        </div>
      ))}
    </div>
  );
}

export default function DownloadPage() {
  const { dark, toggle } = useTheme();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState('');
  const platform = detectPlatform();

  useEffect(() => {
    fetch('/downloads/manifest.json')
      .then(r => { if (!r.ok) throw new Error(`manifest lookup failed (${r.status})`); return r.json(); })
      .then(j => setManifest(j as Manifest))
      .catch(() => setError('Could not load download manifest.'));
  }, []);

  const platforms: ({ key: 'mac' | 'win' | 'linux'; icon: any }[]) = [
    { key: 'mac', icon: Apple },
    { key: 'win', icon: Monitor },
    { key: 'linux', icon: Github },
  ];

  const version = manifest?.release.version ?? '';

  return (
    <div className="min-h-screen bg-[var(--os-bg)] text-[var(--os-text)] font-sans selection:bg-primary/30 selection:text-primary overflow-x-hidden antialiased">
      {/* Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] bg-gradient-to-b from-primary/15 via-secondary/10 to-transparent rounded-full blur-[160px] opacity-60" />
        <div className="absolute top-[30%] -left-80 w-[800px] h-[800px] bg-secondary/8 rounded-full blur-[200px] opacity-40" />
        <div className="absolute top-[60%] -right-80 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[200px] opacity-40" />
      </div>

      {/* Navbar */}
      <header className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2.5rem)] max-w-6xl">
        <div className="px-5 py-3 rounded-full glass-panel">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary via-secondary to-teal-300 p-0.5 flex items-center justify-center">
                <div className="w-full h-full bg-[var(--os-bg)] rounded-[10px] flex items-center justify-center"><span className="text-primary font-black text-sm">C</span></div>
              </div>
              <span className="font-black text-sm tracking-tight">Continua</span>
            </Link>
            <div className="flex items-center gap-3">
              <button onClick={toggle} className="w-8 h-8 rounded-full bg-[var(--os-surface-elevated)] border border-[var(--os-border)] flex items-center justify-center text-[var(--os-text-muted)] hover:text-[var(--os-text)] transition-colors" aria-label="Toggle theme">
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <a href="mailto:hello@continuaos.cc" className="text-xs font-semibold text-primary hover:brightness-110 transition-colors hidden sm:flex items-center gap-1">Get Help <ChevronDown className="w-3 h-3 rotate-90" /></a>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-36 sm:pt-44 pb-24 px-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 glass-panel border-primary/40">
            <Download className="w-3.5 h-3.5 text-primary fill-primary" />
            <span className="text-xs font-bold tracking-widest text-primary uppercase font-mono">{version ? `v${version.replace(/^v/i, '')}` : 'Download'}</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.06] max-w-4xl mx-auto mb-6">
            One browser.<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-teal-300">Every machine.</span>
          </h1>
          <p className="text-base sm:text-lg text-[var(--os-text-muted)] max-w-2xl mx-auto">
            Download Continua for {platform === 'mac' ? 'macOS' : platform === 'win' ? 'Windows' : platform === 'linux' ? 'Linux' : 'your platform'}.
            Install once, sign in, and your workspace follows you.
          </p>
        </div>

        {/* Platform cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-4">
          {platforms.map(plat => {
            const meta = manifest?.platforms?.[plat.key];
            const primary = plat.key === platform;
            const hasBinary = Boolean(meta?.url);
            return (
              <div key={plat.key} className={`rounded-3xl p-8 glass-panel flex flex-col text-left relative overflow-hidden transition-all ${primary ? 'border-primary/50 shadow-2xl shadow-primary/10' : ''}`}>
                {primary && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-teal-300" />}
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl border flex items-center justify-center text-primary" style={{ background: 'var(--os-surface-elevated)', borderColor: 'var(--os-border)' }}><plat.icon className="w-6 h-6" /></div>
                  {primary && <span className="px-2.5 py-1 rounded-full bg-primary/15 border border-primary/40 text-[10px] font-bold text-primary uppercase tracking-wider font-mono">Your OS</span>}
                </div>
                <h3 className="text-xl font-bold mb-1">{meta?.name ?? plat.key}</h3>
                <p className="text-xs text-[var(--os-text-muted)] mb-1 font-mono">{meta?.artifact ?? plat.key}</p>
                <p className="text-xs text-[var(--os-text-muted)] mb-6">{meta?.note ?? '—'}</p>
                <div className="mt-auto">
                  {hasBinary ? (
                    <a href={meta!.url} className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/25 hover:brightness-110 transition-all">
                      <FileDown className="w-4 h-4" /> Download{version ? ` v${version.replace(/^v/i, '')}` : ''} <span className="font-mono text-[10px] opacity-80">{formatBytes(meta!.size)}</span>
                    </a>
                  ) : (
                    <button disabled className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm bg-[var(--os-surface-elevated)] text-[var(--os-text-muted)] border border-[var(--os-border)] cursor-not-allowed">
                      <Package className="w-4 h-4" /> Coming soon
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {error && <p className="text-center text-xs text-[var(--os-text-muted)] mb-8">{error} Emails us at <a href="mailto:hello@continuaos.cc" className="text-primary underline">hello@continuaos.cc</a> for the installer.</p>}

        {/* Steps */}
        <Steps />

        {/* Requirements */}
        <div className="mt-12 rounded-3xl glass-panel p-8">
          <div className="grid sm:grid-cols-2 gap-6 text-left">
            <div>
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" />Release notes</h4>
              <ul className="space-y-2 text-xs text-[var(--os-text-muted)] leading-relaxed">
                <li>• Latest release: {version ? `v${version.replace(/^v/i, '')}` : 'checking…'} {manifest?.release.released ? `(${manifest.release.released})` : ''}</li>
                <li>• {manifest?.release.message ?? 'No release notes yet.'}</li>
                <li>• macOS builds are unsigned — right-click &gt; <b>Open</b> on first launch</li>
                <li>• Point the desktop app at your own backend any time via the command palette</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />Guest mode, no install</h4>
              <p className="text-xs text-[var(--os-text-muted)] leading-relaxed mb-3">No desktop app handy? Continua&apos;s guest mode runs entirely in the browser — no installation, no trace left behind. Perfect for borrowed or public computers.</p>
              <ul className="flex flex-wrap gap-2">
                <li className="px-3 py-1 rounded-full bg-[var(--os-surface-elevated)] border border-[var(--os-border)] text-[10px] font-mono font-bold text-primary">Zero-Install</li>
                <li className="px-3 py-1 rounded-full bg-[var(--os-surface-elevated)] border border-[var(--os-border)] text-[10px] font-mono font-bold text-primary">Origin-Isolated Sandbox</li>
                <li className="px-3 py-1 rounded-full bg-[var(--os-surface-elevated)] border border-[var(--os-border)] text-[10px] font-mono font-bold text-primary">Encrypted Memory</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}