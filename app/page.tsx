'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, Terminal, FolderOpen, Globe, Palette, Shield, Zap, 
  Layers, Lock, Cpu, ArrowRight, Play, CheckCircle2, Layout, Monitor, HardDrive
} from 'lucide-react';
import { AppIcon } from '@/components/ui/app-icon';

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 overflow-x-hidden">
      {/* Ambient Radial Mesh Glows — Pure Continua Emerald Green & Electric Cyan */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-[#10F4A0]/20 via-cyan-500/10 to-transparent rounded-full blur-[120px] opacity-70" />
        <div className="absolute top-[40%] -left-40 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] opacity-50" />
        <div className="absolute top-[70%] -right-40 w-[600px] h-[600px] bg-[#10F4A0]/10 rounded-full blur-[140px] opacity-50" />
      </div>

      {/* ─── Nav ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 px-6 sm:px-12 py-4 flex items-center justify-between transition-all duration-300 ${
        scrollY > 30 
          ? 'bg-[#05070d]/80 backdrop-blur-2xl border-b border-white/10 shadow-2xl' 
          : 'bg-transparent border-b border-transparent'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#10F4A0] to-cyan-500 p-0.5 shadow-lg shadow-[#10F4A0]/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10F4A0] to-cyan-300 font-black text-base">C</span>
            </div>
          </div>
          <span className="text-white font-bold text-base tracking-tight font-display">ContinuaOS</span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/waitlist" className="text-xs font-semibold text-white/60 hover:text-white transition-colors hidden sm:block">
            Waitlist Access
          </Link>
          <Link 
            href="/os" 
            className="px-5 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-[#10F4A0] to-cyan-500 text-slate-950 shadow-lg shadow-[#10F4A0]/25 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
          >
            <span>Launch Web OS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative pt-36 pb-20 px-6 max-w-6xl mx-auto z-10 flex flex-col items-center text-center">
        {/* Floating Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 bg-white/[0.04] border border-[#10F4A0]/30 backdrop-blur-xl shadow-lg shadow-[#10F4A0]/5 animate-fade-in">
          <Sparkles className="w-4 h-4 text-[#10F4A0]" />
          <span className="text-xs font-bold tracking-wide text-[#10F4A0] uppercase">Persistent Context Layer & Offline-First Web OS</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.08] text-white max-w-4xl mb-6">
          Pick up exactly where you left off. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10F4A0] via-cyan-300 to-teal-400">
            Never start from scratch.
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-base sm:text-lg text-white/60 max-w-2xl leading-relaxed mb-10">
          ContinuaOS persists your workspace — open terminal sessions, browser windows, design moodboards, and developer tooling — seamlessly synced across all your hardware.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link 
            href="/os" 
            className="px-8 py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#10F4A0] to-cyan-500 text-slate-950 shadow-xl shadow-[#10F4A0]/25 hover:shadow-[#10F4A0]/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2.5"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Launch Web OS Now</span>
          </Link>
          <Link 
            href="/waitlist" 
            className="px-8 py-4 rounded-2xl font-semibold text-sm bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/12 backdrop-blur-xl hover:scale-[1.02] active:scale-95 transition-all"
          >
            Join Private Beta (70 Spots)
          </Link>
        </div>

        {/* OS Interface Hero Mockup */}
        <div className="w-full rounded-3xl p-3 sm:p-4 bg-gradient-to-b from-white/15 to-white/5 border border-white/15 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#10F4A0]/10 via-transparent to-cyan-500/10 pointer-events-none" />
          
          {/* OS Window Header Simulation */}
          <div className="h-10 bg-black/40 rounded-t-2xl border-b border-white/10 px-4 flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="text-[11px] font-bold text-white/40 font-mono uppercase tracking-widest">
              ContinuaOS Desktop v2.4 · Living State
            </div>
            <div className="w-12" />
          </div>

          {/* Desktop Preview Banner */}
          <div className="relative aspect-[16/9] w-full rounded-b-2xl bg-[#090b14] overflow-hidden flex items-center justify-center p-6 border border-white/5">
            {/* Background Graphic Grid */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10F4A0_1px,transparent_1px)] [background-size:24px_24px]" />
            
            {/* Floating Glass App Cards Preview */}
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
              {[
                { name: 'Terminal', icon: Terminal, color: 'from-emerald-500 to-teal-700', desc: 'Real bash & WASM filesystem' },
                { name: 'Power Browser', icon: Globe, color: 'from-cyan-500 to-blue-700', desc: 'Iframe & proxy tab sessions' },
                { name: 'Moodboard', icon: Palette, color: 'from-teal-500 to-emerald-700', desc: 'Canvas & color palettes' },
                { name: 'Security Admin', icon: Shield, color: 'from-emerald-600 to-cyan-800', desc: 'RLS & encrypted sync' },
              ].map((app, idx) => (
                <div 
                  key={idx} 
                  className="p-5 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/12 hover:border-[#10F4A0]/40 transition-all duration-300 flex flex-col items-center text-center shadow-xl group/card"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${app.color} flex items-center justify-center shadow-lg mb-3 group-hover/card:scale-110 transition-transform`}>
                    <app.icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1">{app.name}</h4>
                  <p className="text-[10px] text-white/50">{app.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Architectural Pillars Section ─── */}
      <section className="py-24 px-6 max-w-6xl mx-auto z-10 relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Four Core Pillars. One Unified System.
          </h2>
          <p className="text-sm text-white/50 max-w-xl mx-auto">
            Engineered from the ground up for high-performance creative workflows and continuous offline resilience.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'Context Layer',
              desc: 'Persists workspace state, active tabs, themes, and window coordinates across reboots.',
              icon: Layers,
              gradient: 'from-[#10F4A0]/20 to-teal-500/10',
              accent: 'text-[#10F4A0]',
            },
            {
              step: '02',
              title: 'Offline-First IDB',
              desc: 'Operates 100% offline with IndexedDB fallback and zero-delay local database queries.',
              icon: HardDrive,
              gradient: 'from-emerald-500/20 to-teal-500/10',
              accent: 'text-emerald-400',
            },
            {
              step: '03',
              title: 'Cloudflare Workers',
              desc: 'Enforces Supabase RLS policies and JWT authentication proxies at the edge.',
              icon: Cpu,
              gradient: 'from-cyan-500/20 to-blue-500/10',
              accent: 'text-cyan-400',
            },
            {
              step: '04',
              title: 'Tauri & Web Native',
              desc: 'Dual-target architecture: run directly in any web browser or native desktop app.',
              icon: Monitor,
              gradient: 'from-teal-500/20 to-emerald-500/10',
              accent: 'text-teal-300',
            },
          ].map((pillar, idx) => (
            <div 
              key={idx} 
              className={`p-6 rounded-3xl bg-gradient-to-b ${pillar.gradient} border border-white/10 backdrop-blur-2xl shadow-xl flex flex-col justify-between hover:border-white/20 transition-all`}
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 ${pillar.accent}`}>
                    <pillar.icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono font-bold text-white/30">{pillar.step}</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">{pillar.title}</h3>
                <p className="text-xs text-white/60 leading-relaxed">{pillar.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Footer CTA ─── */}
      <section className="py-24 px-6 text-center z-10 relative">
        <div className="max-w-3xl mx-auto rounded-3xl p-12 bg-gradient-to-r from-[#10F4A0]/10 via-cyan-500/10 to-teal-500/10 border border-white/15 backdrop-blur-3xl shadow-2xl">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to experience ContinuaOS?
          </h2>
          <p className="text-xs sm:text-sm text-white/60 max-w-md mx-auto mb-8 leading-relaxed">
            Enter your workspace with instant context recovery. Zero setup required.
          </p>
          <Link 
            href="/os" 
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#10F4A0] to-cyan-500 text-slate-950 shadow-xl shadow-[#10F4A0]/25 hover:brightness-110 active:scale-95 transition-all"
          >
            <span>Launch Desktop Web OS</span>
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
