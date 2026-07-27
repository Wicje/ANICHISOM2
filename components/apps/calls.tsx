'use client';

import React, { useState, useRef } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { Video, Copy, CheckCircle2, ExternalLink, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isTauri } from '@/lib/platform';

export function CallsApp({ window: osWindow }: { window: OSWindow }) {
  const { currentUser, openWindow } = useOS();
  const [roomCode, setRoomCode] = useState('');
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const projectId = osWindow.data?.projectId || 'global';

  const createRoom = () => {
    const code = `continuaos-${projectId}-${Date.now().toString(36)}`;
    setRoomCode(code);
    setActiveRoom(code);
  };

  const joinRoom = () => {
    if (roomCode.trim()) {
      setActiveRoom(roomCode.trim());
    }
  };

  const copyInviteLink = () => {
    const link = roomCode.trim() ? `https://meet.google.com/${roomCode.trim()}` : `https://meet.google.com/new`;
    navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openInNewTab = () => {
    window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer');
  };

  if (activeRoom) {
    return (
      <div className="w-full h-full flex flex-col bg-[#111] text-white font-sans overflow-hidden">
        {/* Header */}
        <div className="h-12 bg-[#1c1c1e] border-b border-white/5 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <Video className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium">Google Meet</span>
            <span className="text-xs text-white/40">Campaign Sync</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (iframeRef.current) iframeRef.current.src = iframeRef.current.src; }}
              className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={openInNewTab}
              className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveRoom(null)}
              className="px-3 py-1 text-xs bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded-lg transition-colors font-medium"
            >
              Leave
            </button>
          </div>
        </div>

        {/* Meet iframe */}
        <div className="flex-1 relative">
          {isTauri() ? (
            React.createElement('webview', {
              src: activeRoom.startsWith('continuaos-') ? 'https://meet.google.com/new' : `https://meet.google.com/${activeRoom}`,
              className: 'w-full h-full border-none bg-black',
              allow: 'camera; microphone; fullscreen; display-capture'
            })
          ) : (
            <iframe
              ref={iframeRef}
              src={activeRoom.startsWith('continuaos-') ? 'https://meet.google.com/new' : `https://meet.google.com/${activeRoom}`}
              className="w-full h-full border-none bg-black"
              allow="camera; microphone; fullscreen; display-capture"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
              title="Google Meet"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#111] text-white font-sans overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
          <Video className="w-10 h-10 text-blue-400" />
        </div>
        <h2 className="text-2xl font-medium mb-2 tracking-tight">Campaign Sync</h2>
        <p className="text-white/50 text-sm mb-8">
          Start or join a video call for <strong className="text-white/80">{projectId}</strong> using Google Meet.
        </p>

        <div className="flex flex-col gap-3 w-full mb-6">
          <button
            onClick={createRoom}
            className="w-full bg-blue-500 hover:bg-blue-400 text-white font-medium py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
          >
            Start New Meeting
          </button>

          <div className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="Or enter meeting code..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors"
              onKeyDown={(e) => { if (e.key === 'Enter') joinRoom(); }}
            />
            <button
              onClick={joinRoom}
              disabled={!roomCode.trim()}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-colors disabled:opacity-30"
            >
              Join
            </button>
          </div>
        </div>

        <div className="flex gap-2 w-full mb-6">
          <button
            onClick={copyInviteLink}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/70 hover:text-white transition-colors"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Invite Link'}
          </button>
          <button
            onClick={openInNewTab}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/70 hover:text-white transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open Meet
          </button>
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs text-white/40 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Powered by Google Meet
        </div>
      </div>
    </div>
  );
}
