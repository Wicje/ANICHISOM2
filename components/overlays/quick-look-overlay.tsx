'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFileStore, FileItem } from '@/lib/stores/file.store';
import { LocalFile, FS } from '@/lib/fs';
import { X, ExternalLink } from 'lucide-react';
import { useWindowActions } from '@/lib/hooks/use-window-actions';
import { resolveAppComponent, APP_MANIFEST } from '@/lib/app-manifest';

export function QuickLookOverlay() {
  const selectedFiles = useFileStore(s => s.selectedFiles);
  const files = useFileStore(s => s.files);
  const resolveSmartRoute = useFileStore(s => s.resolveSmartRoute);
  const { openWindow } = useWindowActions();
  
  const [activeFile, setActiveFile] = useState<FileItem | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  
  const isOpen = !!activeFile;

  // Listen for Spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const tag = document.activeElement?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault(); // Prevent page scroll
        
        // If already open, close it
        if (isOpen) {
          setActiveFile(null);
          return;
        }

        // If closed, open if exactly 1 file is selected
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedFiles, files]);

  // Load content when active file changes
  useEffect(() => {
    if (!activeFile) {
      setContent(null);
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      return;
    }

    if (activeFile.isFolder) {
      return; // No preview for folders yet
    }

    const loadContent = async () => {
      try {
        if (activeFile.source === 'opfs') {
          const raw = await FS.readFile(activeFile.path);
          if (activeFile.mimeType.startsWith('image/') || activeFile.mimeType.startsWith('video/')) {
            const url = URL.createObjectURL(new Blob([raw], { type: activeFile.mimeType }));
            setBlobUrl(url);
          } else {
            const text = new TextDecoder().decode(raw as Uint8Array);
            setContent(text);
          }
        } else if (activeFile.source === 'local-folder') {
           const local = LocalFile.get(activeFile.path);
           if (local) {
             const handle = local.handle as FileSystemFileHandle;
             const fileData = await handle.getFile();
             if (activeFile.mimeType.startsWith('image/') || activeFile.mimeType.startsWith('video/')) {
                const url = URL.createObjectURL(fileData);
                setBlobUrl(url);
             } else {
                const text = await fileData.text();
                setContent(text);
             }
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
    const appId = resolveSmartRoute(activeFile.mimeType, activeFile.name) || 'code';
    openWindow(appId, { fileId: activeFile.id });
    setActiveFile(null);
  };

  if (typeof window === 'undefined') return null;

  return (
    <AnimatePresence>
      {isOpen && activeFile && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-8 pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto"
            onClick={() => setActiveFile(null)}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-4xl max-h-[85vh] flex flex-col pointer-events-auto shadow-2xl rounded-2xl overflow-hidden glass-panel"
            style={{ 
               background: 'var(--os-surface)', 
               border: '1px solid var(--os-border)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--os-border)', background: 'var(--os-surface-elevated)' }}>
               <div className="flex flex-col">
                  <span className="text-sm font-semibold truncate" style={{ color: 'var(--os-text)' }}>{activeFile.name}</span>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--os-text-muted)' }}>{activeFile.mimeType || 'File'} • {(activeFile.size / 1024).toFixed(1)} KB</span>
               </div>
               <div className="flex items-center gap-2">
                 <button 
                   onClick={handleOpenApp}
                   className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                   style={{ background: 'var(--os-primary)', color: '#fff' }}
                 >
                   Open <ExternalLink className="w-3 h-3" />
                 </button>
                 <button 
                   onClick={() => setActiveFile(null)}
                   className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                 >
                   <X className="w-4 h-4 text-white" />
                 </button>
               </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/20 min-h-[400px]">
               {activeFile.isFolder ? (
                 <div className="flex flex-col items-center opacity-50">
                    <span className="text-6xl mb-4">📁</span>
                    <span>Folder Preview Not Available</span>
                 </div>
               ) : activeFile.mimeType.startsWith('image/') && blobUrl ? (
                 <img src={blobUrl} alt={activeFile.name} className="max-w-full max-h-full object-contain rounded shadow-lg" />
               ) : activeFile.mimeType.startsWith('video/') && blobUrl ? (
                 <video src={blobUrl} controls autoPlay className="max-w-full max-h-full object-contain rounded shadow-lg" />
               ) : content ? (
                 <pre className="w-full h-full p-4 overflow-auto text-xs font-mono rounded shadow-inner" style={{ background: '#1e1e1e', color: '#d4d4d4' }}>
                   {content.slice(0, 5000)}
                   {content.length > 5000 && '\n\n... (truncated for preview)'}
                 </pre>
               ) : (
                 <div className="animate-pulse">Loading preview...</div>
               )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
