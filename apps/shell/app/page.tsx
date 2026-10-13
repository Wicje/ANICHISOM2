import Link from 'next/link';

// Continua landing — Cursor-reference layout (docs: FireShot "my ref.png"),
// Apple tokens (apps/desktop/DESIGN.md), dark-first.
// Window #000, cards #161617, text #f5f5f7, secondary #86868b,
// hairlines rgba(255,255,255,0.12), one blue #0071e3 (links #2997ff on dark).
// Pills for actions, 8px cards, borders not shadows, no glass, no gradients.
// Product proof is real browser screenshots (public/images/screenshots/).

const FEATURES = [
  { title: 'Work ↔ Personal profiles', desc: 'Separate cookies, history, tabs and extensions per profile. Switching is one keypress.' },
  { title: 'Continuity without the tax', desc: 'Sessions autosave locally and delta-sync over TLS. Pick up exactly where you left off, on any machine.' },
  { title: 'Local tab intelligence', desc: 'On-device group suggestions, sleeping tabs with wake-on-click, per-tab memory. No cloud AI reading your tabs.' },
  { title: 'Make it yours', desc: 'Theme gallery, per-profile worlds, custom search engines, remappable shortcuts, per-site zoom memory.' },
  { title: 'Tabs that stay alive', desc: 'Pooled views with paint-aware switching — no white flash, no black canvas on heavy pages.' },
  { title: 'Daily-driver kit', desc: 'Command palette, omnibox, reader mode, downloads manager, history search, bookmark import, extensions.' },
];

const STRIP = [
  'Chromium-compatible',
  '6 live views',
  'Local-first sync',
  'On-device intelligence',
  'No account needed',
  'Chrome extensions',
];

const BLOCKS = [
  {
    eyebrow: 'Tabs that stay alive',
    title: 'Switch tabs instantly. No white flash.',
    desc: 'Pooled Chromium views (6 live, LRU discard to metadata). Live tabs switch instantly; discarded tabs rehydrate swap-on-ready with per-tab back-history, scroll, zoom and container intact.',
    link: { label: 'Get the browser', href: '/download' },
    img: '/images/screenshots/browser-user.png',
    alt: 'Continua browser in User state — start page with resume, memory and top sites',
    caption: 'User state — full browser chrome, start page with resume, memory and top sites.',
    flip: false,
  },
  {
    eyebrow: 'Agent trust boundary',
    title: 'Agents read freely. Writes need your grant.',
    desc: 'Every automated write goes through an action-bound, single-use grant you issue — page content can never approve itself. Allowed or denied, each decision lands in an append-only hash-chained log you can verify and export.',
    link: { label: 'See the Agent state', href: '/download' },
    img: '/images/screenshots/browser-agent.png',
    alt: 'Continua browser in Agent state — approval queue beside the page',
    caption: 'Agent state — approval queue, activity log, chat and permissions beside the page.',
    flip: true,
  },
  {
    eyebrow: 'Daily-driver kit',
    title: 'Command palette over everything.',
    desc: 'Ctrl+K runs the browser: tabs, bookmarks, sessions, screenshots, read-aloud, translate, managers, sync. Omnibox suggestions, find-in-page, reader mode and per-tab zoom and mute badges stay one keypress away.',
    link: { label: 'Pair a device', href: '/connect' },
    img: '/images/screenshots/browser-palette.png',
    alt: 'Continua command palette — fuzzy search over tabs, bookmarks and actions',
    caption: 'Command palette — fuzzy search over tabs, bookmarks, sessions and actions.',
    flip: false,
  },
  {
    eyebrow: 'Make it yours',
    title: 'Themes, engines, shortcuts, per-site memory.',
    desc: 'Theme gallery (Midnight, Forest, Ocean, Sunset, Grape, Mono), custom search engines, remappable shortcuts, per-site zoom and mute memory, vertical tab rail, pinned workspaces and speed-dial top sites.',
    link: { label: 'Browse the help', href: '/help' },
    img: '/images/screenshots/browser-settings.png',
    alt: 'Continua settings — search engine, theme gallery, density and reader options',
    caption: 'Settings — search engine, theme gallery, density, reader and sync.',
    flip: true,
  },
];

