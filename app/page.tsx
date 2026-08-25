'use client';

/**
 * ContinuaOS Landing Page v2
 *
 * Immersive marketing page with Lottie animations, Sketchfab 3D embeds,
 * Poly Haven textures, and Apiframe API showcase.
 */
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useInView } from 'motion/react';
import {
  Sparkles, Terminal, FolderOpen, Globe, Palette, Shield, Zap,
  Layers, Lock, Cpu, ArrowRight, Play, CheckCircle2, Layout, Monitor, HardDrive,
  Activity, Command, Code2, Database, ShieldCheck, ExternalLink, RefreshCw,
  ChevronRight, Smartphone, Laptop, Cloud, Users, Key, Eye, EyeOff,
  Fingerprint, Timer, Wifi, WifiOff, GitBranch, FileText, StickyNote,
  Rocket, Star, ChevronDown, MoveRight, Binary, Server, Cog
} from 'lucide-react';

/* ─── Sketchfab Embed Helper ──────────────────────────────── */
function SketchfabEmbed({ modelId, title, className = '' }: { modelId: string; title: string; className?: string }) {
  return (
    <div className={`relative rounded-2xl overflow-hidden border border-white/10 bg-black ${className}`}>
      <iframe
        title={title}
        className="w-full h-full"
        src={`https://sketchfab.com/models/${modelId}/embed?autostart=0&ui_theme=dark&ui_controls=0&ui_hint=0&ui_watermark=0&ui_annotations=0`}
        allow="autoplay; fullscreen; fullscreen; xr-spatial-tracking"
        loading="lazy"
        style={{ height: '100%', minHeight: '300px' }}
      />
    </div>
  );
}

/* ─── Lottie Player via CDN ───────────────────────────────── */
function LottieAnimation({ animationUrl, className = '', loop = true, autoplay = true }: {
  animationUrl: string; className?: string; loop?: boolean; autoplay?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    import('lottie-web').then((lottie) => {
      const anim = lottie.default.loadAnimation({
        container: el,
        renderer: 'svg',
        loop,
        autoplay,
        path: animationUrl,
      });
      return () => anim.destroy();
    }).catch(() => {});
  }, [animationUrl, loop, autoplay]);

  return <div ref={ref} className={className} />;
}

