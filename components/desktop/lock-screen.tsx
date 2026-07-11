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
    <div className="fixed inset-0 w-full h-full bg-black flex flex-col items-center justify-center z-[9999] text-white font-sans overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center opacity-30 blur-xl scale-110" style={{ backgroundImage: `url("${wallpaper}")` }} />
      <div className="relative z-10 flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-500">
        <div className="text-8xl font-light tracking-tighter">{format(new Date(), 'HH:mm')}</div>
        <div className="text-xl font-medium text-white/70">{format(new Date(), 'EEEE, MMMM do')}</div>
        <div className="mt-12 flex flex-col items-center gap-4">
          {currentUser?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentUser.avatarUrl} alt="avatar" className="w-20 h-20 rounded-full border-2 border-white/20 shadow-2xl" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/20 shadow-2xl">
              <User className="w-10 h-10 text-white/50" />
            </div>
          )}
          <div className="font-medium text-lg">{currentUser?.name}</div>
          <button onClick={onUnlock} className="mt-4 px-8 py-2.5 bg-white/10 hover:bg-white/25 border border-white/20 rounded-full font-medium transition-colors backdrop-blur-md flex items-center gap-2">
            <Lock className="w-4 h-4" /> Unlock
          </button>
        </div>
      </div>
    </div>
  );
}
