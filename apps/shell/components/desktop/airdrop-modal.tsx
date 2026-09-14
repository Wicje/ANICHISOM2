'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone, Laptop, Radio, Send, X, Check, Copy,
  FileText, Download, Sparkles, Share2, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { audioSystem } from '@/lib/services/audio-engine';
import { FS } from '@/lib/fs';

interface AirDropModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AirDropModal({ isOpen, onClose }: AirDropModalProps) {
  const [peers, setPeers] = useState([
    { id: 'peer-mobile-1', name: 'iPhone 16 Pro', type: 'mobile' },
    { id: 'peer-desktop-2', name: 'Mac Studio (Workstation)', type: 'laptop' },
  ]);
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [clipText, setClipText] = useState('');
  const [broadcastDone, setBroadcastDone] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [incomingTransfer, setIncomingTransfer] = useState<{ fileName: string; fileSize: string; dataUrl: string; senderName: string; mimeType: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const myDeviceId = useRef<string>(`continua-modal-${Math.random().toString(36).slice(2, 6)}`);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    const bc = new BroadcastChannel('continua-p2p-airdrop');
    channelRef.current = bc;

    bc.postMessage({
      type: 'ANNOUNCE',
      peer: { id: myDeviceId.current, name: 'Continua OS Desktop', type: 'laptop', lastSeen: Date.now() }
    });

    bc.onmessage = (event) => {
      const { type, peer, senderId, senderName, fileName, fileSize, mimeType, dataUrl } = event.data || {};
      if (type === 'ANNOUNCE' && peer && peer.id !== myDeviceId.current) {
        setPeers(prev => {
          if (prev.find(p => p.id === peer.id)) return prev;
          return [...prev, peer];
        });
      }
      if (type === 'FILE_TRANSFER' && senderId !== myDeviceId.current) {
        setIncomingTransfer({ fileName, fileSize, dataUrl, senderName: senderName || 'Peer', mimeType });
        audioSystem.playClick();
      }
    };

    return () => {
      bc.close();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBroadcast = () => {
    if (!clipText.trim()) return;
    channelRef.current?.postMessage({
      type: 'CLIPBOARD_SYNC',
      text: clipText,
    });
    setBroadcastDone(true);
    audioSystem.playClick();
    setTimeout(() => setBroadcastDone(false), 2000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setIsSending(true);
      setTimeout(() => {
        setIsSending(false);
        channelRef.current?.postMessage({
          type: 'FILE_TRANSFER',
          senderId: myDeviceId.current,
          senderName: 'Local Desktop',
          fileName: file.name,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
          mimeType: file.type,
          dataUrl,
        });
        audioSystem.playClick();
        window.dispatchEvent(new CustomEvent('os:notify', {
          detail: { title: 'AirDrop Sent', description: `${file.name} beamed to peers.`, type: 'success' }
        }));
      }, 600);
    };
    reader.readAsDataURL(file);
  };

  const handleAcceptTransfer = async () => {
    if (!incomingTransfer) return;
    try {
      await FS.write(`Downloads/${incomingTransfer.fileName}`, incomingTransfer.dataUrl, incomingTransfer.mimeType);
      audioSystem.playClick();
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'File Saved', description: `Saved to Downloads/${incomingTransfer.fileName}`, type: 'success' }
      }));
    } catch {}
    setIncomingTransfer(null);
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-2xl flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-lg bg-slate-900 border border-white/20 shadow-2xl rounded-3xl p-6 text-white space-y-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-wide">P2P AirDrop & Quick Share</h3>
              <p className="text-xs text-slate-400">Instant Local WebRTC Peer Discovery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Incoming Transfer Banner */}
        {incomingTransfer && (
          <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-400/30 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> Incoming file from {incomingTransfer.senderName}
            </div>
            <div className="text-xs font-mono text-slate-200">{incomingTransfer.fileName} ({incomingTransfer.fileSize})</div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleAcceptTransfer}
                className="flex-1 py-1.5 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-colors"
              >
                Accept & Save
              </button>
              <button
                onClick={() => setIncomingTransfer(null)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-slate-300"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Nearby Active Devices */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nearby Active Devices</div>
          <div className="grid grid-cols-2 gap-2.5">
            {peers.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPeer(p.id)}
                className={cn(
                  "p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all",
                  selectedPeer === p.id
                    ? "bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-500/20"
                    : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                )}
              >
                {p.type === 'mobile' ? <Smartphone className="w-5 h-5 text-cyan-400" /> : <Laptop className="w-5 h-5 text-cyan-400" />}
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold truncate text-white">{p.name}</span>
                  <span className="text-[10px] text-emerald-400">Ready</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions: Send File & Send Clipboard */}
        <div className="space-y-3 pt-2">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" /> {isSending ? 'Beaming File...' : 'Send File to Selected Device'}
          </button>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Beam text or link to device..."
              value={clipText}
              onChange={(e) => setClipText(e.target.value)}
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
            />
            <button
              onClick={handleBroadcast}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors flex items-center gap-1.5 border border-white/10"
            >
              {broadcastDone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Send className="w-3.5 h-3.5" />}
              Beam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AirDropModal;
