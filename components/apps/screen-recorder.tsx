import React, { useState, useRef, useEffect } from 'react';
import { useOS, OSWindow } from '@/lib/os-context';
import { Monitor, Square, Circle, Download, X, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ScreenRecorderApp({ window: osWindow }: { window: OSWindow }) {
  const { notify } = useOS();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Attach stream to video element
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
      setStream(displayStream);
      
      // Listen for user stopping share via browser UI
      displayStream.getVideoTracks()[0].onended = () => {
        stopShare();
      };
    } catch (err: any) {
      setError(err.message || 'Failed to get display media');
    }
  };

  const stopShare = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (isRecording) {
      stopRecording();
    }
  };

  const startRecording = () => {
    if (!stream) return;
    
    chunksRef.current = [];
    const options = { mimeType: 'video/webm; codecs=vp9' };
    
    try {
      const recorder = new MediaRecorder(stream, options);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        notify('Screen Recording Saved', { body: 'Your video is ready to preview and download.' });
      };
      
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      notify('Recording Started', { body: 'Screen recording is now active.' });
    } catch (err: any) {
      setError('MediaRecorder failed: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const downloadRecording = () => {
    if (recordedUrl) {
      const a = document.createElement('a');
      a.href = recordedUrl;
      a.download = \`Screen_Recording_\${new Date().getTime()}.webm\`;
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
              onClick={stopShare}
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
