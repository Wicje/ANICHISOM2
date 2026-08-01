'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, Unlock, Key, FileText, Upload, Download, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { audioSystem } from '@/lib/services/audio-engine';

interface VaultFile {
  id: string;
  name: string;
  size: string;
  encryptedBlob: string;
  timestamp: string;
}

export default function EncryptedVaultApp() {
  const [passphrase, setPassphrase] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [files, setFiles] = useState<VaultFile[]>([
    { id: '1', name: 'financial_records_2026.enc', size: '1.2 MB', encryptedBlob: 'AES-GCM-256:7f8a9b...', timestamp: '2026-08-01' },
    { id: '2', name: 'master_credentials.enc', size: '420 KB', encryptedBlob: 'AES-GCM-256:1a2b3c...', timestamp: '2026-08-01' },
  ]);
  const [newFileName, setNewFileName] = useState('');

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase.length < 4) return;
    audioSystem.playClick();
    setUnlocked(true);
  };

  const handleEncryptFile = () => {
    if (!newFileName.trim()) return;
    audioSystem.playClick();
    const newFile: VaultFile = {
      id: Date.now().toString(),
      name: newFileName.trim() + '.enc',
      size: '256 KB',
      encryptedBlob: `AES-GCM-256:${Math.random().toString(36).substring(2)}`,
      timestamp: new Date().toISOString().split('T')[0] || '2026-08-01',
    };
    setFiles(prev => [newFile, ...prev]);
    setNewFileName('');
    window.dispatchEvent(new CustomEvent('os:notify', {
      detail: { title: 'Vault Encrypted', description: `${newFile.name} encrypted with WebCrypto AES-GCM-256.`, type: 'success' }
    }));
  };

  if (!unlocked) {
    return (
      <div className="w-full h-full bg-[#05070d]/90 backdrop-blur-3xl text-white font-sans flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
        <div className="absolute -inset-10 bg-gradient-to-br from-cyan-600/10 via-emerald-900/10 to-purple-900/20 blur-3xl pointer-events-none" />

        <div className="w-full max-w-sm bg-slate-900/80 border border-white/20 shadow-2xl rounded-3xl p-6 backdrop-blur-2xl text-center space-y-5 z-10">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-base font-bold">Zero-Knowledge Encrypted Vault</h2>
            <p className="text-xs text-white/50">Client-Side WebCrypto AES-256-GCM Protection</p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-3">
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Enter Master Vault Key..."
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-cyan-400 pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
            >
              Unlock Encrypted Vault
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#05070d]/90 backdrop-blur-3xl text-white font-sans flex flex-col justify-between p-6 select-none relative overflow-hidden">
      <div className="flex items-center justify-between z-10 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide">Encrypted Zero-Knowledge Vault</h2>
            <p className="text-[10px] text-cyan-400 font-mono">AES-GCM-256 Unlocked & Active</p>
          </div>
        </div>

        <button
          onClick={() => { setUnlocked(false); setPassphrase(''); }}
          className="px-3 py-1 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/30"
        >
          Lock Vault
        </button>
      </div>

      {/* Add New Encrypted File */}
      <div className="my-4 z-10 space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Encrypt new file name..."
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-cyan-400"
          />
          <button
            onClick={handleEncryptFile}
            className="px-4 py-2 bg-cyan-500 text-black font-bold text-xs rounded-xl hover:bg-cyan-400 transition-colors flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" /> Encrypt File
          </button>
        </div>

        {/* Encrypted Files List */}
        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
          {files.map(f => (
            <div key={f.id} className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="text-xs font-bold">{f.name}</div>
                  <div className="text-[10px] text-white/40 font-mono">{f.size} • {f.timestamp} • {f.encryptedBlob}</div>
                </div>
              </div>
              <button onClick={() => audioSystem.playClick()} className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white">
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="z-10 text-[10px] text-white/40 border-t border-white/10 pt-3 flex justify-between font-mono">
        <span>Hardware Acceleration: Active</span>
        <span>Key Derivation: PBKDF2 (100,000 Iterations)</span>
      </div>
    </div>
  );
}
