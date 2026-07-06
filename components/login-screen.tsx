'use client';

import React, { useState } from 'react';
import { useOS, OSRole } from '@/lib/os-context';
import { Power, Key, Loader2, AlertCircle, Terminal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const AVATARS = [
  { id: 'founder', name: 'Founder', role: 'admin', avatarUrl: 'https://api.dicebear.com/9.x/micah/svg?seed=Founder&backgroundColor=transparent' },
  { id: 'creative-dir', name: 'Creative Director', role: 'admin', avatarUrl: 'https://api.dicebear.com/9.x/micah/svg?seed=Director&backgroundColor=transparent' },
  { id: 'designer', name: 'UI/UX Designer', role: 'admin', avatarUrl: 'https://api.dicebear.com/9.x/micah/svg?seed=Designer&backgroundColor=transparent' },
  { id: 'frontend-dev', name: 'Frontend Developer', role: 'technician', avatarUrl: 'https://api.dicebear.com/9.x/micah/svg?seed=Developer&backgroundColor=transparent' },
  { id: 'filmmaker', name: 'Filmmaker', role: 'filmmaker', avatarUrl: 'https://api.dicebear.com/9.x/micah/svg?seed=Filmmaker&backgroundColor=transparent' },
  { id: 'copywriter', name: 'Copywriter', role: 'user', avatarUrl: 'https://api.dicebear.com/9.x/micah/svg?seed=Copywriter&backgroundColor=transparent' },
  { id: 'forensics', name: 'Data Recovery', role: 'technician', avatarUrl: 'https://api.dicebear.com/9.x/micah/svg?seed=Recovery&backgroundColor=transparent' },
];

export function LoginScreen() {
  const router = useRouter();
  const { setCurrentUser } = useOS();
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [passkey, setPasskey] = useState('');
  const [showOverride, setShowOverride] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) {
      setError('Please select a user');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uniqueId: selectedUser.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setIsLoading(false);
        return;
      }

      setCurrentUser({
        id: data.user.id,
        name: selectedUser.name,
        role: data.user.role as OSRole,
        avatarUrl: selectedUser.avatarUrl,
      } as any);

      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center p-4 selection:bg-white selection:text-black font-sans">
      {/* Black and white noise/texture background */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">
        {/* Logo & Title */}
        <div className="flex flex-col items-center gap-4 mb-12 text-center">
          <div className="flex items-center gap-3 justify-center">
            <div className="w-12 h-12 bg-white rounded-none flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.15)]">
              <Key className="w-6 h-6 text-black" />
            </div>
            <div className="font-mono text-2xl font-bold text-white tracking-[0.2em] ml-2 uppercase">
              Anichisom OS
            </div>
          </div>
          <p className="text-white/40 text-xs max-w-xs font-mono uppercase tracking-widest">
            Select identity to authenticate
          </p>
        </div>

        {error && (
          <div className="w-full max-w-md bg-white/5 border border-white/20 text-white text-xs p-4 flex items-start gap-3 mb-8 backdrop-blur-md font-mono uppercase tracking-wide">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!selectedUser ? (
          /* Avatar Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 w-full max-w-3xl">
            {AVATARS.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className="flex flex-col items-center gap-4 p-4 hover:bg-white/5 transition-all group focus:outline-none"
              >
                <div className="relative w-20 h-20 rounded-full overflow-hidden border border-white/20 group-hover:border-white transition-colors bg-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={user.avatarUrl} 
                    alt={user.name}
                    className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                  />
                </div>
                <div className="text-center">
                  <div className="text-white font-medium text-xs tracking-wider uppercase">{user.name}</div>
                  <div className="text-white/40 text-[9px] uppercase tracking-[0.2em] mt-1">{user.role}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* Passkey Login Card */
          <div className="w-full max-w-sm flex flex-col gap-8 p-10 bg-black border border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.05)] animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center gap-5 mb-2">
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white bg-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={selectedUser.avatarUrl} 
                  alt={selectedUser.name}
                  className="w-full h-full object-cover grayscale"
                />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-bold text-white uppercase tracking-widest">{selectedUser.name}</h2>
                <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] mt-2">{selectedUser.role}</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <input
                  type="password"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="AUTHORIZATION KEY"
                  className="w-full bg-transparent border-b border-white/20 hover:border-white/50 focus:border-white px-2 py-3 text-center text-white placeholder-white/20 focus:outline-none transition-colors text-sm tracking-[0.3em] font-mono"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white hover:bg-neutral-200 text-black disabled:opacity-50 disabled:cursor-not-allowed font-bold py-4 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    Enter System
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedUser(null);
                  setPasskey('');
                  setError('');
                }}
                className="text-white/30 hover:text-white text-[10px] uppercase tracking-widest transition-colors mt-2"
              >
                Switch Identity
              </button>
            </form>
          </div>
        )}

        {/* Footer & Override Menu */}
        <div className="mt-16 text-center text-white/30 text-xs flex flex-col items-center gap-6 justify-center">
          
          {showOverride ? (
            <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <input 
                type="password"
                placeholder="INPUT OVERRIDE KEY"
                className="bg-transparent border-b border-white text-center text-white focus:outline-none text-xs w-48 pb-2 tracking-[0.2em] font-mono uppercase"
                autoFocus
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = e.currentTarget.value;
                    if (val === 'ANICHISOM') {
                      setIsLoading(true);
                      try {
                        const response = await fetch('/api/auth/login', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ uniqueId: 'ANICHISOM' }),
                        });
                        const data = await response.json();
                        if (response.ok) {
                          setCurrentUser({
                            id: data.user?.id || 'master',
                            name: 'ANICHISOM',
                            role: 'admin',
                            avatarUrl: 'https://api.dicebear.com/9.x/micah/svg?seed=Master&backgroundColor=transparent',
                          } as any);
                          router.push('/');
                        } else {
                          setError(data.error || 'Override failed');
                          setIsLoading(false);
                          setShowOverride(false);
                        }
                      } catch (err: any) {
                        setError('Override failed');
                        setIsLoading(false);
                        setShowOverride(false);
                      }
                    } else {
                      setError('Access Denied');
                      setShowOverride(false);
                    }
                  } else if (e.key === 'Escape') {
                    setShowOverride(false);
                  }
                }}
                onBlur={() => setShowOverride(false)}
              />
              <span className="text-[9px] uppercase tracking-widest text-white/40">Press ESC to cancel</span>
            </div>
          ) : (
            <button 
              onClick={() => setShowOverride(true)}
              className="text-white/20 hover:text-white flex items-center gap-2 text-[10px] uppercase tracking-widest transition-colors font-mono"
            >
              <Terminal className="w-3 h-3" />
              <span>System Override</span>
            </button>
          )}

          <div className="flex items-center gap-2 font-mono uppercase tracking-widest text-[9px] text-white/20">
            <Power className="w-3 h-3" />
            <span>OS Kernel v2.0 • Monochrome</span>
          </div>
        </div>
      </div>
    </div>
  );
}
