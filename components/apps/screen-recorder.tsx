import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useOS, OSWindow } from '@/lib/os-context';
import { Monitor, Square, Circle, Download, X } from 'lucide-react';
import { FS } from '@/lib/fs';

const CODEC_CHAIN = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=h264,opus',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
];

function getSupportedMimeType(): string | null {
  for (const mime of CODEC_CHAIN) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return null;
}

export function ScreenRecorderApp({ window: osWindow }: { window: OSWindow }) {
  const { notify } = useOS();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false);
  const mimeTypeRef = useRef<string | null>(null);

  useEffect(() => { streamRef.current = stream; }, [stream]);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    const recording = isRecordingRef.current;
    if (recorder && recording) {
      try {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      } catch (err) {
        console.warn('[ScreenRecorder] Error stopping recorder:', err);
      }
      mediaRecorderRef.current = null;
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  }, []);

  const stopAllTracks = useCallback(() => {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopRecording();
      stopAllTracks();
    };
  }, [stopRecording, stopAllTracks]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const startShare = async () => {
    try {
      setError(null);
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: true
      });
      streamRef.current = displayStream;
      setStream(displayStream);

      displayStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        const recording = isRecordingRef.current;
        if (recording) {
          stopRecording();
        }
        streamRef.current = null;
        setStream(null);
      });
    } catch (err: any) {
      setError(err.message || 'Failed to get display media');
    }
  };

  const handleStopShare = () => {
    const recording = isRecordingRef.current;
    if (recording) {
      stopRecording();
    }
    stopAllTracks();
  };

  const startRecording = () => {
    const currentStream = streamRef.current;
    if (!currentStream) return;

    chunksRef.current = [];
    const mimeType = getSupportedMimeType();

    if (!mimeType) {
      setError('No supported video codec found. Your browser does not support screen recording.');
      return;
    }
    mimeTypeRef.current = mimeType;

    try {
      const recorder = new MediaRecorder(currentStream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onerror = () => {
        const errorMsg = recorder.mimeType
          ? `Recording error with codec ${recorder.mimeType}`
          : 'Recording error: stream may have been interrupted';
        setError(errorMsg);
        mediaRecorderRef.current = null;
        isRecordingRef.current = false;
        setIsRecording(false);
      };

      recorder.onstop = async () => {
        if (chunksRef.current.length === 0) {
          window.dispatchEvent(new CustomEvent('os:notify', {
            detail: { title: 'Recording Empty', description: 'No data was captured. The stream may have ended before recording started.', type: 'warning' },
          }));
          mediaRecorderRef.current = null;
          return;
        }

        const ext = mimeTypeRef.current?.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current || 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);

        try {
          await FS.mkdir('Recordings');
          const filename = `Recordings/Screen_Recording_${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;
          await FS.write(filename, blob, mimeTypeRef.current || 'video/webm');
          window.dispatchEvent(new CustomEvent('os:notify', {
            detail: { title: 'Recording Saved', description: `Saved to ${filename}`, type: 'success' },
          }));
          window.dispatchEvent(new CustomEvent('os:activity', {
            detail: { type: 'file-save', title: 'Screen recording saved', detail: filename },
          }));
        } catch (fsErr) {
          console.warn('Failed to save recording to FS:', fsErr);
          window.dispatchEvent(new CustomEvent('os:notify', {
            detail: { title: 'Save Failed', description: 'Recording captured but could not be saved to the file system.', type: 'error' },
          }));
        }

        mediaRecorderRef.current = null;
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      isRecordingRef.current = true;
      setIsRecording(true);
      notify('Recording Started', { body: `Recording with ${mimeType.split(';')[0]}` });
    } catch (err: any) {
      setError('MediaRecorder failed: ' + err.message);
    }
  };

  const downloadRecording = () => {
    if (recordedUrl) {
      const mimeType = mimeTypeRef.current || 'video/webm';
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const a = document.createElement('a');
      a.href = recordedUrl;
      a.download = `Screen_Recording_${new Date().getTime()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const clearRecording = () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-neutral-950 text-white font-sans overflow-hidden">
      
      {/* Toolbar */}
      <div className="h-14 border-b border-white/10 bg-white/5 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-blue-400" />
          <span className="font-medium text-sm">Screen & Share</span>
        </div>
        
        <div className="flex items-center gap-2">
          {!stream ? (
            <button 
              onClick={startShare}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded-md text-xs font-medium transition-colors"
            >
              <Monitor className="w-4 h-4" />
              Select Screen
            </button>
          ) : (
            <button
              onClick={handleStopShare}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-md text-xs font-medium transition-colors border border-white/10"
            >
              <X className="w-4 h-4" />
              Stop Sharing
            </button>
          )}

          {stream && !isRecording && (
            <button 
              onClick={startRecording}
              className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-4 py-1.5 rounded-md text-xs font-medium transition-colors"
            >
              <Circle className="w-3 h-3 fill-white" />
              Record
            </button>
          )}
          
          {isRecording && (
            <button 
              onClick={stopRecording}
              className="flex items-center gap-2 bg-rose-500/20 hover:bg-rose-500/40 text-rose-500 px-4 py-1.5 rounded-md text-xs font-bold transition-colors border border-rose-500/30 animate-pulse"
            >
              <Square className="w-3 h-3 fill-rose-500" />
              Stop Recording
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Live Preview */}
        <div className="flex flex-col gap-2">
          <div className="text-xs font-bold text-white/50 uppercase tracking-wider">Live Preview</div>
          <div className="w-full aspect-video bg-black rounded-xl border border-white/10 overflow-hidden relative shadow-inner">
            {!stream ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 gap-3">
                <Monitor className="w-12 h-12" />
                <p className="text-sm">No screen selected</p>
              </div>
            ) : (
              <video 
                ref={videoRef}
                autoPlay 
                muted 
                className="w-full h-full object-contain"
              />
            )}
            
            {isRecording && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <div className="w-2 h-2 rounded-full bg-red-500 absolute" />
                <span className="text-xs font-bold text-red-500 tracking-wider">REC</span>
              </div>
            )}
          </div>
        </div>

        {/* Saved Recording */}
        {recordedUrl && (
          <div className="flex flex-col gap-2 pt-6 border-t border-white/10 mt-2">
            <div className="flex items-center justify-between">
               <div className="text-xs font-bold text-white/50 uppercase tracking-wider">Last Recording</div>
               <div className="flex gap-2">
                 <button onClick={downloadRecording} className="flex items-center gap-1.5 text-xs bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-white transition-colors">
                   <Download className="w-3.5 h-3.5" /> Save to Disk
                 </button>
                 <button onClick={clearRecording} className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-white transition-colors">
                   <X className="w-3.5 h-3.5" /> Discard
                 </button>
               </div>
            </div>
            <div className="w-full aspect-video bg-black rounded-xl border border-white/10 overflow-hidden relative shadow-inner">
              <video 
                src={recordedUrl}
                controls 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
