'use client';

import React, { useState } from 'react';
import { Smartphone, Laptop, Radio, Send, X, Check, Copy, FileText, Wifi, ArrowUpRight, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { audioSystem } from '@/lib/services/audio-engine';

export default function AirDropApp() {
  const [clipText, setClipText] = useState('');
  const [sentStatus, setSentStatus] = useState(false);

  const handleSendClip = () => {
    if (!clipText.trim()) return;
    audioSystem.playClick();
    setSentStatus(true);
    setTimeout(() => setSentStatus(false), 2500);
  };

  return (
    <div className="w-full h-full bg-[#05070d]/90 backdrop-blur-3xl text-white font-sans flex flex-col justify-between p-6 select-none relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute -inset-10 bg-gradient-to-br from-emerald-600/15 via-teal-900/10 to-[#10F4A0]/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between z-10 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#10F4A0]/20 border border-[#10F4A0]/50 flex items-center justify-center text-[#10F4A0]">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide">P2P AirDrop & Cross-Device Sync</h2>
            <p className="text-[10px] text-white/50">Direct Peer-to-Peer DataChannel Transfer</p>
          </div>
        </div>
        <span className="text-[10px] bg-[#10F4A0]/20 text-[#10F4A0] px-3 py-1 rounded-full font-mono font-bold border border-[#10F4A0]/40">
          WebRTC Active
        </span>
      </div>

      {/* Content Body */}
      <div className="flex-1 my-4 z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Connected Devices */}
        <div className="bg-slate-900/80 border border-white/15 rounded-3xl p-5 flex flex-col justify-between backdrop-blur-2xl">
          <div className="space-y-3">
            <div className="text-xs font-bold text-white/50 uppercase tracking-wider">Discovered Devices</div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="w-6 h-6 text-[#10F4A0]" />
                <div>
                  <div className="text-xs font-bold">Mobile Companion</div>
                  <div className="text-[10px] text-[#10F4A0]">Connected via WebRTC P2P DataChannel</div>
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-[#10F4A0] shadow-sm shadow-[#10F4A0]/50 animate-ping" />
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Laptop className="w-6 h-6 text-cyan-400" />
                <div>
                  <div className="text-xs font-bold">Continua Desktop Peer</div>
                  <div className="text-[10px] text-white/50">Ready for instant file drop</div>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
            </div>
          </div>

          <div className="text-[10px] text-white/40 border-t border-white/10 pt-3 flex justify-between">
            <span>Protocol: WebRTC DataChannel</span>
            <span>Encryption: AES-GCM-256</span>
          </div>
        </div>

        {/* P2P Clipboard Broadcast */}
        <div className="bg-slate-900/80 border border-white/15 rounded-3xl p-5 flex flex-col justify-between backdrop-blur-2xl space-y-4">
          <div className="space-y-3 flex-1 flex flex-col">
            <div className="text-xs font-bold text-white/50 uppercase tracking-wider">Broadcast Clipboard / Snippet</div>
            <textarea
              rows={5}
              placeholder="Paste text, code snippets, or links to broadcast to all connected P2P devices..."
              value={clipText}
              onChange={(e) => setClipText(e.target.value)}
              className="w-full flex-1 bg-black/40 border border-white/15 rounded-2xl p-3 text-xs text-white placeholder-white/30 outline-none focus:border-[#10F4A0] resize-none font-mono"
            />
          </div>

          <button
            onClick={handleSendClip}
            className="w-full py-3 rounded-2xl bg-[#10F4A0]/20 hover:bg-[#10F4A0]/30 text-[#10F4A0] font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-[#10F4A0]/40"
          >
            {sentStatus ? (
              <><Check className="w-4 h-4" /> Broadcasted to Connected Peers!</>
            ) : (
              <><Send className="w-4 h-4" /> Broadcast to Devices</>
            )}
          </button>
        </div>
      </div>

      {/* Footer Status */}
      <div className="z-10 text-[10px] text-white/40 flex justify-between border-t border-white/10 pt-3">
        <span>Continua OS P2P AirDrop System</span>
        <span>Local Mesh Node Active</span>
      </div>
    </div>
  );
}