const EQUIPPED = [
  {
    img: '/images/screenshots/browser-managers.png',
    alt: 'Continua managers — agent audit log with sessions and approval stats',
    title: 'Audit every agent decision',
    desc: 'Managers → Agent audit: the hash-chained log, sessions restored, approval rate and pending grants.',
  },
  {
    img: '/images/screenshots/browser-reading.png',
    alt: 'Continua reading list panel beside the start page',
    title: 'Reading list that persists',
    desc: 'Save any page to the read-later list from the palette or right-click. Per profile, synced with continuity.',
  },
  {
    img: '/images/screenshots/browser-agent-dark.png',
    alt: 'Continua agent panel — approvals, activity, chat and permissions',
    title: 'Agent state beside the page',
    desc: 'Flip from User to Agent: the approval queue, activity feed, agent chat and permissions dock on the right.',
  },
];

const CHANGELOG = [
  { date: 'v0.4.0', title: 'Chromium builds for every OS', desc: 'Windows setup, Linux AppImage/deb, macOS dmg — published to GitHub Releases.' },
  { date: 'Sync', title: 'Continuity backend live', desc: '/api/health → 200. Point the browser at your backend under Settings → Sync.' },
  { date: 'ADR-012', title: 'Agent trust boundary', desc: 'Single-use grants plus the hash-chained audit log. Reads free, writes approved.' },
  { date: 'Source', title: 'Open development', desc: 'Roadmap, decisions and strategy live in the repo. Star and follow along.' },
];

