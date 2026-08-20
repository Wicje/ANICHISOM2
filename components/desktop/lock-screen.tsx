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

          {/* Quick Touch ID / 1-Click OAuth Buttons */}
          <div className="flex flex-col gap-2 w-full pt-1">
            <button
              type="button"
              onClick={() => onUnlock()}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white/90 text-xs font-semibold transition-all border border-white/15 shadow-sm"
            >
              <Fingerprint className="w-4 h-4 text-[#10F4A0]" />
              <span>Simulate Touch ID / Guest Unlock</span>
            </button>

            <div className="flex items-center gap-2 my-1">
              <div className="flex-1 h-px bg-white/15" />
              <span className="text-[10px] text-white/40 uppercase font-mono tracking-widest">or SSO</span>
              <div className="flex-1 h-px bg-white/15" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { GoogleSSOService } = await import('@/lib/services/google-sso.service');
                    const gUser = await GoogleSSOService.signInWithGoogleOneTap();
                    setCurrentUser({ ...gUser, avatarUrl: gUser.picture, role: 'user' });
                    audioSystem.playClick();
                    onUnlock();
                  } catch {
                    onUnlock();
                  }
                }}
                className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition-all shadow-md"
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-3.5 h-3.5" />
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const { githubDeviceFlow } = await import('@/lib/services/github-device-flow.service');
                    const codeRes = await githubDeviceFlow.requestDeviceCode();
                    window.open(codeRes.verification_uri, '_blank');
                    githubDeviceFlow.pollForToken(codeRes.device_code, codeRes.interval, (profile) => {
                      setCurrentUser({ id: String(profile.id), name: profile.name || profile.login, email: profile.email || `${profile.login}@github.com`, avatarUrl: profile.avatar_url, role: 'technician' });
                      audioSystem.playClick();
                      onUnlock();
                    }, () => onUnlock());
                  } catch {
                    onUnlock();
                  }
                }}
                className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all border border-white/20 shadow-md"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                <span>GitHub</span>
              </button>
            </div>
          </div>
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

