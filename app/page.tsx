'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, Terminal, FolderOpen, Globe, Palette, Shield, Zap, 
  Layers, Lock, Cpu, ArrowRight, Play, CheckCircle2, Layout, Monitor, HardDrive,
  Activity, Command, Code2, Database, ShieldCheck, ExternalLink, RefreshCw, ChevronRight
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
    <div className="min-h-screen bg-[#030408] text-slate-100 font-sans selection:bg-[#10F4A0]/30 selection:text-[#10F4A0] overflow-x-hidden">
      {/* ─── Ambient Glow Lighting ─── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-[#10F4A0]/15 via-cyan-500/10 to-transparent rounded-full blur-[140px] opacity-70" />
        <div className="absolute top-[30%] -left-60 w-[700px] h-[700px] bg-teal-500/10 rounded-full blur-[160px] opacity-50" />
        <div className="absolute top-[60%] -right-60 w-[700px] h-[700px] bg-[#10F4A0]/10 rounded-full blur-[160px] opacity-50" />
      </div>

      {/* ─── Floating Top Glass Navbar ─── */}
      <nav className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-5xl px-6 py-3 rounded-full transition-all duration-300 ${
        scrollY > 30 
          ? 'bg-[#060812]/80 backdrop-blur-2xl border border-white/12 shadow-2xl shadow-black/80' 
          : 'bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-lg'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#10F4A0] to-cyan-400 p-0.5 shadow-lg shadow-[#10F4A0]/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10F4A0] to-cyan-300 font-black text-sm">C</span>
              </div>
            </div>
            <span className="text-white font-bold text-sm tracking-tight font-display">ContinuaOS</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#bento" className="hover:text-white transition-colors">Protocol</a>
            <a href="#ecosystem" className="hover:text-white transition-colors">Ecosystem</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/waitlist" className="text-xs font-semibold text-white/60 hover:text-white transition-colors hidden sm:block">
              Waitlist
            </Link>
            <Link 
              href="/os" 
              className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-[#10F4A0] to-cyan-400 text-slate-950 shadow-lg shadow-[#10F4A0]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span>Launch Web OS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative pt-36 sm:pt-44 pb-20 px-6 max-w-7xl mx-auto z-10 flex flex-col items-center text-center">
        {/* Floating Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 bg-white/[0.04] border border-[#10F4A0]/30 backdrop-blur-2xl shadow-xl shadow-[#10F4A0]/5 animate-fade-in">
          <div className="w-2 h-2 rounded-full bg-[#10F4A0] animate-pulse" />
          <span className="text-xs font-bold tracking-wider text-[#10F4A0] uppercase font-mono">ContinuaOS 2.4 · Living State Engine</span>
        </div>

        {/* Massive Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05] text-white max-w-5xl mb-8">
          Pick up exactly where you left off. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10F4A0] via-cyan-300 to-teal-300">
            Never lose your context.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-xl text-white/60 max-w-3xl leading-relaxed mb-10 font-normal">
          An offline-first, glassmorphic Web OS that persists your open browser tabs, WASM terminal sessions, design moodboards, and brand assets across all devices.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link 
            href="/os" 
            className="px-9 py-4 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-[#10F4A0] to-cyan-400 text-slate-950 shadow-2xl shadow-[#10F4A0]/30 hover:shadow-[#10F4A0]/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2.5"
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

        {/* ─── Interactive 3D Showcase Frame ─── */}
        <div className="w-full max-w-5xl rounded-3xl p-3 sm:p-5 bg-gradient-to-b from-white/20 via-white/5 to-transparent border border-white/20 backdrop-blur-3xl shadow-2xl shadow-black relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#10F4A0]/10 via-transparent to-cyan-500/10 pointer-events-none" />
          
          {/* Interactive Window Control Tabs */}
          <div className="h-12 bg-slate-950/80 rounded-t-2xl border-b border-white/10 px-4 flex items-center justify-between select-none overflow-x-auto">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>

            {/* Interactive Preview Switcher Tabs */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              {[
                { id: 'desktop', label: 'OS Desktop', icon: Layout },
                { id: 'terminal', label: 'WASM Terminal', icon: Terminal },
                { id: 'moodboard', label: 'Moodboard Canvas', icon: Palette },
                { id: 'security', label: 'Security Admin', icon: ShieldCheck },
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
              <span>Status: Live</span>
              <div className="w-2 h-2 rounded-full bg-[#10F4A0] animate-pulse" />
            </div>
          </div>

          {/* Interactive Screen Display Body */}
          <div className="relative aspect-[16/9] w-full rounded-b-2xl bg-[#080a14] overflow-hidden flex items-center justify-center p-6 border border-white/5">
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#10F4A0_1px,transparent_1px)] [background-size:24px_24px]" />

            {/* Tab 1: OS Desktop View */}
            {activeTab === 'desktop' && (
              <div className="relative z-10 w-full h-full flex flex-col justify-between p-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: 'Terminal', desc: 'Real bash WASM VFS', color: 'from-emerald-500 to-teal-700', icon: Terminal },
                    { name: 'Power Browser', desc: 'Reverse proxy tabs', color: 'from-cyan-500 to-blue-700', icon: Globe },
                    { name: 'Moodboard', desc: 'Canvas & brand tokens', color: 'from-teal-500 to-emerald-700', icon: Palette },
                    { name: 'Code Editor', desc: 'Persistent workspace', color: 'from-cyan-600 to-emerald-800', icon: Code2 },
                  ].map((app, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/12 flex flex-col items-center text-center shadow-xl">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${app.color} flex items-center justify-center shadow-lg mb-2`}>
                        <app.icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-xs font-bold text-white">{app.name}</span>
                      <span className="text-[10px] text-white/40">{app.desc}</span>
                    </div>
                  ))}
                </div>

                {/* Simulated Dock */}
                <div className="w-fit mx-auto px-6 py-2 rounded-2xl bg-slate-950/90 border border-white/15 backdrop-blur-2xl flex items-center gap-3 shadow-2xl">
                  <div className="w-8 h-8 rounded-xl bg-[#10F4A0]/20 flex items-center justify-center text-[#10F4A0] font-bold"><Terminal className="w-4 h-4" /></div>
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-300 font-bold"><Globe className="w-4 h-4" /></div>
                  <div className="w-8 h-8 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-300 font-bold"><Palette className="w-4 h-4" /></div>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300 font-bold"><FolderOpen className="w-4 h-4" /></div>
                </div>
              </div>
            )}

            {/* Tab 2: Terminal View */}
            {activeTab === 'terminal' && (
              <div className="relative z-10 w-full h-full bg-[#05070d] rounded-xl p-5 border border-white/10 font-mono text-xs text-emerald-400 flex flex-col justify-between text-left animate-in fade-in zoom-in-95 duration-300">
                <div>
                  <div className="text-white/40 mb-2">ContinuaOS v2.4 Terminal (xterm.js + VFS)</div>
                  <div className="text-[#10F4A0]">$ continua init --mode=persistent</div>
                  <div className="text-white/60 ml-2">✓ Context layer initialized (IndexedDB)</div>
                  <div className="text-white/60 ml-2">✓ Cloudflare Worker Edge Proxy active</div>
                  <div className="text-[#10F4A0] mt-2">$ continua status</div>
                  <div className="text-cyan-300 ml-2">Active Session: 8 windows restored (0.02s)</div>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <span>continua@os:~$</span>
                  <div className="w-2 h-4 bg-[#10F4A0] animate-pulse" />
                </div>
              </div>
            )}

            {/* Tab 3: Moodboard View */}
            {activeTab === 'moodboard' && (
              <div className="relative z-10 w-full h-full flex items-center justify-center gap-4 p-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-2xl flex flex-col items-center gap-2">
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-tr from-[#10F4A0] to-cyan-500 shadow-xl" />
                  <span className="text-xs font-mono font-bold text-white">#10F4A0</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-2xl flex flex-col items-center gap-2">
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-xl" />
                  <span className="text-xs font-mono font-bold text-white">#00F0FF</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-2xl flex flex-col items-center gap-2">
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-tr from-slate-900 to-black shadow-xl border border-white/20" />
                  <span className="text-xs font-mono font-bold text-white">#05070D</span>
                </div>
              </div>
            )}

            {/* Tab 4: Security View */}
            {activeTab === 'security' && (
              <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center p-6 bg-slate-950/90 rounded-xl border border-white/10 animate-in fade-in zoom-in-95 duration-300">
                <ShieldCheck className="w-12 h-12 text-[#10F4A0] mb-3" />
                <h3 className="text-base font-bold text-white mb-1">Supabase Row-Level Security (RLS) & JWT Auth</h3>
                <p className="text-xs text-white/60 max-w-md">Cloudflare Worker proxies all request tokens. Zero service-role keys exposed.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Bento Grid Architecture Showcase ─── */}
      <section id="bento" className="py-24 px-6 max-w-7xl mx-auto z-10 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 bg-white/[0.04] border border-cyan-500/30 text-xs font-bold text-cyan-300 uppercase font-mono">
            Architectural Excellence
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Built like infrastructure. Styled like magic.
          </h2>
        </div>

        {/* 3D Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Bento Card 1 (Large 2-column) */}
          <div className="md:col-span-2 p-8 rounded-3xl bg-gradient-to-br from-white/[0.06] to-white/[0.01] border border-white/15 backdrop-blur-3xl shadow-2xl flex flex-col justify-between group hover:border-[#10F4A0]/40 transition-all duration-300">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#10F4A0]/15 border border-[#10F4A0]/30 flex items-center justify-center text-[#10F4A0] mb-6">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Context Kernel Protocol</h3>
              <p className="text-sm text-white/60 leading-relaxed max-w-xl mb-6">
                Stores your entire desktop environment as domain-keyed records (theme, layout, open tabs, active tools, brand tokens). When you reopen ContinuaOS, everything recovers instantly without page refreshes.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
              <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-[#10F4A0]">IndexedDB Engine</span>
              <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-cyan-300">Domain-Keyed Sync</span>
              <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-teal-300">Zero Refresh State</span>
            </div>
          </div>

          {/* Bento Card 2 (Performance Metrics) */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-white/[0.06] to-white/[0.01] border border-white/15 backdrop-blur-3xl shadow-2xl flex flex-col justify-between group hover:border-cyan-400/40 transition-all duration-300">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">0ms Query Latency</h3>
              <p className="text-sm text-white/60 leading-relaxed mb-6">
                Local-first IndexedDB cache serves queries instantly offline. Multi-device sync pushes changes to Cloudflare Workers in background threads.
              </p>
            </div>
            <div className="text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-[#10F4A0] to-cyan-300">
              100% Offline
            </div>
          </div>

          {/* Bento Card 3 (Security Edge) */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-white/[0.06] to-white/[0.01] border border-white/15 backdrop-blur-3xl shadow-2xl flex flex-col justify-between group hover:border-emerald-400/40 transition-all duration-300">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Cloudflare Worker RLS</h3>
              <p className="text-xs text-white/60 leading-relaxed mb-4">
                All edge proxy calls enforce Supabase Row-Level Security (RLS) via user JWT tokens.
              </p>
            </div>
            <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>RLS Active</span>
            </div>
          </div>

          {/* Bento Card 4 (Dual Target Architecture) */}
          <div className="md:col-span-2 p-8 rounded-3xl bg-gradient-to-br from-white/[0.06] to-white/[0.01] border border-white/15 backdrop-blur-3xl shadow-2xl flex flex-col justify-between group hover:border-teal-400/40 transition-all duration-300">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-300 mb-6">
                <Monitor className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Dual Target Runtime: Web & Tauri Desktop</h3>
              <p className="text-sm text-white/60 leading-relaxed max-w-xl mb-6">
                Run directly in any web browser without installation, or download the native Tauri Desktop application for system webviews, native filesystem bindings, and desktop performance.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
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
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
          Captures context from your favorite tools
        </h2>
        <p className="text-xs sm:text-sm text-white/50 max-w-lg mx-auto mb-10">
          Chrome extension and reverse proxy integration pull live data directly into your workspace.
        </p>

        <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
          {['Figma', 'Notion', 'Claude', 'GitHub', 'Linear', 'Spotify', 'Canva', 'ChatGPT', 'YouTube', 'Framer', 'VS Code', 'Miro'].map((tool, idx) => (
            <div key={idx} className="px-5 py-2.5 rounded-full bg-white/[0.04] border border-white/12 backdrop-blur-xl text-xs font-semibold text-white/80 hover:text-white hover:border-[#10F4A0]/40 transition-all cursor-default">
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
