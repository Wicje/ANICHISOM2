'use client';

import { useState } from 'react';

import Link from 'next/link';

export default function WaitlistPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || status === 'submitting') return;

    setStatus('submitting');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      });
      const data = await res.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.data?.message || 'Subscribed for updates');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#060608' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10F4A0, #00D4AA)' }}>
              <span className="text-black text-sm font-bold">C</span>
            </div>
            <span className="text-white font-display text-lg font-semibold tracking-tight">Continua</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-3 leading-tight">
            ContinuaOS is Now Open
          </h1>
          <p className="text-sm leading-relaxed max-w-sm mx-auto mb-6" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Beta restrictions have been lifted. Anyone can sign in and launch their persistent context layer immediately.
          </p>

          <Link
            href="/os"
            className="inline-flex items-center justify-center w-full py-3.5 px-6 rounded-xl text-sm font-bold transition-all shadow-lg shadow-[#10F4A0]/20 hover:brightness-110 active:scale-95"
            style={{
              background: '#10F4A0',
              color: '#060608',
            }}
          >
            Launch Web OS Now →
          </Link>
        </div>

        {/* Optional Newsletter / Updates Form */}
        <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02]">
          <h2 className="text-xs uppercase tracking-wider font-mono font-semibold text-white/50 mb-3 text-center">
            Or subscribe for product releases & updates
          </h2>

          {status === 'success' ? (
            <div className="text-center py-6">
              <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(16,244,160,0.1)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10F4A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-sm text-white font-medium mb-1">You are subscribed</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{message}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name (optional)"
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(16,244,160,0.3)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>
              <div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(16,244,160,0.3)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all disabled:opacity-50 bg-white/10 hover:bg-white/15 text-white border border-white/10"
              >
                {status === 'submitting' ? 'Subscribing...' : 'Get Product Updates'}
              </button>
              {status === 'error' && (
                <p className="text-xs text-center mt-2" style={{ color: '#F87171' }}>{message}</p>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Public Access &middot; Open to Everyone &middot; Free Tier Available
          </p>
        </div>
      </div>
    </div>
  );
}
