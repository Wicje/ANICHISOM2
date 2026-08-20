import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useOS, OSWindow } from '@/lib/os-context';
import { Monitor, Square, Circle, Download, X, Sparkles, Keyboard, MousePointer, Film, Check, FolderOpen, Play } from 'lucide-react';
import { FS } from '@/lib/fs';
import { cn } from '@/lib/utils';

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
  const { notify, openWindow } = useOS();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [lastSavedPath, setLastSavedPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [savedToOs, setSavedToOs] = useState(false);

  // Screenize Studio Effects State
  const [enableSmartZoom, setEnableSmartZoom] = useState(true);
  const [enableKeystrokes, setEnableKeystrokes] = useState(true);
  const [enableCursorHalo, setEnableCursorHalo] = useState(true);
  const [recentKey, setRecentKey] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const recordingSecondsRef = useRef(0);

  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false);
  const mimeTypeRef = useRef<string | null>(null);
  const recordedUrlRef = useRef<string | null>(null);

  useEffect(() => { streamRef.current = stream; }, [stream]);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { recordedUrlRef.current = recordedUrl; }, [recordedUrl]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
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
      if (recordedUrlRef.current) {
        URL.revokeObjectURL(recordedUrlRef.current);
        recordedUrlRef.current = null;
      }
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
      setRecordedUrl(null);
      setLastSavedPath(null);
      setSavedToOs(false);
      
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: 60, max: 60 },
        },
        audio: true
      });

      setStream(mediaStream);

      mediaStream.getVideoTracks()[0]?.addEventListener('ended', () => {
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
        setRecordedBlob(blob);
        if (recordedUrlRef.current) {
          URL.revokeObjectURL(recordedUrlRef.current);
        }
        const url = URL.createObjectURL(blob);
        recordedUrlRef.current = url;
        setRecordedUrl(url);

        try {
          await FS.mkdir('Recordings');
          const filename = `Recordings/Screen_Recording_${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;
          await FS.write(filename, blob, mimeTypeRef.current || 'video/webm');
          setLastSavedPath(filename);
          setSavedToOs(true);
          window.dispatchEvent(new CustomEvent('os:notify', {
            detail: { title: 'Recording Saved to File Manager', description: `Saved to ${filename}`, type: 'success' },
          }));
          window.dispatchEvent(new CustomEvent('os:activity', {
            detail: { type: 'file-save', title: 'Screen recording saved', detail: filename },
          }));
        } catch (fsErr) {
          console.warn('Failed to save recording to FS:', fsErr);
          window.dispatchEvent(new CustomEvent('os:notify', {
            detail: { title: 'Save Warning', description: 'Recording captured in memory. Use "Save to Disk" to export.', type: 'warning' },
          }));
        }

        mediaRecorderRef.current = null;
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      isRecordingRef.current = true;
      setIsRecording(true);
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        recordingSecondsRef.current += 1;
        setRecordingSeconds(recordingSecondsRef.current);
        if (recordingSecondsRef.current >= 600) {
          stopRecording();
          window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Time Limit Reached', description: 'Maximum recording length (10m) reached.', type: 'warning' }}));
        }
      }, 1000);
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

  useEffect(() => {
    if (!isRecording) return;

    const handleKey = (e: KeyboardEvent) => {
      if (enableKeystrokes) {
        const parts: string[] = [];
        if (e.metaKey || e.ctrlKey) parts.push('⌘');
        if (e.altKey) parts.push('⌥');
        if (e.shiftKey) parts.push('⇧');
        if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
          parts.push(e.key.toUpperCase());
        }
        if (parts.length > 0) {
          setRecentKey(parts.join(' + '));
          setTimeout(() => setRecentKey(null), 1500);
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isRecording, enableKeystrokes]);

  const clearRecording = () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
      setLastSavedPath(null);
      setSavedToOs(false);
    }
  };

  const openInFileManager = () => {
    openWindow('files', 'File Manager', { initialPath: 'Recordings' });
  };

  const openInMediaPlayer = () => {
    if (recordedUrl) {
      openWindow('media-player', 'Media Player', { fileId: lastSavedPath || 'Recording.webm', src: recordedUrl });
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-[var(--os-bg)] text-[var(--os-text)] font-sans overflow-hidden select-none">
      
      {/* Toolbar */}
      <div className="h-14 border-b border-[var(--os-border)] bg-[var(--os-surface)] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-[var(--os-text)]">Screenize Studio</span>
              <p className="text-[10px] text-[var(--os-text-muted)]">Capture, zoom effects &amp; auto-save</p>
            </div>
          </div>

          {/* Studio Effects Toggles */}
          <div className="hidden md:flex items-center gap-1 bg-[var(--os-surface-dim)] p-1 rounded-xl border border-[var(--os-border)] text-xs">
            <button
              onClick={() => setEnableSmartZoom(!enableSmartZoom)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all",
                enableSmartZoom ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-[var(--os-text-muted)] hover:text-[var(--os-text)]"
              )}
              title="Smooth zoom on cursor click areas"
            >
              <Sparkles className="w-3 h-3" /> Auto-Zoom
            </button>
            <button
              onClick={() => setEnableKeystrokes(!enableKeystrokes)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all",
                enableKeystrokes ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-[var(--os-text-muted)] hover:text-[var(--os-text)]"
              )}
              title="Show floating keyboard shortcuts badge"
            >
              <Keyboard className="w-3 h-3" /> Keystrokes
            </button>
            <button
              onClick={() => setEnableCursorHalo(!enableCursorHalo)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all",
                enableCursorHalo ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-[var(--os-text-muted)] hover:text-[var(--os-text)]"
              )}
              title="Pulse glowing ring on clicks"
            >
              <MousePointer className="w-3 h-3" /> Click Halo
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!stream ? (
            <button 
              onClick={startShare}
              className="flex items-center gap-2 bg-[var(--os-primary)] text-slate-950 font-bold px-4 py-1.5 rounded-xl text-xs transition-all shadow-sm hover:brightness-110"
            >
              <Monitor className="w-4 h-4" />
              Select Screen
            </button>
          ) : (
            <button
              onClick={handleStopShare}
              className="flex items-center gap-2 bg-[var(--os-surface-dim)] hover:bg-[var(--os-hover)] text-[var(--os-text)] px-4 py-1.5 rounded-xl text-xs font-semibold transition-all border border-[var(--os-border)]"
            >
              <X className="w-4 h-4" />
              Stop Sharing
            </button>
          )}

          {stream && !isRecording && (
            <button 
              onClick={startRecording}
              className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold px-4 py-1.5 rounded-xl text-xs transition-all shadow-lg shadow-rose-500/30"
            >
              <Circle className="w-3 h-3 fill-white" />
              Record Studio
            </button>
          )}
          
          {isRecording && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/30">{Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')} / 10:00</span>
              <button 
                onClick={stopRecording}
                className="flex items-center gap-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 px-4 py-1.5 rounded-xl text-xs font-bold transition-all border border-rose-500/40 animate-pulse shadow-md"
              >
                <Square className="w-3 h-3 fill-rose-400" />
                Stop Recording
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto custom-scrollbar bg-[var(--os-surface-dim)]">
        {error && (
          <div className="p-3.5 bg-rose-500/15 border border-rose-500/40 rounded-2xl text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Highlighted Saved Recording Card */}
        {recordedUrl && (
          <div className="p-5 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl shadow-xl flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[var(--os-border)]">
               <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <Check className="w-4 h-4" />
                    </span>
                    <h3 className="font-bold text-sm text-[var(--os-text)]">Screen Recording Completed</h3>
                  </div>
                  {lastSavedPath && (
                    <p className="text-xs text-[var(--os-text-muted)] mt-1 flex items-center gap-1.5 font-mono">
                      <FolderOpen className="w-3.5 h-3.5 text-[var(--os-primary)]" />
                      Saved in Continua OS: <span className="text-[var(--os-text)] font-semibold">{lastSavedPath}</span>
                    </p>
                  )}
               </div>
               <div className="flex flex-wrap items-center gap-2">
                 <button 
                   onClick={downloadRecording} 
                   className="flex items-center gap-1.5 text-xs bg-[var(--os-primary)] text-slate-950 font-bold hover:brightness-110 px-3.5 py-1.5 rounded-xl transition-all shadow-sm"
                 >
                   <Download className="w-3.5 h-3.5" /> Save to PC Downloads
                 </button>
                 <button 
                   onClick={openInFileManager} 
                   className="flex items-center gap-1.5 text-xs bg-[var(--os-surface-dim)] hover:bg-[var(--os-hover)] text-[var(--os-text)] font-semibold border border-[var(--os-border)] px-3.5 py-1.5 rounded-xl transition-all"
                 >
                   <FolderOpen className="w-3.5 h-3.5 text-[var(--os-primary)]" /> View in File Manager
                 </button>
                 <button 
                   onClick={openInMediaPlayer} 
                   className="flex items-center gap-1.5 text-xs bg-[var(--os-surface-dim)] hover:bg-[var(--os-hover)] text-[var(--os-text)] font-semibold border border-[var(--os-border)] px-3.5 py-1.5 rounded-xl transition-all"
                 >
                   <Play className="w-3.5 h-3.5 text-blue-400" /> Play
                 </button>
                 <button 
                   onClick={clearRecording} 
                   className="p-1.5 text-[var(--os-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                   title="Discard Recording"
                 >
                   <X className="w-4 h-4" />
                 </button>
               </div>
            </div>
            
            <div className="w-full aspect-video bg-black rounded-xl border border-[var(--os-border)] overflow-hidden relative shadow-inner max-h-72">
              <video 
                src={recordedUrl}
                controls 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Live Preview with Screenize Overlays */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--os-text-muted)] uppercase tracking-wider">Live Capture Preview</span>
            {stream && (
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Display Media Connected
              </span>
            )}
          </div>
          <div className="w-full aspect-video bg-black rounded-2xl border border-[var(--os-border)] overflow-hidden relative shadow-md">
            {!stream ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--os-text-muted)] gap-3 bg-[var(--os-surface)]">
                <div className="p-4 rounded-2xl bg-[var(--os-surface-dim)] border border-[var(--os-border)]">
                  <Monitor className="w-8 h-8 opacity-60" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-[var(--os-text)]">No screen stream selected</p>
                  <p className="text-[11px] text-[var(--os-text-muted)] mt-0.5">Click "Select Screen" in toolbar to share full screen or window</p>
                </div>
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
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <div className="w-2 h-2 rounded-full bg-red-500 absolute" />
                <span className="text-[11px] font-bold text-red-400 tracking-wider">REC STUDIO</span>
              </div>
            )}

            {/* Floating Keystroke Badge Overlay */}
            {isRecording && recentKey && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-neutral-900/90 border border-white/20 text-white font-mono text-sm font-bold shadow-2xl backdrop-blur-md animate-bounce">
                {recentKey}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
