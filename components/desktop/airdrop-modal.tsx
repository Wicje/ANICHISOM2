'use client';

import React, { useState } from 'react';
import { Smartphone, Laptop, Radio, Send, X, Check, Copy, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { audioSystem } from '@/lib/services/audio-engine';

interface AirDropModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AirDropModal({ isOpen, onClose }: AirDropModalProps) {
  const [deviceConnected, setDeviceConnected] = useState(true);
  const [clipText, setClipText] = useState('');
  const [sentStatus, setSentStatus] = useState(false);

  if (!isOpen) return null;

  const handleSendClip = () => {
    if (!clipText.trim()) return;
    audioSystem.playClick();
    setSentStatus(true);
    setTimeout(() => setSentStatus(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[290] bg-slate-950/85 backdrop-blur-3xl flex flex-col items-center justify-center p-8 select-none animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-slate-900/90 border border-white/20 shadow-2xl rounded-3xl p-6 text-white space-y-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#10F4A0]/20 border border-[#10F4A0]/50 flex items-center justify-center text-[#10F4A0]">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-wide">P2P AirDrop & Cross-Device Clip</h3>
              <p className="text-xs text-white/50">WebRTC Direct Device Sync</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nearby Devices */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-white/50 uppercase tracking-wider">Nearby Active Devices</div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-6 h-6 text-[#10F4A0]" />
              <div>
                <div className="text-xs font-bold">Mobile Companion App</div>
                <div className="text-[10px] text-[#10F4A0]">Connected via WebRTC P2P DataChannel</div>
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-[#10F4A0] shadow-sm shadow-[#10F4A0]/50 animate-ping" />
          </div>
        </div>

        {/* Quick Send Text / Clipboard */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-white/50 uppercase tracking-wider">Instant P2P Clipboard Transfer</div>
          <textarea
            rows={3}
            placeholder="Paste text, links, or code snippet to broadcast to mobile companion..."
            value={clipText}
            onChange={(e) => setClipText(e.target.value)}
            className="w-full bg-black/40 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#10F4A0] resize-none"
          />
          <button
            onClick={handleSendClip}
            className="w-full py-2.5 rounded-xl bg-[#10F4A0]/20 hover:bg-[#10F4A0]/30 text-[#10F4A0] font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-[#10F4A0]/40"
          >
            {sentStatus ? (
              <><Check className="w-4 h-4" /> Broadcasted to Connected Devices!</>
            ) : (
              <><Send className="w-4 h-4" /> Broadcast Clipboard to Devices</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
