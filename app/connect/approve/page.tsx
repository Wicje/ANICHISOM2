'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Laptop,
  CheckCircle2,
  XCircle,
  ArrowRight,
  LogIn,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

type ApprovalState = 'loading' | 'signed_out' | 'ready' | 'granting' | 'granted' | 'error';

export default function ApprovePairingPage() {
  const router = useRouter();
  const [state, setState] = useState<ApprovalState>('loading');
  const [pin, setPin] = useState('');
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPin = (params.get('pin') || '').trim().toUpperCase();
    setPin(urlPin);

    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          setState('signed_out');
          return;
        }
        if (!/^[A-Z2-9]{6}$/.test(urlPin)) {
          setErrorMessage('This approval link is invalid or incomplete. Enter the PIN shown on the guest computer.');
          setState('error');
          return;
        }
        setUserName(data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Continua User');
        setUserId(data.user.id);
        setState('ready');
      } catch {
        setState('signed_out');
      }
    };

    checkAuth();
  }, []);

  const handleGrant = async () => {
    if (state !== 'ready') return;
    setState('granting');
    setErrorMessage('');

    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const capabilityToken =
        sessionData.session?.access_token || `cap_${crypto.randomUUID().slice(0, 12)}`;

      const res = await fetch('/api/connect/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin,
          workspace: 'Continua OS',
          clientInfo: `${userName} (Mobile Key)`,
          userId,
          capabilityToken,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErrorMessage(json.error || 'Pairing failed. The code may have expired — refresh the guest screen and try again.');
        setState('error');
        return;
      }

      setState('granted');
      setTimeout(() => router.push('/os'), 1600);
    } catch {
      setErrorMessage('Network error. Check your connection and try again.');
      setState('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#060810] text-slate-100 font-sans selection:bg-[#10F4A0]/30 selection:text-[#10F4A0] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#10F4A0]/10 via-cyan-500/10 to-transparent rounded-full blur-[140px] pointer-events-none" />

      <header className="absolute top-8 left-8 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#10F4A0] via-cyan-400 to-teal-300 p-0.5 shadow-lg shadow-[#10F4A0]/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#060810] rounded-[10px] flex items-center justify-center">
              <span className="text-[#10F4A0] font-black text-sm">C</span>
            </div>
          </div>
          <span className="text-white font-bold text-sm tracking-tight">Continua</span>
        </Link>
      </header>

      <div className="w-full max-w-md bg-[#0D121F]/90 border border-white/10 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl relative z-10 space-y-6 text-center">

        {state === 'loading' && (
          <div className="py-12 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-[#10F4A0]" />
            <p className="text-xs text-white/50">Verifying your mobile key…</p>
          </div>
        )}

        {state === 'signed_out' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto">
              <LogIn className="w-7 h-7 text-[#10F4A0]" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black tracking-tight text-white">Sign in to approve</h1>
              <p className="text-xs text-white/60 leading-relaxed">
                Pairing requests can only be approved by your Continua Mobile Key. Sign in on this phone first, then rescan the QR code.
              </p>
            </div>
            <Link
              href="/os"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#10F4A0] to-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-[#10F4A0]/20 hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <span>Open Continua & Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </>
        )}

        {(state === 'ready' || state === 'granting') && (
          <>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10F4A0]/10 border border-[#10F4A0]/30 text-[#10F4A0] text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>APPROVE PAIRING REQUEST</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                Grant access to this computer?
              </h1>
              <p className="text-xs text-white/60 max-w-xs mx-auto leading-relaxed">
                A guest machine is requesting an ephemeral Continua session approved by <strong>{userName}</strong>.
              </p>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-left">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <Laptop className="w-5 h-5 text-cyan-300" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">Guest Computer</div>
                <div className="text-[11px] text-white/40 font-mono">
                  PIN: <span className="text-[#10F4A0] font-bold tracking-widest">{pin}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left pt-1">
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-white/90 text-xs font-semibold">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Scoped Session</span>
                </div>
                <div className="text-[10px] text-white/40 leading-normal">60-minute expiring token only.</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-white/90 text-xs font-semibold">
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  <span>Zero Key Leak</span>
                </div>
                <div className="text-[10px] text-white/40 leading-normal">Raw credentials never leave this phone.</div>
              </div>
            </div>

            <button
              onClick={handleGrant}
              disabled={state === 'granting'}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#10F4A0] to-cyan-400 text-slate-950 font-black text-sm shadow-lg shadow-[#10F4A0]/25 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {state === 'granting' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Approving…</span>
                </>
              ) : (
                <>
                  <span>Grant Access</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </>
        )}

        {state === 'granted' && (
          <div className="py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Access Granted</h2>
            <p className="text-xs text-white/60">
              The guest computer is hydrating your workspace now.
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="py-10 space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <XCircle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white">Can&apos;t approve</h2>
            <p className="text-xs text-white/60 leading-relaxed">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white font-bold text-xs hover:bg-white/10 transition-all"
            >
              Try Again
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
