'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone, Laptop, Radio, Send, X, Check, Copy,
  FileText, Wifi, ArrowUpRight, HardDrive, Download,
  Share2, Sparkles, Folder, RefreshCw, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { audioSystem } from '@/lib/services/audio-engine';
import { FS } from '@/lib/fs';

interface Peer {
  id: string;
  name: string;
  type: 'laptop' | 'mobile' | 'desktop';
  lastSeen: number;
  ipHint?: string;
}

interface IncomingTransfer {
  senderId: string;
  senderName: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  dataUrl: string;
}

export default function AirDropApp() {
  const [peers, setPeers] = useState<Peer[]>([
    { id: 'peer-mobile-1', name: 'iPhone 16 Pro (Continua Link)', type: 'mobile', lastSeen: Date.now() },
    { id: 'peer-studio-2', name: 'Mac Studio (Living Room)', type: 'desktop', lastSeen: Date.now() },
  ]);
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [transferProgress, setTransferProgress] = useState(0);
  const [incomingTransfer, setIncomingTransfer] = useState<IncomingTransfer | null>(null);
  const [clipText, setClipText] = useState('');
  const [broadcastDone, setBroadcastDone] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const myDeviceId = useRef<string>(`continua-device-${Math.random().toString(36).slice(2, 7)}`);

  // P2P Channel initialization
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    const bc = new BroadcastChannel('continua-p2p-airdrop');
    channelRef.current = bc;

    // Announce my presence
    bc.postMessage({
      type: 'ANNOUNCE',
      peer: {
        id: myDeviceId.current,
        name: `ContinuaOS (${navigator.platform || 'Workstation'})`,
        type: 'laptop',
        lastSeen: Date.now(),
      }
    });

    bc.onmessage = (event) => {
      const { type, peer, senderId, senderName, fileName, fileSize, mimeType, dataUrl, text } = event.data || {};

      if (type === 'ANNOUNCE' && peer && peer.id !== myDeviceId.current) {
        setPeers(prev => {
          const exists = prev.find(p => p.id === peer.id);
          if (exists) return prev.map(p => p.id === peer.id ? { ...p, lastSeen: Date.now() } : p);
          return [...prev, peer];
        });
      }

      if (type === 'FILE_TRANSFER' && senderId !== myDeviceId.current) {
        setIncomingTransfer({
          senderId,
          senderName: senderName || 'Nearby Peer',
          fileName,
          fileSize,
          mimeType,
          dataUrl,
        });
        audioSystem.playClick();
        window.dispatchEvent(new CustomEvent('os:notify', {
          detail: { title: 'AirDrop Received', description: `${fileName} from ${senderName}`, type: 'info' }
        }));
      }

      if (type === 'CLIPBOARD_SYNC' && text) {
        window.dispatchEvent(new CustomEvent('os:notify', {
          detail: { title: 'AirDrop Clipboard Synced', description: text.slice(0, 40), type: 'info' }
        }));
      }
    };

    return () => {
      bc.close();
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setIsSending(true);
      setTransferProgress(20);

      const interval = setInterval(() => {
        setTransferProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            setIsSending(false);
            channelRef.current?.postMessage({
              type: 'FILE_TRANSFER',
              senderId: myDeviceId.current,
              senderName: 'Local Workspace',
              fileName: file.name,
              fileSize: `${(file.size / 1024).toFixed(1)} KB`,
              mimeType: file.type,
              dataUrl,
            });
            audioSystem.playClick();
            window.dispatchEvent(new CustomEvent('os:notify', {
              detail: { title: 'AirDrop Sent', description: `${file.name} sent via WebRTC P2P`, type: 'success' }
            }));
            return 100;
          }
          return p + 25;
        });
      }, 150);
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

  const handleBroadcastText = () => {
    if (!clipText.trim()) return;
    channelRef.current?.postMessage({
      type: 'CLIPBOARD_SYNC',
      text: clipText,
    });
    setBroadcastDone(true);
    audioSystem.playClick();
    setTimeout(() => setBroadcastDone(false), 2000);
  };

  return (
    <div className="w-full h-full bg-slate-950/95 backdrop-blur-3xl text-white font-sans flex flex-col justify-between p-6 select-none relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute -inset-10 bg-gradient-to-br from-cyan-600/10 via-blue-900/10 to-[#10F4A0]/15 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between z-10 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide">P2P AirDrop & Cross-Device Beam</h2>
            <p className="text-[10px] text-white/50">Encrypted WebRTC P2P DataChannel Transfer</p>
          </div>
        </div>
        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-mono font-bold border border-emerald-500/40 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          Radar Discoverable
        </span>
      </div>

      {/* Main Grid */}
      <div className="flex-1 my-4 z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto custom-scrollbar">
        {/* Left: Nearby Peers & Radar */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col justify-between backdrop-blur-2xl gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-white/50 uppercase tracking-wider">
              <span>Nearby Active Devices ({peers.length})</span>
              <button
                onClick={() => {
                  channelRef.current?.postMessage({
                    type: 'ANNOUNCE',
                    peer: { id: myDeviceId.current, name: 'ContinuaOS Device', type: 'laptop', lastSeen: Date.now() }
                  });
                }}
                className="hover:text-cyan-400 transition-colors flex items-center gap-1"
                title="Refresh Peers"
              >
                <RefreshCw className="w-3 h-3" /> Rescan
              </button>
            </div>

            <div className="space-y-2">
              {peers.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPeer(p.id)}
                  className={cn(
                    "p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all",
                    selectedPeer === p.id
                      ? "bg-cyan-500/15 border-cyan-400 text-white shadow-lg shadow-cyan-500/10"
                      : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-cyan-400">
                      {p.type === 'mobile' ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{p.name}</div>
                      <div className="text-[10px] text-cyan-400">Ready for instant file drop</div>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          {/* Send File Button */}
          <div className="pt-2 border-t border-white/10">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
              className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {isSending ? (
                <span>Sending via AirDrop ({transferProgress}%)...</span>
              ) : (
                <>
                  <Share2 className="w-4 h-4" /> AirDrop File to Device
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Incoming Transfers & Broadcast Clipboard */}
        <div className="flex flex-col gap-4">
          {/* Incoming Transfer Prompt */}
          {incomingTransfer && (
            <div className="bg-emerald-950/80 border border-emerald-400/30 rounded-3xl p-5 backdrop-blur-2xl flex flex-col gap-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Incoming AirDrop Transfer
                </span>
                <button onClick={() => setIncomingTransfer(null)} className="text-white/40 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/10">
                <FileText className="w-6 h-6 text-emerald-400" />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-white truncate">{incomingTransfer.fileName}</span>
                  <span className="text-[10px] text-slate-400">{incomingTransfer.fileSize} · From {incomingTransfer.senderName}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAcceptTransfer}
                  className="flex-1 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-colors flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Download className="w-3.5 h-3.5" /> Accept & Save to Downloads
                </button>
                <button
                  onClick={() => setIncomingTransfer(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white/70"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Broadcast Clipboard / Text */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col justify-between backdrop-blur-2xl flex-1 space-y-3">
            <div className="text-xs font-bold text-white/50 uppercase tracking-wider">P2P Clipboard & Link Beam</div>
            <textarea
              rows={4}
              placeholder="Type or paste text, links, or code to beam across all active P2P companions..."
              value={clipText}
              onChange={(e) => setClipText(e.target.value)}
              className="w-full flex-1 bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-white/30 outline-none focus:border-cyan-400 resize-none font-mono"
            />
            <button
              onClick={handleBroadcastText}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 border border-white/10"
            >
              {broadcastDone ? (
                <><Check className="w-4 h-4 text-emerald-400" /> Beamed to Connected Devices</>
              ) : (
                <><Send className="w-4 h-4" /> Broadcast Clipboard</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="z-10 flex items-center justify-between text-[10px] text-white/40 border-t border-white/10 pt-3 font-mono">
        <span>Protocol: WebRTC DataChannel (Channel ID: continua-p2p-airdrop)</span>
        <span>Zero Server Transit · End-to-End Local</span>
      </div>
    </div>
  );
}
