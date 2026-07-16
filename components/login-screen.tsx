'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore, OSRole } from '@/lib/stores/auth.store';
import { createClient } from '@/utils/supabase/client';
import { Key, Loader2, AlertCircle, Mail, Lock, UserPlus, LogIn, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'signup';

export function LoginScreen() {
  const { setCurrentUser } = useAuthStore();
  const supabase = createClient();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser({
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: (user.user_metadata?.role as OSRole) || 'user',
          avatarUrl: user.user_metadata?.avatar_url,
        });
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        // Validate invite code
        if (!inviteCode.trim()) {
          setError('Invite code is required');
          setIsLoading(false);
          return;
        }

        const inviteRes = await fetch('/api/auth/invite/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: inviteCode.trim() }),
        });
        const inviteData = await inviteRes.json();

        if (!inviteData.ok) {
          setError(inviteData.error || 'Invalid invite code');
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: displayName || email.split('@')[0],
              role: inviteData.data?.role || 'user',
            },
          },
        });

        if (error) throw error;

        if (data.user && !data.session) {
          setSuccessMsg('Check your email to confirm your account, then log in.');
          setIsLoading(false);
          return;
        }

        if (data.session?.user) {
          // Redeem invite code
          await fetch('/api/auth/invite/redeem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: inviteCode.trim(), userId: data.session.user.id }),
          });

          setCurrentUser({
            id: data.session.user.id,
            name: data.session.user.user_metadata?.name || email.split('@')[0],
            role: (data.session.user.user_metadata?.role as OSRole) || 'user',
          });
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setCurrentUser({
          id: data.user.id,
          name: data.user.user_metadata?.name || email.split('@')[0],
          role: (data.user.user_metadata?.role as OSRole) || 'user',
          avatarUrl: data.user.user_metadata?.avatar_url,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center gap-4 mb-10 text-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-none flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.15)]">
              <Key className="w-6 h-6 text-black" />
            </div>
            <div className="font-mono text-2xl font-bold text-white tracking-[0.2em] uppercase">
              Anichisom OS
            </div>
          </div>
          <p className="text-white/40 text-xs max-w-xs font-mono uppercase tracking-widest">
            {mode === 'login' ? 'Sign in to your workspace' : 'Create your account'}
          </p>
        </div>

        {error && (
          <div className="w-full bg-white/5 border border-white/20 text-white text-xs p-4 flex items-start gap-3 mb-6 backdrop-blur-md font-mono uppercase tracking-wide">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-4 flex items-start gap-3 mb-6 backdrop-blur-md font-mono uppercase tracking-wide">
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5 p-8 bg-black border border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.05)]">
          {mode === 'signup' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-mono">Name</label>
              <div className="flex items-center border-b border-white/20 focus-within:border-white transition-colors">
                <UserPlus className="w-4 h-4 text-white/30 shrink-0" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-transparent px-3 py-3 text-white placeholder-white/20 focus:outline-none text-sm tracking-wide"
                />
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-mono">Invite Code</label>
              <div className="flex items-center border-b border-white/20 focus-within:border-white transition-colors">
                <Ticket className="w-4 h-4 text-white/30 shrink-0" />
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value.toUpperCase());
                    setInviteValid(null);
                  }}
                  placeholder="Enter your invite code"
                  required
                  className="w-full bg-transparent px-3 py-3 text-white placeholder-white/20 focus:outline-none text-sm tracking-wide uppercase"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-mono">Email</label>
            <div className="flex items-center border-b border-white/20 focus-within:border-white transition-colors">
              <Mail className="w-4 h-4 text-white/30 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                className="w-full bg-transparent px-3 py-3 text-white placeholder-white/20 focus:outline-none text-sm tracking-wide"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-mono">Password</label>
            <div className="flex items-center border-b border-white/20 focus-within:border-white transition-colors">
              <Lock className="w-4 h-4 text-white/30 shrink-0" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Min 6 characters' : 'Your password'}
                required
                minLength={6}
                className="w-full bg-transparent px-3 py-3 text-white placeholder-white/20 focus:outline-none text-sm tracking-wide"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white hover:bg-neutral-200 text-black disabled:opacity-50 disabled:cursor-not-allowed font-bold py-4 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'login' ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {isLoading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccessMsg(''); setInviteCode(''); setInviteValid(null); }}
            className="text-white/30 hover:text-white text-xs uppercase tracking-widest transition-colors font-mono"
          >
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