/* ─── Animated Section Wrapper ────────────────────────────── */
function AnimatedSection({ children, className = '', delay = 0, id }: {
  children: React.ReactNode; className?: string; delay?: number; id?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ─── Stat Counter ────────────────────────────────────────── */
function StatCounter({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 1500;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, value]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl sm:text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-[#10F4A0] to-cyan-300">
        {count}{suffix}
      </div>
      <div className="text-xs text-white/50 mt-2 font-medium">{label}</div>
    </div>
  );
}

/* ─── Feature Card ────────────────────────────────────────── */
function FeatureCard({ icon: Icon, title, description, color = '#10F4A0', tags, className = '' }: {
  icon: any; title: string; description: string; color?: string; tags?: string[]; className?: string;
}) {
  return (
    <div className={`group p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 backdrop-blur-3xl shadow-2xl hover:border-white/20 transition-all duration-500 ${className}`}>
      <div className="w-12 h-12 rounded-2xl border flex items-center justify-center mb-5" style={{ background: `${color}15`, borderColor: `${color}30`, color }}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/60 leading-relaxed mb-4">{description}</p>
      {tags && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-mono font-bold" style={{ color }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Step Card ───────────────────────────────────────────── */
function StepCard({ number, title, description, icon: Icon }: {
  number: number; title: string; description: string; icon: any;
}) {
  return (
    <div className="relative p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#10F4A0] to-cyan-400 flex items-center justify-center text-slate-950 font-black text-sm shrink-0">
          {number}
        </div>
        <Icon className="w-5 h-5 text-[#10F4A0]" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/60 leading-relaxed">{description}</p>
    </div>
  );
}

/* ─── Pricing Card ────────────────────────────────────────── */
function PricingCard({ name, price, period, description, features, cta, highlighted = false }: {
  name: string; price: string; period: string; description: string; features: string[]; cta: string; highlighted?: boolean;
}) {
  return (
    <div className={`relative p-8 rounded-3xl border backdrop-blur-3xl flex flex-col ${
      highlighted
        ? 'bg-gradient-to-br from-[#10F4A0]/10 to-cyan-500/5 border-[#10F4A0]/40 shadow-2xl shadow-[#10F4A0]/10'
        : 'bg-white/[0.03] border-white/10'
    }`}>
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-[#10F4A0] to-cyan-400 text-[10px] font-bold text-slate-950 uppercase tracking-wider">
          Most Popular
        </div>
      )}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white">{name}</h3>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-4xl font-black text-white">{price}</span>
          <span className="text-sm text-white/40">{period}</span>
        </div>
        <p className="text-xs text-white/50 mt-2">{description}</p>
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-white/70">
            <CheckCircle2 className="w-4 h-4 text-[#10F4A0] shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/os"
        className={`block text-center px-6 py-3 rounded-xl font-bold text-sm transition-all ${
          highlighted
            ? 'bg-gradient-to-r from-[#10F4A0] to-cyan-400 text-slate-950 shadow-lg shadow-[#10F4A0]/25 hover:brightness-110'
            : 'bg-white/10 text-white hover:bg-white/15 border border-white/15'
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [activeHeroTab, setActiveHeroTab] = useState<'desktop' | 'terminal' | 'moodboard' | 'security'>('desktop');
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#030407] text-slate-100 font-sans selection:bg-[#10F4A0]/30 selection:text-[#10F4A0] overflow-x-hidden antialiased">

      {/* ─── Ambient Glow Mesh ─── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] bg-gradient-to-b from-[#10F4A0]/15 via-cyan-500/10 to-transparent rounded-full blur-[160px] opacity-70" />
        <div className="absolute top-[30%] -left-80 w-[800px] h-[800px] bg-teal-500/8 rounded-full blur-[200px] opacity-50" />
        <div className="absolute top-[60%] -right-80 w-[800px] h-[800px] bg-[#10F4A0]/10 rounded-full blur-[200px] opacity-50" />
        <div className="absolute top-[85%] left-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[180px] opacity-40" />
      </div>

      {/* ─── Navbar ─── */}
      <header className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2.5rem)] max-w-6xl">
        <div className={`px-5 py-3 rounded-full transition-all duration-300 ${
          scrollY > 20
            ? 'bg-[#060812]/80 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-black/90'
            : 'bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-xl'
        }`}>
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#10F4A0] via-cyan-400 to-teal-300 p-0.5 shadow-lg shadow-[#10F4A0]/25 flex items-center justify-center group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-[#05070d] rounded-[10px] flex items-center justify-center">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10F4A0] to-cyan-300 font-black text-sm">C</span>
                </div>
              </div>
              <span className="text-white font-black text-sm tracking-tight">ContinuaOS</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-white/60">
              {['Problem', 'How It Works', 'Features', 'Architecture', 'Security', 'Pricing'].map((item) => (
                <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} className="hover:text-white transition-colors">{item}</a>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <Link href="/connect" className="text-xs font-semibold text-[#10F4A0] hover:brightness-110 transition-colors hidden sm:flex items-center gap-1">
                Pair Device
              </Link>
              <Link href="/os" className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-[#10F4A0] to-cyan-400 text-slate-950 shadow-lg shadow-[#10F4A0]/25 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5">
                Launch
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════
         1. HERO SECTION
         ═══════════════════════════════════════════════════ */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        id="overview"
        className="relative pt-36 sm:pt-44 pb-20 px-6 max-w-7xl mx-auto z-10 flex flex-col items-center text-center"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 bg-white/[0.04] border border-[#10F4A0]/40 backdrop-blur-2xl shadow-xl shadow-[#10F4A0]/10"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#10F4A0] fill-[#10F4A0]" />
          <span className="text-xs font-bold tracking-widest text-[#10F4A0] uppercase font-mono">CONTINUA WORKSPACE PROTOCOL</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.04] text-white max-w-5xl mb-8"
        >
          Your Work Follows You.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10F4A0] via-cyan-300 to-teal-300">
            Independent of Hardware.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-base sm:text-xl text-white/60 max-w-3xl leading-relaxed mb-10"
        >
          The personal continuity layer for developers and creators. Your identity, workspace, and work context move between physical machines. The machine can be temporary. Your workspace isn&apos;t.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4 mb-16"
        >
          <Link href="/os" className="px-9 py-4 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-[#10F4A0] via-cyan-400 to-teal-300 text-slate-950 shadow-2xl shadow-[#10F4A0]/30 hover:shadow-[#10F4A0]/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2.5">
            <Play className="w-4 h-4 fill-slate-950" />
            Launch Continua Workspace
          </Link>
          <Link href="#how-it-works" className="px-8 py-4 rounded-2xl font-semibold text-sm bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/15 backdrop-blur-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2">
            See How It Works
            <ChevronDown className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Hero Mockup with Sketchfab 3D */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4 }}
          className="w-full max-w-5xl rounded-3xl p-3 sm:p-5 bg-gradient-to-b from-white/20 via-white/5 to-transparent border border-white/20 backdrop-blur-3xl shadow-2xl shadow-black relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-[#10F4A0]/10 via-transparent to-cyan-500/10 pointer-events-none" />

          {/* Window Controls */}
          <div className="h-12 bg-slate-950/90 rounded-t-2xl border-b border-white/10 px-4 flex items-center justify-between select-none overflow-x-auto">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              {[
                { id: 'desktop', label: 'OS Desktop', icon: Layout },
                { id: 'terminal', label: 'WASM Terminal', icon: Terminal },
                { id: 'moodboard', label: 'Moodboard', icon: Palette },
                { id: 'security', label: 'Security', icon: ShieldCheck },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveHeroTab(tab.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeHeroTab === tab.id
                      ? 'bg-[#10F4A0] text-slate-950 shadow-md font-bold'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono font-bold text-white/40 uppercase">
              <span>Active Session</span>
              <div className="w-2 h-2 rounded-full bg-[#10F4A0] animate-pulse" />
            </div>
          </div>

          {/* Hero Content Area */}
          <div className="relative aspect-[16/9] w-full rounded-b-2xl bg-[#080a14] overflow-hidden flex items-center justify-center border border-white/5">
            {/* Sketchfab 3D Model */}
            <div className="absolute inset-0 opacity-60">
              <iframe
                title="ContinuaOS 3D Workspace"
                className="w-full h-full"
                src="https://sketchfab.com/models/3d25a01097264b68a5f27941e3d5e66b/embed?autostart=1&ui_theme=dark&ui_controls=0&ui_hint=0&ui_watermark=0"
                allow="autoplay; fullscreen; xr-spatial-tracking"
                loading="lazy"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#030407] via-transparent to-black/40 z-10" />

            {/* Overlay Cards */}
            <div className="relative z-20 w-full h-full p-6 flex flex-col justify-between pointer-events-none">
              <div className="flex items-center justify-between">
                <div className="px-3.5 py-1.5 rounded-full bg-slate-950/90 backdrop-blur-2xl border border-white/15 text-xs font-mono text-[#10F4A0] flex items-center gap-2 shadow-2xl">
                  <div className="w-2 h-2 rounded-full bg-[#10F4A0] animate-pulse" />
                  <span>Living State Engine · Active</span>
                </div>
              </div>

              <div className="flex justify-end">
                {activeHeroTab === 'desktop' && (
                  <motion.div key="desktop" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-4 rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-white/15 max-w-sm shadow-2xl">
                    <div className="text-xs font-bold text-white mb-1 flex items-center gap-2">
                      <Layout className="w-4 h-4 text-[#10F4A0]" />
                      Multi-Window Ecosystem
                    </div>
                    <p className="text-[11px] text-white/60">Persistent state across all open windows, canvas swatch buffers, and WASM terminals.</p>
                  </motion.div>
                )}
                {activeHeroTab === 'terminal' && (
                  <motion.div key="terminal" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-4 rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-emerald-500/30 max-w-sm shadow-2xl">
                    <div className="text-xs font-mono font-bold text-[#10F4A0] mb-1 flex items-center gap-2">
                      <Terminal className="w-4 h-4" />
                      xterm.js + VirtualFS
                    </div>
                    <p className="text-[11px] text-white/60 font-mono">$ continua init --mode=persistent (0ms latency)</p>
                  </motion.div>
                )}
                {activeHeroTab === 'moodboard' && (
                  <motion.div key="moodboard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-4 rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-cyan-500/30 max-w-sm shadow-2xl">
                    <div className="text-xs font-bold text-cyan-300 mb-1 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-cyan-400" />
                      Brand Token Sync
                    </div>
                    <p className="text-[11px] text-white/60">Color palettes, typography swatches, and design assets automatically synced.</p>
                  </motion.div>
                )}
                {activeHeroTab === 'security' && (
                  <motion.div key="security" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-4 rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-emerald-400/30 max-w-sm shadow-2xl">
                    <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      Edge Worker JWT Shield
                    </div>
                    <p className="text-[11px] text-white/60">Cloudflare proxy enforces Supabase RLS policies across all edge requests.</p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* ═══════════════════════════════════════════════════
         2. THE PROBLEM
         ═══════════════════════════════════════════════════ */}
      <AnimatedSection id="problem" className="py-24 px-6 max-w-6xl mx-auto z-10 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-400 uppercase font-mono">
            The Problem
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Every new machine is a fresh start.<br />
            <span className="text-white/40">That&apos;s not progress. That&apos;s amnesia.</span>
          </h2>
          <p className="text-base text-white/50 max-w-2xl mx-auto">
            Developers and creators lose hours reconfiguring environments, re-opening tabs, re-finding files. The cloud stores files, but nobody stores context.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Timer, title: '3+ Hours Lost', desc: 'Per device switch rebuilding your workspace from memory.', color: '#ef4444' },
            { icon: EyeOff, title: 'Zero Context', desc: 'Cloud syncs files but not which tabs were open, which branch you were on, or what you were researching.', color: '#f59e0b' },
            { icon: WifiOff, title: 'No Cross-Device Story', desc: 'Your laptop, desktop, and phone are isolated islands. Work stops when you switch.', color: '#8b5cf6' },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl text-center"
            >
              <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: `${item.color}15`, color: item.color }}>
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-white/50">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* ═══════════════════════════════════════════════════
         3. HOW IT WORKS
         ═══════════════════════════════════════════════════ */}
      <AnimatedSection id="how-it-works" className="py-24 px-6 max-w-6xl mx-auto z-10 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 bg-[#10F4A0]/10 border border-[#10F4A0]/30 text-xs font-bold text-[#10F4A0] uppercase font-mono">
            How It Works
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Three steps. Zero friction.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StepCard
            number={1}
            title="Pair Your Device"
            icon={Fingerprint}
            description="Scan a QR code or enter a pairing code. Your phone becomes the trust anchor. One tap and your device is registered."
          />
          <StepCard
            number={2}
            title="Work Naturally"
            icon={Layers}
            description="Continua silently captures your workspace: open tabs, files, apps, active tasks. No manual tracking. No buttons to press."
          />
          <StepCard
            number={3}
            title="Restore Anywhere"
            icon={RefreshCw}
            description="Log in on any device. See your workspace, ranked by relevance. One click to restore exactly where you left off."
          />
        </div>

        {/* Lottie Animation Strip */}
        <div className="mt-12 flex justify-center">
          <div className="w-full max-w-2xl h-48 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center overflow-hidden">
            <LottieAnimation
              animationUrl="https://lottie.host/3dbfb5bd-10fa-4ee2-bbd2-a0f02e8c37f5/HJgVCeQpNz.json"
              className="w-full h-full"
            />
          </div>
        </div>
      </AnimatedSection>

      {/* ═══════════════════════════════════════════════════
         4. FEATURES — DEVICE TRUST
         ═══════════════════════════════════════════════════ */}
      <AnimatedSection id="features" className="py-24 px-6 max-w-7xl mx-auto z-10 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 bg-white/[0.04] border border-cyan-500/30 text-xs font-bold text-cyan-300 uppercase font-mono">
            Core Features
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Built for how you actually work.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={Fingerprint}
            title="Device Trust"
            description="Every device gets a trust level: trusted, temporary, or revoked. Your phone is the root of trust. Temporary machines stay temporary."
            color="#10F4A0"
            tags={['Trust Levels', 'Capability Detection', 'Auto-Register']}
          />
          <FeatureCard
            icon={Layers}
            title="Workspace Capture"
            description="Automatically tracks open tabs, files, apps, and active tasks. Resources are scored by relevance: recency, frequency, dwell time."
            color="#06b6d4"
            tags={['Auto-Capture', 'Relevance Scoring', 'Zero Config']}
          />
          <FeatureCard
            icon={RefreshCw}
            title="One-Click Restore"
            description="Log in on any device and see your workspace ranked by relevance. Choose what to restore. Skip what you don't need."
            color="#8b5cf6"
            tags={['Selective Restore', 'Cross-Device', 'Instant']}
          />
          <FeatureCard
            icon={Key}
            title="Identity Chains"
            description="Your identity follows cryptographic chains, not passwords. Passkeys, OAuth, capability tokens. Your keys, your identity."
            color="#f59e0b"
            tags={['Passkeys', 'OAuth', 'Capability Tokens']}
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Privacy Classification"
            description="L0-L4 privacy levels on every resource. Personal notes stay local. Shared docs sync to cloud. You control what moves."
            color="#10b981"
            tags={['L0-L4 Privacy', 'Local-First', 'User-Controlled']}
          />
          <FeatureCard
            icon={Users}
            title="Team Continuity"
            description="Share workspaces with team members. Onboarding means inheriting context, not starting from zero. Offboarding means clean departure."
            color="#ec4899"
            tags={['Workspace Sharing', 'Team Onboarding', 'Clean Offboarding']}
          />
        </div>
      </AnimatedSection>

      {/* ═══════════════════════════════════════════════════
         5. SKETCHFAB 3D + POLY HAVEN
         ═══════════════════════════════════════════════════ */}
      <AnimatedSection className="py-24 px-6 max-w-7xl mx-auto z-10 relative">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
            Explore the Architecture in 3D
          </h2>
          <p className="text-sm text-white/50 max-w-lg mx-auto">
            Interactive models of the ContinuaOS workspace kernel, device trust graph, and data flow architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <SketchfabEmbed modelId="3d25a01097264b68a5f27941e3d5e66b" title="ContinuaOS Workspace Kernel" className="h-[350px]" />
            <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10">
              <h4 className="text-sm font-bold text-white">Workspace Kernel</h4>
              <p className="text-xs text-white/50">Interactive 3D model of the context capture and restore pipeline.</p>
            </div>
          </div>
          <div className="space-y-4">
            <SketchfabEmbed modelId="4a9c2803a4e54b07b4b0c0f5c2d7e8a1" title="Device Trust Graph" className="h-[350px]" />
            <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10">
              <h4 className="text-sm font-bold text-white">Device Trust Graph</h4>
              <p className="text-xs text-white/50">How devices authenticate, establish trust, and sync workspace state.</p>
            </div>
          </div>
        </div>

        {/* Poly Haven Attribution */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-white/30">
            3D assets rendered with <a href="https://polyhaven.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/50">Poly Haven</a> HDRIs · Models via <a href="https://sketchfab.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/50">Sketchfab</a>
          </p>
        </div>
      </AnimatedSection>

      {/* ═══════════════════════════════════════════════════
         6. ARCHITECTURE — APIFRAME
         ═══════════════════════════════════════════════════ */}
      <AnimatedSection id="architecture" className="py-24 px-6 max-w-6xl mx-auto z-10 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 bg-white/[0.04] border border-purple-500/30 text-xs font-bold text-purple-300 uppercase font-mono">
            Architecture
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Five layers. One truth.
          </h2>
          <p className="text-base text-white/50 max-w-2xl mx-auto">
            The Continua Core Architecture: a 5-layer system where each layer has a single responsibility and communicates through well-defined interfaces.
          </p>
        </div>

        {/* Architecture Diagram */}
        <div className="relative rounded-3xl bg-white/[0.02] border border-white/10 p-8 sm:p-12 backdrop-blur-2xl">
          <div className="space-y-4">
            {[
              { layer: 1, name: 'Identity Layer', desc: 'Passkeys, OAuth, capability tokens, device trust', color: '#10F4A0', icon: Key },
              { layer: 2, name: 'Context Graph', desc: 'Domain-keyed records, vector clocks, CRDT sync', color: '#06b6d4', icon: Database },
              { layer: 3, name: 'Workspace Model', desc: 'Resources, relevance scoring, capture/restore pipeline', color: '#8b5cf6', icon: Layers },
              { layer: 4, name: 'Device Trust', desc: 'Fingerprinting, capability detection, trust levels', color: '#f59e0b', icon: Shield },
              { layer: 5, name: 'Continuity Loop', desc: 'Auto-save, cross-device sync, team sharing', color: '#ec4899', icon: RefreshCw },
            ].map((item, i) => (
              <motion.div
                key={item.layer}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex items-center gap-4 sm:gap-6 p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all group"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" style={{ background: `${item.color}15`, color: item.color }}>
                  <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono font-bold uppercase" style={{ color: item.color }}>Layer {item.layer}</span>
                    <span className="text-sm sm:text-base font-bold text-white">{item.name}</span>
                  </div>
                  <p className="text-xs text-white/50">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 shrink-0 group-hover:text-white/50 transition-colors" />
              </motion.div>
            ))}
          </div>

          {/* Apiframe Badge */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2">
              <Server className="w-4 h-4 text-[#10F4A0]" />
              <span className="text-xs font-semibold text-white/60">APIs managed via</span>
              <a href="https://apiframe.io" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#10F4A0] hover:brightness-110 flex items-center gap-1">
                Apiframe
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ═══════════════════════════════════════════════════
         7. BENTO GRID
         ═══════════════════════════════════════════════════ */}
      <AnimatedSection id="bento" className="py-24 px-6 max-w-7xl mx-auto z-10 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 bg-white/[0.04] border border-cyan-500/30 text-xs font-bold text-cyan-300 uppercase font-mono">
            Deep Dive
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Built like infrastructure. Styled like magic.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Context Kernel — 2 cols */}
          <div className="md:col-span-2 rounded-3xl bg-slate-950 border border-white/10 overflow-hidden shadow-2xl relative group min-h-[380px]">
            <img src="/images/context_3d.jpg" alt="Context Protocol" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030407] via-[#030407]/60 to-transparent" />
            <div className="relative z-10 p-8 h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#10F4A0]/15 border border-[#10F4A0]/30 flex items-center justify-center text-[#10F4A0] mb-6">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-3xl font-black text-white mb-3">Context Kernel Protocol</h3>
                <p className="text-sm text-white/80 leading-relaxed max-w-xl">
                  Stores your entire desktop environment as domain-keyed records. Theme, layout, open tabs, active tools, brand tokens — everything recovers instantly.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
                {['IndexedDB Engine', 'Domain-Keyed Sync', 'Zero Refresh State'].map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-lg bg-white/10 border border-white/15 text-xs font-mono font-bold text-[#10F4A0]">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Latency Card */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/15 backdrop-blur-3xl shadow-2xl flex flex-col justify-between group hover:border-cyan-400/40 transition-all">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">0ms Query Latency</h3>
              <p className="text-sm text-white/60 leading-relaxed mb-6">
                Local-first IndexedDB cache serves queries instantly offline. Multi-device sync pushes changes in background threads.
              </p>
            </div>
            <div className="text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-[#10F4A0] to-cyan-300">
              100% Offline
            </div>
          </div>

          {/* Security Card */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/15 backdrop-blur-3xl shadow-2xl flex flex-col justify-between group hover:border-emerald-400/40 transition-all">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Cloudflare Worker RLS</h3>
              <p className="text-xs text-white/60 leading-relaxed mb-4">
                All edge proxy calls enforce Supabase Row-Level Security via user JWT tokens. Zero service role key leaks.
              </p>
            </div>
            <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>RLS Token Proxy</span>
            </div>
          </div>

          {/* Dual Target — 2 cols */}
          <div className="md:col-span-2 rounded-3xl bg-slate-950 border border-white/10 overflow-hidden shadow-2xl relative group min-h-[380px]">
            <img src="/images/dual_arch.jpg" alt="Dual Target" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030407] via-[#030407]/60 to-transparent" />
            <div className="relative z-10 p-8 h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-300 mb-6">
                  <Monitor className="w-6 h-6" />
                </div>
                <h3 className="text-3xl font-black text-white mb-3">Dual Target: Web & Desktop</h3>
                <p className="text-sm text-white/80 leading-relaxed max-w-xl">
                  Run in any browser without installation, or download the native Tauri app for system webviews, native filesystem, and desktop performance.
                </p>
              </div>
              <div className="flex flex-wrap gap-4 border-t border-white/10 pt-4">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <CheckCircle2 className="w-4 h-4 text-[#10F4A0]" /> Web Browser OS
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <CheckCircle2 className="w-4 h-4 text-[#10F4A0]" /> Tauri Native App
                </div>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ═══════════════════════════════════════════════════
         8. SECURITY & PRIVACY
         ═══════════════════════════════════════════════════ */}
      <AnimatedSection id="security" className="py-24 px-6 max-w-6xl mx-auto z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-400 uppercase font-mono">
              Security
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-6">
              Privacy by design. Not by policy.
            </h2>
            <div className="space-y-5">
              {[
                { icon: EyeOff, title: 'Never Spyware', desc: 'Continua captures workspace context, never screen contents, keystrokes, or personal data.' },
                { icon: Lock, title: 'Zero Credentials Stored', desc: 'OAuth tokens and passkeys are never stored in the cloud. Your device holds your keys.' },
                { icon: Shield, title: 'L0-L4 Classification', desc: 'Every resource has a privacy level. Personal notes stay local. Shared docs sync to cloud.' },
                { icon: Key, title: 'Cryptographic Erasure', desc: 'Delete a workspace and the encryption keys are destroyed. Recovery is mathematically impossible.' },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                    <p className="text-xs text-white/50 mt-0.5">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Security Lottie + Trust Levels */}
          <div className="space-y-6">
            <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-6 backdrop-blur-2xl">
              <LottieAnimation
                animationUrl="https://lottie.host/4db68bbd-31f6-4cd8-84eb-18e51d1e400b/IG7MC8yLDY.json"
                className="w-full h-48"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { level: 'Trusted', color: '#10b981', desc: 'Full access' },
                { level: 'Temporary', color: '#f59e0b', desc: 'Limited scope' },
                { level: 'Revoked', color: '#ef4444', desc: 'Blocked' },
              ].map((l) => (
                <div key={l.level} className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                  <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ background: l.color }} />
                  <div className="text-xs font-bold text-white">{l.level}</div>
                  <div className="text-[10px] text-white/40">{l.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ═══════════════════════════════════════════════════
         9. INTEGRATIONS ECOSYSTEM
         ═══════════════════════════════════════════════════ */}
      <AnimatedSection id="ecosystem" className="py-24 px-6 text-center z-10 relative">
        <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-4">
          Captures context from your favorite tools
        </h2>
        <p className="text-xs sm:text-sm text-white/50 max-w-lg mx-auto mb-10">
          Chrome extension and reverse proxy integration pull live data directly into your workspace.
        </p>

        <div className="flex flex-wrap justify-center gap-3 max-w-5xl mx-auto">
          {[
            'Figma', 'Notion', 'Claude', 'GitHub', 'Linear', 'Spotify', 'Canva',
            'ChatGPT', 'YouTube', 'Framer', 'VS Code', 'Miro', 'Poly Haven',
            'Sketchfab', 'Apiframe', 'Supabase', 'Vercel', 'Cloudflare'
          ].map((tool, idx) => (
            <motion.div
              key={tool}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.03 }}
              className="px-5 py-2.5 rounded-full bg-white/[0.04] border border-white/12 backdrop-blur-xl text-xs font-semibold text-white/80 hover:text-white hover:border-[#10F4A0]/40 transition-all cursor-default shadow-lg"
            >
              {tool}
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* ═══════════════════════════════════════════════════
         10. STATS
         ═══════════════════════════════════════════════════ */}
      <AnimatedSection className="py-24 px-6 max-w-5xl mx-auto z-10 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatCounter value={0} suffix="ms" label="Query Latency" />
          <StatCounter value={100} suffix="%" label="Offline Capable" />
          <StatCounter value={5} label="Architecture Layers" />
          <StatCounter value={90} suffix="d" label="Journal Retention" />
        </div>
      </AnimatedSection>

      {/* ═══════════════════════════════════════════════════
         11. PRICING
         ═══════════════════════════════════════════════════ */}
      <AnimatedSection id="pricing" className="py-24 px-6 max-w-6xl mx-auto z-10 relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Simple pricing. Serious power.
          </h2>
          <p className="text-base text-white/50">Start free. Scale when you&apos;re ready.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PricingCard
            name="Personal"
            price="$0"
            period="forever"
            description="For individual developers and creators"
            features={['3 devices', '5 workspace snapshots', 'Basic relevance scoring', 'Local-first storage', 'Community support']}
            cta="Get Started Free"
          />
          <PricingCard
            name="Pro"
            price="$12"
            period="/month"
            description="For power users who work across many machines"
            features={['Unlimited devices', 'Unlimited snapshots', 'Advanced relevance + AI', 'Cloud sync + backup', 'Team sharing (5 seats)', 'Priority support']}
            cta="Start Pro Trial"
            highlighted
          />
          <PricingCard
            name="Team"
            price="$39"
            period="/user/mo"
            description="For teams that need shared workspace context"
            features={['Everything in Pro', 'Org workspace sharing', 'Onboarding/offboarding', 'Admin audit logs', 'SSO integration', 'Dedicated support']}
            cta="Contact Sales"
          />
        </div>
      </AnimatedSection>

      {/* ═══════════════════════════════════════════════════
         12. FINAL CTA
         ═══════════════════════════════════════════════════ */}
      <AnimatedSection className="py-24 px-6 text-center z-10 relative">
        <div className="max-w-4xl mx-auto rounded-3xl p-12 sm:p-16 bg-gradient-to-r from-[#10F4A0]/15 via-cyan-500/10 to-teal-500/15 border border-white/20 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#10F4A0]/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">
              Stop restarting.<br />Start continuing.
            </h2>
            <p className="text-sm text-white/60 max-w-md mx-auto mb-8 leading-relaxed">
              The machine can be temporary. Your workspace isn&apos;t. Enter your persistent workspace with instant context recovery.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/os" className="inline-flex items-center gap-2 px-9 py-4 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-[#10F4A0] to-cyan-400 text-slate-950 shadow-xl shadow-[#10F4A0]/30 hover:brightness-110 active:scale-95 transition-all">
                <Rocket className="w-4 h-4" />
                Launch Web OS Desktop
              </Link>
              <Link href="/connect" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-sm bg-white/[0.08] text-white border border-white/15 hover:bg-white/[0.12] active:scale-95 transition-all">
                Pair a Device
              </Link>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ═══════════════════════════════════════════════════
         FOOTER
         ═══════════════════════════════════════════════════ */}
      <footer className="py-12 px-6 border-t border-white/10 z-10 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#10F4A0] to-cyan-400 p-[2px]">
                  <div className="w-full h-full bg-[#05070d] rounded-md flex items-center justify-center">
                    <span className="text-[#10F4A0] font-black text-[8px]">C</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-white">ContinuaOS</span>
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed">The personal continuity layer for developers and creators.</p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Security', 'Changelog', 'Docs'] },
              { title: 'Developers', links: ['API Reference', 'SDK', 'GitHub', 'Status', 'Community'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact', 'Legal'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-bold text-white mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-[11px] text-white/40 hover:text-white/70 transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-white/30">© 2026 ContinuaOS. All rights reserved.</p>
            <div className="flex items-center gap-4 text-[10px] text-white/30">
              <span>Built with Next.js, Supabase, Tauri</span>
              <span>·</span>
              <span>3D by Sketchfab & Poly Haven</span>
              <span>·</span>
              <span>APIs via Apiframe</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
