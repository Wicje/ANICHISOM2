'use client';

import { useState } from 'react';

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
        setMessage(data.data?.message || 'Added to waitlist');
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
            The persistent context layer
          </h1>
          <p className="text-sm leading-relaxed max-w-sm mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Pick up exactly where you stopped. Your workspace remembers everything — browser tabs, projects, brand settings, research — across sessions and devices.
          </p>
        </div>

        {/* Form */}
        {status === 'success' ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(16,244,160,0.1)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10F4A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-lg font-display font-semibold text-white mb-2">You are on the list</h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name (optional)"
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-colors"
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
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-colors"
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
              className="w-full py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              style={{
                background: '#10F4A0',
                color: '#060608',
              }}
            >
              {status === 'submitting' ? 'Joining...' : 'Request Access'}
            </button>
            {status === 'error' && (
              <p className="text-xs text-center mt-2" style={{ color: '#F87171' }}>{message}</p>
            )}
          </form>
        )}

        {/* Footer */}
        <div className="text-center mt-10">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Private beta &middot; 70 spots &middot; By invite only
          </p>
        </div>
      </div>
    </div>
  );
}
