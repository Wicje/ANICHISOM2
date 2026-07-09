'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import {
  doc, setDoc, getDoc, updateDoc, deleteDoc,
  collection, addDoc, onSnapshot, query, where, orderBy, limit,
  serverTimestamp, Timestamp
} from 'firebase/firestore';

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
  const callDocRef = useRef<any>(null);

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

    // Unsubscribe from all Firestore listeners
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
    if (!callDocRef.current) return;
    const candidatesCol = collection(callDocRef.current, `${role}_candidates`);
    await addDoc(candidatesCol, {
      candidate: JSON.stringify(candidate),
      timestamp: serverTimestamp()
    });
  }, []);

  const listenForIceCandidates = useCallback((peer: any, role: 'callee' | 'caller') => {
    if (!callDocRef.current) return;
    const oppositeRole = role === 'caller' ? 'callee' : 'caller';
    const candidatesCol = collection(callDocRef.current, `${oppositeRole}_candidates`);
    const q = query(candidatesCol, orderBy('timestamp'), limit(100));

    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          try {
            const candidate = JSON.parse(data.candidate);
            peer.addIceCandidate(candidate);
          } catch (err) {
            console.warn('Failed to add ICE candidate', err);
          }
        }
      });
    });
    unsubscribersRef.current.push(unsub);
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

    const callDoc = doc(db, 'calls', roomId);
    callDocRef.current = callDoc;

    // Check if call already exists
    const existing = await getDoc(callDoc);
    if (existing.exists()) {
      // Call already exists — join as callee instead
      joinAsCallee(stream);
      return;
    }

    // Create call document
    await setDoc(callDoc, {
      callerId: currentUser?.id || 'anonymous',
      callerName: currentUser?.name || 'Anonymous',
      status: 'waiting',
      offerSDP: '',
      answerSDP: '',
      createdAt: serverTimestamp(),
    });

    const peer = await initPeer(stream, true);

    // Wait for offer signal, then write it to Firestore
    peer.on('signal', async (data: any) => {
      if (!activeRef.current) return;
      if (data.type === 'offer') {
        await updateDoc(callDoc, { offerSDP: JSON.stringify(data), status: 'ringing' });
      }
    });

    // Listen for answer from callee
    const unsub = onSnapshot(callDoc, (snapshot) => {
      if (!activeRef.current) return;
      const data = snapshot.data();
      if (data?.answerSDP && peerRef.current) {
        try {
          peerRef.current.signal(JSON.parse(data.answerSDP));
        } catch (err) {
          console.warn('Failed to signal answer', err);
        }
      }
      // Track remote user info
      if (data?.calleeName) {
        setState(prev => ({ ...prev, remoteUser: { name: data.calleeName, id: data.calleeId } }));
      }
    });
    unsubscribersRef.current.push(unsub);

    // Listen for callee's ICE candidates
    listenForIceCandidates(peer, 'caller');

    setState(prev => ({ ...prev, connectionStatus: 'waiting' }));
  }, [roomId, currentUser, initPeer, listenForIceCandidates]);

  // Join as callee — read the offer, create peer, write the answer
  const joinAsCallee = useCallback(async (stream: MediaStream) => {
    if (!activeRef.current) return;

    const callDoc = doc(db, 'calls', roomId);
    callDocRef.current = callDoc;

    const existing = await getDoc(callDoc);
    if (!existing.exists()) {
      // No call exists — become the caller instead
      joinAsCaller(stream);
      return;
    }

    const callData = existing.data();

    // Update call document with callee info
    await updateDoc(callDoc, {
      calleeId: currentUser?.id || 'anonymous',
      calleeName: currentUser?.name || 'Anonymous',
    });

    setState(prev => ({
      ...prev,
      remoteUser: { name: callData.callerName || 'Unknown', id: callData.callerId },
      connectionStatus: 'ringing',
    }));

    const peer = await initPeer(stream, false);

    // Signal the offer first, then write the answer
    peer.on('signal', async (data: any) => {
      if (!activeRef.current) return;
      if (data.type === 'answer') {
        await updateDoc(callDoc, { answerSDP: JSON.stringify(data), status: 'connected' });
      }
    });

    // Signal the existing offer
    if (callData.offerSDP) {
      try {
        peer.signal(JSON.parse(callData.offerSDP));
      } catch (err) {
        console.warn('Failed to signal offer', err);
      }
    }

    // Listen for caller's ICE candidates
    listenForIceCandidates(peer, 'callee');

    // Also listen for offer updates (if caller hasn't written yet)
    const unsub = onSnapshot(callDoc, (snapshot) => {
      if (!activeRef.current) return;
      const data = snapshot.data();
      if (data?.offerSDP && peerRef.current && !callData.offerSDP) {
        try {
          peerRef.current.signal(JSON.parse(data.offerSDP));
        } catch (err) {
          console.warn('Failed to signal offer on update', err);
        }
      }
    });
    unsubscribersRef.current.push(unsub);
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
      const callDoc = doc(db, 'calls', roomId);
      const existing = await getDoc(callDoc);

      if (existing.exists() && existing.data()?.status !== 'ended') {
        await joinAsCallee(stream);
      } else {
        // If ended or doesn't exist, clean up old doc first
        if (existing.exists()) {
          await deleteDoc(callDoc);
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
    if (callDocRef.current) {
      try {
        await updateDoc(callDocRef.current, { status: 'ended' });
      } catch {}
    }
    cleanup();
  }, [cleanup]);

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