const HIGHLIGHTS = [
  { tag: 'Strategy', title: 'What we build, what we refuse', desc: 'The agent trust boundary, continuity and the chosen workflow get everything. The 12 mediums are parity maintenance.', meta: 'docs/STRATEGY.md · 5 min read' },
  { tag: 'Agent track', title: 'An agent boundary you can audit', desc: 'Read any tab freely; every write needs a human-issued grant. Every decision lands in the verifiable log.', meta: 'docs/AGENT_TRACK.md · 8 min read' },
  { tag: 'Decision', title: 'ADR-012: the trust boundary', desc: 'Why approved:true from a caller is ignored, why sync keys are user-only, and what can never be bypassed.', meta: 'docs/decisions · 6 min read' },
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

function Shot({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure style={{ margin: 0, background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, overflow: 'hidden' }}>
      <img src={src} alt={alt} style={{ width: '100%', display: 'block' }} />
      {caption ? (
        <figcaption style={{ padding: '14px 18px', color: MUTED, fontSize: 13, borderTop: `1px solid ${LINE}` }}>
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', background: BG, color: TEXT, fontFamily: FONT, padding: '0 24px 64px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        {/* Nav — Cursor ref: logo left, links center, actions right */}
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '22px 0', borderBottom: `1px solid ${LINE}`, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: -0.3 }}>Continua</span>
          <div style={{ display: 'flex', gap: 4, fontSize: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="#features" style={{ color: MUTED, textDecoration: 'none', padding: '8px 12px' }}>Features</a>
            <a href="#agent" style={{ color: MUTED, textDecoration: 'none', padding: '8px 12px' }}>Agent</a>
            <Link href="/download" style={{ color: MUTED, textDecoration: 'none', padding: '8px 12px' }}>Download</Link>
            <a href="https://github.com/Wicje/ANICHISOM2" style={{ color: MUTED, textDecoration: 'none', padding: '8px 12px' }}>GitHub</a>
          </div>
          <div style={{ display: 'flex', gap: 8, fontSize: 14, alignItems: 'center' }}>
            <Link href="/connect" style={{ color: LINK, textDecoration: 'none', padding: '8px 12px' }}>Pair a device</Link>
            <Link href="/download" style={{ background: BLUE, color: '#fff', textDecoration: 'none', borderRadius: 980, padding: '8px 20px', fontWeight: 600, minHeight: 36, display: 'inline-flex', alignItems: 'center' }}>Download</Link>
          </div>
        </nav>

        {/* Hero — Cursor ref: headline, dual CTA, large overlapping product shots */}
        <section style={{ textAlign: 'center', padding: '88px 0 48px' }}>
          <p style={{ color: MUTED, fontSize: 13, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase' }}>v0.4.0 · Windows · Linux · macOS</p>
          <h1 style={{ fontSize: 52, lineHeight: 1.08, letterSpacing: -1.2, margin: '20px 0', fontWeight: 700 }}>
            Pick up exactly<br />where you left off.
          </h1>
          <p style={{ color: MUTED, fontSize: 18, maxWidth: 620, margin: '0 auto 32px', lineHeight: 1.6 }}>
            Continua is the continuity browser — your tabs, history and workspaces
            follow you across machines. No account needed. No cloud AI reading your tabs.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/download"
              style={{ background: BLUE, color: '#fff', borderRadius: 980, padding: '13px 30px', fontSize: 16, fontWeight: 600, textDecoration: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
            >
              Download for your OS
            </Link>
            <a
              href="#agent"
              style={{ background: 'transparent', color: LINK, border: `1px solid ${BLUE}`, borderRadius: 980, padding: '13px 30px', fontSize: 16, fontWeight: 600, textDecoration: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
            >
              See the Agent state
            </a>
          </div>
          <p style={{ color: MUTED, fontSize: 12, marginTop: 16 }}>Free forever for local use · sync pairs with your own backend</p>
        </section>

        {/* Hero shots — overlapping windows like the Cursor ref hero */}
        <section style={{ position: 'relative', marginTop: 8 }}>
          <Shot
            src="/images/screenshots/browser-start-dark.png"
            alt="Continua browser — User state start page with resume, memory and top sites"
            caption="User state — full browser chrome, start page with resume, memory and top sites."
          />
          <div style={{ maxWidth: 460, marginLeft: 'auto', marginTop: -72, position: 'relative', paddingLeft: 24 }}>
            <Shot
              src="/images/screenshots/browser-agent-dark.png"
              alt="Continua browser — Agent state with approval queue"
              caption="Agent state — approval queue, activity log, chat and permissions beside the page."
            />
          </div>
        </section>

        {/* Proof strip — Cursor ref logo row, ours is capability badges */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 56 }}>
          {STRIP.map((s) => (
            <div key={s} style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, padding: '14px 12px', textAlign: 'center', color: MUTED, fontSize: 13, fontWeight: 600 }}>
              {s}
            </div>
          ))}
        </section>

        {/* Feature blocks — Cursor ref alternating image/text rows */}
        <div id="features" style={{ marginTop: 72, display: 'flex', flexDirection: 'column', gap: 56 }}>
          {BLOCKS.map((b) => (
            <section
              key={b.eyebrow}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 32,
                alignItems: 'center',
              }}
            >
              <div style={{ order: b.flip ? 2 : 1 }}>
                <p style={{ color: MUTED, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', margin: '0 0 12px' }}>{b.eyebrow}</p>
                <h2 style={{ fontSize: 28, lineHeight: 1.2, letterSpacing: -0.5, margin: '0 0 12px', fontWeight: 700 }}>{b.title}</h2>
                <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.65, margin: '0 0 16px' }}>{b.desc}</p>
                <Link href={b.link.href} style={{ color: LINK, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                  {b.link.label} →
                </Link>
              </div>
              <div style={{ order: b.flip ? 1 : 2 }}>
                <Shot src={b.img} alt={b.alt} caption={b.caption} />
              </div>
            </section>
          ))}
        </div>

        {/* Agent anchor block — deep view of the audit surface */}
        <section id="agent" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32, alignItems: 'center', marginTop: 56 }}>
          <div>
            <Shot
              src="/images/screenshots/browser-managers.png"
              alt="Continua managers — agent audit log with sessions restored and approval stats"
              caption="Managers → Agent audit — the verifiable, exportable decision log."
            />
          </div>
          <div>
            <p style={{ color: MUTED, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', margin: '0 0 12px' }}>Agent audit</p>
            <h2 style={{ fontSize: 28, lineHeight: 1.2, letterSpacing: -0.5, margin: '0 0 12px', fontWeight: 700 }}>Every decision, allowed or denied, in one chain.</h2>
            <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.65, margin: '0 0 16px' }}>
              Sessions restored, agent reads and writes, approval rate and the queue awaiting you —
              nothing is silent. Verify the chain, export it, and hand it to anyone who asks what the agent did.
            </p>
            <Shot
              src="/images/screenshots/browser-reading.png"
              alt="Continua reading list panel"
              caption="Reading list — read-later titles that persist per profile."
            />
          </div>
        </section>

        {/* Grid — Cursor ref "The new way to build software" testimonial wall */}
        <section style={{ textAlign: 'center', marginTop: 96 }}>
          <h2 style={{ fontSize: 28, margin: '0 0 8px', fontWeight: 700, letterSpacing: -0.5 }}>The new way to browse.</h2>
          <p style={{ color: MUTED, fontSize: 15, margin: '0 0 28px' }}>Continuity, separation and an auditable agent boundary — in a daily driver.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20, textAlign: 'left' }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, padding: '16px' }}>
                <h3 style={{ fontSize: 16, margin: '0 0 8px', fontWeight: 600 }}>{f.title}</h3>
                <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stay equipped — Cursor ref "Stay on the frontier" image trio */}
        <section style={{ marginTop: 96 }}>
          <h2 style={{ fontSize: 28, margin: '0 0 8px', fontWeight: 700, letterSpacing: -0.5, textAlign: 'center' }}>Stay equipped.</h2>
          <p style={{ color: MUTED, fontSize: 15, margin: '0 0 28px', textAlign: 'center' }}>The surfaces you will live in, straight from the product.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20 }}>
            {EQUIPPED.map((c) => (
              <div key={c.title} style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, overflow: 'hidden' }}>
                <img src={c.img} alt={c.alt} style={{ width: '100%', display: 'block', borderBottom: `1px solid ${LINE}` }} />
                <div style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: 16, margin: '0 0 8px', fontWeight: 600 }}>{c.title}</h3>
                  <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Changelog — Cursor ref changelog row */}
        <section style={{ marginTop: 96 }}>
          <h2 style={{ fontSize: 22, margin: '0 0 20px', fontWeight: 700, letterSpacing: -0.3 }}>Changelog</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {CHANGELOG.map((c) => (
              <div key={c.title} style={{ borderTop: `1px solid ${LINE}`, paddingTop: 16 }}>
                <p style={{ color: MUTED, fontSize: 12, margin: '0 0 6px' }}>{c.date}</p>
                <h3 style={{ fontSize: 15, margin: '0 0 6px', fontWeight: 600 }}>{c.title}</h3>
                <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{c.desc}</p>
              </div>
            ))}
          </div>
          <a href="https://github.com/Wicje/ANICHISOM2" style={{ color: LINK, fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginTop: 16 }}>
            See all activity on GitHub →
          </a>
        </section>

        {/* Wide proof block — Cursor ref research-team photo block */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32, alignItems: 'center', marginTop: 96, background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, padding: 32 }}>
          <div>
            <h2 style={{ fontSize: 26, lineHeight: 1.25, letterSpacing: -0.4, margin: '0 0 12px', fontWeight: 700 }}>Local-first, private by construction.</h2>
            <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.65, margin: '0 0 16px' }}>
              Profiles isolate cookies and history on your disk. Tab intelligence runs on-device.
              Sync is TLS to your own backend — and only when you pair it. The command palette
              below is the whole browser at your fingertips.
            </p>
            <Link href="/download" style={{ color: LINK, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              Download free →
            </Link>
          </div>
          <Shot
            src="/images/screenshots/browser-palette.png"
            alt="Continua command palette over the start page"
            caption="Ctrl+K — the palette runs tabs, sessions, screenshots, managers and sync."
          />
        </section>

        {/* Recent highlights — Cursor ref blog trio */}
        <section style={{ marginTop: 96 }}>
          <h2 style={{ fontSize: 22, margin: '0 0 20px', fontWeight: 700, letterSpacing: -0.3 }}>Recent highlights</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20 }}>
            {HIGHLIGHTS.map((h) => (
              <div key={h.title} style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, padding: '16px' }}>
                <p style={{ color: MUTED, fontSize: 12, margin: '0 0 8px' }}>{h.tag}</p>
                <h3 style={{ fontSize: 16, margin: '0 0 8px', fontWeight: 600 }}>{h.title}</h3>
                <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6, margin: '0 0 12px' }}>{h.desc}</p>
                <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>{h.meta}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Platforms + final CTA — Cursor ref "Try Cursor now" */}
        <section style={{ textAlign: 'center', marginTop: 96 }}>
          <h2 style={{ fontSize: 28, margin: '0 0 8px', fontWeight: 700, letterSpacing: -0.5 }}>Get it for your machine</h2>
          <p style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>Unsigned builds: Windows SmartScreen → More info → Run anyway.</p>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56 }}>
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
          <h2 style={{ fontSize: 40, margin: '0 0 20px', fontWeight: 700, letterSpacing: -0.8 }}>Try Continua now.</h2>
          <Link
            href="/download"
            style={{ background: BLUE, color: '#fff', borderRadius: 980, padding: '13px 30px', fontSize: 16, fontWeight: 600, textDecoration: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
          >
            Download free
          </Link>
        </section>

        {/* Footer — Cursor ref multi-column footer */}
        <footer style={{ marginTop: 88, paddingTop: 32, borderTop: `1px solid ${LINE}`, fontSize: 13 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24, marginBottom: 32 }}>
            <div>
              <p style={{ fontWeight: 700, margin: '0 0 12px' }}>Continua</p>
              <p style={{ color: MUTED, margin: 0, lineHeight: 1.6 }}>The continuity browser.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: MUTED }}>Product</span>
              <Link href="/download" style={{ color: LINK, textDecoration: 'none' }}>Download</Link>
              <Link href="/connect" style={{ color: LINK, textDecoration: 'none' }}>Pair a device</Link>
              <Link href="/api/health" style={{ color: LINK, textDecoration: 'none' }}>API health</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: MUTED }}>Browser</span>
              <a href="#features" style={{ color: LINK, textDecoration: 'none' }}>Features</a>
              <a href="#agent" style={{ color: LINK, textDecoration: 'none' }}>Agent state</a>
              <Link href="/help" style={{ color: LINK, textDecoration: 'none' }}>Help</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: MUTED }}>Resources</span>
              <a href="https://github.com/Wicje/ANICHISOM2" style={{ color: LINK, textDecoration: 'none' }}>Source</a>
              <a href="https://github.com/Wicje/ANICHISOM2" style={{ color: LINK, textDecoration: 'none' }}>Changelog</a>
              <span style={{ color: MUTED }}>Local-first · No account · On-device</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: MUTED, fontSize: 12, flexWrap: 'wrap', gap: 12, borderTop: `1px solid ${LINE}`, paddingTop: 20 }}>
            <span>Continua — pick up exactly where you left off.</span>
            <span>Free forever for local use.</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
