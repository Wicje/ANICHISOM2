'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform, useInView } from 'motion/react';
import {
  Sparkles, Terminal, Palette, Shield, Zap, Layers, Lock, ArrowRight, Play,
  CheckCircle2, Layout, Monitor, Database, ShieldCheck, ExternalLink, RefreshCw,
  ChevronRight, Users, Key, EyeOff, Fingerprint, Timer, WifiOff, Rocket,
  ChevronDown, Server, Sun, Moon
} from 'lucide-react';

/* ─── Theme Hook ─────────────────────────────────────────── */
function useLandingTheme() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('continuaos-theme-settings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.state?.colorMode === 'light') setDark(false);
        else setDark(true);
      } catch { /* keep default */ }
    }
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const toggle = useCallback(() => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      const stored = localStorage.getItem('continuaos-theme-settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.state = { ...parsed.state, colorMode: next ? 'dark' : 'light' };
        localStorage.setItem('continuaos-theme-settings', JSON.stringify(parsed));
      }
    } catch { /* ok */ }
  }, [dark]);

  return { dark, toggle };
}

/* ─── Sketchfab Embed ────────────────────────────────────── */
function SketchfabEmbed({ modelId, title, className = '' }: { modelId: string; title: string; className?: string }) {
  return (
    <div className={`relative rounded-2xl overflow-hidden border border-[var(--os-border)] bg-[var(--os-surface)] ${className}`}>
      <iframe
        title={title}
        className="w-full h-full"
        src={`https://sketchfab.com/models/${modelId}/embed?autostart=0&ui_theme=dark&ui_controls=0&ui_hint=0&ui_watermark=0&ui_annotations=0`}
        allow="autoplay; fullscreen; xr-spatial-tracking"
        loading="lazy"
        style={{ height: '100%', minHeight: '300px' }}
      />
    </div>
  );
}

/* ─── Lottie Player ──────────────────────────────────────── */
function LottieAnimation({ animationUrl, className = '' }: { animationUrl: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    let anim: any;
    import('lottie-web').then((lottie) => {
      anim = lottie.default.loadAnimation({ container: el, renderer: 'svg', loop: true, autoplay: true, path: animationUrl });
    }).catch(() => {});
    return () => { anim?.destroy(); };
  }, [animationUrl]);
  return <div ref={ref} className={className} />;
}

/* ─── Animated Section ───────────────────────────────────── */
function AnimatedSection({ children, className = '', delay = 0, id }: {
  children: React.ReactNode; className?: string; delay?: number; id?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section ref={ref} id={id}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >{children}</motion.section>
  );
}

/* ─── Stat Counter ───────────────────────────────────────── */
function StatCounter({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1500, 1);
      setCount(Math.floor(p * value));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, value]);
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl sm:text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">{count}{suffix}</div>
      <div className="text-xs text-[var(--os-text-muted)] mt-2 font-medium">{label}</div>
    </div>
  );
}

