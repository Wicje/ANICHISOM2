'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useOS, OSWindow } from '@/lib/os-context';
import {
  Folder, File as FileIcon, FileText, Image as ImageIcon, Video, Box, Search,
  Plus, Trash2, HardDrive, RefreshCw, ChevronRight, Download, Upload,
  Cloud, Link, Unlink, Loader2, ExternalLink, Lock, Eye, Pencil, Copy, CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FS, LocalFile } from '@/lib/fs';
import { useFileStore } from '@/lib/stores/file.store';
import { SyncPromptBanner } from './sync-prompt-banner';
import { OSPrompt, OSConfirm, OSModal } from '@/components/ui/os-modal';

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
  const [syncPromptFile, setSyncPromptFile] = useState<{ name: string; size: number; type: string; file?: File } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: LocalFile } | null>(null);

  // Selection state (multi-select)
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const lastClickedIdRef = useRef<string | null>(null);

  // Batch operation state
  const [clipboard, setClipboard] = useState<{ paths: string[]; mode: 'copy' | 'cut' } | null>(null);
  const [pendingBatchDelete, setPendingBatchDelete] = useState(false);

  // Drag-to-move state (internal file DnD)
  const [draggingFileId, setDraggingFileId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const dropTargetCounterRef = useRef<Map<string, number>>(new Map());

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  // Import from URL state
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [showImportUrl, setShowImportUrl] = useState(false);

  // Modal states
  const [showNewFile, setShowNewFile] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showOpenWith, setShowOpenWith] = useState(false);
  const [openWithApps, setOpenWithApps] = useState<{ appId: string; label: string }[]>([]);
  const [openWithFile, setOpenWithFile] = useState<LocalFile | null>(null);

  const revokeObjectUrls = () => {
    for (const url of objectUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    objectUrlsRef.current.clear();
  };

  // Multi-select helpers
  const toggleFileSelection = (fileId: string, ctrlKey: boolean, shiftKey: boolean) => {
    if (shiftKey && lastClickedIdRef.current) {
      // Range select: select all files between last clicked and current
      const allIds = filteredFiles.map(f => f.id);
      const lastIdx = allIds.indexOf(lastClickedIdRef.current);
      const currentIdx = allIds.indexOf(fileId);
      if (lastIdx !== -1 && currentIdx !== -1) {
        const start = Math.min(lastIdx, currentIdx);
        const end = Math.max(lastIdx, currentIdx);
        const rangeIds = allIds.slice(start, end + 1);
        setSelectedFileIds(prev => {
          const next = new Set(prev);
          for (const id of rangeIds) next.add(id);
          return next;
        });
      }
    } else if (ctrlKey) {
      // Toggle individual file
      setSelectedFileIds(prev => {
        const next = new Set(prev);
        if (next.has(fileId)) next.delete(fileId);
        else next.add(fileId);
        return next;
      });
    } else {
      // Plain click: select only this file
      setSelectedFileIds(new Set([fileId]));
    }
    lastClickedIdRef.current = fileId;
  };

  const selectAllFiles = () => {
    setSelectedFileIds(new Set(filteredFiles.map(f => f.id)));
  };

  const clearSelection = () => {
    setSelectedFileIds(new Set());
    lastClickedIdRef.current = null;
  };

  // Get the directory path for a given folder file
  const getFolderPath = (folder: LocalFile) => {
    return currentPath === 'Root' ? folder.name : `${currentPath}/${folder.name}`;
  };

  // Move files to a destination folder
  const handleMoveFiles = async (fileIds: string[], destFolderId: string) => {
    const destPath = destFolderId === 'Root' ? '' : destFolderId;
    for (const fileId of fileIds) {
      const fileName = fileId.split('/').pop() || fileId;
      const destFilePath = destPath ? `${destPath}/${fileName}` : fileName;
      try {
        await FS.move(fileId, destFilePath);
      } catch (err) {
        console.error(`Failed to move ${fileId}:`, err);
      }
    }
    clearSelection();
    fetchFiles();
    window.dispatchEvent(new CustomEvent('os:notify', {
      detail: { title: 'Files Moved', description: `${fileIds.length} file(s) moved`, type: 'success' },
    }));
  };

  // Copy files to a destination folder
  const handleCopyFiles = async (fileIds: string[], destFolderId: string) => {
    const destPath = destFolderId === 'Root' ? '' : destFolderId;
    for (const fileId of fileIds) {
      const fileName = fileId.split('/').pop() || fileId;
      const destFilePath = destPath ? `${destPath}/${fileName}` : fileName;
      try {
        await FS.copy(fileId, destFilePath);
      } catch (err) {
        console.error(`Failed to copy ${fileId}:`, err);
      }
    }
    fetchFiles();
    window.dispatchEvent(new CustomEvent('os:notify', {
      detail: { title: 'Files Copied', description: `${fileIds.length} file(s) copied`, type: 'success' },
    }));
  };

  // Delete multiple files
  const handleDeleteSelected = async () => {
    setPendingBatchDelete(true);
  };

  const confirmBatchDelete = async () => {
    for (const fileId of selectedFileIds) {
      try { await FS.delete(fileId); } catch { /* skip */ }
    }
    clearSelection();
    setPendingBatchDelete(false);
    fetchFiles();
  };

  // Cut/Copy to clipboard
  const handleCut = () => {
    setClipboard({ paths: Array.from(selectedFileIds), mode: 'cut' });
  };
  const handleCopy = () => {
    setClipboard({ paths: Array.from(selectedFileIds), mode: 'copy' });
  };
  const handlePaste = async () => {
    if (!clipboard) return;
    for (const srcPath of clipboard.paths) {
      const fileName = srcPath.split('/').pop() || srcPath;
      const destPath = currentPath === 'Root' ? fileName : `${currentPath}/${fileName}`;
      if (clipboard.mode === 'cut') {
        await FS.move(srcPath, destPath);
      } else {
        await FS.copy(srcPath, destPath);
      }
    }
    setClipboard(null);
    fetchFiles();
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
      await fetch(`/api/storage/disconnect/${providerId}`, { method: 'DELETE' });
      fetchCloudSources();
      setCloudFiles([]);
      setSelectedSource('local');
    } catch { /* ignore */ }
  };

  useEffect(() => {
    clearSelection();
    setRenamingId(null);
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

  // Check for OAuth callback via postMessage from OS browser iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const data = e.data;
      if (data && data.type === 'storage-oauth-callback' && data.success && data.provider) {
        fetchCloudSources();
        setSelectedSource(data.provider);
        window.dispatchEvent(new CustomEvent('os:notify', {
          detail: { title: 'Cloud Connected', description: `${data.accountName || data.provider} connected successfully!`, type: 'success' },
        }));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Also check URL params as fallback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectedProvider = params.get('storage_connected');
    const error = params.get('storage_error');
    if (connectedProvider) {
      fetchCloudSources();
      setSelectedSource(connectedProvider);
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

  const [cloudContextMenu, setCloudContextMenu] = useState<{ x: number; y: number; file: CloudFileItem } | null>(null);
  const [savingCloudFile, setSavingCloudFile] = useState<string | null>(null);

  const handleSaveCloudToLocal = async (file: CloudFileItem) => {
    if (file.isFolder) return;
    setSavingCloudFile(file.id);
    try {
      const downloadUrl = `/api/storage/download/${selectedSource}/${encodeURIComponent(file.id)}`;
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const blob = await res.blob();
      const contentType = res.headers.get('content-type') || blob.type || 'application/octet-stream';
      const filePath = currentPath === 'Root' ? file.name : `${currentPath}/${file.name}`;
      await FS.write(filePath, blob, contentType);
      fetchFiles();
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'File Imported', description: `${file.name} saved to ${currentPath}`, type: 'success' },
      }));
    } catch (err) {
      console.error('Save to local failed:', err);
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'Import Failed', description: err instanceof Error ? err.message : 'Unknown error', type: 'error' },
      }));
    }
    setSavingCloudFile(null);
  };

  const handleImportAllCloudFiles = async () => {
    const filesToImport = cloudFiles.filter(f => !f.isFolder);
    if (filesToImport.length === 0) return;
    setCloudLoading(true);
    let imported = 0;
    for (const file of filesToImport) {
      try {
        const downloadUrl = `/api/storage/download/${selectedSource}/${encodeURIComponent(file.id)}`;
        const res = await fetch(downloadUrl);
        if (!res.ok) continue;
        const blob = await res.blob();
        const contentType = res.headers.get('content-type') || blob.type || 'application/octet-stream';
        const filePath = currentPath === 'Root' ? file.name : `${currentPath}/${file.name}`;
        await FS.write(filePath, blob, contentType);
        imported++;
      } catch { /* skip failed files */ }
    }
    fetchFiles();
    setCloudLoading(false);
    window.dispatchEvent(new CustomEvent('os:notify', {
      detail: { title: 'Import Complete', description: `${imported} of ${filesToImport.length} files imported to ${currentPath}`, type: 'success' },
    }));
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
        setSyncPromptFile({ name: file.name, size: file.size, type: file.type, file });
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
        setSyncPromptFile({ name: file.name, size: file.size, type: file.type, file });
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
      window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Import Failed', message: err instanceof Error ? err.message : 'Unknown error' } }));
    } finally {
      setImporting(false);
    }
  };

  const deleteFile = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (pendingDeleteId) {
      await FS.delete(pendingDeleteId);
      fetchFiles();
    }
    setPendingDeleteId(null);
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

  const createNewFile = async (name: string) => {
    if (!name) return;
    const filePath = currentPath === 'Root' ? name : `${currentPath}/${name}`;
    await FS.write(filePath, "");
    fetchFiles();
  };

  const filteredFiles = useMemo(() => files.filter(f => f.name.toLowerCase().includes(search.toLowerCase())), [files, search]);
  const filteredCloudFiles = useMemo(() => cloudFiles.filter(f => f.name.toLowerCase().includes(search.toLowerCase())), [cloudFiles, search]);

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
          {cloudSources.length > 0 ? (
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
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDisconnect(source.id); }}
                          className="p-1 rounded hover:bg-[var(--os-error)]/20 transition-colors"
                          title="Disconnect"
                        >
                          <Unlink className="w-3.5 h-3.5 text-[var(--os-text-muted)] hover:text-[var(--os-error)]" />
                        </button>
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
          ) : (
            <div className="px-4 mt-6">
              <div className="p-3 rounded-lg border border-dashed border-[var(--os-border)] text-center">
                <Cloud className="w-6 h-6 mx-auto mb-2 text-[var(--os-text-muted)] opacity-40" />
                <p className="text-[10px] text-[var(--os-text-muted)]">
                  No cloud providers configured.
                </p>
                <p className="text-[9px] text-[var(--os-text-muted)] opacity-60 mt-1">
                  Ask admin to set up Google Drive, Dropbox, or OneDrive env vars.
                </p>
              </div>
            </div>
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

                <button onClick={() => setShowNewFolder(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--os-hover)] hover:bg-[var(--os-active)] rounded-md text-sm font-medium transition-colors">
                   <Folder className="w-4 h-4" /> New Folder
                </button>

                <button onClick={() => setShowNewFile(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--os-primary)] hover:bg-[var(--os-primary-container)] rounded-md text-white text-sm font-medium transition-colors shadow-lg shadow-[var(--os-primary)]/20">
                   <Plus className="w-4 h-4" /> New File
                </button>
              </>
            )}

            {!isViewingLocal && cloudFiles.length > 0 && (
              <>
                <button
                  onClick={handleImportAllCloudFiles}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--os-primary)] hover:bg-[var(--os-primary-container)] rounded-md text-white text-sm font-medium transition-colors shadow-lg shadow-[var(--os-primary)]/20"
                >
                  <Download className="w-4 h-4" /> Import All to {currentPath}
                </button>
                <div className="text-[10px] text-white/40">
                  {cloudFiles.length} items from {selectedSource}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Batch Operations Bar — shown when files are selected */}
        {isViewingLocal && selectedFileIds.size > 0 && (
          <div className="h-12 border-b border-[var(--os-border)] flex items-center justify-between px-6 bg-[var(--os-primary)]/5 backdrop-blur-xl shrink-0">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium text-[var(--os-primary)]">{selectedFileIds.size} selected</span>
              <div className="h-4 w-px bg-[var(--os-border)]" />
              <button onClick={handleCut} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--os-text-muted)] hover:text-[var(--os-text)] hover:bg-[var(--os-hover)] transition-colors">
                <Pencil className="w-3 h-3" /> Cut
              </button>
              <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--os-text-muted)] hover:text-[var(--os-text)] hover:bg-[var(--os-hover)] transition-colors">
                <Copy className="w-3 h-3" /> Copy
              </button>
              {clipboard && (
                <button onClick={handlePaste} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--os-primary)] hover:bg-[var(--os-primary)]/10 transition-colors">
                  <Upload className="w-3 h-3" /> Paste ({clipboard.paths.length})
                </button>
              )}
              <button onClick={() => { handleDeleteSelected(); }} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--os-error)] hover:bg-[var(--os-error)]/10 transition-colors">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
            <button onClick={clearSelection} className="text-xs text-[var(--os-text-muted)] hover:text-[var(--os-text)] transition-colors">
              Clear
            </button>
          </div>
        )}

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
                    <button onClick={() => setShowNewFile(true)} className="px-4 py-2 bg-[var(--os-hover)] hover:bg-[var(--os-active)] rounded-md text-[var(--os-text)] text-sm font-medium transition-colors">
                      Create File
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : isViewingLocal ? (
            // Local files grid
            <div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-12"
              onClick={(e) => { if (e.target === e.currentTarget) clearSelection(); }}
              onKeyDown={(e) => {
                const target = e.target as HTMLElement;
                const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
                if (e.key === 'F2' && selectedFileIds.size === 1) {
                  const id = Array.from(selectedFileIds)[0];
                  const file = files.find(f => f.id === id);
                  if (file) { setRenamingId(file.id); setRenameValue(file.name); }
                }
                if (isInputFocused) return;
                if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFileIds.size > 0) {
                  e.preventDefault();
                  handleDeleteSelected();
                }
                if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  selectAllFiles();
                }
                if (e.key === 'c' && (e.ctrlKey || e.metaKey) && selectedFileIds.size > 0) {
                  handleCopy();
                }
                if (e.key === 'x' && (e.ctrlKey || e.metaKey) && selectedFileIds.size > 0) {
                  handleCut();
                }
                if (e.key === 'v' && (e.ctrlKey || e.metaKey) && clipboard) {
                  handlePaste();
                }
              }}
              tabIndex={0}
            >
              {filteredFiles.map((file, i) => {
                const isFolder = file.isFolder === true || file.mimeType === 'inode/directory';
                const isMedia = !isFolder && (file.mimeType?.startsWith('video/') || file.mimeType?.startsWith('audio/'));
                const isImage = !isFolder && file.mimeType?.startsWith('image/');
                const isPdf = !isFolder && file.name.toLowerCase().endsWith('.pdf');
                const isSelected = selectedFileIds.has(file.id);
                const isDropTarget = isFolder && dropTargetId === file.id;

                return (
                  <div
                    key={i}
                    onClick={(e) => toggleFileSelection(file.id, e.ctrlKey || e.metaKey, e.shiftKey)}
                    onDoubleClick={() => handleFileOpen(file)}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, file }); }}
                    draggable={!isFolder}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      if (isFolder) { e.preventDefault(); return; }
                      setDraggingFileId(file.id);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', file.id);
                    }}
                    onDragEnd={() => { setDraggingFileId(null); setDropTargetId(null); dropTargetCounterRef.current.clear(); }}
                    onDragOver={(e) => {
                      if (isFolder && draggingFileId && draggingFileId !== file.id) {
                        e.preventDefault();
                        e.stopPropagation();
                        const count = (dropTargetCounterRef.current.get(file.id) || 0) + 1;
                        dropTargetCounterRef.current.set(file.id, count);
                        setDropTargetId(file.id);
                      }
                    }}
                    onDragLeave={() => {
                      if (isFolder) {
                        const count = (dropTargetCounterRef.current.get(file.id) || 1) - 1;
                        dropTargetCounterRef.current.set(file.id, count);
                        if (count <= 0) {
                          dropTargetCounterRef.current.delete(file.id);
                          if (dropTargetId === file.id) setDropTargetId(null);
                        }
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      dropTargetCounterRef.current.delete(file.id);
                      if (isFolder && draggingFileId && draggingFileId !== file.id) {
                        const destPath = getFolderPath(file);
                        handleMoveFiles([draggingFileId], destPath);
                      }
                      setDropTargetId(null);
                      setDraggingFileId(null);
                    }}
                    className={cn(
                      "group flex flex-col items-center p-4 rounded-xl border transition-all cursor-pointer relative",
                      isSelected
                        ? "ring-2 ring-[var(--os-primary)] bg-[var(--os-hover)] border-[var(--os-primary)]"
                        : isDropTarget
                          ? "border-emerald-400 bg-emerald-400/10 ring-2 ring-emerald-400"
                          : "border-transparent hover:bg-[var(--os-hover)] hover:border-[var(--os-border)] hover:shadow-xl",
                      draggingFileId === file.id && "opacity-40"
                    )}
                  >
                    {!isFolder && isSelected && (
                      <div className="absolute top-2 left-2 z-10">
                        <div className="w-5 h-5 rounded-full bg-[var(--os-primary)] flex items-center justify-center">
                          <CheckCircle className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                    )}

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
                        <Folder className={cn("w-12 h-12 drop-shadow-md transition-colors", isDropTarget ? "text-emerald-300" : "text-emerald-400")} fill="currentColor" />
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
                    {renamingId === file.id ? (
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={async () => {
                          if (renameValue.trim() && renameValue !== file.name) {
                            const oldPath = file.id;
                            const dir = oldPath.includes('/') ? oldPath.substring(0, oldPath.lastIndexOf('/')) : '';
                            const newPath = dir ? `${dir}/${renameValue}` : renameValue;
                            await FS.move(oldPath, newPath);
                            fetchFiles();
                          }
                          setRenamingId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        className="w-full text-xs text-center bg-[var(--os-surface-elevated)] border border-[var(--os-primary)] rounded px-1 py-0.5 outline-none text-[var(--os-text)]"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-xs font-medium text-[var(--os-text)] text-center line-clamp-2 w-full break-words">
                        {file.name}
                      </span>
                    )}
                    <span className="text-[10px] text-[var(--os-text-muted)] mt-1 uppercase tracking-wider">
                      {isFolder ? 'Folder' : isImage ? 'Image' : isMedia ? 'Media' : isPdf ? 'PDF' : 'Document'}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            // Cloud files grid
            <div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-12"
              onClick={(e) => { if (e.target === e.currentTarget) setCloudContextMenu(null); }}
            >
              {filteredCloudFiles.map((file) => {
                const isMedia = file.mimeType?.startsWith('video/') || file.mimeType?.startsWith('audio/');
                const isImage = file.mimeType?.startsWith('image/');
                const isPdf = file.mimeType?.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');

                return (
                  <div
                    key={file.id}
                    onDoubleClick={() => handleCloudFileOpen(file)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!file.isFolder) setCloudContextMenu({ x: e.clientX, y: e.clientY, file });
                    }}
                    className="group flex flex-col items-center p-4 rounded-xl border border-transparent hover:bg-[var(--os-hover)] hover:border-[var(--os-border)] hover:shadow-xl transition-all cursor-pointer relative"
                  >
                    {!file.isFolder && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 z-10">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSaveCloudToLocal(file); }}
                          disabled={savingCloudFile === file.id}
                          className="p-1.5 hover:bg-emerald-500 rounded-md bg-[var(--os-surface-elevated)] backdrop-blur border border-[var(--os-border)] disabled:opacity-40"
                          title="Save to Local"
                        >
                          {savingCloudFile === file.id ? (
                            <Loader2 className="w-3.5 h-3.5 text-[var(--os-text)] animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5 text-[var(--os-text)]" />
                          )}
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
          {contextMenu.file.isFolder ? (
            <button
              onClick={() => handleFileOpen(contextMenu.file)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--os-hover)] flex items-center gap-2 text-[var(--os-text)]"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open
            </button>
          ) : (
            <>
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
                    setOpenWithApps(compatible);
                    setOpenWithFile(contextMenu.file);
                    setShowOpenWith(true);
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
            </>
          )}
          <button
            onClick={() => {
              setRenamingId(contextMenu.file.id);
              setRenameValue(contextMenu.file.name);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--os-hover)] flex items-center gap-2 text-[var(--os-text)]"
          >
            <Pencil className="w-3.5 h-3.5" /> Rename
          </button>
          <div className="border-t border-[var(--os-border)] my-1" />
          <button
            onClick={() => { setClipboard({ paths: [contextMenu.file.id], mode: 'cut' }); setContextMenu(null); }}
            className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--os-hover)] flex items-center gap-2 text-[var(--os-text)]"
          >
            <Pencil className="w-3.5 h-3.5" /> Cut
          </button>
          <button
            onClick={() => { setClipboard({ paths: [contextMenu.file.id], mode: 'copy' }); setContextMenu(null); }}
            className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--os-hover)] flex items-center gap-2 text-[var(--os-text)]"
          >
            <Copy className="w-3.5 h-3.5" /> Copy
          </button>
          {!contextMenu.file.isFolder && (
            <button
              onClick={() => downloadFile(contextMenu.file, { stopPropagation: () => {} } as any)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--os-hover)] flex items-center gap-2 text-[var(--os-text)]"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          )}
          <button
            onClick={() => deleteFile(contextMenu.file.id, { stopPropagation: () => {} } as any)}
            className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--os-error)]/20 text-[var(--os-error)] flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}

      {/* Cloud Context Menu */}
      {cloudContextMenu && (
        <div
          className="fixed z-[9999] bg-[var(--os-glass-bg)] backdrop-blur-xl border border-[var(--os-glass-border)] rounded-xl shadow-2xl py-1 w-56"
          style={{ left: cloudContextMenu.x, top: cloudContextMenu.y }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setCloudContextMenu(null)}
        >
          <button
            onClick={() => handleCloudFileOpen(cloudContextMenu.file)}
            className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--os-hover)] flex items-center gap-2 text-[var(--os-text)]"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open
          </button>
          <div className="border-t border-[var(--os-border)] my-1" />
          <button
            onClick={() => handleSaveCloudToLocal(cloudContextMenu.file)}
            disabled={savingCloudFile === cloudContextMenu.file.id}
            className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--os-hover)] flex items-center gap-2 text-[var(--os-text)] disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" /> {savingCloudFile === cloudContextMenu.file.id ? 'Saving...' : 'Save to Local'}
          </button>
          {cloudContextMenu.file.webUrl && (
            <a
              href={cloudContextMenu.file.webUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--os-hover)] flex items-center gap-2 text-[var(--os-text)]"
            >
              <Cloud className="w-3.5 h-3.5" /> Open in {selectedSource}
            </a>
          )}
        </div>
      )}

      {/* Sync Prompt Banner for large files */}
      {syncPromptFile && (
        <SyncPromptBanner
          fileName={syncPromptFile.name}
          fileSize={syncPromptFile.size}
          fileType={syncPromptFile.type}
          file={syncPromptFile.file}
          onDismiss={() => setSyncPromptFile(null)}
          onKeepLocal={() => setSyncPromptFile(null)}
        />
      )}

      {/* New File Prompt */}
      <OSPrompt
        open={showNewFile}
        onClose={() => setShowNewFile(false)}
        onSubmit={(name) => createNewFile(name)}
        title="New File"
        placeholder="Enter new file name (e.g. document.txt)"
      />

      {/* New Folder Prompt */}
      <OSPrompt
        open={showNewFolder}
        onClose={() => setShowNewFolder(false)}
        onSubmit={async (name) => {
          if (!name) return;
          const path = currentPath === 'Root' ? name : `${currentPath}/${name}`;
          await FS.mkdir(path);
          fetchFiles();
        }}
        title="New Folder"
        placeholder="Enter new folder name"
      />

      {/* Delete Confirmation */}
      <OSConfirm
        open={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setPendingDeleteId(null); }}
        onConfirm={confirmDelete}
        title="Delete File"
        message="Are you sure you want to delete this file?"
        confirmLabel="Delete"
        danger
      />

      {/* Batch Delete Confirmation */}
      <OSConfirm
        open={pendingBatchDelete}
        onClose={() => setPendingBatchDelete(false)}
        onConfirm={confirmBatchDelete}
        title="Delete Files"
        message={`Are you sure you want to delete ${selectedFileIds.size} file(s)?`}
        confirmLabel="Delete"
        danger
      />

      {/* Open With Modal */}
      <OSModal open={showOpenWith} onClose={() => setShowOpenWith(false)} title="Open With">
        <div className="space-y-1">
          {openWithApps.map(app => (
            <button
              key={app.appId}
              onClick={() => {
                if (openWithFile) {
                  openWindow(app.appId, openWithFile.name, { fileId: openWithFile.id, content: openWithFile.content });
                }
                setShowOpenWith(false);
              }}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-[var(--os-hover)] transition-colors"
              style={{ color: 'var(--os-text)' }}
            >
              {app.label}
            </button>
          ))}
        </div>
      </OSModal>
    </div>
  );
}

