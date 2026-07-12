'use client';

import React from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { Lock, User } from 'lucide-react';
import { format } from 'date-fns';

interface LockScreenProps {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const { currentUser } = useAuthStore();
  const { wallpaper } = useThemeStore();

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center z-[9999] font-sans overflow-hidden" style={{ background: 'var(--os-bg)', color: 'var(--os-text)' }}>
      <div className="absolute inset-0 bg-cover bg-center opacity-30 blur-xl scale-110" style={{ backgroundImage: `url("${wallpaper}")` }} />
      <div className="relative z-10 flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-500">
        <div className="text-8xl font-light tracking-tighter">{format(new Date(), 'HH:mm')}</div>
        <div className="text-xl font-medium" style={{ color: 'var(--os-text-muted)' }}>{format(new Date(), 'EEEE, MMMM do')}</div>
        <div className="mt-12 flex flex-col items-center gap-4">
          {currentUser?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentUser.avatarUrl} alt="avatar" className="w-20 h-20 rounded-full shadow-2xl" style={{ border: '2px solid var(--os-glass-border)' }} />
          ) : (
            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl" style={{ background: 'var(--os-glass-bg)', border: '2px solid var(--os-glass-border)' }}>
              <User className="w-10 h-10" style={{ color: 'var(--os-text-muted)' }} />
            </div>
          )}
          <div className="font-medium text-lg">{currentUser?.name}</div>
          <button onClick={onUnlock} className="mt-4 px-8 py-2.5 rounded-full font-medium transition-colors backdrop-blur-md flex items-center gap-2" style={{ background: 'var(--os-glass-bg)', border: '1px solid var(--os-glass-border)', color: 'var(--os-text)' }}>
            <Lock className="w-4 h-4" /> Unlock
          </button>
        </div>
      </div>
    </div>
  );
}