/* ─── Feature Card ───────────────────────────────────────── */
function FeatureCard({ icon: Icon, title, description, accentColor, tags }: {
  icon: any; title: string; description: string; accentColor: string; tags?: string[];
}) {
  return (
    <div className="group p-6 sm:p-8 rounded-3xl glass-panel hover:border-[var(--os-border-strong)] transition-all duration-500">
      <div className="w-12 h-12 rounded-2xl border flex items-center justify-center mb-5" style={{ background: `${accentColor}15`, borderColor: `${accentColor}30`, color: accentColor }}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-bold text-[var(--os-text)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--os-text-muted)] leading-relaxed mb-4">{description}</p>
      {tags && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="px-2.5 py-1 rounded-lg bg-[var(--os-hover)] border border-[var(--os-border)] text-[10px] font-mono font-bold" style={{ color: accentColor }}>{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Step Card ──────────────────────────────────────────── */
function StepCard({ number, title, description, icon: Icon }: {
  number: number; title: string; description: string; icon: any;
}) {
  return (
    <div className="relative p-6 sm:p-8 rounded-3xl glass-panel">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-black text-sm shrink-0">{number}</div>
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="text-lg font-bold text-[var(--os-text)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--os-text-muted)] leading-relaxed">{description}</p>
    </div>
  );
}

/* ─── Pricing Card ───────────────────────────────────────── */
function PricingCard({ name, price, period, description, features, cta, highlighted = false }: {
  name: string; price: string; period: string; description: string; features: string[]; cta: string; highlighted?: boolean;
}) {
  return (
    <div className={`relative p-8 rounded-3xl border backdrop-blur-3xl flex flex-col ${
      highlighted
        ? 'bg-gradient-to-br from-primary/10 to-secondary/5 border-primary/40 shadow-2xl shadow-primary/10'
        : 'glass-panel'
    }`}>
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-secondary text-[10px] font-bold text-white uppercase tracking-wider">Most Popular</div>
      )}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-[var(--os-text)]">{name}</h3>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-4xl font-black text-[var(--os-text)]">{price}</span>
          <span className="text-sm text-[var(--os-text-muted)]">{period}</span>
        </div>
        <p className="text-xs text-[var(--os-text-muted)] mt-2">{description}</p>
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-[var(--os-text)]">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /><span>{f}</span>
          </li>
        ))}
      </ul>
      <Link href="/os" className={`block text-center px-6 py-3 rounded-xl font-bold text-sm transition-all ${
        highlighted
          ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/25 hover:brightness-110'
          : 'bg-[var(--os-surface-elevated)] text-[var(--os-text)] hover:bg-[var(--os-surface-dim)] border border-[var(--os-border)]'
      }`}>{cta}</Link>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { dark, toggle } = useLandingTheme();
  const [scrollY, setScrollY] = useState(0);
  const [activeHeroTab, setActiveHeroTab] = useState<'desktop' | 'terminal' | 'moodboard' | 'security'>('desktop');
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  useEffect(() => {
    const h = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const cardBg = dark ? 'bg-[var(--os-surface)]' : 'bg-[var(--os-surface-container-lowest)]';
  const subtleBg = dark ? 'bg-white/[0.03]' : 'bg-black/[0.03]';

  return (
    <div className="min-h-screen bg-[var(--os-bg)] text-[var(--os-text)] font-sans selection:bg-primary/30 selection:text-primary overflow-x-hidden antialiased">

      {/* ─── Ambient Glow Mesh ─── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] bg-gradient-to-b from-primary/15 via-secondary/10 to-transparent rounded-full blur-[160px] opacity-60" />
        <div className="absolute top-[30%] -left-80 w-[800px] h-[800px] bg-secondary/8 rounded-full blur-[200px] opacity-40" />
        <div className="absolute top-[60%] -right-80 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[200px] opacity-40" />
      </div>

      {/* ─── Navbar ─── */}
      <header className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2.5rem)] max-w-6xl">
        <div className={`px-5 py-3 rounded-full transition-all duration-300 glass-panel ${
          scrollY > 20 ? 'shadow-2xl' : ''
        }`}>
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary via-secondary to-teal-300 p-0.5 shadow-lg shadow-primary/25 flex items-center justify-center group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-[var(--os-bg)] rounded-[10px] flex items-center justify-center">
                  <span className="text-primary font-black text-sm">C</span>
                </div>
              </div>
              <span className="text-[var(--os-text)] font-black text-sm tracking-tight">ContinuaOS</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[var(--os-text-muted)]">
              {['Problem', 'How It Works', 'Features', 'Architecture', 'Security', 'Pricing'].map((item) => (
                <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} className="hover:text-[var(--os-text)] transition-colors">{item}</a>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <button onClick={toggle} className="w-8 h-8 rounded-full bg-[var(--os-surface-elevated)] border border-[var(--os-border)] flex items-center justify-center text-[var(--os-text-muted)] hover:text-[var(--os-text)] transition-colors" aria-label="Toggle theme">
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <Link href="/connect" className="text-xs font-semibold text-primary hover:brightness-110 transition-colors hidden sm:flex items-center gap-1">Pair Device</Link>
              <Link href="/os" className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/25 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5">
                Launch <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ═══ 1. HERO ═══ */}
      <motion.section ref={heroRef} style={{ opacity: heroOpacity, scale: heroScale }} id="overview"
        className="relative pt-36 sm:pt-44 pb-20 px-6 max-w-7xl mx-auto z-10 flex flex-col items-center text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 glass-panel border-primary/40 shadow-xl shadow-primary/10">
          <Sparkles className="w-3.5 h-3.5 text-primary fill-primary" />
          <span className="text-xs font-bold tracking-widest text-primary uppercase font-mono">CONTINUA WORKSPACE PROTOCOL</span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.04] text-[var(--os-text)] max-w-5xl mb-8">
          Your Work Follows You.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-teal-300">Independent of Hardware.</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
          className="text-base sm:text-xl text-[var(--os-text-muted)] max-w-3xl leading-relaxed mb-10">
          The personal continuity layer for developers and creators. Your identity, workspace, and work context move between physical machines. The machine can be temporary. Your workspace isn&apos;t.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link href="/os" className="px-9 py-4 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-primary via-secondary to-teal-300 text-white shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2.5">
            <Play className="w-4 h-4 fill-white" /> Launch Continua Workspace
          </Link>
          <Link href="#how-it-works" className="px-8 py-4 rounded-2xl font-semibold text-sm glass-panel text-[var(--os-text)] hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2">
            See How It Works <ChevronDown className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Hero Mockup */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.4 }}
          className="w-full max-w-5xl rounded-3xl p-3 sm:p-5 glass-panel shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-secondary/10 pointer-events-none" />
          <div className="h-12 rounded-t-2xl border-b border-[var(--os-border)] px-4 flex items-center justify-between select-none overflow-x-auto" style={{ background: 'var(--os-surface)' }}>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="flex items-center gap-1 bg-[var(--os-surface-elevated)] p-1 rounded-xl border border-[var(--os-border)]">
              {[
                { id: 'desktop', label: 'OS Desktop', icon: Layout },
                { id: 'terminal', label: 'Terminal', icon: Terminal },
                { id: 'moodboard', label: 'Moodboard', icon: Palette },
                { id: 'security', label: 'Security', icon: ShieldCheck },
              ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveHeroTab(tab.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeHeroTab === tab.id ? 'bg-primary text-white shadow-md font-bold' : 'text-[var(--os-text-muted)] hover:text-[var(--os-text)] hover:bg-[var(--os-hover)]'
                  }`}>
                  <tab.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono font-bold text-[var(--os-text-muted)] uppercase">
              <span>Active Session</span>
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            </div>
          </div>

          <div className="relative aspect-[16/9] w-full rounded-b-2xl overflow-hidden flex items-center justify-center border border-[var(--os-border)]" style={{ background: 'var(--os-surface-dim)' }}>
            <div className="absolute inset-0 opacity-80">
              <iframe title="ContinuaOS 3D Workspace" className="w-full h-full"
                src="https://sketchfab.com/models/3d25a01097264b68a5f27941e3d5e66b/embed?autostart=1&ui_theme=dark&ui_controls=0&ui_hint=0&ui_watermark=0"
                allow="autoplay; fullscreen; xr-spatial-tracking" loading="lazy" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--os-bg)] via-transparent to-black/30 z-10" />
            <div className="relative z-20 w-full h-full p-6 flex flex-col justify-between pointer-events-none">
              <div className="flex items-center justify-between">
                <div className="px-3.5 py-1.5 rounded-full glass-panel text-xs font-mono text-primary flex items-center gap-2 shadow-2xl">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span>Living State Engine · Active</span>
                </div>
              </div>
              <div className="flex justify-end">
                {activeHeroTab === 'desktop' && (
                  <motion.div key="desktop" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-4 rounded-2xl glass-panel border-primary/20 max-w-sm shadow-2xl">
                    <div className="text-xs font-bold text-[var(--os-text)] mb-1 flex items-center gap-2"><Layout className="w-4 h-4 text-primary" />Multi-Window Ecosystem</div>
                    <p className="text-[11px] text-[var(--os-text-muted)]">Persistent state across all open windows, canvas swatch buffers, and WASM terminals.</p>
                  </motion.div>
                )}
                {activeHeroTab === 'terminal' && (
                  <motion.div key="terminal" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-4 rounded-2xl glass-panel border-emerald-500/30 max-w-sm shadow-2xl">
                    <div className="text-xs font-mono font-bold text-primary mb-1 flex items-center gap-2"><Terminal className="w-4 h-4" />xterm.js + VirtualFS</div>
                    <p className="text-[11px] text-[var(--os-text-muted)] font-mono">$ continua init --mode=persistent (0ms latency)</p>
                  </motion.div>
                )}
                {activeHeroTab === 'moodboard' && (
                  <motion.div key="moodboard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-4 rounded-2xl glass-panel border-secondary/30 max-w-sm shadow-2xl">
                    <div className="text-xs font-bold text-secondary mb-1 flex items-center gap-2"><Palette className="w-4 h-4" />Brand Token Sync</div>
                    <p className="text-[11px] text-[var(--os-text-muted)]">Color palettes, typography swatches, and design assets automatically synced.</p>
                  </motion.div>
                )}
                {activeHeroTab === 'security' && (
                  <motion.div key="security" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-4 rounded-2xl glass-panel border-emerald-400/30 max-w-sm shadow-2xl">
                    <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Edge Worker JWT Shield</div>
                    <p className="text-[11px] text-[var(--os-text-muted)]">Cloudflare proxy enforces Supabase RLS policies across all edge requests.</p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* ═══ 2. THE PROBLEM ═══ */}
      <AnimatedSection id="problem" className="py-24 px-6 max-w-6xl mx-auto z-10 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-500 uppercase font-mono">The Problem</div>
          <h2 className="text-3xl sm:text-5xl font-black text-[var(--os-text)] tracking-tight mb-4">
            Every new machine is a fresh start.<br />
            <span className="text-[var(--os-text-muted)]">That&apos;s not progress. That&apos;s amnesia.</span>
          </h2>
          <p className="text-base text-[var(--os-text-muted)] max-w-2xl mx-auto">
            Developers and creators lose hours reconfiguring environments, re-opening tabs, re-finding files. The cloud stores files, but nobody stores context.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Timer, title: '3+ Hours Lost', desc: 'Per device switch rebuilding your workspace from memory.', color: '#ef4444' },
            { icon: EyeOff, title: 'Zero Context', desc: 'Cloud syncs files but not which tabs were open, which branch you were on, or what you were researching.', color: '#f59e0b' },
            { icon: WifiOff, title: 'No Cross-Device Story', desc: 'Your laptop, desktop, and phone are isolated islands. Work stops when you switch.', color: '#8b5cf6' },
          ].map((item, i) => (
            <motion.div key={item.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.6 }}
              className="p-6 rounded-3xl glass-panel text-center">
              <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: `${item.color}15`, color: item.color }}><item.icon className="w-6 h-6" /></div>
              <h3 className="text-lg font-bold text-[var(--os-text)] mb-2">{item.title}</h3>
              <p className="text-sm text-[var(--os-text-muted)]">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* ═══ 3. HOW IT WORKS ═══ */}
      <AnimatedSection id="how-it-works" className="py-24 px-6 max-w-6xl mx-auto z-10 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 bg-primary/10 border border-primary/30 text-xs font-bold text-primary uppercase font-mono">How It Works</div>
          <h2 className="text-3xl sm:text-5xl font-black text-[var(--os-text)] tracking-tight">Three steps. Zero friction.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StepCard number={1} title="Pair Your Device" icon={Fingerprint} description="Scan a QR code or enter a pairing code. Your phone becomes the trust anchor. One tap and your device is registered." />
          <StepCard number={2} title="Work Naturally" icon={Layers} description="Continua silently captures your workspace: open tabs, files, apps, active tasks. No manual tracking. No buttons to press." />
          <StepCard number={3} title="Restore Anywhere" icon={RefreshCw} description="Log in on any device. See your workspace, ranked by relevance. One click to restore exactly where you left off." />
        </div>
        <div className="mt-12 flex justify-center">
          <div className="w-full max-w-2xl h-48 rounded-2xl glass-panel flex items-center justify-center overflow-hidden">
            <LottieAnimation animationUrl="https://lottie.host/3dbfb5bd-10fa-4ee2-bbd2-a0f02e8c37f5/HJgVCeQpNz.json" className="w-full h-full" />
          </div>
        </div>
      </AnimatedSection>

      {/* ═══ 4. FEATURES ═══ */}
      <AnimatedSection id="features" className="py-24 px-6 max-w-7xl mx-auto z-10 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 glass-panel border-secondary/30 text-xs font-bold text-secondary uppercase font-mono">Core Features</div>
          <h2 className="text-3xl sm:text-5xl font-black text-[var(--os-text)] tracking-tight">Built for how you actually work.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard icon={Fingerprint} title="Device Trust" description="Every device gets a trust level: trusted, temporary, or revoked. Your phone is the root of trust." accentColor="#10F4A0" tags={['Trust Levels', 'Capability Detection', 'Auto-Register']} />
          <FeatureCard icon={Layers} title="Workspace Capture" description="Automatically tracks open tabs, files, apps, and active tasks. Resources scored by relevance." accentColor="#06b6d4" tags={['Auto-Capture', 'Relevance Scoring', 'Zero Config']} />
          <FeatureCard icon={RefreshCw} title="One-Click Restore" description="Log in on any device and see your workspace ranked by relevance. Choose what to restore." accentColor="#8b5cf6" tags={['Selective Restore', 'Cross-Device', 'Instant']} />
          <FeatureCard icon={Key} title="Identity Chains" description="Your identity follows cryptographic chains, not passwords. Passkeys, OAuth, capability tokens." accentColor="#f59e0b" tags={['Passkeys', 'OAuth', 'Capability Tokens']} />
          <FeatureCard icon={ShieldCheck} title="Privacy Classification" description="L0-L4 privacy levels on every resource. Personal notes stay local. Shared docs sync to cloud." accentColor="#10b981" tags={['L0-L4 Privacy', 'Local-First', 'User-Controlled']} />
          <FeatureCard icon={Users} title="Team Continuity" description="Share workspaces with team members. Onboarding means inheriting context, not starting from zero." accentColor="#ec4899" tags={['Workspace Sharing', 'Team Onboarding', 'Clean Offboarding']} />
        </div>
      </AnimatedSection>

      {/* ═══ 5. SKETCHFAB 3D ═══ */}
      <AnimatedSection className="py-24 px-6 max-w-7xl mx-auto z-10 relative">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-[var(--os-text)] tracking-tight mb-4">Explore the Architecture in 3D</h2>
          <p className="text-sm text-[var(--os-text-muted)] max-w-lg mx-auto">Interactive models of the ContinuaOS workspace kernel, device trust graph, and data flow architecture.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <SketchfabEmbed modelId="3d25a01097264b68a5f27941e3d5e66b" title="ContinuaOS Workspace Kernel" className="h-[350px]" />
            <div className="px-4 py-3 rounded-xl glass-panel">
              <h4 className="text-sm font-bold text-[var(--os-text)]">Workspace Kernel</h4>
              <p className="text-xs text-[var(--os-text-muted)]">Interactive 3D model of the context capture and restore pipeline.</p>
            </div>
          </div>
          <div className="space-y-4">
            <SketchfabEmbed modelId="4a9c2803a4e54b07b4b0c0f5c2d7e8a1" title="Device Trust Graph" className="h-[350px]" />
            <div className="px-4 py-3 rounded-xl glass-panel">
              <h4 className="text-sm font-bold text-[var(--os-text)]">Device Trust Graph</h4>
              <p className="text-xs text-[var(--os-text-muted)]">How devices authenticate, establish trust, and sync workspace state.</p>
            </div>
          </div>
        </div>
        <div className="mt-8 text-center">
          <p className="text-[10px] text-[var(--os-text-muted)]">
            3D assets via <a href="https://sketchfab.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--os-text)]">Sketchfab</a> · HDRIs by <a href="https://polyhaven.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--os-text)]">Poly Haven</a>
          </p>
        </div>
      </AnimatedSection>

      {/* ═══ 6. ARCHITECTURE ═══ */}
      <AnimatedSection id="architecture" className="py-24 px-6 max-w-6xl mx-auto z-10 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 glass-panel border-purple-500/30 text-xs font-bold text-purple-400 uppercase font-mono">Architecture</div>
          <h2 className="text-3xl sm:text-5xl font-black text-[var(--os-text)] tracking-tight mb-4">Five layers. One truth.</h2>
          <p className="text-base text-[var(--os-text-muted)] max-w-2xl mx-auto">
            The Continua Core Architecture: a 5-layer system where each layer has a single responsibility.
          </p>
        </div>
        <div className="relative rounded-3xl glass-panel p-8 sm:p-12">
          <div className="space-y-4">
            {[
              { layer: 1, name: 'Identity Layer', desc: 'Passkeys, OAuth, capability tokens, device trust', color: '#10F4A0', icon: Key },
              { layer: 2, name: 'Context Graph', desc: 'Domain-keyed records, vector clocks, CRDT sync', color: '#06b6d4', icon: Database },
              { layer: 3, name: 'Workspace Model', desc: 'Resources, relevance scoring, capture/restore pipeline', color: '#8b5cf6', icon: Layers },
              { layer: 4, name: 'Device Trust', desc: 'Fingerprinting, capability detection, trust levels', color: '#f59e0b', icon: Shield },
              { layer: 5, name: 'Continuity Loop', desc: 'Auto-save, cross-device sync, team sharing', color: '#ec4899', icon: RefreshCw },
            ].map((item, i) => (
              <motion.div key={item.layer} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex items-center gap-4 sm:gap-6 p-4 sm:p-5 rounded-2xl bg-[var(--os-surface-elevated)] border border-[var(--os-border)] hover:border-[var(--os-border-strong)] transition-all group">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" style={{ background: `${item.color}15`, color: item.color }}>
                  <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono font-bold uppercase" style={{ color: item.color }}>Layer {item.layer}</span>
                    <span className="text-sm sm:text-base font-bold text-[var(--os-text)]">{item.name}</span>
                  </div>
                  <p className="text-xs text-[var(--os-text-muted)]">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--os-outline)] shrink-0 group-hover:text-[var(--os-text)] transition-colors" />
              </motion.div>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="px-4 py-2 rounded-xl glass-panel flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-[var(--os-text-muted)]">APIs managed via</span>
              <a href="https://apiframe.io" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary hover:brightness-110 flex items-center gap-1">Apiframe <ExternalLink className="w-3 h-3" /></a>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ═══ 7. BENTO GRID ═══ */}
      <AnimatedSection id="bento" className="py-24 px-6 max-w-7xl mx-auto z-10 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 glass-panel border-secondary/30 text-xs font-bold text-secondary uppercase font-mono">Deep Dive</div>
          <h2 className="text-3xl sm:text-5xl font-black text-[var(--os-text)] tracking-tight">Built like infrastructure. Styled like magic.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Context Kernel */}
          <div className="md:col-span-2 rounded-3xl border border-[var(--os-border)] overflow-hidden shadow-2xl relative group min-h-[380px]" style={{ background: 'var(--os-surface)' }}>
            <Image src="/images/context_3d.jpg" alt="Context Protocol" fill className="object-cover opacity-70 group-hover:scale-105 transition-transform duration-700" sizes="(max-width: 768px) 100vw, 66vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--os-bg)] via-[var(--os-bg)]/60 to-transparent" />
            <div className="relative z-10 p-8 h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mb-6"><Layers className="w-6 h-6" /></div>
                <h3 className="text-3xl font-black text-[var(--os-text)] mb-3">Context Kernel Protocol</h3>
                <p className="text-sm text-[var(--os-text)] leading-relaxed max-w-xl">Stores your entire desktop environment as domain-keyed records. Theme, layout, open tabs, active tools — everything recovers instantly.</p>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-[var(--os-border)] pt-4">
                {['IndexedDB Engine', 'Domain-Keyed Sync', 'Zero Refresh State'].map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-lg bg-[var(--os-surface-elevated)] border border-[var(--os-border)] text-xs font-mono font-bold text-primary">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Latency */}
          <div className="p-8 rounded-3xl glass-panel flex flex-col justify-between group hover:border-secondary/40 transition-all">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-secondary/15 border border-secondary/30 flex items-center justify-center text-secondary mb-6"><Zap className="w-6 h-6" /></div>
              <h3 className="text-2xl font-bold text-[var(--os-text)] mb-3">0ms Query Latency</h3>
              <p className="text-sm text-[var(--os-text-muted)] leading-relaxed mb-6">Local-first IndexedDB cache serves queries instantly offline.</p>
            </div>
            <div className="text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">100% Offline</div>
          </div>

          {/* Security */}
          <div className="p-8 rounded-3xl glass-panel flex flex-col justify-between group hover:border-emerald-400/40 transition-all">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 mb-6"><ShieldCheck className="w-6 h-6" /></div>
              <h3 className="text-xl font-bold text-[var(--os-text)] mb-2">Cloudflare Worker RLS</h3>
              <p className="text-xs text-[var(--os-text-muted)] leading-relaxed mb-4">All edge proxy calls enforce Supabase Row-Level Security via user JWT tokens.</p>
            </div>
            <div className="text-xs font-mono text-emerald-500 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span>RLS Token Proxy</span>
            </div>
          </div>

          {/* Dual Target */}
          <div className="md:col-span-2 rounded-3xl border border-[var(--os-border)] overflow-hidden shadow-2xl relative group min-h-[380px]" style={{ background: 'var(--os-surface)' }}>
            <Image src="/images/dual_arch.jpg" alt="Dual Target" fill className="object-cover opacity-70 group-hover:scale-105 transition-transform duration-700" sizes="(max-width: 768px) 100vw, 66vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--os-bg)] via-[var(--os-bg)]/60 to-transparent" />
            <div className="relative z-10 p-8 h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-6"><Monitor className="w-6 h-6" /></div>
                <h3 className="text-3xl font-black text-[var(--os-text)] mb-3">Dual Target: Web & Desktop</h3>
                <p className="text-sm text-[var(--os-text)] leading-relaxed max-w-xl">Run in any browser without installation, or download the native Tauri app for system webviews and desktop performance.</p>
              </div>
              <div className="flex flex-wrap gap-4 border-t border-[var(--os-border)] pt-4">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--os-text)]"><CheckCircle2 className="w-4 h-4 text-primary" /> Web Browser OS</div>
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--os-text)]"><CheckCircle2 className="w-4 h-4 text-primary" /> Tauri Native App</div>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ═══ 8. SECURITY ═══ */}
      <AnimatedSection id="security" className="py-24 px-6 max-w-6xl mx-auto z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-500 uppercase font-mono">Security</div>
            <h2 className="text-3xl sm:text-4xl font-black text-[var(--os-text)] tracking-tight mb-6">Privacy by design. Not by policy.</h2>
            <div className="space-y-5">
              {[
                { icon: EyeOff, title: 'Never Spyware', desc: 'Continua captures workspace context, never screen contents, keystrokes, or personal data.' },
                { icon: Lock, title: 'Zero Credentials Stored', desc: 'OAuth tokens and passkeys are never stored in the cloud. Your device holds your keys.' },
                { icon: Shield, title: 'L0-L4 Classification', desc: 'Every resource has a privacy level. Personal notes stay local. Shared docs sync to cloud.' },
                { icon: Key, title: 'Cryptographic Erasure', desc: 'Delete a workspace and the encryption keys are destroyed. Recovery is mathematically impossible.' },
              ].map((item, i) => (
                <motion.div key={item.title} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5"><item.icon className="w-4 h-4" /></div>
                  <div><h4 className="text-sm font-bold text-[var(--os-text)]">{item.title}</h4><p className="text-xs text-[var(--os-text-muted)] mt-0.5">{item.desc}</p></div>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-3xl glass-panel p-6">
              <LottieAnimation animationUrl="https://lottie.host/4db68bbd-31f6-4cd8-84eb-18e51d1e400b/IG7MC8yLDY.json" className="w-full h-48" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { level: 'Trusted', color: '#10b981', desc: 'Full access' },
                { level: 'Temporary', color: '#f59e0b', desc: 'Limited scope' },
                { level: 'Revoked', color: '#ef4444', desc: 'Blocked' },
              ].map((l) => (
                <div key={l.level} className="p-3 rounded-xl glass-panel text-center">
                  <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ background: l.color }} />
                  <div className="text-xs font-bold text-[var(--os-text)]">{l.level}</div>
                  <div className="text-[10px] text-[var(--os-text-muted)]">{l.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ═══ 9. INTEGRATIONS ═══ */}
      <AnimatedSection id="ecosystem" className="py-24 px-6 text-center z-10 relative">
        <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--os-text)] mb-4">Captures context from your favorite tools</h2>
        <p className="text-xs sm:text-sm text-[var(--os-text-muted)] max-w-lg mx-auto mb-10">Chrome extension and reverse proxy integration pull live data directly into your workspace.</p>
        <div className="flex flex-wrap justify-center gap-3 max-w-5xl mx-auto">
          {['Figma', 'Notion', 'Claude', 'GitHub', 'Linear', 'Spotify', 'Canva', 'ChatGPT', 'YouTube', 'Framer', 'VS Code', 'Miro', 'Poly Haven', 'Sketchfab', 'Apiframe', 'Supabase', 'Vercel', 'Cloudflare'].map((tool, idx) => (
            <motion.div key={tool} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: idx * 0.03 }}
              className="px-5 py-2.5 rounded-full glass-panel text-xs font-semibold text-[var(--os-text)] hover:border-primary/40 transition-all cursor-default shadow-lg">{tool}</motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* ═══ 10. STATS ═══ */}
      <AnimatedSection className="py-24 px-6 max-w-5xl mx-auto z-10 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatCounter value={0} suffix="ms" label="Query Latency" />
          <StatCounter value={100} suffix="%" label="Offline Capable" />
          <StatCounter value={5} label="Architecture Layers" />
          <StatCounter value={90} suffix="d" label="Journal Retention" />
        </div>
      </AnimatedSection>

      {/* ═══ 11. PRICING ═══ */}
      <AnimatedSection id="pricing" className="py-24 px-6 max-w-6xl mx-auto z-10 relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-5xl font-black text-[var(--os-text)] tracking-tight mb-4">Simple pricing. Serious power.</h2>
          <p className="text-base text-[var(--os-text-muted)]">Start free. Scale when you&apos;re ready.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PricingCard name="Personal" price="$0" period="forever" description="For individual developers and creators"
            features={['3 devices', '5 workspace snapshots', 'Basic relevance scoring', 'Local-first storage', 'Community support']} cta="Get Started Free" />
          <PricingCard name="Pro" price="$12" period="/month" description="For power users who work across many machines"
            features={['Unlimited devices', 'Unlimited snapshots', 'Advanced relevance + AI', 'Cloud sync + backup', 'Team sharing (5 seats)', 'Priority support']} cta="Start Pro Trial" highlighted />
          <PricingCard name="Team" price="$39" period="/user/mo" description="For teams that need shared workspace context"
            features={['Everything in Pro', 'Org workspace sharing', 'Onboarding/offboarding', 'Admin audit logs', 'SSO integration', 'Dedicated support']} cta="Contact Sales" />
        </div>
      </AnimatedSection>

      {/* ═══ 12. CTA ═══ */}
      <AnimatedSection className="py-24 px-6 text-center z-10 relative">
        <div className="max-w-4xl mx-auto rounded-3xl p-12 sm:p-16 glass-panel border-primary/20 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-5xl font-black text-[var(--os-text)] mb-4 tracking-tight">Stop restarting.<br />Start continuing.</h2>
            <p className="text-sm text-[var(--os-text-muted)] max-w-md mx-auto mb-8 leading-relaxed">The machine can be temporary. Your workspace isn&apos;t. Enter your persistent workspace with instant context recovery.</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/os" className="inline-flex items-center gap-2 px-9 py-4 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-primary to-secondary text-white shadow-xl shadow-primary/30 hover:brightness-110 active:scale-95 transition-all">
                <Rocket className="w-4 h-4" /> Launch Web OS Desktop
              </Link>
              <Link href="/connect" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-sm glass-panel text-[var(--os-text)] hover:bg-[var(--os-surface-elevated)] active:scale-95 transition-all">
                Pair a Device
              </Link>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-12 px-6 border-t border-[var(--os-border)] z-10 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-primary to-secondary p-[2px]">
                  <div className="w-full h-full bg-[var(--os-bg)] rounded-md flex items-center justify-center"><span className="text-primary font-black text-[8px]">C</span></div>
                </div>
                <span className="text-xs font-bold text-[var(--os-text)]">ContinuaOS</span>
              </div>
              <p className="text-[11px] text-[var(--os-text-muted)] leading-relaxed">The personal continuity layer for developers and creators.</p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Security', 'Changelog', 'Docs'] },
              { title: 'Developers', links: ['API Reference', 'SDK', 'GitHub', 'Status', 'Community'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact', 'Legal'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-bold text-[var(--os-text)] mb-3">{col.title}</h4>
                <ul className="space-y-2">{col.links.map((link) => (
                  <li key={link}><a href="#" className="text-[11px] text-[var(--os-text-muted)] hover:text-[var(--os-text)] transition-colors">{link}</a></li>
                ))}</ul>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t border-[var(--os-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-[var(--os-text-muted)]">&copy; 2026 ContinuaOS. All rights reserved.</p>
            <div className="flex items-center gap-4 text-[10px] text-[var(--os-text-muted)]">
              <span>Built with Next.js, Supabase, Tauri</span>
              <span>&middot;</span>
              <span>3D by Sketchfab &amp; Poly Haven</span>
              <span>&middot;</span>
              <span>APIs via Apiframe</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
