'use client';

import React, { useState, useEffect, useRef } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { Video, Mic, MicOff, VideoOff, MonitorUp, PhoneOff, Circle, FileText, CheckCircle2, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useWebRTC } from './calls/hooks/useWebRTC';

export function CallsApp({ window: osWindow }: { window: OSWindow }) {
  const { currentUser, emitEvent, openWindow } = useOS();
  const [inCall, setInCall] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const projectId = osWindow.data?.projectId || 'global';
  const roomId = `anichisom-call-${projectId}`;

  const {
    remoteStream,
    localStream,
    connectionStatus,
    remoteUser,
    error,
    startCall,
    endCall,
  } = useWebRTC(roomId, currentUser, inCall);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (inCall) {
      timer = setInterval(() => setCallDuration(c => c + 1), 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [inCall]);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleJoin = async () => {
    setInCall(true);
    await startCall(videoOff, micMuted);
    emitEvent({
      workspaceId: 'global',
      type: 'project_updated',
      entityId: roomId,
      userId: currentUser?.id || 'anonymous',
      comment: `Joined video call for ${projectId}`
    });
  };

  const handleLeave = async () => {
    await endCall();
    setInCall(false);
    setCallDuration(0);
    if (isRecording) {
      setIsRecording(false);
      const notesTitle = `Meeting Notes - ${format(new Date(), 'MMM dd, yyyy')}`;
      openWindow('notes', notesTitle, {
        projectId,
        content: `# Meeting Notes: ${projectId}\n\n**Date:** ${format(new Date(), 'PPpp')}\n**Attendees:** ${currentUser?.name}${remoteUser ? `, ${remoteUser.name}` : ''}\n**Duration:** ${formatTime(callDuration)}\n**Recording:** Saved to Files (/campaign/${projectId}/recordings)\n\n## Action Items\n- [ ] \n`
      });
    }
    emitEvent({
      workspaceId: 'global',
      type: 'project_updated',
      entityId: roomId,
      userId: currentUser?.id || 'anonymous',
      comment: `Left video call for ${projectId}`
    });
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      emitEvent({
        workspaceId: 'global',
        type: 'project_updated',
        entityId: roomId,
        userId: currentUser?.id || 'anonymous',
        comment: `Started recording call for ${projectId}`
      });
    }
  };

  const toggleMic = async () => {
    const newMuted = !micMuted;
    setMicMuted(newMuted);
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !newMuted);
    }
  };

  const toggleVideo = async () => {
    const newOff = !videoOff;
    setVideoOff(newOff);
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !newOff);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#111] text-white font-sans overflow-hidden">
      {!inCall ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
            <Video className="w-10 h-10 text-blue-400" />
          </div>
          <h2 className="text-2xl font-medium mb-2 tracking-tight">Campaign Sync</h2>
          <p className="text-white/50 text-sm mb-8">
            You are about to join the dedicated room for <strong className="text-white/80">{projectId}</strong>. This call is context-aware and uses peer-to-peer WebRTC.
          </p>

          {error && (
            <div className="w-full mb-4 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-4 w-full mb-8">
            <button
              onClick={toggleMic}
              className={cn("flex-1 py-3 rounded-xl flex justify-center items-center gap-2 border transition-all", micMuted ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-white/5 border-white/10 hover:bg-white/10")}
            >
              {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {micMuted ? 'Muted' : 'Mic On'}
            </button>
            <button
              onClick={toggleVideo}
              className={cn("flex-1 py-3 rounded-xl flex justify-center items-center gap-2 border transition-all", videoOff ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-white/5 border-white/10 hover:bg-white/10")}
            >
              {videoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              {videoOff ? 'Cam Off' : 'Cam On'}
            </button>
          </div>

          <button
            onClick={handleJoin}
            className="w-full bg-blue-500 hover:bg-blue-400 text-white font-medium py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
          >
            Join Call
          </button>

          <div className="mt-6 flex items-center gap-2 text-xs text-white/40 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Auto meeting notes enabled
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col relative">
          {/* Main Video Area */}
          <div className="flex-1 bg-black relative p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Local User */}
              <div className="relative rounded-2xl overflow-hidden bg-[#1a1a1a] border border-white/10 flex items-center justify-center">
                 {videoOff ? (
                    <div className="w-24 h-24 rounded-full bg-blue-500/20 flex items-center justify-center text-3xl font-medium text-blue-400 z-10">
                       {currentUser?.name?.charAt(0) || 'U'}
                    </div>
                 ) : (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
                    />
                 )}
                 <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 z-10">
                   {currentUser?.name || 'You'} {micMuted && <MicOff className="w-3 h-3 text-rose-400" />}
                </div>
             </div>

             {/* Remote User */}
             <div className="relative rounded-2xl overflow-hidden bg-[#1a1a1a] border border-white/10 flex items-center justify-center">
                {connectionStatus === 'connected' && remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : connectionStatus === 'waiting' || connectionStatus === 'ringing' ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                    <span className="text-white/60 text-sm">
                      {connectionStatus === 'waiting' ? 'Waiting for peer...' : 'Connecting...'}
                    </span>
                  </div>
                ) : connectionStatus === 'failed' ? (
                  <div className="flex flex-col items-center gap-3">
                    <WifiOff className="w-8 h-8 text-rose-400" />
                    <span className="text-rose-400 text-sm">Connection failed</span>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center text-3xl font-medium text-emerald-400">
                    {remoteUser?.name?.charAt(0) || 'C'}
                  </div>
                )}
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 z-10">
                  {remoteUser?.name || 'Client'}
                  {connectionStatus === 'connected' && <Wifi className="w-3 h-3 text-emerald-400" />}
                  {connectionStatus === 'waiting' && '(Waiting...)'}
                  {connectionStatus === 'ringing' && '(Connecting...)'}
                  {connectionStatus === 'failed' && '(Failed)'}
                </div>
             </div>

             {/* Top overlay */}
             <div className="absolute top-6 right-6 flex items-center gap-3 z-10">
                {isRecording && (
                   <div className="bg-black/60 backdrop-blur border border-rose-500/30 px-3 py-1.5 rounded-full text-rose-400 text-xs font-medium flex items-center gap-2 animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                      REC {formatTime(callDuration)}
                   </div>
                )}
                {!isRecording && (
                   <div className="bg-black/60 backdrop-blur border border-white/10 px-3 py-1.5 rounded-full text-white/70 text-xs font-medium font-mono">
                      {formatTime(callDuration)}
                   </div>
                )}
                {connectionStatus === 'connected' && (
                  <div className="bg-emerald-500/10 backdrop-blur border border-emerald-500/30 px-3 py-1.5 rounded-full text-emerald-400 text-xs font-medium flex items-center gap-2">
                    <Wifi className="w-3 h-3" /> P2P
                  </div>
                )}
             </div>
          </div>

          {/* Controls Bar */}
          <div className="h-20 bg-[#1a1a1a] border-t border-white/5 flex items-center justify-center gap-4 px-6 shrink-0">
             <button
               onClick={toggleMic}
               className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-colors", micMuted ? "bg-rose-500 hover:bg-rose-600 text-white" : "bg-white/10 hover:bg-white/20 text-white")}
             >
               {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
             </button>
             <button
               onClick={toggleVideo}
               className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-colors", videoOff ? "bg-rose-500 hover:bg-rose-600 text-white" : "bg-white/10 hover:bg-white/20 text-white")}
             >
               {videoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
             </button>
             <button className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
               <MonitorUp className="w-5 h-5" />
             </button>
             <button
               onClick={toggleRecording}
               className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-colors", isRecording ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-white/10 hover:bg-white/20 text-white")}
             >
               <Circle className={cn("w-5 h-5", isRecording ? "fill-rose-400" : "")} />
             </button>
             <div className="w-px h-8 bg-white/10 mx-2" />
             <button
               onClick={handleLeave}
               className="w-16 h-12 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-lg"
             >
               <PhoneOff className="w-5 h-5" />
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
