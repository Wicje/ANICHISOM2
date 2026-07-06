'use client';

import React, { useState } from 'react';
import { useOS, OSRole } from '@/lib/os-context';
import { Power, Key, Loader2, AlertCircle, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const AVATARS = [
  { id: 'founder', name: 'Founder', role: 'admin', color: 'bg-blue-500', initials: 'FD' },
  { id: 'creative-dir', name: 'Creative Director', role: 'admin', color: 'bg-purple-500', initials: 'CD' },
  { id: 'designer', name: 'UI/UX Designer', role: 'admin', color: 'bg-pink-500', initials: 'UX' },
  { id: 'frontend-dev', name: 'Frontend Developer', role: 'technician', color: 'bg-emerald-500', initials: 'FE' },
  { id: 'filmmaker', name: 'Filmmaker', role: 'filmmaker', color: 'bg-amber-500', initials: 'FM' },
  { id: 'copywriter', name: 'Copywriter', role: 'user', color: 'bg-indigo-500', initials: 'CW' },
  { id: 'forensics', name: 'Data Recovery', role: 'technician', color: 'bg-red-500', initials: 'DR' },
];

export function LoginScreen() {
  const router = useRouter();
  const { setCurrentUser } = useOS();
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [passkey, setPasskey] = useState('');

  /**
   * Login with selected avatar and passkey
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) {
      setError('Please select a user');
      return;
    }

    // Passkey verification would happen here in a real implementation
    // For MVP, any passkey works for the selected uniqueId
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

      // Update OS context with user info
      setCurrentUser({
        id: data.user.id,
        name: selectedUser.name,
        role: data.user.role as OSRole,
        // Optional: add a real avatar URL later
      } as any);

      // Redirect to main app
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-900 flex items-center justify-center p-4">
      {/* Subtle background animation */}
      <div className="absolute inset-0 z-0 opacity-30">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
        <div className="absolute -bottom-8 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
      </div>

      <div className="absolute inset-0 z-0 bg-gradient-to-t from-black via-transparent to-transparent" />

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">
        {/* Logo & Title */}
        <div className="flex flex-col items-center gap-4 mb-10 text-center">
          <div className="flex items-center gap-2 justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-600 rounded-xl flex items-center justify-center shadow-xl shadow-blue-500/20">
              <Key className="w-6 h-6 text-white" />
            </div>
            <div className="font-mono text-xl font-bold text-white tracking-widest ml-2">
              ANICHISOM OS
            </div>
          </div>
          <p className="text-white/50 text-sm max-w-xs font-medium">
            Select your workspace profile to continue
          </p>
        </div>

        {error && (
          <div className="w-full max-w-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-4 rounded-xl flex items-start gap-3 mb-6 backdrop-blur-md">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
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
                className="flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-white/5 transition-colors group focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <div className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 border-2 border-white/10 group-hover:border-white/30",
                  user.color
                )}>
                  <span className="text-2xl font-bold text-white shadow-sm">{user.initials}</span>
                </div>
                <div className="text-center">
                  <div className="text-white font-medium text-sm drop-shadow-sm">{user.name}</div>
                  <div className="text-white/40 text-[10px] uppercase tracking-wider mt-1">{user.role}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* Passkey Login Card */
          <div className="w-full max-w-sm flex flex-col gap-6 p-8 rounded-3xl bg-black/40 border border-white/10 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center gap-4 mb-4">
              <div className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center shadow-2xl border-4 border-black",
                selectedUser.color
              )}>
                <span className="text-3xl font-bold text-white">{selectedUser.initials}</span>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-white">{selectedUser.name}</h2>
                <p className="text-white/50 text-xs uppercase tracking-wider mt-1">{selectedUser.role}</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <input
                  type="password"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="Enter Passkey"
                  className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-blue-400/50 rounded-xl px-4 py-3.5 text-center text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/20 transition-colors text-lg tracking-widest font-mono"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3.5 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <Key className="w-5 h-5" />
                    Unlock Workspace
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
                className="text-white/40 hover:text-white/80 text-sm font-medium transition-colors mt-2"
              >
                Not {selectedUser.name}? Back to profiles
              </button>
            </form>
          </div>
        )}

        {/* Footer with Master Key Access */}
        <div className="mt-12 text-center text-white/20 text-xs flex flex-col items-center gap-6 justify-center">
          <input 
            type="password"
            placeholder="System override..."
            className="bg-transparent border-b border-transparent hover:border-white/10 text-center text-transparent hover:text-white/30 focus:text-white focus:outline-none focus:border-white/30 text-xs w-32 pb-1 transition-all placeholder:text-transparent hover:placeholder:text-white/20 focus:placeholder:text-white/20"
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
                      body: JSON.stringify({ uniqueId: 'anichisom_master' }),
                    });
                    const data = await response.json();
                    if (response.ok) {
                      setCurrentUser({
                        id: data.user?.id || 'master',
                        name: 'ANICHISOM',
                        role: 'admin',
                      } as any);
                      router.push('/');
                    } else {
                      setError(data.error || 'Override failed');
                      setIsLoading(false);
                    }
                  } catch (err: any) {
                    setError('Override failed');
                    setIsLoading(false);
                  }
                } else {
                  setError('Invalid system override code');
                  e.currentTarget.value = '';
                }
              }
            }}
          />
          <div className="flex items-center gap-2">
            <Power className="w-3 h-3" />
            <span>ANICHISOM OS • v2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
