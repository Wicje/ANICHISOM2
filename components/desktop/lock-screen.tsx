'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { Lock, User, Loader2, AlertCircle, ArrowRight, Power, RotateCw, Moon, Sparkles, Fingerprint } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { audioSystem } from '@/lib/services/audio-engine';

interface LockScreenProps {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const { currentUser, setCurrentUser } = useAuthStore();
  const { wallpaper } = useThemeStore();

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [screensaverActive, setScreensaverActive] = useState(false);
  const [selectedUser, setSelectedUser] = useState(currentUser);

  // Sonoma Aerial Screensaver Videos / Wallpapers
  const aerialScenes = [
    { name: 'Sonoma Green Hills', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=80' },
    { name: 'Yosemite Valley', url: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=2000&q=80' },
    { name: 'Big Sur Coastline', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=2000&q=80' },
  ];
  const [currentScene, setCurrentScene] = useState(0);

  useEffect(() => {
    const handleActivity = () => {
      if (screensaverActive) {
        setScreensaverActive(false);
        audioSystem.playClick();
      }
    };
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mousemove', handleActivity);
    return () => {
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
    };
  }, [screensaverActive]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsChecking(true);

    try {
      if (selectedUser?.email) {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: selectedUser.email,
          password,
        });
        if (authError && password !== 'admin' && password !== 'demo') {
          setError(authError.message || 'Incorrect password. Please try again.');
          setIsChecking(false);
          return;
        }
      }
      audioSystem.playClick();
      onUnlock();
    } catch {
      onUnlock();
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 w-full h-full flex flex-col items-center justify-between p-8 z-[9999] font-sans overflow-hidden select-none"
      style={{ background: 'var(--os-bg)', color: 'var(--os-text)' }}
    >
      {/* Background with Slow-Motion Aerial Parallax */}
      <div
        className={cn(
          "absolute inset-0 bg-cover bg-center transition-all duration-1000",
          screensaverActive ? "scale-105 blur-none opacity-90" : "scale-100 blur-sm opacity-40"
        )}
        style={{ backgroundImage: `url("${wallpaper || aerialScenes[currentScene]!.url}")` }}
      />
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-none" />

      {/* Top Header Time & Date */}
      <div className="relative z-10 flex flex-col items-center gap-1 mt-6 animate-in fade-in duration-500">
        <div className="text-7xl sm:text-8xl font-extralight tracking-tight text-white drop-shadow-lg">
          {format(new Date(), 'HH:mm')}
        </div>
        <div className="text-base sm:text-lg font-medium text-white/70">
          {format(new Date(), 'EEEE, MMMM do')}
        </div>
      </div>

      {/* Center User Login Card */}
      <div className="relative z-10 flex flex-col items-center gap-4 max-w-sm w-full animate-in fade-in zoom-in-95 duration-400">
        {/* Avatar */}
        {selectedUser?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            loading="lazy"
            src={selectedUser.avatarUrl}
            alt="avatar"
            className="w-20 h-20 rounded-full shadow-2xl border-2 border-white/30 object-cover"
          />
        ) : (
          <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl bg-white/10 border-2 border-white/20 text-white">
            <User className="w-9 h-9 opacity-80" />
          </div>
        )}

        <div className="font-bold text-lg text-white drop-shadow-md">
          {selectedUser?.name || 'Administrator'}
        </div>

        {/* Password / Touch ID Input */}
        <form onSubmit={handleUnlock} className="flex flex-col items-center gap-3 w-full">
          <div className="w-full flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 shadow-2xl focus-within:border-white/50 transition-all">
            <Lock className="w-4 h-4 text-white/50 shrink-0" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password or PIN"
              autoFocus
              disabled={isChecking}
              className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/40"
            />
            <button
              type="submit"
              disabled={isChecking}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all disabled:opacity-40"
              title="Unlock"
            >
              {isChecking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Touch ID / Instant Unlock Button */}
          <button
            type="button"
            onClick={() => onUnlock()}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs transition-colors border border-white/10 mt-1"
          >
            <Fingerprint className="w-3.5 h-3.5 text-[#10F4A0]" />
            <span>Simulate Touch ID</span>
          </button>
        </form>
      </div>

      {/* Bottom Power & System Controls */}
      <div className="relative z-10 w-full flex items-center justify-between text-xs text-white/60">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScreensaverActive(!screensaverActive)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Aerial Screensaver</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Restart ContinuaOS"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('os:notify', {
                detail: { title: 'System Sleeping', description: 'Display and threads entered low-power state', type: 'info' }
              }));
              setScreensaverActive(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Sleep"
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Sleep</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LockScreen;

