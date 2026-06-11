'use client';

import React, { useState } from 'react';
import { useOS, OSRole } from '@/lib/os-context';
import { Power, Key, UserCircle, Copy, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function LoginScreen() {
  const router = useRouter();
  const { setCurrentUser } = useOS();
  
  const [uniqueId, setUniqueId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showGenerateHelp, setShowGenerateHelp] = useState(false);
  const [generatedId, setGeneratedId] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  /**
   * Login with unique ID (no password required)
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uniqueId.trim()) {
      setError('Please enter a unique ID');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uniqueId: uniqueId.trim() }),
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
        name: data.user.uniqueId,
        role: data.user.role as OSRole,
      } as any);

      // Redirect to main app
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Generate a random unique ID
   */
  const generateNewId = async () => {
    try {
      const id = 'user_' + Math.random().toString(36).substring(2, 15);
      setGeneratedId(id);
      setShowGenerateHelp(true);
    } catch (err) {
      setError('Failed to generate ID');
    }
  };

  /**
   * Copy generated ID to clipboard
   */
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      setError('Failed to copy ID');
    }
  };

  /**
   * Use generated ID for login
   */
  const useGeneratedId = () => {
    setUniqueId(generatedId);
    setShowGenerateHelp(false);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-900 flex items-center justify-center p-4">
      {/* Subtle background animation */}
      <div className="absolute inset-0 z-0 opacity-30">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
        <div className="absolute -bottom-8 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
      </div>

      <div className="absolute inset-0 z-0 bg-gradient-to-t from-black via-transparent to-transparent" />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Logo & Title */}
        <div className="flex flex-col items-center gap-4 mb-8 text-center">
          <div className="flex items-center gap-2 justify-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center">
              <Key className="w-6 h-6 text-white" />
            </div>
            <div className="font-mono text-sm font-bold text-white tracking-widest">
              ANICHISOM OS
            </div>
          </div>
          <p className="text-white/60 text-sm max-w-xs">
            Self-hosted workspace. No cloud. No tracking. Just you.
          </p>
        </div>

        {/* Main Login Card */}
        <div className="w-full flex flex-col gap-6 p-8 rounded-2xl bg-black/40 border border-white/10 shadow-2xl backdrop-blur-xl">
          {!showGenerateHelp ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-4 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Unique ID Input */}
              <div className="flex flex-col gap-2">
                <label className="text-white/80 text-sm font-medium flex items-center gap-2">
                  <UserCircle className="w-4 h-4" />
                  Your Unique ID
                </label>
                <input
                  type="text"
                  value={uniqueId}
                  onChange={(e) => setUniqueId(e.target.value)}
                  placeholder="enter_your_id"
                  className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-blue-400/50 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/20 transition-colors"
                />
                <p className="text-white/40 text-xs">
                  3-50 characters. Letters, numbers, dash, underscore only.
                </p>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-3 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    Login
                  </>
                )}
              </button>

              {/* Generate ID Link */}
              <button
                type="button"
                onClick={generateNewId}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
              >
                Don&apos;t have an ID? Generate one
              </button>
            </form>
          ) : (
            /* Generated ID Display */
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <p className="text-white/60 text-sm mb-4">
                  Your generated unique ID:
                </p>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 font-mono text-white break-all mb-4">
                  {generatedId}
                </div>
                <button
                  onClick={copyToClipboard}
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg px-4 py-2 transition-colors flex items-center justify-center gap-2 mb-4"
                >
                  <Copy className="w-4 h-4" />
                  {copiedId ? 'Copied!' : 'Copy to clipboard'}
                </button>
              </div>

              <button
                onClick={useGeneratedId}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg px-4 py-3 transition-all"
              >
                Use This ID
              </button>

              <button
                onClick={() => setShowGenerateHelp(false)}
                className="text-white/60 hover:text-white/80 text-sm transition-colors"
              >
                Back
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-white/30 text-xs flex items-center gap-2 justify-center">
          <Power className="w-3 h-3" />
          <span>ANICHISOM OS • Self-Hosted</span>
        </div>
      </div>
    </div>
  );
}
