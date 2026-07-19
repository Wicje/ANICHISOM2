'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#060608' }}>
      {/* ─── Nav ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between" style={{
        background: scrollY > 50 ? 'rgba(6,6,8,0.85)' : 'transparent',
        backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none',
        borderBottom: scrollY > 50 ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10F4A0, #00D4AA)' }}>
            <span className="text-black text-xs font-bold">C</span>
          </div>
          <span className="text-white font-semibold text-sm tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Continua</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/waitlist" className="text-xs transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <span className="hover:text-white">Waitlist</span>
          </Link>
          <Link href="/os" className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)' }}>
            Open OS
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, #10F4A0, transparent 70%)' }} />
        </div>

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-8" style={{ background: 'rgba(16,244,160,0.08)', border: '1px solid rgba(16,244,160,0.15)' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10F4A0' }} />
            <span className="text-xs font-medium" style={{ color: '#10F4A0' }}>Private Beta — 70 Spots</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1] tracking-tight" style={{ fontFamily: 'var(--font-display)', color: '#ffffff' }}>
            The persistent<br />
            <span style={{ color: '#10F4A0' }}>context layer</span>
          </h1>

          <p className="text-base md:text-lg mb-10 max-w-xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Pick up exactly where you stopped. Your workspace remembers everything — browser tabs, projects, brand settings, research — across sessions and devices.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Link href="/waitlist" className="px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]" style={{ background: '#10F4A0', color: '#060608' }}>
              Join the Waitlist
            </Link>
            <Link href="/os" className="px-6 py-3 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}>
              Try it now
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Problem ─── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Tabs close', desc: 'Browser tabs gone. Research gone. Context gone. Start over.', icon: '×' },
              { title: 'Apps are silos', desc: "Figma doesn't know about your docs. Your browser doesn't know about your designs.", icon: '◻' },
              { title: 'Sessions die', desc: 'Close the laptop. Lose the state. Reopen everything. Every. Single. Time.', icon: '○' },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="text-2xl mb-4" style={{ color: 'rgba(255,255,255,0.15)' }}>{item.icon}</div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.8)' }}>{item.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Solution: Three Layers ─── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ fontFamily: 'var(--font-display)', color: '#ffffff' }}>
              Three layers. One workspace.
            </h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Continua is built on a protocol that owns your context. Not a collection of apps — an infrastructure layer.
            </p>
          </div>

          <div className="space-y-6">
            {[
              {
                layer: '01',
                title: 'Context Layer',
                desc: 'The protocol that persists everything. Theme, workspace layout, browser state, brand settings, research — stored as domain-keyed records with versioning and conflict resolution.',
                color: '#10F4A0',
                tags: ['Protocol', 'IDB + Supabase', 'Cross-device sync'],
              },
              {
                layer: '02',
                title: 'Built-in Apps',
                desc: 'Browser, terminal, code editor, moodboard, campaign lab — each app reads and writes to the Context Layer. Close one, open another. Your state follows you.',
                color: '#6366F1',
                tags: ['Browser', 'Terminal', 'Code Editor', 'Moodboard'],
              },
              {
                layer: '03',
                title: 'Ecosystem',
                desc: 'Chrome extension captures context from Figma, Claude, Notion, and 16+ other tools. Reverse proxy loads any site inside the OS. Everything feeds into your context.',
                color: '#F59E0B',
                tags: ['Chrome Extension', 'Reverse Proxy', 'Figma API'],
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-6 p-6 rounded-2xl transition-all" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="text-4xl font-bold shrink-0 w-16 text-center" style={{ color: item.color, opacity: 0.3, fontFamily: 'var(--font-mono)' }}>
                  {item.layer}
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-2" style={{ color: '#ffffff' }}>{item.title}</h3>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag, j) => (
                      <span key={j} className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-16" style={{ fontFamily: 'var(--font-display)', color: '#ffffff' }}>
            What Continua does
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: 'Persistent sessions', desc: 'Close your laptop. Reopen. Everything is exactly where you left it. Theme, windows, workspace layout — all restored.', icon: '⟲' },
              { title: 'Cross-device sync', desc: 'Switch from laptop to desktop. Your workspace follows you. Same context, different machine.', icon: '⇄' },
              { title: 'Browser inside the OS', desc: 'Browse any website without leaving Continua. Reverse proxy strips iframe restrictions. Most sites just work.', icon: '⊞' },
              { title: 'Design token extraction', desc: 'Connect Figma. Pull colors, typography, components into your context. Your brand system lives here.', icon: '◈' },
              { title: 'Tool context capture', desc: 'Chrome extension captures what you do in Claude, Notion, GitHub, and 13+ other tools. Context without switching.', icon: '◎' },
              { title: 'Brand management', desc: 'Logos, colors, voice, guidelines — stored as structured context. Every app in the OS knows your brand.', icon: '◇' },
            ].map((item, i) => (
              <div key={i} className="p-5 rounded-xl transition-all hover:scale-[1.01]" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="text-lg mb-3" style={{ color: '#10F4A0' }}>{item.icon}</div>
                <h3 className="text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.85)' }}>{item.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-16" style={{ fontFamily: 'var(--font-display)', color: '#ffffff' }}>
            How it works
          </h2>

          <div className="space-y-4">
            {[
              { step: '1', title: 'Sign up with invite code', desc: 'Get an invite from the admin. Create your account.' },
              { step: '2', title: 'Onboarding sets your context', desc: 'Choose your workspace, theme, and tools. This becomes your default context.' },
              { step: '3', title: 'Work normally', desc: 'Use the browser, terminal, code editor. Everything you do is persisted automatically.' },
              { step: '4', title: 'Close and return', desc: 'Close the tab. Come back later. Everything is exactly where you left it.' },
              { step: '5', title: 'Sync across devices', desc: 'Enable Agency mode. Your context syncs to Supabase. Pick up on any device.' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl" style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: 'rgba(16,244,160,0.1)', color: '#10F4A0' }}>
                  {item.step}
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>{item.title}</h3>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Compatibility ─── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)', color: '#ffffff' }}>
            Works with everything you use
          </h2>
          <p className="text-sm mb-12 max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Reverse proxy loads most sites. Chrome extension captures context from the rest. Figma API pulls design data directly.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {['Figma', 'Notion', 'Claude', 'GitHub', 'Linear', 'YouTube', 'Canva', 'Adobe', 'Instagram', 'Google Docs', 'Miro', 'Spotify', 'Framer', 'ChatGPT', 'Twitter', 'StackBlitz'].map((tool, i) => (
              <span key={i} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {tool}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-32 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] opacity-[0.05]" style={{ background: 'radial-gradient(circle, #10F4A0, transparent 70%)' }} />
          </div>

          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-display)', color: '#ffffff' }}>
            Stop restarting.<br />Start continuing.
          </h2>
          <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Join the private beta. 70 spots. By invite only.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/waitlist" className="px-8 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]" style={{ background: '#10F4A0', color: '#060608' }}>
              Request Access
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-8 px-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10F4A0, #00D4AA)' }}>
              <span className="text-black text-[8px] font-bold">C</span>
            </div>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Continua</span>
          </div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            The persistent context layer
          </div>
        </div>
      </footer>
    </div>
  );
}
