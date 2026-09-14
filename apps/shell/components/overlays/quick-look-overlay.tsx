'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFileStore, FileItem } from '@/lib/stores/file.store';
import { LocalFile, FS } from '@/lib/fs';
import { X, ExternalLink, Folder, Download, Play, Pause, Volume2, VolumeX, Music, Code, FileText, Sparkles, Image as ImageIcon, Video, ZoomIn, ZoomOut } from 'lucide-react';
import { useWindowActions } from '@/lib/hooks/use-window-actions';
import { cn } from '@/lib/utils';

export function QuickLookOverlay() {
  const selectedFiles = useFileStore(s => s.selectedFiles);
  const files = useFileStore(s => s.files);
  const resolveSmartRoute = useFileStore(s => s.resolveSmartRoute);
  const { openWindow } = useWindowActions();
  
  const [activeFile, setActiveFile] = useState<FileItem | LocalFile | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [folderEntries, setFolderEntries] = useState<LocalFile[]>([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const isOpen = !!activeFile;

  // Listen for Spacebar & custom QuickLook events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        
        if (isOpen) {
          setActiveFile(null);
          return;
        }

        if (selectedFiles.size === 1) {
          const fileId = Array.from(selectedFiles)[0];
          const file = files.find(f => f.id === fileId);
          if (file) {
            setActiveFile(file);
          }
        }
      }

      if (e.key === 'Escape' && isOpen) {
        setActiveFile(null);
      }
    };

    const handleCustomEvent = (e: any) => {
      if (e.detail?.file) {
        setActiveFile(e.detail.file);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('os:quick-look', handleCustomEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('os:quick-look', handleCustomEvent);
    };
  }, [isOpen, selectedFiles, files]);

  // Load content when active file changes
  useEffect(() => {
    if (!activeFile) {
      setContent(null);
      setFolderEntries([]);
      setIsPlayingAudio(false);
      setAudioProgress(0);
      setZoomLevel(1);
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      return;
    }

    const isFolder = (activeFile as any).isFolder === true || activeFile.mimeType === 'inode/directory';

    if (isFolder) {
      FS.readDir(activeFile.path || activeFile.name)
        .then(entries => setFolderEntries(entries || []))
        .catch(() => setFolderEntries([]));
      return;
    }

    const loadContent = async () => {
      try {
        const file = await FS.read(activeFile.path || activeFile.name);
        if (file) {
          const mime = activeFile.mimeType || '';
          if (mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/')) {
            if (typeof file.content === 'string' && file.content.startsWith('blob:')) {
              setBlobUrl(file.content);
            } else if (typeof file.content === 'string' && file.content.startsWith('data:')) {
              setBlobUrl(file.content);
            } else {
              const blob = new Blob([file.content as any], { type: mime });
              const url = URL.createObjectURL(blob);
              setBlobUrl(url);
            }
          } else {
            setContent(typeof file.content === 'string' ? file.content : new TextDecoder().decode(file.content as any));
          }
        }
      } catch (err) {
        console.error('QuickLook error:', err);
      }
    };

    loadContent();
  }, [activeFile]);

  const handleOpenApp = () => {
    if (!activeFile) return;
    const isFolder = (activeFile as any).isFolder === true || activeFile.mimeType === 'inode/directory';
    if (isFolder) {
      openWindow('files', activeFile.name, { initialPath: activeFile.path || activeFile.name });
    } else {
      const appId = resolveSmartRoute(activeFile.mimeType || '', activeFile.name) || 'code';
      openWindow(appId, activeFile.name, { fileId: (activeFile as any).id, path: activeFile.path, content: content || blobUrl });
    }
    setActiveFile(null);
  };

  const handleDownload = () => {
    if (!activeFile) return;
    if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = activeFile.name;
      a.click();
    } else if (content) {
      const blob = new Blob([content], { type: activeFile.mimeType || 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = activeFile.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (typeof window === 'undefined') return null;

  const isFolder = activeFile ? ((activeFile as any).isFolder === true || activeFile.mimeType === 'inode/directory') : false;
  const isImage = activeFile?.mimeType?.startsWith('image/');
  const isVideo = activeFile?.mimeType?.startsWith('video/');
  const isAudio = activeFile?.mimeType?.startsWith('audio/');
  const isMarkdown = activeFile?.name?.endsWith('.md') || activeFile?.mimeType === 'text/markdown';
  const isCode = !isImage && !isVideo && !isAudio && !isFolder;

  return (
    <AnimatePresence>
      {isOpen && activeFile && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-8 pointer-events-none select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto"
            onClick={() => setActiveFile(null)}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative w-full max-w-3xl max-h-[85vh] flex flex-col pointer-events-auto shadow-2xl rounded-3xl overflow-hidden glass-panel border border-[var(--os-border)] bg-[var(--os-surface)]"
          >
            {/* Top Titlebar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--os-border)] bg-[var(--os-surface-dim)]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-[var(--os-primary)]/15 text-[var(--os-primary)]">
                  {isFolder ? <Folder className="w-5 h-5" /> : isImage ? <ImageIcon className="w-5 h-5" /> : isVideo ? <Video className="w-5 h-5" /> : isAudio ? <Music className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold truncate text-[var(--os-text)]">{activeFile.name}</span>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--os-text-muted)]">
                    {activeFile.mimeType || 'File'} • {activeFile.size ? `${(activeFile.size / 1024).toFixed(1)} KB` : isFolder ? `${folderEntries.length} items` : 'Local Item'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isImage && (
                  <div className="flex items-center gap-1 bg-[var(--os-surface)] px-2 py-1 rounded-xl border border-[var(--os-border)] mr-1">
                    <button onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))} className="p-1 text-[var(--os-text-muted)] hover:text-[var(--os-text)]"><ZoomOut className="w-3.5 h-3.5" /></button>
                    <span className="text-[10px] font-mono font-bold text-[var(--os-text-muted)]">{Math.round(zoomLevel * 100)}%</span>
                    <button onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))} className="p-1 text-[var(--os-text-muted)] hover:text-[var(--os-text)]"><ZoomIn className="w-3.5 h-3.5" /></button>
                  </div>
                )}
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--os-surface)] hover:bg-[var(--os-hover)] text-[var(--os-text)] border border-[var(--os-border)] transition-all"
                  title="Download File to Computer"
                >
                  <Download className="w-3.5 h-3.5 text-[var(--os-primary)]" /> Save
                </button>
                <button 
                  onClick={handleOpenApp}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--os-primary)] hover:brightness-110 text-slate-950 transition-all shadow-sm"
                >
                  <span>Open</span> <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setActiveFile(null)}
                  className="p-1.5 rounded-xl text-[var(--os-text-muted)] hover:text-[var(--os-text)] hover:bg-[var(--os-hover)] transition-colors ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Preview Content Area */}
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-black/10 min-h-[360px] max-h-[60vh] custom-scrollbar">
              {isFolder ? (
                <div className="w-full flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--os-border)]">
                    <span className="text-xs font-bold text-[var(--os-text-muted)] uppercase tracking-wider">Folder Contents ({folderEntries.length} Items)</span>
                    <span className="text-[11px] font-mono text-[var(--os-text-muted)]">{activeFile.path || activeFile.name}</span>
                  </div>
                  {folderEntries.length === 0 ? (
                    <div className="text-center py-12 text-xs text-[var(--os-text-muted)]">This folder is empty</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {folderEntries.slice(0, 16).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--os-surface)] border border-[var(--os-border)]">
                          {item.isFolder ? <Folder className="w-4 h-4 text-cyan-400 shrink-0" /> : <FileText className="w-4 h-4 text-[var(--os-primary)] shrink-0" />}
                          <span className="text-xs truncate text-[var(--os-text)]">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : isImage && blobUrl ? (
                <div className="overflow-auto max-w-full max-h-full flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={blobUrl}
                    alt={activeFile.name}
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                    className="max-w-full max-h-[50vh] object-contain rounded-2xl shadow-xl transition-transform duration-150"
                  />
                </div>
              ) : isVideo && blobUrl ? (
                <video src={blobUrl} controls autoPlay className="max-w-full max-h-[50vh] object-contain rounded-2xl shadow-xl" />
              ) : isAudio && blobUrl ? (
                <div className="w-full max-w-md p-6 rounded-3xl bg-[var(--os-surface-dim)] border border-[var(--os-border)] flex flex-col items-center gap-5 shadow-2xl">
                  <div className="w-20 h-20 rounded-3xl bg-[var(--os-primary)]/20 text-[var(--os-primary)] border border-[var(--os-primary)]/30 flex items-center justify-center shadow-lg shadow-[var(--os-primary)]/10">
                    <Music className="w-10 h-10" />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-sm text-[var(--os-text)] truncate">{activeFile.name}</div>
                    <div className="text-[11px] font-mono text-[var(--os-text-muted)] mt-0.5">High-Fidelity Audio Preview</div>
                  </div>
                  <audio
                    ref={audioRef}
                    src={blobUrl}
                    onTimeUpdate={(e) => {
                      const el = e.currentTarget;
                      setAudioCurrentTime(el.currentTime);
                      setAudioProgress((el.currentTime / (el.duration || 1)) * 100);
                    }}
                    onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
                    onEnded={() => setIsPlayingAudio(false)}
                  />
                  <div className="w-full space-y-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={audioProgress}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setAudioProgress(val);
                        if (audioRef.current && audioDuration) {
                          audioRef.current.currentTime = (val / 100) * audioDuration;
                        }
                      }}
                      className="w-full h-1.5 bg-[var(--os-hover)] rounded-full appearance-none outline-none accent-[var(--os-primary)] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-[var(--os-text-muted)]">
                      <span>{Math.floor(audioCurrentTime / 60)}:{Math.floor(audioCurrentTime % 60).toString().padStart(2, '0')}</span>
                      <span>{Math.floor(audioDuration / 60)}:{Math.floor(audioDuration % 60).toString().padStart(2, '0')}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!audioRef.current) return;
                      if (isPlayingAudio) {
                        audioRef.current.pause();
                        setIsPlayingAudio(false);
                      } else {
                        audioRef.current.play();
                        setIsPlayingAudio(true);
                      }
                    }}
                    className="w-12 h-12 rounded-full bg-[var(--os-primary)] text-slate-950 flex items-center justify-center font-bold hover:scale-105 active:scale-95 transition-all shadow-md shadow-[var(--os-primary)]/30"
                  >
                    {isPlayingAudio ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>
                </div>
              ) : isCode && content !== null ? (
                <div className="w-full h-full max-h-[50vh] flex flex-col rounded-2xl overflow-hidden border border-[var(--os-border)] bg-[#121214]">
                  <div className="px-4 py-1.5 bg-[#18181b] border-b border-[#27272a] text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                    <span>{activeFile.name}</span>
                    <span>{content.split('\n').length} lines</span>
                  </div>
                  <pre className="flex-1 p-4 overflow-auto text-xs font-mono text-zinc-200 leading-relaxed custom-scrollbar">
                    {content.slice(0, 10000)}
                    {content.length > 10000 && '\n\n... (truncated for preview)'}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-xs text-[var(--os-text-muted)] animate-pulse">
                  <Sparkles className="w-6 h-6 text-[var(--os-primary)]" />
                  <span>Loading Quick Look preview...</span>
                </div>
              )}
            </div>

            {/* Bottom Quick Look Footnote */}
            <div className="px-5 py-2.5 border-t border-[var(--os-border)] bg-[var(--os-surface-dim)] flex items-center justify-between text-[11px] text-[var(--os-text-muted)]">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="px-1.5 py-0.5 rounded bg-[var(--os-surface)] border border-[var(--os-border)] font-mono text-[10px] text-[var(--os-text)]">Space</span>
                to toggle preview
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="px-1.5 py-0.5 rounded bg-[var(--os-surface)] border border-[var(--os-border)] font-mono text-[10px] text-[var(--os-text)]">Esc</span>
                to close
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

