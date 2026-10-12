import Link from 'next/link';

// Continua landing — Apple reference (apps/desktop/DESIGN.md), dark-first.
// Window #000, cards #161617, text #f5f5f7, secondary #86868b,
// hairlines rgba(255,255,255,0.12), one blue #0071e3 (links #2997ff on dark).
// Pills for actions, 8px cards, borders not shadows, no glass, no gradients.
// Product proof is real screenshots, not mockups.

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

const BG = '#000';
const CARD = '#161617';
const TEXT = '#f5f5f7';
const MUTED = '#86868b';
const LINE = 'rgba(255,255,255,0.12)';
const BLUE = '#0071e3';
const LINK = '#2997ff';
const FONT = '-apple-system, "SF Pro Display", "SF Pro Text", Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', background: BG, color: TEXT, fontFamily: FONT, padding: '0 24px 64px' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 0', borderBottom: `1px solid ${LINE}` }}>
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: -0.3 }}>Continua</span>
          <div style={{ display: 'flex', gap: 8, fontSize: 14, alignItems: 'center' }}>
            <Link href="/download" style={{ background: BLUE, color: '#fff', textDecoration: 'none', borderRadius: 980, padding: '8px 20px', fontWeight: 600, minHeight: 36, display: 'inline-flex', alignItems: 'center' }}>Download</Link>
            <Link href="/connect" style={{ color: LINK, textDecoration: 'none', padding: '8px 12px' }}>Pair a device</Link>
            <a href="https://github.com/Wicje/ANICHISOM2" style={{ color: LINK, textDecoration: 'none', padding: '8px 12px' }}>GitHub</a>
          </div>
        </nav>

        <section style={{ textAlign: 'center', padding: '88px 0 56px' }}>
          <p style={{ color: MUTED, fontSize: 13, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase' }}>v0.4.0 · Windows · Linux · macOS</p>
          <h1 style={{ fontSize: 52, lineHeight: 1.08, letterSpacing: -1.2, margin: '20px 0', fontWeight: 700 }}>
            Pick up exactly<br />where you left off.
          </h1>
          <p style={{ color: MUTED, fontSize: 18, maxWidth: 600, margin: '0 auto 32px', lineHeight: 1.6 }}>
            Continua is the continuity browser — your tabs, history and workspaces
            follow you across machines. No account needed. No cloud AI reading your tabs.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/download"
              style={{ background: BLUE, color: '#fff', borderRadius: 980, padding: '13px 30px', fontSize: 16, fontWeight: 600, textDecoration: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
            >
              Download free
            </Link>
            <a
              href="https://github.com/Wicje/ANICHISOM2"
              style={{ background: 'transparent', color: LINK, border: `1px solid ${BLUE}`, borderRadius: 980, padding: '13px 30px', fontSize: 16, fontWeight: 600, textDecoration: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
            >
              Star on GitHub
            </a>
          </div>
          <p style={{ color: MUTED, fontSize: 12, marginTop: 16 }}>Free forever for local use · sync pairs with your own backend</p>
        </section>

        <section style={{ marginTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <figure style={{ margin: 0, background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, overflow: 'hidden' }}>
              <img src="/images/screenshots/browser-user.png" alt="Continua browser in User state" style={{ width: '100%', display: 'block' }} />
              <figcaption style={{ padding: '14px 18px', color: MUTED, fontSize: 13, borderTop: `1px solid ${LINE}` }}>User state — full browser chrome, start page with resume, memory and top sites.</figcaption>
            </figure>
            <figure style={{ margin: 0, background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, overflow: 'hidden' }}>
              <img src="/images/screenshots/browser-agent.png" alt="Continua browser in Agent state" style={{ width: '100%', display: 'block' }} />
              <figcaption style={{ padding: '14px 18px', color: MUTED, fontSize: 13, borderTop: `1px solid ${LINE}` }}>Agent state — approval queue, activity log, chat and permissions beside the page.</figcaption>
            </figure>
          </div>
        </section>

        {/* Demo video temporarily omitted: public/videos/continua-demo.mp4 is
            87MB and blocks deploys on slow connections. Restore this section
            (and the mp4) once on a fast link or Blob-hosted. Poster +
            screenshots above already carry the product proof. */}

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20, marginTop: 44 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, padding: '16px' }}>
              <h3 style={{ fontSize: 16, margin: '0 0 8px', fontWeight: 600 }}>{f.title}</h3>
              <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </section>

        <section style={{ textAlign: 'center', marginTop: 88 }}>
          <h2 style={{ fontSize: 28, margin: '0 0 8px', fontWeight: 700, letterSpacing: -0.5 }}>Get it for your machine</h2>
          <p style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>Unsigned builds: Windows SmartScreen → More info → Run anyway.</p>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            {PLATFORMS.map((p) => (
              <Link
                key={p.os}
                href="/download"
                style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, color: TEXT, padding: '16px 20px', textDecoration: 'none', minWidth: 220, textAlign: 'left' }}
              >
                <div style={{ fontWeight: 600 }}>{p.os}</div>
                <div style={{ color: MUTED, fontSize: 12, fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace' }}>{p.file}</div>
                <div style={{ color: MUTED, fontSize: 12 }}>{p.note}</div>
              </Link>
            ))}
          </div>
        </section>

        <footer style={{ marginTop: 88, paddingTop: 24, borderTop: `1px solid ${LINE}`, display: 'flex', justifyContent: 'space-between', color: MUTED, fontSize: 12, flexWrap: 'wrap', gap: 12 }}>
          <span>Continua — the continuity browser.</span>
          <span>
            <Link href="/api/health" style={{ color: LINK }}>API health</Link>
            {' · '}
            <a href="https://github.com/Wicje/ANICHISOM2" style={{ color: LINK }}>Source</a>
          </span>
        </footer>
      </div>
    </main>
  );
}
