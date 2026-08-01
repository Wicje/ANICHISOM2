'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, Terminal, FolderOpen, Globe, Palette, Shield, Zap, 
  Layers, Lock, Cpu, ArrowRight, Play, CheckCircle2, Layout, Monitor, HardDrive,
  Activity, Command, Code2, Database, ShieldCheck, ExternalLink, RefreshCw, ChevronRight,
  Sparkle
} from 'lucide-react';

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [activeTab, setActiveTab] = useState<'desktop' | 'terminal' | 'moodboard' | 'security'>('desktop');

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#030407] text-slate-100 font-sans selection:bg-[#10F4A0]/30 selection:text-[#10F4A0] overflow-x-hidden antialiased">
      {/* ─── Ambient Glow Mesh Spotlights ─── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[650px] bg-gradient-to-b from-[#10F4A0]/20 via-cyan-500/12 to-transparent rounded-full blur-[150px] opacity-80" />
        <div className="absolute top-[35%] -left-80 w-[750px] h-[750px] bg-teal-500/10 rounded-full blur-[180px] opacity-60" />
        <div className="absolute top-[65%] -right-80 w-[750px] h-[750px] bg-[#10F4A0]/12 rounded-full blur-[180px] opacity-60" />
      </div>

      {/* ─── Pixel-Perfect Floating Glass Top Navbar ─── */}
      <header className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2.5rem)] max-w-5xl">
        <div className={`px-5 py-3 rounded-full transition-all duration-300 ${
          scrollY > 20 
            ? 'bg-[#060812]/80 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-black/90' 
            : 'bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-xl'
        }`}>
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#10F4A0] via-cyan-400 to-teal-300 p-0.5 shadow-lg shadow-[#10F4A0]/25 flex items-center justify-center group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-[#05070d] rounded-[10px] flex items-center justify-center">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10F4A0] to-cyan-300 font-black text-sm">C</span>
                </div>
              </div>
              <span className="text-white font-black text-sm tracking-tight font-display">ContinuaOS</span>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-white/60">
              <a href="#overview" className="hover:text-white transition-colors">Overview</a>
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#protocol" className="hover:text-white transition-colors">Protocol</a>
              <a href="#bento" className="hover:text-white transition-colors">Bento Grid</a>
              <a href="#ecosystem" className="hover:text-white transition-colors">Ecosystem</a>
            </nav>

            {/* Right Action CTA */}
            <div className="flex items-center gap-3">
              <Link href="/waitlist" className="text-xs font-semibold text-white/70 hover:text-white transition-colors hidden sm:block">
                Waitlist Access
              </Link>
              <Link 
                href="/os" 
                className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-[#10F4A0] to-cyan-400 text-slate-950 shadow-lg shadow-[#10F4A0]/25 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>Launch Web OS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section id="overview" className="relative pt-36 sm:pt-44 pb-20 px-6 max-w-7xl mx-auto z-10 flex flex-col items-center text-center">
        {/* Pixel-Perfect Intro Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 bg-white/[0.04] border border-[#10F4A0]/40 backdrop-blur-2xl shadow-xl shadow-[#10F4A0]/10 animate-fade-in">
          <Sparkle className="w-3.5 h-3.5 text-[#10F4A0] fill-[#10F4A0]" />
          <span className="text-xs font-bold tracking-widest text-[#10F4A0] uppercase font-mono">INTRODUCING CONTINUAOS 2.4</span>
        </div>

        {/* Massive Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.04] text-white max-w-5xl mb-8">
          The Next-Gen Web OS & <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10F4A0] via-cyan-300 to-teal-300">
            Living Context Protocol
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-xl text-white/65 max-w-3xl leading-relaxed mb-10 font-normal">
          An offline-first, glassmorphic Web OS that persists your open browser tabs, WASM terminal sessions, design moodboards, and brand assets across all devices. Zero state loss.
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link 
            href="/os" 
            className="px-9 py-4 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-[#10F4A0] via-cyan-400 to-teal-300 text-slate-950 shadow-2xl shadow-[#10F4A0]/30 hover:shadow-[#10F4A0]/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2.5"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Launch Web OS Desktop</span>
          </Link>
          <Link 
            href="/waitlist" 
            className="px-8 py-4 rounded-2xl font-semibold text-sm bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/15 backdrop-blur-2xl hover:scale-[1.02] active:scale-95 transition-all"
          >
            Join Private Beta (70 Spots)
          </Link>
        </div>

        {/* ─── Pixel-Perfect 3D Hero Mockup Container ─── */}
        <div className="w-full max-w-5xl rounded-3xl p-3 sm:p-5 bg-gradient-to-b from-white/20 via-white/5 to-transparent border border-white/20 backdrop-blur-3xl shadow-2xl shadow-black relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#10F4A0]/10 via-transparent to-cyan-500/10 pointer-events-none" />
          
          {/* Top Window Control Header */}
          <div className="h-12 bg-slate-950/90 rounded-t-2xl border-b border-white/10 px-4 flex items-center justify-between select-none overflow-x-auto">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>

            {/* Interactive Tab Selector */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              {[
                { id: 'desktop', label: 'OS Desktop', icon: Layout },
                { id: 'terminal', label: 'WASM Terminal', icon: Terminal },
                { id: 'moodboard', label: 'Moodboard Canvas', icon: Palette },
                { id: 'security', label: 'Security Edge', icon: ShieldCheck },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === tab.id 
                      ? 'bg-[#10F4A0] text-slate-950 shadow-md font-bold' 
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono font-bold text-white/40 uppercase">
              <span>Active Session</span>
              <div className="w-2 h-2 rounded-full bg-[#10F4A0] animate-pulse" />
            </div>
          </div>

          {/* 3D Display Frame with Real Render & Glass Overlays */}
          <div className="relative aspect-[16/9] w-full rounded-b-2xl bg-[#080a14] overflow-hidden flex items-center justify-center border border-white/5 group">
            <img 
              src="/images/hero_3d.jpg" 
              alt="ContinuaOS 3D Desktop" 
              className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030407] via-transparent to-black/40" />

            {/* Overlay Glass Cards */}
            <div className="relative z-10 w-full h-full p-6 flex flex-col justify-between pointer-events-none">
              <div className="flex items-center justify-between">
                <div className="px-3.5 py-1.5 rounded-full bg-slate-950/90 backdrop-blur-2xl border border-white/15 text-xs font-mono text-[#10F4A0] flex items-center gap-2 shadow-2xl">
                  <div className="w-2 h-2 rounded-full bg-[#10F4A0] animate-pulse" />
                  <span>Living State Engine · Active</span>
                </div>
              </div>

              {activeTab === 'desktop' && (
                <div className="p-4 rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-white/15 max-w-sm ml-auto shadow-2xl animate-in fade-in duration-300">
                  <div className="text-xs font-bold text-white mb-1 flex items-center gap-2">
                    <Layout className="w-4 h-4 text-[#10F4A0]" />
                    <span>Multi-Window Ecosystem</span>
                  </div>
                  <p className="text-[11px] text-white/60">Persistent state across all open windows, canvas swatch buffers, and WASM terminals.</p>
                </div>
              )}

              {activeTab === 'terminal' && (
                <div className="p-4 rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-emerald-500/30 max-w-sm ml-auto shadow-2xl animate-in fade-in duration-300">
                  <div className="text-xs font-mono font-bold text-[#10F4A0] mb-1 flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    <span>xterm.js + VirtualFS</span>
                  </div>
                  <p className="text-[11px] text-white/60 font-mono">$ continua init --mode=persistent (0ms latency)</p>
                </div>
              )}

              {activeTab === 'moodboard' && (
                <div className="p-4 rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-cyan-500/30 max-w-sm ml-auto shadow-2xl animate-in fade-in duration-300">
                  <div className="text-xs font-bold text-cyan-300 mb-1 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-cyan-400" />
                    <span>Brand Token Sync</span>
                  </div>
                  <p className="text-[11px] text-white/60">Color palettes, typography swatches, and design assets automatically synced.</p>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="p-4 rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-emerald-400/30 max-w-sm ml-auto shadow-2xl animate-in fade-in duration-300">
                  <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Edge Worker JWT Shield</span>
                  </div>
                  <p className="text-[11px] text-white/60">Cloudflare proxy enforces Supabase RLS policies across all edge requests.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Bento Grid Section (Matching Reference Image) ─── */}
      <section id="bento" className="py-24 px-6 max-w-7xl mx-auto z-10 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 bg-white/[0.04] border border-cyan-500/30 text-xs font-bold text-cyan-300 uppercase font-mono">
            BENTO ARCHITECTURE
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Built like infrastructure. Styled like magic.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Context Kernel Protocol (2 Columns, 3D Render) */}
          <div className="md:col-span-2 rounded-3xl bg-slate-950 border border-white/15 overflow-hidden shadow-2xl relative group flex flex-col justify-between min-h-[380px]">
            <img 
              src="/images/context_3d.jpg" 
              alt="3D Context Protocol" 
              className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030407] via-[#030407]/60 to-transparent z-0" />
            
            <div className="relative z-10 p-8">
              <div className="w-12 h-12 rounded-2xl bg-[#10F4A0]/15 border border-[#10F4A0]/30 backdrop-blur-xl flex items-center justify-center text-[#10F4A0] mb-6">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-black text-white mb-3 tracking-tight">Context Kernel Protocol</h3>
              <p className="text-sm text-white/80 leading-relaxed max-w-xl">
                Stores your entire desktop environment as domain-keyed records (theme, layout, open tabs, active tools, brand tokens). When you reopen ContinuaOS, everything recovers instantly without page refreshes.
              </p>
            </div>

            <div className="relative z-10 p-6 flex flex-wrap gap-2 border-t border-white/10 bg-slate-950/60 backdrop-blur-xl">
              <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/15 text-xs font-mono font-bold text-[#10F4A0]">IndexedDB Engine</span>
              <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/15 text-xs font-mono font-bold text-cyan-300">Domain-Keyed Sync</span>
              <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/15 text-xs font-mono font-bold text-teal-300">Zero Refresh State</span>
            </div>
          </div>

          {/* Card 2: Performance Latency */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/15 backdrop-blur-3xl shadow-2xl flex flex-col justify-between group hover:border-cyan-400/40 transition-all duration-300">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">0ms Query Latency</h3>
              <p className="text-sm text-white/60 leading-relaxed mb-6">
                Local-first IndexedDB cache serves queries instantly offline. Multi-device sync pushes changes to Cloudflare Workers in background threads.
              </p>
            </div>
            <div className="text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-[#10F4A0] to-cyan-300">
              100% Offline
            </div>
          </div>

          {/* Card 3: Cloudflare Security */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/15 backdrop-blur-3xl shadow-2xl flex flex-col justify-between group hover:border-emerald-400/40 transition-all duration-300">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Cloudflare Worker RLS</h3>
              <p className="text-xs text-white/60 leading-relaxed mb-4">
                All edge proxy calls enforce Supabase Row-Level Security (RLS) via user JWT tokens. Zero service role key leaks.
              </p>
            </div>
            <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>RLS Token Proxy</span>
            </div>
          </div>

          {/* Card 4: Dual Target Architecture (2 Columns, 3D Render) */}
          <div className="md:col-span-2 rounded-3xl bg-slate-950 border border-white/15 overflow-hidden shadow-2xl relative group flex flex-col justify-between min-h-[380px]">
            <img 
              src="/images/dual_arch.jpg" 
              alt="3D Dual Target Architecture" 
              className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030407] via-[#030407]/60 to-transparent z-0" />

            <div className="relative z-10 p-8">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/30 backdrop-blur-xl flex items-center justify-center text-teal-300 mb-6">
                <Monitor className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-black text-white mb-3 tracking-tight">Dual Target Runtime: Web & Tauri Desktop</h3>
              <p className="text-sm text-white/80 leading-relaxed max-w-xl">
                Run directly in any web browser without installation, or download the native Tauri Desktop application for system webviews, native filesystem bindings, and desktop performance.
              </p>
            </div>

            <div className="relative z-10 p-6 flex flex-wrap gap-4 border-t border-white/10 bg-slate-950/60 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <CheckCircle2 className="w-4 h-4 text-[#10F4A0]" /> Web Browser OS
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <CheckCircle2 className="w-4 h-4 text-[#10F4A0]" /> Tauri Native App
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Ecosystem Marquee Pills ─── */}
      <section id="ecosystem" className="py-24 px-6 text-center z-10 relative">
        <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-4">
          Captures context from your favorite tools
        </h2>
        <p className="text-xs sm:text-sm text-white/50 max-w-lg mx-auto mb-10">
          Chrome extension and reverse proxy integration pull live data directly into your workspace.
        </p>

        <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
          {['Figma', 'Notion', 'Claude', 'GitHub', 'Linear', 'Spotify', 'Canva', 'ChatGPT', 'YouTube', 'Framer', 'VS Code', 'Miro'].map((tool, idx) => (
            <div key={idx} className="px-5 py-2.5 rounded-full bg-white/[0.04] border border-white/12 backdrop-blur-xl text-xs font-semibold text-white/80 hover:text-white hover:border-[#10F4A0]/40 transition-all cursor-default shadow-lg">
              {tool}
            </div>
          ))}
        </div>
      </section>

      {/* ─── Bottom CTA Bento Banner ─── */}
      <section className="py-24 px-6 text-center z-10 relative">
        <div className="max-w-4xl mx-auto rounded-3xl p-12 bg-gradient-to-r from-[#10F4A0]/15 via-cyan-500/10 to-teal-500/15 border border-white/20 backdrop-blur-3xl shadow-2xl">
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">
            Stop restarting. <br />Start continuing.
          </h2>
          <p className="text-sm text-white/60 max-w-md mx-auto mb-8 leading-relaxed">
            Enter your persistent workspace with instant context recovery.
          </p>
          <Link 
            href="/os" 
            className="inline-flex items-center gap-2 px-9 py-4 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-[#10F4A0] to-cyan-400 text-slate-950 shadow-xl shadow-[#10F4A0]/30 hover:brightness-110 active:scale-95 transition-all"
          >
            <span>Launch Web OS Desktop</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/10 text-center text-xs text-white/40 select-none">
        <p>© 2026 ContinuaOS · Persistent Web OS & Context Kernel</p>
      </footer>
    </div>
  );
}
