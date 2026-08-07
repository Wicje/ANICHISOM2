'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Lock, Unlock, Eye, EyeOff, FileText, Upload, Download, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { audioSystem } from '@/lib/services/audio-engine';
import { FS } from '@/lib/fs';

interface VaultFile {
  id: string;
  name: string;
  size: number;
  timestamp: string;
}

const VAULT_DIR = 'Vault';
const MANIFEST_PATH = `${VAULT_DIR}/index.json`;
const KEYFILE_PATH = `${VAULT_DIR}/.vault`;

const enc = new TextEncoder();
const dec = new TextDecoder();

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, usage: KeyUsage[] = ['encrypt', 'decrypt']): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    usage,
  );
}

async function aesEncrypt(key: CryptoKey, data: Uint8Array<ArrayBuffer>): Promise<{ iv: Uint8Array<ArrayBuffer>; data: Uint8Array<ArrayBuffer> }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return { iv, data: new Uint8Array(cipher) };
}

async function aesDecrypt(key: CryptoKey, iv: Uint8Array<ArrayBuffer>, data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new Uint8Array(plain);
}

async function createVaultKey(passphrase: string): Promise<CryptoKey> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passphrase, salt);
  const verifier = await aesEncrypt(key, enc.encode('VAULT-OPEN-OK'));
  await FS.write(KEYFILE_PATH, JSON.stringify({
    salt: Array.from(salt),
    verifierIv: Array.from(verifier.iv),
    verifierData: Array.from(verifier.data),
  }), 'application/json');
  return key;
}

async function loadVaultKey(passphrase: string): Promise<CryptoKey | null> {
  const keyFile = await FS.read(KEYFILE_PATH);
  if (!keyFile || typeof keyFile.content !== 'string') return null;
  try {
    const parsed = JSON.parse(keyFile.content);
    const key = await deriveKey(passphrase, new Uint8Array(parsed.salt));
    const plain = await aesDecrypt(key, new Uint8Array(parsed.verifierIv), new Uint8Array(parsed.verifierData));
    if (dec.decode(plain) !== 'VAULT-OPEN-OK') return null;
    return key;
  } catch {
    return null;
  }
}

async function loadManifest(): Promise<VaultFile[]> {
  const manifest = await FS.read(MANIFEST_PATH);
  if (manifest && typeof manifest.content === 'string') {
    try {
      const parsed = JSON.parse(manifest.content);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* corrupt manifest — start fresh */ }
  }
  return [];
}

export default function EncryptedVaultApp() {
  const [passphrase, setPassphrase] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const keyRef = useRef<CryptoKey | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!unlocked) return;
    let cancelled = false;
    loadManifest().then((next) => { if (!cancelled) setFiles(next); });
    return () => { cancelled = true; };
  }, [unlocked]);

  const persistManifest = async (next: VaultFile[]) => {
    await FS.write(MANIFEST_PATH, JSON.stringify(next), 'application/json');
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase.length < 4) return;
    audioSystem.playClick();
    setError('');
    setBusy(true);
    try {
      let key = await loadVaultKey(passphrase);
      if (!key) {
        key = await createVaultKey(passphrase);
      }
      keyRef.current = key;
      setUnlocked(true);
    } catch (err: any) {
      setError(err?.message || 'Wrong master key or vault unavailable.');
    }
    setBusy(false);
  };

  const handleEncryptFile = async (file: File) => {
    const key = keyRef.current;
    if (!key || !file) return;
    setBusy(true);
    try {
      const plain = new Uint8Array(await file.arrayBuffer());
      const encrypted = await aesEncrypt(key, plain);
      const blob = new Blob([encrypted.data], { type: 'application/octet-stream' });
      const id = crypto.randomUUID();
      await FS.write(`${VAULT_DIR}/${id}.enc`, blob, 'application/octet-stream');
      const next = [{ id, name: file.name, size: file.size, timestamp: new Date().toISOString().split('T')[0] || '2026-08-01' }, ...files];
      setFiles(next);
      await persistManifest(next);
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'File Encrypted', description: `${file.name} encrypted with WebCrypto AES-GCM-256.`, type: 'success' }
      }));
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'Encryption Failed', description: err?.message || 'Could not encrypt file.', type: 'error' }
      }));
    }
    setBusy(false);
  };

  const handleDownload = async (f: VaultFile) => {
    audioSystem.playClick();
    try {
      const file = await FS.read(`${VAULT_DIR}/${f.id}.enc`);
      if (!file) return;
      let blob: Blob | null = null;
      if (typeof file.content === 'string' && file.content.startsWith('blob:')) {
        const res = await fetch(file.content);
        blob = await res.blob();
      } else if ((file.content as unknown) instanceof Blob) {
        blob = file.content as unknown as Blob;
      }
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${f.name}.enc`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Vault download failed:', err);
    }
  };

  const handleDelete = async (f: VaultFile) => {
    try { await FS.delete(`${VAULT_DIR}/${f.id}.enc`); } catch { /* ignore */ }
    const next = files.filter((x) => x.id !== f.id);
    setFiles(next);
    await persistManifest(next);
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
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

            {error && <p className="text-[11px] text-rose-400">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <><Unlock className="w-3.5 h-3.5" /> Unlock Encrypted Vault</>}
            </button>
            <p className="text-[10px] text-white/30">First time? Any key of 4+ characters creates a new vault.</p>
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
          onClick={() => { setUnlocked(false); setPassphrase(''); keyRef.current = null; }}
          className="px-3 py-1 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/30"
        >
          Lock Vault
        </button>
      </div>

      {/* Add Encrypted File */}
      <div className="my-4 z-10 space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const selected = Array.from(e.target.files || []);
            e.target.value = '';
            selected.forEach((file) => handleEncryptFile(file));
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="w-full px-4 py-2.5 bg-cyan-500 text-black font-bold text-xs rounded-xl hover:bg-cyan-400 transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" /> {busy ? 'Encrypting...' : 'Encrypt File…'}
        </button>

        {/* Encrypted Files List */}
        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
          {files.length === 0 && (
            <p className="text-xs text-white/40 text-center py-8 italic">Vault is empty. Encrypt a file to get started.</p>
          )}
          {files.map(f => (
            <div key={f.id} className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-cyan-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{f.name}</div>
                  <div className="text-[10px] text-white/40 font-mono">{formatSize(f.size)} • {f.timestamp} • AES-GCM-256</div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleDownload(f)} title="Download encrypted copy" className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(f)} title="Delete from vault" className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/50 hover:text-rose-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
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
