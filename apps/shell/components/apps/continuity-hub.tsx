'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone, Camera, QrCode, Wifi, Copy, Check, Radio,
  Video, Laptop, ShieldCheck, RefreshCw, Cast, Share2, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function ContinuityHubApp() {
  const [paired, setPaired] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [deskView, setDeskView] = useState(false);
  const [copiedClipboard, setCopiedClipboard] = useState(false);
  const [clipboardText, setClipboardText] = useState('ContinuaOS v2.0 Shared Clipboard');
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
        setPaired(true);
      }
    } catch {
      // Fallback simulation
      setCameraActive(true);
      setPaired(true);
    }
  };

  const handleStopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleSyncClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setClipboardText(text);
      setCopiedClipboard(true);
      setTimeout(() => setCopiedClipboard(false), 2000);
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'Continuity Clipboard Synced', description: 'Universal clipboard updated across devices', type: 'success' }
      }));
    } catch {
      setCopiedClipboard(true);
      setTimeout(() => setCopiedClipboard(false), 2000);
    }
  };

  return (
    <div className="w-full h-full bg-slate-950 text-slate-100 font-sans flex flex-col overflow-hidden">
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-base text-white">iPhone Mirroring & Continuity Hub</h2>
            <p className="text-xs text-slate-400">Continuity Camera, Desk View, and Universal Clipboard</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5",
            paired ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-300"
          )}>
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            {paired ? 'iPhone 16 Pro Linked' : 'Awaiting Pair'}
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 custom-scrollbar">
        {/* Left: Continuity Camera & Mirroring Stream */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-400" /> Continuity Camera (4K Ultra-Wide)
            </h3>
            {cameraActive && (
              <button
                onClick={() => setDeskView(!deskView)}
                className={cn(
                  "text-xs px-3 py-1 rounded-lg font-semibold transition-all border",
                  deskView ? "bg-indigo-600 border-indigo-400 text-white" : "bg-white/10 border-white/10 text-slate-300 hover:text-white"
                )}
              >
                {deskView ? 'Desk View: ON' : 'Enable Desk View'}
              </button>
            )}
          </div>

          {/* Video Viewport */}
          <div className="w-full h-64 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center relative overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "w-full h-full object-cover transition-transform duration-500",
                deskView && "scale-110 rotate-180 brightness-105 contrast-110"
              )}
            />

            {!cameraActive && (
              <div className="flex flex-col items-center gap-3 text-center p-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Wirelessly Use iPhone as Studio Camera</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Uses Center Stage and Desk View to stream high-resolution webcam video directly to ContinuaOS.
                  </p>
                </div>
                <button
                  onClick={handleStartCamera}
                  className="mt-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
                >
                  <Cast className="w-4 h-4" /> Start Continuity Stream
                </button>
              </div>
            )}
          </div>

          {cameraActive && (
            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
              <span className="text-slate-400 font-mono">1080p @ 60 FPS · Low Latency WebRTC</span>
              <button
                onClick={handleStopCamera}
                className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-semibold transition-all"
              >
                Disconnect Stream
              </button>
            </div>
          )}
        </div>

        {/* Right: Universal Clipboard & QR Pairing */}
        <div className="flex flex-col gap-6">
          {/* Universal Clipboard */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Copy className="w-4 h-4 text-emerald-400" /> Universal Clipboard Sync
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold uppercase">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Copy on your phone, paste seamlessly on ContinuaOS, and vice versa.
            </p>
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-slate-300 break-all">
              {clipboardText}
            </div>
            <button
              onClick={handleSyncClipboard}
              className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 border border-white/10"
            >
              {copiedClipboard ? <Check className="w-4 h-4 text-emerald-400" /> : <RefreshCw className="w-4 h-4" />}
              {copiedClipboard ? 'Synced to System Clipboard' : 'Sync Shared Clipboard'}
            </button>
          </div>

          {/* QR Code Quick Pair */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center justify-between">
            <div className="flex flex-col gap-2 max-w-xs">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-cyan-400" /> Fast QR Pairing
              </h3>
              <p className="text-xs text-slate-400">
                Scan with iPhone Camera to pair Continuity Bridge wirelessly with AES-256 P2P channel.
              </p>
              <span className="text-[10px] text-cyan-400 font-mono">Channel: continua-p2p-7729</span>
            </div>

            {/* QR Pattern Display */}
            <div className="w-24 h-24 bg-white p-2 rounded-2xl flex items-center justify-center shadow-lg">
              <div className="w-full h-full border-4 border-black border-dashed flex items-center justify-center">
                <QrCode className="w-14 h-14 text-black" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContinuityHubApp;
