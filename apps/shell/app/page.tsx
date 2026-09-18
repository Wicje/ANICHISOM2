/**
 * Continua sync backend — status page.
 *
 * The web-OS experiment (landing, /os desktop, SDK docs) was removed;
 * this app is now the headless continuity API for the Continua browsers:
 * /api/context/*, /api/devices/*, /api/connect/*, /api/proxy, /api/health.
 */
import Link from 'next/link';

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#000',
        color: '#f5f5f7',
        fontFamily: '-apple-system, Inter, sans-serif',
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, margin: '0 0 8px' }}>Continua sync backend</h1>
        <p style={{ color: '#86868b', fontSize: 14, lineHeight: 1.6 }}>
          Continuity API for the Continua browsers — sessions, devices and
          pairing. No web desktop here anymore; get the browser below.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
          <Link
            href="/download"
            style={{ background: '#0071e3', color: '#fff', borderRadius: 980, padding: '10px 22px', fontSize: 14, textDecoration: 'none' }}
          >
            Download the browser
          </Link>
          <Link
            href="/connect"
            style={{ border: '1px solid #2c2c2e', color: '#f5f5f7', borderRadius: 980, padding: '10px 22px', fontSize: 14, textDecoration: 'none' }}
          >
            Pair a device
          </Link>
        </div>
        <p style={{ marginTop: 18, fontSize: 12 }}>
          <Link href="/api/health" style={{ color: '#2997ff' }}>
            API health
          </Link>
        </p>
      </div>
    </main>
  );
}
