'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOS, OSWindow } from '@/lib/os-context';
import {
  Folder, File as FileIcon, FileText, Image as ImageIcon, Video, Box, Search,
  Plus, Trash2, HardDrive, RefreshCw, ChevronRight, Download, Upload,
  Cloud, Link, Unlink, Loader2, ExternalLink, Lock, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FS, LocalFile } from '@/lib/fs';
import { useFileStore } from '@/lib/stores/file.store';
import { SyncPromptBanner } from './sync-prompt-banner';

type CloudSource = {
  id: string;
  name: string;
  icon: string;
  configured: boolean;
  connected: boolean;
  accountName: string | null;
};

type CloudFileItem = {
  id: string;
  name: string;
  path: string;
  size?: number;
  mimeType?: string;
  modifiedTime?: string;
  isFolder: boolean;
  thumbnailUrl?: string;
  webUrl?: string;
};

export function FileManager({ window: osWindow }: { window: OSWindow }) {
  const { openWindow } = useOS();

  // Local files state
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('Desktop');
  const [search, setSearch] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const objectUrlsRef = useRef<Set<string>>(new Set());

  // Cloud storage state
  const [cloudSources, setCloudSources] = useState<CloudSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('local');
  const [cloudFiles, setCloudFiles] = useState<CloudFileItem[]>([]);
  const [cloudPath, setCloudPath] = useState<string>('root');
  const [cloudLoading, setCloudLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState<string | null>(null);

  // Sync prompt state
  const [syncPromptFile, setSyncPromptFile] = useState<{ name: string; size: number; type: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: LocalFile } | null>(null);

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  // Import from URL state
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [showImportUrl, setShowImportUrl] = useState(false);

  const revokeObjectUrls = () => {
    for (const url of objectUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    objectUrlsRef.current.clear();
  };

  const fetchFiles = async () => {
    setIsLoaded(false);
    revokeObjectUrls();
    try {
      const entries = await FS.readDir(currentPath === 'Root' ? '' : currentPath);
      for (const entry of entries || []) {
        if (entry.content && entry.content.startsWith('blob:')) {
          objectUrlsRef.current.add(entry.content);
        }
      }
      setFiles(entries || []);
    } catch (err) {
      console.error("Failed to read local files:", err);
    } finally {
      setIsLoaded(true);
    }
  };

  const fetchCloudSources = async () => {
    try {
      const res = await fetch('/api/storage/files');
      if (res.ok) {
        const data = await res.json();
        setCloudSources(data.connectors || []);
      }
    } catch { /* ignore */ }
  };

  const fetchCloudFiles = async (provider: string, path?: string) => {
    setCloudLoading(true);
    setCloudFiles([]);
    try {
      const params = new URLSearchParams({ provider, path: path || 'root' });
      const res = await fetch(`/api/storage/files?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCloudFiles(data.files || []);
      } else if (res.status === 403) {
        // Not connected — prompt user to connect
        setCloudFiles([]);
      }
    } catch { /* ignore */ }
    setCloudLoading(false);
  };

  // Connect a cloud storage provider — opens OAuth flow in the OS browser
  const handleConnect = async (providerId: string) => {
    setConnectLoading(providerId);
    try {
      const res = await fetch(`/api/storage/connect/${providerId}`);
      if (res.ok) {
        const data = await res.json();
        // Open OAuth flow inside the OS browser instead of external tab
        openWindow('browser', `Connect ${providerId}`, { url: data.authUrl });
      }
    } catch (err) {
      console.error('Connect error:', err);
    }
    setConnectLoading(null);
  };

  // Disconnect a cloud storage provider
  const handleDisconnect = async (providerId: string) => {
    try {
      // For disconnect, we need a separate endpoint or we handle it client-side
      // For now, we'll just refresh the status
      await fetchCloudSources();
      setCloudFiles([]);
      setSelectedSource('local');
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchFiles();
    fetchCloudSources();
    return () => revokeObjectUrls();
  }, [currentPath]);

  // Auto-refresh when filesystem changes (e.g., terminal mkdir/touch)
  useEffect(() => {
    const handleFsChanged = () => {
      fetchFiles();
    };
    window.addEventListener('os:fs-changed', handleFsChanged);
    return () => window.removeEventListener('os:fs-changed', handleFsChanged);
  }, [currentPath]);

  useEffect(() => {
    if (selectedSource !== 'local') {
      fetchCloudFiles(selectedSource, cloudPath);
    }
  }, [selectedSource, cloudPath]);

  // Check for OAuth callback status in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectedProvider = params.get('storage_connected');
    const error = params.get('storage_error');
    if (connectedProvider) {
      fetchCloudSources();
      setSelectedSource(connectedProvider);
      // Clean URL params
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (error) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleFileOpen = (file: LocalFile) => {
    // If it's a folder, navigate into it
    if (file.isFolder) {
      setCurrentPath(file.id);
      return;
    }
    const mime = file.mimeType || '';
    const name = file.name;
    const appId = useFileStore.getState().resolveSmartRoute(mime, name);
    if (appId) {
      const title = name;
      if (appId === 'media-player') {
        openWindow(appId, title, { fileUrl: file.content || file.id, mimeType: mime });
      } else if (appId === 'moodboard') {
        openWindow(appId, title, { url: file.content || file.id });
      } else if (appId === 'pdf-reader') {
        openWindow(appId, title, { url: file.content || file.id });
      } else {
        openWindow(appId, title, { fileId: file.id, content: file.content });
      }
    } else {
      openWindow('code', name, { fileId: file.id, content: file.content });
    }
  };

  const handleCloudFileOpen = (file: CloudFileItem) => {
    if (file.isFolder) {
      setCloudPath(file.id);
      return;
    }
    const downloadUrl = `/api/storage/download/${selectedSource}/${encodeURIComponent(file.id)}`;
    const mime = file.mimeType || '';
    const appId = useFileStore.getState().resolveSmartRoute(mime, file.name);
    if (appId) {
      if (appId === 'media-player') {
        openWindow(appId, file.name, { fileUrl: downloadUrl, mimeType: mime });
      } else if (appId === 'moodboard') {
        openWindow(appId, file.name, { url: downloadUrl });
      } else if (appId === 'pdf-reader') {
        openWindow(appId, file.name, { url: downloadUrl });
      } else {
        openWindow(appId, file.name, { url: downloadUrl });
      }
    } else {
      openWindow('power-browser', file.name, { url: downloadUrl });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i]!;
      const filePath = currentPath === 'Root' ? file.name : `${currentPath}/${file.name}`;
      await FS.write(filePath, file, file.type);

      // Prompt sync for large files (>5MB)
      if (file.size > 5 * 1024 * 1024) {
        setSyncPromptFile({ name: file.name, size: file.size, type: file.type });
      }
    }
    fetchFiles();
  };

  // Drag-and-drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles || droppedFiles.length === 0) return;

    for (let i = 0; i < droppedFiles.length; i++) {
      const file = droppedFiles[i]!;
      const filePath = currentPath === 'Root' ? file.name : `${currentPath}/${file.name}`;
      await FS.write(filePath, file, file.type);
      if (file.size > 5 * 1024 * 1024) {
        setSyncPromptFile({ name: file.name, size: file.size, type: file.type });
      }
    }
    fetchFiles();
  };

  // Import file from URL
  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const contentType = res.headers.get('content-type') || blob.type || 'application/octet-stream';
      // Extract filename from URL or content-disposition
      const cdHeader = res.headers.get('content-disposition');
      let filename = 'imported-file';
      if (cdHeader) {
        const match = cdHeader.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match?.[1]) filename = match[1].replace(/['"]/g, '');
      } else {
        const urlPath = new URL(importUrl.trim()).pathname;
        filename = decodeURIComponent(urlPath.split('/').pop() || 'imported-file');
        if (!filename.includes('.')) {
          const ext = contentType.split('/')[1]?.split(';')[0];
          if (ext && ext !== 'octet-stream') filename += `.${ext}`;
        }
      }
      const filePath = currentPath === 'Root' ? filename : `${currentPath}/${filename}`;
      await FS.write(filePath, blob, contentType);
      fetchFiles();
      setImportUrl('');
      setShowImportUrl(false);
    } catch (err) {
      console.error('Import failed:', err);
      alert(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
    }
  };

  const deleteFile = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this file?")) return;
    await FS.delete(id);
    fetchFiles();
  };

  const downloadFile = (file: LocalFile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!file.content) return;
    const a = document.createElement('a');
    a.href = file.content;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const createNewFile = async () => {
    const name = prompt("Enter new file name (e.g. document.txt):");
    if (!name) return;
    const filePath = currentPath === 'Root' ? name : `${currentPath}/${name}`;
    await FS.write(filePath, "");
    fetchFiles();
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  const filteredCloudFiles = cloudFiles.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  const isViewingLocal = selectedSource === 'local';
  const displayFiles = isViewingLocal ? filteredFiles : filteredCloudFiles;

  return (
    <div className="w-full h-full flex bg-[var(--os-bg)] text-[var(--os-text)] font-sans overflow-hidden">

      {/* Sidebar */}
      <div className="w-56 bg-[var(--os-glass-bg)] backdrop-blur-xl border-r border-[var(--os-border)] flex flex-col shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-[var(--os-border)] text-sm font-semibold tracking-wide text-[var(--os-text)]">
          <HardDrive className="w-4 h-4 mr-2 text-emerald-500" />
          Files Bridge
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {/* Local storage */}
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--os-text-muted)]">Local Disk</div>
          <div className="flex flex-col gap-1 px-2">
            {['Root', 'Desktop', 'Documents', 'Downloads', 'Media'].map(loc => (
              <button
                key={loc}
                onClick={() => { setCurrentPath(loc); setSelectedSource('local'); }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isViewingLocal && currentPath === loc ? "bg-[var(--os-active)] text-[var(--os-primary)]" : "text-[var(--os-text-muted)] hover:bg-[var(--os-hover)] hover:text-[var(--os-text)]",
                  !isViewingLocal && "text-[var(--os-text-muted)] opacity-60"
                )}
              >
                <Folder className={cn("w-4 h-4", isViewingLocal && currentPath === loc ? "text-[var(--os-primary)]" : "text-[var(--os-primary)]")} fill="currentColor" />
                {loc}
              </button>
            ))}
          </div>

          {/* Cloud storage */}
          {cloudSources.length > 0 && (
            <>
              <div className="px-3 mt-6 mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--os-text-muted)]">Cloud Storage</div>
              <div className="flex flex-col gap-1 px-2">
                {cloudSources.map(source => (
                  <div key={source.id}>
                    <button
                      onClick={() => {
                        if (source.connected) {
                          setSelectedSource(source.id);
                          setCloudPath('root');
                        } else {
                          handleConnect(source.id);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        selectedSource === source.id ? "bg-[var(--os-active)] text-[var(--os-primary)]" : "text-[var(--os-text-muted)] hover:bg-[var(--os-hover)] hover:text-[var(--os-text)]",
                        !source.configured && "opacity-40"
                      )}
                    >
                      <Cloud className="w-4 h-4 text-emerald-400" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{source.name}</div>
                        {source.connected && source.accountName && (
                          <div className="text-[10px] text-[var(--os-text-muted)] truncate">{source.accountName}</div>
                        )}
                      </div>
                      {connectLoading === source.id ? (
                        <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                      ) : source.connected ? (
                        <Link className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Unlink className="w-3.5 h-3.5 text-white/30" />
                      )}
                    </button>
                    {!source.configured && (
                      <div className="px-3 text-[9px] text-[var(--os-text-muted)] opacity-60">Not configured on server</div>
                    )}
                    {!source.connected && source.configured && (
                      <button
                        onClick={() => handleConnect(source.id)}
                        className="w-full px-3 py-1 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        + Connect account
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Refresh cloud sources */}
          <div className="px-3 mt-6">
            <button
              onClick={() => { fetchCloudSources(); if (selectedSource !== 'local') fetchCloudFiles(selectedSource, cloudPath); }}
              className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-[var(--os-text-muted)] hover:text-[var(--os-text)] transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh connections
            </button>
          </div>
        </div>

        {/* Status footer */}
        <div className="p-4 border-t border-[var(--os-border)]">
          <div className="bg-[var(--os-surface-elevated)] p-3 rounded-lg border border-[var(--os-border)]">
            <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-semibold">
              <Lock className="w-3 h-3" />
              Privacy-First
            </div>
            <div className="text-[9px] text-[var(--os-text-muted)] mt-1">
              Cloud OAuth tokens stored server-side only. {isViewingLocal ? 'Viewing local files.' : `Connected: ${selectedSource}`}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--os-bg)]">

        {/* Toolbar */}
        <div className="h-14 border-b border-[var(--os-border)] flex items-center justify-between px-6 bg-[var(--os-surface)] backdrop-blur-xl shrink-0">

          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-[var(--os-text)] font-medium">
            <button
              onClick={() => { setSelectedSource('local'); setCurrentPath('Root'); }}
              className="hover:text-[var(--os-primary)] transition-colors"
            >
              OS
            </button>
            {isViewingLocal && currentPath !== 'Root' && currentPath.split('/').filter(Boolean).map((segment, idx, arr) => {
              const pathUpTo = arr.slice(0, idx + 1).join('/');
              return (
                <React.Fragment key={idx}>
                  <ChevronRight className="w-3 h-3 text-[var(--os-text-muted)]" />
                  <button
                    onClick={() => setCurrentPath(pathUpTo)}
                    className="hover:text-[var(--os-primary)] transition-colors"
                  >
                    {segment}
                  </button>
                </React.Fragment>
              );
            })}
            {!isViewingLocal && (
              <>
                <ChevronRight className="w-3 h-3 text-[var(--os-text-muted)]" />
                <span className="text-[var(--os-primary)]">{selectedSource}</span>
                <ChevronRight className="w-3 h-3 text-[var(--os-text-muted)]" />
                <span className="text-[var(--os-text)]">{cloudPath === 'root' ? 'Root' : cloudPath}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--os-text-muted)]" />
              <input
                type="text"
                placeholder="Search files..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-48 bg-[var(--os-surface-elevated)] border border-[var(--os-border)] rounded-full py-1.5 pl-9 pr-4 text-sm text-[var(--os-text)] outline-none focus:border-[var(--os-primary)] transition-colors shadow-inner"
              />
            </div>

            <div className="h-6 w-px bg-[var(--os-border)] mx-1"></div>

            <button onClick={() => { isViewingLocal ? fetchFiles() : fetchCloudFiles(selectedSource, cloudPath); }} className="p-1.5 rounded-md text-[var(--os-text-muted)] hover:text-[var(--os-text)] hover:bg-[var(--os-hover)] transition-colors" title="Refresh">
               <RefreshCw className="w-4 h-4" />
            </button>

            {isViewingLocal && (
              <>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--os-hover)] hover:bg-[var(--os-active)] rounded-md text-sm font-medium transition-colors" title="Upload Files">
                   <Upload className="w-4 h-4" /> Upload
                </button>

                <button onClick={() => setShowImportUrl(!showImportUrl)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--os-hover)] hover:bg-[var(--os-active)] rounded-md text-sm font-medium transition-colors" title="Import from URL">
                   <Cloud className="w-4 h-4" /> Import URL
                </button>

                <button onClick={async () => {
                  const name = prompt("Enter new folder name:");
                  if (!name) return;
                  const path = currentPath === 'Root' ? name : `${currentPath}/${name}`;
                  await FS.mkdir(path);
                  fetchFiles();
                }} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--os-hover)] hover:bg-[var(--os-active)] rounded-md text-sm font-medium transition-colors">
                   <Folder className="w-4 h-4" /> New Folder
                </button>

                <button onClick={createNewFile} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--os-primary)] hover:bg-[var(--os-primary-container)] rounded-md text-white text-sm font-medium transition-colors shadow-lg shadow-[var(--os-primary)]/20">
                   <Plus className="w-4 h-4" /> New File
                </button>
              </>
            )}

            {!isViewingLocal && cloudFiles.length > 0 && (
              <div className="text-[10px] text-white/40">
                {cloudFiles.length} items from {selectedSource}
              </div>
            )}
          </div>
        </div>

        {/* File Grid */}
        <div
          className="flex-1 overflow-y-auto p-6 relative"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Import from URL panel */}
          {showImportUrl && (
            <div className="mb-4 p-3 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl flex items-center gap-3">
              <Cloud className="w-4 h-4 text-[var(--os-text-muted)] shrink-0" />
              <input
                type="url"
                placeholder="Paste file URL (image, video, document, etc.)"
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleImportFromUrl()}
                className="flex-1 bg-transparent text-sm text-[var(--os-text)] outline-none placeholder:text-[var(--os-text-muted)]"
                autoFocus
              />
              <button
                onClick={handleImportFromUrl}
                disabled={!importUrl.trim() || importing}
                className="px-3 py-1.5 bg-[var(--os-primary)] hover:bg-[var(--os-primary-container)] disabled:opacity-40 rounded-md text-white text-sm font-medium transition-colors"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
              <button onClick={() => { setShowImportUrl(false); setImportUrl(''); }} className="p-1 text-[var(--os-text-muted)] hover:text-[var(--os-text)]">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Drag-and-drop overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--os-primary)]/10 border-2 border-dashed border-[var(--os-primary)] rounded-xl backdrop-blur-sm pointer-events-none">
              <div className="flex flex-col items-center gap-3 text-[var(--os-primary)]">
                <Upload className="w-12 h-12 animate-bounce" />
                <p className="text-lg font-semibold">Drop files here</p>
                <p className="text-sm opacity-70">Files will be saved to {currentPath}</p>
              </div>
            </div>
          )}
          {isViewingLocal && !isLoaded ? (
            <div className="flex items-center justify-center h-full text-[var(--os-text-muted)] text-sm">Loading files...</div>
          ) : !isViewingLocal && cloudLoading ? (
            <div className="flex items-center justify-center h-full text-[var(--os-text-muted)] text-sm">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading from {selectedSource}...
            </div>
          ) : displayFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-[var(--os-text-muted)]">
              <Folder className="w-16 h-16 opacity-20" />
              <p className="text-sm">
                {isViewingLocal
                  ? 'This folder is empty.'
                  : `No files found in ${selectedSource}.`
                }
              </p>
              {isViewingLocal && (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 text-xs opacity-60">
                    <Upload className="w-4 h-4" /> Drag files here or
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-[var(--os-primary)] hover:bg-[var(--os-primary-container)] rounded-md text-white text-sm font-medium transition-colors shadow-lg shadow-[var(--os-primary)]/20">
                      Upload Files
                    </button>
                    <button onClick={() => setShowImportUrl(true)} className="px-4 py-2 bg-[var(--os-hover)] hover:bg-[var(--os-active)] rounded-md text-[var(--os-text)] text-sm font-medium transition-colors">
                      Import from URL
                    </button>
                    <button onClick={createNewFile} className="px-4 py-2 bg-[var(--os-hover)] hover:bg-[var(--os-active)] rounded-md text-[var(--os-text)] text-sm font-medium transition-colors">
                      Create File
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : isViewingLocal ? (
            // Local files grid
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-12">
              {filteredFiles.map((file, i) => {
                const isFolder = file.isFolder === true || file.mimeType === 'inode/directory';
                const isMedia = !isFolder && (file.mimeType?.startsWith('video/') || file.mimeType?.startsWith('audio/'));
                const isImage = !isFolder && file.mimeType?.startsWith('image/');
                const isPdf = !isFolder && file.name.toLowerCase().endsWith('.pdf');

                return (
                  <div
                    key={i}
                    onDoubleClick={() => handleFileOpen(file)}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (!isFolder) setContextMenu({ x: e.clientX, y: e.clientY, file }); }}
                    className="group flex flex-col items-center p-4 rounded-xl border border-transparent hover:bg-[var(--os-hover)] hover:border-[var(--os-border)] hover:shadow-xl transition-all cursor-pointer relative"
                  >
                    {!isFolder && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 z-10">
                        <button onClick={(e) => downloadFile(file, e)} className="p-1.5 hover:bg-[var(--os-primary)] rounded-md bg-[var(--os-surface-elevated)] backdrop-blur border border-[var(--os-border)]" title="Download">
                          <Download className="w-3.5 h-3.5 text-[var(--os-text)]" />
                        </button>
                        <button onClick={(e) => deleteFile(file.id, e)} className="p-1.5 hover:bg-[var(--os-error)] rounded-md bg-[var(--os-surface-elevated)] backdrop-blur border border-[var(--os-border)]" title="Delete">
                          <Trash2 className="w-3.5 h-3.5 text-[var(--os-text)]" />
                        </button>
                      </div>
                    )}

                    <div className="w-16 h-16 mb-4 flex items-center justify-center relative">
                      {isFolder ? (
                        <Folder className="w-12 h-12 text-emerald-400 drop-shadow-md" fill="currentColor" />
                      ) : isImage && file.content ? (
                        <img src={file.content} alt={file.name} className="w-16 h-16 object-cover rounded-lg shadow-md" />
                      ) : isMedia ? (
                        <Video className="w-12 h-12 text-rose-400 drop-shadow-md" />
                      ) : isPdf ? (
                        <FileText className="w-12 h-12 text-orange-500 drop-shadow-md" />
                      ) : (
                        <FileText className="w-12 h-12 text-white/50 drop-shadow-md" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-[var(--os-text)] text-center line-clamp-2 w-full break-words">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-[var(--os-text-muted)] mt-1 uppercase tracking-wider">
                      {isFolder ? 'Folder' : isImage ? 'Image' : isMedia ? 'Media' : isPdf ? 'PDF' : 'Document'}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            // Cloud files grid
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-12">
              {filteredCloudFiles.map((file) => {
                const isMedia = file.mimeType?.startsWith('video/') || file.mimeType?.startsWith('audio/');
                const isImage = file.mimeType?.startsWith('image/');
                const isPdf = file.mimeType?.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');

                return (
                  <div
                    key={file.id}
                    onDoubleClick={() => handleCloudFileOpen(file)}
                    className="group flex flex-col items-center p-4 rounded-xl border border-transparent hover:bg-[var(--os-hover)] hover:border-[var(--os-border)] hover:shadow-xl transition-all cursor-pointer relative"
                  >
                    <div className="w-16 h-16 mb-4 flex items-center justify-center relative">
                      {file.isFolder ? (
                        <Folder className="w-12 h-12 text-emerald-400 drop-shadow-md" fill="currentColor" />
                      ) : isImage ? (
                        file.thumbnailUrl ? (
                          <img src={file.thumbnailUrl} alt={file.name} className="w-16 h-16 object-cover rounded-lg shadow-md" />
                        ) : (
                          <ImageIcon className="w-12 h-12 text-sky-400 drop-shadow-md" />
                        )
                      ) : isMedia ? (
                        <Video className="w-12 h-12 text-rose-400 drop-shadow-md" />
                      ) : isPdf ? (
                        <FileText className="w-12 h-12 text-orange-500 drop-shadow-md" />
                      ) : (
                        <FileText className="w-12 h-12 text-[var(--os-text-muted)] drop-shadow-md" />
                      )}
                    </div>

                    <span className="text-xs font-medium text-[var(--os-text)] text-center line-clamp-2 w-full break-words">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-[var(--os-text-muted)] mt-1">
                      {file.isFolder ? 'Folder' : isImage ? 'Image' : isMedia ? 'Media' : isPdf ? 'PDF' : 'Document'}
                      {file.size && !file.isFolder && ` · ${(file.size / 1024).toFixed(0)}KB`}
                    </span>

                    {/* Cloud source badge */}
                    <div className="text-[8px] text-emerald-400/50 mt-1 uppercase tracking-wider">{selectedSource}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-[9999] bg-[var(--os-glass-bg)] backdrop-blur-xl border border-[var(--os-glass-border)] rounded-xl shadow-2xl py-1 w-56"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setContextMenu(null)}
        >
          <button
            onClick={() => handleFileOpen(contextMenu.file)}
            className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--os-hover)] flex items-center gap-2 text-[var(--os-text)]"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open
          </button>
          <button
            onClick={() => {
              const compatible = useFileStore.getState().getCompatibleApps(contextMenu.file.mimeType || '', contextMenu.file.name);
              if (compatible.length > 1) {
                const appIds = compatible.map(r => r.appId);
                const label = prompt(`Open with (${appIds.join(', ')}):`);
                if (label && appIds.includes(label.trim())) {
                  openWindow(label.trim(), contextMenu.file.name, { fileId: contextMenu.file.id, content: contextMenu.file.content });
                }
              } else if (compatible.length === 1) {
                handleFileOpen(contextMenu.file);
              } else {
                openWindow('code', contextMenu.file.name, { fileId: contextMenu.file.id, content: contextMenu.file.content });
              }
            }}
            className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--os-hover)] flex items-center gap-2 text-[var(--os-text)]"
          >
            <Eye className="w-3.5 h-3.5" /> Open With...
          </button>
          <div className="border-t border-[var(--os-border)] my-1" />
          <button
            onClick={() => downloadFile(contextMenu.file, { stopPropagation: () => {} } as any)}
            className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--os-hover)] flex items-center gap-2 text-[var(--os-text)]"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>
          <button
            onClick={() => deleteFile(contextMenu.file.id, { stopPropagation: () => {} } as any)}
            className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--os-error)]/20 text-[var(--os-error)] flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}

      {/* Sync Prompt Banner for large files */}
      {syncPromptFile && (
        <SyncPromptBanner
          fileName={syncPromptFile.name}
          fileSize={syncPromptFile.size}
          fileType={syncPromptFile.type}
          onDismiss={() => setSyncPromptFile(null)}
          onKeepLocal={() => setSyncPromptFile(null)}
        />
      )}
    </div>
  );
}

