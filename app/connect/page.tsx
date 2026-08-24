'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  QrCode, 
  ShieldCheck, 
  Laptop, 
  Smartphone, 
  RefreshCw, 
  ArrowRight, 
  Lock, 
  Clock, 
  Sparkles, 
  CheckCircle2 
} from 'lucide-react';
import Link from 'next/link';

export default function ConnectPage() {
  const router = useRouter();
  const [pinCode, setPinCode] = useState('7X9K21');
  const [timeLeft, setTimeLeft] = useState(120);
  const [pairingStatus, setPairingStatus] = useState<'waiting' | 'approved' | 'hydrating'>('waiting');
  const [pairedDevice, setPairedDevice] = useState('Josephan (Samsung Galaxy)');

  // Countdown and PIN generator
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          let code = '';
          for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          setPinCode(code);
          return 120;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Live polling for cross-device approval over network
  useEffect(() => {
    if (pairingStatus !== 'waiting') return;

    let isMounted = true;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/connect/pair?pin=${pinCode}`);
        if (!res.ok) return;
        const json = await res.json();
        
        if (json.ok && json.status === 'approved' && isMounted) {
          if (json.data?.clientInfo) {
            setPairedDevice(json.data.clientInfo);
          }
          setPairingStatus('approved');
          setTimeout(() => {
            if (isMounted) {
              setPairingStatus('hydrating');
              setTimeout(() => {
                if (isMounted) {
                  router.push('/os?ephemeral=true');
                }
              }, 1400);
            }
          }, 1200);
        }
      } catch (err) {
        // Polling retry
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [pinCode, pairingStatus, router]);

  const handleSimulateApprove = async () => {
    try {
      await fetch('/api/connect/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: pinCode,
          workspace: 'Continua OS',
          clientInfo: 'Demo Mobile Key (Instant Authorize)',
        }),
      });
    } catch {}
    setPairingStatus('approved');
    setTimeout(() => {
      setPairingStatus('hydrating');
      setTimeout(() => {
        router.push('/os?ephemeral=true');
      }, 1400);
    }, 1200);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = (timeLeft % 60).toString().padStart(2, '0');

  return (
    <div className="min-h-screen bg-[#060810] text-slate-100 font-sans selection:bg-[#10F4A0]/30 selection:text-[#10F4A0] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#10F4A0]/10 via-cyan-500/10 to-transparent rounded-full blur-[140px] pointer-events-none" />

      {/* Top Brand Logo */}
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

      {/* Main Connect Card */}
      <div className="w-full max-w-md bg-[#0D121F]/90 border border-white/10 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl relative z-10 space-y-6 text-center">
        
        {pairingStatus === 'waiting' && (
          <>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10F4A0]/10 border border-[#10F4A0]/30 text-[#10F4A0] text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>EPHEMERAL GUEST CONNECT</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                Pair This Computer
              </h1>
              <p className="text-xs text-white/60 max-w-xs mx-auto leading-relaxed">
                Scan with your <strong>Continua Mobile Key</strong> to restore your workspace without entering passwords or leaking API keys.
              </p>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-6 bg-white/[0.02] border border-white/10 rounded-2xl relative group">
              <div className="w-48 h-48 bg-white p-3 rounded-2xl shadow-2xl flex items-center justify-center relative">
                {/* SVG Visual QR Mockup */}
                <div className="w-full h-full border-2 border-slate-950 flex flex-col justify-between p-1 bg-white">
                  <div className="flex justify-between">
                    <div className="w-10 h-10 bg-slate-950 rounded-sm" />
                    <div className="w-10 h-10 bg-slate-950 rounded-sm" />
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="w-8 h-8 bg-[#10F4A0] rounded-lg flex items-center justify-center font-black text-xs text-slate-950">
                      C
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <div className="w-10 h-10 bg-slate-950 rounded-sm" />
                    <div className="w-6 h-6 bg-slate-950 rounded-sm" />
                  </div>
                </div>
              </div>

              {/* PIN Code Display */}
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-white/50">OR ENTER PIN:</span>
                <span className="font-mono font-bold text-sm tracking-widest text-[#10F4A0] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                  {pinCode}
                </span>
              </div>

              {/* Expiry Timer & Live Network Status */}
              <div className="mt-3 flex items-center justify-between w-full px-2 text-[11px] text-white/40 font-mono">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Expires in {minutes}:{seconds}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Awaiting Scan</span>
                </div>
              </div>
            </div>

            {/* Security Guarantee Badges */}
            <div className="grid grid-cols-2 gap-2 text-left pt-2">
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-white/90 text-xs font-semibold">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>Zero Key Leak</span>
                </div>
                <div className="text-[10px] text-white/40 leading-normal">
                  Credentials remain in phone vault.
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-white/90 text-xs font-semibold">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>Auto-Wipe</span>
                </div>
                <div className="text-[10px] text-white/40 leading-normal">
                  Local cache cleared on exit.
                </div>
              </div>
            </div>

            {/* Simulate Instant Approve Button for Demo/Testing */}
            <button
              onClick={handleSimulateApprove}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#10F4A0] to-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-[#10F4A0]/20 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <span>Authorize from Mobile (Instant Pair)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {pairingStatus === 'approved' && (
          <div className="py-12 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Approved by Mobile Key</h2>
            <p className="text-xs text-white/60">
              Verified identity: <strong>{pairedDevice}</strong>
            </p>
            <div className="text-[11px] font-mono text-[#10F4A0] bg-[#10F4A0]/10 py-1.5 px-3 rounded-lg inline-block border border-[#10F4A0]/20">
              Session Capability: 60 Minutes Granted
            </div>
          </div>
        )}

        {pairingStatus === 'hydrating' && (
          <div className="py-12 space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full border-2 border-[#10F4A0] border-t-transparent animate-spin mx-auto" />
            <h2 className="text-lg font-bold text-white">Hydrating Workspace Context...</h2>
            <p className="text-xs text-white/50">
              Restoring Continua OS • Git branch [context-engine] • 8 research tabs
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
