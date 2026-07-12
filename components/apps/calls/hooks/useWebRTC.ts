'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';

export interface WebRTCState {
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  connectionStatus: 'idle' | 'waiting' | 'ringing' | 'connected' | 'ended' | 'failed';
  remoteUser: { name: string; id: string } | null;
  error: string | null;
}

export function useWebRTC(roomId: string, currentUser: any, inCall: boolean) {
  const [state, setState] = useState<WebRTCState>({
    remoteStream: null,
    localStream: null,
    connectionStatus: 'idle',
    remoteUser: null,
    error: null,
  });

  const peerRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const unsubscribersRef = useRef<(() => void)[]>([]);
  const activeRef = useRef(true);
  const callIdRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    activeRef.current = false;

    // Destroy peer
    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch {}
      peerRef.current = null;
    }

    // Stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    // Clear remote stream ref
    remoteStreamRef.current = null;

    // Unsubscribe from all Supabase channels
    unsubscribersRef.current.forEach(unsub => unsub());
    unsubscribersRef.current = [];

    setState({
      remoteStream: null,
      localStream: null,
      connectionStatus: 'idle',
      remoteUser: null,
      error: null,
    });
  }, []);

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit, role: 'caller' | 'callee') => {
    if (!callIdRef.current) return;
    await getSupabase().from('call_candidates').insert({
      call_id: callIdRef.current,
      role,
      candidate: JSON.stringify(candidate),
      created_at: new Date().toISOString(),
    });
  }, []);

  const listenForIceCandidates = useCallback((peer: any, role: 'callee' | 'caller') => {
    if (!callIdRef.current) return;
    const oppositeRole = role === 'caller' ? 'callee' : 'caller';
    const supabase = getSupabase();

    // Initial fetch of existing candidates
    supabase
      .from('call_candidates')
      .select('candidate')
      .eq('call_id', callIdRef.current)
      .eq('role', oppositeRole)
      .order('created_at')
      .limit(100)
      .then(({ data }) => {
        if (data) {
          data.forEach(row => {
            try {
              const candidate = JSON.parse(row.candidate);
              peer.addIceCandidate(candidate);
            } catch (err) {
              console.warn('Failed to add ICE candidate', err);
            }
          });
        }
      });

    // Realtime subscription for new candidates
    const channel = supabase
      .channel(`call_candidates:${callIdRef.current}:${oppositeRole}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'call_candidates', filter: `call_id=eq.${callIdRef.current}` },
        (payload: any) => {
          const data = payload.new;
          if (data.role === oppositeRole) {
            try {
              const candidate = JSON.parse(data.candidate);
              peer.addIceCandidate(candidate);
            } catch (err) {
              console.warn('Failed to add ICE candidate', err);
            }
          }
        }
      )
      .subscribe();

    unsubscribersRef.current.push(() => supabase.removeChannel(channel));
  }, []);

  const initPeer = useCallback(async (stream: MediaStream, isInitiator: boolean) => {
    const Peer = (await import('simple-peer')).default;

    const peer = new Peer({
      initiator: isInitiator,
      trickle: true,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      }
    });

    peerRef.current = peer;

    peer.on('stream', (remoteStream: MediaStream) => {
      if (!activeRef.current) return;
      remoteStreamRef.current = remoteStream;
      setState(prev => ({ ...prev, remoteStream, connectionStatus: 'connected' }));
    });

    peer.on('connect', () => {
      if (!activeRef.current) return;
      setState(prev => ({ ...prev, connectionStatus: 'connected' }));
    });

    peer.on('close', () => {
      if (!activeRef.current) return;
      setState(prev => ({ ...prev, connectionStatus: 'ended', remoteStream: null }));
    });

    peer.on('error', (err: Error) => {
      if (!activeRef.current) return;
      console.error('Peer error:', err);
      setState(prev => ({ ...prev, connectionStatus: 'failed', error: err.message }));
    });

    peer.on('iceCandidate', (candidate: RTCIceCandidateInit) => {
      if (!activeRef.current || !candidate) return;
      const role = isInitiator ? 'caller' : 'callee';
      addIceCandidate(candidate, role);
    });

    return peer;
  }, [addIceCandidate]);

  // Join as caller — create the call document and write the offer
  const joinAsCaller = useCallback(async (stream: MediaStream) => {
    if (!activeRef.current) return;

    const supabase = getSupabase();
    callIdRef.current = roomId;

    // Check if call already exists
    const { data: existing } = await supabase
      .from('calls')
      .select('*')
      .eq('id', roomId)
      .single();

    if (existing) {
      // Call already exists — join as callee instead
      joinAsCallee(stream);
      return;
    }

    // Create call document
    await supabase.from('calls').upsert({
      id: roomId,
      callerId: currentUser?.id || 'anonymous',
      callerName: currentUser?.name || 'Anonymous',
      status: 'waiting',
      offerSDP: '',
      answerSDP: '',
      createdAt: new Date().toISOString(),
    }, { onConflict: 'id' });

    const peer = await initPeer(stream, true);

    // Wait for offer signal, then write it to Supabase
    peer.on('signal', async (data: any) => {
      if (!activeRef.current) return;
      if (data.type === 'offer') {
        await supabase.from('calls').update({
          offerSDP: JSON.stringify(data),
          status: 'ringing',
        }).eq('id', roomId);
      }
    });

    // Listen for answer from callee
    const channel = supabase
      .channel(`call:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'calls', filter: `id=eq.${roomId}` },
        (payload: any) => {
          if (!activeRef.current) return;
          const data = payload.new;
          if (data?.answerSDP && peerRef.current) {
            try {
              peerRef.current.signal(JSON.parse(data.answerSDP));
            } catch (err) {
              console.warn('Failed to signal answer', err);
            }
          }
          if (data?.calleeName) {
            setState(prev => ({ ...prev, remoteUser: { name: data.calleeName, id: data.calleeId } }));
          }
        }
      )
      .subscribe();
    unsubscribersRef.current.push(() => supabase.removeChannel(channel));

    // Listen for callee's ICE candidates
    listenForIceCandidates(peer, 'caller');

    setState(prev => ({ ...prev, connectionStatus: 'waiting' }));
  }, [roomId, currentUser, initPeer, listenForIceCandidates]);

  // Join as callee — read the offer, create peer, write the answer
  const joinAsCallee = useCallback(async (stream: MediaStream) => {
    if (!activeRef.current) return;

    const supabase = getSupabase();
    callIdRef.current = roomId;

    const { data: existing } = await supabase
      .from('calls')
      .select('*')
      .eq('id', roomId)
      .single();

    if (!existing) {
      // No call exists — become the caller instead
      joinAsCaller(stream);
      return;
    }

    // Update call document with callee info
    await supabase.from('calls').update({
      calleeId: currentUser?.id || 'anonymous',
      calleeName: currentUser?.name || 'Anonymous',
    }).eq('id', roomId);

    setState(prev => ({
      ...prev,
      remoteUser: { name: existing.callerName || 'Unknown', id: existing.callerId },
      connectionStatus: 'ringing',
    }));

    const peer = await initPeer(stream, false);

    // Signal the offer first, then write the answer
    peer.on('signal', async (data: any) => {
      if (!activeRef.current) return;
      if (data.type === 'answer') {
        await supabase.from('calls').update({
          answerSDP: JSON.stringify(data),
          status: 'connected',
        }).eq('id', roomId);
      }
    });

    // Signal the existing offer
    if (existing.offerSDP) {
      try {
        peer.signal(JSON.parse(existing.offerSDP));
      } catch (err) {
        console.warn('Failed to signal offer', err);
      }
    }

    // Listen for caller's ICE candidates
    listenForIceCandidates(peer, 'callee');

    // Also listen for offer updates (if caller hasn't written yet)
    const channel = supabase
      .channel(`call:${roomId}:callee`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'calls', filter: `id=eq.${roomId}` },
        (payload: any) => {
          if (!activeRef.current) return;
          const data = payload.new;
          if (data?.offerSDP && peerRef.current && !existing.offerSDP) {
            try {
              peerRef.current.signal(JSON.parse(data.offerSDP));
            } catch (err) {
              console.warn('Failed to signal offer on update', err);
            }
          }
        }
      )
      .subscribe();
    unsubscribersRef.current.push(() => supabase.removeChannel(channel));
  }, [roomId, currentUser, initPeer, listenForIceCandidates, joinAsCaller]);

  // Start or join a call
  const startCall = useCallback(async (videoOff: boolean, micMuted: boolean) => {
    cleanup();
    activeRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: !videoOff,
        audio: !micMuted,
      });
      localStreamRef.current = stream;
      setState(prev => ({ ...prev, localStream: stream }));

      // Check if call exists to determine role
      const { data: existing } = await getSupabase()
        .from('calls')
        .select('*')
        .eq('id', roomId)
        .single();

      if (existing && existing.status !== 'ended') {
        await joinAsCallee(stream);
      } else {
        // If ended or doesn't exist, clean up old record first
        if (existing) {
          await getSupabase().from('calls').delete().eq('id', roomId);
        }
        await joinAsCaller(stream);
      }
    } catch (err: any) {
      console.error('Failed to start call:', err);
      setState(prev => ({ ...prev, error: err.message, connectionStatus: 'failed' }));
    }
  }, [roomId, cleanup, joinAsCaller, joinAsCallee]);

  // End the call
  const endCall = useCallback(async () => {
    if (callIdRef.current) {
      try {
        await getSupabase().from('calls').update({ status: 'ended' }).eq('id', roomId);
      } catch {}
    }
    cleanup();
  }, [cleanup, roomId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    ...state,
    startCall,
    endCall,
  };
}
