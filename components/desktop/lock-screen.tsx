'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { Lock, User, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface LockScreenProps {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const { currentUser } = useAuthStore();
  const { wallpaper } = useThemeStore();

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsChecking(true);

    try {
      if (currentUser?.email) {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: currentUser.email,
          password,
        });
        if (authError) {
          setError(authError.message || 'Incorrect password. Please try again.');
          setIsChecking(false);
          return;
        }
      } else if (password === '') {
        setError('Enter your password to unlock.');
        setIsChecking(false);
        return;
      }
      onUnlock();
    } catch {
      setError('Could not verify password. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center z-[9999] font-sans overflow-hidden" style={{ background: 'var(--os-bg)', color: 'var(--os-text)' }}>
      <div className="absolute inset-0 bg-cover bg-center opacity-30 blur-xl scale-110" style={{ backgroundImage: `url("${wallpaper}")` }} />
      <div className="relative z-10 flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-500">
        <div className="text-8xl font-light tracking-tighter">{format(new Date(), 'HH:mm')}</div>
        <div className="text-xl font-medium" style={{ color: 'var(--os-text-muted)' }}>{format(new Date(), 'EEEE, MMMM do')}</div>
        <div className="mt-12 flex flex-col items-center gap-4">
          {currentUser?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img loading="lazy" src={currentUser.avatarUrl} alt="avatar" className="w-20 h-20 rounded-full shadow-2xl" style={{ border: '2px solid var(--os-glass-border)' }} />
          ) : (
            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl" style={{ background: 'var(--os-glass-bg)', border: '2px solid var(--os-glass-border)' }}>
              <User className="w-10 h-10" style={{ color: 'var(--os-text-muted)' }} />
            </div>
          )}
          <div className="font-medium text-lg">{currentUser?.name}</div>
          <form onSubmit={handleUnlock} className="mt-4 flex flex-col items-center gap-3 w-full max-w-[280px]">
            <div className="w-full flex items-center gap-2 px-4 py-2.5 rounded-full backdrop-blur-md" style={{ background: 'var(--os-glass-bg)', border: '1px solid var(--os-glass-border)' }}>
              <Lock className="w-4 h-4 shrink-0" style={{ color: 'var(--os-text-muted)' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
                disabled={isChecking}
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-current/40"
                style={{ color: 'var(--os-text)' }}
              />
              <button
                type="submit"
                disabled={isChecking}
                className="flex items-center justify-center w-7 h-7 rounded-full transition-colors disabled:opacity-40"
                style={{ background: 'var(--os-primary, #0a8f5c)', color: '#fff' }}
              >
                {isChecking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
