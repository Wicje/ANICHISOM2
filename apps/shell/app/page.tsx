/**
 * Continua landing — product front door (ADR-009: shell is backend-only,
 * but / and /download are the distribution surface for the browser).
 * Server component, no client JS: hero, features, platform CTAs.
 */
import Link from 'next/link';

const FEATURES = [
  { title: 'Work ↔ Personal profiles', desc: 'Separate cookies, history, tabs and extensions per profile. Switching is one keypress.' },
  { title: 'Continuity without the tax', desc: 'Sessions autosave locally and delta-sync over TLS. Pick up exactly where you left off, on any machine.' },
  { title: 'Local tab intelligence', desc: 'On-device group suggestions, sleeping tabs with wake-on-click, per-tab memory. No cloud AI reading your tabs.' },
  { title: 'Make it yours', desc: 'Theme gallery, per-profile worlds, custom search engines, remappable shortcuts, per-site zoom memory.' },
  { title: 'Tabs that stay alive', desc: 'Pooled views with paint-aware switching — no white flash, no black canvas on heavy pages.' },
  { title: 'Daily-driver kit', desc: 'Command palette, omnibox, reader mode, downloads manager, history search, bookmark import, extensions.' },
];

const PLATFORMS = [
  { os: 'Windows', file: 'Continua-Setup-0.3.1.exe', note: 'Windows 10 & 11' },
  { os: 'Linux', file: 'Continua-0.3.1.AppImage', note: 'AppImage · deb available' },
  { os: 'macOS', file: 'Continua-0.3.1-arm64.dmg', note: 'Apple Silicon & Intel' },
];

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#000',
        color: '#f5f5f7',
        fontFamily: '-apple-system, Inter, sans-serif',
        padding: '0 24px 64px',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 0' }}>
          <span style={{ fontWeight: 800, fontSize: 17 }}>Continua</span>
          <div style={{ display: 'flex', gap: 18, fontSize: 14 }}>
            <Link href="/download" style={{ color: '#f5f5f7', textDecoration: 'none' }}>Download</Link>
            <Link href="/connect" style={{ color: '#86868b', textDecoration: 'none' }}>Pair a device</Link>
            <a href="https://github.com/Wicje/ANICHISOM2" style={{ color: '#86868b', textDecoration: 'none' }}>GitHub</a>
          </div>
        </nav>

        <section style={{ textAlign: 'center', padding: '72px 0 40px' }}>
          <p style={{ color: '#2997ff', fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>v0.3.1 · Windows · Linux · macOS</p>
          <h1 style={{ fontSize: 56, lineHeight: 1.05, letterSpacing: -1.5, margin: '16px 0' }}>
            Pick up exactly<br />where you left off.
          </h1>
          <p style={{ color: '#86868b', fontSize: 18, maxWidth: 600, margin: '0 auto 32px', lineHeight: 1.6 }}>
            Continua is the continuity browser — your tabs, history and workspaces
            follow you across machines. No account needed. No cloud AI reading your tabs.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/download"
              style={{ background: '#0071e3', color: '#fff', borderRadius: 980, padding: '13px 30px', fontSize: 16, fontWeight: 600, textDecoration: 'none' }}
            >
              Download free
            </Link>
            <a
              href="https://github.com/Wicje/ANICHISOM2"
              style={{ border: '1px solid #2c2c2e', color: '#f5f5f7', borderRadius: 980, padding: '13px 30px', fontSize: 16, textDecoration: 'none' }}
            >
              Star on GitHub
            </a>
          </div>
          <p style={{ color: '#6e6e73', fontSize: 12, marginTop: 16 }}>Free forever for local use · sync pairs with your own backend</p>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 16, marginTop: 24 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ background: '#161617', border: '1px solid #2c2c2e', borderRadius: 12, padding: 22 }}>
              <h3 style={{ fontSize: 16, margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ color: '#86868b', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </section>

        <section style={{ textAlign: 'center', marginTop: 56 }}>
          <h2 style={{ fontSize: 28, margin: '0 0 8px' }}>Get it for your machine</h2>
          <p style={{ color: '#86868b', fontSize: 14, marginBottom: 20 }}>Signed by no one, loved by tab hoarders. Unsigned builds: Windows SmartScreen → More info → Run anyway.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {PLATFORMS.map((p) => (
              <Link
                key={p.os}
                href="/download"
                style={{ border: '1px solid #2c2c2e', background: '#161617', color: '#f5f5f7', borderRadius: 12, padding: '14px 22px', textDecoration: 'none', minWidth: 200 }}
              >
                <div style={{ fontWeight: 700 }}>{p.os}</div>
                <div style={{ color: '#86868b', fontSize: 12, fontFamily: 'monospace' }}>{p.file}</div>
                <div style={{ color: '#6e6e73', fontSize: 12 }}>{p.note}</div>
              </Link>
            ))}
          </div>
        </section>

        <footer style={{ marginTop: 64, paddingTop: 24, borderTop: '1px solid #2c2c2e', display: 'flex', justifyContent: 'space-between', color: '#6e6e73', fontSize: 12, flexWrap: 'wrap', gap: 12 }}>
          <span>Continua — the continuity browser.</span>
          <span>
            <Link href="/api/health" style={{ color: '#2997ff' }}>API health</Link>
            {' · '}
            <a href="https://github.com/Wicje/ANICHISOM2" style={{ color: '#2997ff' }}>Source</a>
          </span>
        </footer>
      </div>
    </main>
  );
}
