'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOS, OSWindow } from '@/lib/os-context';
import {
  Folder, File as FileIcon, FileText, Image as ImageIcon, Video, Box, Search,
  Plus, Trash2, HardDrive, RefreshCw, ChevronRight, Download, Upload,
  Cloud, WifiOff, Link, Unlink, Loader2, ExternalLink, Lock
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

  // Connect a cloud storage provider
  const handleConnect = async (providerId: string) => {
    setConnectLoading(providerId);
    try {
      const res = await fetch(`/api/storage/connect/${providerId}`);
      if (res.ok) {
        const data = await res.json();
        // Open OAuth URL in the mini-browser or external window
        window.open(data.authUrl, '_blank');
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
    <div className="w-full h-full flex bg-[#0f0f0f] text-[#ececec] font-sans overflow-hidden">

      {/* Sidebar */}
      <div className="w-56 bg-[var(--os-surface)] border-r border-white/5 flex flex-col shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-white/5 text-sm font-semibold tracking-wide text-white/80">
          <HardDrive className="w-4 h-4 mr-2 text-emerald-500" />
          Files Bridge
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {/* Local storage */}
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-white/40">Local Disk</div>
          <div className="flex flex-col gap-1 px-2">
            {['Root', 'Desktop', 'Documents', 'Downloads', 'Media'].map(loc => (
              <button
                key={loc}
                onClick={() => { setCurrentPath(loc); setSelectedSource('local'); }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isViewingLocal && currentPath === loc ? "bg-blue-600 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
                  !isViewingLocal && "text-white/50"
                )}
              >
                <Folder className={cn("w-4 h-4", isViewingLocal && currentPath === loc ? "text-white" : "text-blue-400")} fill="currentColor" />
                {loc}
              </button>
            ))}
          </div>

          {/* Cloud storage */}
          {cloudSources.length > 0 && (
            <>
              <div className="px-3 mt-6 mb-2 text-[10px] font-bold uppercase tracking-widest text-white/40">Cloud Storage</div>
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
                        selectedSource === source.id ? "bg-emerald-600/20 text-emerald-400" : "text-white/70 hover:bg-white/5 hover:text-white",
                        !source.configured && "opacity-40"
                      )}
                    >
                      <Cloud className="w-4 h-4 text-emerald-400" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{source.name}</div>
                        {source.connected && source.accountName && (
                          <div className="text-[10px] text-white/40 truncate">{source.accountName}</div>
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
                      <div className="px-3 text-[9px] text-white/20">Not configured on server</div>
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
          <div className="px-3 mt-4">
            <button
              onClick={() => { fetchCloudSources(); if (selectedSource !== 'local') fetchCloudFiles(selectedSource, cloudPath); }}
              className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-white/40 hover:text-white/60 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh connections
            </button>
          </div>
        </div>

        {/* Status footer */}
        <div className="p-4 border-t border-[var(--os-border)]">
          <div className="bg-[var(--os-surface)] p-3 rounded-lg border border-[var(--os-border)]">
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
      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a]">

        {/* Toolbar */}
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#121212] shrink-0">

          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-white/80 font-medium">
            <button
              onClick={() => { setSelectedSource('local'); setCurrentPath('Root'); }}
              className="hover:text-blue-400 transition-colors"
            >
              OS
            </button>
            <ChevronRight className="w-3 h-3 text-white/40" />
            {isViewingLocal ? (
              <span className="text-white">{currentPath}</span>
            ) : (
              <>
                <span className="text-emerald-400">{selectedSource}</span>
                <ChevronRight className="w-3 h-3 text-white/40" />
                <span className="text-white">{cloudPath === 'root' ? 'Root' : cloudPath}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search files..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-48 bg-[var(--os-surface)] border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-sm text-white outline-none focus:border-blue-500 transition-colors shadow-inner"
              />
            </div>

            <div className="h-6 w-px bg-white/10 mx-1"></div>

            <button onClick={() => { isViewingLocal ? fetchFiles() : fetchCloudFiles(selectedSource, cloudPath); }} className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors" title="Refresh">
               <RefreshCw className="w-4 h-4" />
            </button>

            {isViewingLocal && (
              <>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-sm font-medium transition-colors" title="Upload Files">
                   <Upload className="w-4 h-4" /> Upload
                </button>

                <button onClick={async () => {
                  const name = prompt("Enter new folder name:");
                  if (!name) return;
                  const path = currentPath === 'Root' ? name : `${currentPath}/${name}`;
                  await FS.write(`${path}/.keep`, "");
                  fetchFiles();
                }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-sm font-medium transition-colors">
                   <Folder className="w-4 h-4" /> New Folder
                </button>

                <button onClick={createNewFile} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-md text-white text-sm font-medium transition-colors shadow-lg shadow-blue-500/20">
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
        <div className="flex-1 overflow-y-auto p-6">
          {isViewingLocal && !isLoaded ? (
            <div className="flex items-center justify-center h-full text-white/40 text-sm">Loading files...</div>
          ) : !isViewingLocal && cloudLoading ? (
            <div className="flex items-center justify-center h-full text-white/40 text-sm">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading from {selectedSource}...
            </div>
          ) : displayFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-white/40">
              <Folder className="w-16 h-16 opacity-20" />
              <p className="text-sm">
                {isViewingLocal
                  ? 'This folder is empty.'
                  : `No files found in ${selectedSource}.`
                }
              </p>
              {isViewingLocal && (
                <button onClick={createNewFile} className="px-4 py-2 bg-white/5 rounded-md text-white hover:bg-white/10 transition-colors">Create a file</button>
              )}
            </div>
          ) : isViewingLocal ? (
            // Local files grid
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-12">
              {filteredFiles.map((file, i) => {
                const isMedia = file.mimeType?.startsWith('video/') || file.mimeType?.startsWith('audio/');
                const isImage = file.mimeType?.startsWith('image/');
                const isPdf = file.name.toLowerCase().endsWith('.pdf');

                return (
                  <div
                    key={i}
                    onDoubleClick={() => handleFileOpen(file)}
                    className="group flex flex-col items-center p-4 rounded-xl border border-transparent hover:bg-white/5 hover:border-white/10 hover:shadow-xl transition-all cursor-pointer relative"
                  >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 z-10">
                      <button onClick={(e) => downloadFile(file, e)} className="p-1.5 hover:bg-blue-500 rounded-md bg-black/60 backdrop-blur" title="Download">
                        <Download className="w-3.5 h-3.5 text-white" />
                      </button>
                      <button onClick={(e) => deleteFile(file.id, e)} className="p-1.5 hover:bg-red-500 rounded-md bg-black/60 backdrop-blur" title="Delete">
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>

                    <div className="w-16 h-16 mb-4 flex items-center justify-center relative">
                      {isImage && file.content ? (
                        <img src={file.content} alt={file.name} className="w-16 h-16 object-cover rounded-lg shadow-md" />
                      ) : isMedia ? (
                        <Video className="w-12 h-12 text-rose-400 drop-shadow-md" />
                      ) : isPdf ? (
                        <FileText className="w-12 h-12 text-orange-500 drop-shadow-md" />
                      ) : (
                        <FileText className="w-12 h-12 text-white/50 drop-shadow-md" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-white/90 text-center line-clamp-2 w-full break-words">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">
                      {isImage ? 'Image' : isMedia ? 'Media' : isPdf ? 'PDF' : 'Document'}
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
                    className="group flex flex-col items-center p-4 rounded-xl border border-transparent hover:bg-white/5 hover:border-white/10 hover:shadow-xl transition-all cursor-pointer relative"
                  >
                    {file.webUrl && (
                      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(file.webUrl!, '_blank'); }}
                          className="p-1.5 hover:bg-emerald-500 rounded-md bg-black/60 backdrop-blur"
                          title="Open in browser"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                      </div>
                    )}

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
                        <FileText className="w-12 h-12 text-white/50 drop-shadow-md" />
                      )}
                    </div>

                    <span className="text-xs font-medium text-white/90 text-center line-clamp-2 w-full break-words">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-white/40 mt-1">
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

