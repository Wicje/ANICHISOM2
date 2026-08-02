'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore, OSRole } from '@/lib/stores/auth.store';
import { createClient } from '@/utils/supabase/client';
import { Loader2, AlertCircle, Mail, Lock, UserPlus, LogIn, Ticket, Fingerprint } from 'lucide-react';

type AuthMode = 'login' | 'signup';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

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
  const [passkeySupported, setPasskeySupported] = useState(false);

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

  useEffect(() => {
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      setPasskeySupported(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (mode === 'signup') {
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

        if (data?.user) {
          setCurrentUser({
            id: data.user.id,
            name: data.user.user_metadata?.name || email.split('@')[0],
            role: (data.user.user_metadata?.role as OSRole) || 'user',
            avatarUrl: data.user.user_metadata?.avatar_url,
          });
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSO = async (provider: 'google' | 'github') => {
    setError('');
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'SSO failed';
      setError(message);
      setIsLoading(false);
    }
  };

  const handlePasskey = async () => {
    setError('');
    setIsLoading(true);
    try {
      if (!window.PublicKeyCredential) {
        throw new Error('Passkeys are not supported in this browser');
      }

      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        throw new Error('No platform authenticator available (Touch ID, Windows Hello, etc.)');
      }

      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'Continua', id: window.location.hostname },
          user: {
            id: new Uint8Array(16),
            name: email || 'user@continua',
            displayName: displayName || 'Continua User',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      });

      if (credential) {
        if (!email) {
          throw new Error('Enter your email first to complete passkey sign-in');
        }
        const { data, error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            data: { passkey_verified: true },
          },
        });

        if (error) throw error;
        setSuccessMsg('Passkey verified. Check your email for the magic link to complete sign-in.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Passkey authentication failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#060608] flex items-center justify-center p-4 font-sans overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#10F4A0]/[0.03] blur-[120px] pointer-events-none" />

      {/* Grid texture */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div className="relative z-10 w-full max-w-[400px]">
        {/* Logo + tagline */}
        <div className="flex flex-col items-center gap-5 mb-12 text-center">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#10F4A0] to-[#0BC68A] flex items-center justify-center shadow-[0_0_60px_rgba(16,244,160,0.2)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#060608" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#10F4A0] animate-pulse" />
          </div>

          <div>
            <h1 className="font-mono text-[22px] font-bold text-white tracking-[0.25em] uppercase">
              Continua
            </h1>
            <p className="text-white/30 text-[11px] font-mono tracking-[0.15em] mt-2">
              The layer that remembers
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="w-full bg-red-500/[0.08] border border-red-500/20 text-red-300/90 text-xs p-3.5 flex items-start gap-3 mb-5 rounded-lg font-mono">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Success */}
        {successMsg && (
          <div className="w-full bg-[#10F4A0]/[0.08] border border-[#10F4A0]/20 text-[#10F4A0] text-xs p-3.5 flex items-start gap-3 mb-5 rounded-lg font-mono">
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* SSO Buttons */}
        <div className="flex flex-col gap-2.5 mb-5">
          <button
            onClick={() => handleSSO('google')}
            disabled={isLoading}
            className="w-full bg-white/[0.06] hover:bg-white/[0.1] text-white/90 disabled:opacity-50 font-medium py-3 transition-all flex items-center justify-center gap-3 text-sm rounded-lg border border-white/[0.08] hover:border-white/[0.15]"
          >
            <GoogleIcon className="w-4 h-4" />
            Continue with Google
          </button>

          <button
            onClick={() => handleSSO('github')}
            disabled={isLoading}
            className="w-full bg-white/[0.06] hover:bg-white/[0.1] text-white/90 disabled:opacity-50 font-medium py-3 transition-all flex items-center justify-center gap-3 text-sm rounded-lg border border-white/[0.08] hover:border-white/[0.15]"
          >
            <GitHubIcon className="w-4 h-4" />
            Continue with GitHub
          </button>

          {passkeySupported && (
            <button
              onClick={handlePasskey}
              disabled={isLoading}
              className="w-full bg-white/[0.04] hover:bg-white/[0.08] text-white/70 disabled:opacity-50 font-medium py-3 transition-all flex items-center justify-center gap-3 text-sm rounded-lg border border-white/[0.06] hover:border-white/[0.12]"
            >
              <Fingerprint className="w-4 h-4" />
              Sign in with Passkey
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-5">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-white/20 text-[10px] uppercase tracking-[0.2em] font-mono">or</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 p-6 bg-white/[0.03] border border-white/[0.08] rounded-xl backdrop-blur-sm">
          {mode === 'signup' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-mono">Name</label>
              <div className="flex items-center bg-white/[0.04] rounded-lg border border-white/[0.06] focus-within:border-[#10F4A0]/40 transition-colors">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-transparent px-4 py-3 text-white placeholder-white/20 focus:outline-none text-sm"
                />
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-mono">Invite Code</label>
              <div className="flex items-center bg-white/[0.04] rounded-lg border border-white/[0.06] focus-within:border-[#10F4A0]/40 transition-colors">
                <Ticket className="w-4 h-4 text-white/20 shrink-0 ml-4" />
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value.toUpperCase());
                    setInviteValid(null);
                  }}
                  placeholder="Enter your invite code"
                  required
                  className="w-full bg-transparent px-3 py-3 text-white placeholder-white/20 focus:outline-none text-sm tracking-wide uppercase font-mono"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-mono">Email</label>
            <div className="flex items-center bg-white/[0.04] rounded-lg border border-white/[0.06] focus-within:border-[#10F4A0]/40 transition-colors">
              <Mail className="w-4 h-4 text-white/20 shrink-0 ml-4" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                className="w-full bg-transparent px-3 py-3 text-white placeholder-white/20 focus:outline-none text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-mono">Password</label>
            <div className="flex items-center bg-white/[0.04] rounded-lg border border-white/[0.06] focus-within:border-[#10F4A0]/40 transition-colors">
              <Lock className="w-4 h-4 text-white/20 shrink-0 ml-4" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Min 6 characters' : 'Your password'}
                required
                minLength={6}
                className="w-full bg-transparent px-3 py-3 text-white placeholder-white/20 focus:outline-none text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#10F4A0] hover:bg-[#0BC68A] text-[#060608] disabled:opacity-40 disabled:cursor-not-allowed font-bold py-3.5 transition-all flex items-center justify-center gap-2.5 rounded-lg text-sm mt-1"
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

        {/* Mode toggle */}
        <div className="mt-5 text-center">
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccessMsg(''); setInviteCode(''); setInviteValid(null); }}
            className="text-white/20 hover:text-white/50 text-[11px] uppercase tracking-[0.15em] transition-colors font-mono"
          >
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>

        {/* Waitlist link */}
        <div className="mt-3 text-center">
          <a
            href="/waitlist"
            className="text-white/15 hover:text-[#10F4A0]/60 text-[10px] uppercase tracking-[0.2em] transition-colors font-mono"
          >
            Don't have an invite? Request access
          </a>
        </div>
      </div>
    </div>
  );
}
