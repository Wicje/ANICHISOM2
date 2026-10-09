import Link from 'next/link';

const FEATURES = [
  { title: 'Work ↔ Personal profiles', desc: 'Separate cookies, history, tabs and extensions per profile. Switching is one keypress.' },
  { title: 'Continuity without the tax', desc: 'Sessions autosave locally and delta-sync over TLS. Pick up exactly where you left off, on any machine.' },
  { title: 'Local tab intelligence', desc: 'On-device group suggestions, sleeping tabs with wake-on-click, per-tab memory. No cloud AI reading your tabs.' },
  { title: 'Make it yours', desc: 'Theme gallery, per-profile worlds, custom search engines, remappable shortcuts, per-site zoom memory.' },
  { title: 'Tabs that stay alive', desc: 'Pooled views with paint-aware switching — no white flash, no black canvas on heavy pages.' },
  { title: 'Daily-driver kit', desc: 'Command palette, omnibox, reader mode, downloads manager, history search, bookmark import, extensions.' },
  { title: 'User and Agent states', desc: 'Browse normally in User state, or flip to Agent state: approval queue, activity log, agent chat and permissions in a side panel.' },
];

const PLATFORMS = [
  { os: 'Windows', file: 'Continua-Setup-0.4.0.exe', note: 'Windows 10 & 11' },
  { os: 'Linux', file: 'Continua-0.4.0.AppImage', note: 'AppImage · deb available' },
  { os: 'macOS', file: 'Continua-0.4.0-arm64.dmg', note: 'Apple Silicon & Intel' },
];

const NEU_CARD = {
  background: '#eef2f7',
  borderRadius: 20,
  boxShadow: '0 24px 50px -8px rgba(140,156,184,0.42), 0 10px 20px -5px rgba(140,156,184,0.2), inset 0 1px 1px rgba(255,255,255,0.9)',
} as const;

const NEU_BTN = {
  background: '#eef2f7',
  boxShadow: '4px 4px 9px rgba(156,171,197,0.38), -4px -4px 9px rgba(255,255,255,0.88)',
} as const;

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#e9ecf2',
        color: '#1e293b',
        fontFamily: '-apple-system, Inter, sans-serif',
        padding: '0 24px 64px',
      }}
    >
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 0' }}>
          <span style={{ fontWeight: 800, fontSize: 17 }}>Continua</span>
          <div style={{ display: 'flex', gap: 10, fontSize: 14, alignItems: 'center' }}>
            <Link href="/download" style={{ ...NEU_BTN, color: '#1e293b', textDecoration: 'none', borderRadius: 980, padding: '8px 20px', fontWeight: 600 }}>Download</Link>
            <Link href="/connect" style={{ color: '#64748b', textDecoration: 'none', padding: '8px 12px' }}>Pair a device</Link>
            <a href="https://github.com/Wicje/ANICHISOM2" style={{ color: '#64748b', textDecoration: 'none', padding: '8px 12px' }}>GitHub</a>
          </div>
        </nav>

        <section style={{ textAlign: 'center', padding: '56px 0 40px' }}>
          <p style={{ color: '#1d4ed8', fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>v0.4.0 · Windows · Linux · macOS</p>
          <h1 style={{ fontSize: 56, lineHeight: 1.05, letterSpacing: -1.5, margin: '16px 0' }}>
            Pick up exactly<br />where you left off.
          </h1>
          <p style={{ color: '#64748b', fontSize: 18, maxWidth: 600, margin: '0 auto 32px', lineHeight: 1.6 }}>
            Continua is the continuity browser — your tabs, history and workspaces
            follow you across machines. No account needed. No cloud AI reading your tabs.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/download"
              style={{ background: '#2563eb', color: '#fff', borderRadius: 980, padding: '13px 30px', fontSize: 16, fontWeight: 600, textDecoration: 'none', boxShadow: '0 12px 28px -8px rgba(37,99,235,0.55)' }}
            >
              Download free
            </Link>
            <a
              href="https://github.com/Wicje/ANICHISOM2"
              style={{ ...NEU_BTN, color: '#1e293b', borderRadius: 980, padding: '13px 30px', fontSize: 16, fontWeight: 600, textDecoration: 'none' }}
            >
              Star on GitHub
            </a>
          </div>
          <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 16 }}>Free forever for local use · sync pairs with your own backend</p>
        </section>

        <section style={{ marginTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <figure style={{ margin: 0, ...NEU_CARD, overflow: 'hidden' }}>
              <img src="/images/screenshots/browser-user.png" alt="Continua browser in User state" style={{ width: '100%', display: 'block' }} />
              <figcaption style={{ padding: '14px 18px', color: '#64748b', fontSize: 13 }}>User state — full browser chrome, start page with resume, memory and top sites.</figcaption>
            </figure>
            <figure style={{ margin: 0, ...NEU_CARD, overflow: 'hidden' }}>
              <img src="/images/screenshots/browser-agent.png" alt="Continua browser in Agent state" style={{ width: '100%', display: 'block' }} />
              <figcaption style={{ padding: '14px 18px', color: '#64748b', fontSize: 13 }}>Agent state — approval queue, activity log, chat and permissions beside the page.</figcaption>
            </figure>
          </div>
        </section>

        <section style={{ marginTop: 24 }}>
          <div style={{ ...NEU_CARD, overflow: 'hidden' }}>
            <video controls preload="metadata" poster="/images/screenshots/browser-user.png" style={{ width: '100%', display: 'block', background: '#0f172a' }}>
              <source src="/videos/continua-demo.mp4" type="video/mp4" />
            </video>
          </div>
          <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 12 }}>Watch Continua in action — User and Agent states, the tab rail, and the new start page.</p>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20, marginTop: 32 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ ...NEU_CARD, padding: 24 }}>
              <h3 style={{ fontSize: 16, margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </section>

        <section style={{ textAlign: 'center', marginTop: 56 }}>
          <h2 style={{ fontSize: 28, margin: '0 0 8px' }}>Get it for your machine</h2>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>Signed by no one, loved by tab hoarders. Unsigned builds: Windows SmartScreen → More info → Run anyway.</p>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            {PLATFORMS.map((p) => (
              <Link
                key={p.os}
                href="/download"
                style={{ ...NEU_CARD, color: '#1e293b', padding: '20px 26px', textDecoration: 'none', minWidth: 220, textAlign: 'left' }}
              >
                <div style={{ fontWeight: 700 }}>{p.os}</div>
                <div style={{ color: '#64748b', fontSize: 12, fontFamily: 'monospace' }}>{p.file}</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{p.note}</div>
              </Link>
            ))}
          </div>
        </section>

        <footer style={{ marginTop: 64, paddingTop: 24, borderTop: '1px solid rgba(100,116,139,0.25)', display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 12, flexWrap: 'wrap', gap: 12 }}>
          <span>Continua — the continuity browser.</span>
          <span>
            <Link href="/api/health" style={{ color: '#1d4ed8' }}>API health</Link>
            {' · '}
            <a href="https://github.com/Wicje/ANICHISOM2" style={{ color: '#1d4ed8' }}>Source</a>
          </span>
        </footer>
      </div>
    </main>
  );
}
