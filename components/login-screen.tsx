'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore, OSRole } from '@/lib/stores/auth.store';
import { createClient } from '@/utils/supabase/client';
import { Key, Loader2, AlertCircle, Mail, Lock, UserPlus, LogIn, Ticket, Fingerprint } from 'lucide-react';

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

  const handleBootstrap = async () => {
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: displayName || email.split('@')[0],
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.error || 'Bootstrap failed');
        setIsLoading(false);
        return;
      }

      if (data.data?.user) {
        setSuccessMsg('Admin account created. Switching to login...');
        setTimeout(() => {
          setMode('login');
          setIsLoading(false);
        }, 2000);
      } else {
        setSuccessMsg(data.data?.message || 'Check your email to confirm your account');
        setIsLoading(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bootstrap failed';
      setError(message);
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
          rp: { name: 'ContinuaOS', id: window.location.hostname },
          user: {
            id: new Uint8Array(16),
            name: email || 'user@continuaos',
            displayName: displayName || 'ContinuaOS User',
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
    <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center gap-4 mb-10 text-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-none flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.15)]">
              <Key className="w-6 h-6 text-black" />
            </div>
            <div className="font-mono text-2xl font-bold text-white tracking-[0.2em] uppercase">
              ContinuaOS
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

        {/* SSO Buttons */}
        <div className="flex flex-col gap-3 mb-6">
          <button
            onClick={() => handleSSO('google')}
            disabled={isLoading}
            className="w-full bg-white hover:bg-neutral-100 text-black disabled:opacity-50 font-bold py-3.5 transition-all flex items-center justify-center gap-3 text-sm"
          >
            <GoogleIcon className="w-5 h-5" />
            Continue with Google
          </button>

          <button
            onClick={() => handleSSO('github')}
            disabled={isLoading}
            className="w-full bg-[#24292e] hover:bg-[#2f363d] text-white disabled:opacity-50 font-bold py-3.5 transition-all flex items-center justify-center gap-3 text-sm"
          >
            <GitHubIcon className="w-5 h-5" />
            Continue with GitHub
          </button>

          {passkeySupported && (
            <button
              onClick={handlePasskey}
              disabled={isLoading}
              className="w-full bg-white/10 hover:bg-white/15 text-white disabled:opacity-50 font-bold py-3.5 transition-all flex items-center justify-center gap-3 text-sm border border-white/20"
            >
              <Fingerprint className="w-5 h-5" />
              Sign in with Passkey
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-[10px] uppercase tracking-widest font-mono">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Email/Password Form */}
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

        {mode === 'signup' && (
          <div className="mt-4 text-center">
            <button
              onClick={handleBootstrap}
              disabled={isLoading || !email || !password}
              className="text-white/20 hover:text-white/60 text-[10px] uppercase tracking-widest transition-colors font-mono disabled:opacity-30"
            >
              First user? Create admin account without invite
            </button>
          </div>
        )}

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
